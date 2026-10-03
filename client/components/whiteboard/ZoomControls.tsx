'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  pan: { x: number; y: number };
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  pan,
  onZoomIn,
  onZoomOut,
  onReset,
}) => {
  const percentage = Math.round(zoom * 100);
  const isPannedOrZoomed = zoom !== 1.0 || pan.x !== 0 || pan.y !== 0;

  return (
    <div className="fixed bottom-20 right-3 sm:bottom-20 sm:right-6 z-40 flex items-center gap-1 sm:gap-1.5 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 text-slate-200 p-1 sm:p-1.5 px-2 sm:px-2.5 rounded-2xl shadow-2xl transition-all duration-200 hover:border-slate-700 pointer-events-auto">
      <button
        onClick={onZoomOut}
        disabled={zoom <= 0.25}
        title="Zoom Out"
        aria-label="Zoom Out"
        className="p-2 sm:p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={onReset}
        title="Reset Zoom & Pan (100%)"
        aria-label="Reset Zoom and Pan"
        className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1 min-h-[36px] active:scale-95 ${
          isPannedOrZoomed
            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30 hover:bg-purple-600/50'
            : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        <span>{percentage}%</span>
        {isPannedOrZoomed && <Move className="w-3 h-3 text-purple-400 animate-pulse" />}
      </button>

      <button
        onClick={onZoomIn}
        disabled={zoom >= 4.0}
        title="Zoom In"
        aria-label="Zoom In"
        className="p-2 sm:p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      {isPannedOrZoomed && (
        <button
          onClick={onReset}
          title="Reset View"
          aria-label="Reset View"
          className="p-2 sm:p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 ml-0.5 sm:ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
