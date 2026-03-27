Yachi Global Marketplace

A platform to connect users with local and global service providers using geolocation-based search, booking, and payment features.

Project Structure

frontend/: React web app with Tailwind CSS and GSAP animations.

backend/: Node.js/Express backend with PostgreSQL.

# Yachi Global Marketplace

Yachi is a full-stack marketplace platform that connects users with local service providers using geolocation, booking, messaging, and payment flows.

## Monorepo layout

- `backend/` — Node.js + Express API, Sequelize models, payments, webhooks, jobs.
- `frontend/` — React app (Vite) with Tailwind and GSAP for animations.
- `mobile/` — Expo React Native mobile app.

## Key features

- Geolocation-based search and service discovery
- Booking and scheduling
- Messaging and real-time notifications (Socket.IO)
- Payments (Ethiopian providers): Chapa, Telebirr, CBE Birr
- Payouts, platform fees and transaction history
- Gamification (achievements, badges, leaderboards)
- Admin endpoints, health checks and operational telemetry

## Quickstart — Backend

1. Copy the environment example and update secrets:

```powershell
cd C:\yachi\backend
copy .\.env.example .\.env
```

2. Install and run:

```powershell
npm ci
npm run dev
```

Notes:

- If `npm ci` fails due to registry/lockfile issues, try `npm install --legacy-peer-deps`.
- The runtime ORM is Sequelize (models in `backend/models/`). A `Prisma/schema.prisma` exists as a reference.

## Quickstart — Frontend

```powershell
cd C:\yachi\frontend
npm install
npm run dev
```

## Quickstart — Mobile

```powershell
cd C:\yachi\mobile
npm install
expo start
```

## Payments

The project supports the following Ethiopian payment providers:

- Chapa — primary checkout gateway
- Telebirr — mobile-money style payments
- CBE Birr — bank/mobile integration (adapter currently a minimal stub; replace with production integration before go-live)

Environment variables (see `backend/.env.example`):

- `CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`
- `TELEBIRR_APP_KEY`, `TELEBIRR_APP_SECRET`
- `CBE_BIRR_MERCHANT_ID`, `CBE_BIRR_API_KEY`

Payments are orchestrated in `backend/services/paymentService.js`. Webhook verification examples are in `docs/payment-webhooks.md`.

## Tests

Run backend tests:

```powershell
cd C:\yachi\backend
npm ci
npm test
```

There is a basic smoke test for `PaymentService` in `backend/__tests__/paymentService.test.js`.

## Webhooks

See `docs/payment-webhooks.md` for verification examples for Chapa and Telebirr. Follow the provider docs and always verify using the raw request body and a constant-time comparison.

## Deployment notes

- Use separate environment variables for staging and production.
- Ensure webhook endpoints are reachable and secrets are correct in provider dashboards.
- The `CBE Birr` adapter is a stub in the codebase and must be implemented per CBE specs before production.

## Contributing

- Follow `CONTRIBUTING.md` for commit messages and PR process.
- Run `npx eslint . --ext .js,.jsx --fix` and `npm test` before creating a PR.

## Changelog

See `CHANGELOG.md` for recent changes.

---

If you want, I can run more automated checks, help implement the CBE adapter, or open a PR with these documentation and test additions. Tell me which step you'd like next.

cd backend && npm install && npm run test

# build frontend
cd frontend && npm install && npm run build