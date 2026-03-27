# Final Checklist & Launch Guide

This file summarizes what remains to finish the project, a recommended production publish plan, and monetization feedback and recommendations (premium listings, badges, and advertisements).

---

## 1) What remains (high-priority)

- Run lint and tests, fix regressions: ensure `backend` and `frontend` pass CI.
- Finalize the `CBE Birr` adapter: replace the stub in `backend/services/paymentService.js` with a production integration and add retries, idempotency and webhook verification tests.
- End-to-end payments testing in staging with sandbox credentials for Chapa and Telebirr (and CBE once adapter implemented).
- Create a release branch and open a PR with the prepared PR body (`.github/pr-body.md`).
- Add CI that runs lint, tests, and a build for both `backend` and `frontend` on PRs and pushes to main.
- Configure webhook endpoints, secure webhook secrets, and validate signature verification for each provider (see `docs/payment-webhooks.md`).
- Secrets management: move API keys to a secret manager or environment-specific `.env` that is never committed; add vault instructions to deployment docs.

## 2) What remains (medium-priority / polish)

- Add integration/system tests for core flows (auth, booking, payment, webhook).
- Improve monitoring: Sentry (errors), Prometheus/Grafana (metrics) and logging (Winston + rotation). Add alerts for failed webhooks and high error rates.
- Add database backups, migrations plan, and runbook for disaster recovery.
- Accessibility and UI polish on the frontend; mobile E2E smoke tests.
- Add rate limiting & fraud protections around payment endpoints.

## 3) Recommended publish plan (step-by-step)

1) Freeze changes on a release branch

- Create branch: `chore/release/v1` from main.
- Run full local checks and fix failures.

2) CI and PR validation

- Add CI workflow that runs: `npm ci` (or `npm install` as workaround), lint, unit tests, and build for frontend.
- Require status checks before merge.

3) Staging deployment & validation

- Deploy backend to a staging environment (Docker Compose / PM2 / Kubernetes). Use a real staging DB and staging Redis.
- Deploy frontend to a staging host (Vercel/Netlify or static host) with `FRONTEND_URL` set.
- Configure provider sandbox credentials in staging env vars.
- Run end-to-end user flows: register, create listing, purchase (sandbox), webhook delivery, and booking completion.

4) Security, secrets & observability

- Ensure webhook secrets are set in env and verified.
- Add Sentry DSN, Prometheus scrape configs, and logging buckets.
- Confirm HTTPS and valid TLS certs; configure health checks.

5) Production release

- Tag the release and create a changelog entry (update `CHANGELOG.md`) and release notes using `.github/pr-body.md` as a base.
- Deploy backend and frontend to production. Use rolling or blue/green deploy strategy if supported.
- Monitor the first 24–72 hours for errors, failed webhooks or payment issues.

6) Post-release

- Run smoke checks and reconcile transactions (sandbox → production metadata).
- Enable scheduled backups and monitor logs for edge-case failures.

## 4) Deployment options and recommended stacks

- Small/fast: Docker Compose on a single VM, managed Postgres (Supabase/Heroku), Redis managed (Upstash/RedisLabs), and frontend on Vercel.
- Scale-ready: Containerize backend, push images to a registry (Docker Hub / ECR), orchestrate with Kubernetes and use Horizontal Pod Autoscaler, use managed Postgres and Redis, and CloudLoadBalancer + CDN for frontend.
- Mobile: build with EAS (Expo Application Services) and publish to App Store / Play Store with separate staging & production app ids.

## 5) Monetization strategy: high-level feedback

Context: you currently do not take a commission. You plan to monetize via premium listing fees, premium badge fees (paid verification or promoted badges), feature bundles, and advertisements. Below are concrete recommendations.

1) Monetization primitives

- Premium Listing Fee (one-time or recurring): sellers pay to have their listing highlighted/promoted for a set duration.
- Premium Badge / Verified Badge (one-time or subscription): trusted badge that increases buyer trust; include lightweight verification workflow (document upload + manual review or automated KYC where required).
- Subscription Tiers: allow power-users to subscribe for ongoing benefits: reduced platform fees (if you add fees later), analytics dashboard, bulk listing tools, priority support, lead credits.
- Advertising: run ads in listing feeds or banners. Start with non-intrusive ads (sponsored listings) before full-blown display ads. Track revenue versus friction carefully.

