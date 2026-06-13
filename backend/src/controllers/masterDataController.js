const { pool } = require('../config/database');

// --- Participant Categories ---
exports.getParticipantCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM participant_categories WHERE event_id = $1 ORDER BY created_at ASC', [req.params.eventId]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.createParticipantCategory = async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO participant_categories (event_id, name, code) VALUES ($1, $2, $3) RETURNING *',
      [req.params.eventId, name, code]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.updateParticipantCategory = async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await pool.query(
      'UPDATE participant_categories SET name = $1, code = $2 WHERE id = $3 RETURNING *',
      [name, code, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.toggleParticipantCategoryStatus = async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query('UPDATE participant_categories SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

// --- Product Categories ---
exports.getProductCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product_categories WHERE event_id = $1 ORDER BY created_at ASC', [req.params.eventId]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.createProductCategory = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO product_categories (event_id, name) VALUES ($1, $2) RETURNING *',
      [req.params.eventId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.updateProductCategory = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE product_categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.toggleProductCategoryStatus = async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query('UPDATE product_categories SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

// --- Products ---
exports.getProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN product_categories c ON p.category_id = c.id 
      WHERE p.event_id = $1 ORDER BY p.created_at ASC
    `, [req.params.eventId]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.createProduct = async (req, res) => {
  const { category_id, name, description, price, unit } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (event_id, category_id, name, description, price, unit) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.eventId, category_id, name, description, price, unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.updateProduct = async (req, res) => {
  const { category_id, name, description, price, unit } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET category_id = $1, name = $2, description = $3, price = $4, unit = $5 WHERE id = $6 RETURNING *',
      [category_id, name, description, price, unit, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.toggleProductStatus = async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query('UPDATE products SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

// --- Booths ---
exports.getBooths = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM booths WHERE event_id = $1 ORDER BY created_at ASC', [req.params.eventId]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.createBooth = async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO booths (event_id, name, code) VALUES ($1, $2, $3) RETURNING *',
      [req.params.eventId, name, code]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.updateBooth = async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await pool.query(
      'UPDATE booths SET name = $1, code = $2 WHERE id = $3 RETURNING *',
      [name, code, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
exports.toggleBoothStatus = async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query('UPDATE booths SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};
