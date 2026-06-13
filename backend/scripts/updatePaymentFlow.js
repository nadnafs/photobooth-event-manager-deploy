require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Adding BELUM to payment_method enum...');
    try {
      await client.query("ALTER TYPE payment_method ADD VALUE 'BELUM'");
      console.log('Value BELUM added to payment_method.');
    } catch (e) {
      if (e.code === '42710') {
        console.log('Value BELUM already exists in payment_method. Skipping.');
      } else {
        throw e;
      }
    }

    console.log('Setting default payment_method to BELUM...');
    await client.query("ALTER TABLE transactions ALTER COLUMN payment_method SET DEFAULT 'BELUM'");
    
    // We also drop the NOT NULL constraint temporarily just in case there's an issue, but let's just keep it NOT NULL since it has a default now.
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
