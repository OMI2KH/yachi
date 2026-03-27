const { PaymentService } = require('../services/paymentService');

describe('PaymentService (smoke tests)', () => {
  test('constructs and exposes expected provider keys', () => {
    // skip init to avoid network calls during tests
    const svc = new PaymentService({ skipInit: true });
    expect(svc).toHaveProperty('providers');
    // providers object should at least contain the configured provider slots
    expect(Object.prototype.hasOwnProperty.call(svc.providers, 'chapa')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(svc.providers, 'telebirr')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(svc.providers, 'cbebirr')).toBe(true);
  });
});
