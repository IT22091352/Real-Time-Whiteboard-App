export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type UserRole = 'HOST' | 'EDITOR' | 'VIEWER';

export type DrawingTool =
  | 'brush'
  | 'eraser'
  | 'highlighter'
  | 'select'
  | 'hand'
  | 'laser'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'polygon'
  | 'text'
  | 'sticky'
  | 'connector'
  | 'image'
  | 'group'
  | 'pdf_page';

export interface StrokeData {
  id: string;
  roomId: string;
  userId?: string;
  userName?: string;
  tool: DrawingTool;
  color: string;
  size: number;
  points: Point[];
  fillColor?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  rotation?: number;
  childIds?: string[];
  assetUrl?: string;
  isHighlighter?: boolean;
  text?: string;
  fromId?: string;
  toId?: string;
  isDeleted?: boolean;
  createdAt?: string;
}

export interface UserPresence {
  id: string;
  socketId: string;
  name: string;
  color: string;
  role: UserRole;
  roomId: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export interface LaserPosition {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomCode: string; userName?: string }) => void;
  'room:leave': () => void;
  'room:lock': (payload: { isLocked: boolean }) => void;
  'user:role': (payload: { targetUserId: string; role: UserRole }) => void;
  'drawing:start': (payload: Partial<StrokeData> & { strokeId: string; tool: DrawingTool; color: string; size: number; point: Point }) => void;
  'drawing:update': (payload: Partial<StrokeData> & { strokeId: string; points: Point[] }) => void;
  'drawing:end': (payload: { strokeId: string }) => void;
  'object:move': (payload: { strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }) => void;
  'object:update': (payload: { strokeId: string; text?: string; fillColor?: string; color?: string; width?: number; height?: number; rotation?: number }) => void;
  'object:delete': (payload: { strokeId: string }) => void;
  'object:batch_move': (payload: { moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }> }) => void;
  'object:batch_delete': (payload: { strokeIds: string[] }) => void;
  'object:group': (payload: { groupId: string; childIds: string[]; x: number; y: number; width: number; height: number }) => void;
  'object:ungroup': (payload: { groupId: string }) => void;
  'stroke:undo': () => void;
  'stroke:redo': () => void;
  'board:clear': () => void;
  'cursor:move': (payload: { x: number; y: number }) => void;
  'cursor:laser': (payload: { x: number; y: number }) => void;
  'lecture:transcript_segment': (payload: { lectureSessionId: string; startTime: number; endTime: number; text: string; confidence?: number }) => void;
}

export interface ServerToClientEvents {
  'room:joined': (payload: {
    roomCode: string;
    currentUser: UserPresence;
    users: UserPresence[];
    strokes: StrokeData[];
    isLocked: boolean;
  }) => void;
  'user:join': (user: UserPresence) => void;
  'user:leave': (payload: { userId: string; socketId: string }) => void;
  'users:update': (users: UserPresence[]) => void;
  'room:lock_updated': (payload: { isLocked: boolean; updatedBy: string }) => void;
  'user:role_updated': (payload: { userId: string; role: UserRole; updatedBy: string }) => void;
  'drawing:start': (payload: Partial<StrokeData> & { strokeId: string; userId: string; userName: string; tool: DrawingTool; color: string; size: number; point: Point }) => void;
  'drawing:update': (payload: Partial<StrokeData> & { strokeId: string; points: Point[] }) => void;
  'drawing:end': (payload: { strokeId: string }) => void;
  'object:move': (payload: { strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }) => void;
  'object:update': (payload: { strokeId: string; text?: string; fillColor?: string; color?: string; width?: number; height?: number; rotation?: number }) => void;
  'object:delete': (payload: { strokeId: string }) => void;
  'object:batch_move': (payload: { moves: Array<{ strokeId: string; x?: number; y?: number; rotation?: number; points?: Point[] }> }) => void;
  'object:batch_delete': (payload: { strokeIds: string[] }) => void;
  'object:group': (payload: { stroke: StrokeData }) => void;
  'object:ungroup': (payload: { groupId: string }) => void;
  'stroke:undo': (payload: { strokeId: string; undoneBy: string }) => void;
  'stroke:redo': (payload: { stroke: StrokeData; redoneBy: string }) => void;
  'board:clear': (payload: { clearedBy: string }) => void;
  'board:sync': (strokes: StrokeData[]) => void;
  'cursor:move': (cursor: CursorPosition) => void;
  'cursor:laser': (laser: LaserPosition) => void;
  'lecture:transcript_segment_added': (segment: { id: string; lectureSessionId: string; startTime: number; endTime: number; text: string; speakerName?: string }) => void;
  'error': (payload: { message: string }) => void;
}
