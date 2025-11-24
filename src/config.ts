import dotenv from 'dotenv';
const envPath = process.env.ENV_PATH;

if (envPath) {
  dotenv.config({ path: process.env.ENV_PATH || '.env' });
}
dotenv.config({ path: '.env' });

export const ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;
export const DB_URI = process.env.MONGODB_URI;
export const JWT_SECRET = process.env.JWT_SECRET;
