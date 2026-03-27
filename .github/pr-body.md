Title: chore(payments): Ethiopian providers only (Chapa, Telebirr, CBE Birr)

Summary
-------
This PR restricts the platform's runtime payment providers to Ethiopian gateways only: Chapa, Telebirr, and CBE Birr. It removes runtime Stripe/PayPal codepaths and environment variables to reduce scope and simplify local deployments for Ethiopian operations. A minimal CBE Birr adapter stub is included; replace with full integration in a follow-up if needed.

High level changes
------------------
- Backend: removed PayPal/Stripe adapters; added `cbebirr` adapter stub and `initializeCbeBirr()`.
- Backend: updated payment validation enums, models and payloads to use Chapa/Telebirr/CBE Birr and default `ETB` currency.
- Frontend/mobile: removed Stripe/PayPal options from UIs and types; normalized provider ids to `chapa`, `telebirr`, `cbebirr`.
- Docs: updated `backend/.env.example`, `README.md`, `README_PROFESSIONAL.md`, and `feedback.md` to reference Ethiopian providers and sandbox keys.
- CI & package: removed problematic `@types/lz-string` devDependency to avoid install failures.

Files of interest (representative)
---------------------------------
- `backend/services/paymentService.js`
- `backend/controllers/paymentController.js`
- `backend/routes/payments.js`
- `backend/models/transaction.js`
- `backend/.env.example`
- `frontend/utils/WorkerProfile.jsx`
- `mobile/*` (types, screens, contexts)
- `README.md`, `README_PROFESSIONAL.md`, `feedback.md`

Migration & verification checklist
---------------------------------
- [ ] Run `npm ci` successfully in each workspace (root, `backend`, `frontend`, `mobile`).
- [ ] Update environment for staging/production with sandbox keys:
  - `CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`
  - `TELEBIRR_APP_KEY`, `TELEBIRR_APP_SECRET`
  - `CBE_BIRR_MERCHANT_ID`, `CBE_BIRR_API_KEY`
- [ ] Configure webhook endpoints and verify webhook signature handling for Chapa/Telebirr/CBE in staging.
- [ ] Run backend unit/integration tests and perform a smoke test for payment flows using sandbox keys.
- [ ] Review the CBE Birr adapter stub and replace with a production integration if required.
- [ ] Merge and monitor staging logs for 15–60 minutes after deploy.

Notes
-----
- I removed/commented Stripe/PayPal runtime paths intentionally; if you need international payments later, add them back in a separate feature branch.
- If `npm ci` fails due to registry/version issues, run `npm install --legacy-peer-deps` as a fallback and report errors here.

If you want, I can also prepare a short PR description and checklist file for reviewers; tell me and I'll add it.
