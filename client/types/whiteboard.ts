export interface Point {
  x: number; // 0.0 to 1.0 normalized canvas ratio
  y: number; // 0.0 to 1.0 normalized canvas ratio
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
  fillColor?: string; // Optional fill color ('transparent', hex, etc.)
  x?: number; // Normalized top-left X (0.0 - 1.0)
  y?: number; // Normalized top-left Y (0.0 - 1.0)
  width?: number; // Normalized width (0.0 - 1.0)
  height?: number; // Normalized height (0.0 - 1.0)
  text?: string; // Content for text objects and sticky notes
  fontSize?: number; // Font size in pixels
  rotation?: number; // Angle in degrees (0..360)
  childIds?: string[]; // Preserves child stroke IDs for groups
  assetUrl?: string; // Asset URL for Image / PDF objects
  isHighlighter?: boolean;
  fromId?: string; // Connected start object ID
  toId?: string; // Connected end object ID
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
  x: number; // 0.0 - 1.0 normalized
  y: number; // 0.0 - 1.0 normalized
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
  'object:update': (payload: { strokeId: string; text?: string; fillColor?: string; color?: string; size?: number; width?: number; height?: number; rotation?: number }) => void;
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
  'object:update': (payload: { strokeId: string; text?: string; fillColor?: string; color?: string; size?: number; width?: number; height?: number; rotation?: number }) => void;
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
