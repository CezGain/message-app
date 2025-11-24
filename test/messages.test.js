import { expect } from 'chai';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app.js';
import Message from '../src/models/Message.js';
import { createLoggedClient } from './helpers/client.ts';

describe("Tests d'Intégration - Messages", () => {
  const USER_1_EMAIL = 'user+1@example.com';
  const USER_2_EMAIL = 'user+2@example.com';
  const USER_1_ID = '650d9c2e5f1b2a00123abcd1';
  const USER_2_ID = '650d9c2e5f1b2a00123abcd2';
  const MESSAGE_TO_EDIT_ID = '650d9c2e5f1b2a00123abcd6';
  const MESSAGE_TO_DELETE_ID = '650d9c2e5f1b2a00123abcd7';
  const MESSAGE_UNREAD_ID = '650d9c2e5f1b2a00123abcd8';

  describe('POST /api/messages', () => {
    it('devrait créer un nouveau message', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.post('/api/messages').send({
        recipient_id: USER_2_ID,
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
        recipient_id: USER_2_ID,
        content: 'Hello',
      });

      expect(res.status).to.equal(401);
    });

    it('devrait rejeter sans destinataire', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.post('/api/messages').send({
        content: 'Hello User2!',
      });

      expect(res.status).to.equal(400);
    });

    it('devrait rejeter un destinataire inexistant', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.post('/api/messages').send({
        recipient_id: new mongoose.Types.ObjectId(),
        content: 'Hello',
      });

      expect(res.status).to.equal(404);
    });
  });

  describe('GET /api/messages/:user_id', () => {
    it('devrait récupérer les messages avec un utilisateur', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.get(`/api/messages/${USER_2_ID}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('messages');
      expect(res.body.messages).to.be.an('array');
      expect(res.body.messages.length).to.be.at.least(1);
    });

    it('devrait marquer les messages comme lus', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      await client.get(`/api/messages/${USER_2_ID}`);

      const message = await Message.findOne({
        sender: USER_2_ID,
        recipient: USER_1_ID,
      });

      expect(message.readAt).to.not.be.null;
    });

    it('devrait paginer les résultats', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.get(`/api/messages/${USER_2_ID}?page=1&limit=1`);

      expect(res.status).to.equal(200);
      expect(res.body.messages.length).to.be.at.least(1);
      expect(res.body.messages.length).to.be.at.least(1);
    });
  });

  describe('GET /api/messages/conversations', () => {
    it('devrait récupérer toutes les conversations', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.get('/api/messages/conversations');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('conversations');
      expect(res.body.conversations).to.be.an('array');
    });
  });

  describe('PUT /api/messages/:id', () => {
    it('devrait éditer son propre message', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.put(`/api/messages/${MESSAGE_TO_EDIT_ID}`).send({
        content: 'Edited message',
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.content).to.equal('Edited message');
      expect(res.body.data.edited).to.be.true;
    });

    it("devrait rejeter l'édition d'un message non-propriétaire", async () => {
      const client = await createLoggedClient(USER_2_EMAIL);
      const res = await client.put(`/api/messages/${MESSAGE_TO_EDIT_ID}`).send({
        content: 'Hacked message',
      });

      expect(res.status).to.equal(403);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('devrait supprimer son propre message', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.delete(`/api/messages/${MESSAGE_TO_DELETE_ID}`);

      expect(res.status).to.equal(200);

      const message = await Message.findById(MESSAGE_TO_DELETE_ID);
      expect(message.deleted).to.be.true;
    });

    it("devrait rejeter la suppression d'un message non-propriétaire", async () => {
      const client = await createLoggedClient(USER_2_EMAIL);
      const res = await client.delete(`/api/messages/${MESSAGE_TO_DELETE_ID}`);

      expect(res.status).to.equal(403);
    });
  });

  describe('POST /api/messages/:id/read', () => {
    it('devrait marquer un message comme lu', async () => {
      const client = await createLoggedClient(USER_2_EMAIL);
      const res = await client.post(`/api/messages/${MESSAGE_UNREAD_ID}/read`);

      expect(res.status).to.equal(200);
      expect(res.body.data.readAt).to.not.be.null;
    });

    it('devrait rejeter si non-destinataire', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.post(`/api/messages/${MESSAGE_UNREAD_ID}/read`);

      expect(res.status).to.equal(403);
    });
  });
});
