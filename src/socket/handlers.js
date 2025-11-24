const { ENV, PORT, DB_URI, JWT_SECRET } = require('../config');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token manquant'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
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
    await User.findByIdAndUpdate(socket.userId, {
      status: 'online',
      socketId: socket.id,
      lastConnection: new Date(),
    });

    io.emit('user-status', {
      userId: socket.userId,
      status: 'online',
      username: socket.user.username,
    });

    socket.on('send-message', async (data) => {
      try {
        const { recipient_id, content } = data;

        if (!recipient_id || !content) {
          socket.emit('error', { message: 'Destinataire et contenu requis' });
          return;
        }

        const message = new Message({
          sender: socket.userId,
          recipient: recipient_id,
          content,
        });

        await message.save();
        await message.populate('sender recipient', '-password');

        const recipient = await User.findById(recipient_id);
        if (recipient && recipient.socketId) {
          io.to(recipient.socketId).emit('new-message', message);
        }

        socket.emit('message-sent', {
          success: true,
          message,
        });
      } catch (error) {
        console.error('Erreur send-message:', error);
        socket.emit('error', { message: "Erreur lors de l'envoi" });
      }
    });

    socket.on('message-received', async (data) => {
      try {
        const { message_id } = data;

        const message = await Message.findByIdAndUpdate(message_id, { receivedAt: new Date() }, { new: true }).populate(
          'sender recipient',
          '-password'
        );

        if (!message) {
          socket.emit('error', { message: 'Message non trouvé' });
          return;
        }

        const sender = await User.findById(message.sender._id);
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message-received-confirmation', {
            message_id,
            received_by: socket.userId,
            receivedAt: message.receivedAt,
          });
        }
      } catch (error) {
        console.error('Erreur message-received:', error);
        socket.emit('error', { message: 'Erreur lors du marquage' });
      }
    });

    socket.on('message-read', async (data) => {
      try {
        const { message_id } = data;

        const message = await Message.findById(message_id);

        if (!message) {
          socket.emit('error', { message: 'Message non trouvé' });
          return;
        }

        if (message.recipient.toString() !== socket.userId.toString()) {
          socket.emit('error', { message: 'Non autorisé' });
          return;
        }

        message.receivedAt = message.receivedAt || new Date();
        message.readAt = new Date();
        await message.save();
        await message.populate('sender recipient', '-password');

        const sender = await User.findById(message.sender._id);
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('message-read-confirmation', {
            message_id,
            read_by: socket.userId,
            readAt: message.readAt,
          });
        }
      } catch (error) {
        console.error('Erreur message-read:', error);
        socket.emit('error', { message: 'Erreur lors du marquage' });
      }
    });

    socket.on('edit-message', async (data) => {
      try {
        const { message_id, content } = data;

        if (!content || !content.trim()) {
          socket.emit('error', { message: 'Contenu requis' });
          return;
        }

        const message = await Message.findById(message_id).populate('sender recipient', '-password');

        if (!message) {
          socket.emit('error', { message: 'Message non trouvé' });
          return;
        }

        if (message.sender._id.toString() !== socket.userId.toString()) {
          socket.emit('error', { message: 'Non autorisé' });
          return;
        }

        const messageAge = Date.now() - new Date(message.createdAt).getTime();
        const fifteenMinutes = 15 * 60 * 1000;

        if (messageAge > fifteenMinutes) {
          socket.emit('error', { message: 'Délai de modification dépassé (15 minutes)' });
          return;
        }

        message.content = content.trim();
        message.edited = true;
        await message.save();

        socket.emit('message-edited', {
          success: true,
          message,
        });

        const recipient = await User.findById(message.recipient._id);
        if (recipient && recipient.socketId) {
          io.to(recipient.socketId).emit('message-updated', {
            message,
          });
        }
      } catch (error) {
        console.error('Erreur edit-message:', error);
        socket.emit('error', { message: "Erreur lors de l'édition" });
      }
    });

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

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        socketId: null,
        lastConnection: new Date(),
      });

      io.emit('user-status', {
        userId: socket.userId,
        status: 'offline',
        username: socket.user.username,
      });
    });
  });
};

module.exports = socketHandler;
