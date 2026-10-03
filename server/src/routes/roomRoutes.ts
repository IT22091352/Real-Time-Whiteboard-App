import { Router } from 'express';
import {
  createRoomHandler,
  getRoomDetailsHandler,
  renameRoomHandler,
  duplicateRoomHandler,
  deleteRoomHandler,
  shareRoomHandler,
  getRevisionsHandler,
  createRevisionHandler,
  restoreRevisionHandler,
} from '../controllers/roomController.js';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/create', optionalAuth, createRoomHandler);
router.get('/:roomCode', optionalAuth, getRoomDetailsHandler);
router.put('/:roomCode/rename', authenticateToken, renameRoomHandler);
router.post('/:roomCode/duplicate', authenticateToken, duplicateRoomHandler);
router.delete('/:roomCode', authenticateToken, deleteRoomHandler);
router.post('/:roomCode/share', authenticateToken, shareRoomHandler);
router.get('/:roomCode/revisions', optionalAuth, getRevisionsHandler);
router.post('/:roomCode/revisions', authenticateToken, createRevisionHandler);
router.post('/:roomCode/revisions/:revisionId/restore', authenticateToken, restoreRevisionHandler);

export default router;
