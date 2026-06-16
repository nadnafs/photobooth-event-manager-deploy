const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const productSalesController = require('../controllers/productSalesReportController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.get('/dashboard-kasir', requireRole(['KASIR']), controller.getKasirDashboard);
router.get('/dashboard-penerima', requireRole(['PENERIMA']), controller.getPenerimaDashboard);
router.get('/dashboard-owner', requireRole(['OWNER']), controller.getOwnerDashboard);
router.get('/transactions-export', requireRole(['OWNER']), controller.exportOwnerReportPDF);

// New Product Sales Report Routes
router.get('/product-sales', requireRole(['OWNER']), productSalesController.getProductSalesReport);
router.get('/product-sales/pdf', requireRole(['OWNER']), productSalesController.exportProductSalesReportPDF);
router.get('/product-sales/:productId/details', requireRole(['OWNER']), productSalesController.getProductSalesDetails);

module.exports = router;

