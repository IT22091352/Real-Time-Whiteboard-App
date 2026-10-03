import { z } from 'zod';

export const PointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  pressure: z.number().finite().optional(),
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().min(1).max(50),
  userName: z.string().max(50).optional(),
});

export const DrawingToolEnum = z.enum([
  'brush',
  'eraser',
  'highlighter',
  'select',
  'hand',
  'laser',
  'line',
  'arrow',
  'rectangle',
  'ellipse',
  'triangle',
  'diamond',
  'polygon',
  'text',
  'sticky',
  'connector',
  'image',
  'group',
  'pdf_page',
]);

export const DrawingStartSchema = z.object({
  strokeId: z.string().min(1),
  tool: DrawingToolEnum,
  color: z.string(),
  size: z.number().min(1).max(200),
  point: PointSchema,
  fillColor: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  rotation: z.number().optional(),
  childIds: z.array(z.string()).optional(),
  assetUrl: z.string().optional(),
  isHighlighter: z.boolean().optional(),
  fromId: z.string().optional(),
  toId: z.string().optional(),
});

export const DrawingUpdateSchema = z.object({
  strokeId: z.string().min(1),
  points: z.array(PointSchema).max(500).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  text: z.string().optional(),
  fillColor: z.string().optional(),
  color: z.string().optional(),
  size: z.number().optional(),
});

export const DrawingEndSchema = z.object({
  strokeId: z.string().min(1),
});

export const ObjectMoveSchema = z.object({
  strokeId: z.string().min(1),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  points: z.array(PointSchema).optional(),
});

export const ObjectUpdateSchema = z.object({
  strokeId: z.string().min(1),
  text: z.string().optional(),
  fillColor: z.string().optional(),
  color: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
});

export const ObjectDeleteSchema = z.object({
  strokeId: z.string().min(1),
});

export const BatchMoveSchema = z.object({
  moves: z.array(
    z.object({
      strokeId: z.string().min(1),
      x: z.number().optional(),
      y: z.number().optional(),
      rotation: z.number().optional(),
      points: z.array(PointSchema).optional(),
    })
  ),
});

export const BatchDeleteSchema = z.object({
  strokeIds: z.array(z.string().min(1)),
});

export const GroupSchema = z.object({
  groupId: z.string().min(1),
  childIds: z.array(z.string().min(1)),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const UngroupSchema = z.object({
  groupId: z.string().min(1),
});

export const RoomLockSchema = z.object({
  isLocked: z.boolean(),
});

export const UserRoleSchema = z.object({
  targetUserId: z.string().min(1),
  role: z.enum(['HOST', 'EDITOR', 'VIEWER']),
});

export const CursorMoveSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const LaserMoveSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const TranscriptSegmentSchema = z.object({
  lectureSessionId: z.string().min(1),
  startTime: z.number(),
  endTime: z.number(),
  text: z.string().min(1),
  confidence: z.number().optional(),
});
