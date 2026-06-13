require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Adding MENUNGGU_FOTO to queue_status enum...');
    try {
      await client.query("ALTER TYPE queue_status ADD VALUE 'MENUNGGU_FOTO'");
      console.log('Value MENUNGGU_FOTO added to queue_status.');
    } catch (e) {
      if (e.code === '42710') {
        console.log('Value MENUNGGU_FOTO already exists in queue_status. Skipping.');
      } else {
        throw e;
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
