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
    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event wajib dipilih untuk menampilkan laporan.' });
    }

    let eventCondition = 'WHERE event_id = $1';
    let params = [event_id];
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
    const { getTransactionsData } = require('../utils/transactionQueryHelper');
    const { transactions, eventId } = await getTransactionsData(req.query, true);

    const eventRes = await pool.query('SELECT name FROM events WHERE id = $1', [eventId]);
    const eventName = eventRes.rows.length > 0 ? eventRes.rows[0].name.replace(/[^a-zA-Z0-9 ]/g, '-') : 'Event';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Laporan_Transaksi_${eventName.replace(/\s+/g, '_')}_${dateStr}.pdf`;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error saat generate PDF' });
    }
  }
};
