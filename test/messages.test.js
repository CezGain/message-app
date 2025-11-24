const { ENV, PORT, DB_URI, JWT_SECRET } = require('../src/config');
const { expect } = require('chai');
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/app');
const User = require('../src/models/User');
const Message = require('../src/models/Message');

describe("Tests d'Intégration - Messages", () => {
  let token1, token2, user1, user2;

  before(async () => {
    await mongoose.connect(DB_URI);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
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

  describe('POST /api/messages', () => {
    it('devrait créer un nouveau message', async () => {
      const res = await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: user2._id,
        content: 'Hello User2!',
      });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('data');
      expect(res.body.data.content).to.equal('Hello User2!');
      expect(res.body.data.receivedAt).to.be.null;
      expect(res.body.data.readAt).to.be.null;
    });

    it('devrait rejeter sans authentification', async () => {
      const res = await request(app).post('/api/messages').send({
        recipient_id: user2._id,
        content: 'Hello',
      });

      expect(res.status).to.equal(401);
    });

    it('devrait rejeter sans destinataire', async () => {
      const res = await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        content: 'Hello',
      });

      expect(res.status).to.equal(400);
    });

    it('devrait rejeter un destinataire inexistant', async () => {
      const res = await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: '507f1f77bcf86cd799439011',
        content: 'Hello',
      });

      expect(res.status).to.equal(404);
    });
  });

  describe('GET /api/messages/:user_id', () => {
    beforeEach(async () => {
      // Créer quelques messages
      await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: user2._id,
        content: 'Message 1',
      });

      await request(app).post('/api/messages').set('Authorization', `Bearer ${token2}`).send({
        recipient_id: user1._id,
        content: 'Message 2',
      });
    });

    it('devrait récupérer les messages avec un utilisateur', async () => {
      const res = await request(app).get(`/api/messages/${user2._id}`).set('Authorization', `Bearer ${token1}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('messages');
      expect(res.body.messages).to.be.an('array');
      expect(res.body.messages.length).to.equal(2);
    });

    it('devrait marquer les messages comme lus', async () => {
      await request(app).get(`/api/messages/${user2._id}`).set('Authorization', `Bearer ${token1}`);

      const message = await Message.findOne({
        sender: user2._id,
        recipient: user1._id,
      });

      expect(message.readAt).to.not.be.null;
    });

    it('devrait paginer les résultats', async () => {
      const res = await request(app)
        .get(`/api/messages/${user2._id}?page=1&limit=1`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).to.equal(200);
      expect(res.body.messages.length).to.equal(1);
      expect(res.body.pagination.pages).to.equal(2);
    });
  });

  describe('GET /api/messages/conversations', () => {
    beforeEach(async () => {
      await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: user2._id,
        content: 'Hello',
      });
    });

    it('devrait récupérer toutes les conversations', async () => {
      const res = await request(app).get('/api/messages/conversations').set('Authorization', `Bearer ${token1}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('conversations');
      expect(res.body.conversations).to.be.an('array');
    });
  });

  describe('PUT /api/messages/:id', () => {
    let messageId;

    beforeEach(async () => {
      const res = await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: user2._id,
        content: 'Original message',
      });
      messageId = res.body.data._id;
    });

    it('devrait éditer son propre message', async () => {
      const res = await request(app).put(`/api/messages/${messageId}`).set('Authorization', `Bearer ${token1}`).send({
        content: 'Edited message',
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.content).to.equal('Edited message');
      expect(res.body.data.edited).to.be.true;
    });

    it("devrait rejeter l'édition d'un message non-propriétaire", async () => {
      const res = await request(app).put(`/api/messages/${messageId}`).set('Authorization', `Bearer ${token2}`).send({
        content: 'Hacked message',
      });

      expect(res.status).to.equal(403);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    let messageId;

    beforeEach(async () => {
      const res = await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: user2._id,
        content: 'To be deleted',
      });
      messageId = res.body.data._id;
    });

    it('devrait supprimer son propre message', async () => {
      const res = await request(app).delete(`/api/messages/${messageId}`).set('Authorization', `Bearer ${token1}`);

      expect(res.status).to.equal(200);

      const message = await Message.findById(messageId);
      expect(message.deleted).to.be.true;
    });

    it("devrait rejeter la suppression d'un message non-propriétaire", async () => {
      const res = await request(app).delete(`/api/messages/${messageId}`).set('Authorization', `Bearer ${token2}`);

      expect(res.status).to.equal(403);
    });
  });

  describe('POST /api/messages/:id/read', () => {
    let messageId;

    beforeEach(async () => {
      const res = await request(app).post('/api/messages').set('Authorization', `Bearer ${token1}`).send({
        recipient_id: user2._id,
        content: 'Unread message',
      });
      messageId = res.body.data._id;
    });

    it('devrait marquer un message comme lu', async () => {
      const res = await request(app).post(`/api/messages/${messageId}/read`).set('Authorization', `Bearer ${token2}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.readAt).to.not.be.null;
    });

    it('devrait rejeter si non-destinataire', async () => {
      const res = await request(app).post(`/api/messages/${messageId}/read`).set('Authorization', `Bearer ${token1}`);

      expect(res.status).to.equal(403);
    });
  });
});
