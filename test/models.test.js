import { expect } from 'chai';
import Message from '../src/models/Message.js';
import User from '../src/models/User.js';

describe('Tests Unitaires - Modèles', () => {
  describe('Modèle User', () => {
    it('devrait créer un utilisateur valide', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).to.exist;
      expect(savedUser.email).to.equal(userData.email);
      expect(savedUser.username).to.equal(userData.username);
      expect(savedUser.password).to.not.equal(userData.password); // Vérifie le hashage
      expect(savedUser.status).to.equal('offline');
    });

    it('devrait rejeter un email invalide', async () => {
      const user = new User({
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
      });

      try {
        await user.save();
        throw new Error('Devrait échouer');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('devrait rejeter un username trop court', async () => {
      const user = new User({
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
      });

      try {
        await user.save();
        throw new Error('Devrait échouer');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('devrait hasher le mot de passe avant sauvegarde', async () => {
      const password = 'password123';
      const user = new User({
        email: 'test@example.com',
        username: 'testuser',
        password,
      });

      await user.save();
      expect(user.password).to.not.equal(password);
      expect(user.password.length).to.be.greaterThan(password.length);
    });

    it('devrait comparer correctement les mots de passe', async () => {
      const password = 'password123';
      const user = new User({
        email: 'test@example.com',
        username: 'testuser',
        password,
      });

      await user.save();

      const isValid = await user.comparePassword(password);
      const isInvalid = await user.comparePassword('wrongpassword');

      expect(isValid).to.be.true;
      expect(isInvalid).to.be.false;
    });

    it('devrait retourner un profil public sans mot de passe', async () => {
      const user = new User({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });

      await user.save();
      const publicProfile = user.toPublicJSON();

      expect(publicProfile).to.have.property('_id');
      expect(publicProfile).to.have.property('email');
      expect(publicProfile).to.have.property('username');
      expect(publicProfile).to.not.have.property('password');
    });

    it('devrait rejeter un email en double', async () => {
      const user1 = new User({
        email: 'test@example.com',
        username: 'testuser1',
        password: 'password123',
      });

      await user1.save();

      const user2 = new User({
        email: 'test@example.com',
        username: 'testuser2',
        password: 'password123',
      });

      try {
        await user2.save();
        throw new Error('Devrait échouer');
      } catch (error) {
        expect(error.code).to.equal(11000); // Code d'erreur MongoDB pour duplicate
      }
    });
  });

  describe('Modèle Message', () => {
    let sender, recipient;

    beforeEach(async () => {
      sender = await User.create({
        email: 'sender@example.com',
        username: 'sender',
        password: 'password123',
      });

      recipient = await User.create({
        email: 'recipient@example.com',
        username: 'recipient',
        password: 'password123',
      });
    });

    it('devrait créer un message valide', async () => {
      const messageData = {
        sender: sender._id,
        recipient: recipient._id,
        content: 'Hello World',
      };

      const message = new Message(messageData);
      const savedMessage = await message.save();

      expect(savedMessage._id).to.exist;
      expect(savedMessage.sender.toString()).to.equal(sender._id.toString());
      expect(savedMessage.recipient.toString()).to.equal(recipient._id.toString());
      expect(savedMessage.content).to.equal('Hello World');
      expect(savedMessage.receivedAt).to.be.null;
      expect(savedMessage.readAt).to.be.null;
      expect(savedMessage.edited).to.be.false;
      expect(savedMessage.deleted).to.be.false;
    });

    it('devrait rejeter un message sans destinataire', async () => {
      const message = new Message({
        sender: sender._id,
        content: 'Hello World',
      });

      try {
        await message.save();
        throw new Error('Devrait échouer');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('devrait rejeter un message sans contenu', async () => {
      const message = new Message({
        sender: sender._id,
        recipient: recipient._id,
      });

      try {
        await message.save();
        throw new Error('Devrait échouer');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('devrait rejeter un message trop long', async () => {
      const longContent = 'a'.repeat(5001);
      const message = new Message({
        sender: sender._id,
        recipient: recipient._id,
        content: longContent,
      });

      try {
        await message.save();
        throw new Error('Devrait échouer');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("devrait masquer le contenu d'un message supprimé", async () => {
      const message = new Message({
        sender: sender._id,
        recipient: recipient._id,
        content: 'Secret message',
      });

      await message.save();
      message.deleted = true;
      await message.save();

      const json = message.toJSON();
      expect(json.content).to.equal('[Message supprimé]');
    });
  });
});
