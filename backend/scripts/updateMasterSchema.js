require('dotenv').config();
const pool = require('../src/config/db');

async function updateSchema() {
  try {
    await pool.query(`
      ALTER TABLE product_categories 
      ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;
    `);
    console.log('Schema updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
updateSchema();
