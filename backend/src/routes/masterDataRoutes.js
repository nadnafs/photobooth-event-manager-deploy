const express = require('express');
const router = express.Router();
const controller = require('../controllers/masterDataController');
const { verifyToken, requireRole } = require('../middleware/auth');

const mAuth = [verifyToken, requireRole(['KASIR', 'OWNER'])];

// Participant Categories
router.get('/events/:eventId/participant-categories', mAuth, controller.getParticipantCategories);
router.post('/events/:eventId/participant-categories', mAuth, controller.createParticipantCategory);
router.put('/participant-categories/:id', mAuth, controller.updateParticipantCategory);
router.patch('/participant-categories/:id/status', mAuth, controller.toggleParticipantCategoryStatus);

// Product Categories
router.get('/events/:eventId/product-categories', mAuth, controller.getProductCategories);
router.post('/events/:eventId/product-categories', mAuth, controller.createProductCategory);
router.put('/product-categories/:id', mAuth, controller.updateProductCategory);
router.patch('/product-categories/:id/status', mAuth, controller.toggleProductCategoryStatus);

// Products
router.get('/events/:eventId/products', mAuth, controller.getProducts);
router.post('/events/:eventId/products', mAuth, controller.createProduct);
router.put('/products/:id', mAuth, controller.updateProduct);
router.patch('/products/:id/status', mAuth, controller.toggleProductStatus);

// Booths
router.get('/events/:eventId/booths', mAuth, controller.getBooths);
router.post('/events/:eventId/booths', mAuth, controller.createBooth);
router.put('/booths/:id', mAuth, controller.updateBooth);
router.patch('/booths/:id/status', mAuth, controller.toggleBoothStatus);

module.exports = router;
