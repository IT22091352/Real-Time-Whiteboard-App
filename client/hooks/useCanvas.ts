import { useRef, useEffect, useCallback, useState } from 'react';
import { Point, DrawingTool, StrokeData } from '../types/whiteboard';
import { normalizePoint, redrawFullCanvas, isPointInsideObject, drawStroke, getObjectBoundingBox, getMultiObjectBoundingBox } from '../lib/canvas-utils';
import { InlineTextState } from '../components/whiteboard/InlineTextEditor';

export interface AlignmentGuide {
  type: 'h' | 'v'; // horizontal or vertical
  pos: number; // normalized coordinate
}

interface UseCanvasOptions {
  tool: DrawingTool;
  color: string;
  fillColor?: string;
  size: number;
  strokes: StrokeData[];
  selectedIds?: string[];
  snapToGrid?: boolean;
  pan?: { x: number; y: number };
  setPan?: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom?: number;
  setZoom?: React.Dispatch<React.SetStateAction<number>>;
  onSelectObjects?: (strokeIds: string[]) => void;
  onStartInlineText?: (state: InlineTextState) => void;
  onStrokeStart: (strokeId: string, tool: DrawingTool, color: string, size: number, initialPoint: Point, extraData?: Partial<StrokeData>) => void;
  onStrokeUpdate: (strokeId: string, points: Point[], extraData?: Partial<StrokeData>) => void;
  onStrokeEnd: (strokeId: string) => void;
  onObjectMove?: (strokeId: string, x?: number, y?: number, rotation?: number, points?: Point[]) => void;
  onBatchMove?: (moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }>) => void;
  onObjectUpdate?: (strokeId: string, updates: Partial<StrokeData>) => void;
  onCursorMove?: (x: number, y: number) => void;
  onLaserMove?: (x: number, y: number) => void;
}

