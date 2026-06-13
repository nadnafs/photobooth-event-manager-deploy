const express = require('express');
const router = express.Router();
const controller = require('../controllers/orderController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole(['KASIR']));

router.patch('/:id/status', controller.updateOrderStatus); // Old
router.patch('/:id/ready-pickup', (req, res) => { req.body.status = 'SIAP'; controller.updateOrderStatus(req, res); });
router.patch('/:id/picked-up', (req, res) => { req.body.status = 'DIAMBIL'; controller.updateOrderStatus(req, res); });

module.exports = router;
