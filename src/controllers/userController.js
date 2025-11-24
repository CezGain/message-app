import User from '../models/User.js';

/**
 * Controller pour obtenir un utilisateur par ID
 * @route GET /api/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
    }

    res.status(200).json(user.toPublicJSON());
  } catch (error) {
    console.error('Erreur getUserById:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour lister tous les utilisateurs
 * @route GET /api/users
 */
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find().select('-password').skip(skip).limit(limit).sort({ username: 1 });

    const total = await User.countDocuments();

    res.status(200).json({
      users: users.map((u) => u.toPublicJSON()),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur getUsers:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour mettre à jour le profil
 * @route PUT /api/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({
          error: "Nom d'utilisateur déjà pris",
        });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({
          error: 'Email déjà utilisé',
        });
      }
      user.email = email;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.status(200).json({
      message: 'Profil mis à jour',
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Tous les champs sont requis',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Mot de passe actuel incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: 'Mot de passe modifié avec succès',
    });
  } catch (error) {
    console.error('Erreur changePassword:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour rechercher des utilisateurs
 * @route GET /api/users/search
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Recherche minimum 2 caractères',
      });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
    })
      .select('-password')
      .limit(20);

    res.status(200).json({
      users: users.map((u) => u.toPublicJSON()),
    });
  } catch (error) {
    console.error('Erreur searchUsers:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};
