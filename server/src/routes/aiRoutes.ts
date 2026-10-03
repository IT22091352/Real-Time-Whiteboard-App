import { Router } from 'express';
import { analyzeDiagramHandler, whiteboardAIHandler, smartInkHandler, lectureAIHandler } from '../controllers/aiController.js';
import {
  getOrCreateSessionHandler,
  appendEventHandler,
  appendSnapshotHandler,
  getSessionHandler,
} from '../controllers/lecturePersistenceController.js';

const router = Router();

// 🎓 LIVE LECTURE INTELLIGENCE Main AI Endpoint
router.post('/lecture', lectureAIHandler);

// 🎓 Lecture Persistence Endpoints
router.post('/lecture/session', getOrCreateSessionHandler);
router.post('/lecture/event', appendEventHandler);
router.post('/lecture/snapshot', appendSnapshotHandler);
router.get('/lecture/session/:sessionId', getSessionHandler);

// ✨ Smart Ink Intelligence Endpoint
router.post('/smart-ink', smartInkHandler);

// General-Purpose AI Whiteboard Assistant Endpoint
router.post('/whiteboard', whiteboardAIHandler);

// Legacy AI Diagram Analyzer Endpoint
router.post('/analyze-diagram', analyzeDiagramHandler);

export default router;
