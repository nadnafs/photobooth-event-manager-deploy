const express = require('express');
const router = express.Router();
const controller = require('../controllers/queueController');
const { verifyToken } = require('../middleware/auth');

// Public Routes
router.get('/public/status/:queueCode', controller.getPublicStatus);
router.get('/public/search', controller.searchPublicQueue);
router.get('/tv', controller.getTvData);

// Protected Routes
router.use(verifyToken);
router.get('/status', controller.getStatus);
router.post('/call-next', controller.callNext);
router.post('/:id/recall', controller.recallQueue);
router.post('/:id/finish', controller.finishQueue);
router.post('/:id/skip', controller.skipQueue);
router.post('/test-voice', controller.testVoice);

// Compatibility route
router.get('/booth/:boothId', controller.getBoothQueue);

module.exports = router;
