// config.js
const dotenv = require('dotenv');
const envPath = process.env.ENV_PATH;

if (envPath) {
  dotenv.config({ path: process.env.ENV_PATH || '.env' });
}
dotenv.config({ path: '.env' });

module.exports = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
};
