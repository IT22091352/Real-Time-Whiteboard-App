'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Share2, Check, ArrowLeft, Paintbrush, Copy, X, Sun, Moon } from 'lucide-react';
import { UserPresence as UserPresenceType } from '../../types/whiteboard';
import { UserPresence } from './UserPresence';
import { LectureHeaderBadge } from './LectureHeaderBadge';

interface RoomHeaderProps {
  roomCode: string;
  isConnected: boolean;
  users: UserPresenceType[];
  currentUser: UserPresenceType | null;
  canvasTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isLectureRecording?: boolean;
  lectureElapsedSeconds?: number;
  onStartLecture?: () => void;
  onEndLecture?: () => void;
  onOpenLecturePanel?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomCode,
  isConnected,
  users,
  currentUser,
  canvasTheme = 'dark',
  onToggleTheme,
  isLectureRecording = false,
  lectureElapsedSeconds = 0,
  onStartLecture,
  onEndLecture,
  onOpenLecturePanel,
}) => {
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleCopyLink = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="fixed top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 z-40 flex items-center justify-between pointer-events-none gap-2 max-w-[100vw] overflow-hidden">
        {/* Left section: Back home & Room Info */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-xl max-w-[70vw] sm:max-w-none">
          <Link
            href="/"
            className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20 shrink-0">
              <Paintbrush className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold text-slate-100 leading-none truncate">
                <span className="hidden xs:inline">Room </span>
                <span className="font-mono text-blue-400">#{roomCode}</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-mono truncate">
                  {isConnected ? 'Live' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Canvas Theme Toggle Button (Dark / Light) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="ml-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-700/80 shadow-md transition-all active:scale-95 shrink-0"
              title={canvasTheme === 'dark' ? 'Switch to White Canvas (Light Mode)' : 'Switch to Black Canvas (Dark Mode)'}
              aria-label="Toggle Canvas Theme"
            >
              {canvasTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  <span className="hidden md:inline">White Canvas</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
                  <span className="hidden md:inline">Black Canvas</span>
                </>
              )}
            </button>
          )}

          {/* 🎓 Live Lecture Mode Badge */}
          {onStartLecture && onEndLecture && onOpenLecturePanel && (
            <LectureHeaderBadge
              isRecording={isLectureRecording}
              elapsedSeconds={lectureElapsedSeconds}
              onStart={onStartLecture}
              onEnd={onEndLecture}
              onOpenPanel={onOpenLecturePanel}
            />
          )}

          {/* Share Button (Desktop inline, Mobile icon trigger) */}
          <button
            onClick={() => {
              if (window.innerWidth < 640) {
                setIsShareModalOpen(true);
              } else {
                handleCopyLink();
              }
            }}
            className="ml-1 sm:ml-2 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium shadow-md shadow-blue-600/20 transition-all active:scale-95 shrink-0"
            title="Share Room"
            aria-label="Share Room"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied Link!' : 'Share'}</span>
          </button>
        </div>

        {/* Right section: Online Users */}
        <div className="pointer-events-auto shrink-0">
          <UserPresence users={users} currentUser={currentUser} />
        </div>
      </header>

      {/* Mobile Share Sheet Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Share Whiteboard</h3>
                  <p className="text-xs text-slate-400">Room Code: <span className="font-mono text-blue-400">#{roomCode}</span></p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Close Share Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-300 truncate">
                {typeof window !== 'undefined' ? window.location.href : ''}
              </span>
              <button
                onClick={handleCopyLink}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold shrink-0 active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
