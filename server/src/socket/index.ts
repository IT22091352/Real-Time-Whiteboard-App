import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../types/index.js';
import { registerRoomHandlers } from './roomHandler.js';
import { registerDrawingHandlers } from './drawingHandler.js';
import { registerCursorHandlers } from './cursorHandler.js';
import { verifyToken } from '../middleware/authMiddleware.js';

export function initializeSocketIO(httpServer: HttpServer, corsOrigin: string) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Socket.IO Handshake Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.data.authUser = decoded;
        socket.data.userId = decoded.id;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id} (User: ${socket.data.authUser?.name || 'Guest'})`);

    // Register modular event handlers
    registerRoomHandlers(io, socket);
    registerDrawingHandlers(io, socket);
    registerCursorHandlers(io, socket);
  });

  return io;
}
