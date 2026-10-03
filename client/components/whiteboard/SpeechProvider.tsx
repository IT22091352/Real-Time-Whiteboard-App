'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Pause, Play, Square, Volume2, AlertCircle } from 'lucide-react';

interface SpeechProviderProps {
  lectureSessionId: string | null;
  isLectureActive: boolean;
  onEmitTranscriptSegment: (segment: { lectureSessionId: string; startTime: number; endTime: number; text: string; confidence?: number }) => void;
}

export const SpeechProvider: React.FC<SpeechProviderProps> = ({
  lectureSessionId,
  isLectureActive,
  onEmitTranscriptSegment,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize Web Speech Recognition
  const startSpeechRecognition = useCallback(() => {
    if (!lectureSessionId) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        setPermissionError(null);
        startTimeRef.current = Date.now();
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence || 0.95;

          if (event.results[i].isFinal) {
            finalChunk += transcriptText;
            const now = Date.now();
            if (transcriptText.trim().length > 0) {
              onEmitTranscriptSegment({
                lectureSessionId,
                startTime: startTimeRef.current,
                endTime: now,
                text: transcriptText.trim(),
                confidence,
              });
              startTimeRef.current = now;
            }
          } else {
            interimChunk += transcriptText;
          }
        }

        setLiveTranscript(interimChunk || finalChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition Error:', event.error);
        if (event.error === 'not-allowed') {
          setPermissionError('Microphone permission denied. Please allow microphone access in browser settings.');
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if lecture is active and not manually paused/stopped
        if (isRecording && !isPaused && isLectureActive) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      console.error('Failed to initialize speech recognition:', e);
      setPermissionError('Microphone access initialization failed.');
    }
  }, [lectureSessionId, isLectureActive, isRecording, isPaused, onEmitTranscriptSegment]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setLiveTranscript('');
  }, []);

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      try {
        recognitionRef.current?.start();
      } catch {}
    } else {
      setIsPaused(true);
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
  };

  // Stop recording if lecture ends
  useEffect(() => {
    if (!isLectureActive && isRecording) {
      stopSpeechRecognition();
    }
  }, [isLectureActive, isRecording, stopSpeechRecognition]);

  if (!isLectureActive) return null;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isRecording && !isPaused ? (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          ) : (
            <MicOff className="w-4 h-4 text-slate-500" />
          )}

          <span className="text-xs font-bold text-slate-200">
            {isRecording ? (isPaused ? '🎙 Paused' : '🎙 Live Recording') : '🎙 Speech Transcription'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isRecording ? (
            <button
              onClick={startSpeechRecognition}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              Start Recording
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                onClick={stopSpeechRecognition}
                title="Stop Recording"
                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </>
          )}
        </div>
      </div>

      {permissionError && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {isRecording && liveTranscript && (
        <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800 text-[11px] text-slate-300 italic line-clamp-2">
          "{liveTranscript}"
        </div>
      )}
    </div>
  );
};
