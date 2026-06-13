const { pool } = require('../config/database');

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  // status: 'SIAP', 'DIAMBIL'

  try {
    await pool.query('BEGIN');
    
    let query = 'UPDATE transactions SET order_status = $1';
    let params = [status];
    
    if (status === 'DIAMBIL') {
      query += ', picked_up_by = $2, picked_up_at = NOW()';
      params.push(req.user.id);
    }
    
    query += ' WHERE id = $' + (params.length + 1) + ' RETURNING *';
    params.push(id);

    const updateRes = await pool.query(query, params);

    await pool.query(
      'INSERT INTO pickup_logs (transaction_id, status, updated_by) VALUES ($1, $2, $3)',
      [id, status, req.user.id]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Status pesanan diupdate', transaction: updateRes.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  }
};
