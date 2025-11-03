const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/users/search
 * @description Rechercher des utilisateurs par nom
 * @access Protected
 */
router.get('/search', authMiddleware, userController.searchUsers);

/**
 * @route GET /api/users
 * @description Lister tous les utilisateurs
 * @access Protected
 */
router.get('/', authMiddleware, userController.getUsers);

/**
 * @route PUT /api/users/profile
 * @description Mettre à jour son profil
 * @access Protected
 */
router.put('/profile', authMiddleware, userController.updateProfile);

/**
 * @route GET /api/users/:id
 * @description Obtenir un utilisateur par ID
 * @access Protected
 */
router.get('/:id', authMiddleware, userController.getUserById);

module.exports = router;
