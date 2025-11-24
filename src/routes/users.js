import express from 'express';
import * as userController from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', authMiddleware, userController.searchUsers);

router.get('/', authMiddleware, userController.getUsers);

router.put('/profile', authMiddleware, userController.updateProfile);

router.put('/change-password', authMiddleware, userController.changePassword);

router.get('/:id', authMiddleware, userController.getUserById);

export default router;
