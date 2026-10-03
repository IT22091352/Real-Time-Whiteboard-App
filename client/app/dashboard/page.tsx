'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Paintbrush,
  Plus,
  Search,
  Users,
  Copy,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Share2,
  Clock,
  User as UserIcon,
  LogOut,
  Sparkles,
  Loader2,
  FileText,
  Activity,
  FolderPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../lib/api';

interface Board {
  id: string;
  roomCode: string;
  name: string;
  description?: string;
  ownerId?: string;
  owner?: { id: string; name: string; email: string; avatarUrl?: string };
  members?: Array<{ role: string; user: { id: string; name: string; email: string } }>;
  createdAt: string;
  updatedAt: string;
  _count?: { strokes: number; revisions: number };
}

interface ActivityItem {
  id: string;
  action: string;
  roomName?: string;
  roomCode?: string;
  details?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading, logout } = useAuth();

  const [myWhiteboards, setMyWhiteboards] = useState<Board[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<Board[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'activity'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [renameBoardTarget, setRenameBoardTarget] = useState<Board | null>(null);
  const [renameName, setRenameName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [shareBoardTarget, setShareBoardTarget] = useState<Board | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [shareMembers, setShareMembers] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [deleteBoardTarget, setDeleteBoardTarget] = useState<Board | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [token, isLoading, router]);

  const loadDashboardData = async () => {
    if (!token) return;
    setIsDataLoading(true);
    try {
      const res = await fetchApi<{
        myWhiteboards: Board[];
        sharedWithMe: Board[];
        recentActivity: ActivityItem[];
      }>('/api/dashboard/summary');

      setMyWhiteboards(res.myWhiteboards || []);
      setSharedWithMe(res.sharedWithMe || []);
      setRecentActivity(res.recentActivity || []);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  // Create Whiteboard (from Modal)
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetchApi<{ roomCode: string }>('/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({ name: newBoardName, description: newBoardDesc }),
      });
      setIsCreateModalOpen(false);
      setNewBoardName('');
      setNewBoardDesc('');
      router.push(`/whiteboard/${res.roomCode}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create whiteboard.');
    } finally {
      setIsCreating(false);
    }
  };

  // Quick Create Whiteboard and Redirect Directly to Workspace Interface
  const handleQuickCreateBoard = async () => {
    setIsCreating(true);
    try {
      const res = await fetchApi<{ roomCode: string }>('/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Untitled Whiteboard', description: '' }),
      });
      router.push(`/whiteboard/${res.roomCode}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create whiteboard.');
      setIsCreating(false);
    }
  };

  // Rename Whiteboard
  const handleRenameBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameBoardTarget) return;
    setIsRenaming(true);
    try {
      await fetchApi(`/api/rooms/${renameBoardTarget.roomCode}/rename`, {
        method: 'PUT',
        body: JSON.stringify({ name: renameName }),
      });
      setRenameBoardTarget(null);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to rename whiteboard.');
    } finally {
      setIsRenaming(false);
    }
  };

  // Duplicate Whiteboard
  const handleDuplicateBoard = async (board: Board) => {
    try {
      await fetchApi(`/api/rooms/${board.roomCode}/duplicate`, {
        method: 'POST',
      });
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate whiteboard.');
    }
  };

  // Delete Whiteboard
  const handleDeleteBoard = async () => {
    if (!deleteBoardTarget) return;
    setIsDeleting(true);
    try {
      await fetchApi(`/api/rooms/${deleteBoardTarget.roomCode}`, {
        method: 'DELETE',
      });
      setDeleteBoardTarget(null);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete whiteboard.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Share Whiteboard
  const openShareModal = (board: Board) => {
    setShareBoardTarget(board);
    setShareMembers(board.members || []);
    setShareEmail('');
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareBoardTarget || !shareEmail.trim()) return;
    setIsSharing(true);
    try {
      const res = await fetchApi<{ members: any[] }>(`/api/rooms/${shareBoardTarget.roomCode}/share`, {
        method: 'POST',
        body: JSON.stringify({ targetEmail: shareEmail.trim(), role: shareRole }),
      });
      setShareMembers(res.members || []);
      setShareEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to invite member.');
    } finally {
      setIsSharing(false);
    }
  };

  // Search Filter
  const filterBoards = (boards: Board[]) => {
    if (!searchQuery.trim()) return boards;
    const q = searchQuery.toLowerCase();
    return boards.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.roomCode.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  };

  const filteredMyBoards = filterBoards(myWhiteboards);
  const filteredSharedBoards = filterBoards(sharedWithMe);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">Whiteboard.io</span>
              <span className="block text-[10px] font-mono text-blue-400 uppercase tracking-widest">Workspace</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search whiteboards by title or room code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
            />
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-200 hidden md:inline">{user.name}</span>
            </Link>

            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              title="Log Out"
              className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Personal Workspace</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage your real-time collaborative whiteboards and shared projects.</p>
          </div>

          <button
            onClick={handleQuickCreateBoard}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-2xl text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{isCreating ? 'Creating Workspace...' : 'New Whiteboard'}</span>
          </button>
        </div>

        {/* TABS HEADER */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'my'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>My Whiteboards ({myWhiteboards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'shared'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Shared With Me ({sharedWithMe.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Recent Activity</span>
          </button>
        </div>

        {/* TAB 1: MY WHITEBOARDS */}
        {activeTab === 'my' && (
          <div>
            {isDataLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs font-mono">Loading whiteboards...</span>
              </div>
            ) : filteredMyBoards.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl p-8 bg-slate-900/30">
                <FolderPlus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Whiteboards Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery ? 'No boards match your search filter.' : 'You haven’t created any whiteboards yet. Click below to start.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleQuickCreateBoard}
                    disabled={isCreating}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{isCreating ? 'Creating Workspace...' : 'Create Your First Board'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Quick Create Card */}
                {!searchQuery && (
                  <button
                    onClick={handleQuickCreateBoard}
                    disabled={isCreating}
                    className="bg-slate-900/40 hover:bg-slate-900 border-2 border-dashed border-slate-800 hover:border-blue-500/60 p-6 rounded-3xl transition-all flex flex-col items-center justify-center text-center group cursor-pointer min-h-[200px] disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      {isCreating ? 'Creating Workspace...' : 'Create New Whiteboard'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                      Open a fresh collaborative canvas workspace
                    </p>
                  </button>
                )}

                {filteredMyBoards.map((board) => (
                  <div
                    key={board.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 p-5 rounded-3xl shadow-xl transition-all hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between group relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                          #{board.roomCode}
                        </span>

                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === board.id ? null : board.id)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === board.id && (
                            <div className="absolute right-0 top-7 z-20 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  router.push(`/whiteboard/${board.roomCode}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                <span>Open Board</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setRenameBoardTarget(board);
                                  setRenameName(board.name);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                                <span>Rename</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDuplicateBoard(board);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-purple-400" />
                                <span>Duplicate</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  openShareModal(board);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 cursor-pointer"
                              >
                                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Share & Access</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteBoardTarget(board);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Board</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {board.name}
                      </h3>
                      {board.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{board.description}</p>}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px]">{new Date(board.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-400">{board._count?.strokes ?? 0} objects</span>
                        <button
                          onClick={() => router.push(`/whiteboard/${board.roomCode}`)}
                          className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHARED WITH ME */}
        {activeTab === 'shared' && (
          <div>
            {isDataLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                <span className="text-xs font-mono">Loading shared boards...</span>
              </div>
            ) : filteredSharedBoards.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl p-8 bg-slate-900/30">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Shared Boards</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Whiteboards shared with you by other collaborators will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSharedBoards.map((board) => (
                  <div
                    key={board.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 p-5 rounded-3xl shadow-xl transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                          #{board.roomCode}
                        </span>

                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-purple-400" />
                          <span>By {board.owner?.name || 'Owner'}</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                        {board.name}
                      </h3>
                      {board.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{board.description}</p>}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <span className="text-[11px] font-mono text-slate-400">{board._count?.strokes ?? 0} objects</span>
                      <button
                        onClick={() => router.push(`/whiteboard/${board.roomCode}`)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Join Board</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RECENT ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Personal Activity Audit Trail</span>
            </h3>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent activity logged yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold font-mono text-[10px]">
                        {act.action.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 uppercase font-mono text-[10px] text-blue-400 mr-2">
                          {act.action.replace('_', ' ')}
                        </span>
                        <span className="text-slate-300">{act.details || act.roomName}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE BOARD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Create New Whiteboard</h2>
            <p className="text-xs text-slate-400 mb-6">Start a fresh collaborative whiteboard room.</p>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Board Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Architecture Diagram"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="Brief summary of board goals..."
                  rows={3}
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME BOARD MODAL */}
      {renameBoardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Rename Whiteboard</h2>

            <form onSubmit={handleRenameBoard} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Board Title</label>
                <input
                  type="text"
                  required
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRenameBoardTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isRenaming}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isRenaming ? 'Saving...' : 'Rename Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareBoardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-400" />
              <span>Share "{shareBoardTarget.name}"</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">Invite collaborators or copy direct access link.</p>

            {/* Share Link Copy */}
            <div className="mb-6 p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-300 truncate">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/whiteboard/${shareBoardTarget.roomCode}`}
              </span>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/whiteboard/${shareBoardTarget.roomCode}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteMember} className="space-y-3 mb-6">
              <label className="block text-xs font-medium text-slate-400">Invite User by Email</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-slate-100 outline-none"
                />

                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>

                <button
                  type="submit"
                  disabled={isSharing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </form>

            <div className="flex items-center justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setShareBoardTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteBoardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Delete Whiteboard?</span>
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-white">"{deleteBoardTarget.name}"</strong>?
              This action will permanently delete all strokes, shapes, and history records. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setDeleteBoardTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteBoard}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500">
        <p>Whiteboard.io &copy; 2026. Real-Time Collaborative Workspace.</p>
      </footer>
    </div>
  );
}
