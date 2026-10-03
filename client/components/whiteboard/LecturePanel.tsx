'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  X,
  Play,
  Square,
  Sparkles,
  Loader2,
  BookOpen,
  HelpCircle,
  Layers,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Zap,
  Eye,
  Download,
  Cpu,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  LectureEvent,
  LectureSnapshot,
  LectureAction,
  StructuredLectureNotes,
  LectureQuizResponse,
  LectureFlashcardsResponse,
  LectureQAResponse,
  GroundedSuggestion,
} from '../../types/lecture';
import { cn } from '../../lib/utils';
import { LectureExportModal } from './LectureExportModal';

interface LecturePanelProps {
  isOpen: boolean;
  isRecording: boolean;
  elapsedSeconds: number;
  startedAt: number | null;
  endedAt: number | null;
  events: LectureEvent[];
  snapshots: LectureSnapshot[];
  isLoading: boolean;
  activeAction: LectureAction | null;
  error: string | null;
  notesResult: StructuredLectureNotes | null;
  quizResult: LectureQuizResponse | null;
  flashcardsResult: LectureFlashcardsResponse | null;
  qaResult: LectureQAResponse | null;
  roomCode: string;
  onClose: () => void;
  onStartLecture: () => void;
  onEndLecture: () => void;
  onCallAI: (action: LectureAction, userQuestion?: string) => void;
  onStartReplay: () => void;
  onSeekReplay: (offsetSeconds: number) => void;
}

type TabType = 'notes' | 'replay' | 'quiz' | 'ask' | 'export';

