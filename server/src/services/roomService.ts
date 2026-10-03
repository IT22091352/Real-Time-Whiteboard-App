import { prisma } from '../lib/prisma.js';
import { UserPresence, UserRole } from '../types/index.js';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#14b8a6', // Teal
];

const ADJECTIVES = ['Creative', 'Swift', 'Bright', 'Clever', 'Agile', 'Bold', 'Vibrant', 'Calm'];
const ANIMALS = ['Fox', 'Falcon', 'Panda', 'Lynx', 'Otter', 'Eagle', 'Koala', 'Dolphin'];

// In-memory user & room state management per room
const activeRooms = new Map<string, Map<string, UserPresence>>();
const roomLockMap = new Map<string, boolean>();

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj} ${animal} #${num}`;
}

export function getRandomColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

export async function findOrCreateRoom(roomCode: string) {
  try {
    let room = await prisma.room.findUnique({
      where: { roomCode },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          roomCode,
          name: `Whiteboard ${roomCode}`,
        },
      });
    }

    if (room.isLocked !== undefined) {
      roomLockMap.set(roomCode, room.isLocked);
    }

    return room;
  } catch (error) {
    console.error(`DB Error in findOrCreateRoom for code ${roomCode}:`, error);
    return { id: roomCode, roomCode, name: `Whiteboard ${roomCode}`, isLocked: false, createdAt: new Date(), updatedAt: new Date() };
  }
}

export function isRoomLocked(roomCode: string): boolean {
  return roomLockMap.get(roomCode) ?? false;
}

export async function setRoomLock(roomCode: string, isLocked: boolean, dbRoomId?: string): Promise<boolean> {
  roomLockMap.set(roomCode, isLocked);
  if (dbRoomId) {
    try {
      await prisma.room.update({
        where: { id: dbRoomId },
        data: { isLocked },
      });
    } catch (e) {
      console.error(`Failed to update room lock status in DB for room ${roomCode}:`, e);
    }
  }
  return isLocked;
}

export function addUserToRoom(roomCode: string, user: UserPresence): UserPresence[] {
  if (!activeRooms.has(roomCode)) {
    activeRooms.set(roomCode, new Map());
  }

  const roomUsers = activeRooms.get(roomCode)!;
  // If user is first to join, assign as HOST
  if (roomUsers.size === 0) {
    user.role = 'HOST';
  } else if (!user.role) {
    user.role = 'EDITOR';
  }

  roomUsers.set(user.socketId, user);

  return Array.from(roomUsers.values());
}

export function setUserRole(roomCode: string, socketId: string, role: UserRole): UserPresence | null {
  const roomUsers = activeRooms.get(roomCode);
  if (!roomUsers) return null;

  const user = roomUsers.get(socketId);
  if (!user) return null;

  user.role = role;
  return user;
}

export function removeUserFromRoom(roomCode: string, socketId: string): { user: UserPresence | null; remainingUsers: UserPresence[] } {
  const roomUsers = activeRooms.get(roomCode);
  if (!roomUsers) {
    return { user: null, remainingUsers: [] };
  }

  const user = roomUsers.get(socketId) || null;
  const wasHost = user?.role === 'HOST';
  roomUsers.delete(socketId);

  // If host left, reassign host role to next active user
  const remainingUsers = Array.from(roomUsers.values());
  if (wasHost && remainingUsers.length > 0) {
    remainingUsers[0].role = 'HOST';
  }

  if (roomUsers.size === 0) {
    activeRooms.delete(roomCode);
    roomLockMap.delete(roomCode);
  }

  return { user, remainingUsers };
}

export function getRoomUsers(roomCode: string): UserPresence[] {
  const roomUsers = activeRooms.get(roomCode);
  if (!roomUsers) return [];
  return Array.from(roomUsers.values());
}

export function getUserInRoom(roomCode: string, socketId: string): UserPresence | null {
  const roomUsers = activeRooms.get(roomCode);
  if (!roomUsers) return null;
  return roomUsers.get(socketId) || null;
}
