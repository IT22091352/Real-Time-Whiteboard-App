'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Group, Ungroup, Trash2, Copy, RotateCw } from 'lucide-react';
import { useCanvas } from '../../hooks/useCanvas';
import { CursorOverlay } from './CursorOverlay';
import { InlineTextEditor, InlineTextState } from './InlineTextEditor';
import { ZoomControls } from './ZoomControls';
import { StrokeData, Point, DrawingTool, CursorPosition, LaserPosition } from '../../types/whiteboard';

interface CanvasProps {
  tool: DrawingTool;
  color: string;
  fillColor?: string;
  size: number;
  strokes: StrokeData[];
  selectedIds?: string[];
  gridMode?: 'off' | 'dot' | 'line';
  snapToGrid?: boolean;
  canvasTheme?: 'dark' | 'light';
  remoteCursors: Map<string, CursorPosition>;
  remoteLasers?: Map<string, LaserPosition>;
  localLaser?: LaserPosition | null;
  onSelectObjects?: (strokeIds: string[]) => void;
  onStrokeStart: (strokeId: string, tool: DrawingTool, color: string, size: number, initialPoint: Point, extraData?: Partial<StrokeData>) => void;
  onStrokeUpdate: (strokeId: string, points: Point[], extraData?: Partial<StrokeData>) => void;
  onStrokeEnd: (strokeId: string) => void;
  onObjectMove?: (strokeId: string, x?: number, y?: number, rotation?: number, points?: Point[]) => void;
  onBatchMove?: (moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }>) => void;
  onObjectUpdate?: (strokeId: string, updates: Partial<StrokeData>) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCursorMove: (x: number, y: number) => void;
  onLaserMove?: (x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  tool,
  color,
  fillColor = 'transparent',
  size,
  strokes,
  selectedIds = [],
  gridMode = 'dot',
  snapToGrid = false,
  canvasTheme = 'dark',
  remoteCursors,
  remoteLasers = new Map(),
  localLaser = null,
  onSelectObjects,
  onStrokeStart,
  onStrokeUpdate,
  onStrokeEnd,
  onObjectMove,
  onBatchMove,
  onObjectUpdate,
  onGroupSelected,
  onUngroupSelected,
  onDeleteSelected,
  onDuplicateSelected,
  onUndo,
  onRedo,
  onCursorMove,
  onLaserMove,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inlineTextState, setInlineTextState] = useState<InlineTextState | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Pan & Zoom Canvas State
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(4.0, z * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.25, z / 1.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  // Safely commit text editing on tool change if active
  useEffect(() => {
    if (inlineTextState && tool !== 'text' && tool !== 'select' && tool !== 'sticky') {
      setInlineTextState(null);
    }
  }, [tool, inlineTextState]);

  const handleCommitInlineText = useCallback(
    (textValue: string) => {
      if (!inlineTextState) return;

      const trimmed = textValue.trim();
      const rect = containerRef.current?.getBoundingClientRect();
      const canvasW = rect ? rect.width : 1000;
      const canvasH = rect ? rect.height : 600;

      const fontSize = inlineTextState.fontSize || (inlineTextState.toolType === 'sticky' ? 14 : 18);
      const lines = (trimmed || 'Text').split('\n');
      let maxChars = 0;
      lines.forEach((l) => {
        if (l.length > maxChars) maxChars = l.length;
      });

      const measuredWidthPx = Math.max(
        inlineTextState.toolType === 'sticky' ? 120 : 60,
        maxChars * fontSize * 0.6 + 16
      );
      const measuredHeightPx = Math.max(
        inlineTextState.toolType === 'sticky' ? 100 : 30,
        lines.length * fontSize * 1.3 + 12
      );

      const normW = Math.max(0.05, Math.min(0.9, measuredWidthPx / canvasW));
      const normH = Math.max(0.03, Math.min(0.9, measuredHeightPx / canvasH));

      if (inlineTextState.id) {
        // Editing existing text / sticky object
        if (trimmed.length > 0 && onObjectUpdate) {
          onObjectUpdate(inlineTextState.id, {
            text: trimmed,
            fontSize,
            width: normW,
            height: normH,
          });
        }
      } else {
        // Creating new text / sticky object
        if (trimmed.length > 0) {
          const strokeId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const toolType = inlineTextState.toolType || 'text';
          const strokeColor = inlineTextState.color || color;
          const strokeFill = inlineTextState.fillColor || (toolType === 'sticky' ? '#fef08a' : 'transparent');

          onStrokeStart(
            strokeId,
            toolType,
            strokeColor,
            size,
            { x: inlineTextState.x, y: inlineTextState.y },
            {
              text: trimmed,
              fontSize,
              fillColor: strokeFill,
              x: inlineTextState.x,
              y: inlineTextState.y,
              width: normW,
              height: normH,
            }
          );
          onStrokeEnd(strokeId);
          if (onSelectObjects) onSelectObjects([strokeId]);
        }
      }

      setInlineTextState(null);
    },
    [inlineTextState, color, size, onObjectUpdate, onStrokeStart, onStrokeEnd, onSelectObjects]
  );

  const handleCancelInlineText = useCallback(() => {
    setInlineTextState(null);
  }, []);

  // Keyboard Shortcuts (Ctrl+A Select All, Escape Deselect, Delete Batch Delete, Ctrl+D Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inlineTextState || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Ctrl + A / Cmd + A: Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const activeIds = strokes.filter((s) => !s.isDeleted).map((s) => s.id);
        if (onSelectObjects) onSelectObjects(activeIds);
      }

      // Escape: Deselect All
      if (e.key === 'Escape') {
        if (onSelectObjects) onSelectObjects([]);
      }

      // Delete / Backspace: Batch Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        if (onDeleteSelected) onDeleteSelected();
      }

      // Ctrl + Z / Cmd + Z: Undo or Redo (if Shift pressed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (onRedo) onRedo();
        } else {
          if (onUndo) onUndo();
        }
      }

      // Ctrl + Y / Cmd + Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (onRedo) onRedo();
      }

      // Ctrl + D / Cmd + D: Duplicate Selected
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedIds.length > 0) {
        e.preventDefault();
        if (onDuplicateSelected) onDuplicateSelected();
      }

      // Enter key shortcut to edit single selected text object
      if (e.key === 'Enter' && selectedIds.length === 1 && tool === 'select') {
        const obj = strokes.find((s) => s.id === selectedIds[0]);
        if (obj && (obj.tool === 'text' || obj.tool === 'sticky')) {
          e.preventDefault();
          setInlineTextState({
            id: obj.id,
            x: obj.x ?? 0.1,
            y: obj.y ?? 0.1,
            initialText: obj.text || '',
            color: obj.color || color,
            fontSize: obj.fontSize || (obj.tool === 'sticky' ? 14 : 18),
            toolType: obj.tool as any,
            fillColor: obj.fillColor,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, tool, strokes, inlineTextState, color, onSelectObjects, onDeleteSelected, onDuplicateSelected]);

  const {
    canvasRef,
    selectionBox,
    alignmentGuides,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  } = useCanvas({
    tool,
    color,
    fillColor,
    size,
    strokes,
    selectedIds,
    snapToGrid,
    pan,
    setPan,
    zoom,
    setZoom,
    onSelectObjects,
    onStartInlineText: (state) => setInlineTextState(state),
    onStrokeStart,
    onStrokeUpdate,
    onStrokeEnd,
    onObjectMove,
    onBatchMove,
    onObjectUpdate,
    onCursorMove,
    onLaserMove,
  });

  const eraserSizePx = Math.max(6, size * zoom);
  const rect = containerRef.current?.getBoundingClientRect();
  const canvasWidth = rect?.width || 1000;
  const canvasHeight = rect?.height || 600;

  // Selected Group state checking
  const isSelectedGroup = selectedIds.length === 1 && strokes.find((s) => s.id === selectedIds[0])?.tool === 'group';

  return (
    <div
      ref={containerRef}
      onPointerMove={(e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      }}
      onPointerLeave={() => setMousePos(null)}
      className={`relative w-full h-full transition-colors duration-300 touch-none select-none overflow-hidden ${
        canvasTheme === 'light' ? 'bg-slate-50' : 'bg-slate-950'
      } ${
        tool === 'hand'
          ? 'cursor-grab active:cursor-grabbing'
          : tool === 'select'
          ? 'cursor-default'
          : tool === 'text'
          ? 'cursor-text'
          : tool === 'laser' || tool === 'eraser' || tool === 'brush' || tool === 'highlighter'
          ? 'cursor-none'
          : 'cursor-crosshair'
      }`}
    >
      {/* Grid Pattern Background with Pan and Zoom Transformation */}
      {gridMode !== 'off' && (
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className={`absolute inset-0 pointer-events-none transition-transform duration-75 ${
            gridMode === 'dot'
              ? 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-35'
              : 'bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)]'
          }`}
        />
      )}

      {/* Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }
          handlePointerMove(e);
        }}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => {
          setMousePos(null);
          handlePointerLeave(e);
        }}
        className="absolute inset-0 w-full h-full block touch-none"
      />

      {/* Marquee Selection Rectangle Overlay */}
      {selectionBox && (
        <div
          style={{
            left: `${selectionBox.x1 * canvasWidth * zoom + pan.x}px`,
            top: `${selectionBox.y1 * canvasHeight * zoom + pan.y}px`,
            width: `${(selectionBox.x2 - selectionBox.x1) * canvasWidth * zoom}px`,
            height: `${(selectionBox.y2 - selectionBox.y1) * canvasHeight * zoom}px`,
          }}
          className="absolute pointer-events-none border border-dashed border-blue-500 bg-blue-500/10 z-20"
        />
      )}

      {/* Smart Alignment Guides Overlay */}
      {alignmentGuides.map((guide, idx) => (
        <div
          key={idx}
          style={{
            left: guide.type === 'v' ? `${guide.pos * canvasWidth * zoom + pan.x}px` : 0,
            top: guide.type === 'h' ? `${guide.pos * canvasHeight * zoom + pan.y}px` : 0,
            width: guide.type === 'v' ? '1px' : '100%',
            height: guide.type === 'h' ? '1px' : '100%',
          }}
          className="absolute pointer-events-none border-t border-l border-cyan-400 border-dashed z-20 shadow-[0_0_8px_#22d3ee]"
        />
      ))}

      {/* Ephemeral Laser Pointer Overlay (Local & Remote Users) */}
      {(tool === 'laser' && mousePos) || localLaser ? (
        <div
          style={{
            left: `${mousePos ? mousePos.x : (localLaser?.x || 0) * canvasWidth * zoom + pan.x}px`,
            top: `${mousePos ? mousePos.y : (localLaser?.y || 0) * canvasHeight * zoom + pan.y}px`,
          }}
          className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2"
        >
          <div className="w-5 h-5 rounded-full bg-red-500 shadow-[0_0_16px_4px_#ef4444] animate-ping opacity-75" />
          <div className="absolute inset-0 w-3 h-3 m-auto rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
        </div>
      ) : null}

      {Array.from(remoteLasers.values()).map((laser) => {
        const lx = laser.x * canvasWidth * zoom + pan.x;
        const ly = laser.y * canvasHeight * zoom + pan.y;
        return (
          <div
            key={laser.userId}
            style={{ left: `${lx}px`, top: `${ly}px` }}
            className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
          >
            <div className="w-6 h-6 rounded-full bg-red-500/40 shadow-[0_0_20px_6px_#ef4444] animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 m-auto rounded-full bg-red-400 border border-white shadow-[0_0_8px_#ef4444]" />
            <span className="absolute left-4 top-4 text-[10px] font-medium bg-red-950/80 text-red-200 px-1.5 py-0.5 rounded shadow border border-red-500/40 whitespace-nowrap">
              🔴 {laser.userName}
            </span>
          </div>
        );
      })}

      {/* Dynamic Square Eraser Cursor Preview Overlay */}
      {tool === 'eraser' && mousePos && (
        <div
          style={{
            left: `${mousePos.x - eraserSizePx / 2}px`,
            top: `${mousePos.y - eraserSizePx / 2}px`,
            width: `${eraserSizePx}px`,
            height: `${eraserSizePx}px`,
          }}
          className={`absolute pointer-events-none rounded-none border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3)] z-30 transition-[width,height] duration-75 ease-out ${
            canvasTheme === 'light'
              ? 'border-slate-800 bg-slate-900/15'
              : 'border-slate-900 bg-slate-100/30 dark:border-white dark:bg-pink-500/25'
          }`}
        />
      )}

      {/* Dynamic Pen & Highlighter Cursor Overlay */}
      {(tool === 'brush' || tool === 'highlighter') && mousePos && (
        <div
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
          className="absolute pointer-events-none z-30 transform -translate-x-0.5 -translate-y-full"
        >
          <div
            style={{
              width: `${Math.max(4, size * zoom)}px`,
              height: `${Math.max(4, size * zoom)}px`,
              backgroundColor: color === '#ffffff' && canvasTheme === 'light' ? '#000000' : color,
              opacity: tool === 'highlighter' ? 0.6 : 1.0,
            }}
            className="absolute rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_6px_rgba(0,0,0,0.4)] transform -translate-x-1/2 translate-y-1/2"
          />

          <Pencil
            className="w-5 h-5 -rotate-12 transition-transform duration-75"
            style={{
              color:
                (color === '#000000' || color === '#1e293b') && canvasTheme === 'dark'
                  ? '#38bdf8'
                  : color === '#ffffff' && canvasTheme === 'light'
                  ? '#000000'
                  : color,
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))',
            }}
          />
        </div>
      )}

      {/* Floating Action Context Bar for Selected Objects */}
      {selectedIds.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md text-white border border-slate-700 shadow-xl rounded-xl px-3 py-1.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="text-xs font-semibold text-blue-400 px-1 border-r border-slate-700 mr-1">
            {selectedIds.length} Selected
          </span>

          {selectedIds.length > 1 && onGroupSelected && (
            <button
              onClick={onGroupSelected}
              title="Group Objects"
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-slate-200 transition-colors border border-slate-700"
            >
              <Group className="w-3.5 h-3.5 text-blue-400" />
              Group
            </button>
          )}

          {isSelectedGroup && onUngroupSelected && (
            <button
              onClick={onUngroupSelected}
              title="Ungroup Objects"
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-slate-200 transition-colors border border-slate-700"
            >
              <Ungroup className="w-3.5 h-3.5 text-amber-400" />
              Ungroup
            </button>
          )}

          {onDuplicateSelected && (
            <button
              onClick={onDuplicateSelected}
              title="Duplicate (Ctrl+D)"
              className="p-1.5 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              title="Delete (Delete)"
              className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Inline Text Editor Overlay */}
      {inlineTextState && (
        <InlineTextEditor
          state={inlineTextState}
          containerRef={containerRef}
          pan={pan}
          zoom={zoom}
          onCommit={handleCommitInlineText}
          onCancel={handleCancelInlineText}
        />
      )}

      {/* Live Remote Collaborator Cursors Overlay */}
      <CursorOverlay cursors={remoteCursors} containerRef={containerRef} pan={pan} zoom={zoom} />

      {/* Floating Zoom & Pan Controls */}
      <ZoomControls
        zoom={zoom}
        pan={pan}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetZoom}
      />
    </div>
  );
};
