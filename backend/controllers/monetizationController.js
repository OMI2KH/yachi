const { monetizationService } = require('../services/monetizationService');
const { PremiumPlan, BadgePurchase, Subscription } = require('../models');

const MonetizationController = {
  async listPlans(req, res) {
    try {
      const plans = await PremiumPlan.findAll({ where: { isActive: true } });
      res.json({ success: true, plans });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async purchasePlan(req, res) {
    try {
      const { planId, provider } = req.body;
      const plan = await PremiumPlan.findByPk(planId);
      if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

      const result = await monetizationService.purchasePlan({
        userId: req.user?.id || req.body.userId,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        provider,
        paymentInfo: req.body.paymentInfo || {}
      });

      // create a placeholder subscription or record will be created after webhook verification
      await Subscription.create({
        userId: req.user?.id || req.body.userId,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
        recurringAmount: plan.price,
        currency: plan.currency
      });

      res.json({ success: true, checkout: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async purchaseBadge(req, res) {
    try {
      const { badgeType, amount, currency, provider } = req.body;

      const result = await monetizationService.purchaseBadge({
        userId: req.user?.id || req.body.userId,
        badgeType,
        amount,
        currency: currency || 'ETB',
        provider,
        paymentInfo: req.body.paymentInfo || {}
      });

      // create badge purchase record with status initiated
      await BadgePurchase.create({
        userId: req.user?.id || req.body.userId,
        badgeType,
        amount: amount,
        currency: currency || 'ETB',
        status: 'initiated',
        paymentReference: result.reference || null
      });

      res.json({ success: true, checkout: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async webhook(req, res) {
    try {
      const provider = req.params.provider;
      const signature = req.headers['x-signature'] || req.headers['x-chapa-signature'] || req.headers['x-telebirr-signature'] || '';
      const body = req.rawBody || JSON.stringify(req.body);

      await monetizationService.handleProviderWebhook(provider, body, signature);
      res.status(200).send('OK');
    } catch (err) {
      res.status(400).send('Webhook handling error');
    }
  }
};

module.exports = MonetizationController;
