const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/messages/conversations
 * @description Récupérer toutes les conversations
 * @access Protected
 */
router.get('/conversations', authMiddleware, messageController.getConversations);

/**
 * @route POST /api/messages
 * @description Créer un nouveau message
 * @access Protected
 */
router.post('/', authMiddleware, messageController.createMessage);

/**
 * @route GET /api/messages/:user_id
 * @description Récupérer tous les messages avec un utilisateur
 * @access Protected
 */
router.get('/:user_id', authMiddleware, messageController.getMessagesWith);

/**
 * @route PUT /api/messages/:id
 * @description Éditer un message
 * @access Protected
 */
router.put('/:id', authMiddleware, messageController.updateMessage);

/**
 * @route DELETE /api/messages/:id
 * @description Supprimer un message
 * @access Protected
 */
router.delete('/:id', authMiddleware, messageController.deleteMessage);

/**
 * @route POST /api/messages/:id/read
 * @description Marquer un message comme lu
 * @access Protected
 */
router.post('/:id/read', authMiddleware, messageController.markAsRead);

module.exports = router;
