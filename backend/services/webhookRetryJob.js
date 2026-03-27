const logger = require('../utils/logger');

class WebhookRetryJob {
  constructor({ intervalMs = 60000, limit = 100 } = {}) {
    this.intervalMs = intervalMs;
    this.limit = limit;
    this.running = false;
  }

  async runOnce() {
    const { WebhookEvent } = require('../models');
    if (!WebhookEvent) return;

    // Find failed/unprocessed webhooks with attempts < 5
    const retries = await WebhookEvent.findAll({
      where: {
        processed: false,
        attempts: { [require('../models').Op.lt]: 5 }
      },
      limit: this.limit
    });

    for (const ev of retries) {
      try {
        // Reconstruct the event and call paymentService.processWebhookEvent
        const { paymentService } = require('./paymentService');
        const provider = ev.provider;
        const payload = ev.rawPayload || {};
        const headers = ev.headers || {};

        await paymentService.handleWebhook(provider, payload, headers.signature || null);

        // Mark processed
        ev.processed = true;
        ev.processedAt = new Date();
        await ev.save();
        logger.info(`Reprocessed webhook ${ev.eventId}`);
      } catch (err) {
        ev.attempts = (ev.attempts || 0) + 1;
        ev.lastError = err.message || String(err);
        await ev.save();
        logger.warn(`Retry failed for webhook ${ev.eventId}: ${err.message || err}`);
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._timer = setInterval(() => this.runOnce().catch(err => logger.error('WebhookRetryJob runOnce error', err)), this.intervalMs);
    logger.info('WebhookRetryJob started');
  }

  stop() {
    if (!this.running) return;
    clearInterval(this._timer);
    this.running = false;
    logger.info('WebhookRetryJob stopped');
  }
}

module.exports = { WebhookRetryJob };
