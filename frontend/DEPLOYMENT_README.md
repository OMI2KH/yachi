# Frontend deployment notes

Quick steps to deploy frontend cheaply (Vercel recommended for Next/Vite apps).

1. Prepare environment file from `.env.production.example` and set `VITE_API_BASE_URL`.
2. If using Vercel, connect the repo and set environment variables in the Vercel dashboard.
3. CI workflow exists in `.github/workflows/frontend-deploy.yml` and optionally uses `VERCEL_TOKEN` secret to deploy.

Local build

```bash
cd frontend
npm ci
npm run build
```
