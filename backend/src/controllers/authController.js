const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const login = async (req, res) => {
  const { username, password } = req.body; 
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password harus diisi.' });
  }

  try {
    // Kita menggunakan kolom 'email' di schema sebagai tempat menyimpan username
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    // Generate JWT
    const payload = {
      id: user.id,
      username: user.email,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '12h' });

    res.json({
      message: 'Login berhasil',
      token,
      user: payload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email as username, name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

module.exports = { login, getMe };
