import { prisma } from '../lib/prisma.js';
import { StrokeData, Point, DrawingTool } from '../types/index.js';

// In-memory active stroke/object buffers per room to ensure real-time performance & fallback if DB unavailable
const roomStrokesMap = new Map<string, Map<string, StrokeData>>();
const roomRedoStackMap = new Map<string, StrokeData[]>();

function cleanUndefinedProps<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

export async function loadRoomStrokes(roomId: string, roomCode: string): Promise<StrokeData[]> {
  // If memory already has cached strokes/objects, return them
  if (roomStrokesMap.has(roomCode)) {
    const strokes = Array.from(roomStrokesMap.get(roomCode)!.values());
    return strokes.filter((s) => !s.isDeleted);
  }

  try {
    const dbStrokes = await prisma.stroke.findMany({
      where: {
        roomId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedStrokes: StrokeData[] = dbStrokes.map((s) => {
      let meta: any = {};
      try {
        meta = typeof s.points === 'string' ? JSON.parse(s.points) : s.points || {};
      } catch {}

      const points = Array.isArray(meta) ? meta : meta.points || [];
      let childIds: string[] | undefined = undefined;
      if ((s as any).childIds) {
        try {
          childIds = JSON.parse((s as any).childIds);
        } catch {
          childIds = meta.childIds;
        }
      } else if (meta.childIds) {
        childIds = meta.childIds;
      }

      const strokeColor = meta.color || s.color || '#000000';

      return {
        id: s.id,
        roomId: roomCode,
        userId: s.userId || undefined,
        tool: (s.tool as DrawingTool) || 'brush',
        color: strokeColor,
        size: s.size || meta.size || 4,
        fillColor: (s as any).fillColor || meta.fillColor || undefined,
        x: (s as any).x !== undefined && (s as any).x !== null ? (s as any).x : meta.x,
        y: (s as any).y !== undefined && (s as any).y !== null ? (s as any).y : meta.y,
        width: (s as any).width !== undefined && (s as any).width !== null ? (s as any).width : meta.width,
        height: (s as any).height !== undefined && (s as any).height !== null ? (s as any).height : meta.height,
        rotation: (s as any).rotation !== undefined && (s as any).rotation !== null ? (s as any).rotation : meta.rotation || 0,
        childIds,
        assetUrl: (s as any).assetUrl || meta.assetUrl || undefined,
        isHighlighter: (s as any).isHighlighter ?? meta.isHighlighter ?? (s.tool === 'highlighter'),
        text: (s as any).text || meta.text || undefined,
        fontSize: (s as any).fontSize || meta.fontSize || undefined,
        fromId: (s as any).fromId || meta.fromId || undefined,
        toId: (s as any).toId || meta.toId || undefined,
        points: points,
        isDeleted: s.isDeleted,
        createdAt: s.createdAt.toISOString(),
      };
    });

    // Cache in memory
    const strokeMap = new Map<string, StrokeData>();
    formattedStrokes.forEach((s) => strokeMap.set(s.id, s));
    roomStrokesMap.set(roomCode, strokeMap);

    return formattedStrokes;
  } catch (error) {
    console.error(`Error loading DB strokes for room ${roomCode}:`, error);
    if (!roomStrokesMap.has(roomCode)) {
      roomStrokesMap.set(roomCode, new Map());
    }
    return Array.from(roomStrokesMap.get(roomCode)!.values()).filter((s) => !s.isDeleted);
  }
}

export function startStroke(
  roomCode: string,
  strokeId: string,
  userId: string,
  userName: string,
  tool: DrawingTool,
  color: string,
  size: number,
  initialPoint: Point,
  extraData?: Partial<StrokeData>
): StrokeData {
  if (!roomStrokesMap.has(roomCode)) {
    roomStrokesMap.set(roomCode, new Map());
  }

  const strokeMap = roomStrokesMap.get(roomCode)!;
  const strokeColor = color || extraData?.color || '#000000';
  const stroke: StrokeData = {
    id: strokeId,
    roomId: roomCode,
    userId,
    userName,
    tool,
    color: strokeColor,
    size: size || extraData?.size || 4,
    points: [initialPoint],
    fillColor: extraData?.fillColor,
    x: extraData?.x,
    y: extraData?.y,
    width: extraData?.width,
    height: extraData?.height,
    rotation: extraData?.rotation ?? 0,
    childIds: extraData?.childIds,
    assetUrl: extraData?.assetUrl,
    isHighlighter: extraData?.isHighlighter ?? (tool === 'highlighter'),
    text: extraData?.text,
    fontSize: extraData?.fontSize,
    fromId: extraData?.fromId,
    toId: extraData?.toId,
    isDeleted: false,
    createdAt: new Date().toISOString(),
  };

  strokeMap.set(strokeId, stroke);
  
  // Reset redo stack when a new object is created
  roomRedoStackMap.set(roomCode, []);

  return stroke;
}

export function getStroke(roomCode: string, strokeId: string): StrokeData | null {
  const strokeMap = roomStrokesMap.get(roomCode);
  if (!strokeMap) return null;
  return strokeMap.get(strokeId) || null;
}

export function updateStrokeObject(roomCode: string, strokeId: string, updates: Partial<StrokeData>): StrokeData | null {
  const strokeMap = roomStrokesMap.get(roomCode);
  if (!strokeMap) return null;

  const stroke = strokeMap.get(strokeId);
  if (!stroke) return null;

  const cleaned = cleanUndefinedProps(updates);
  Object.assign(stroke, cleaned);
  return stroke;
}

export function appendPointsToStroke(roomCode: string, strokeId: string, newPoints: Point[], extraData?: Partial<StrokeData>): StrokeData {
  if (!roomStrokesMap.has(roomCode)) {
    roomStrokesMap.set(roomCode, new Map());
  }

  const strokeMap = roomStrokesMap.get(roomCode)!;
  let stroke = strokeMap.get(strokeId);

  if (!stroke) {
    stroke = {
      id: strokeId,
      roomId: roomCode,
      tool: extraData?.tool || 'brush',
      color: extraData?.color || '#3b82f6',
      size: extraData?.size || 3,
      points: [],
      fillColor: extraData?.fillColor || 'transparent',
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    strokeMap.set(strokeId, stroke);
  }

  if (newPoints && newPoints.length > 0) {
    for (const pt of newPoints) {
      const lastPt = stroke.points[stroke.points.length - 1];
      if (!lastPt || lastPt.x !== pt.x || lastPt.y !== pt.y) {
        stroke.points.push(pt);
      }
    }
  }
  if (extraData) {
    const cleaned = cleanUndefinedProps(extraData);
    Object.assign(stroke, cleaned);
  }
  return stroke;
}

export async function saveStrokeToDb(dbRoomId: string, stroke: StrokeData) {
  try {
    let validUserId: string | undefined = undefined;
    if (stroke.userId) {
      const dbUser = await prisma.user.findUnique({ where: { id: stroke.userId } }).catch(() => null);
      if (dbUser) {
        validUserId = dbUser.id;
      }
    }

    const strokeColor = stroke.color || '#000000';
    const childIdsJson = stroke.childIds ? JSON.stringify(stroke.childIds) : undefined;
    const metaPayload = {
      points: stroke.points,
      color: strokeColor,
      fillColor: stroke.fillColor,
      size: stroke.size,
      x: stroke.x,
      y: stroke.y,
      width: stroke.width,
      height: stroke.height,
      rotation: stroke.rotation,
      childIds: stroke.childIds,
      assetUrl: stroke.assetUrl,
      isHighlighter: stroke.isHighlighter,
      text: stroke.text,
      fontSize: stroke.fontSize,
      fromId: stroke.fromId,
      toId: stroke.toId,
    };

    await prisma.stroke.upsert({
      where: { id: stroke.id },
      create: {
        id: stroke.id,
        roomId: dbRoomId,
        userId: validUserId,
        tool: stroke.tool,
        color: strokeColor,
        size: stroke.size || 4,
        fillColor: stroke.fillColor,
        text: stroke.text,
        x: stroke.x,
        y: stroke.y,
        width: stroke.width,
        height: stroke.height,
        fontSize: stroke.fontSize,
        rotation: stroke.rotation ?? 0,
        childIds: childIdsJson,
        assetUrl: stroke.assetUrl,
        isHighlighter: stroke.isHighlighter ?? (stroke.tool === 'highlighter'),
        fromId: stroke.fromId,
        toId: stroke.toId,
        points: JSON.stringify(metaPayload),
        isDeleted: false,
      } as any,
      update: {
        tool: stroke.tool,
        color: strokeColor,
        size: stroke.size || 4,
        fillColor: stroke.fillColor,
        text: stroke.text,
        x: stroke.x,
        y: stroke.y,
        width: stroke.width,
        height: stroke.height,
        fontSize: stroke.fontSize,
        rotation: stroke.rotation ?? 0,
        childIds: childIdsJson,
        assetUrl: stroke.assetUrl,
        isHighlighter: stroke.isHighlighter ?? (stroke.tool === 'highlighter'),
        fromId: stroke.fromId,
        toId: stroke.toId,
        points: JSON.stringify(metaPayload),
        isDeleted: stroke.isDeleted ?? false,
      } as any,
    });
  } catch (error) {
    console.error(`DB Error persisting stroke/object ${stroke.id}:`, error);
  }
}

export async function undoLastStroke(roomCode: string, dbRoomId: string): Promise<StrokeData | null> {
  if (!roomStrokesMap.has(roomCode)) {
    await loadRoomStrokes(dbRoomId, roomCode);
  }

  const strokeMap = roomStrokesMap.get(roomCode);
  if (!strokeMap) return null;

  const activeStrokes = Array.from(strokeMap.values()).filter((s) => !s.isDeleted);
  if (activeStrokes.length === 0) return null;

  const strokeToUndo = activeStrokes[activeStrokes.length - 1];
  strokeToUndo.isDeleted = true;

  // Add to redo stack
  if (!roomRedoStackMap.has(roomCode)) {
    roomRedoStackMap.set(roomCode, []);
  }
  roomRedoStackMap.get(roomCode)!.push(strokeToUndo);

  // Persist to DB asynchronously
  try {
    await prisma.stroke.update({
      where: { id: strokeToUndo.id },
      data: { isDeleted: true },
    });
  } catch (error) {
    console.error(`DB Error updating undo for stroke ${strokeToUndo.id}:`, error);
  }

  return strokeToUndo;
}

export async function redoLastStroke(roomCode: string, dbRoomId: string): Promise<StrokeData | null> {
  if (!roomStrokesMap.has(roomCode)) {
    await loadRoomStrokes(dbRoomId, roomCode);
  }

  const redoStack = roomRedoStackMap.get(roomCode);
  if (!redoStack || redoStack.length === 0) return null;

  const strokeToRedo = redoStack.pop()!;
  strokeToRedo.isDeleted = false;

  const strokeMap = roomStrokesMap.get(roomCode);
  if (strokeMap) {
    strokeMap.set(strokeToRedo.id, strokeToRedo);
  }

  // Persist to DB
  try {
    await prisma.stroke.update({
      where: { id: strokeToRedo.id },
      data: { isDeleted: false },
    });
  } catch (error) {
    console.error(`DB Error updating redo for stroke ${strokeToRedo.id}:`, error);
  }

  return strokeToRedo;
}

export async function clearRoomBoard(roomCode: string, dbRoomId: string): Promise<void> {
  const strokeMap = roomStrokesMap.get(roomCode);
  if (strokeMap) {
    strokeMap.forEach((stroke) => {
      stroke.isDeleted = true;
    });
  }

  roomRedoStackMap.set(roomCode, []);

  try {
    await prisma.stroke.updateMany({
      where: { roomId: dbRoomId, isDeleted: false },
      data: { isDeleted: true },
    });
  } catch (error) {
    console.error(`DB Error clearing board for room ${roomCode}:`, error);
  }
}
