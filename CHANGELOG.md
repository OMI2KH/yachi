# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- chore(payments): restrict runtime payment providers to Ethiopian gateways only: Chapa, Telebirr, and CBE Birr.
  - Removed PayPal/Stripe runtime codepaths and env variables.
  - Added a minimal CBE Birr adapter stub in `backend/services/paymentService.js`.
  - Updated backend validation and models to use `ETB` as default currency and limit provider enums to local gateways.
  - Updated frontend and mobile UIs to show only local payment options.
  - Added sandbox env placeholders in `backend/.env.example`.
  - Removed problematic devDependency `@types/lz-string` to improve install reliability.
  - Added API and docs updates for webhook examples and a PR body template.
