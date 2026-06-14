const { pool } = require('../config/database');

const getEvents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    res.json({ events: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

const getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event tidak ditemukan.' });
    }
    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
};

const createEvent = async (req, res) => {
  const { name, code, location, start_date, end_date, total_days, receipt_format, tv_title, tv_subtitle, notes, receipt_prefix, receipt_separator, receipt_start_number, receipt_digit_length, receipt_reset_mode } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO events (name, code, location, start_date, end_date, total_days, receipt_format, tv_title, tv_subtitle, notes, status, is_active, receipt_prefix, receipt_separator, receipt_start_number, receipt_digit_length, receipt_reset_mode, receipt_current_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'NONAKTIF', false, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `, [
      name, code, location, start_date, end_date, total_days, 
      receipt_format || '[HARI]-[KATEGORI]-[BOOTH]-[NOMOR]', 
      tv_title || 'PHOTOBOOTH EVENT', 
      tv_subtitle || 'Silakan menuju booth sesuai nomor antrian.',
      notes,
      receipt_prefix || 'NOTA',
      receipt_separator !== undefined ? receipt_separator : '-',
      receipt_start_number || 1,
      receipt_digit_length || 4,
      receipt_reset_mode || 'NEVER',
      (receipt_start_number || 1) - 1
    ]);
    res.status(201).json({ message: 'Event berhasil ditambahkan', event: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambahkan event. Pastikan kode event unik.' });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { name, code, location, start_date, end_date, total_days, receipt_format, tv_title, tv_subtitle, notes, print_settings, receipt_prefix, receipt_separator, receipt_start_number, receipt_digit_length, receipt_reset_mode } = req.body;
  try {
    const checkRes = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ message: 'Event tidak ditemukan.' });
    const ev = checkRes.rows[0];

    const result = await pool.query(`
      UPDATE events 
      SET name = $1, code = $2, location = $3, start_date = $4, end_date = $5, 
          total_days = $6, receipt_format = $7, tv_title = $8, tv_subtitle = $9, 
          notes = $10, print_settings = $11, updated_at = NOW(),
          receipt_prefix = $13, receipt_separator = $14, receipt_start_number = $15, 
          receipt_digit_length = $16, receipt_reset_mode = $17
      WHERE id = $12
      RETURNING *;
    `, [
      name !== undefined ? name : ev.name,
      code !== undefined ? code : ev.code,
      location !== undefined ? location : ev.location,
      start_date !== undefined ? start_date : ev.start_date,
      end_date !== undefined ? end_date : ev.end_date,
      total_days !== undefined ? total_days : ev.total_days,
      receipt_format !== undefined ? receipt_format : ev.receipt_format,
      tv_title !== undefined ? tv_title : ev.tv_title,
      tv_subtitle !== undefined ? tv_subtitle : ev.tv_subtitle,
      notes !== undefined ? notes : ev.notes,
      print_settings !== undefined ? JSON.stringify(print_settings) : (ev.print_settings ? JSON.stringify(ev.print_settings) : null),
      id,
      receipt_prefix !== undefined ? receipt_prefix : ev.receipt_prefix,
      receipt_separator !== undefined ? receipt_separator : ev.receipt_separator,
      receipt_start_number !== undefined ? receipt_start_number : ev.receipt_start_number,
      receipt_digit_length !== undefined ? receipt_digit_length : ev.receipt_digit_length,
      receipt_reset_mode !== undefined ? receipt_reset_mode : ev.receipt_reset_mode
    ]);
    
    res.json({ message: 'Event berhasil diperbarui', event: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengupdate event.' });
  }
};

const updateEventStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    await pool.query('BEGIN');
    
    if (status === 'AKTIF') {
      await pool.query(`UPDATE events SET is_active = false, status = 'NONAKTIF' WHERE status = 'AKTIF'`);
    }
    
    const result = await pool.query(
      'UPDATE events SET is_active = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *', 
      [status === 'AKTIF', status, id]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Status event berhasil diperbarui', event: result.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ message: 'Terjadi kesalahan saat mengupdate status event.' });
  }
};

const resetReceiptNumber = async (req, res) => {
  const { id } = req.params;
  const { start_number, reason } = req.body;

  try {
    const eventRes = await pool.query('SELECT receipt_start_number FROM events WHERE id = $1', [id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ message: 'Event tidak ditemukan.' });
    }

    const newStart = start_number || eventRes.rows[0].receipt_start_number;
    
    const result = await pool.query(
      'UPDATE events SET receipt_current_number = $1, receipt_start_number = $2, updated_at = NOW() WHERE id = $3 RETURNING *', 
      [newStart - 1, newStart, id]
    );

    res.json({ message: 'Nomor nota berhasil direset', event: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mereset nomor nota.' });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const eventRes = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ message: 'Event tidak ditemukan.' });
    }

    if (eventRes.rows[0].is_active) {
      return res.status(400).json({ message: 'Event yang sedang aktif tidak dapat dihapus. Nonaktifkan terlebih dahulu.' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Event beserta seluruh datanya berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus event.' });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, updateEventStatus, resetReceiptNumber, deleteEvent };
