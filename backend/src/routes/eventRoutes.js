const express = require('express');
const router = express.Router();
const { getEvents, getEventById, createEvent, updateEvent, updateEventStatus, resetReceiptNumber } = require('../controllers/eventController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', requireRole(['KASIR', 'PENERIMA', 'OWNER']), getEvents);
router.get('/:id', requireRole(['KASIR', 'PENERIMA', 'OWNER']), getEventById);
router.post('/', requireRole(['KASIR', 'OWNER']), createEvent);
router.put('/:id', requireRole(['KASIR', 'OWNER']), updateEvent);
router.put('/:id/status', requireRole(['KASIR', 'OWNER']), updateEventStatus);
router.post('/:id/reset-receipt', requireRole(['KASIR', 'OWNER']), resetReceiptNumber);

module.exports = router;
