require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration for Phase 8: print settings & cancellation columns...');
    
    // Add print_settings to events table
    console.log('Adding print_settings column to events...');
    await client.query(`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS print_settings JSONB DEFAULT NULL;
    `);

    // Add cancellation columns to transactions table
    console.log('Adding cancellation and deletion columns to transactions...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    console.log('Migration for Phase 8 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
