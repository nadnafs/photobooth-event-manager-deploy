require('dotenv').config();

const env = {
  PORT: process.env.PORT || 3000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'secretkey',
};

// Validations
if (!env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not defined in backend environment.');
}

module.exports = env;
