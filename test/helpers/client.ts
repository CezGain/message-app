import request from 'supertest';
import User from '../../src/models/User.js';
import { generateToken } from '../../src/middleware/auth.js';
import { app } from '../../src/app.js';

export async function createLoggedClient(email?: string) {
  if (email) {
    const userWithEmail = await User.findOne({ email });

    if (userWithEmail) {
      const token = generateToken(userWithEmail.id);
      return wrapMethod(token) as any;
    }
  }

  const userWithoutEmail = new User({
    email: email || 'fallback@example.com',
    username: 'fallbackUser',
    password: 'fallbackPassword123',
    avatar: null,
  });

  await userWithoutEmail.save();

  const token = generateToken(userWithoutEmail.id);

  return wrapMethod(token) as any;
}

function wrapMethod(token: string) {
  const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
  const client: Record<(typeof methods)[number], (url: string) => any> = {} as any;

  methods.forEach((method) => {
    client[method] = (url: string) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  });

  return client;
}
