import { generateToken } from '../middleware/auth.js';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { email, username, password, avatar } = req.body;

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

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        error: 'Email déjà utilisé',
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        error: "Nom d'utilisateur déjà pris",
      });
    }

    const user = new User({
      email,
      username,
      password,
      avatar: avatar || null,
    });

    await user.save();

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

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: 'Identifiants invalides',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Identifiants invalides',
      });
    }

    user.status = 'online';
    user.lastConnection = new Date();
    await user.save();

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

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
    }

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

export const me = async (req, res) => {
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
