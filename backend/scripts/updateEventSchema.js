require('dotenv').config();
const pool = require('../src/config/db');

async function updateSchema() {
  try {
    await pool.query(`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'NONAKTIF';
    `);
    
    await pool.query(`
      UPDATE events SET status = 'AKTIF' WHERE is_active = true AND status = 'NONAKTIF';
    `);
    console.log('Events schema updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
updateSchema();
