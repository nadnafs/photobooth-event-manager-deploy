const { pool } = require('../config/database');

exports.getKasirDashboard = async (req, res) => {
  try {
    const eventRes = await pool.query('SELECT * FROM events WHERE is_active = true LIMIT 1');
    const event = eventRes.rows.length > 0 ? eventRes.rows[0] : null;
    
    if (!event) return res.json({ event: null, stats: null });

    const statsRes = await pool.query(`
      SELECT 
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as total_transaksi,
        COALESCE(SUM(CASE WHEN payment_status = 'LUNAS' AND deleted_at IS NULL AND cancelled_at IS NULL THEN total_amount ELSE 0 END), 0) as total_pendapatan,
        COALESCE(SUM(CASE WHEN payment_method = 'TUNAI' AND payment_status = 'LUNAS' AND deleted_at IS NULL AND cancelled_at IS NULL THEN total_amount ELSE 0 END), 0) as total_tunai,
        COALESCE(SUM(CASE WHEN payment_method = 'QRIS' AND payment_status = 'LUNAS' AND deleted_at IS NULL AND cancelled_at IS NULL THEN total_amount ELSE 0 END), 0) as total_qris,
        COUNT(CASE WHEN payment_status = 'MENUNGGU_PEMBAYARAN' AND deleted_at IS NULL THEN 1 END) as menunggu_pembayaran,
        COUNT(CASE WHEN payment_status = 'LUNAS' AND deleted_at IS NULL AND cancelled_at IS NULL THEN 1 END) as sudah_lunas,
        COUNT(CASE WHEN payment_status = 'DIBATALKAN' THEN 1 END) as dibatalkan,
        COUNT(CASE WHEN (queue_status = 'MENUNGGU' OR queue_status = 'DIPANGGIL') AND deleted_at IS NULL THEN 1 END) as menunggu_foto,
        COUNT(CASE WHEN order_status IN ('PROSES', 'MENUNGGU_PROSES_CETAK') AND queue_status IN ('SELESAI', 'SELESAI_FOTO') AND deleted_at IS NULL THEN 1 END) as menunggu_cetak
      FROM transactions 
      WHERE event_id = $1
    `, [event.id]);

    res.json({ event, stats: statsRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPenerimaDashboard = async (req, res) => {
  try {
    const eventRes = await pool.query('SELECT * FROM events WHERE is_active = true LIMIT 1');
    const event = eventRes.rows.length > 0 ? eventRes.rows[0] : null;
    
    if (!event) return res.json({ event: null, stats: null });

    const statsRes = await pool.query(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND deleted_at IS NULL THEN 1 END) as pendaftar_hari_ini,
        COUNT(CASE WHEN payment_status = 'MENUNGGU_PEMBAYARAN' AND deleted_at IS NULL THEN 1 END) as menunggu_pembayaran,
        COUNT(CASE WHEN (queue_status = 'MENUNGGU' OR queue_status = 'DIPANGGIL') AND deleted_at IS NULL THEN 1 END) as menunggu_foto
      FROM transactions 
      WHERE event_id = $1
    `, [event.id]);

    res.json({ event, stats: statsRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOwnerDashboard = async (req, res) => {
  try {
    const { event_id } = req.query;
    let eventCondition = '';
    let params = [];
    if (event_id) {
      eventCondition = 'WHERE event_id = $1';
      params.push(event_id);
    }
    
    const statsRes = await pool.query(`
      SELECT 
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as total_transaksi,
        COALESCE(SUM(CASE WHEN payment_status = 'LUNAS' AND deleted_at IS NULL AND cancelled_at IS NULL THEN total_amount ELSE 0 END), 0) as total_pendapatan,
        COUNT(CASE WHEN payment_status = 'LUNAS' AND deleted_at IS NULL AND cancelled_at IS NULL THEN 1 END) as total_lunas,
        COUNT(CASE WHEN payment_status = 'MENUNGGU_PEMBAYARAN' AND deleted_at IS NULL THEN 1 END) as total_belum_lunas,
        COUNT(CASE WHEN payment_status = 'DIBATALKAN' THEN 1 END) as total_dibatalkan
      FROM transactions 
      ${eventCondition}
    `, params);

    res.json({ stats: statsRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const PDFDocument = require('pdfkit');
exports.exportOwnerReportPDF = async (req, res) => {
  try {
    const { event_id, start_date, end_date, status, payment_method } = req.query;
    
    let query = `
      SELECT t.*, 
             e.name as event_name, 
             pc.name as category_name, 
             u1.name as created_by_name,
             u2.name as verified_by_name
      FROM transactions t
      LEFT JOIN events e ON t.event_id = e.id
      LEFT JOIN participant_categories pc ON t.participant_category_id = pc.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.verified_by = u2.id
      WHERE t.deleted_at IS NULL
    `;
    let params = [];
    
    if (event_id) {
      params.push(event_id);
      query += ` AND t.event_id = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(t.created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(t.created_at) <= $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND t.payment_status = $${params.length}`;
    }
    if (payment_method) {
      params.push(payment_method);
      query += ` AND t.payment_method = $${params.length}`;
    }
    query += ' ORDER BY t.created_at DESC';

    const transRes = await pool.query(query, params);
    const transactions = transRes.rows;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Owner.pdf"');
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN TRANSAKSI', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Tanggal Export: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
    doc.moveDown(2);

    let total_pendapatan = 0;
    let total_lunas = 0;
    let total_dibatalkan = 0;
    transactions.forEach(t => {
      if (t.payment_status === 'LUNAS' && !t.cancelled_at) {
        total_pendapatan += parseFloat(t.total_amount || 0);
        total_lunas++;
      }
      if (t.payment_status === 'DIBATALKAN') {
        total_dibatalkan++;
      }
    });

    doc.font('Helvetica-Bold').text('Ringkasan:', { underline: true });
    doc.font('Helvetica').text(`Total Transaksi: ${transactions.length}`);
    doc.text(`Total Lunas: ${total_lunas}`);
    doc.text(`Total Belum Lunas: ${transactions.length - total_lunas}`);
    doc.text(`Total Pemasukan (Lunas): Rp ${total_pendapatan.toLocaleString('id-ID')}`);
    doc.moveDown(2);

    const startX = 30;
    let y = doc.y;

    // Header Table
    doc.font('Helvetica-Bold');
    doc.text('Tgl', startX, y, { width: 60 });
    doc.text('Nama', startX + 60, y, { width: 95 });
    doc.text('Metode', startX + 155, y, { width: 45 });
    doc.text('Total', startX + 200, y, { width: 65 });
    doc.text('Bayar', startX + 265, y, { width: 65 });
    doc.text('Kembali', startX + 330, y, { width: 65 });
    doc.text('Status', startX + 395, y, { width: 55 });
    doc.text('Petugas', startX + 450, y, { width: 80 });
    
    y += 15;
    doc.moveTo(startX, y).lineTo(560, y).stroke();
    y += 5;

    doc.font('Helvetica').fontSize(8);
    for (const t of transactions) {
      if (y > 750) {
        doc.addPage();
        y = 30;
        doc.font('Helvetica').fontSize(8);
      }
      doc.text(new Date(t.created_at).toLocaleDateString('id-ID'), startX, y, { width: 60 });
      doc.text((t.participant_name || '').substring(0, 18), startX + 60, y, { width: 95 });
      doc.text(t.payment_method || '-', startX + 155, y, { width: 45 });
      doc.text(`Rp ${parseFloat(t.total_amount || 0).toLocaleString('id-ID')}`, startX + 200, y, { width: 65 });
      doc.text(`Rp ${t.amount_received ? parseFloat(t.amount_received).toLocaleString('id-ID') : '-'}`, startX + 265, y, { width: 65 });
      doc.text(`Rp ${t.change_amount ? parseFloat(t.change_amount).toLocaleString('id-ID') : '-'}`, startX + 330, y, { width: 65 });
      doc.text(t.payment_status || '-', startX + 395, y, { width: 55 });
      doc.text((t.created_by_name || '-').substring(0, 15), startX + 450, y, { width: 80 });
      y += 15;
    }

    doc.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error saat generate PDF' });
    }
  }
};
