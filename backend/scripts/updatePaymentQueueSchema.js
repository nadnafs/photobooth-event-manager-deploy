require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration for Payment Queue...');

    // 1. Add MENUNGGU_PEMBAYARAN to payment_status enum
    try {
      await client.query("ALTER TYPE payment_status ADD VALUE 'MENUNGGU_PEMBAYARAN'");
      console.log("Value MENUNGGU_PEMBAYARAN added to payment_status enum.");
    } catch (e) {
      if (e.code === '42710') {
        console.log("Value MENUNGGU_PEMBAYARAN already exists in payment_status.");
      } else {
        throw e;
      }
    }

    // 2. Add DIBATALKAN to payment_status enum
    try {
      await client.query("ALTER TYPE payment_status ADD VALUE 'DIBATALKAN'");
      console.log("Value DIBATALKAN added to payment_status enum.");
    } catch (e) {
      if (e.code === '42710') {
        console.log("Value DIBATALKAN already exists in payment_status.");
      } else {
        throw e;
      }
    }

    // 3. Create payment_queue_status enum if not exists
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_queue_status') THEN
            CREATE TYPE payment_queue_status AS ENUM ('MENUNGGU', 'DIPANGGIL', 'TERLEWAT', 'SELESAI');
          END IF;
        END
        $$;
      `);
      console.log("Enum payment_queue_status created or checked.");
    } catch (e) {
      console.error("Failed to create enum payment_queue_status:", e);
      throw e;
    }

    // 4. Add new columns to transactions table
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS registration_code VARCHAR(100),
      ADD COLUMN IF NOT EXISTS payment_queue_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_queue_status payment_queue_status DEFAULT 'MENUNGGU';
    `);
    console.log("Added registration_code, payment_queue_code, payment_queue_status columns to transactions.");

    // 5. Change default of payment_status in transactions to 'MENUNGGU_PEMBAYARAN'
    await client.query(`
      ALTER TABLE transactions 
      ALTER COLUMN payment_status SET DEFAULT 'MENUNGGU_PEMBAYARAN'::payment_status;
    `);
    console.log("Altered default payment_status to 'MENUNGGU_PEMBAYARAN'.");

    // 6. Migrate existing transaction records
    // Convert 'MENUNGGU' to 'MENUNGGU_PEMBAYARAN'
    await client.query(`
      UPDATE transactions 
      SET payment_status = 'MENUNGGU_PEMBAYARAN' 
      WHERE payment_status = 'MENUNGGU'::payment_status;
    `);

    // Convert 'BATAL' to 'DIBATALKAN'
    await client.query(`
      UPDATE transactions 
      SET payment_status = 'DIBATALKAN' 
      WHERE payment_status = 'BATAL'::payment_status;
    `);

    // Convert 'LUNAS' payment queue status to 'SELESAI'
    await client.query(`
      UPDATE transactions 
      SET payment_queue_status = 'SELESAI'::payment_queue_status 
      WHERE payment_status = 'LUNAS'::payment_status;
    `);

    // Populate registration_code and payment_queue_code for historical records
    await client.query(`
      UPDATE transactions 
      SET registration_code = 'REG-' || LPAD(COALESCE(receipt_number, id::text), 5, '0') 
      WHERE registration_code IS NULL;
    `);
    
    await client.query(`
      UPDATE transactions 
      SET payment_queue_code = COALESCE(queue_code, receipt_number) 
      WHERE payment_queue_code IS NULL;
    `);

    console.log("Migrated existing transaction statuses and codes.");

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
