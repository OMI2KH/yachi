const { CbeAdapter } = require('../services/cbeAdapter');

describe('CbeAdapter (stub) - createPayment shape', () => {
  test('createPayment returns expected shape', async () => {
    const adapter = new CbeAdapter({ baseURL: 'https://example.test', merchantId: 'm123', apiKey: 'k123' });
    const res = await adapter.createPayment({ amount: 1000, currency: 'ETB', reference: 'r1', metadata: { serviceId: 's1' } });
    expect(res).toHaveProperty('success', true);
    expect(res).toHaveProperty('reference');
    expect(res).toHaveProperty('expiresAt');
    expect(res).toHaveProperty('instructions');
  });
});
