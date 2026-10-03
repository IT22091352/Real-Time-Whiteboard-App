import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSessionInput {
  roomCode: string;
  startedAt: number;
  createdBy?: string;
  createdByName?: string;
}

export interface SaveEventInput {
  lectureSessionId: string;
  type: string;
  timestamp: number;
  timeOffsetSeconds: number;
  userId?: string;
  userName?: string;
  strokeId?: string;
  objectType?: string;
  summary: string;
  metadata?: any;
}

export interface SaveSnapshotInput {
  lectureSessionId: string;
  timestamp: number;
  timeOffsetSeconds: number;
  title?: string;
  objectCount: number;
  textSummary: string;
  boardState: any;
}

export class LecturePersistenceService {
  /**
   * Create or resume an active LectureSession for a room
   */
  public async getOrCreateSession(input: CreateSessionInput) {
    const { roomCode, startedAt, createdBy, createdByName } = input;

    // Check if there's already an active session for this roomCode
    const existingActive = await (prisma as any).lectureSession.findFirst({
      where: {
        roomCode,
        status: 'ACTIVE',
      },
      include: {
        events: {
          orderBy: { timestamp: 'asc' },
        },
        snapshots: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (existingActive) {
      return this.formatSession(existingActive);
    }

    // Create new lecture session
    const newSession = await (prisma as any).lectureSession.create({
      data: {
        roomCode,
        startedAt: BigInt(startedAt),
        createdBy: createdBy || 'unknown',
        createdByName: createdByName || 'Anonymous Teacher',
        status: 'ACTIVE',
      },
      include: {
        events: true,
        snapshots: true,
      },
    });

    return this.formatSession(newSession);
  }

  /**
   * Save a semantic lecture event
   */
  public async saveEvent(input: SaveEventInput) {
    const event = await (prisma as any).lectureEvent.create({
      data: {
        lectureSessionId: input.lectureSessionId,
        type: input.type,
        timestamp: BigInt(input.timestamp),
        timeOffsetSeconds: input.timeOffsetSeconds,
        userId: input.userId || 'unknown',
        userName: input.userName || 'Unknown User',
        strokeId: input.strokeId,
        objectType: input.objectType,
        summary: input.summary,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    return {
      id: event.id,
      lectureSessionId: event.lectureSessionId,
      type: event.type,
      timestamp: Number(event.timestamp),
      timeOffsetSeconds: event.timeOffsetSeconds,
      userId: event.userId,
      userName: event.userName,
      strokeId: event.strokeId,
      objectType: event.objectType,
      summary: event.summary,
    };
  }

  /**
   * Save a semantic board snapshot checkpoint
   */
  public async saveSnapshot(input: SaveSnapshotInput) {
    const snapshot = await (prisma as any).lectureSnapshot.create({
      data: {
        lectureSessionId: input.lectureSessionId,
        timestamp: BigInt(input.timestamp),
        timeOffsetSeconds: input.timeOffsetSeconds,
        title: input.title,
        objectCount: input.objectCount,
        textSummary: input.textSummary,
        boardState: JSON.stringify(input.boardState),
      },
    });

    return {
      id: snapshot.id,
      lectureSessionId: snapshot.lectureSessionId,
      timestamp: Number(snapshot.timestamp),
      timeOffsetSeconds: snapshot.timeOffsetSeconds,
      title: snapshot.title,
      objectCount: snapshot.objectCount,
      textSummary: snapshot.textSummary,
    };
  }

  /**
   * End a lecture session & optionally cache generated AI outputs
   */
  public async endSession(sessionId: string, endedAt: number, caches?: { notes?: any; quiz?: any; flashcards?: any }) {
    const updateData: any = {
      status: 'COMPLETED',
      endedAt: BigInt(endedAt),
    };

    if (caches?.notes) updateData.notesCache = JSON.stringify(caches.notes);
    if (caches?.quiz) updateData.quizCache = JSON.stringify(caches.quiz);
    if (caches?.flashcards) updateData.flashcardsCache = JSON.stringify(caches.flashcards);

    const session = await (prisma as any).lectureSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        events: { orderBy: { timestamp: 'asc' } },
        snapshots: { orderBy: { timestamp: 'asc' } },
      },
    });

    return this.formatSession(session);
  }

  /**
   * Cache specific AI output (lazy loading cache update)
   */
  public async updateCache(sessionId: string, cacheType: 'notes' | 'quiz' | 'flashcards', data: any) {
    const updateData: any = {};
    if (cacheType === 'notes') updateData.notesCache = JSON.stringify(data);
    if (cacheType === 'quiz') updateData.quizCache = JSON.stringify(data);
    if (cacheType === 'flashcards') updateData.flashcardsCache = JSON.stringify(data);

    await (prisma as any).lectureSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Get session by ID (with roomCode security verification)
   */
  public async getSessionById(sessionId: string, roomCode?: string) {
    const whereClause: any = { id: sessionId };
    if (roomCode) whereClause.roomCode = roomCode;

    const session = await (prisma as any).lectureSession.findFirst({
      where: whereClause,
      include: {
        events: { orderBy: { timestamp: 'asc' } },
        snapshots: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!session) return null;
    return this.formatSession(session);
  }

  private formatSession(raw: any) {
    return {
      id: raw.id,
      roomCode: raw.roomCode,
      startedAt: Number(raw.startedAt),
      endedAt: raw.endedAt ? Number(raw.endedAt) : null,
      status: raw.status,
      createdBy: raw.createdBy,
      createdByName: raw.createdByName,
      notesCache: raw.notesCache ? JSON.parse(raw.notesCache) : null,
      quizCache: raw.quizCache ? JSON.parse(raw.quizCache) : null,
      flashcardsCache: raw.flashcardsCache ? JSON.parse(raw.flashcardsCache) : null,
      events: (raw.events || []).map((e: any) => ({
        id: e.id,
        type: e.type,
        timestamp: Number(e.timestamp),
        timeOffsetSeconds: e.timeOffsetSeconds,
        userId: e.userId || 'unknown',
        userName: e.userName || 'Unknown User',
        strokeId: e.strokeId,
        objectType: e.objectType,
        summary: e.summary,
        metadata: e.metadata ? JSON.parse(e.metadata) : undefined,
      })),
      snapshots: (raw.snapshots || []).map((s: any) => ({
        id: s.id,
        timestamp: Number(s.timestamp),
        timeOffsetSeconds: s.timeOffsetSeconds,
        title: s.title,
        objectCount: s.objectCount,
        textSummary: s.textSummary,
        boardState: s.boardState ? JSON.parse(s.boardState) : [],
      })),
    };
  }
}

export const lecturePersistenceService = new LecturePersistenceService();
