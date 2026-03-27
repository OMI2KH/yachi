const express = require('express');
const router = express.Router();
const MonetizationController = require('../controllers/monetizationController.js');
const authMiddleware = require('../middleware/auth');

router.get('/plans', MonetizationController.listPlans);
router.post('/purchase/plan', authMiddleware, MonetizationController.purchasePlan);
router.post('/purchase/badge', authMiddleware, MonetizationController.purchaseBadge);
// public webhook endpoint per provider
router.post('/webhook/:provider', express.raw({ type: '*/*' }), MonetizationController.webhook);

module.exports = router;
