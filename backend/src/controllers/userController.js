const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE role IN ($1, $2) ORDER BY created_at DESC', ['KASIR', 'PENERIMA']);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
};

exports.createUser = async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }
  
  if (!['KASIR', 'PENERIMA'].includes(role)) {
    return res.status(400).json({ message: 'Role tidak valid' });
  }

  try {
    const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) return res.status(400).json({ message: 'Email/Username sudah digunakan' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role) 
      VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at
    `, [email, hash, name, role]);

    res.status(201).json({ message: 'User berhasil ditambahkan', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambah user' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, password, name, role } = req.body;

  try {
    const check = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

    let query = 'UPDATE users SET email = $1, name = $2, role = $3';
    let params = [email, name, role];
    
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query += ', password_hash = $4 WHERE id = $5 RETURNING id, email, name, role';
      params.push(hash, id);
    } else {
      query += ' WHERE id = $4 RETURNING id, email, name, role';
      params.push(id);
    }

    const result = await pool.query(query, params);
    res.json({ message: 'User berhasil diupdate', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengupdate user' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus user' });
  }
};
