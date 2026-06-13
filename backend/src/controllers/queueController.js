const { pool } = require('../config/database');

// Socket.IO emitter helper
const emitQueueUpdate = (req) => {
  const io = req.app.get('io');
  if (io) io.emit('queue_updated');
};

exports.getStatus = async (req, res) => {
  try {
    const eventRes = await pool.query('SELECT id, name FROM events WHERE is_active = true LIMIT 1');
    if (eventRes.rows.length === 0) {
      return res.json({ event: null, active: null, waiting: [], skipped: [], remainingCount: 0 });
    }
    const event = eventRes.rows[0];

    const activeRes = await pool.query(`
      SELECT id, receipt_number, queue_code, registration_code, payment_queue_code, participant_name, payment_queue_status, updated_at
      FROM transactions
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'DIPANGGIL' AND deleted_at IS NULL
      ORDER BY updated_at DESC LIMIT 1
    `, [event.id]);

    const waitingRes = await pool.query(`
      SELECT id, receipt_number, queue_code, registration_code, payment_queue_code, participant_name, payment_queue_status, created_at
      FROM transactions
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'MENUNGGU' AND deleted_at IS NULL
      ORDER BY created_at ASC
    `, [event.id]);

    const skippedRes = await pool.query(`
      SELECT id, receipt_number, queue_code, registration_code, payment_queue_code, participant_name, payment_queue_status, updated_at
      FROM transactions
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'TERLEWAT' AND deleted_at IS NULL
      ORDER BY updated_at DESC
    `, [event.id]);

    res.json({
      event,
      active: activeRes.rows.length > 0 ? activeRes.rows[0] : null,
      waiting: waitingRes.rows,
      skipped: skippedRes.rows,
      remainingCount: waitingRes.rows.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.callNext = async (req, res) => {
  try {
    await pool.query('BEGIN');

    const eventRes = await pool.query('SELECT id FROM events WHERE is_active = true LIMIT 1');
    if (eventRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Tidak ada event aktif' });
    }
    const eventId = eventRes.rows[0].id;

    // Auto-skip currently called transaction if any
    await pool.query(`
      UPDATE transactions
      SET payment_queue_status = 'TERLEWAT', updated_at = NOW()
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'DIPANGGIL' AND deleted_at IS NULL
    `, [eventId]);

    // Fetch the next waiting participant
    const nextRes = await pool.query(`
      SELECT id, receipt_number, queue_code, registration_code, payment_queue_code, participant_name 
      FROM transactions 
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'MENUNGGU' AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE
    `, [eventId]);

    if (nextRes.rows.length === 0) {
      await pool.query('COMMIT');
      // Also emit update so layouts refresh
      const io = req.app.get('io');
      if (io) io.emit('queue_updated');
      return res.json({ message: 'Antrean kosong', transaction: null });
    }

    const nextTx = nextRes.rows[0];

    // Update status to DIPANGGIL
    const updateRes = await pool.query(`
      UPDATE transactions 
      SET payment_queue_status = 'DIPANGGIL', updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [nextTx.id]);

    await pool.query('COMMIT');

    // Emit Socket.IO events
    const io = req.app.get('io');
    if (io) {
      const callId = `call-${nextTx.id}-${Date.now()}`;
      const queueCode = nextTx.payment_queue_code || nextTx.queue_code || nextTx.receipt_number;

      // payment-queue:called — digunakan oleh TV untuk suara
      io.emit('payment-queue:called', {
        callId,
        paymentQueueCode: queueCode,
        participantName: nextTx.participant_name,
        calledAt: new Date().toISOString()
      });

      // queue:called — fallback / kompatibilitas lama
      io.emit('queue:called', {
        callId,
        queueCode,
        participantName: nextTx.participant_name,
        calledAt: new Date().toISOString()
      });

      io.emit('payment-queue:updated');
      io.emit('queue_updated');
      io.emit('queue:updated');
    }

    res.json({ message: 'Panggilan berhasil', transaction: updateRes.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.recallQueue = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');

    const transRes = await pool.query(`
      SELECT id, receipt_number, queue_code, registration_code, payment_queue_code, participant_name, payment_queue_status, event_id 
      FROM transactions 
      WHERE id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN'
    `, [id]);

    if (transRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaksi tidak ditemukan atau sudah dibayar' });
    }
    const trans = transRes.rows[0];

    // If there is another DIPANGGIL transaction, set it to TERLEWAT
    if (trans.payment_queue_status !== 'DIPANGGIL') {
      await pool.query(`
        UPDATE transactions 
        SET payment_queue_status = 'TERLEWAT', updated_at = NOW() 
        WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'DIPANGGIL' AND id != $2
      `, [trans.event_id, id]);

      // Set the target one to DIPANGGIL
      await pool.query(`
        UPDATE transactions 
        SET payment_queue_status = 'DIPANGGIL', updated_at = NOW() 
        WHERE id = $1
      `, [id]);
    }

    await pool.query('COMMIT');

    // Emit Socket.IO events
    const io = req.app.get('io');
    if (io) {
      const recallId = `recall-${id}-${Date.now()}`;
      const queueCode = trans.payment_queue_code || trans.queue_code || trans.receipt_number;

      // payment-queue:recalled — callId BARU agar TV memutar ulang suara
      io.emit('payment-queue:recalled', {
        callId: recallId,
        paymentQueueCode: queueCode,
        participantName: trans.participant_name,
        isRecall: true,
        calledAt: new Date().toISOString()
      });

      // queue:called — fallback kompatibilitas
      io.emit('queue:called', {
        callId: recallId,
        queueCode,
        participantName: trans.participant_name,
        isRecall: true,
        calledAt: new Date().toISOString()
      });

      io.emit('payment-queue:updated');
      io.emit('queue_updated');
      io.emit('queue:updated');
    }

    res.json({ message: 'Panggilan terkirim', transaction: trans });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.finishQueue = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');

    const transRes = await pool.query('SELECT payment_status FROM transactions WHERE id = $1', [id]);
    if (transRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    // Update to SELESAI and LUNAS (as a direct finish queue action helper)
    const updateRes = await pool.query(`
      UPDATE transactions 
      SET payment_queue_status = 'SELESAI', 
          payment_status = 'LUNAS',
          updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [id]);

    await pool.query('COMMIT');

    // Emit Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('queue:finished', { id });
      io.emit('queue_updated');
      io.emit('queue:updated');
    }

    res.json({ message: 'Selesai antrean pembayaran', transaction: updateRes.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.skipQueue = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');

    const transRes = await pool.query('SELECT payment_queue_status FROM transactions WHERE id = $1', [id]);
    if (transRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    // Update status to TERLEWAT
    const updateRes = await pool.query(`
      UPDATE transactions 
      SET payment_queue_status = 'TERLEWAT', updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [id]);

    await pool.query('COMMIT');

    // Emit Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('queue:skipped', { id });
      io.emit('queue_updated');
      io.emit('queue:updated');
    }

    res.json({ message: 'Antrean dilewati', transaction: updateRes.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.testVoice = async (req, res) => {
  try {
    const io = req.app.get('io');
    if (io) {
      // Emit keduanya agar TV menangkap salah satunya
      io.emit('payment-queue:test-voice');
      io.emit('queue:test-voice');
    }
    res.json({ message: 'Perintah tes suara berhasil dikirim' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTvData = async (req, res) => {
  try {
    const eventRes = await pool.query('SELECT id, name, tv_title, tv_subtitle FROM events WHERE is_active = true LIMIT 1');
    if (eventRes.rows.length === 0) {
      return res.json({ event: null, current: null, next: [] });
    }
    const event = eventRes.rows[0];

    // Get currently called transaction
    const currentRes = await pool.query(`
      SELECT receipt_number, registration_code, payment_queue_code, queue_code, participant_name, payment_queue_status, updated_at
      FROM transactions
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'DIPANGGIL'
      ORDER BY updated_at DESC LIMIT 1
    `, [event.id]);
    const current = currentRes.rows.length > 0 ? currentRes.rows[0] : null;

    // Get next waiting transactions (up to 5)
    const nextRes = await pool.query(`
      SELECT receipt_number, registration_code, payment_queue_code, queue_code, participant_name
      FROM transactions
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'MENUNGGU'
      ORDER BY created_at ASC LIMIT 5
    `, [event.id]);

    res.json({
      event,
      current,
      next: nextRes.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPublicStatus = async (req, res) => {
  const { queueCode } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.receipt_number, t.queue_code, t.registration_code, t.payment_queue_code, t.participant_name, t.payment_queue_status, t.payment_status, t.order_status, 
             e.name as event_name, pc.name as category_name
      FROM transactions t
      LEFT JOIN events e ON t.event_id = e.id
      LEFT JOIN participant_categories pc ON t.participant_category_id = pc.id
      WHERE t.payment_queue_code = $1 OR t.queue_code = $1 OR t.receipt_number = $1 OR t.registration_code = $1
    `, [queueCode]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Data tidak ditemukan' });
    const trans = result.rows[0];

    // Get currently called queue code for the active event
    const calledRes = await pool.query(`
      SELECT payment_queue_code, queue_code, receipt_number FROM transactions 
      WHERE event_id = (SELECT event_id FROM transactions WHERE (payment_queue_code = $1 OR queue_code = $1 OR receipt_number = $1 OR registration_code = $1) LIMIT 1)
      AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'DIPANGGIL'
      ORDER BY updated_at DESC LIMIT 1
    `, [queueCode]);
    
    const activeTx = calledRes.rows[0];
    trans.currently_called = activeTx ? (activeTx.payment_queue_code || activeTx.queue_code || activeTx.receipt_number) : '-';

    res.json(trans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchPublicQueue = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) return res.json([]);
  
  try {
    const result = await pool.query(`
      SELECT t.receipt_number, t.queue_code, t.registration_code, t.payment_queue_code, t.participant_name, t.payment_queue_status, t.payment_status, t.order_status
      FROM transactions t
      WHERE t.participant_name ILIKE $1 OR t.receipt_number ILIKE $1 OR t.queue_code ILIKE $1 OR t.registration_code ILIKE $1 OR t.payment_queue_code ILIKE $1
      ORDER BY t.created_at DESC LIMIT 10
    `, [`%${q}%`]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Mock booth queue endpoint for compatibility
exports.getBoothQueue = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.receipt_number, t.queue_code, t.registration_code, t.payment_queue_code, t.participant_name, t.payment_queue_status, pc.name as category_name
      FROM transactions t
      LEFT JOIN participant_categories pc ON t.participant_category_id = pc.id
      WHERE t.payment_status = 'MENUNGGU_PEMBAYARAN' AND t.payment_queue_status IN ('MENUNGGU', 'DIPANGGIL', 'TERLEWAT')
      ORDER BY t.created_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Deprecated fallback method
exports.updateQueueStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updateRes = await pool.query(`
      UPDATE transactions 
      SET payment_queue_status = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING *
    `, [status, id]);
    emitQueueUpdate(req);
    res.json({ message: 'Status updated', transaction: updateRes.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
