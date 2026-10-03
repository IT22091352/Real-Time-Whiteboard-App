import { StrokeData } from './whiteboard';

export interface ProviderMetadata {
  provider: 'gemini' | 'fallback';
  model?: string;
  fallbackUsed: boolean;
}

export type LectureEventType =
  | 'object_created'
  | 'object_updated'
  | 'object_deleted'
  | 'text_created'
  | 'text_edited'
  | 'shape_added'
  | 'connector_added'
  | 'snapshot_captured';

export interface LectureEvent {
  id: string;
  type: LectureEventType;
  timestamp: number;
  timeOffsetSeconds: number;
  summary: string;
  userId?: string;
  userName?: string;
  strokeId?: string;
  objectType?: string;
  text?: string;
  authorName?: string;
}

export interface LectureSnapshot {
  id: string;
  timestamp: number;
  timeOffsetSeconds: number;
  title?: string;
  objectCount: number;
  textSummary: string;
  boardState?: StrokeData[];
}

export interface LectureSession {
  id: string;
  roomCode: string;
  title?: string;
  startedAt: number;
  endedAt?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdBy?: string;
  createdByName?: string;
  notesCache?: StructuredLectureNotes;
  quizCache?: LectureQuizResponse;
  flashcardsCache?: LectureFlashcardsResponse;
  events: LectureEvent[];
  snapshots: LectureSnapshot[];
}

export interface GroundingDetail {
  observations: string[];
  inferences: string[];
  uncertainties: string[];
}

export interface GroundedSuggestion {
  suggestion: string;
  reason: string;
  evidence: string[];
}

export interface StructuredLectureNotes {
  lectureTitle: string;
  mainTopic: string;
  durationMinutes: number;
  keyConcepts: string[];
  definitions: { term: string; definition: string }[];
  processes: { title: string; steps: string[] }[];
  equations: { formula: string; explanation: string }[];
  examples: string[];
  relationships: string[];
  keyTakeaways: string[];
  reviewQuestions: string[];
  lectureProgression: { step: number; timeLabel: string; description: string }[];
  whatChanged: string[];
  possibleMissingConcepts: (GroundedSuggestion | string)[];
  possibleConfusions: (GroundedSuggestion | string)[];
  grounding: GroundingDetail;
  providerMetadata?: ProviderMetadata;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'conceptual';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LectureQuizResponse {
  lectureTitle: string;
  quizTitle: string;
  questions: QuizQuestion[];
  grounding: GroundingDetail;
  providerMetadata?: ProviderMetadata;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
}

export interface LectureFlashcardsResponse {
  lectureTitle: string;
  flashcards: Flashcard[];
  grounding: GroundingDetail;
  providerMetadata?: ProviderMetadata;
}

export interface LectureQAResponse {
  lectureTitle: string;
  question: string;
  answer: string;
  relevantTimeOffset?: string;
  grounding: GroundingDetail;
  providerMetadata?: ProviderMetadata;
}

export interface LectureReplayState {
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1, 1.5, 2
  currentTimeOffsetSeconds: number;
  totalDurationSeconds: number;
  activeSnapshotId?: string;
  previewBoardState?: StrokeData[];
}

export type LectureAction =
  | 'notes'
  | 'progression'
  | 'what_changed'
  | 'missing_concepts'
  | 'possible_confusion'
  | 'quiz'
  | 'flashcards'
  | 'ask_question'
  | 'timeline_summary'
  | 'checkpoint_explanation';
