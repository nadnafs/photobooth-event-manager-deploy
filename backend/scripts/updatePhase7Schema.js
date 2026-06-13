require('dotenv').config();
const pool = require('../src/config/db');

async function updateSchema() {
  try {
    await pool.query(`
      ALTER TABLE transaction_items 
      ADD COLUMN IF NOT EXISTS product_name_snapshot VARCHAR(255),
      ADD COLUMN IF NOT EXISTS product_category_name_snapshot VARCHAR(100)
    `);

    console.log('Phase 7 schema updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
updateSchema();
