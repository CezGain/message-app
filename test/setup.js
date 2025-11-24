import 'mocha';
import mongoose from 'mongoose';
import { connectDB } from '../src/app.js';
import { loadMessages } from './helpers/message.ts';
import { loadUsers } from './helpers/user.ts';

before(async () => {
  await connectDB();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await loadUsers();
  await loadMessages();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((col) => col.deleteMany({})));
});
