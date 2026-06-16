const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');

// Helper to validate UUID
const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Common function to compile dynamic filters
function buildProductSalesFilters(queryParams) {
  const { event_id, category_id, product_id, start_date, end_date, payment_status, payment_method } = queryParams;

  let paramIndex = 1;
  const params = [];
  const whereClauses = [
    `t.event_id = $${paramIndex++}`,
    `t.deleted_at IS NULL`,
    `t.cancelled_at IS NULL`
  ];
  params.push(event_id);

  if (category_id && isUUID.test(category_id)) {
    whereClauses.push(`p.category_id = $${paramIndex++}`);
    params.push(category_id);
  }

  if (product_id && isUUID.test(product_id)) {
    whereClauses.push(`ti.product_id = $${paramIndex++}`);
    params.push(product_id);
  }

  if (start_date) {
    whereClauses.push(`DATE(t.created_at) >= $${paramIndex++}`);
    params.push(start_date);
  }

  if (end_date) {
    whereClauses.push(`DATE(t.created_at) <= $${paramIndex++}`);
    params.push(end_date);
  }

  // payment_status: default to 'LUNAS' if not specified
  const statusFilter = payment_status || 'LUNAS';
  if (statusFilter !== 'ALL') {
    whereClauses.push(`t.payment_status = $${paramIndex++}`);
    params.push(statusFilter);
  }

  if (payment_method && payment_method !== 'ALL') {
    whereClauses.push(`t.payment_method = $${paramIndex++}`);
    params.push(payment_method);
  }

  return { whereClauses, params };
}

