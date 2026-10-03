import { useState, useRef, useCallback, useEffect } from 'react';
import { getApiBaseUrl } from '../lib/api';
import { StrokeData, Point } from '../types/whiteboard';
import { HandwritingGroup, SmartInkSettings, SmartInkSuggestion, SmartInkResponseData } from '../types/smartInk';

interface UseSmartInkOptions {
  roomCode: string;
  strokes: StrokeData[];
  onConvertGroupToText: (
    group: HandwritingGroup,
    textValue: string,
    keepHandwriting: boolean,
    latex?: string | null
  ) => void;
}

const DEFAULT_SETTINGS: SmartInkSettings = {
  enabled: true,
  smartReplace: true,
  keepHandwriting: false,
  confidenceThreshold: 0.90, // 90% threshold for true auto word replacement
};

const PAUSE_DEBOUNCE_MS = 800; // 800ms pause before recognition
const SPATIAL_DISTANCE_THRESHOLD = 0.15; // 15% normalized canvas distance for stroke grouping

export function useSmartInk({ roomCode, strokes, onConvertGroupToText }: UseSmartInkOptions) {
  const [settings, setSettings] = useState<SmartInkSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('whiteboard_smart_ink_settings');
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

  const [activeSuggestion, setActiveSuggestion] = useState<SmartInkSuggestion | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const pendingGroupRef = useRef<HandwritingGroup | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<SmartInkSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('whiteboard_smart_ink_settings', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  // Helper: Calculate bounding box of a stroke
  const getStrokeBounds = (stroke: StrokeData) => {
    const pts = stroke.points && stroke.points.length > 0 ? stroke.points : [{ x: stroke.x || 0.1, y: stroke.y || 0.1 }];
    let minX = pts[0].x;
    let maxX = pts[0].x;
    let minY = pts[0].y;
    let maxY = pts[0].y;

    pts.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    return {
      x: minX,
      y: minY,
      width: Math.max(0.01, maxX - minX),
      height: Math.max(0.01, maxY - minY),
    };
  };

  // Helper: Calculate merged bounds of a group
  const mergeBounds = (b1: { x: number; y: number; width: number; height: number }, b2: { x: number; y: number; width: number; height: number }) => {
    const minX = Math.min(b1.x, b2.x);
    const minY = Math.min(b1.y, b2.y);
    const maxX = Math.max(b1.x + b1.width, b2.x + b2.width);
    const maxY = Math.max(b1.y + b1.height, b2.y + b2.height);

    return {
      x: minX,
      y: minY,
      width: Math.max(0.01, maxX - minX),
      height: Math.max(0.01, maxY - minY),
    };
  };

  // Trigger Smart Ink Recognition API
  const triggerRecognition = useCallback(
    async (group: HandwritingGroup) => {
      // 🛑 CRITICAL SAFETY: If Smart Ink or Smart Replace is OFF, do NOTHING!
      if (!settings.enabled || !settings.smartReplace || group.strokes.length === 0) return;

      // Cancel any ongoing API call
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsRecognizing(true);

      try {
        // Collect surrounding board text context
        const boardTexts = strokes
          .filter((s) => !s.isDeleted && Boolean(s.text))
          .map((s) => s.text as string);

        const canvas = document.querySelector('canvas');
        const image = canvas ? canvas.toDataURL('image/png') : undefined;

        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/ai/smart-ink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            roomCode,
            strokeGroup: {
              groupId: group.id,
              strokeIds: group.strokeIds,
              strokes: group.strokes.map((s) => ({
                id: s.id,
                tool: s.tool,
                color: s.color,
                size: s.size,
                points: s.points || [],
              })),
              bounds: group.bounds,
            },
            boardContext: {
              nearbyText: boardTexts.slice(-10),
              existingObjects: strokes
                .filter((s) => !s.isDeleted && Boolean(s.text))
                .slice(-10)
                .map((s) => ({
                  id: s.id,
                  type: s.tool,
                  x: s.x,
                  y: s.y,
                  width: s.width,
                  height: s.height,
                  text: s.text,
                })),
            },
            image,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Smart Ink recognition failed.');
        }

        const data: SmartInkResponseData = json.data;

        // ✨ TRUE AUTO WORD REPLACEMENT:
        // When Smart Replace is ON and confidence >= threshold (0.90), automatically convert!
        if (data.confidence >= settings.confidenceThreshold) {
          onConvertGroupToText(group, data.primary, settings.keepHandwriting, data.latex);
          pendingGroupRef.current = null;
          setActiveSuggestion(null);
          return;
        }

        // Medium confidence (0.70 - 0.89): Show subtle non-intrusive suggestion bubble (do NOT auto-replace)
        if (data.confidence >= 0.70) {
          setActiveSuggestion({
            id: `sug-${Date.now()}`,
            group,
            primary: data.primary,
            candidates: data.candidates || [],
            confidence: data.confidence,
            category: data.category || 'text',
            latex: data.latex,
            grounding: data.grounding,
            createdTime: Date.now(),
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[SmartInk] Recognition error:', err.message || err);
        }
      } finally {
        setIsRecognizing(false);
      }
    },
    [roomCode, settings, strokes, onConvertGroupToText]
  );

  // Process completed freehand stroke
  const processStroke = useCallback(
    (stroke: StrokeData) => {
      // 🛑 CRITICAL SAFETY: If Smart Ink or Smart Replace is OFF, exit IMMEDIATELY!
      if (!settings.enabled || !settings.smartReplace || stroke.tool !== 'brush' || stroke.isDeleted) {
        return;
      }

      const strokeBounds = getStrokeBounds(stroke);
      const now = Date.now();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!pendingGroupRef.current) {
        // Start new group
        pendingGroupRef.current = {
          id: `group-${now}`,
          strokeIds: [stroke.id],
          strokes: [stroke],
          bounds: strokeBounds,
          lastUpdated: now,
        };
      } else {
        // Evaluate spatial proximity
        const currentGroup = pendingGroupRef.current;
        const dx = Math.abs(strokeBounds.x - currentGroup.bounds.x);
        const dy = Math.abs(strokeBounds.y - currentGroup.bounds.y);

        if (dx <= SPATIAL_DISTANCE_THRESHOLD && dy <= SPATIAL_DISTANCE_THRESHOLD) {
          // Merge stroke into existing group
          pendingGroupRef.current = {
            ...currentGroup,
            strokeIds: [...currentGroup.strokeIds, stroke.id],
            strokes: [...currentGroup.strokes, stroke],
            bounds: mergeBounds(currentGroup.bounds, strokeBounds),
            lastUpdated: now,
          };
        } else {
          // Trigger recognition on previous word group if significant spatial jump
          triggerRecognition(currentGroup);
          pendingGroupRef.current = {
            id: `group-${now}`,
            strokeIds: [stroke.id],
            strokes: [stroke],
            bounds: strokeBounds,
            lastUpdated: now,
          };
        }
      }

      // Schedule debounced recognition after PAUSE_DEBOUNCE_MS (800ms)
      const groupToProcess = pendingGroupRef.current;
      debounceTimerRef.current = setTimeout(() => {
        if (groupToProcess) {
          triggerRecognition(groupToProcess);
        }
      }, PAUSE_DEBOUNCE_MS);
    },
    [settings.enabled, settings.smartReplace, triggerRecognition]
  );

  // Accept a candidate suggestion
  const acceptSuggestion = useCallback(
    (suggestion: SmartInkSuggestion, chosenText?: string, keepHandwriting?: boolean) => {
      const textToUse = chosenText || suggestion.primary;
      const keep = keepHandwriting !== undefined ? keepHandwriting : settings.keepHandwriting;
      onConvertGroupToText(suggestion.group, textToUse, keep, suggestion.latex);
      setActiveSuggestion(null);
      pendingGroupRef.current = null;
    },
    [onConvertGroupToText, settings.keepHandwriting]
  );

  // Reject / Dismiss suggestion
  const rejectSuggestion = useCallback(() => {
    setActiveSuggestion(null);
    pendingGroupRef.current = null;
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    settings,
    updateSettings,
    activeSuggestion,
    isRecognizing,
    processStroke,
    acceptSuggestion,
    rejectSuggestion,
  };
}
