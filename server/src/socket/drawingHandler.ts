import { Socket, Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../types/index.js';
import {
  DrawingStartSchema,
  DrawingUpdateSchema,
  DrawingEndSchema,
  ObjectMoveSchema,
  ObjectUpdateSchema,
  ObjectDeleteSchema,
  BatchMoveSchema,
  BatchDeleteSchema,
  GroupSchema,
  UngroupSchema,
  TranscriptSegmentSchema,
} from '../validators/socketSchemas.js';
import {
  startStroke,
  getStroke,
  appendPointsToStroke,
  updateStrokeObject,
  saveStrokeToDb,
  undoLastStroke,
  redoLastStroke,
  clearRoomBoard,
} from '../services/strokeService.js';
import { isRoomLocked } from '../services/roomService.js';
import { prisma } from '../lib/prisma.js';

export function registerDrawingHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  // Helper to check user permission to modify board
  const canModifyBoard = (): boolean => {
    const roomCode = socket.data.roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return false;

    if (user.role === 'VIEWER') {
      socket.emit('error', { message: 'Viewers cannot modify the whiteboard.' });
      return false;
    }

    if (isRoomLocked(roomCode) && user.role !== 'HOST') {
      socket.emit('error', { message: 'Board is locked by the host.' });
      return false;
    }

    return true;
  };

  socket.on('drawing:start', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const parsed = DrawingStartSchema.safeParse(rawPayload);
    if (!parsed.success) {
      console.warn('[Socket] Invalid drawing:start payload:', parsed.error.format());
      return;
    }

    const { strokeId, tool, color, size, point, fillColor, x, y, width, height, text, fontSize, rotation, childIds, assetUrl, isHighlighter, fromId, toId } = parsed.data;

    startStroke(
      roomCode,
      strokeId,
      user.id,
      user.name,
      tool,
      color,
      size,
      point,
      { fillColor, x, y, width, height, text, fontSize, rotation, childIds, assetUrl, isHighlighter, fromId, toId }
    );

    // Broadcast drawing:start to other users in the room
    socket.to(roomCode).emit('drawing:start', {
      ...parsed.data,
      userId: user.id,
      userName: user.name,
    });
  });

  socket.on('drawing:update', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const parsed = DrawingUpdateSchema.safeParse(rawPayload);
    if (!parsed.success) {
      console.warn('[Socket] Invalid drawing:update payload');
      return;
    }

    const { strokeId, points, x, y, width, height, rotation, text, fillColor, color, size } = parsed.data;

    const stroke = appendPointsToStroke(roomCode, strokeId, points || [], {
      x,
      y,
      width,
      height,
      rotation,
      text,
      fillColor,
      color,
      size,
    });
    if (!stroke) return;

    // Broadcast incremental update to other clients in room
    socket.to(roomCode).emit('drawing:update', parsed.data as any);
  });

  socket.on('drawing:end', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = DrawingEndSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { strokeId } = parsed.data;

    // Broadcast stroke end
    socket.to(roomCode).emit('drawing:end', { strokeId });

    // Persist completed stroke/object asynchronously to database
    if (dbRoomId) {
      const stroke = getStroke(roomCode, strokeId);
      if (stroke) {
        saveStrokeToDb(dbRoomId, stroke);
      }
    }
  });

  socket.on('object:move', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = ObjectMoveSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { strokeId, x, y, rotation, points } = parsed.data;

    const updated = updateStrokeObject(roomCode, strokeId, { x, y, rotation, points });
    socket.to(roomCode).emit('object:move', parsed.data);

    if (dbRoomId && updated) {
      saveStrokeToDb(dbRoomId, updated);
    }
  });

  socket.on('object:update', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = ObjectUpdateSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { strokeId, text, fillColor, color, width, height, rotation } = parsed.data;

    const updated = updateStrokeObject(roomCode, strokeId, { text, fillColor, color, width, height, rotation });
    socket.to(roomCode).emit('object:update', parsed.data);

    if (dbRoomId && updated) {
      saveStrokeToDb(dbRoomId, updated);
    }
  });

  socket.on('object:delete', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = ObjectDeleteSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { strokeId } = parsed.data;

    const updated = updateStrokeObject(roomCode, strokeId, { isDeleted: true });
    socket.to(roomCode).emit('object:delete', { strokeId });

    if (dbRoomId && updated) {
      saveStrokeToDb(dbRoomId, updated);
    }
  });

  socket.on('object:batch_move', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = BatchMoveSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { moves } = parsed.data;
    moves.forEach((m) => {
      const updated = updateStrokeObject(roomCode, m.strokeId, { x: m.x, y: m.y, rotation: m.rotation, points: m.points });
      if (dbRoomId && updated) {
        saveStrokeToDb(dbRoomId, updated);
      }
    });

    socket.to(roomCode).emit('object:batch_move', parsed.data);
  });

  socket.on('object:batch_delete', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = BatchDeleteSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { strokeIds } = parsed.data;
    strokeIds.forEach((id) => {
      const updated = updateStrokeObject(roomCode, id, { isDeleted: true });
      if (dbRoomId && updated) {
        saveStrokeToDb(dbRoomId, updated);
      }
    });

    socket.to(roomCode).emit('object:batch_delete', parsed.data);
  });

  socket.on('object:group', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const parsed = GroupSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { groupId, childIds, x, y, width, height } = parsed.data;

    const groupStroke = startStroke(
      roomCode,
      groupId,
      user.id,
      user.name,
      'group',
      '#3b82f6',
      2,
      { x, y },
      { x, y, width, height, childIds, rotation: 0 }
    );

    socket.to(roomCode).emit('object:group', { stroke: groupStroke });

    if (dbRoomId) {
      saveStrokeToDb(dbRoomId, groupStroke);
    }
  });

  socket.on('object:ungroup', (rawPayload) => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId;
    if (!roomCode) return;

    const parsed = UngroupSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { groupId } = parsed.data;
    const updated = updateStrokeObject(roomCode, groupId, { isDeleted: true });
    socket.to(roomCode).emit('object:ungroup', { groupId });

    if (dbRoomId && updated) {
      saveStrokeToDb(dbRoomId, updated);
    }
  });

  socket.on('stroke:undo', async () => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId || roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const undoneStroke = await undoLastStroke(roomCode, dbRoomId);
    if (undoneStroke) {
      io.to(roomCode).emit('stroke:undo', {
        strokeId: undoneStroke.id,
        undoneBy: user.name,
      });
    }
  });

  socket.on('stroke:redo', async () => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId || roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const redoneStroke = await redoLastStroke(roomCode, dbRoomId);
    if (redoneStroke) {
      io.to(roomCode).emit('stroke:redo', {
        stroke: redoneStroke,
        redoneBy: user.name,
      });
    }
  });

  socket.on('board:clear', async () => {
    if (!canModifyBoard()) return;

    const roomCode = socket.data.roomCode;
    const dbRoomId = socket.data.dbRoomId || roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    await clearRoomBoard(roomCode, dbRoomId);
    io.to(roomCode).emit('board:clear', { clearedBy: user.name });
  });

  socket.on('lecture:transcript_segment', async (rawPayload) => {
    const roomCode = socket.data.roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const parsed = TranscriptSegmentSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { lectureSessionId, startTime, endTime, text, confidence } = parsed.data;

    try {
      const segment = await prisma.lectureTranscriptSegment.create({
        data: {
          lectureSessionId,
          startTime: BigInt(startTime),
          endTime: BigInt(endTime),
          timeOffsetSeconds: Math.max(0, Math.floor(startTime / 1000)),
          text: text.trim(),
          speakerId: user.id,
          speakerName: user.name,
          confidence: confidence ?? 0.95,
        },
      });

      io.to(roomCode).emit('lecture:transcript_segment_added', {
        id: segment.id,
        lectureSessionId,
        startTime,
        endTime,
        text: segment.text,
        speakerName: user.name,
      });
    } catch (e) {
      console.error('[Socket] Error saving transcript segment:', e);
    }
  });
}
