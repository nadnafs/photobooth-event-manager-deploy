const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { pool } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const masterDataRoutes = require('./routes/masterDataRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const queueRoutes = require('./routes/queueRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// CORS Configuration
app.use(cors({
  origin: env.CLIENT_URL,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', masterDataRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Backend is running correctly.' });
});

// Database connection test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ 
      status: 'success', 
      message: 'Database connection successful!', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed.', 
      error: error.message 
    });
  }
});

module.exports = app;
