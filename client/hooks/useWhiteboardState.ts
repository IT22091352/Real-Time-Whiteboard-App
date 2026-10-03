import { useState, useCallback, useRef } from 'react';
import { StrokeData, Point, DrawingTool } from '../types/whiteboard';

export function useWhiteboardState() {
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const activeStrokesRef = useRef<Map<string, StrokeData>>(new Map());

  const setAllStrokes = useCallback((newStrokes: StrokeData[]) => {
    const map = new Map<string, StrokeData>();
    newStrokes.forEach((s) => map.set(s.id, s));
    activeStrokesRef.current = map;
    setStrokes(newStrokes.filter((s) => !s.isDeleted));
  }, []);

  const addOrUpdateStroke = useCallback((stroke: StrokeData) => {
    activeStrokesRef.current.set(stroke.id, stroke);
    setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
  }, []);

  const startLocalStroke = useCallback(
    (
      strokeId: string,
      tool: DrawingTool,
      color: string,
      size: number,
      initialPoint: Point,
      extraData?: Partial<StrokeData>
    ): StrokeData => {
      const newStroke: StrokeData = {
        id: strokeId,
        roomId: '',
        tool,
        color,
        size,
        points: [initialPoint],
        fillColor: extraData?.fillColor,
        x: extraData?.x,
        y: extraData?.y,
        width: extraData?.width,
        height: extraData?.height,
        text: extraData?.text,
        fontSize: extraData?.fontSize,
        fromId: extraData?.fromId,
        toId: extraData?.toId,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      activeStrokesRef.current.set(strokeId, newStroke);
      setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
      return newStroke;
    },
    []
  );

  const appendPointsToStroke = useCallback((strokeId: string, newPoints: Point[], extraData?: Partial<StrokeData>) => {
    let stroke = activeStrokesRef.current.get(strokeId);
    if (!stroke) {
      stroke = {
        id: strokeId,
        roomId: '',
        tool: extraData?.tool || 'brush',
        color: extraData?.color || '#3b82f6',
        size: extraData?.size || 3,
        points: [],
        fillColor: extraData?.fillColor || 'transparent',
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
    }

    if (newPoints && newPoints.length > 0) {
      stroke.points.push(...newPoints);
    }
    if (extraData) {
      const cleaned: Partial<StrokeData> = {};
      (Object.keys(extraData) as (keyof StrokeData)[]).forEach((key) => {
        if (extraData[key] !== undefined && extraData[key] !== null) {
          (cleaned as any)[key] = extraData[key];
        }
      });
      Object.assign(stroke, cleaned);
    }
    activeStrokesRef.current.set(strokeId, stroke);

    setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
  }, []);

  const updateStrokeObject = useCallback((strokeId: string, updates: Partial<StrokeData>) => {
    const stroke = activeStrokesRef.current.get(strokeId);
    if (!stroke) return;

    const cleaned: Partial<StrokeData> = {};
    (Object.keys(updates) as (keyof StrokeData)[]).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== null) {
        (cleaned as any)[key] = updates[key];
      }
    });
    Object.assign(stroke, cleaned);
    activeStrokesRef.current.set(strokeId, stroke);
    setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
  }, []);

  const deleteObjectById = useCallback((strokeId: string) => {
    const stroke = activeStrokesRef.current.get(strokeId);
    if (stroke) {
      stroke.isDeleted = true;
      activeStrokesRef.current.set(strokeId, stroke);
      setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
    }
  }, []);

  const restoreStrokeById = useCallback((strokeId: string) => {
    const stroke = activeStrokesRef.current.get(strokeId);
    if (stroke) {
      stroke.isDeleted = false;
      activeStrokesRef.current.set(strokeId, stroke);
      setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
    }
  }, []);

  const undoStrokeById = useCallback((strokeId: string) => {
    const stroke = activeStrokesRef.current.get(strokeId);
    if (stroke) {
      stroke.isDeleted = true;
      activeStrokesRef.current.set(strokeId, stroke);
      setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
    }
  }, []);

  const redoStroke = useCallback((stroke: StrokeData) => {
    stroke.isDeleted = false;
    activeStrokesRef.current.set(stroke.id, stroke);
    setStrokes(Array.from(activeStrokesRef.current.values()).filter((s) => !s.isDeleted));
  }, []);

  const clearBoard = useCallback(() => {
    activeStrokesRef.current.forEach((stroke) => {
      stroke.isDeleted = true;
    });
    setStrokes([]);
  }, []);

  return {
    strokes,
    activeStrokesMap: activeStrokesRef.current,
    setAllStrokes,
    addOrUpdateStroke,
    startLocalStroke,
    appendPointsToStroke,
    updateStrokeObject,
    deleteObjectById,
    restoreStrokeById,
    undoStrokeById,
    redoStroke,
    clearBoard,
  };
}
