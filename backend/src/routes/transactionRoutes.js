const express = require('express');
const router = express.Router();
const controller = require('../controllers/transactionController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Used by PENERIMA (and KASIR)
router.get('/active-event', controller.getActiveEventContext);
router.post('/', requireRole(['PENERIMA', 'KASIR']), controller.createTransaction);

// Used by KASIR
router.get('/', requireRole(['KASIR', 'PENERIMA', 'OWNER']), controller.getTransactions);
router.get('/export/pdf', requireRole(['KASIR', 'OWNER']), controller.exportTransactionsPDF);
router.patch('/:id/verify', requireRole(['KASIR']), controller.verifyPayment);
router.patch('/:id/verify-payment', requireRole(['KASIR']), controller.verifyPayment); // Alias
router.get('/:id', requireRole(['KASIR', 'PENERIMA', 'OWNER']), controller.getTransactionById);
router.put('/:id', requireRole(['PENERIMA', 'KASIR']), controller.updateTransaction);
router.delete('/:id', requireRole(['PENERIMA', 'KASIR', 'OWNER']), controller.deleteRegistration);
router.post('/:id/cancel', requireRole(['KASIR', 'OWNER']), controller.cancelTransaction);

module.exports = router;
