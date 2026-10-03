import { Socket, Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../types/index.js';
import { CursorMoveSchema, LaserMoveSchema } from '../validators/socketSchemas.js';

export function registerCursorHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on('cursor:move', (rawPayload) => {
    const roomCode = socket.data.roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const parsed = CursorMoveSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { x, y } = parsed.data;

    // Broadcast normalized cursor position to room members (excluding sender)
    socket.to(roomCode).emit('cursor:move', {
      userId: user.id,
      userName: user.name,
      color: user.color,
      x,
      y,
    });
  });

  socket.on('cursor:laser', (rawPayload) => {
    const roomCode = socket.data.roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    const parsed = LaserMoveSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { x, y } = parsed.data;

    // Broadcast ephemeral laser pointer position (~20-30 updates/sec target)
    socket.to(roomCode).emit('cursor:laser', {
      userId: user.id,
      userName: user.name,
      color: user.color,
      x,
      y,
      timestamp: Date.now(),
    });
  });
}
