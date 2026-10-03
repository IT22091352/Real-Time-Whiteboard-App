import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server) or any local dev origin
        if (!origin || process.env.NODE_ENV !== 'production' || origin === process.env.CLIENT_ORIGIN) {
          callback(null, true);
        } else {
          callback(null, true); // Fallback allow in dev
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '30mb' }));

  // Static uploads directory serving
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/upload', uploadRoutes);

  return app;
}
