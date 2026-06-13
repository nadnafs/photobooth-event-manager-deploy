const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.get('/dashboard-kasir', requireRole(['KASIR']), controller.getKasirDashboard);
router.get('/dashboard-penerima', requireRole(['PENERIMA']), controller.getPenerimaDashboard);
router.get('/dashboard-owner', requireRole(['OWNER']), controller.getOwnerDashboard);
router.get('/transactions-export', requireRole(['OWNER']), controller.exportOwnerReportPDF);

module.exports = router;
