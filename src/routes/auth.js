const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @description Inscription d'un nouvel utilisateur
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @description Connexion d'un utilisateur
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/logout
 * @description Déconnexion d'un utilisateur
 * @access Protected
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route GET /api/auth/me
 * @description Obtenir l'utilisateur connecté
 * @access Protected
 */
router.get('/me', authMiddleware, authController.me);

module.exports = router;
