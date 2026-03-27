## PR: Harden payments, webhook idempotency, and monitoring

This PR includes the following changes aimed at making Yachi production-ready for Ethiopian payment providers:

- Webhook durability and audit logging
  - Added `webhook_events` table (migration) and `WebhookEvent` model.
  - Stored `raw_payload`, `headers`, `attempts`, and `last_error` for each webhook event.
  - DB-backed idempotency: insert `WebhookEvent` prior to processing; unique constraint prevents duplicates.
  - Redis fallback locking remains for environments where DB inserts fail.

- Webhook retry job
  - `backend/services/webhookRetryJob.js`: background job to reprocess failed/unprocessed webhook events (with exponential backoff via attempts counter).

- Payment service hardening
  - `paymentService`: added signature verification, normalized webhook parsing, DB-backed idempotency, and marking processed status.
  - Exported `PaymentService` for better testability and added `skipInit` option for unit tests.

- Tests
  - Added axios-mocked tests for Chapa and Telebirr provider flows.
  - Added a test for the CBE adapter stub.

- Observability
  - Optional Sentry integration added in `server.js` (safe if `@sentry/node` is not installed).

### How to run locally (staging)

1. Install deps: `npm install --legacy-peer-deps`
2. Create `.env` from `.env.example` and set DB connection
3. Run migrations and seeders:
   - `npx sequelize db:migrate`
   - `npx sequelize db:seed:all`
4. Start the server: `npm start`
5. (Optional) Start the webhook retry job in a worker process or background:
   - `node -e "require('./services/webhookRetryJob').WebhookRetryJob().start()"`
    - `node -e "(async ()=>{ const { WebhookRetryJob } = require('./services/webhookRetryJob'); const job = new WebhookRetryJob({ intervalMs:60000 }); job.start(); })()"`
    - Or use the provided PowerShell script: `backend\scripts\start-webhook-retry.ps1`

### Notes
- The CBE Birr adapter remains a stub until provider sandbox docs/credentials are provided.
- CI may need a pinned `package-lock.json` generated on a machine with network access to avoid registry issues.

### Review checklist
- [ ] Run unit tests locally and confirm they pass
- [ ] Run migrations in staging and confirm `webhook_events` table is created
- [ ] Confirm webhook events are logged in `webhook_events` on incoming provider calls
- [ ] Provide CBE sandbox docs/credentials to finalize adapter
