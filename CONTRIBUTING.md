# Contributing to Yachi

Thank you for wanting to contribute. This file documents basic development setup, the project's chosen data layer, and how to run tests and migrations.

## Development setup

1. Install Node 18+.
2. From repo root, install dependencies:

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

## Data layer decision

This repository contains both Sequelize (runtime) and a Prisma schema under `Prisma/`. To avoid schema drift and confusion, the **chosen ORM is Sequelize** (unless a migration to Prisma is explicitly planned).

If you plan to migrate to Prisma, open an RFC in the repo and coordinate migration tasks — do not land both ORMs in the same production service.

## Migrations (Sequelize)

Run from `backend/`:

```powershell
npm run db:create
npm run db:migrate
npm run db:seed
```

## Testing

- Backend: `cd backend && npm run test`
- Frontend: `cd frontend && npm run build`
- Mobile: `cd mobile && npm run test`

## Pull Requests

- Target `main` or open feature branches.
- Run lint and tests locally before opening a PR.
- CI will run validation on PRs.

## Code style

- Follow ESLint and Prettier rules; run `npm run lint` and `npm run format` where available.

## Security

- Do not commit secrets. Use `.env.example` and a secret manager for production.
- Report security issues privately via the `SECURITY.md` process (if present).
