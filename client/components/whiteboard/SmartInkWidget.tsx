'use client';

import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Sparkles, Check, X, Layers, HelpCircle, ArrowRight } from 'lucide-react';
import { SmartInkSuggestion } from '../../types/smartInk';

interface SmartInkWidgetProps {
  suggestion: SmartInkSuggestion | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pan?: { x: number; y: number };
  zoom?: number;
  onAccept: (suggestion: SmartInkSuggestion, chosenText?: string, keepHandwriting?: boolean) => void;
  onReject: () => void;
}

export const SmartInkWidget: React.FC<SmartInkWidgetProps> = ({
  suggestion,
  containerRef,
  pan = { x: 0, y: 0 },
  zoom = 1.0,
  onAccept,
  onReject,
}) => {
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const updatePosition = () => {
    if (!suggestion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { bounds } = suggestion.group;

    const left = bounds.x * rect.width * zoom + pan.x;
    const top = (bounds.y + bounds.height) * rect.height * zoom + pan.y + 12;

    setPos({
      left: Math.max(16, Math.min(rect.width - 280, left)),
      top: Math.max(80, Math.min(rect.height - 120, top)),
    });
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [suggestion, pan.x, pan.y, zoom]);

  // Keyboard shortcut listener (Enter to accept, Esc to reject)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!suggestion || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onAccept(suggestion);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestion, onAccept, onReject]);

  if (!suggestion) return null;

  const confidencePct = Math.round(suggestion.confidence * 100);
  const isHighConfidence = suggestion.confidence >= 0.9;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-slate-900/95 border border-purple-500/40 backdrop-blur-2xl p-3 rounded-2xl shadow-2xl text-slate-100 max-w-xs space-y-2.5">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <div className="p-1 rounded-lg bg-purple-600/20 text-purple-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span>✨ Smart Ink</span>
            {suggestion.category === 'math' && (
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 rounded">
                Math 📐
              </span>
            )}
            {suggestion.category === 'science' && (
              <span className="text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 rounded">
                Science 🧬
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                isHighConfidence
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {confidencePct}% Match
            </span>
            <button
              onClick={onReject}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Dismiss Suggestion (Esc)"
              aria-label="Dismiss Smart Ink Suggestion"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Recommendation Chip */}
        <div className="space-y-1.5">
          <button
            onClick={() => onAccept(suggestion, suggestion.primary)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-white font-bold text-xs transition-all active:scale-95 group text-left"
          >
            <span className="truncate flex items-center gap-1.5">
              <span className="text-purple-300">✨</span>
              <span>{suggestion.primary}</span>
            </span>
            <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold group-hover:bg-purple-500 shrink-0">
              <Check className="w-3 h-3" /> Use
            </span>
          </button>

          {/* Alternative Candidates */}
          {suggestion.candidates.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-mono text-slate-400 shrink-0">Alternatives:</span>
              {suggestion.candidates.slice(0, 3).map((cand, idx) => (
                <button
                  key={idx}
                  onClick={() => onAccept(suggestion, cand)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition-colors shrink-0"
                >
                  {cand}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
          <button
            onClick={() => onAccept(suggestion, suggestion.primary, true)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            title="Keep handwriting and add digital text beside it"
          >
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Keep Both</span>
          </button>

          <span className="text-slate-500 font-mono hidden xs:inline">Enter: Accept • Esc: Dismiss</span>
        </div>
      </div>
    </div>
  );
};
