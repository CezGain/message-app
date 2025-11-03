const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

/**
 * Controller pour l'inscription
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { email, username, password, avatar } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, username et mot de passe requis',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mot de passe minimum 6 caractères',
      });
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        error: 'Email déjà utilisé',
      });
    }

    // Vérifier si le username existe déjà
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        error: "Nom d'utilisateur déjà pris",
      });
    }

    // Créer l'utilisateur
    const user = new User({
      email,
      username,
      password,
      avatar: avatar || null,
    });

    await user.save();

    // Générer le token JWT
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      error: "Erreur serveur lors de l'inscription",
    });
  }
};

/**
 * Controller pour la connexion
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis',
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Identifiants invalides',
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Identifiants invalides',
      });
    }

    // Mettre à jour le statut
    user.status = 'online';
    user.lastConnection = new Date();
    await user.save();

    // Générer le token JWT
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la connexion',
    });
  }
};

/**
 * Controller pour la déconnexion
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
    }

    // Mettre à jour le statut
    user.status = 'offline';
    user.lastConnection = new Date();
    user.socketId = null;
    await user.save();

    res.status(200).json({
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la déconnexion',
    });
  }
};

/**
 * Controller pour obtenir l'utilisateur connecté
 * @route GET /api/auth/me
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
    }

    res.status(200).json({
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Erreur me:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};