2) Pricing & go-to-market suggestions

- Start with conservative prices and test elasticities via A/B tests:
  - Premium Listing: small fee (e.g., 1.5–5 USD equivalent in ETB for 7 days); adjust by category and local purchasing power.
  - Verified/Badge: one-time fee (5–20 USD equivalent) or monthly subscription (2–8 USD equivalent) depending on service value and verification cost.
  - Subscription Tiers: Basic (free), Pro (monthly) with lead boosts and analytics.

- Localize pricing to ETB; use local payment providers (Chapa/Telebirr/CBE) and show local prices prominently.

3) Revenue model sequencing (recommended rollout)

Phase A (low friction):

- Implement premium listings + paid badges as one-time purchases.
- Offer a small free trial/promo or first-week discount for early adopters.

Phase B (scaling):

- Introduce subscription tiers with progressive feature sets.
- Add sponsored (ad-like) placements in feeds, with clear labeling.

Phase C (mature):

- Consider a small commission only on high-value transactions (e.g., > threshold) — but test user sentiment first.

4) Product & UX considerations

- Explain value clearly: show sample pickup in search results for premium listing, conversion uplift stats, or success stories.
- Add receipts, reporting, and refunds policy for paid features.
- Provide simple dashboards for merchants to see impressions, clicks, and conversions for premium listings/badges.

5) Ads & privacy

- If you add display ads, include an ads policy and opt-out controls where applicable. Ensure you comply with local laws and privacy expectations.
- Use server-side ad insertion or client-side with consent; measure performance and user retention.

6) Accounting & tax

- Track payments separately; implement invoicing for merchants and a way to reconcile payouts.
- Consult local tax rules for digital services — you may be required to remit VAT/sales tax depending on jurisdiction.

## 6) Implementation checklist for monetization (technical)

- Add product/pricing models to the backend (models for `PremiumPlan`, `BadgePurchase`, `Subscription`).
- New endpoints: `POST /api/monetization/purchase`, `GET /api/monetization/metrics`.
- Integrate payment flows for one-time purchases and subscriptions, with idempotency keys and webhook handling.
- Add admin UI for creating promos and managing sponsored placements.

## 7) Quick commands & checks (run locally)

Run the basic checks before opening a PR:

```powershell
cd C:\yachi\backend
copy .\.env.example .\.env
npm install --legacy-peer-deps
npx eslint . --ext .js,.jsx --fix
$env:NODE_ENV='test'; npx jest --runInBand
```

If `npm install` fails because of registry resolution problems, run `npm config get registry` and ensure it points to `https://registry.npmjs.org/`. As a workaround use `npm i --legacy-peer-deps` or generate a fresh lockfile on a machine with working network access.

## 8) If you want help now

- I can implement the CBE Birr adapter given API docs and sandbox creds.
- I can scaffold the monetization models and endpoints, and add basic UI hooks for frontend and mobile.
- I can prepare CI workflows (GitHub Actions) that run lint/test/build for you.

Tell me which of the above you want me to implement next (pick one):

- `CI` (add GitHub Actions for backend/frontend)
- `CBE` (implement production CBE Birr adapter)
- `Monetization` (scaffold backend + endpoints + front hooks for premium listings/badges)
- `PR` (create release branch and help prepare PR content)

---

File created: `final.md` — review and tell me which next item to tackle and I will start implementing it.

Run installs & DB migrations locally/staging, then run tests:

cd C:\yachi\backend
copy .\.env.example .\.env
npm install --legacy-peer-deps
# create/migrate DB (follow your project's migration commands)
npm test

Create migrations for the new models (premium_plans, badge_purchases, subscriptions) and run them in staging.
Provide CBE Birr API docs + sandbox keys and I’ll replace the adapter stub with a production implementation and add webhook signature verification.
