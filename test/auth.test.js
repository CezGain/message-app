import { expect } from 'chai';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../src/models/User.js';
import { createLoggedClient } from './helpers/client.ts';

describe("Tests d'Intégration - Authentification", () => {
  const USER_1_EMAIL = 'user+1@example.com';
  const USER_2_EMAIL = 'user+2@example.com';

  describe('POST /api/auth/register', () => {
    it('devrait créer un nouvel utilisateur', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('user');
      expect(res.body.user.email).to.equal('newuser@example.com');
      expect(res.body.user).to.not.have.property('password');
    });

    it('devrait rejeter une inscription sans email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        password: 'password123',
      });

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error');
    });

    it('devrait rejeter un mot de passe trop court', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: '123',
      });

      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('6 caractères');
    });

    it('devrait rejeter un email déjà utilisé', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: USER_1_EMAIL,
        username: 'testuser2',
        password: 'password123',
      });

      expect(res.status).to.equal(409);
      expect(res.body.error).to.include('Email');
    });
  });

  describe('POST /api/auth/login', () => {
    it('devrait connecter un utilisateur valide', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: USER_1_EMAIL,
        password: 'password1',
      });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('user');
      expect(res.body.user.status).to.equal('online');
    });

    it('devrait rejeter un mot de passe invalide', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: USER_1_EMAIL,
        password: 'wrongpassword',
      });

      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('Identifiants invalides');
    });

    it('devrait rejeter un email inexistant', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('Identifiants invalides');
    });

    it('devrait rejeter sans email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'password123',
      });

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('devrait déconnecter un utilisateur authentifié', async () => {
      const client = await createLoggedClient(USER_1_EMAIL);
      const res = await client.post('/api/auth/logout');

      expect(res.status).to.equal(200);
      expect(res.body.message).to.include('Déconnexion réussie');

      const user = await User.findOne({ email: USER_1_EMAIL });
      expect(user.status).to.equal('offline');
    });

    it('devrait rejeter sans token', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('error');
    });

    it('devrait rejeter avec token invalide', async () => {
      const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer invalid_token');

      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('Token invalide');
    });
  });
});
