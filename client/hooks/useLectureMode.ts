import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../lib/api';
import { StrokeData } from '../types/whiteboard';
import {
  LectureEvent,
  LectureSnapshot,
  LectureAction,
  StructuredLectureNotes,
  LectureQuizResponse,
  LectureFlashcardsResponse,
  LectureQAResponse,
  LectureReplayState,
  ProviderMetadata,
} from '../types/lecture';

interface UseLectureModeProps {
  roomCode: string;
  strokes: StrokeData[];
  currentUser?: { id: string; name: string } | null;
}

export function useLectureMode({ roomCode, strokes, currentUser }: UseLectureModeProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [events, setEvents] = useState<LectureEvent[]>([]);
  const [snapshots, setSnapshots] = useState<LectureSnapshot[]>([]);

  // AI Loading & Result States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<LectureAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notesResult, setNotesResult] = useState<StructuredLectureNotes | null>(null);
  const [quizResult, setQuizResult] = useState<LectureQuizResponse | null>(null);
  const [flashcardsResult, setFlashcardsResult] = useState<LectureFlashcardsResponse | null>(null);
  const [qaResult, setQaResult] = useState<LectureQAResponse | null>(null);

  // ⏯️ Lecture Replay State
  const [replayState, setReplayState] = useState<LectureReplayState>({
    isPlaying: false,
    playbackSpeed: 1,
    currentTimeOffsetSeconds: 0,
    totalDurationSeconds: 0,
    previewBoardState: undefined,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevStrokesRef = useRef<StrokeData[]>([]);
  const lastSnapshotTimeRef = useRef<number>(0);
  const offlineBufferRef = useRef<LectureEvent[]>([]);

  const STORAGE_KEY = `lecture_session_${roomCode}`;

  // 1. Session Persistence & Resume on Refresh / Reconnect
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.isRecording && parsed.startedAt) {
          setSessionId(parsed.sessionId || `session-${parsed.startedAt}`);
          setIsRecording(true);
          setStartedAt(parsed.startedAt);
          setEvents(parsed.events || []);
          setSnapshots(parsed.snapshots || []);
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - parsed.startedAt) / 1000)));
        }
      } catch (e) {
        console.warn('[useLectureMode] Failed to restore session from LocalStorage:', e);
      }
    }
  }, [STORAGE_KEY]);

  // Sync state to LocalStorage
  useEffect(() => {
    if (isRecording && startedAt) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId,
          isRecording,
          startedAt,
          events,
          snapshots,
        })
      );
    }
  }, [isRecording, startedAt, events, snapshots, STORAGE_KEY, sessionId]);

  // 2. Timer Loop for Recording Duration
  useEffect(() => {
    if (isRecording && startedAt) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, startedAt]);

  // 3. Record Event Helper with Multi-user Attribution
  const recordEvent = useCallback(
    (
      type: LectureEvent['type'],
      summary: string,
      strokeId?: string,
      objectType?: string,
      text?: string,
      customUser?: { id: string; name: string }
    ) => {
      if (!startedAt) return;

      const now = Date.now();
      const timeOffsetSeconds = Math.floor((now - startedAt) / 1000);

      const newEvent: LectureEvent = {
        id: `evt-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        timestamp: now,
        timeOffsetSeconds,
        summary,
        userId: customUser?.id || currentUser?.id || 'unknown',
        userName: customUser?.name || currentUser?.name || 'Anonymous User',
        strokeId,
        objectType,
        text,
        authorName: customUser?.name || currentUser?.name || 'Anonymous User',
      };

      setEvents((prev) => [...prev, newEvent]);

      // Buffer offline or send to server DB
      if (navigator.onLine && sessionId) {
        const serverUrl = getApiBaseUrl();
        fetch(`${serverUrl}/api/ai/lecture/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lectureSessionId: sessionId,
            ...newEvent,
          }),
        }).catch(() => {
          offlineBufferRef.current.push(newEvent);
        });
      } else {
        offlineBufferRef.current.push(newEvent);
      }
    },
    [startedAt, currentUser, sessionId]
  );

  // 4. Smart Checkpoint Strategy (Semantic board evolution tracking)
  useEffect(() => {
    if (!isRecording || !startedAt) {
      prevStrokesRef.current = strokes;
      return;
    }

    const prevStrokes = prevStrokesRef.current;
    const activeStrokes = strokes.filter((s) => !s.isDeleted);
    const prevActive = prevStrokes.filter((s) => !s.isDeleted);

    if (activeStrokes.length > prevActive.length) {
      // New object created
      const added = activeStrokes.find((s) => !prevActive.some((ps) => ps.id === s.id));
      if (added) {
        const authorName = added.userName || currentUser?.name || 'Anonymous';
        const label = added.text ? `"${added.text.substring(0, 30)}"` : added.tool;
        const type = added.tool === 'text' ? 'text_created' : added.tool === 'sticky' ? 'text_edited' : 'shape_added';

        recordEvent(type, `${authorName} added ${added.tool}: ${label}`, added.id, added.tool, added.text, {
          id: added.userId || 'unknown',
          name: authorName,
        });
      }
    } else if (activeStrokes.length < prevActive.length) {
      // Object deleted
      const deleted = prevActive.find((ps) => !activeStrokes.some((s) => s.id === ps.id));
      if (deleted) {
        recordEvent('object_deleted', `Deleted ${deleted.tool}`, deleted.id, deleted.tool);
      }
    }

    // Capture semantic snapshot checkpoint every 15s or on major change
    const now = Date.now();
    if (now - lastSnapshotTimeRef.current > 15000 && activeStrokes.length > 0) {
      lastSnapshotTimeRef.current = now;
      const offset = Math.floor((now - startedAt) / 1000);
      const textSummaries = activeStrokes.map((s) => s.text).filter(Boolean).join(', ');

      const newSnapshot: LectureSnapshot = {
        id: `snap-${now}`,
        timestamp: now,
        timeOffsetSeconds: offset,
        title: `Checkpoint +${Math.floor(offset / 60)}m`,
        objectCount: activeStrokes.length,
        textSummary: textSummaries || `Board containing ${activeStrokes.length} elements`,
        boardState: JSON.parse(JSON.stringify(activeStrokes)),
      };

      setSnapshots((prev) => [...prev, newSnapshot]);

      if (navigator.onLine && sessionId) {
        const serverUrl = getApiBaseUrl();
        fetch(`${serverUrl}/api/ai/lecture/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lectureSessionId: sessionId,
            ...newSnapshot,
          }),
        }).catch(() => {});
      }
    }

    prevStrokesRef.current = strokes;
  }, [strokes, isRecording, startedAt, recordEvent, currentUser, sessionId]);

  // 5. Offline Reconnect Sync
  useEffect(() => {
    const handleOnline = () => {
      if (offlineBufferRef.current.length > 0 && sessionId) {
        const serverUrl = getApiBaseUrl();
        const buffer = [...offlineBufferRef.current];
        offlineBufferRef.current = [];

        buffer.forEach((evt) => {
          fetch(`${serverUrl}/api/ai/lecture/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lectureSessionId: sessionId, ...evt }),
          }).catch(() => {});
        });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sessionId]);

  // 6. Start Lecture
  const startLecture = useCallback(async () => {
    const now = Date.now();
    const newSessionId = `lecture-${now}`;

    setSessionId(newSessionId);
    setIsRecording(true);
    setStartedAt(now);
    setEndedAt(null);
    setElapsedSeconds(0);
    setEvents([]);
    setSnapshots([]);
    setNotesResult(null);
    setQuizResult(null);
    setFlashcardsResult(null);
    setQaResult(null);

    // Persist to Server DB
    if (navigator.onLine) {
      try {
        const serverUrl = getApiBaseUrl();
        const res = await fetch(`${serverUrl}/api/ai/lecture/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            startedAt: now,
            createdBy: currentUser?.id || 'unknown',
            createdByName: currentUser?.name || 'Anonymous Teacher',
          }),
        });
        const data = await res.json();
        if (data.success && data.data.id) {
          setSessionId(data.data.id);
        }
      } catch (e) {
        console.warn('[useLectureMode] DB session create error, continuing locally:', e);
      }
    }
  }, [roomCode, currentUser]);

  // 7. End Lecture (Staged Generation: Notes immediately)
  const endLecture = useCallback(async () => {
    const now = Date.now();
    setIsRecording(false);
    setEndedAt(now);
    localStorage.removeItem(STORAGE_KEY);

    // Fire Stage 1: Generate Structured Notes immediately
    callLectureAI('notes');
  }, [STORAGE_KEY]);

  // 8. Call Lecture AI Endpoint
  const callLectureAI = useCallback(
    async (action: LectureAction, userQuestion?: string, canvasImage?: string) => {
      if (!startedAt) return;
      setIsLoading(true);
      setActiveAction(action);
      setError(null);

      const serverUrl = getApiBaseUrl();
      const activeStrokes = strokes.filter((s) => !s.isDeleted);

      try {
        const payload = {
          action,
          roomCode,
          lectureId: sessionId || `lecture-${startedAt}`,
          startedAt,
          endedAt: endedAt || Date.now(),
          events,
          snapshots,
          currentStrokes: activeStrokes.map((s) => ({
            id: s.id,
            tool: s.tool,
            color: s.color,
            text: s.text,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
          })),
          image: canvasImage,
          userQuestion,
        };

        const res = await fetch(`${serverUrl}/api/ai/lecture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to process lecture AI request.');
        }

        const result = data.data;

        switch (action) {
          case 'quiz':
            setQuizResult(result);
            break;
          case 'flashcards':
            setFlashcardsResult(result);
            break;
          case 'ask_question':
            setQaResult(result);
            break;
          case 'notes':
          case 'progression':
          case 'what_changed':
          case 'missing_concepts':
          case 'possible_confusion':
          default:
            setNotesResult(result);
            break;
        }

        return result;
      } catch (err: any) {
        console.error('[useLectureMode] AI call error:', err.message || err);
        setError(err.message || 'Lecture AI analysis failed. Please try again.');
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [roomCode, startedAt, endedAt, events, snapshots, strokes, sessionId]
  );

  // 9. Replay Control Helpers
  const startReplay = useCallback(() => {
    if (snapshots.length === 0) return;
    const maxOffset = Math.max(...snapshots.map((s) => s.timeOffsetSeconds), elapsedSeconds);
    setReplayState((prev) => ({
      ...prev,
      isPlaying: true,
      currentTimeOffsetSeconds: 0,
      totalDurationSeconds: maxOffset,
      previewBoardState: snapshots[0]?.boardState,
    }));
  }, [snapshots, elapsedSeconds]);

  const pauseReplay = useCallback(() => {
    setReplayState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const seekReplay = useCallback(
    (offsetSeconds: number) => {
      // Find snapshot closest to offset
      let closestSnap = snapshots[0];
      let minDiff = Infinity;

      snapshots.forEach((snap) => {
        const diff = Math.abs(snap.timeOffsetSeconds - offsetSeconds);
        if (diff < minDiff) {
          minDiff = diff;
          closestSnap = snap;
        }
      });

      setReplayState((prev) => ({
        ...prev,
        currentTimeOffsetSeconds: offsetSeconds,
        previewBoardState: closestSnap?.boardState,
        activeSnapshotId: closestSnap?.id,
      }));
    },
    [snapshots]
  );

  const stopReplay = useCallback(() => {
    setReplayState((prev) => ({
      ...prev,
      isPlaying: false,
      previewBoardState: undefined,
    }));
  }, []);

  return {
    sessionId,
    isRecording,
    startedAt,
    endedAt,
    elapsedSeconds,
    events,
    snapshots,
    isLoading,
    activeAction,
    error,
    notesResult,
    quizResult,
    flashcardsResult,
    qaResult,
    replayState,
    startLecture,
    endLecture,
    recordEvent,
    callLectureAI,
    startReplay,
    pauseReplay,
    seekReplay,
    stopReplay,
  };
}
