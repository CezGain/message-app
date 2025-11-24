import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/conversations', authMiddleware, messageController.getConversations);

router.post('/', authMiddleware, messageController.createMessage);

router.get('/:user_id', authMiddleware, messageController.getMessagesWith);

router.put('/:id', authMiddleware, messageController.updateMessage);

router.delete('/:id', authMiddleware, messageController.deleteMessage);

router.post('/:id/read', authMiddleware, messageController.markAsRead);

export default router;
