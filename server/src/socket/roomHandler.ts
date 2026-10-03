import { Socket, Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, UserPresence, UserRole } from '../types/index.js';
import { JoinRoomSchema, RoomLockSchema, UserRoleSchema } from '../validators/socketSchemas.js';
import {
  findOrCreateRoom,
  addUserToRoom,
  removeUserFromRoom,
  generateRandomName,
  getRandomColor,
  isRoomLocked,
  setRoomLock,
  setUserRole,
  getRoomUsers,
} from '../services/roomService.js';
import { loadRoomStrokes } from '../services/strokeService.js';
import { prisma } from '../lib/prisma.js';

export function registerRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on('room:join', async (rawPayload) => {
    try {
      const parsed = JoinRoomSchema.safeParse(rawPayload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid room join payload.' });
        return;
      }

      const { roomCode, userName } = parsed.data;
      const cleanRoomCode = roomCode.trim().toLowerCase();

      // Clean up previous room session if changing room
      if (socket.data.roomCode && socket.data.roomCode !== cleanRoomCode) {
        handleDisconnect(io, socket);
      }

      // Find or create room in DB
      const dbRoom = await findOrCreateRoom(cleanRoomCode);

      socket.data.roomCode = cleanRoomCode;
      socket.data.dbRoomId = dbRoom.id;

      // Determine authenticated user identity and role
      const authUser = (socket.data as any).authUser;
      const userId = authUser ? authUser.id : socket.id;
      const displayName = authUser ? authUser.name : (userName && userName.trim() ? userName.trim() : generateRandomName());

      let role: UserRole = 'EDITOR';

      if ('ownerId' in dbRoom && (dbRoom as any).ownerId && authUser && (dbRoom as any).ownerId === authUser.id) {
        role = 'HOST';
      } else if (authUser) {
        const membership = await prisma.roomMember.findUnique({
          where: {
            roomId_userId: {
              roomId: dbRoom.id,
              userId: authUser.id,
            },
          },
        });
        if (membership) {
          role = membership.role as UserRole;
        } else {
          // Auto-add authenticated user to DB RoomMembers
          await prisma.roomMember.create({
            data: {
              roomId: dbRoom.id,
              userId: authUser.id,
              role: 'EDITOR',
            },
          }).catch(() => {});
        }
      }

      // User presence object
      const userPresence: UserPresence = {
        id: userId,
        socketId: socket.id,
        name: displayName,
        color: getRandomColor(),
        role,
        roomId: cleanRoomCode,
      };

      const allUsers = addUserToRoom(cleanRoomCode, userPresence);
      socket.data.user = userPresence;

      socket.join(cleanRoomCode);

      const existingStrokes = await loadRoomStrokes(dbRoom.id, cleanRoomCode);
      const locked = isRoomLocked(cleanRoomCode);

      socket.emit('room:joined', {
        roomCode: cleanRoomCode,
        currentUser: userPresence,
        users: allUsers,
        strokes: existingStrokes,
        isLocked: locked,
      });

      socket.to(cleanRoomCode).emit('user:join', userPresence);
      io.to(cleanRoomCode).emit('users:update', allUsers);

      console.log(`[Socket] User ${userPresence.name} (${userPresence.role}) joined room: ${cleanRoomCode}`);
    } catch (error) {
      console.error('[Socket] Error in room:join handler:', error);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  socket.on('room:lock', async (rawPayload) => {
    const roomCode = socket.data.roomCode;
    const user = socket.data.user;
    if (!roomCode || !user) return;

    if (user.role !== 'HOST') {
      socket.emit('error', { message: 'Only the Host can lock or unlock the board.' });
      return;
    }

    const parsed = RoomLockSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { isLocked } = parsed.data;
    await setRoomLock(roomCode, isLocked, socket.data.dbRoomId);

    io.to(roomCode).emit('room:lock_updated', { isLocked, updatedBy: user.name });
  });

  socket.on('user:role', (rawPayload) => {
    const roomCode = socket.data.roomCode;
    const currentUser = socket.data.user;
    if (!roomCode || !currentUser) return;

    if (currentUser.role !== 'HOST') {
      socket.emit('error', { message: 'Only the Host can assign participant roles.' });
      return;
    }

    const parsed = UserRoleSchema.safeParse(rawPayload);
    if (!parsed.success) return;

    const { targetUserId, role } = parsed.data;
    const updatedUser = setUserRole(roomCode, targetUserId, role);
    if (updatedUser) {
      const allUsers = getRoomUsers(roomCode);
      io.to(roomCode).emit('users:update', allUsers);
      io.to(roomCode).emit('user:role_updated', { userId: targetUserId, role, updatedBy: currentUser.name });
    }
  });

  socket.on('room:leave', () => {
    handleDisconnect(io, socket);
  });

  socket.on('disconnect', () => {
    handleDisconnect(io, socket);
  });
}

export function handleDisconnect(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const { user, remainingUsers } = removeUserFromRoom(roomCode, socket.id);
  socket.leave(roomCode);

  if (user) {
    console.log(`[Socket] User ${user.name} (${socket.id}) disconnected from room: ${roomCode}`);
    io.to(roomCode).emit('user:leave', { userId: user.id, socketId: socket.id });
    io.to(roomCode).emit('users:update', remainingUsers);
  }

  socket.data.roomCode = undefined;
  socket.data.user = undefined;
}
