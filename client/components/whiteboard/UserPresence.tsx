'use client';

import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { UserPresence as UserPresenceType } from '../../types/whiteboard';

interface UserPresenceProps {
  users: UserPresenceType[];
  currentUser: UserPresenceType | null;
}

export const UserPresence: React.FC<UserPresenceProps> = ({ users, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-2xl shadow-lg text-slate-200 text-xs font-medium min-h-[36px] sm:min-h-0 active:scale-95 transition-transform"
        title="View Online Participants"
        aria-label="View Online Participants"
      >
        <div className="flex items-center gap-1.5 text-slate-300">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono">{users.length}</span>
          <span className="hidden sm:inline text-slate-400">Online</span>
        </div>

        {/* Desktop Avatar Stack */}
        <div className="hidden sm:flex items-center -space-x-1.5 overflow-hidden max-w-[200px] border-l border-slate-800 pl-2">
          {users.map((user) => {
            const isSelf = currentUser && user.socketId === currentUser.socketId;
            const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

            return (
              <div
                key={user.socketId}
                title={`${user.name}${isSelf ? ' (You)' : ''}`}
                style={{ backgroundColor: user.color }}
                className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-125 hover:z-10 cursor-pointer shrink-0"
              >
                {initial}
              </div>
            );
          })}
        </div>
      </button>

      {/* Online Users Popover / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-56 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Active Users ({users.length})
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {users.map((user) => {
              const isSelf = currentUser && user.socketId === currentUser.socketId;

              return (
                <div
                  key={user.socketId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
                >
                  <div
                    style={{ backgroundColor: user.color }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {user.name} {isSelf && <span className="text-blue-400 font-normal">(You)</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
