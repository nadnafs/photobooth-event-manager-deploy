require('dotenv').config();
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  try {
    console.log('Mulai melakukan seeding user...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const kasirPassword = await bcrypt.hash('kasir123', salt);
    const penerimaPassword = await bcrypt.hash('penerima123', salt);

    // Seed Kasir
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
    `, ['kasir', kasirPassword, 'Admin Kasir', 'KASIR']);
    console.log('✅ User Kasir berhasil dibuat/diperbarui.');

    // Seed Penerima
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
    `, ['penerima', penerimaPassword, 'Petugas Penerima', 'PENERIMA']);
    console.log('✅ User Penerima berhasil dibuat/diperbarui.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal melakukan seeding:', error);
    process.exit(1);
  }
}

seedUsers();
