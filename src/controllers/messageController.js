import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';

export const createMessage = async (req, res) => {
  try {
    const { recipient_id, content } = req.body;

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

    const recipient = await User.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({
        error: 'Destinataire non trouvé',
      });
    }

    const message = new Message({
      sender: req.userId,
      recipient: recipient_id,
      content,
    });

    await message.save();

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

export const getMessagesWith = async (req, res) => {
  try {
    const { user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

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
        { sender: req.userId, recipient: user_id, deleted: false },
        { sender: user_id, recipient: req.userId, deleted: false },
      ],
    });

    const now = new Date();
    await Message.updateMany(
      {
        sender: user_id,
        recipient: req.userId,
        readAt: null,
      },
      [
        {
          $set: {
            receivedAt: { $ifNull: ['$receivedAt', now] },
            readAt: now,
          },
        },
      ]
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

export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

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
                  $and: [{ $eq: ['$recipient', new mongoose.Types.ObjectId(userId)] }, { $eq: ['$readAt', null] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          _id: {
            _id: '$userDetails._id',
            username: '$userDetails.username',
            email: '$userDetails.email',
            avatar: '$userDetails.avatar',
            status: '$userDetails.status',
            lastConnection: '$userDetails.lastConnection',
          },
          lastMessage: 1,
          unreadCount: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);

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
export const updateMessage = async (req, res) => {
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

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message non trouvé',
      });
    }

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

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        error: 'Message non trouvé',
      });
    }

    if (message.recipient.toString() !== req.userId.toString()) {
      return res.status(403).json({
        error: 'Non autorisé',
      });
    }

    message.receivedAt = message.receivedAt || new Date();
    message.readAt = new Date();
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
