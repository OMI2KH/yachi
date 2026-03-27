# Payment provider API template

Use this template to add payment provider integration details.

1. Create a service in `services/payment/*` using the adapter pattern.
2. Add provider-specific keys to `.env` (see `.env.production.example`).

Example placeholder:

```js
// services/payment/chapaAdapter.js (template)
module.exports = {
  initialize: (opts) => {
    // opts: { apiKey: process.env.CHAPA_KEY }
  },
  createPayment: async (paymentData) => {
    // TODO: Implement API call
    throw new Error('Not implemented');
  },
  verifyPayment: async (id) => {
    throw new Error('Not implemented');
  }
};
```

Copy this into the `services/payment` folder and adjust your controllers to call these methods. Keep controllers thin and delegate to adapters.
