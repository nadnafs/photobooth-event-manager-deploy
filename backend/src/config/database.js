const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

let supabase = null;
if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
  }
}

module.exports = {
  pool,
  supabase,
};
