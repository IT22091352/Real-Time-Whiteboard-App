'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Paintbrush,
  Plus,
  Users,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { generateRoomCode } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    if (userName.trim()) {
      localStorage.setItem('whiteboard_username', userName.trim());
    }

    if (user) {
      try {
        const res = await fetchApi<{ roomCode: string }>('/api/rooms/create', {
          method: 'POST',
          body: JSON.stringify({ name: 'Untitled Whiteboard' }),
        });
        router.push(`/whiteboard/${res.roomCode}`);
        return;
      } catch (e) {
        console.warn('Failed to create authenticated room, falling back to local room code:', e);
      }
    }

    const newRoomCode = generateRoomCode();
    router.push(`/whiteboard/${newRoomCode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    if (userName.trim()) {
      localStorage.setItem('whiteboard_username', userName.trim());
    }
    const cleanCode = joinCode.trim().toLowerCase();
    router.push(`/whiteboard/${cleanCode}`);
  };

  return (
    <main suppressHydrationWarning className="relative min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      <nav className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center">
            <Paintbrush className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Whiteboard.io</span>
            <span className="block text-[10px] font-mono text-blue-400 uppercase tracking-widest">Real-Time Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Workspace Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-blue-400 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Low-Latency Real-Time Canvas Collaboration</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Collaborate & Design Together in <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Real Time</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Create instant whiteboard rooms, sketch ideas with sub-pixel resolution canvas precision, track live team cursors, and sync state seamlessly.
        </p>

        {/* User Alias Input */}
        {!user && (
          <div className="mt-8 w-full max-w-md">
            <label className="block text-xs font-medium text-slate-400 mb-2 text-left">
              Your Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Rivera"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>
        )}

        {/* Action Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Card 1: Create Room */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 hover:border-blue-500/50 p-6 rounded-3xl text-left shadow-xl transition-all hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Create New Room</h3>
              <p className="text-xs text-slate-400 mt-1">Start a fresh collaborative whiteboard room and invite your team with a link.</p>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <span>{isCreating ? 'Creating Room...' : 'Create Whiteboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Join Room */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 hover:border-purple-500/50 p-6 rounded-3xl text-left shadow-xl transition-all hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Join Existing Room</h3>
              <p className="text-xs text-slate-400 mt-1">Enter a 6-character room code to join an active session.</p>
            </div>

            <form onSubmit={handleJoinRoom} className="mt-6 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Enter Room Code (e.g. abc123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none uppercase font-mono tracking-wider"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold py-2.5 px-4 rounded-xl text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Join Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Key Features Banner */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl text-left border-t border-slate-900 pt-10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Sub-20ms Sync</h4>
              <p className="text-xs text-slate-400 mt-0.5">Socket.IO websocket channels with event throttling for ultra low-latency.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Live Partner Cursors</h4>
              <p className="text-xs text-slate-400 mt-0.5">Real-time normalized cursor positioning with user name badges.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">PostgreSQL Persistence</h4>
              <p className="text-xs text-slate-400 mt-0.5">Late-joining users receive complete historical stroke state automatically.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-400 border-t border-slate-900">
        <p>Built with Next.js, Express, Socket.IO, HTML5 Canvas & PostgreSQL</p>
      </footer>
    </main>
  );
}
