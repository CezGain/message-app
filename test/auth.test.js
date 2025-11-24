const { ENV, PORT, DB_URI, JWT_SECRET } = require('../src/config');
const { expect } = require('chai');
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/app');
const User = require('../src/models/User');

describe("Tests d'Intégration - Authentification", () => {
  before(async () => {
    await mongoose.connect(DB_URI);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('devrait créer un nouvel utilisateur', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('user');
      expect(res.body.user.email).to.equal('test@example.com');
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
      await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser1',
        password: 'password123',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser2',
        password: 'password123',
      });

      expect(res.status).to.equal(409);
      expect(res.body.error).to.include('Email');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });
    });

    it('devrait connecter un utilisateur valide', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('user');
      expect(res.body.user.status).to.equal('online');
    });

    it('devrait rejeter un mot de passe invalide', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
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
    let token;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });
      token = res.body.token;
    });

    it('devrait déconnecter un utilisateur authentifié', async () => {
      const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.message).to.include('Déconnexion réussie');

      const user = await User.findOne({ email: 'test@example.com' });
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