// 1. Get Product Sales Report List
exports.getProductSalesReport = async (req, res) => {
  try {
    const { event_id, category_id, product_id, start_date, end_date, payment_status, payment_method, page = 1, limit = 10, sort_by = 'product_name', sort_order = 'asc' } = req.query;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event wajib dipilih.' });
    }

    if (!isUUID.test(event_id)) {
      return res.status(400).json({ success: false, message: 'ID Event tidak valid.' });
    }

    // Verify Event exists
    const eventRes = await pool.query('SELECT id, name FROM events WHERE id = $1', [event_id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event tidak ditemukan.' });
    }
    const eventName = eventRes.rows[0].name;

    // Verify Category if provided
    if (category_id && isUUID.test(category_id)) {
      const catRes = await pool.query('SELECT id FROM product_categories WHERE id = $1 AND event_id = $2', [category_id, event_id]);
      if (catRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Kategori tidak ditemukan pada event yang dipilih.' });
      }
    }

    // Verify Product if provided
    if (product_id && isUUID.test(product_id)) {
      const prodRes = await pool.query('SELECT id FROM products WHERE id = $1 AND event_id = $2', [product_id, event_id]);
      if (prodRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Produk tidak ditemukan pada event yang dipilih.' });
      }
    }

    // Validate dates
    if (start_date && end_date) {
      if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ success: false, message: 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.' });
      }
    }

    const { whereClauses, params } = buildProductSalesFilters(req.query);

    // Get Summary statistics first (always based on LUNAS for sales and products sold)
    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN t.payment_status = 'LUNAS' THEN ti.quantity ELSE 0 END), 0)::int AS total_products_sold,
        COALESCE(SUM(CASE WHEN t.payment_status = 'LUNAS' THEN ti.subtotal ELSE 0 END), 0)::float AS total_sales,
        COUNT(DISTINCT t.id)::int AS total_transactions,
        COUNT(DISTINCT COALESCE(ti.product_id::text, COALESCE(NULLIF(TRIM(ti.product_name_snapshot), ''), p.name, 'Produk Tidak Dikenal')))::int AS unique_products
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE ${whereClauses.join(' AND ')}
    `;
    const summaryRes = await pool.query(summaryQuery, params);
    const summary = summaryRes.rows[0];

    // Fetch all products matching filters to calculate contribution and varies prices in JS
    const listQuery = `
      SELECT
        ti.product_id,
        COALESCE(NULLIF(TRIM(ti.product_name_snapshot), ''), p.name, 'Produk Tidak Dikenal') AS product_name,
        COALESCE(NULLIF(TRIM(ti.product_category_name_snapshot), ''), pc.name, 'Tanpa Kategori') AS category_name,
        MIN(ti.price)::float AS min_price,
        MAX(ti.price)::float AS max_price,
        COUNT(DISTINCT t.id)::int AS transaction_count,
        COALESCE(SUM(ti.quantity), 0)::int AS total_quantity,
        COALESCE(SUM(CASE WHEN t.payment_status = 'LUNAS' THEN ti.subtotal ELSE 0 END), 0)::float AS total_sales
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY
        ti.product_id,
        COALESCE(NULLIF(TRIM(ti.product_name_snapshot), ''), p.name, 'Produk Tidak Dikenal'),
        COALESCE(NULLIF(TRIM(ti.product_category_name_snapshot), ''), pc.name, 'Tanpa Kategori')
    `;
    const listRes = await pool.query(listQuery, params);
    
    const totalSalesAll = summary.total_sales;

    // Map rows and compute derived values
    let processedProducts = listRes.rows.map(row => {
      const minPrice = row.min_price;
      const maxPrice = row.max_price;
      const unit_price = minPrice === maxPrice ? minPrice : 'Bervariasi';

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        category_name: row.category_name,
        min_price: minPrice,
        max_price: maxPrice,
        unit_price,
        transaction_count: row.transaction_count,
        total_quantity: row.total_quantity,
        total_sales: row.total_sales,
        contribution_percentage: totalSalesAll > 0 ? parseFloat(((row.total_sales / totalSalesAll) * 100).toFixed(2)) : 0
      };
    });

    // In-memory sorting to support 'Bervariasi' and contribution_percentage correctly
    const allowedSorts = ['product_name', 'category_name', 'transaction_count', 'total_quantity', 'total_sales', 'unit_price', 'contribution_percentage'];
    const activeSortBy = allowedSorts.includes(sort_by) ? sort_by : 'product_name';
    const activeOrder = sort_order === 'desc' ? -1 : 1;

    processedProducts.sort((a, b) => {
      let valA = a[activeSortBy];
      let valB = b[activeSortBy];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * activeOrder;
      }
      // Put string 'Bervariasi' at the end of pricing sorting
      if (typeof valA === 'string') return activeOrder;
      if (typeof valB === 'string') return -activeOrder;

      return (valA - valB) * activeOrder;
    });

    // Pagination
    const totalItems = processedProducts.length;
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const totalPages = Math.ceil(totalItems / parsedLimit);
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedProducts = processedProducts.slice(startIndex, startIndex + parsedLimit);

    res.json({
      success: true,
      event: {
        id: event_id,
        name: eventName
      },
      filters: {
        category_id: category_id || null,
        product_id: product_id || null,
        start_date: start_date || null,
        end_date: end_date || null,
        payment_status: payment_status || 'LUNAS',
        payment_method: payment_method || null
      },
      summary,
      products: paginatedProducts,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total_items: totalItems,
        total_pages: totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching product sales report:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat laporan produk. Silakan coba lagi.' });
  }
};

// 2. Get Product Sales Details
exports.getProductSalesDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const { event_id, product_name } = req.query;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event wajib dipilih.' });
    }

    if (!isUUID.test(event_id)) {
      return res.status(400).json({ success: false, message: 'ID Event tidak valid.' });
    }

    let query = `
      SELECT
        t.receipt_number,
        t.participant_name,
        ti.price::float AS price,
        ti.quantity::int AS quantity,
        ti.subtotal::float AS subtotal,
        t.payment_method,
        t.created_at
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      WHERE t.event_id = $1
        AND t.deleted_at IS NULL
        AND t.cancelled_at IS NULL
    `;

    const params = [event_id];

    if (productId && productId !== 'null' && productId !== 'undefined' && isUUID.test(productId)) {
      query += ` AND ti.product_id = $2`;
      params.push(productId);
    } else {
      query += ` AND COALESCE(NULLIF(TRIM(ti.product_name_snapshot), ''), p.name, 'Produk Tidak Dikenal') = $2`;
      params.push(product_name || '');
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      details: result.rows
    });

  } catch (error) {
    console.error('Error fetching product sales details:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat rincian transaksi produk. Silakan coba lagi.' });
  }
};

// 3. Export PDF
exports.exportProductSalesReportPDF = async (req, res) => {
  try {
    const { event_id } = req.query;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'Event wajib dipilih.' });
    }

    // Verify Event exists
    const eventRes = await pool.query('SELECT name FROM events WHERE id = $1', [event_id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event tidak ditemukan.' });
    }
    const eventName = eventRes.rows[0].name;

    const { whereClauses, params } = buildProductSalesFilters(req.query);

    // Fetch all matching items using the identical query helper filters
    const listQuery = `
      SELECT
        ti.product_id,
        COALESCE(NULLIF(TRIM(ti.product_name_snapshot), ''), p.name, 'Produk Tidak Dikenal') AS product_name,
        COALESCE(NULLIF(TRIM(ti.product_category_name_snapshot), ''), pc.name, 'Tanpa Kategori') AS category_name,
        MIN(ti.price)::float AS min_price,
        MAX(ti.price)::float AS max_price,
        COUNT(DISTINCT t.id)::int AS transaction_count,
        COALESCE(SUM(ti.quantity), 0)::int AS total_quantity,
        COALESCE(SUM(CASE WHEN t.payment_status = 'LUNAS' THEN ti.subtotal ELSE 0 END), 0)::float AS total_sales
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY
        ti.product_id,
        COALESCE(NULLIF(TRIM(ti.product_name_snapshot), ''), p.name, 'Produk Tidak Dikenal'),
        COALESCE(NULLIF(TRIM(ti.product_category_name_snapshot), ''), pc.name, 'Tanpa Kategori')
      ORDER BY product_name ASC
    `;
    const listRes = await pool.query(listQuery, params);

    const products = listRes.rows;
    let totalSalesAll = products.reduce((acc, curr) => acc + curr.total_sales, 0);
    let totalQtyAll = products.reduce((acc, curr) => acc + curr.total_quantity, 0);

    const cleanEventName = eventName.replace(/[^a-zA-Z0-9 ]/g, '-').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `laporan-penjualan-produk-${cleanEventName}-${dateStr}.pdf`;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Title and Header
    doc.fontSize(16).font('Helvetica-Bold').text('LAPORAN PENJUALAN PER PRODUK', { align: 'center' });
    doc.fontSize(12).text(eventName.toUpperCase(), { align: 'center' });
    doc.moveDown(1);

    // Meta filters info
    doc.fontSize(9).font('Helvetica');
    const startText = req.query.start_date ? req.query.start_date : 'Awal';
    const endText = req.query.end_date ? req.query.end_date : 'Akhir';
    doc.text(`Periode: ${startText} s/d ${endText}`, 30, doc.y);
    doc.text(`Status Pembayaran: ${req.query.payment_status || 'LUNAS'}`, 30, doc.y);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 30, doc.y);
    doc.moveDown(1.5);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('No.', 30, tableTop);
    doc.text('Produk', 55, tableTop);
    doc.text('Kategori', 230, tableTop);
    doc.text('Harga', 340, tableTop, { width: 70, align: 'right' });
    doc.text('Terjual', 420, tableTop, { width: 50, align: 'right' });
    doc.text('Total Penjualan', 480, tableTop, { width: 90, align: 'right' });

    doc.moveTo(30, tableTop + 13).lineTo(570, tableTop + 13).stroke();

    let y = tableTop + 18;
    doc.font('Helvetica').fontSize(8);

    products.forEach((row, i) => {
      if (y > 750) {
        doc.addPage();
        y = 30;
        doc.font('Helvetica').fontSize(8);
      }
      doc.text(`${i + 1}`, 30, y);
      doc.text(row.product_name, 55, y, { width: 170 });
      doc.text(row.category_name, 230, y, { width: 100 });

      // Price Formatting
      const minPrice = parseFloat(row.min_price || 0);
      const maxPrice = parseFloat(row.max_price || 0);
      const priceText = minPrice === maxPrice ? minPrice.toLocaleString('id-ID') : 'Bervariasi';
      doc.text(priceText, 340, y, { width: 70, align: 'right' });

      doc.text(row.total_quantity.toLocaleString('id-ID'), 420, y, { width: 50, align: 'right' });
      doc.text(parseFloat(row.total_sales).toLocaleString('id-ID'), 480, y, { width: 90, align: 'right' });

      y += 18;
    });

    doc.moveTo(30, y).lineTo(570, y).stroke();
    y += 10;

    // Summary at the bottom
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Total Produk Terjual:', 30, y);
    doc.text(totalQtyAll.toLocaleString('id-ID'), 200, y);
    
    doc.text('Total Penjualan:', 330, y);
    doc.text('Rp ' + totalSalesAll.toLocaleString('id-ID'), 450, y, { width: 120, align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Error exporting PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error saat generate PDF' });
    }
  }
};
