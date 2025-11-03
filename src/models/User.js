const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Schéma MongoDB pour le modèle User
 * @description Gère les utilisateurs avec authentification, profil et statut
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email requis'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Format email invalide',
      },
    },
    username: {
      type: String,
      required: [true, "Nom d'utilisateur requis"],
      unique: true,
      trim: true,
      minlength: [3, 'Minimum 3 caractères'],
    },
    password: {
      type: String,
      required: [true, 'Mot de passe requis'],
      minlength: [6, 'Minimum 6 caractères'],
    },
    avatar: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    lastConnection: {
      type: Date,
      default: null,
    },
    socketId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Hash le mot de passe avant sauvegarde
 * @middleware pre-save
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare un mot de passe avec le hash stocké
 * @param {string} candidatePassword - Mot de passe à vérifier
 * @returns {Promise<boolean>} True si valide
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Retourne le profil public (sans mot de passe)
 * @returns {Object} Profil public
 */
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    username: this.username,
    avatar: this.avatar,
    status: this.status,
    lastConnection: this.lastConnection,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
