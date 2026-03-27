# Payment Webhook Verification

This document provides examples for verifying incoming webhook requests from the Ethiopian payment gateways used by the project: Chapa and Telebirr. Use these examples as implementation guides; always confirm with the provider's current docs for production usage.

## General guidance

- Always read the raw request body (not the parsed JSON) when verifying signatures.
- Use constant-time string comparison when comparing signatures.
- Log and monitor webhook deliveries; respond with proper HTTP status codes (2xx for success, 4xx/5xx for errors).

## Chapa (example)

Chapa typically signs webhooks using a webhook secret (HMAC). The exact header name and hashing algo may vary; below is a safe general approach using HMAC-SHA256.

Example (Node.js / Express):

```js
const crypto = require('crypto');

function verifyChapaWebhook(req, res, next) {
  const raw = req.rawBody || '';
  const signatureHeader = req.headers['x-chapa-signature'] || req.headers['x-signature'] || '';
  const secret = process.env.CHAPA_WEBHOOK_SECRET || '';

  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  // constant-time compare
  const valid = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatureHeader));
  if (!valid) return res.status(401).send('Invalid signature');

  // parse payload (safe since we verified signature)
  req.chapa = JSON.parse(raw);
  next();
}
```

Example curl payload (delivery simulation):

```bash
PAYLOAD='{"amount":1000,"currency":"ETB","reference":"ref_123"}'
SECRET='your_chapa_webhook_secret'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl -X POST http://localhost:3000/api/webhooks/chapa \
  -H "Content-Type: application/json" \
  -H "x-chapa-signature: $SIG" \
  -d "$PAYLOAD"
```

## Telebirr (example)

Telebirr's webhook signature format may include headers like `X-Telebirr-Signature`, timestamps, and a computed hash using your app secret. The example below shows a common pattern: signing ordered concatenated fields and hashing with HMAC-SHA256.

Example (Node.js / Express):

```js
const crypto = require('crypto');

function verifyTelebirrWebhook(req, res, next) {
  const raw = req.rawBody || '';
  const signatureHeader = req.headers['x-telebirr-signature'] || '';
  const timestamp = req.headers['x-telebirr-timestamp'] || '';
  const nonce = req.headers['x-telebirr-nonce'] || '';
  const secret = process.env.TELEBIRR_APP_SECRET || '';

  // Example canonical string: timestamp + '.' + nonce + '.' + raw
  const canonical = `${timestamp}.${nonce}.${raw}`;
  const hmac = crypto.createHmac('sha256', secret).update(canonical).digest('hex');

  const valid = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatureHeader));
  if (!valid) return res.status(401).send('Invalid signature');

  req.telebirr = JSON.parse(raw);
  next();
}
```

Example curl delivery (simulation):

```bash
PAYLOAD='{"order_id":"123","amount":5000}'
TS=$(date +%s)
NONCE=$(openssl rand -hex 12)
SECRET='your_telebirr_app_secret'
CANON=$(printf "%s.%s.%s" "$TS" "$NONCE" "$PAYLOAD")
SIG=$(echo -n "$CANON" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl -X POST http://localhost:3000/api/webhooks/telebirr \
  -H "Content-Type: application/json" \
  -H "x-telebirr-timestamp: $TS" \
  -H "x-telebirr-nonce: $NONCE" \
  -H "x-telebirr-signature: $SIG" \
  -d "$PAYLOAD"
```

## CBE Birr

If you integrate CBE Birr, consult their official docs for webhook signing details. The same general rules apply: read raw body, compute signature using the secret they provide, compare in constant time, and return 2xx on success.

## Other notes

- Store the webhook signing secrets securely (e.g., in environment variables or a secrets manager).
- Record delivery attempt metadata (headers, timestamp, raw payload) for troubleshooting.
- When in doubt, contact the provider or use their sandbox environment to confirm signature format.
