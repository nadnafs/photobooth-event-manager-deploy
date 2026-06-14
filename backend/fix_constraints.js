const { Pool } = require('pg');
const env = require('./src/config/env');
const pool = new Pool({ connectionString: env.DATABASE_URL });

async function fix() {
  try {
    await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_queue_code_key');
    await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_queue_code_key');
    await pool.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_registration_code_key');
    console.log("Constraints dropped successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
fix();
