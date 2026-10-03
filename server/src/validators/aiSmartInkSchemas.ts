import { z } from 'zod';
import { AIAnalyzeStrokeSchema, AIObjectItemSchema } from './aiSchemas.js';

export const SmartInkStrokeGroupSchema = z.object({
  groupId: z.string().min(1),
  strokeIds: z.array(z.string().min(1)),
  strokes: z.array(AIAnalyzeStrokeSchema),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

export const SmartInkRequestSchema = z.object({
  roomCode: z.string().min(1).max(50),
  strokeGroup: SmartInkStrokeGroupSchema,
  boardContext: z.object({
    nearbyText: z.array(z.string()).optional().default([]),
    boardSummary: z.string().optional(),
    existingObjects: z.array(AIObjectItemSchema).optional().default([]),
  }).optional().default({}),
  image: z.string().max(7 * 1024 * 1024, 'Snapshot image exceeds 7MB size limit').optional(),
});

export const SmartInkCategorySchema = z.enum(['text', 'math', 'science', 'number']);

export const SmartInkResponseSchema = z.object({
  primary: z.string().min(1, 'Primary candidate text required'),
  candidates: z.array(z.string()).max(5).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0.8),
  category: SmartInkCategorySchema.default('text'),
  latex: z.string().optional().nullable(),
  grounding: z.object({
    observation: z.string().default('Grounded visual handwriting recognition'),
    interpretation: z.string().default('High likelihood handwriting match'),
    uncertainty: z.string().default('None detected'),
  }).default({
    observation: 'Handwritten stroke visual input',
    interpretation: 'Contextual candidate text',
    uncertainty: 'Standard handwriting variability',
  }),
});

export type SmartInkStrokeGroup = z.infer<typeof SmartInkStrokeGroupSchema>;
export type SmartInkRequest = z.infer<typeof SmartInkRequestSchema>;
export type SmartInkCategory = z.infer<typeof SmartInkCategorySchema>;
export type SmartInkResponse = z.infer<typeof SmartInkResponseSchema>;
