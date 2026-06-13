require('dotenv').config();
const pool = require('../src/config/db');

async function updateSchema() {
  try {
    // Add missing columns to transactions
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS picked_up_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS queue_code VARCHAR(50) UNIQUE;
    `);

    // Create Payment Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create Queue Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queue_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create Pickup Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pickup_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Phase 6 schema updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
updateSchema();
