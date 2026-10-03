import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { createApp } from './app.js';
import { initializeSocketIO } from './socket/index.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const app = createApp();
const httpServer = http.createServer(app);

// Initialize Socket.IO engine
initializeSocketIO(httpServer, CLIENT_ORIGIN);

httpServer.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Whiteboard Backend Server running on port ${PORT}`);
  console.log(` REST API: http://localhost:${PORT}/api`);
  console.log(` WebSocket: ws://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
