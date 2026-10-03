'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

export interface InlineTextState {
  id?: string; // If editing an existing object
  x: number; // Normalized X coordinate (0.0 to 1.0)
  y: number; // Normalized Y coordinate (0.0 to 1.0)
  initialText: string;
  color: string;
  fontSize: number;
  toolType?: 'text' | 'sticky';
  fillColor?: string;
}

interface InlineTextEditorProps {
  state: InlineTextState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pan?: { x: number; y: number };
  zoom?: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  state,
  containerRef,
  pan = { x: 0, y: 0 },
  zoom = 1.0,
  onCommit,
  onCancel,
}) => {
  const [text, setText] = useState(state.initialText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Position calculation in viewport pixel coordinates with pan & zoom
  const [pos, setPos] = useState<{ left: number; top: number; width: number }>({
    left: 0,
    top: 0,
    width: 160,
  });

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const left = state.x * rect.width * zoom + pan.x;
    const top = state.y * rect.height * zoom + pan.y;
    setPos({
      left,
      top,
      width: Math.max(160, rect.width * 0.3 * zoom),
    });
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [state.x, state.y, pan.x, pan.y, zoom]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      if (textarea.value.length > 0) {
        textarea.setSelectionRange(0, textarea.value.length);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter inserts newline
        return;
      }
      if (e.ctrlKey || e.metaKey || !text.includes('\n')) {
        // Enter (single-line or Ctrl+Enter) commits edit
        e.preventDefault();
        e.stopPropagation();
        onCommit(text);
        return;
      }
    }
  };

  const isSticky = state.toolType === 'sticky';
  const textColor = isSticky && (state.color === '#ffffff' || state.color === '#FFFFFF') ? '#1e293b' : state.color || '#ffffff';
  const bgColor = isSticky ? (state.fillColor || '#fef08a') : 'rgba(15, 23, 42, 0.9)';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 60,
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="inline-text-editor-container animate-fadeIn select-text"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onCommit(text)}
        placeholder={isSticky ? 'Type sticky note...' : 'Type text here...'}
        rows={Math.max(1, text.split('\n').length)}
        style={{
          color: textColor,
          fontSize: `${state.fontSize || 18}px`,
          lineHeight: '1.3',
          fontFamily: 'sans-serif',
          backgroundColor: bgColor,
          borderColor: isSticky ? '#eab308' : '#6366f1',
          borderWidth: '1.5px',
          borderStyle: 'dashed',
          borderRadius: isSticky ? '4px' : '6px',
          padding: '6px 10px',
          minWidth: isSticky ? '140px' : '120px',
          maxWidth: `${pos.width}px`,
          outline: 'none',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          resize: 'none',
          caretColor: textColor,
          userSelect: 'text',
          WebkitUserSelect: 'text',
          pointerEvents: 'auto',
        }}
        className="text-slate-100 placeholder:text-slate-400/60 shadow-xl backdrop-blur-md transition-shadow focus:border-indigo-400 select-text pointer-events-auto touch-auto"
      />
      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400/80 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800 backdrop-blur-sm shadow-md pointer-events-auto w-max">
        <span className="hidden sm:inline">Enter / Ctrl+Enter: Done • Shift+Enter: Newline</span>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => onCommit(text)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow transition-all active:scale-95 min-h-[32px] flex items-center justify-center cursor-pointer"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2 py-1 rounded-lg text-xs transition-colors min-h-[32px] flex items-center justify-center cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
