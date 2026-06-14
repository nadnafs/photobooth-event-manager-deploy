const { Pool } = require('pg');
const env = require('./src/config/env');
const pool = new Pool({ connectionString: env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'transactions'::regclass
  `);
  console.log(res.rows);
  pool.end();
}
check().catch(console.error);
