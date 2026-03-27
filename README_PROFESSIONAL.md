Yachi — Skilled Workforce Marketplace (Professional README)

This file is a comprehensive, deployment-focused README for the Yachi repository. It mirrors the concise `README.md` but adds a detailed developer and operations guide, checklists, and resources for production readiness. If you want this to replace the existing `README.md`, I can swap files in a follow-up commit.

---

**Contents**

- Overview
- Architecture
- Local development
- Environment variables and `.env.example`
- Database & Migrations (Sequelize / Prisma guidance)
- Testing and quality gates
- CI/CD (example GitHub Actions)
- Deployment options (Docker, Heroku, Vercel, EAS)
- Monitoring & Observability
- Security checklist
- Backup & Recovery
- Release & rollback strategy
- Troubleshooting & common fixes
- Contributing and developer onboarding

---

**Overview**

Yachi is a skilled workforce marketplace connecting clients with service providers. The platform comprises three main components within this monorepo:

- `backend/` — Express API, PostgreSQL, Redis caching, real-time via Socket.IO, and a gamification engine.
- `frontend/` — React app (Vite + Tailwind) for web clients.
- `mobile/` — React Native app (Expo) for iOS/Android.

This document is written for developers, DevOps, and release engineers responsible for deploying and operating the platform.

---

**Architecture (high level)**

- Clients: Web & Mobile
- API Gateway / Backend: Node/Express, health endpoints, cluster support
- Database: PostgreSQL (primary store)
- Cache: Redis (sessions, caching, pub/sub)
- Real-time: Socket.IO for messaging and notifications
- External integrations: TeleBirr, Chapa, CBE Birr (payments), SendGrid (email), Sentry (errors), Google Maps

Key non-functional goals: availability, observability, security, and scale-out with stateless app servers.

---

Local Development

1. Pre-reqs: Node 18+, Docker (if using Compose), Postgres, Redis

2. Install dependencies from repo root:

```powershell
npm ci
```

3. Backend:

```powershell
cd backend
copy .\.env.example .\.env
npm ci
npm run dev
```

4. Frontend:

```powershell
cd frontend
npm ci
npm run dev
```

5. Mobile:

```powershell
cd mobile
npm ci
npm start
```

---

Environment variables

Maintain a `backend/.env.example` (check this into the repo). Example keys:

```text
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://user:pass@localhost:5432/yachi_dev
JWT_ACCESS_SECRET=strong_secret_here
JWT_REFRESH_SECRET=strong_secret_here
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CHAPA_SECRET_KEY=chapa_test_xxx
CHAPA_WEBHOOK_SECRET=
TELEBIRR_APP_KEY=telebirr_app_key
TELEBIRR_APP_SECRET=telebirr_app_secret
CBE_BIRR_MERCHANT_ID=cbe_merchant_id
CBE_BIRR_API_KEY=cbe_api_key
SENTRY_DSN=
```

Do not commit a `.env` file containing secrets. Use secret managers or environment settings provided by your host.

---

Database & Migrations

Sequelize (current runtime ORM):

```powershell
cd backend
npm run db:create
npm run db:migrate
npm run db:seed
```

If you choose Prisma: convert models to `Prisma/schema.prisma`, use `npx prisma migrate dev` and remove Sequelize.

Recommendation: pick one ORM and remove the other. Document the choice in `CONTRIBUTING.md`.

---

Testing & quality gates

- Backend tests: `cd backend && npm run test`
- Frontend build: `cd frontend && npm run build`
- Mobile tests: `cd mobile && npm run test`
- Linting & formatting: run `npm run lint` and `npm run format` in the relevant workspace

Add all of these to CI so PRs won't be merged without passing gates.

---

CI/CD (GitHub Actions example)

Create `.github/workflows/ci.yml` with jobs for backend, frontend and optionally mobile. Each job should:

- Check out code
- Use Node 18
- Install dependencies for the workspace
- Run lint, tests, and build steps
- Optionally run `npm audit --audit-level=high`

Example snippet (backend job):

```yaml
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: node-version: 18
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npm run test --silent
```

---

Deployment options

1. Docker Compose — for staging or local replicas

```powershell
cd backend
docker-compose -f docker-compose.dev.yml up --build
```

2. Kubernetes — build images and use Helm charts

3. Heroku — for simple deployments: `git push heroku main` with env vars configured

4. Frontend: Deploy `frontend/dist` to Vercel or Netlify. `vite build` produces a static bundle.

5. Mobile: Use EAS for production builds and store submission.

---

Monitoring & Observability

- Errors: Sentry
- Logs: Winston + daily rotate; forward to centralized logging (ELK, Datadog)
- Metrics: Prometheus + Grafana or use hosted alternatives. The backend exposes `/metrics`.
- Health checks: use `/health` endpoint for uptime checks.

---

Security checklist (pre-production)

1. Secrets management: Use a vault/secret manager; do not commit `.env`.
2. Rotate and harden JWT secrets (>= 32 chars). Do not use fallbacks in production.
3. TLS/HTTPS enforced with HSTS.
4. Run `npm audit` and fix urgent vulnerabilities.
5. Review CORS, CSP and rate limit rules.

---

Backup & Recovery

- Postgres: schedule nightly dumps; keep multi-region copies for RTO/RPO requirements.
- Redis: if using as persistent store, enable snapshots/RDB/AOF and backup config.

Test restore periodically.

---

Release & rollback strategy

1. Deploy to staging
2. Run smoke tests
3. Canary deploy to a subset of users (if using Kubernetes)
4. Monitor metrics and logs for 15–60 minutes
5. Promote or rollback depending on health

---

Troubleshooting (common fixes)

- SyntaxError on boot: check server config files for invalid JS (example: unescaped regex in `backend/config/security.js`).
- Database connection issues: verify `DATABASE_URL` and that the DB accepts connections from the host.
- Missing envs: ensure `.env` is present or CI provides environment variables.

---

Contributing & onboarding

- Add `CONTRIBUTING.md` with step-by-step dev environment setup.
- Document the selected ORM and migration processes.

---

If you want this file to replace the top-level `README.md` I can do that for you. I can also apply the high-priority fixes (syntax error, `.env.example`, and a minimal CI workflow) immediately — tell me which you'd like first.
