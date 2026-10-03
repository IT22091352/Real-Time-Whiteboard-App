'use client';

import React from 'react';
import { GraduationCap, Square, Play } from 'lucide-react';

interface LectureHeaderBadgeProps {
  isRecording: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onEnd: () => void;
  onOpenPanel: () => void;
}

export const LectureHeaderBadge: React.FC<LectureHeaderBadgeProps> = ({
  isRecording,
  elapsedSeconds,
  onStart,
  onEnd,
  onOpenPanel,
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    return (
      <button
        onClick={onStart}
        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition-all active:scale-95 shrink-0 border border-purple-400/30"
        title="Start 🎓 Live Lecture Mode"
        aria-label="Start Live Lecture"
      >
        <GraduationCap className="w-4 h-4 text-purple-200" />
        <span className="hidden sm:inline">Start Lecture</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-purple-950/90 border border-purple-500/50 text-purple-100 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium shadow-lg animate-in fade-in duration-200 shrink-0">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
      <button
        onClick={onOpenPanel}
        className="flex items-center gap-1 hover:underline font-mono text-purple-200"
        title="View Live Lecture Notes & Timeline"
      >
        <GraduationCap className="w-3.5 h-3.5 text-purple-300" />
        <span className="font-semibold">Lecture</span>
        <span className="text-purple-400">·</span>
        <span>{formatTime(elapsedSeconds)}</span>
      </button>

      <div className="h-3.5 w-px bg-purple-800 shrink-0 mx-0.5" />

      <button
        onClick={onEnd}
        className="p-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors flex items-center justify-center min-w-[24px] min-h-[24px]"
        title="End Lecture Session"
        aria-label="End Lecture Session"
      >
        <Square className="w-3 h-3 fill-current text-red-400" />
      </button>
    </div>
  );
};
