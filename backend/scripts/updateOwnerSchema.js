require('dotenv').config();
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function updateSchema() {
  try {
    // 1. Add 'OWNER' to user_role enum
    await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OWNER';`);

    // 2. Add amount_received and change_amount to transactions
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS amount_received DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2);
    `);

    // 3. Seed Owner Account if not exists
    const checkOwner = await pool.query(`SELECT * FROM users WHERE email = 'owner'`);
    if (checkOwner.rows.length === 0) {
      const hash = await bcrypt.hash('owner123', 10);
      await pool.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ('owner', $1, 'Admin Owner', 'OWNER')
      `, [hash]);
      console.log('Owner account created (owner / owner123).');
    }

    console.log('Schema updated successfully for OWNER role.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
}

updateSchema();
