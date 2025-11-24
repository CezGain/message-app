import { expect } from 'chai';
import http from 'http';
import { Server } from 'socket.io';
import io from 'socket.io-client';
import request from 'supertest';
import { app } from '../src/app.js';
import Message from '../src/models/Message.js';
import User from '../src/models/User.js';
import socketHandler from '../src/socket/handlers.js';

describe('Tests WebSocket', () => {
  let httpServer, ioServer, clientSocket1, clientSocket2, token1, token2, user1, user2;
  const PORT = 4000;

  before(async function () {
    httpServer = http.createServer(app);
    ioServer = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    socketHandler(ioServer);

    await new Promise((resolve) => {
      httpServer.listen(PORT, resolve);
    });
  });

  after(async function () {
    this.timeout(10000);

    if (clientSocket1 && clientSocket1.connected) clientSocket1.close();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.close();

    if (ioServer) {
      await new Promise((resolve) => ioServer.close(resolve));
    }

    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  beforeEach(async function () {
    this.timeout(10000);

    await User.deleteMany({});
    await Message.deleteMany({});

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

  afterEach(function (done) {
    this.timeout(5000);

    if (clientSocket1 && clientSocket1.connected) {
      clientSocket1.disconnect();
      clientSocket1 = null;
    }
    if (clientSocket2 && clientSocket2.connected) {
      clientSocket2.disconnect();
      clientSocket2 = null;
    }

    setTimeout(done, 100);
  });

  describe('Connexion WebSocket', () => {
    it('devrait se connecter avec un token valide', function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).to.be.true;
        done();
      });

      clientSocket1.on('connect_error', (err) => {
        done(err);
      });
    });

    it('devrait rejeter sans token', function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        reconnection: false,
      });

      clientSocket1.on('connect_error', (error) => {
        expect(error.message).to.include('Token manquant');
        done();
      });
    });

    it('devrait rejeter avec token invalide', function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: 'invalid_token' },
        reconnection: false,
      });

      clientSocket1.on('connect_error', (error) => {
        expect(error.message).to.exist;
        done();
      });
    });

    it('devrait mettre à jour le statut online', function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('connect', async () => {
        try {
          const user = await User.findById(user1._id);
          expect(user.status).to.equal('online');
          expect(user.socketId).to.exist;
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket1.on('connect_error', (err) => {
        done(err);
      });
    });
  });

  describe('Envoi de messages', () => {
    beforeEach(function (done) {
      this.timeout(5000);

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
          setTimeout(done, 100);
        }
      };

      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);

      clientSocket1.on('connect_error', done);
      clientSocket2.on('connect_error', done);
    });

    it('devrait envoyer un message en temps réel', function (done) {
      this.timeout(5000);

      clientSocket2.on('new-message', (message) => {
        try {
          expect(message).to.have.property('content');
          expect(message.content).to.equal('Hello User2!');
          expect(message.sender._id).to.equal(user1._id);
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket1.emit('send-message', {
        recipient_id: user2._id,
        content: 'Hello User2!',
      });
    });

    it("devrait confirmer l'envoi à l'expéditeur", function (done) {
      this.timeout(5000);

      clientSocket1.on('message-sent', (data) => {
        try {
          expect(data.success).to.be.true;
          expect(data.message).to.have.property('content');
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket1.emit('send-message', {
        recipient_id: user2._id,
        content: 'Test message',
      });
    });

    it('devrait sauvegarder le message en base de données', function (done) {
      this.timeout(5000);

      clientSocket1.on('message-sent', async () => {
        try {
          const messages = await Message.find({ sender: user1._id });
          expect(messages.length).to.equal(1);
          expect(messages[0].content).to.equal('DB test');
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket1.emit('send-message', {
        recipient_id: user2._id,
        content: 'DB test',
      });
    });

    it('devrait rejeter un message sans destinataire', function (done) {
      this.timeout(5000);

      clientSocket1.on('error', (error) => {
        try {
          expect(error.message).to.include('requis');
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket1.emit('send-message', {
        content: 'No recipient',
      });
    });
  });

  describe('Statut de lecture', () => {
    let messageId;

    beforeEach(function (done) {
      this.timeout(5000);

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
          setTimeout(() => {
            clientSocket1.on('message-sent', (data) => {
              try {
                messageId = data.message._id;
                setTimeout(done, 100);
              } catch (err) {
                done(err);
              }
            });

            clientSocket1.emit('send-message', {
              recipient_id: user2._id,
              content: 'Test read status',
            });
          }, 100);
        }
      };

      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
      clientSocket1.on('connect_error', done);
      clientSocket2.on('connect_error', done);
    });

    it("devrait notifier l'expéditeur du statut lu", function (done) {
      this.timeout(5000);

      clientSocket1.on('message-read-confirmation', (data) => {
        try {
          expect(data.message_id).to.equal(messageId);
          expect(data.read_by).to.equal(user2._id);
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket2.emit('message-read', { message_id: messageId });
    });
  });

  describe('Indicateur de frappe', () => {
    beforeEach(function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket2 = io(`http://localhost:${PORT}`, {
        auth: { token: token2 },
      });

      let connected = 0;
      const checkConnected = () => {
        connected++;
        if (connected === 2) setTimeout(done, 100);
      };

      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
    });

    it('devrait notifier quand un utilisateur tape', function (done) {
      this.timeout(5000);

      clientSocket2.on('user-typing', (data) => {
        try {
          expect(data.userId).to.equal(user1._id);
          expect(data.username).to.equal('user1');
          expect(data.isTyping).to.be.true;
          done();
        } catch (err) {
          done(err);
        }
      });

      clientSocket1.emit('typing', {
        recipient_id: user2._id,
        isTyping: true,
      });
    });
  });

  describe('Statut de présence', () => {
    it('devrait notifier quand un utilisateur se connecte', function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket1.on('user-status', (data) => {
        if (data.userId === user1._id) {
          try {
            expect(data.status).to.equal('online');
            expect(data.username).to.equal('user1');
            done();
          } catch (err) {
            done(err);
          }
        }
      });
    });

    it('devrait notifier quand un utilisateur se déconnecte', function (done) {
      this.timeout(5000);

      clientSocket1 = io(`http://localhost:${PORT}`, {
        auth: { token: token1 },
      });

      clientSocket2 = io(`http://localhost:${PORT}`, {
        auth: { token: token2 },
      });

      clientSocket2.on('user-status', (data) => {
        if (data.status === 'offline' && data.userId === user1._id) {
          try {
            expect(data.username).to.equal('user1');
            done();
          } catch (err) {
            done(err);
          }
        }
      });

      clientSocket1.on('connect', () => {
        setTimeout(() => clientSocket1.disconnect(), 100);
      });
    });
  });
});
