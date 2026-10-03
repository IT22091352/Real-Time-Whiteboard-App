'use client';

import React, { useState } from 'react';
import { X, FileText, Download, Check, Code } from 'lucide-react';
import { StructuredLectureNotes, LectureEvent, LectureSnapshot } from '../../types/lecture';

interface LectureExportModalProps {
  isOpen: boolean;
  notes: StructuredLectureNotes | null;
  events: LectureEvent[];
  snapshots: LectureSnapshot[];
  roomCode: string;
  onClose: () => void;
}

export const LectureExportModal: React.FC<LectureExportModalProps> = ({
  isOpen,
  notes,
  events,
  snapshots,
  roomCode,
  onClose,
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<'md' | 'json' | null>(null);

  if (!isOpen) return null;

  const handleExportMarkdown = () => {
    let md = `# 🎓 Structured Lecture Notes — Room #${roomCode}\n\n`;
    if (notes) {
      md += `**Main Topic**: ${notes.mainTopic}\n`;
      md += `**Duration**: ~${notes.durationMinutes} minutes\n\n`;

      if (notes.keyConcepts && notes.keyConcepts.length > 0) {
        md += `## 💡 Key Concepts\n${notes.keyConcepts.map((c) => `- ${c}`).join('\n')}\n\n`;
      }

      if (notes.definitions && notes.definitions.length > 0) {
        md += `## 📚 Definitions\n${notes.definitions.map((d) => `- **${d.term}**: ${d.definition}`).join('\n')}\n\n`;
      }

      if (notes.equations && notes.equations.length > 0) {
        md += `## 📐 Equations & Formulas\n${notes.equations.map((e) => `- \`${e.formula}\`: ${e.explanation}`).join('\n')}\n\n`;
      }

      if (notes.keyTakeaways && notes.keyTakeaways.length > 0) {
        md += `## 🎯 Key Takeaways\n${notes.keyTakeaways.map((k) => `- ${k}`).join('\n')}\n\n`;
      }

      if (notes.reviewQuestions && notes.reviewQuestions.length > 0) {
        md += `## ❓ Review Questions\n${notes.reviewQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}\n\n`;
      }

      if (notes.grounding) {
        md += `## 🔍 Grounding Evidence\n`;
        md += `**Observed**: ${notes.grounding.observations.join(', ')}\n`;
        md += `**Inferred**: ${notes.grounding.inferences.join(', ')}\n\n`;
      }
    } else {
      md += `*No AI structured notes generated yet.*\n\n`;
    }

    md += `## ⏱️ Lecture Timeline Events (${events.length})\n`;
    events.forEach((evt) => {
      md += `- [${Math.floor(evt.timeOffsetSeconds / 60)}m ${evt.timeOffsetSeconds % 60}s] **${evt.userName}**: ${evt.summary}\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lecture-notes-${roomCode}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadedFormat('md');
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  const handleExportJSON = () => {
    const data = {
      roomCode,
      exportedAt: new Date().toISOString(),
      notes,
      events,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        timeOffsetSeconds: s.timeOffsetSeconds,
        title: s.title,
        textSummary: s.textSummary,
        objectCount: s.objectCount,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lecture-session-${roomCode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadedFormat('json');
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Export Lecture Material</h3>
              <p className="text-xs text-slate-400">Download structured notes and timeline recordings</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Markdown Option */}
          <button
            onClick={handleExportMarkdown}
            className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between group transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-slate-100">Markdown Notes (.md)</div>
                <div className="text-xs text-slate-400">Formatted study guide with key concepts & formulas</div>
              </div>
            </div>
            {downloadedFormat === 'md' ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Download className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
          </button>

          {/* JSON Option */}
          <button
            onClick={handleExportJSON}
            className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between group transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-sm font-semibold text-slate-100">Raw Session JSON (.json)</div>
                <div className="text-xs text-slate-400">Complete structured event log and snapshot history</div>
              </div>
            </div>
            {downloadedFormat === 'json' ? (
              <Check className="w-5 h-5 text-indigo-400" />
            ) : (
              <Download className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
