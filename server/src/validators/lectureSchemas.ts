import { z } from 'zod';

export const ProviderMetadataSchema = z.object({
  provider: z.enum(['gemini', 'fallback']),
  model: z.string().optional(),
  fallbackUsed: z.boolean(),
});

export type ProviderMetadata = z.infer<typeof ProviderMetadataSchema>;

export const LectureEventSchema = z.object({
  id: z.string(),
  type: z.enum(['object_created', 'object_updated', 'object_deleted', 'text_created', 'text_edited', 'shape_added', 'connector_added', 'snapshot_captured']),
  timestamp: z.number(),
  timeOffsetSeconds: z.number(),
  summary: z.string(),
  userId: z.string().optional().default('unknown'),
  userName: z.string().optional().default('Unknown User'),
  strokeId: z.string().optional(),
  objectType: z.string().optional(),
  text: z.string().optional(),
  authorName: z.string().optional(),
});

export const LectureSnapshotSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  timeOffsetSeconds: z.number(),
  title: z.string().optional(),
  objectCount: z.number(),
  textSummary: z.string(),
  objects: z.array(z.any()).optional(),
});

export const LectureRequestSchema = z.object({
  action: z.enum([
    'notes',
    'progression',
    'what_changed',
    'missing_concepts',
    'possible_confusion',
    'quiz',
    'flashcards',
    'ask_question',
    'timeline_summary',
    'checkpoint_explanation',
  ]),
  roomCode: z.string().min(1).max(50),
  lectureId: z.string().min(1).max(100),
  title: z.string().optional(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  events: z.array(LectureEventSchema).max(500, 'Maximum 500 events allowed per session').default([]),
  snapshots: z.array(LectureSnapshotSchema).max(100, 'Maximum 100 snapshots allowed per session').default([]),
  currentStrokes: z.array(z.any()).max(500, 'Maximum 500 board objects allowed').default([]),
  image: z.string().optional(),
  userQuestion: z.string().max(1000, 'Question too long').optional(),
});

export type LectureRequest = z.infer<typeof LectureRequestSchema>;
export type LectureEvent = z.infer<typeof LectureEventSchema>;
export type LectureSnapshot = z.infer<typeof LectureSnapshotSchema>;

// Grounded Evidence & Grounding Schemas
export const GroundingDetailSchema = z.object({
  observations: z.array(z.string()).default([]),
  inferences: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export const GroundedSuggestionSchema = z.object({
  suggestion: z.string(),
  reason: z.string(),
  evidence: z.array(z.string()).default([]),
});

export type GroundedSuggestion = z.infer<typeof GroundedSuggestionSchema>;

export const StructuredLectureNotesSchema = z.object({
  lectureTitle: z.string().default('Structured Lecture Notes'),
  mainTopic: z.string().default('Collaborative Whiteboard Lecture'),
  durationMinutes: z.number().default(0),
  keyConcepts: z.array(z.string()).default([]),
  definitions: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })).default([]),
  processes: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string()),
  })).default([]),
  equations: z.array(z.object({
    formula: z.string(),
    explanation: z.string(),
  })).default([]),
  examples: z.array(z.string()).default([]),
  relationships: z.array(z.string()).default([]),
  keyTakeaways: z.array(z.string()).default([]),
  reviewQuestions: z.array(z.string()).default([]),
  lectureProgression: z.array(z.object({
    step: z.number(),
    timeLabel: z.string(),
    description: z.string(),
  })).default([]),
  whatChanged: z.array(z.string()).default([]),
  possibleMissingConcepts: z.array(GroundedSuggestionSchema).default([]),
  possibleConfusions: z.array(GroundedSuggestionSchema).default([]),
  grounding: GroundingDetailSchema,
  providerMetadata: ProviderMetadataSchema.optional(),
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'short_answer', 'conceptual']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
});

export const LectureQuizResponseSchema = z.object({
  lectureTitle: z.string(),
  quizTitle: z.string(),
  questions: z.array(QuizQuestionSchema),
  grounding: GroundingDetailSchema,
  providerMetadata: ProviderMetadataSchema.optional(),
});

export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  category: z.string().optional(),
});

export const LectureFlashcardsResponseSchema = z.object({
  lectureTitle: z.string(),
  flashcards: z.array(FlashcardSchema),
  grounding: GroundingDetailSchema,
  providerMetadata: ProviderMetadataSchema.optional(),
});

export const LectureQAResponseSchema = z.object({
  lectureTitle: z.string(),
  question: z.string(),
  answer: z.string(),
  relevantTimeOffset: z.string().optional(),
  grounding: GroundingDetailSchema,
  providerMetadata: ProviderMetadataSchema.optional(),
});

export type StructuredLectureNotes = z.infer<typeof StructuredLectureNotesSchema>;
export type LectureQuizResponse = z.infer<typeof LectureQuizResponseSchema>;
export type LectureFlashcardsResponse = z.infer<typeof LectureFlashcardsResponseSchema>;
export type LectureQAResponse = z.infer<typeof LectureQAResponseSchema>;
