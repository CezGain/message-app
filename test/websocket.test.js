const { expect } = require('chai');
const io = require('socket.io-client');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { app } = require('../src/app');
const socketHandler = require('../src/socket/handlers');
const request = require('supertest');
const User = require('../src/models/User');
const Message = require('../src/models/Message');

describe('Tests WebSocket', () => {
  let httpServer, ioServer, clientSocket1, clientSocket2, token1, token2, user1, user2;
  const PORT = 4000;

  before(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/message-app-test');

    // Créer le serveur HTTP et Socket.io
    httpServer = http.createServer(app);
    ioServer = new Server(httpServer);
    socketHandler(ioServer);

    await new Promise((resolve) => {
      httpServer.listen(PORT, resolve);
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    if (clientSocket1) clientSocket1.close();
    if (clientSocket2) clientSocket2.close();
    ioServer.close();
    httpServer.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Message.deleteMany({});

    // Créer deux utilisateurs
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'user1@example.com',
      username: 'user1',
      password: 'password123',
    });
    token1 = res1.body.token;
    user1 = res1.body.user;

    const res2 = await request(app).post('/api/auth/register').send({
      email: 'user2@example.com',
      username: 'user2',
      password: 'password123',
    });
    token2 = res2.body.token;
    user2 = res2.body.user;
  });

  afterEach(() => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.close();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.close();
  });

  describe('Connexion WebSocket', () => {
    it('devrait se connecter avec un token valide', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).to.be.true;
        done();
      });
    });

    it('devrait rejeter sans token', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`);

      clientSocket1.on('connect_error', (error) => {
        expect(error.message).to.include('Token manquant');
        done();
      });
    });

    it('devrait rejeter avec token invalide', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: 'invalid_token' },
      });

      clientSocket1.on('connect_error', (error) => {
        expect(error.message).to.exist;
        done();
      });
    });

    it('devrait mettre à jour le statut online', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', async () => {
        const user = await User.findById(user1._id);
        expect(user.status).to.equal('online');
        expect(user.socketId).to.exist;
        done();
      });
    });
  });

  describe('Envoi de messages', () => {
    beforeEach((done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket2 = io(`http://localhost:${PORT}`, {
        auth: { token: token2 },
      });

      let connected = 0;
      const checkConnected = () => {
        connected++;
        if (connected === 2) done();
      };

      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
    });

    it('devrait envoyer un message en temps réel', (done) => {
      clientSocket2.on('new-message', (message) => {
        expect(message).to.have.property('content');
        expect(message.content).to.equal('Hello User2!');
        expect(message.sender._id).to.equal(user1._id);
        done();
      });

      clientSocket1.emit('send-message', {
        recipient_id: user2._id,
        content: 'Hello User2!',
      });
    });

    it("devrait confirmer l'envoi à l'expéditeur", (done) => {
      clientSocket1.on('message-sent', (data) => {
        expect(data.success).to.be.true;
        expect(data.message).to.have.property('content');
        done();
      });

      clientSocket1.emit('send-message', {
        recipient_id: user2._id,
        content: 'Test message',
      });
    });

    it('devrait sauvegarder le message en base de données', (done) => {
      clientSocket1.on('message-sent', async () => {
        const messages = await Message.find({ sender: user1._id });
        expect(messages.length).to.equal(1);
        expect(messages[0].content).to.equal('DB test');
        done();
      });

      clientSocket1.emit('send-message', {
        recipient_id: user2._id,
        content: 'DB test',
      });
    });

    it('devrait rejeter un message sans destinataire', (done) => {
      clientSocket1.on('error', (error) => {
        expect(error.message).to.include('requis');
        done();
      });

      clientSocket1.emit('send-message', {
        content: 'No recipient',
      });
    });
  });

  describe('Statut de lecture', () => {
    let messageId;

    beforeEach((done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket2 = io(`http://localhost:${PORT}`, {
        auth: { token: token2 },
      });

      let connected = 0;
      const checkConnected = () => {
        connected++;
        if (connected === 2) {
          // Envoyer un message
          clientSocket1.on('message-sent', (data) => {
            messageId = data.message._id;
            done();
          });

          clientSocket1.emit('send-message', {
            recipient_id: user2._id,
            content: 'Test read status',
          });
        }
      };

      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
    });

    it("devrait notifier l'expéditeur du statut lu", (done) => {
      clientSocket1.on('message-read-confirmation', (data) => {
        expect(data.message_id).to.equal(messageId);
        expect(data.read_by).to.equal(user2._id);
        done();
      });

      clientSocket2.emit('message-read', { message_id: messageId });
    });
  });

  describe('Indicateur de frappe', () => {
    beforeEach((done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket2 = io(`http://localhost:${PORT}`, {
        auth: { token: token2 },
      });

      let connected = 0;
      const checkConnected = () => {
        connected++;
        if (connected === 2) done();
      };

      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
    });

    it('devrait notifier quand un utilisateur tape', (done) => {
      clientSocket2.on('user-typing', (data) => {
        expect(data.userId).to.equal(user1._id);
        expect(data.username).to.equal('user1');
        expect(data.isTyping).to.be.true;
        done();
      });

      clientSocket1.emit('typing', {
        recipient_id: user2._id,
        isTyping: true,
      });
    });
  });

  describe('Statut de présence', () => {
    it('devrait notifier quand un utilisateur se connecte', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('user-status', (data) => {
        if (data.userId === user1._id) {
          expect(data.status).to.equal('online');
          expect(data.username).to.equal('user1');
          done();
        }
      });
    });

    it('devrait notifier quand un utilisateur se déconnecte', (done) => {
      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket2 = io(`http://localhost:${PORT}`, {
        auth: { token: token2 },
      });

      clientSocket2.on('user-status', (data) => {
        if (data.status === 'offline' && data.userId === user1._id) {
          expect(data.username).to.equal('user1');
          done();
        }
      });

      clientSocket1.on('connect', () => {
        setTimeout(() => clientSocket1.close(), 100);
      });
    });
  });
});
