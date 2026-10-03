'use client';

import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Eye, FastForward } from 'lucide-react';
import { LectureReplayState, LectureSnapshot } from '../../types/lecture';

interface LectureReplayBarProps {
  replayState: LectureReplayState;
  snapshots: LectureSnapshot[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (offsetSeconds: number) => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
}

export const LectureReplayBar: React.FC<LectureReplayBarProps> = ({
  replayState,
  snapshots,
  onPlay,
  onPause,
  onSeek,
  onStop,
  onSpeedChange,
}) => {
  const { isPlaying, playbackSpeed, currentTimeOffsetSeconds, totalDurationSeconds } = replayState;

  // Playback timer ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        onSeek(Math.min(totalDurationSeconds, currentTimeOffsetSeconds + 1));
        if (currentTimeOffsetSeconds >= totalDurationSeconds) {
          onPause();
        }
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, currentTimeOffsetSeconds, totalDurationSeconds, onSeek, onPause]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 pointer-events-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Lecture Replay & Historical Preview Mode
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Read-Only Board
          </span>
        </div>

        <button
          onClick={onStop}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Exit Replay Preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrubbing Bar & Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all active:scale-95 shadow-md"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Timeline Slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 shrink-0">
            {formatTime(currentTimeOffsetSeconds)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={totalDurationSeconds || 1}
              value={currentTimeOffsetSeconds}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            {/* Snapshot Checkpoint Indicators */}
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                onClick={() => onSeek(snap.timeOffsetSeconds)}
                className="absolute w-2 h-2 rounded-full bg-indigo-400 hover:scale-150 transition-transform cursor-pointer"
                style={{
                  left: `${(snap.timeOffsetSeconds / (totalDurationSeconds || 1)) * 100}%`,
                }}
                title={`Checkpoint: ${snap.title || snap.textSummary}`}
              />
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400 shrink-0">
            {formatTime(totalDurationSeconds)}
          </span>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          {[0.5, 1, 1.5, 2].map((spd) => (
            <button
              key={spd}
              onClick={() => onSpeedChange(spd)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                playbackSpeed === spd ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
