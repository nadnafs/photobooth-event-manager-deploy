const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');

exports.getActiveEventContext = async (req, res) => {
  try {
    const eventRes = await pool.query('SELECT * FROM events WHERE is_active = true LIMIT 1');
    if (eventRes.rows.length === 0) return res.status(404).json({ message: 'Tidak ada event aktif.' });

    const event = eventRes.rows[0];
    const eventId = event.id;

    const [categories, products, booths] = await Promise.all([
      pool.query('SELECT * FROM participant_categories WHERE event_id = $1 AND is_active = true ORDER BY name', [eventId]),
      pool.query('SELECT p.*, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.event_id = $1 AND p.is_active = true ORDER BY p.name', [eventId]),
      pool.query('SELECT * FROM booths WHERE event_id = $1 AND is_active = true ORDER BY name', [eventId])
    ]);

    res.json({
      event,
      participant_categories: categories.rows,
      products: products.rows,
      booths: booths.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTransaction = async (req, res) => {
  let { participant_name, phone, notes, participant_category_id, booth_id, items, payment_method } = req.body;
  // items: [{ product_id, quantity }]

  try {
    if (!participant_name) return res.status(400).json({ message: 'Nama peserta wajib diisi' });

    participant_name = participant_name.toUpperCase();

    const eventRes = await pool.query('SELECT * FROM events WHERE is_active = true LIMIT 1');
    if (eventRes.rows.length === 0) return res.status(400).json({ message: 'Tidak ada event aktif.' });
    const event = eventRes.rows[0];
    const eventId = event.id;

    await pool.query('BEGIN');

    // Get participant category code
    let categoryCode = 'UMM';
    if (participant_category_id) {
      const catRes = await pool.query('SELECT code FROM participant_categories WHERE id = $1', [participant_category_id]);
      if (catRes.rows.length > 0) categoryCode = catRes.rows[0].code;
    }

    // Auto-select booth if not provided
    let finalBoothId = booth_id;
    if (!finalBoothId) {
      const boothRes = await pool.query(`
        SELECT b.id, COUNT(t.id) as queue_count 
        FROM booths b 
        LEFT JOIN transactions t ON b.id = t.booth_id AND t.queue_status IN ('MENUNGGU', 'DIPANGGIL')
        WHERE b.event_id = $1 AND b.is_active = true
        GROUP BY b.id ORDER BY queue_count ASC LIMIT 1
      `, [eventId]);
      if (boothRes.rows.length > 0) finalBoothId = boothRes.rows[0].id;
    }

    // Get booth code
    let boothCode = 'A';
    if (finalBoothId) {
      const boothRes = await pool.query('SELECT code FROM booths WHERE id = $1', [finalBoothId]);
      if (boothRes.rows.length > 0) boothCode = boothRes.rows[0].code;
    }

    // Count today's transactions for this event to get the running sequence (daily reset)
    const countRes = await pool.query('SELECT COUNT(*) FROM transactions WHERE event_id = $1 AND DATE(created_at) = CURRENT_DATE', [eventId]);
    const urut = String(parseInt(countRes.rows[0].count) + 1).padStart(3, '0');
    const txCount = parseInt(countRes.rows[0].count) + 1;

    // Generate registration_code
    const registrationCode = `REG-${String(txCount).padStart(5, '0')}`;

    // Generate payment_queue_code
    const eventPrefix = event.code || 'B';
    const paymentQueueCode = `${eventPrefix}-${String(txCount).padStart(3, '0')}`;

    // Generate receipt number
    const start_date = new Date(event.start_date);
    const today = new Date();
    const diffTime = Math.abs(today - start_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const hariFormat = `D${diffDays || 1}`;

    const receiptNumber = (event.receipt_format || '[HARI]-[KATEGORI]-[BOOTH]-[NOMOR]')
      .replace('[EVENT]', event.code || 'EVT')
      .replace('[HARI]', hariFormat)
      .replace('[KATEGORI]', categoryCode)
      .replace('[BOOTH]', boothCode)
      .replace('[NOMOR]', urut);

    // Calculate total
    let total_amount = 0;
    const finalItems = [];
    for (const item of items) {
      const prodRes = await pool.query('SELECT p.price, p.name, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = $1 AND p.event_id = $2', [item.product_id, eventId]);
      if (prodRes.rows.length === 0) throw new Error('Produk tidak ditemukan atau bukan milik event yang aktif.');
      const prod = prodRes.rows[0];
      const subtotal = prod.price * item.quantity;
      total_amount += subtotal;
      finalItems.push({
        product_id: item.product_id,
        price: prod.price,
        quantity: item.quantity,
        subtotal,
        product_name_snapshot: prod.name,
        category_name_snapshot: prod.category_name || '-'
      });
    }

    // Insert Transaction
    const transRes = await pool.query(`
      INSERT INTO transactions (
        event_id, receipt_number, queue_code, participant_name, phone, notes, participant_category_id, booth_id, total_amount, payment_method, payment_status, queue_status, created_by, registration_code, payment_queue_code, payment_queue_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'MENUNGGU_PEMBAYARAN', 'BELUM', $11, $12, $13, 'MENUNGGU') RETURNING *
    `, [
      eventId, 
      receiptNumber, 
      paymentQueueCode, 
      participant_name, 
      phone, 
      notes, 
      participant_category_id, 
      finalBoothId, 
      total_amount, 
      payment_method || 'BELUM', 
      req.user.id,
      registrationCode,
      paymentQueueCode
    ]);

    const transaction = transRes.rows[0];

    // Insert Items
    for (const fi of finalItems) {
      await pool.query(
        'INSERT INTO transaction_items (transaction_id, product_id, price, quantity, subtotal, product_name_snapshot, product_category_name_snapshot) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [transaction.id, fi.product_id, fi.price, fi.quantity, fi.subtotal, fi.product_name_snapshot, fi.category_name_snapshot]
      );
    }

    await pool.query('COMMIT');

    // ── AUTO-CALL: Jika tidak ada yang sedang DIPANGGIL, otomatis panggil
    //    peserta pertama dalam antrean tanpa perlu Kasir tekan tombol.
    try {
      const dipanggilRes = await pool.query(`
        SELECT id FROM transactions
        WHERE event_id = $1
          AND payment_status = 'MENUNGGU_PEMBAYARAN'
          AND payment_queue_status = 'DIPANGGIL'
          AND deleted_at IS NULL
        LIMIT 1
      `, [eventId]);

      if (dipanggilRes.rows.length === 0) {
        // Tidak ada yang dipanggil → ambil pertama dalam antrean
        const firstWaiting = await pool.query(`
          SELECT id, payment_queue_code, queue_code, participant_name
          FROM transactions
          WHERE event_id = $1
            AND payment_status = 'MENUNGGU_PEMBAYARAN'
            AND payment_queue_status = 'MENUNGGU'
            AND deleted_at IS NULL
          ORDER BY created_at ASC LIMIT 1
        `, [eventId]);

        if (firstWaiting.rows.length > 0) {
          const autoTx = firstWaiting.rows[0];
          const autoCode = autoTx.payment_queue_code || autoTx.queue_code;

          await pool.query(`
            UPDATE transactions
            SET payment_queue_status = 'DIPANGGIL', updated_at = NOW()
            WHERE id = $1
          `, [autoTx.id]);

          // Emit ke TV
          const io = req.app.get('io');
          if (io) {
            const callId = `auto-${autoTx.id}-${Date.now()}`;
            io.emit('queue:called', {
              callId,
              queueCode: autoCode,
              participantName: autoTx.participant_name,
              calledAt: new Date()
            });
            io.emit('payment-queue:called', {
              callId,
              paymentQueueCode: autoCode,
              participantName: autoTx.participant_name,
              calledAt: new Date()
            });
            io.emit('queue_updated');
            io.emit('payment-queue:updated');
          }
        }
      }
    } catch (autoCallErr) {
      // Auto-call gagal tidak menggagalkan pendaftaran
      console.error('Auto-call error (non-fatal):', autoCallErr.message);
    }

    res.status(201).json({ message: 'Pendaftaran berhasil disimpan', transaction });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: error.message || 'Gagal menyimpan transaksi' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { getTransactionsData } = require('../utils/transactionQueryHelper');
    // Untuk getTransactions API Kasir, jika event_id kosong, ambil active event
    const { transactions } = await getTransactionsData(req.query, false);
    res.json({ transactions });
  } catch (error) {
    console.error(error);
    if (error.message === 'EVENT_ID_REQUIRED') {
      return res.status(400).json({ success: false, message: 'Event wajib dipilih.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyPayment = async (req, res) => {
  const { id } = req.params;
  const { payment_method, amount_received } = req.body;

  try {
    await pool.query('BEGIN');

    const transRes = await pool.query(`
      SELECT t.*, e.receipt_format, e.code as event_code, e.start_date
      FROM transactions t
      JOIN events e ON t.event_id = e.id
      WHERE t.id = $1
    `, [id]);

    if (transRes.rows.length === 0) throw new Error('Transaksi tidak ditemukan');
    const trans = transRes.rows[0];
    if (trans.payment_status === 'LUNAS') throw new Error('Transaksi sudah lunas');
    if (!payment_method || !['TUNAI', 'QRIS'].includes(payment_method)) throw new Error('Metode pembayaran tidak valid');

    let finalAmountReceived = null;
    let finalChangeAmount = null;

    if (payment_method === 'TUNAI') {
      if (!amount_received || amount_received < trans.total_amount) {
        throw new Error('Nominal uang tunai kurang dari total biaya.');
      }
      finalAmountReceived = amount_received;
      finalChangeAmount = amount_received - trans.total_amount;
    } else {
      // QRIS
      finalAmountReceived = trans.total_amount;
      finalChangeAmount = 0;
    }

    const eventLockRes = await pool.query(`
      SELECT receipt_prefix, receipt_separator, receipt_start_number, receipt_digit_length, receipt_current_number
      FROM events
      WHERE id = $1 FOR UPDATE
    `, [trans.event_id]);

    if (eventLockRes.rows.length === 0) throw new Error('Event tidak ditemukan');
    const eventSettings = eventLockRes.rows[0];

    let nextNumber = eventSettings.receipt_current_number + 1;
    if (nextNumber < eventSettings.receipt_start_number) {
      nextNumber = eventSettings.receipt_start_number;
    }

    const paddedNumber = String(nextNumber).padStart(eventSettings.receipt_digit_length, '0');
    const newReceiptNumber = `${eventSettings.receipt_prefix}${eventSettings.receipt_separator || ''}${paddedNumber}`;

    await pool.query(`
      UPDATE events SET receipt_current_number = $1 WHERE id = $2
    `, [nextNumber, trans.event_id]);

    // Update Transaction
    const updateRes = await pool.query(`
      UPDATE transactions 
      SET payment_status = 'LUNAS', 
          payment_queue_status = 'SELESAI',
          payment_method = $1,
          amount_received = $2,
          change_amount = $3,
          verified_by = $4,
          verified_at = NOW(),
          receipt_number = $5
      WHERE id = $6 RETURNING *
    `, [payment_method, finalAmountReceived, finalChangeAmount, req.user.id, newReceiptNumber, id]);

    // Insert Payment Log
    await pool.query(`
      INSERT INTO payment_logs (transaction_id, verified_by, amount) VALUES ($1, $2, $3)
    `, [id, req.user.id, finalAmountReceived]);

    // Fetch next waiting participant
    const nextRes = await pool.query(`
      SELECT id, receipt_number, queue_code, registration_code, payment_queue_code, participant_name 
      FROM transactions 
      WHERE event_id = $1 AND payment_status = 'MENUNGGU_PEMBAYARAN' AND payment_queue_status = 'MENUNGGU' AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1 FOR UPDATE
    `, [trans.event_id]);

    let nextTx = null;
    if (nextRes.rows.length > 0) {
      nextTx = nextRes.rows[0];
      // Update its payment_queue_status to 'DIPANGGIL'
      await pool.query(`
        UPDATE transactions
        SET payment_queue_status = 'DIPANGGIL', updated_at = NOW()
        WHERE id = $1
      `, [nextTx.id]);
    }

    await pool.query('COMMIT');

    // Emit Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('payment:verified', { 
        transactionId: id, 
        registrationCode: trans.registration_code || trans.receipt_number 
      });

      if (nextTx) {
        io.emit('payment-queue:called', {
          callId: `call-${nextTx.id}-${Date.now()}`,
          paymentQueueCode: nextTx.payment_queue_code || nextTx.queue_code || nextTx.receipt_number,
          participantName: nextTx.participant_name,
          calledAt: new Date()
        });
        
        // Also emit old visual queue called for compatibility
        io.emit('queue:called', {
          callId: `call-${nextTx.id}-${Date.now()}`,
          queueCode: nextTx.payment_queue_code || nextTx.queue_code || nextTx.receipt_number,
          participantName: nextTx.participant_name,
          calledAt: new Date()
        });
      }

      io.emit('payment-queue:updated');
      io.emit('queue_updated');
      io.emit('queue:updated');
    }

    res.json({ 
      success: true, 
      message: 'Pembayaran berhasil diverifikasi', 
      transaction: updateRes.rows[0],
      nextCall: nextTx
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.exportTransactionsPDF = async (req, res) => {
  try {
    const { getTransactionsData } = require('../utils/transactionQueryHelper');
    const { transactions, eventId } = await getTransactionsData(req.query, true);

    // Dapatkan nama event
    const eventRes = await pool.query('SELECT name FROM events WHERE id = $1', [eventId]);
    const eventName = eventRes.rows.length > 0 ? eventRes.rows[0].name.replace(/[^a-zA-Z0-9 ]/g, '-') : 'Event';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Laporan_Transaksi_${eventName.replace(/\s+/g, '_')}_${dateStr}.pdf`;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text(`LAPORAN TRANSAKSI: ${eventName.toUpperCase()}`, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
    doc.moveDown(2);

    let totalPendapatan = 0;
    let totalLunas = 0;
    let totalDibatalkan = 0;

    // Simple table format
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Nota', 30, tableTop);
    doc.text('Nama Peserta', 110, tableTop);
    doc.text('Kategori', 260, tableTop);
    doc.text('Metode', 340, tableTop);
    doc.text('Status', 410, tableTop);
    doc.text('Total', 480, tableTop, { width: 90, align: 'right' });

    doc.moveTo(30, tableTop + 15).lineTo(570, tableTop + 15).stroke();

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(8);

    transactions.forEach(row => {
      if (y > 750) {
        doc.addPage();
        y = 30;
        doc.font('Helvetica').fontSize(8);
      }
      doc.text(row.receipt_number || '-', 30, y);
      doc.text((row.participant_name || '').substring(0, 25), 110, y);
      doc.text(row.category_name || '-', 260, y);
      doc.text(row.payment_method || '-', 340, y);
      doc.text(row.payment_status || '-', 410, y);

      const amount = parseFloat(row.total_amount || 0);
      if (row.payment_status === 'LUNAS') {
        totalPendapatan += amount;
        totalLunas++;
      } else if (row.payment_status === 'DIBATALKAN' || row.payment_status === 'BATAL') {
        totalDibatalkan++;
      }

      doc.text(amount.toLocaleString('id-ID'), 480, y, { width: 90, align: 'right' });
      y += 15;
    });

    doc.moveTo(30, y).lineTo(570, y).stroke();
    y += 15;
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Transaksi Lunas: ${totalLunas}`, 30, y);
    doc.text(`Total Dibatalkan: ${totalDibatalkan}`, 200, y);
    doc.text('Total Pendapatan:', 350, y);
    doc.text('Rp ' + totalPendapatan.toLocaleString('id-ID'), 480, y, { width: 90, align: 'right' });

    doc.end();
  } catch (error) {
    console.error(error);
    if (error.message === 'EVENT_ID_REQUIRED') {
      return res.status(400).json({ success: false, message: 'Event wajib dipilih untuk melakukan export.' });
    }
    if (!res.headersSent) res.status(500).json({ message: 'Gagal export PDF' });
  }
};

exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  let { participant_name, phone, notes, participant_category_id, booth_id, items } = req.body;

  try {
    if (!participant_name) return res.status(400).json({ message: 'Nama peserta wajib diisi' });

    participant_name = participant_name.toUpperCase();

    await pool.query('BEGIN');

    // Fetch existing transaction
    const transCheck = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (transCheck.rows.length === 0) throw new Error('Transaksi tidak ditemukan');
    const oldTrans = transCheck.rows[0];

    let finalTotalAmount = oldTrans.total_amount;
    let finalItems = [];

    if (items && Array.isArray(items)) {
      finalTotalAmount = 0;
      for (const item of items) {
        // Validasi: produk harus milik event yang sama dengan transaksi
        const prodRes = await pool.query(
          'SELECT p.price, p.name, c.name as category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = $1 AND p.event_id = $2',
          [item.product_id, oldTrans.event_id]
        );
        if (prodRes.rows.length === 0) throw new Error('Produk tidak ditemukan atau bukan milik event yang sama.');
        const prod = prodRes.rows[0];
        const subtotal = prod.price * item.quantity;
        finalTotalAmount += subtotal;
        finalItems.push({
          product_id: item.product_id,
          price: prod.price,
          quantity: item.quantity,
          subtotal,
          product_name_snapshot: prod.name,
          category_name_snapshot: prod.category_name || '-'
        });
      }
    }

    // Update main transaction table
    const updateRes = await pool.query(`
      UPDATE transactions 
      SET participant_name = $1,
          phone = $2,
          notes = $3,
          participant_category_id = $4,
          booth_id = $5,
          total_amount = $6,
          updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [participant_name, phone, notes, participant_category_id, booth_id || oldTrans.booth_id, finalTotalAmount, id]);

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete old items
      await pool.query('DELETE FROM transaction_items WHERE transaction_id = $1', [id]);
      // Insert new items
      for (const fi of finalItems) {
        await pool.query(
          'INSERT INTO transaction_items (transaction_id, product_id, price, quantity, subtotal, product_name_snapshot, product_category_name_snapshot) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, fi.product_id, fi.price, fi.quantity, fi.subtotal, fi.product_name_snapshot, fi.category_name_snapshot]
        );
      }
    }

    await pool.query('COMMIT');

    // Emit Socket.IO update
    const io = req.app.get('io');
    if (io) io.emit('queue_updated');

    res.json({ message: 'Transaksi berhasil diupdate', transaction: updateRes.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: error.message || 'Gagal mengupdate transaksi' });
  }
};

exports.deleteRegistration = async (req, res) => {
  const { id } = req.params;
  const { delete_reason } = req.body || {};
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    await pool.query('BEGIN');

    const transRes = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (transRes.rows.length === 0) {
      throw new Error('Pendaftaran tidak ditemukan.');
    }
    const trans = transRes.rows[0];

    if (trans.payment_status !== 'MENUNGGU_PEMBAYARAN') {
      throw new Error('Hanya pendaftaran yang belum dibayar yang dapat dihapus.');
    }

    if (userRole === 'PENERIMA' && trans.created_by !== userId) {
      throw new Error('Anda tidak memiliki akses untuk menghapus pendaftaran yang dibuat oleh pengguna lain.');
    }

    // Hard delete items first
    await pool.query('DELETE FROM transaction_items WHERE transaction_id = $1', [id]);

    // Hard delete the transaction itself
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);

    await pool.query('COMMIT');

    const io = req.app.get('io');
    if (io) io.emit('queue_updated');

    return res.json({ message: 'Pendaftaran berhasil dihapus.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.cancelTransaction = async (req, res) => {
  const { id } = req.params;
  const { cancel_reason } = req.body || {};
  const userId = req.user.id;

  try {
    await pool.query('BEGIN');

    const transRes = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (transRes.rows.length === 0) {
      throw new Error('Transaksi tidak ditemukan.');
    }
    const trans = transRes.rows[0];

    if (trans.payment_status === 'DIBATALKAN') {
      throw new Error('Transaksi sudah dibatalkan sebelumnya.');
    }

    if (trans.payment_status !== 'LUNAS') {
      throw new Error('Hanya transaksi lunas yang dapat dibatalkan melalui fitur ini.');
    }

    if (!cancel_reason || cancel_reason.trim() === '') {
      throw new Error('Alasan pembatalan wajib diisi.');
    }

    await pool.query(`
      UPDATE transactions 
      SET payment_status = 'DIBATALKAN',
          payment_queue_status = 'SELESAI',
          cancelled_at = NOW(),
          cancelled_by = $1,
          cancel_reason = $2
      WHERE id = $3
    `, [userId, cancel_reason, id]);

    await pool.query('COMMIT');

    const io = req.app.get('io');
    if (io) io.emit('queue_updated');

    return res.json({ message: 'Transaksi berhasil dibatalkan.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.getTransactionById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.*, 
             e.name as event_name, 
             e.print_settings,
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
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

    const trans = result.rows[0];

    // Get items
    const itemsRes = await pool.query(`
      SELECT ti.*, p.name as product_name 
      FROM transaction_items ti 
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = $1
    `, [id]);

    trans.items = itemsRes.rows;

    res.json({ transaction: trans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
