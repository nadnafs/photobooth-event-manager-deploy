require("dotenv").config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT || 3000),

  CLIENT_URL:
    process.env.CLIENT_URL ||
    "http://localhost:5173",

  SUPABASE_URL: process.env.SUPABASE_URL,

  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

  DATABASE_URL: process.env.DATABASE_URL,

  JWT_SECRET: process.env.JWT_SECRET,
};

if (!env.DATABASE_URL) {
  console.warn("Warning: DATABASE_URL belum diatur pada environment backend.");
}

if (!env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET belum diatur pada environment backend.");
  process.exit(1);
}

module.exports = env;