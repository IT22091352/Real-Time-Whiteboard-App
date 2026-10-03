import { prisma } from '../lib/prisma.js';

export async function logActivity(
  userId: string,
  action:
    | 'BOARD_CREATED'
    | 'BOARD_RENAMED'
    | 'BOARD_DUPLICATED'
    | 'BOARD_DELETED'
    | 'BOARD_SHARED'
    | 'OBJECT_CREATED'
    | 'OBJECT_UPDATED'
    | 'OBJECT_DELETED'
    | 'LECTURE_STARTED'
    | 'LECTURE_ENDED'
    | 'REVISION_CREATED'
    | 'REVISION_RESTORED',
  roomId?: string,
  roomCode?: string,
  roomName?: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        roomId,
        roomCode,
        roomName,
        action,
        details,
      },
    });
  } catch (error) {
    console.error('[ActivityLog] Failed to log activity:', error);
  }
}
