import mongoose from 'mongoose';
import Message from '../../src/models/Message.js';

async function createUser(message: MessageData) {
  return await Message.create({
    _id: message.id ? new mongoose.Types.ObjectId(message.id) : new mongoose.Types.ObjectId(),
    sender: new mongoose.Types.ObjectId(message.sender),
    recipient: new mongoose.Types.ObjectId(message.recipient),
    content: message.content,
    receivedAt: message.receivedAt || new Date(),
    readAt: message.readAt || null,
    edited: message.edited || false,
    deleted: message.deleted || false,
  });
}

type MessageData = {
  id?: string;
  sender: string;
  recipient: string;
  content: string;
  receivedAt?: Date;
  readAt?: Date;
  edited?: boolean;
  deleted?: boolean;
};

const messages: MessageData[] = [
  {
    id: '650d9c2e5f1b2a00123abcd3',
    sender: '650d9c2e5f1b2a00123abcd1',
    recipient: '650d9c2e5f1b2a00123abcd2',
    content: 'Message 1',
  },
  {
    id: '650d9c2e5f1b2a00123abcd4',
    sender: '650d9c2e5f1b2a00123abcd2',
    recipient: '650d9c2e5f1b2a00123abcd1',
    content: 'Message 2',
  },
  {
    id: '650d9c2e5f1b2a00123abcd5',
    sender: '650d9c2e5f1b2a00123abcd1',
    recipient: '650d9c2e5f1b2a00123abcd2',
    content: 'Hello',
  },
  {
    id: '650d9c2e5f1b2a00123abcd6',
    sender: '650d9c2e5f1b2a00123abcd1',
    recipient: '650d9c2e5f1b2a00123abcd2',
    content: 'Original message',
  },
  {
    id: '650d9c2e5f1b2a00123abcd7',
    sender: '650d9c2e5f1b2a00123abcd1',
    recipient: '650d9c2e5f1b2a00123abcd2',
    content: 'To be deleted',
  },
  {
    id: '650d9c2e5f1b2a00123abcd8',
    sender: '650d9c2e5f1b2a00123abcd1',
    recipient: '650d9c2e5f1b2a00123abcd2',
    content: 'Unread message',
  },
];

export async function loadMessages() {
  return await Promise.all(messages.map((user) => createUser(user)));
}
