jest.mock('axios');
const axios = require('axios');

const { PaymentService } = require('../services/paymentService');

describe('Payment provider processing (mocked axios)', () => {
  test('processWithChapa parses success response', async () => {
    const svc = new PaymentService({ skipInit: true });
    const provider = {
      name: 'chapa',
      baseURL: 'https://api.chapa.co/v1',
      headers: { 'Authorization': 'Bearer key' },
      supportedMethods: ['CARD']
    };

    axios.post.mockResolvedValueOnce({ data: { status: 'success', data: { tx_ref: 'tx123', checkout_url: 'https://pay', qr_code: null } } });

    const res = await svc.processWithChapa(provider, { amount: 100 });
    expect(res).toHaveProperty('reference', 'tx123');
    expect(res).toHaveProperty('checkoutUrl', 'https://pay');
  });

  test('processWithTelebirr parses success response', async () => {
    const svc = new PaymentService({ skipInit: true });
    const provider = {
      name: 'telebirr',
      baseURL: 'https://api.telebirr.et',
      appKey: 'app',
      appSecret: 'secret'
    };

    axios.post.mockResolvedValueOnce({ data: { code: '200', data: { outTradeNo: 'o123', payInfo: 'https://tb', qrCode: null } } });

    const res = await svc.processWithTelebirr(provider, { amount: 50 });
    expect(res).toHaveProperty('reference', 'o123');
    expect(res).toHaveProperty('checkoutUrl', 'https://tb');
  });
});
