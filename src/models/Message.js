const mongoose = require('mongoose');

/**
 * Schéma MongoDB pour le modèle Message
 * @description Gère les messages privés 1-to-1 entre utilisateurs
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expéditeur requis'],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Destinataire requis'],
    },
    content: {
      type: String,
      required: [true, 'Contenu requis'],
      maxlength: [5000, 'Maximum 5000 caractères'],
    },
    status: {
      type: String,
      enum: ['sent', 'received', 'read'],
      default: 'sent',
    },
    edited: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Index composé pour optimiser les requêtes de conversation
 */
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, status: 1 });

/**
 * Retourne les messages non supprimés
 * @returns {Object} Message formaté
 */
messageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (this.deleted) {
    obj.content = '[Message supprimé]';
  }
  return obj;
};

module.exports = mongoose.model('Message', messageSchema);
