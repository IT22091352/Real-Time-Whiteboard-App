import { Request, Response } from 'express';
import { lecturePersistenceService } from '../services/lecturePersistenceService.js';

/**
 * GET or CREATE Active Session: POST /api/ai/lecture/session
 */
export async function getOrCreateSessionHandler(req: Request, res: Response) {
  try {
    const { roomCode, startedAt, createdBy, createdByName } = req.body;
    if (!roomCode) {
      return res.status(400).json({ success: false, error: 'roomCode is required' });
    }

    const session = await lecturePersistenceService.getOrCreateSession({
      roomCode,
      startedAt: startedAt || Date.now(),
      createdBy,
      createdByName,
    });

    return res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('[LecturePersistenceController] getOrCreateSession error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to initialize session' });
  }
}

/**
 * Append Semantic Event: POST /api/ai/lecture/event
 */
export async function appendEventHandler(req: Request, res: Response) {
  try {
    const { lectureSessionId, type, timestamp, timeOffsetSeconds, userId, userName, strokeId, objectType, summary, metadata } = req.body;
    if (!lectureSessionId || !type || !summary) {
      return res.status(400).json({ success: false, error: 'lectureSessionId, type, and summary are required' });
    }

    const event = await lecturePersistenceService.saveEvent({
      lectureSessionId,
      type,
      timestamp: timestamp || Date.now(),
      timeOffsetSeconds: timeOffsetSeconds || 0,
      userId: userId || 'unknown',
      userName: userName || 'Unknown User',
      strokeId,
      objectType,
      summary,
      metadata,
    });

    return res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('[LecturePersistenceController] appendEvent error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to append event' });
  }
}

/**
 * Append Checkpoint Snapshot: POST /api/ai/lecture/snapshot
 */
export async function appendSnapshotHandler(req: Request, res: Response) {
  try {
    const { lectureSessionId, timestamp, timeOffsetSeconds, title, objectCount, textSummary, boardState } = req.body;
    if (!lectureSessionId || !textSummary) {
      return res.status(400).json({ success: false, error: 'lectureSessionId and textSummary are required' });
    }

    const snapshot = await lecturePersistenceService.saveSnapshot({
      lectureSessionId,
      timestamp: timestamp || Date.now(),
      timeOffsetSeconds: timeOffsetSeconds || 0,
      title,
      objectCount: objectCount || 0,
      textSummary,
      boardState: boardState || [],
    });

    return res.json({ success: true, data: snapshot });
  } catch (error: any) {
    console.error('[LecturePersistenceController] appendSnapshot error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to save snapshot' });
  }
}

/**
 * GET Session by ID (with Room Security Check): GET /api/ai/lecture/session/:sessionId
 */
export async function getSessionHandler(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const roomCode = req.query.roomCode as string;

    const session = await lecturePersistenceService.getSessionById(sessionId, roomCode);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Lecture session not found' });
    }

    return res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('[LecturePersistenceController] getSession error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch session' });
  }
}