export function useCanvas({
  tool,
  color,
  fillColor = 'transparent',
  size,
  strokes,
  selectedIds = [],
  snapToGrid = false,
  pan = { x: 0, y: 0 },
  setPan,
  zoom = 1.0,
  setZoom,
  onSelectObjects,
  onStartInlineText,
  onStrokeStart,
  onStrokeUpdate,
  onStrokeEnd,
  onObjectMove,
  onBatchMove,
  onObjectUpdate,
  onCursorMove,
  onLaserMove,
}: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const isSelectingMarqueeRef = useRef(false);
  const isPanningRef = useRef(false);

  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentStrokeIdRef = useRef<string | null>(null);
  const pendingPointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const lastCursorEmitTimeRef = useRef<number>(0);
  const lastLaserEmitTimeRef = useRef<number>(0);

  // Marquee Selection Box State
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Smart Alignment Guides State
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // Touch gesture refs for 2-finger pinch/pan
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to match display size with high DPI support
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      redrawFullCanvas(ctx, strokes, rect.width, rect.height, selectedIds, pan, zoom);
    }
  }, [strokes, selectedIds, pan, zoom]);

  // Handle window resize & stroke updates
  useEffect(() => {
    updateCanvasDimensions();
    const handleResize = () => updateCanvasDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasDimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      redrawFullCanvas(ctx, strokes, rect.width, rect.height, selectedIds, pan, zoom);
    }
  }, [strokes, selectedIds, pan, zoom]);

  // Mouse wheel & Pinch zoom listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();

      if (e.ctrlKey || e.metaKey) {
        // Zoom around cursor position
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = Math.pow(1.0015, -e.deltaY);
        const newZoom = Math.max(0.25, Math.min(4.0, zoom * zoomFactor));

        if (setZoom && setPan) {
          const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
          const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }
      } else {
        // Wheel Panning
        if (setPan) {
          setPan((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }));
        }
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom, pan, setZoom, setPan]);

  // 2-Finger Touch Pinch Zoom & Pan Listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Cancel any active drawing
        isDrawingRef.current = false;
        isDraggingRef.current = false;
        isSelectingMarqueeRef.current = false;
        setSelectionBox(null);
        currentStrokeIdRef.current = null;

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialPinchDistRef.current = dist;
        initialZoomRef.current = zoom;
        lastTouchCenterRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistRef.current && lastTouchCenterRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        const scale = dist / initialPinchDistRef.current;
        const newZoom = Math.max(0.25, Math.min(4.0, initialZoomRef.current * scale));

        const rect = canvas.getBoundingClientRect();
        const touchX = center.x - rect.left;
        const touchY = center.y - rect.top;

        const dx = center.x - lastTouchCenterRef.current.x;
        const dy = center.y - lastTouchCenterRef.current.y;
        lastTouchCenterRef.current = center;

        if (setZoom && setPan) {
          const newPanX = touchX - (touchX - pan.x) * (newZoom / zoom) + dx;
          const newPanY = touchY - (touchY - pan.y) * (newZoom / zoom) + dy;
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistRef.current = null;
        lastTouchCenterRef.current = null;
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [zoom, pan, setZoom, setPan]);

  // Pointer event listeners
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();

    const effectiveSize = size;

    // 0. HAND TOOL / MIDDLE-CLICK PANNING
    if (tool === 'hand' || e.button === 1) {
      isPanningRef.current = true;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const point = normalizePoint(canvas, e.clientX, e.clientY, pan, zoom);

    // 1. LASER POINTER TOOL
    if (tool === 'laser') {
      if (onLaserMove) onLaserMove(point.x, point.y);
      return;
    }

    // 2. SELECT TOOL (Selection, Multi-Selection, Rotation, Marquee Dragging)
    if (tool === 'select') {
      // Check for rotation handle hit if objects are selected
      if (selectedIds.length > 0) {
        const selectedStrokes = strokes.filter((s) => selectedIds.includes(s.id) && !s.isDeleted);
        const combinedBounds = selectedIds.length === 1
          ? getObjectBoundingBox(selectedStrokes[0], rect.width, rect.height)
          : getMultiObjectBoundingBox(selectedStrokes, rect.width, rect.height);

        if (combinedBounds) {
          const topCenterX = combinedBounds.x + combinedBounds.width / 2;
          const rotHandleY = combinedBounds.y - 4 - 24;
          const px = point.x * rect.width;
          const py = point.y * rect.height;

          const distToRotHandle = Math.hypot(px - topCenterX, py - rotHandleY);
          if (distToRotHandle <= 14) {
            // Rotation Handle Drag Started!
            isRotatingRef.current = true;
            startPointRef.current = point;
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      // Check hit-testing on objects (reverse order for z-index overlay priority)
      const reversedStrokes = [...strokes].reverse();
      const hitObj = reversedStrokes.find((s) => !s.isDeleted && isPointInsideObject(point, s, rect.width, rect.height));

      if (hitObj) {
        let newSelectedIds: string[] = [];
        if (e.shiftKey) {
          // Shift + Click Multi-Select toggle
          if (selectedIds.includes(hitObj.id)) {
            newSelectedIds = selectedIds.filter((id) => id !== hitObj.id);
          } else {
            newSelectedIds = [...selectedIds, hitObj.id];
          }
        } else {
          // Normal click selection
          if (selectedIds.includes(hitObj.id)) {
            newSelectedIds = selectedIds;
          } else {
            newSelectedIds = [hitObj.id];
          }
        }

        if (onSelectObjects) onSelectObjects(newSelectedIds);

        // Double Click for inline text editor
        if ((e.detail === 2 || e.type === 'dblclick') && (hitObj.tool === 'text' || hitObj.tool === 'sticky') && onStartInlineText) {
          onStartInlineText({
            id: hitObj.id,
            x: hitObj.x ?? point.x,
            y: hitObj.y ?? point.y,
            initialText: hitObj.text || '',
            color: hitObj.color || color,
            fontSize: hitObj.fontSize || (hitObj.tool === 'sticky' ? 14 : 18),
            toolType: hitObj.tool as any,
            fillColor: hitObj.fillColor,
          });
          return;
        }

        isDraggingRef.current = true;
        startPointRef.current = point;
        canvas.setPointerCapture(e.pointerId);
      } else {
        // Empty canvas click -> Start Drag-Selection Marquee Rectangle
        if (!e.shiftKey && onSelectObjects) {
          onSelectObjects([]);
        }
        isSelectingMarqueeRef.current = true;
        startPointRef.current = point;
        setSelectionBox({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }

    // 3. TEXT TOOL PLACEMENT
    if (tool === 'text') {
      if (onStartInlineText) {
        onStartInlineText({
          x: point.x,
          y: point.y,
          initialText: '',
          color,
          fontSize: Math.max(14, effectiveSize * 4),
          toolType: 'text',
        });
      }
      return;
    }

    // 4. STICKY NOTE PLACEMENT
    if (tool === 'sticky') {
      const stickyBg = color === '#000000' || color === '#ffffff' ? '#fef08a' : color;
      if (onStartInlineText) {
        onStartInlineText({
          x: point.x,
          y: point.y,
          initialText: '',
          color: '#1e293b',
          fontSize: 14,
          toolType: 'sticky',
          fillColor: stickyBg,
        });
      }
      return;
    }

    // 5. FREEHAND BRUSH / HIGHLIGHTER / ERASER / SHAPES CREATION
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    startPointRef.current = point;

    const strokeId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    currentStrokeIdRef.current = strokeId;
    pendingPointsRef.current = [point];

    const extraData: Partial<StrokeData> = {
      fillColor: tool === 'brush' || tool === 'eraser' || tool === 'highlighter' ? 'transparent' : fillColor,
      x: point.x,
      y: point.y,
      width: 0.01,
      height: 0.01,
      isHighlighter: tool === 'highlighter',
    };

    onStrokeStart(strokeId, tool, color, effectiveSize, point, extraData);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle Active Panning
    if (isPanningRef.current) {
      const dx = e.clientX - lastPointerPosRef.current.x;
      const dy = e.clientY - lastPointerPosRef.current.y;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

      if (setPan) {
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      return;
    }

    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
    const point = normalizePoint(canvas, e.clientX, e.clientY, pan, zoom);

    // Emit throttled cursor position (~30ms throttle)
    const now = Date.now();
    if (onCursorMove && now - lastCursorEmitTimeRef.current > 30) {
      lastCursorEmitTimeRef.current = now;
      onCursorMove(point.x, point.y);
    }

    // Handle Laser Pointer Mode
    if (tool === 'laser') {
      if (onLaserMove && now - lastLaserEmitTimeRef.current > 30) {
        lastLaserEmitTimeRef.current = now;
        onLaserMove(point.x, point.y);
      }
      return;
    }

    // Handle Object Rotation Dragging
    if (isRotatingRef.current && selectedIds.length > 0) {
      const selectedStrokes = strokes.filter((s) => selectedIds.includes(s.id) && !s.isDeleted);
      const combinedBounds = selectedIds.length === 1
        ? getObjectBoundingBox(selectedStrokes[0], rect.width, rect.height)
        : getMultiObjectBoundingBox(selectedStrokes, rect.width, rect.height);

      if (combinedBounds) {
        const cX = combinedBounds.x + combinedBounds.width / 2;
        const cY = combinedBounds.y + combinedBounds.height / 2;
        const px = point.x * rect.width;
        const py = point.y * rect.height;

        let angleDeg = (Math.atan2(py - cY, px - cX) * 180) / Math.PI + 90;
        if (angleDeg < 0) angleDeg += 360;

        // Shift key snaps rotation to 15° increments
        if (e.shiftKey) {
          angleDeg = Math.round(angleDeg / 15) * 15;
        }

        selectedStrokes.forEach((s) => {
          if (onObjectMove) {
            onObjectMove(s.id, s.x, s.y, Math.round(angleDeg), s.points);
          }
        });
      }
      return;
    }

    // Handle Drag-Selection Marquee Box
    if (isSelectingMarqueeRef.current && startPointRef.current) {
      setSelectionBox({
        x1: Math.min(startPointRef.current.x, point.x),
        y1: Math.min(startPointRef.current.y, point.y),
        x2: Math.max(startPointRef.current.x, point.x),
        y2: Math.max(startPointRef.current.y, point.y),
      });
      return;
    }

    // Handle Object Drag / Move (Single & Multi-Select)
    if (isDraggingRef.current && startPointRef.current && selectedIds.length > 0) {
      let dx = point.x - startPointRef.current.x;
      let dy = point.y - startPointRef.current.y;

      // Optional Snap to Grid interval (~0.02 normalized)
      if (snapToGrid) {
        const gridStep = 0.02;
        dx = Math.round(dx / gridStep) * gridStep;
        dy = Math.round(dy / gridStep) * gridStep;
      }

      if (dx === 0 && dy === 0) return;
      startPointRef.current = point;

      // Calculate Smart Alignment Guides with existing unselected objects
      const unselectedStrokes = strokes.filter((s) => !selectedIds.includes(s.id) && !s.isDeleted);
      const newGuides: AlignmentGuide[] = [];

      selectedIds.forEach((id) => {
        const obj = strokes.find((s) => s.id === id);
        if (obj && obj.x !== undefined && obj.y !== undefined) {
          const currX = obj.x + dx;
          const currY = obj.y + dy;

          unselectedStrokes.forEach((other) => {
            if (other.x !== undefined && other.y !== undefined) {
              // Left / Right / Center X alignment
              if (Math.abs(currX - other.x) < 0.008) {
                newGuides.push({ type: 'v', pos: other.x });
              }
              // Top / Bottom / Middle Y alignment
              if (Math.abs(currY - other.y) < 0.008) {
                newGuides.push({ type: 'h', pos: other.y });
              }
            }
          });
        }
      });
      setAlignmentGuides(newGuides);

      const movesPayload: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }> = [];

      selectedIds.forEach((id) => {
        const obj = strokes.find((s) => s.id === id);
        if (obj) {
          const newX = (obj.x !== undefined ? obj.x : point.x) + dx;
          const newY = (obj.y !== undefined ? obj.y : point.y) + dy;
          const updatedPoints = obj.points ? obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : [];

          movesPayload.push({
            strokeId: obj.id,
            x: newX,
            y: newY,
            rotation: obj.rotation,
            points: updatedPoints,
          });

          if (onObjectMove) {
            onObjectMove(obj.id, newX, newY, obj.rotation, updatedPoints);
          }
        }
      });

      if (onBatchMove && movesPayload.length > 1) {
        onBatchMove(movesPayload);
      }
      return;
    }

    if (!isDrawingRef.current || !currentStrokeIdRef.current || !startPointRef.current) return;

    // Handle Active Freehand / Shape Creation
    const startP = startPointRef.current;

    if (tool === 'brush' || tool === 'eraser' || tool === 'highlighter') {
      pendingPointsRef.current.push(point);

      if (now - lastEmitTimeRef.current >= 16) {
        const pointsToEmit = [...pendingPointsRef.current];
        pendingPointsRef.current = [];
        lastEmitTimeRef.current = now;

        onStrokeUpdate(currentStrokeIdRef.current, pointsToEmit);
      }
    } else {
      const minX = Math.min(startP.x, point.x);
      const minY = Math.min(startP.y, point.y);
      const w = Math.abs(point.x - startP.x);
      const h = Math.abs(point.y - startP.y);

      const extraData: Partial<StrokeData> = {
        x: minX,
        y: minY,
        width: w,
        height: h,
        color,
        fillColor,
        size,
      };

      if (now - lastEmitTimeRef.current >= 16) {
        lastEmitTimeRef.current = now;
        onStrokeUpdate(currentStrokeIdRef.current, [startP, point], extraData);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    // Clear Alignment Guides
    if (alignmentGuides.length > 0) {
      setAlignmentGuides([]);
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      startPointRef.current = null;
      return;
    }

    // Finalize Marquee Selection Box
    if (isSelectingMarqueeRef.current && selectionBox) {
      isSelectingMarqueeRef.current = false;
      const parent = canvas?.parentElement;
      const canvasW = parent ? parent.getBoundingClientRect().width : 1000;
      const canvasH = parent ? parent.getBoundingClientRect().height : 600;

      const hitIds: string[] = [];
      strokes.forEach((s) => {
        if (s.isDeleted) return;
        const bounds = getObjectBoundingBox(s, canvasW, canvasH);
        const normBounds = {
          x1: bounds.x / canvasW,
          y1: bounds.y / canvasH,
          x2: (bounds.x + bounds.width) / canvasW,
          y2: (bounds.y + bounds.height) / canvasH,
        };

        // Check bounding box intersection with selection marquee
        if (
          normBounds.x1 <= selectionBox.x2 &&
          normBounds.x2 >= selectionBox.x1 &&
          normBounds.y1 <= selectionBox.y2 &&
          normBounds.y2 >= selectionBox.y1
        ) {
          hitIds.push(s.id);
        }
      });

      if (onSelectObjects) {
        onSelectObjects(hitIds);
      }

      setSelectionBox(null);
      startPointRef.current = null;
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      currentStrokeIdRef.current = null;
      startPointRef.current = null;
      return;
    }

    if (!isDrawingRef.current || !currentStrokeIdRef.current) return;

    if (pendingPointsRef.current.length > 0) {
      onStrokeUpdate(currentStrokeIdRef.current, pendingPointsRef.current);
    }

    onStrokeEnd(currentStrokeIdRef.current);

    isDrawingRef.current = false;
    currentStrokeIdRef.current = null;
    pendingPointsRef.current = [];
    startPointRef.current = null;
  };

  return {
    canvasRef,
    selectionBox,
    alignmentGuides,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave: handlePointerUp,
  };
}
