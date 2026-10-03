'use client';

import React from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { SmartInkSettings } from '../../types/smartInk';

interface SmartInkSettingsModalProps {
  isOpen: boolean;
  settings: SmartInkSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<SmartInkSettings>) => void;
}

export const SmartInkSettingsModal: React.FC<SmartInkSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">✨ Smart Ink Preferences</h3>
              <p className="text-xs text-slate-400">Handwriting recognition & auto replacement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Setting 1: Smart Ink Master Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-200 block">Smart Ink Intelligence</span>
            <span className="text-[11px] text-slate-400">Enable intelligent handwriting processing</span>
          </div>
          <button
            onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              settings.enabled ? 'bg-purple-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Setting 2: Smart Replace Toggle (OFF = 100% Untouched, ON = True Auto Replace) */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
              <span>Smart Replace</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                settings.smartReplace ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.smartReplace ? 'ON' : 'OFF'}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
              {settings.smartReplace
                ? 'Automatically converts recognized English handwriting into clean digital text on pause.'
                : 'Keep handwritten words as they are. No automatic replacement or popup.'}
            </span>
          </div>
          <button
            onClick={() => onUpdateSettings({ smartReplace: !settings.smartReplace })}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ml-2 ${
              settings.smartReplace ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                settings.smartReplace ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Setting 3: Keep Original Handwriting Option */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-200 block">Keep Original Handwriting</span>
            <span className="text-[11px] text-slate-400">Place digital text alongside original ink</span>
          </div>
          <button
            onClick={() => onUpdateSettings({ keepHandwriting: !settings.keepHandwriting })}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ml-2 ${
              settings.keepHandwriting ? 'bg-purple-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                settings.keepHandwriting ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
