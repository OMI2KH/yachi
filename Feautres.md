Yachi — Features (A → Z)

Overview
- Yachi is a cross-platform marketplace that connects skilled service providers with clients, with targeted support for Ethiopian payment rails and region-specific workflows.
- Platforms: Backend (`backend/`) — Node.js + Express + Sequelize; Frontend (`frontend/`) — React (Vite) + Tailwind; Mobile (`mobile/`) — Expo React Native.

1) Accounts & Identity
- Registration, login, password reset, email verification flows.
- Profiles: provider and client profiles, bios, media, ratings and reviews.
- Preferences: currency default set to `ETB`, notification preferences, locale/timezone.

2) Admin & Governance
- Admin dashboards and controllers (`controllers/adminController.js`) for platform oversight.
- Government & compliance features (`controllers/governmentController.js`): reporting, policy enforcement, and endpoints to expose data or audit logs for regulatory review.
- Role-based access control (RBAC) with admin, provider, client roles and scoped API routes.

3) Booking & Scheduling
- Service listing creation, pricing, availability calendars, and booking lifecycle (requested → accepted → completed → reviewed).
- Timezone-aware scheduling and calendar integrations for providers.

4) Chat & Real-time
- Real-time messaging using Socket.IO for provider-client chat and live updates.
- Presence, read receipts, and real-time job/booking status updates.

5) Construction / Project Flows
- Project management controllers (`controllers/constructionController.js`, `controllers/projectController.js`) for multi-step work, quotes, milestones, and attachments.

6) Payments (Ethiopian-only)
- Runtime-only payment providers: Chapa, Telebirr, and CBE Birr (adapter pattern in `backend/services`).
- Payment flows: create payment, redirect/checkout (or in-app instructions for local rails), webhook callbacks, idempotent processing.
- Payment reliability: DB-backed `WebhookEvent` model, Redis fallback locks, and a retry job service (`backend/services/webhookRetryJob.js`).
- Providers adapters: `cbeAdapter.js` (configurable + stub mode), Chapa and Telebirr adapters with mocked unit tests.

7) Monetization & Marketplace Economics
- Monetization primitives: ad packages, subscriptions, badge purchases, premium plans (migrations & seeders present under `backend/migrations` and `backend/seeders`).
- Receipt generation, purchase history, and billing records stored in DB.

8) AI & Automation
- AI controllers & services: `aiAssignmentController.js` and `config/ai-config.js` provide hooks for AI-driven assignment, routing, or recommendation logic.
- Use cases included or scaffolded:
  - Smart assignment of tasks to providers using configurable scoring heuristics.
  - Auto-categorization of listings and content enrichment.
  - Drafting messages, replies, or assistant suggestions in the admin or provider workflows.
- AI is integrated as an optional service layer and can be toggled via configuration/env.

9) Gamification
- Points, badges, leaderboards, and achievement tracking (`controllers/gamificationController.js`).
- Incentives for quality, responsiveness, and positive reviews.

10) Notifications & Communications
- Push notifications via Firebase Admin and SMS via Twilio for critical events (bookings, payments, verification).
- Email templates with nodemailer for transactional emails.

11) Webhooks & External Integrations
- Durable webhook ingestion with `WebhookEvent` model (idempotency keys, raw payload, headers, attempt counts).
- Retry and auditing: `webhookRetryJob` to re-process failed webhooks; RBAC-protected webhook endpoints.

12) Security & Hardening
- Central error handler middleware and operational vs programmer error classification.
- Rate limiting middleware and security middleware (`middleware/security.js`).
- Signature verification for webhooks (HMAC or token strategies implemented in adapters like `cbeAdapter.js`).
- Secrets: environment-driven (dotenv); recommendation to use a secret manager (Vault/Azure Key Vault) for production.

13) Data & Persistence
- Postgres (via Sequelize) as primary DB; models and `models/index.js` export sequelize instances and models.
- Migrations and seeders provided for monetization, webhook events, and core schema.

14) Developer Experience & Tooling
- Linting and formatting: ESLint and Prettier configs are present (`eslint.config.js`, `.prettierrc` in `package.json`).
- Testing: Jest (ts-jest preset) with unit and integration test scaffolding; provider unit tests mock axios.
- Scripts: verification and install-log scripts (`scripts/collect-install-log.ps1`, `scripts/run-verification.ps1`) to help stabilize CI.
- Dev server: `nodemon` and PM2-ready configurations in `pm2.config.js` and `nodemon.json`.

15) CI / CD
- GitHub Actions workflow scaffolding added (`.github/workflows/ci.yml`) — requires lockfile generation or pinning to achieve reproducible installs.
- Docker/Docker Compose manifests for local dev and production (`backend/docker-compose.dev.yml`, Dockerfile).

16) Observability & Monitoring
- Optional Sentry integration (initialized in `backend/server.js` when `SENTRY_DSN` is present).
- Log rotation and structured logging via `winston` and `winston-daily-rotate-file`.

17) Performance & Testing
- Performance tests scaffolded with `artillery` (script present) and automated test harness with coverage reporting.

18) Mobile & Frontend Features
- Frontend (`frontend/`): Vite + React + Tailwind UI components, client-side payment flows, and public pages.
- Mobile (`mobile/`): Expo app with offline-friendly caching, media uploads, and usage of `expo-av` for media playback (pin version required for reproducible installs).

19) Compliance, Audit & Government Integrations
- Audit trails for payments, webhooks, and administrative actions.
- `controllers/governmentController.js` provides API surfaces intended for secure data sharing with trusted government integrations or reporting endpoints (rate-limited and permissioned).

20) Runbook & Next Steps (practical)
- To reproduce dev environment locally:
  - Install only the package for a workspace: `npm install --prefix backend --legacy-peer-deps`.
  - Run tests: `npx jest --config jest.config.js --runInBand --coverage`.
- To stabilize CI:
  - Run installs on a clean machine, commit generated lockfiles (`package-lock.json`/`yarn.lock`) for each workspace.
  - Pin problematic packages (e.g., `expo-av`) to versions available in the registry.
- CBE Birr integration: provide sandbox docs/credentials to finalize `cbeAdapter` endpoints, webhook signature algorithm, and add integration tests.

21) Where to look in the repo
- Backend entry: `backend/server.js` and `backend/services` for payment adapters and webhook logic.
- Models & migrations: `backend/models/`, `backend/migrations/`, `backend/seeders/`.
- Controllers: `backend/controllers/` for domain endpoints (payments, projects, government, AI assignment).
- Dev scripts and docs: `scripts/`, `docs/`, and `PR_BODY.md`.

Contact & Support
- For verification steps, run the install-log script and paste results into an issue or here so dependency pinning can be automated.
- For payment sandbox integration (CBE), provide vendor docs and sandbox credentials; I'll implement the final adapter and add integration tests.

---
Generated: comprehensive A→Z features summary for Yachi. If you'd like, I can now:
- generate a formatted `FEATURES.md` PR branch and prepare the PR body (includes migration notes), or
- add missing unit-test stubs and fix test import mismatches so CI shows green quickly.
