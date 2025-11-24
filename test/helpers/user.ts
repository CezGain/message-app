import mongoose from 'mongoose';
import User from '../../src/models/User.js';

async function createUser(user: UserData) {
  return await User.create({
    _id: user.id ? new mongoose.Types.ObjectId(user.id) : new mongoose.Types.ObjectId(),
    email: user.email,
    username: user.username,
    password: user.password,
    avatar: user.avatar || null,
  });
}

type UserData = {
  id?: string;
  email: string;
  username: string;
  password: string;
  avatar?: string;
};

const users: UserData[] = [
  { id: '650d9c2e5f1b2a00123abcd1', email: 'user+1@example.com', username: 'user1', password: 'password1' },
  { id: '650d9c2e5f1b2a00123abcd2', email: 'user+2@example.com', username: 'user2', password: 'password2' },
];

export async function loadUsers() {
  return await Promise.all(users.map((user) => createUser(user)));
}
