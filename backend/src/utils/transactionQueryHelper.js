const pool = require('../config/db');

/**
 * Membangun query SQL dan parameter untuk mengambil data transaksi.
 * Dijamin menggunakan filter yang identik untuk seluruh API list dan report PDF.
 */
const getTransactionsData = async (filters, requireEventId = true) => {
  let eventIdParam = filters.event_id;

  // Untuk endpoint operasional Kasir yang mungkin tidak mengirim event_id eksplisit tapi butuh fallback (opsional)
  if (!eventIdParam && !requireEventId) {
    const activeEventRes = await pool.query('SELECT id FROM events WHERE is_active = true LIMIT 1');
    if (activeEventRes.rows.length > 0) {
      eventIdParam = activeEventRes.rows[0].id;
    }
  }

  // Jika setelah fallback eventIdParam masih kosong, dan event_id wajib, maka lempar error.
  if (!eventIdParam && requireEventId) {
    throw new Error('EVENT_ID_REQUIRED');
  }

  let query = `
    SELECT t.*, 
           e.name as event_name, 
           pc.name as category_name, 
           b.name as booth_name,
           u1.name as created_by_name,
           u2.name as verified_by_name
    FROM transactions t
    LEFT JOIN events e ON t.event_id = e.id
    LEFT JOIN participant_categories pc ON t.participant_category_id = pc.id
    LEFT JOIN booths b ON t.booth_id = b.id
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.verified_by = u2.id
    WHERE t.deleted_at IS NULL
  `;
  const params = [];
  let paramIndex = 1;

  if (eventIdParam) { 
    query += ` AND t.event_id = $${paramIndex++}`; 
    params.push(eventIdParam); 
  }

  // Support both 'date' and 'start_date' / 'end_date'
  if (filters.date) { 
    query += ` AND DATE(t.created_at) = $${paramIndex++}`; 
    params.push(filters.date); 
  }
  if (filters.start_date) { 
    query += ` AND DATE(t.created_at) >= $${paramIndex++}`; 
    params.push(filters.start_date); 
  }
  if (filters.end_date) { 
    query += ` AND DATE(t.created_at) <= $${paramIndex++}`; 
    params.push(filters.end_date); 
  }

  // Status
  if (filters.status && filters.status !== 'ALL') { 
    query += ` AND t.payment_status = $${paramIndex++}`; 
    params.push(filters.status); 
  }

  // Payment Method
  if (filters.payment_method && filters.payment_method !== 'ALL') { 
    query += ` AND t.payment_method = $${paramIndex++}`; 
    params.push(filters.payment_method); 
  }

  // Search Query
  if (filters.q) { 
    query += ` AND (t.participant_name ILIKE $${paramIndex} OR t.receipt_number ILIKE $${paramIndex} OR t.registration_code ILIKE $${paramIndex} OR t.payment_queue_code ILIKE $${paramIndex})`; 
    params.push(`%${filters.q}%`); 
    paramIndex++; 
  }

  if (filters.status === 'MENUNGGU_PEMBAYARAN') {
    query += ` ORDER BY t.created_at ASC`;
  } else {
    query += ` ORDER BY t.created_at DESC`;
  }

  const result = await pool.query(query, params);

  // Ambil detail item agar tidak duplikasi di transaksi utama
  const transIds = result.rows.map(r => r.id);
  if (transIds.length > 0) {
    const itemsRes = await pool.query(`
      SELECT ti.*, p.name as product_name 
      FROM transaction_items ti 
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = ANY($1)
    `, [transIds]);

    const itemsMap = {};
    itemsRes.rows.forEach(item => {
      if (!itemsMap[item.transaction_id]) itemsMap[item.transaction_id] = [];
      itemsMap[item.transaction_id].push(item);
    });

    result.rows.forEach(row => {
      row.items = itemsMap[row.id] || [];
    });
  }

  return { transactions: result.rows, eventId: eventIdParam };
};

module.exports = {
  getTransactionsData
};
