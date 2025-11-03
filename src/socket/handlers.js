const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * Gère les connexions WebSocket et les événements en temps réel
 */
const socketHandler = (io) => {
  // Middleware d'authentification WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token manquant'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentification échouée'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`Utilisateur connecté: ${socket.user.username} (${socket.userId})`);

    // Mettre à jour le statut et socketId
    await User.findByIdAndUpdate(socket.userId, {
      status: 'online',
      socketId: socket.id,
      lastConnection: new Date(),
    });

    // Notifier tous les utilisateurs qu'un user est online
    io.emit('user-status', {
      userId: socket.userId,
      status: 'online',
      username: socket.user.username,
    });

    /**
     * Événement: Envoi d'un message
     */
    socket.on('send-message', async (data) => {
      try {
        const { recipient_id, content } = data;

        if (!recipient_id || !content) {
          socket.emit('error', { message: 'Destinataire et contenu requis' });
          return;
        }

        // Créer le message en base de données
        const message = new Message({
          sender: socket.userId,
          recipient: recipient_id,
          content,
        });

        await message.save();
        await message.populate('sender recipient', '-password');

        // Envoyer au destinataire s'il est connecté
        const recipient = await User.findById(recipient_id);
        if (recipient && recipient.socketId) {
          io.to(recipient.socketId).emit('new-message', message);
        }

        // Confirmation à l'expéditeur
        socket.emit('message-sent', {
          success: true,
          message,
        });
      } catch (error) {
        console.error('Erreur send-message:', error);
        socket.emit('error', { message: "Erreur lors de l'envoi" });
      }
    });

    /**
     * Événement: Message lu
     */
    socket.on('message-read', async (data) => {
      try {
        const { message_id } = data;

        const message = await Message.findByIdAndUpdate(message_id, { status: 'read' }, { new: true }).populate(
          'sender recipient',
          '-password'
        );

        if (!message) {
          socket.emit('error', { message: 'Message non trouvé' });
          return;
        }

        // Notifier l'expéditeur
        const sender = await User.findById(message.sender._id);
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message-read-confirmation', {
            message_id,
            read_by: socket.userId,
          });
        }
      } catch (error) {
        console.error('Erreur message-read:', error);
        socket.emit('error', { message: 'Erreur lors du marquage' });
      }
    });

    /**
     * Événement: Utilisateur en train de taper
     */
    socket.on('typing', async (data) => {
      try {
        const { recipient_id, isTyping } = data;

        const recipient = await User.findById(recipient_id);
        if (recipient && recipient.socketId) {
          io.to(recipient.socketId).emit('user-typing', {
            userId: socket.userId,
            username: socket.user.username,
            isTyping,
          });
        }
      } catch (error) {
        console.error('Erreur typing:', error);
      }
    });

    /**
     * Événement: Demande de statut utilisateur
     */
    socket.on('get-user-status', async (data) => {
      try {
        const { user_id } = data;

        const user = await User.findById(user_id).select('status lastConnection');

        if (user) {
          socket.emit('user-status-response', {
            userId: user_id,
            status: user.status,
            lastConnection: user.lastConnection,
          });
        }
      } catch (error) {
        console.error('Erreur get-user-status:', error);
      }
    });

    /**
     * Événement: Déconnexion
     */
    socket.on('disconnect', async () => {
      console.log(`Utilisateur déconnecté: ${socket.user.username} (${socket.userId})`);

      // Mettre à jour le statut
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        socketId: null,
        lastConnection: new Date(),
      });

      // Notifier tous les utilisateurs
      io.emit('user-status', {
        userId: socket.userId,
        status: 'offline',
        username: socket.user.username,
      });
    });
  });
};

module.exports = socketHandler;