export const LecturePanel: React.FC<LecturePanelProps> = ({
  isOpen,
  isRecording,
  elapsedSeconds,
  startedAt,
  endedAt,
  events,
  snapshots,
  isLoading,
  activeAction,
  error,
  notesResult,
  quizResult,
  flashcardsResult,
  qaResult,
  roomCode,
  onClose,
  onStartLecture,
  onEndLecture,
  onCallAI,
  onStartReplay,
  onSeekReplay,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [userQuestion, setUserQuestion] = useState('');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, string>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  if (!isOpen) return null;

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    onCallAI('ask_question', userQuestion);
  };

  // Provider Metadata badge renderer
  const renderProviderBadge = (meta?: { provider: 'gemini' | 'fallback'; model?: string; fallbackUsed: boolean }) => {
    if (!meta) return null;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
        <Cpu className={`w-3 h-3 ${meta.provider === 'gemini' ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span>Provider: <strong className={meta.provider === 'gemini' ? 'text-emerald-400' : 'text-amber-400'}>{meta.provider.toUpperCase()}</strong></span>
        {meta.model && <span className="text-slate-500">({meta.model})</span>}
        {meta.fallbackUsed && <span className="text-amber-400 font-semibold">(Fallback Active)</span>}
      </div>
    );
  };

  const currentProviderMetadata =
    notesResult?.providerMetadata ||
    quizResult?.providerMetadata ||
    flashcardsResult?.providerMetadata ||
    qaResult?.providerMetadata;

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col pointer-events-auto">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>🎓 Live Lecture Intelligence V2</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                {isRecording ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Recording ({formatTime(elapsedSeconds)})
                  </span>
                ) : (
                  <span>Session Idle</span>
                )}
                <span>· {events.length} Events</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Provider & Recording Actions Bar */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between gap-2 overflow-x-auto">
          {isRecording ? (
            <button
              onClick={onEndLecture}
              className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>[End Lecture]</span>
            </button>
          ) : (
            <button
              onClick={onStartLecture}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>[Start Lecture]</span>
            </button>
          )}

          {renderProviderBadge(currentProviderMetadata)}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950 px-2 overflow-x-auto">
          {[
            { id: 'notes', label: '🎓 Notes' },
            { id: 'replay', label: '▶️ Replay' },
            { id: 'quiz', label: '❓ Quiz & Cards' },
            { id: 'ask', label: '💬 Q&A' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                if (tab.id === 'quiz' && !quizResult && !isLoading) {
                  onCallAI('quiz');
                }
              }}
              className={cn(
                'px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="ml-auto px-2.5 py-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="Export Lecture Notes"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-300">
                Processing Live Lecture Intelligence ({activeAction})...
              </p>
            </div>
          )}

          {/* TAB 1: STRUCTURED NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {!notesResult && !isLoading && (
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <h3 className="text-xs font-semibold text-slate-300">No Structured Notes Generated Yet</h3>
                  <p className="text-[11px] text-slate-400">
                    Record whiteboard activity and click <strong>[End Lecture]</strong> or <strong>Generate Notes</strong>.
                  </p>
                  <button
                    onClick={() => onCallAI('notes')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all"
                  >
                    Generate Structured Notes
                  </button>
                </div>
              )}

              {notesResult && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-1">
                    <h3 className="text-sm font-bold text-purple-300">
                      {notesResult.lectureTitle || (notesResult as any).title || (notesResult as any).lecture_title || 'Structured Lecture Notes'}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      Main Topic: {notesResult.mainTopic || (notesResult as any).main_topic || (notesResult as any).topic || (notesResult as any).title || 'Whiteboard Lecture'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Duration: ~{notesResult.durationMinutes ?? (notesResult as any).duration_minutes ?? (notesResult as any).duration ?? 0} min
                    </span>
                  </div>

                  {/* Key Concepts */}
                  {notesResult.keyConcepts && notesResult.keyConcepts.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>Key Concepts</span>
                      </h4>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {notesResult.keyConcepts.map((concept, idx) => (
                          <li key={idx}>{concept}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Definitions */}
                  {notesResult.definitions && notesResult.definitions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <h4 className="text-xs font-bold text-slate-200">Definitions</h4>
                      <div className="space-y-1.5 text-xs">
                        {notesResult.definitions.map((def, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                            <strong className="text-purple-300">{def.term}:</strong> {def.definition}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grounding Section */}
                  {notesResult.grounding && (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>AI Grounding Evidence</span>
                      </h4>

                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">Observed (Visible Board Objects):</span>
                        <p className="text-slate-300 font-mono text-[11px]">{notesResult.grounding.observations.join('; ') || 'None'}</p>
                      </div>

                      <div className="space-y-1 mt-2">
                        <span className="text-[10px] uppercase font-bold text-blue-400">Inferred (Logical Context):</span>
                        <p className="text-slate-300 font-mono text-[11px]">{notesResult.grounding.inferences.join('; ') || 'None'}</p>
                      </div>

                      {notesResult.grounding.uncertainties.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <span className="text-[10px] uppercase font-bold text-amber-400">Unclear / Ambiguous:</span>
                          <p className="text-amber-200 font-mono text-[11px]">{notesResult.grounding.uncertainties.join('; ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REPLAY & CHECKPOINTS */}
          {activeTab === 'replay' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-3 text-center">
                <Play className="w-8 h-8 text-indigo-400 mx-auto" />
                <h3 className="text-xs font-semibold text-slate-200">Replay Board Evolution</h3>
                <p className="text-[11px] text-slate-400">
                  Step through board checkpoints without affecting the live collaborative board.
                </p>
                <button
                  onClick={onStartReplay}
                  disabled={snapshots.length === 0}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {snapshots.length > 0 ? 'Launch Lecture Replay' : 'No Checkpoints Captured Yet'}
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-200">Captured Checkpoints ({snapshots.length})</h4>
              <div className="space-y-2">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    onClick={() => {
                      onStartReplay();
                      onSeekReplay(snap.timeOffsetSeconds);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between text-xs transition-all"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{snap.title || `Checkpoint +${Math.floor(snap.timeOffsetSeconds / 60)}m`}</div>
                      <p className="text-[11px] text-slate-400 truncate">{snap.textSummary}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                      View State
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUIZ & FLASHCARDS */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => onCallAI('quiz')}
                  disabled={isLoading}
                  className="flex-1 p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Generate Quiz</span>
                </button>
                <button
                  onClick={() => onCallAI('flashcards')}
                  disabled={isLoading}
                  className="flex-1 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>Flashcards</span>
                </button>
              </div>

              {/* Quiz View */}
              {quizResult && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">{quizResult.quizTitle || 'Lecture Practice Quiz'}</h3>
                  {(quizResult.questions || []).map((q, qIdx) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                      <div className="font-semibold text-slate-200">
                        {qIdx + 1}. {q.question}
                      </div>
                      {q.options && (
                        <div className="grid grid-cols-1 gap-1.5 mt-2">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => setSelectedQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              className={cn(
                                'p-2 rounded-xl text-left transition-all border text-xs',
                                selectedQuizAnswers[q.id] === opt
                                  ? opt === q.correctAnswer
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold'
                                    : 'bg-red-950/80 border-red-500 text-red-200'
                                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedQuizAnswers[q.id] && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-[11px]">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Flashcards View */}
              {flashcardsResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(flashcardsResult.flashcards || (flashcardsResult as any).cards || []).map((fc: any) => (
                    <div
                      key={fc.id}
                      onClick={() => setFlippedCards((prev) => ({ ...prev, [fc.id]: !prev[fc.id] }))}
                      className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/30 text-center cursor-pointer min-h-[110px] flex flex-col items-center justify-center hover:border-purple-500 transition-all text-xs"
                    >
                      <span className="text-[10px] text-purple-400 font-mono mb-1">{flippedCards[fc.id] ? 'BACK (Answer)' : 'FRONT (Question)'}</span>
                      <div className="font-semibold text-slate-100">
                        {flippedCards[fc.id] ? fc.back : fc.front}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STUDENT Q&A */}
          {activeTab === 'ask' && (
            <div className="space-y-4">
              <form onSubmit={handleAskQuestion} className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <label className="text-xs font-semibold text-slate-300">Ask AI Tutor about this Lecture:</label>
                <textarea
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="e.g. Why did the teacher add sunlight to this equation?"
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !userQuestion.trim()}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
                >
                  Submit Question
                </button>
              </form>

              {qaResult && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-purple-300">Q: "{qaResult.question}"</h4>
                  <p className="text-slate-200 leading-relaxed">{qaResult.answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <LectureExportModal
        isOpen={isExportModalOpen}
        notes={notesResult}
        events={events}
        snapshots={snapshots}
        roomCode={roomCode}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
};
