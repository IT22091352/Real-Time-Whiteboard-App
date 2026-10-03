'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Send,
  HelpCircle,
  BookOpen,
  FileText,
  CheckCircle2,
  ListOrdered,
  Zap,
} from 'lucide-react';
import { WhiteboardAIResult, WhiteboardAIAction, WhiteboardAIContextType } from '../../types/ai';

interface AIAnalysisPanelProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  result: WhiteboardAIResult | null;
  onClose: () => void;
  onActionSelect: (action: WhiteboardAIAction, customQuestion?: string) => void;
  onReAnalyze: () => void;
}

const CONTEXT_BADGES: Record<WhiteboardAIContextType, { icon: string; label: string; bg: string; text: string; border: string }> = {
  education: { icon: '📚', label: 'Educational Content', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  mathematics: { icon: '📐', label: 'Mathematics Problem', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  science: { icon: '🧬', label: 'Science / Diagram', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  software: { icon: '🏗️', label: 'Software Architecture', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  business: { icon: '💼', label: 'Business Process', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  planning: { icon: '📋', label: 'Project Plan', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  general: { icon: '🎨', label: 'General Sketch', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  unknown: { icon: '❓', label: 'Uncertain Content', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  isOpen,
  isLoading,
  error,
  result,
  onClose,
  onActionSelect,
  onReAnalyze,
}) => {
  const [copied, setCopied] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result) return;

    const ctx = result.context;
    let formattedText = `### ✨ Whiteboard AI Analysis (${ctx.label})\n`;
    formattedText += `**Confidence**: ${Math.round(ctx.confidence * 100)}%\n\n`;
    formattedText += `**Summary**: ${result.summary}\n\n`;

    if (result.observations.length > 0) {
      formattedText += `**Observed Elements**:\n${result.observations.map((o) => `- ${o}`).join('\n')}\n\n`;
    }

    if (result.inferences.length > 0) {
      formattedText += `**Inferences**:\n${result.inferences.map((i) => `- ${i}`).join('\n')}\n\n`;
    }

    if (result.analysis.explanation) {
      formattedText += `**Explanation**:\n${result.analysis.explanation}\n\n`;
    }

    if (result.analysis.stepByStep && result.analysis.stepByStep.length > 0) {
      formattedText += `**Step-by-Step Resolution**:\n${result.analysis.stepByStep.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n\n`;
    }

    if (result.keyPoints.length > 0) {
      formattedText += `**Key Points**:\n${result.keyPoints.map((k) => `- ${k}`).join('\n')}\n\n`;
    }

    if (result.questions.length > 0) {
      formattedText += `**Quiz / Practice Questions**:\n${result.questions.map((q) => `- ${q}`).join('\n')}\n\n`;
    }

    if (result.customAnswer) {
      formattedText += `**Q&A Answer**:\n${result.customAnswer}\n\n`;
    }

    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isLoading) return;
    onActionSelect('custom_question', customQuestion.trim());
    setCustomQuestion('');
  };

  const contextMeta = result ? CONTEXT_BADGES[result.context.type] || CONTEXT_BADGES.general : CONTEXT_BADGES.general;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 w-full bg-slate-900/95 border-t border-slate-800 backdrop-blur-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:top-20 sm:right-4 sm:bottom-auto sm:left-auto sm:w-full sm:max-w-xl sm:rounded-3xl sm:border sm:max-h-[calc(100vh-6rem)] animate-in slide-in-from-bottom sm:slide-in-from-right duration-200 text-slate-100">
      {/* Mobile Sheet Grab Handle */}
      <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-1">
        <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
      </div>

      {/* Header */}
      <div className="p-3 sm:p-4 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <span>✨ Whiteboard AI</span>
              {result && (
                <span
                  className={`text-[10px] ${contextMeta.bg} ${contextMeta.text} border ${contextMeta.border} font-mono px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1`}
                >
                  <span>{contextMeta.icon}</span>
                  <span>{Math.round(result.context.confidence * 100)}% Confidence</span>
                </span>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">Contextual whiteboard intelligence & multi-mode solver</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close AI Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">✨ Analyzing whiteboard content...</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Evaluating vector stroke geometry, context, and visual snapshot.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-300">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-xs text-red-200">AI Assistant Error</h4>
              <p className="text-xs mt-0.5 text-red-300">{error}</p>
              <button
                onClick={onReAnalyze}
                className="mt-3 flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-500/30 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Result Display */}
        {!isLoading && !error && result && (
          <>
            {/* Detected Context Banner */}
            <div className={`p-4 rounded-2xl border ${contextMeta.bg} ${contextMeta.border}`}>
              <span className="text-[10px] uppercase tracking-wider font-mono font-bold block mb-1 opacity-80">
                Detected Whiteboard Context
              </span>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{contextMeta.icon}</span>
                  <span>{result.context.label || contextMeta.label}</span>
                </h3>
                <span className="text-xs font-mono bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                  {result.context.type}
                </span>
              </div>
            </div>

            {/* Quick Action Chips Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>What would you like to do?</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() =>
                    onActionSelect(
                      'generate_whiteboard',
                      customQuestion.trim() || 'Create a software architecture diagram for an e-commerce application'
                    )
                  }
                  className="p-2.5 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/40 rounded-xl text-xs font-bold text-indigo-200 flex items-center justify-center gap-2 transition-all col-span-2 sm:col-span-3 shadow-md shadow-indigo-500/10"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>🎨 Generate on Board (AI Draw)</span>
                </button>
                <button
                  onClick={() => onActionSelect('summarize')}
                  className="p-2.5 bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>📝 Summarize</span>
                </button>
                <button
                  onClick={() => onActionSelect('explain')}
                  className="p-2.5 bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>💡 Explain</span>
                </button>
                {result.context.type === 'mathematics' ? (
                  <button
                    onClick={() => onActionSelect('solve')}
                    className="p-2.5 bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 rounded-xl text-xs font-medium text-blue-200 flex items-center gap-2 transition-all"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
                    <span>🧠 Solve Steps</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onActionSelect('solve')}
                    className="p-2.5 bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
                    <span>🧠 Step-by-Step</span>
                  </button>
                )}
                <button
                  onClick={() => onActionSelect('find_mistakes')}
                  className="p-2.5 bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>🔍 Find Mistakes</span>
                </button>
                <button
                  onClick={() => onActionSelect('study_notes')}
                  className="p-2.5 bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>📚 Study Notes</span>
                </button>
                <button
                  onClick={() => onActionSelect('generate_questions')}
                  className="p-2.5 bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                  <span>❓ Quiz Questions</span>
                </button>
              </div>
            </div>

            {/* Custom Question Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-purple-400" />
                <span>Ask anything about this board</span>
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g., Where should Redis go? or Solve step by step..."
                  className="flex-1 bg-slate-800/60 border border-slate-800 focus:border-purple-500 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!customQuestion.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/20 shrink-0"
                >
                  Ask AI
                </button>
              </div>
            </form>

            <hr className="border-slate-800 my-2" />

            {/* Custom Answer if requested */}
            {result.customAnswer && (
              <div className="bg-purple-600/10 border border-purple-500/30 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Answer to Your Question</span>
                </h4>
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-line">{result.customAnswer}</p>
              </div>
            )}

            {/* Overall Summary */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</h4>
              <p className="text-slate-300 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 leading-relaxed text-xs">
                {result.summary}
              </p>
            </div>

            {/* Grounding: Observed Facts */}
            {result.observations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Observed Elements ({result.observations.length})</span>
                </h4>
                <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs text-slate-300">
                  {result.observations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounding: Inferences */}
            {result.inferences.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Inferences ({result.inferences.length})</span>
                </h4>
                <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs text-slate-300">
                  {result.inferences.map((inf, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-purple-400 shrink-0 mt-0.5">➔</span>
                      <span>{inf}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounding: Uncertainties (If any) */}
            {result.uncertainties.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uncertain / Ambiguous Items</span>
                </h4>
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl space-y-1 text-xs text-amber-200">
                  {result.uncertainties.map((unc, idx) => (
                    <p key={idx}>⚠️ {unc}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis: Explanation / Step-by-Step */}
            {result.analysis.stepByStep && result.analysis.stepByStep.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
                  <span>Step-by-Step Solution</span>
                </h4>
                <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl space-y-2 text-xs text-blue-200">
                  {result.analysis.stepByStep.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-blue-300 shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis: Explanation */}
            {result.analysis.explanation && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detailed Explanation</h4>
                <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {result.analysis.explanation}
                </div>
              </div>
            )}

            {/* Analysis: Mistakes Found */}
            {result.analysis.mistakes && result.analysis.mistakes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Potential Mistakes / Issues Identified</span>
                </h4>
                <div className="space-y-1.5">
                  {result.analysis.mistakes.map((mistake, idx) => (
                    <div key={idx} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-200">
                      <span>⚠️ {mistake}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis: Suggestions */}
            {result.analysis.suggestions && result.analysis.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Suggestions & Enhancements</span>
                </h4>
                <div className="space-y-1.5">
                  {result.analysis.suggestions.map((sug, idx) => (
                    <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-200">
                      <span>💡 {sug}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Points */}
            {result.keyPoints.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Takeaways</h4>
                <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-1 text-xs text-slate-300">
                  {result.keyPoints.map((kp, idx) => (
                    <p key={idx}>📌 {kp}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Practice / Quiz Questions */}
            {result.questions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                  <span>Practice & Quiz Questions</span>
                </h4>
                <div className="space-y-2">
                  {result.questions.map((q, idx) => (
                    <div key={idx} className="bg-teal-500/10 border border-teal-500/20 p-3 rounded-xl text-xs text-teal-200 font-medium">
                      <span>❓ {q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Action Buttons */}
      {!isLoading && result && (
        <div className="p-4 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onReAnalyze}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-analyze</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-md shadow-purple-600/20 transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Markdown!' : 'Copy Summary'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
