const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Controller pour créer un nouveau message
 * @route POST /api/messages
 */
exports.createMessage = async (req, res) => {
  try {
    const { recipient_id, content } = req.body;

    // Validation
    if (!recipient_id || !content) {
      return res.status(400).json({
        error: 'Destinataire et contenu requis',
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        error: 'Maximum 5000 caractères',
      });
    }

    // Vérifier que le destinataire existe
    const recipient = await User.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({
        error: 'Destinataire non trouvé',
      });
    }

    // Créer le message
    const message = new Message({
      sender: req.userId,
      recipient: recipient_id,
      content,
    });

    await message.save();

    // Peupler les infos sender et recipient
    await message.populate('sender', '-password');
    await message.populate('recipient', '-password');

    res.status(201).json({
      message: 'Message créé',
      data: message,
    });
  } catch (error) {
    console.error('Erreur createMessage:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour récupérer les messages avec un utilisateur
 * @route GET /api/messages/:user_id
 */
exports.getMessagesWith = async (req, res) => {
  try {
    const { user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Récupérer les messages entre les deux utilisateurs
    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: user_id },
        { sender: user_id, recipient: req.userId },
      ],
    })
      .populate('sender', '-password')
      .populate('recipient', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      $or: [
        { sender: req.userId, recipient: user_id },
        { sender: user_id, recipient: req.userId },
      ],
    });

    // Marquer les messages reçus comme lus
    await Message.updateMany(
      {
        sender: user_id,
        recipient: req.userId,
        status: { $ne: 'read' },
      },
      { status: 'read' }
    );

    res.status(200).json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur getMessagesWith:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour récupérer toutes les conversations
 * @route GET /api/conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    // Agrégation pour obtenir les conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { recipient: new mongoose.Types.ObjectId(userId) }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', new mongoose.Types.ObjectId(userId)] }, '$recipient', '$sender'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$recipient', new mongoose.Types.ObjectId(userId)] }, { $ne: ['$status', 'read'] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);

    // Peupler les informations utilisateur
    await Message.populate(conversations, {
      path: '_id',
      select: '-password',
    });

    await Message.populate(conversations, {
      path: 'lastMessage.sender lastMessage.recipient',
      select: '-password',
    });

    res.status(200).json({
      conversations,
    });
  } catch (error) {
    console.error('Erreur getConversations:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour éditer un message
 * @route PUT /api/messages/:id
 */
exports.updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Contenu requis',
      });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message non trouvé',
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({
        error: 'Non autorisé',
      });
    }

    message.content = content;
    message.edited = true;
    await message.save();

    await message.populate('sender recipient', '-password');

    res.status(200).json({
      message: 'Message mis à jour',
      data: message,
    });
  } catch (error) {
    console.error('Erreur updateMessage:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour supprimer un message (soft delete)
 * @route DELETE /api/messages/:id
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message non trouvé',
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({
        error: 'Non autorisé',
      });
    }

    message.deleted = true;
    message.content = '[Message supprimé]';
    await message.save();

    res.status(200).json({
      message: 'Message supprimé',
    });
  } catch (error) {
    console.error('Erreur deleteMessage:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};

/**
 * Controller pour marquer un message comme lu
 * @route POST /api/messages/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message non trouvé',
      });
    }

    // Vérifier que l'utilisateur est le destinataire
    if (message.recipient.toString() !== req.userId.toString()) {
      return res.status(403).json({
        error: 'Non autorisé',
      });
    }

    message.status = 'read';
    await message.save();

    res.status(200).json({
      message: 'Message marqué comme lu',
      data: message,
    });
  } catch (error) {
    console.error('Erreur markAsRead:', error);
    res.status(500).json({
      error: 'Erreur serveur',
    });
  }
};
