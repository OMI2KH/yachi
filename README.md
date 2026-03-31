<!-- TITLE & BADGES -->
<h1 align="center">Yachi Global Marketplace &mdash; ያቺ</h1>
<p align="center">
  <img src="https://via.placeholder.com/1200x400/078930/FFFFFF?text=Yachi+-+Ethiopian+Service+Marketplace" alt="Yachi Banner" width="100%" />
</p>
<p align="center">
  <strong>Connecting Ethiopia (& the world) with Enterprise-Grade Marketplaces, AI, Payments, and Government Portals.</strong>
</p>
<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-payment-integration">Payment Integration</a> •
  <a href="#-ai--government-portal">AI & Government</a> •
  <a href="#-api-endpoints">API Endpoints</a> •
  <a href="#-database-models">Database Models</a> •
  <a href="#-security">Security</a> •
  <a href="#-contribution">Contribution</a> •
  <a href="#-license">License</a>
</p>

---

## ✨ What is Yachi?

**Yachi** ("ያቺ") is a next-generation, full-stack, pan-Ethiopian service marketplace designed for scalability, security, and inclusivity. Whether you need a plumber in Addis, AI-powered construction crew matching nationwide, or to book premium contractors with seamless payments, Yachi brings Ethiopia into the future.

- **Built for Ethiopia, ready for the world**
- **Enterprise-grade features**: Payments, government portals, AI, gamification, dashboards.
- **Built by Ethiopians, for Ethiopians** 🇪🇹

---

## 🎯 Vision

Empower local and global users to find, book, and pay for any service—reliably, securely, and with a distinctly Ethiopian touch.

---

## 🌍 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Quickstart](#-quickstart)
- [Payment Integration](#-payment-integration)
- [AI & Government Portal](#-ai--government-portal)
- [API Endpoints](#-api-endpoints)
- [Database Models](#-database-models)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Monitoring & Analytics](#-monitoring--analytics)
- [Contributing](#-contributing)
- [Ethiopian Localizations](#-ethiopian-specifics)
- [License & Support](#-license)

---

## 🚀 Features

- 🌐 **Geolocation Discovery:** Find services and providers near you, instantly!
- 💳 **Ethiopian Payment Integration:** Chapa, Telebirr, and CBE Birr. Bank transfers, cards, mobile money—all covered.
- 💬 **Real-time Messaging:** Powered by Socket.IO for blazing fast chat and notifications.
- 🏆 **Gamification:** Achievements, leaderboards, badges to reward everyone.
- 📱 **Cross-Platform:** Modern React, React Native (Expo), and Node.js technology.
- 🔒 **Enterprise Security:** End-to-end encryption, bank-grade data protection.
- 🎛️ **Power Admin:** Analytics, dashboards, monitoring, full operational insight.
- 🏛️ **Government Portal:** Project management, tender management, agency dashboards for infrastructure at Ethiopian scale.
- 🤖 **AI Matching:** Smart assignment of workers for projects, maximizing efficiency and reliability.
- 🗣️ **Multi-Language:** Full Amharic, English, & Oromo support; modern localization.
- 🧑‍🤝‍🧑 **Inclusive:** Mobile money, USSD, and compliance with local regs.
- 🌟 **And more...** Bookings, construction management, premium subscriptions, reviews, discount engines, and much more!

---

## 🏗️ Architecture

**Monorepo:**  
Yachi is structured for serious scale and easy contribution.

```
yachi/
├── backend/   # Node.js / Express API, PostgreSQL, payment adapters, jobs
├── frontend/  # React web app (Vite, Tailwind CSS, GSAP animations)
├── mobile/    # React Native (Expo) for iOS/Android with full feature parity
├── docs/      # Technical, product, and integration docs
└── scripts/   # Automation, maintenance, devops
```

Visit detailed `README.md` in each subdir for even more!

---

## ⚙️ Project Structure Overview

- `backend/` — Secure REST API (Node.js/Express; Sequelize ORM)
    - `/src/controllers/` — Route handlers
    - `/src/models/` — DB models
    - `/src/services/` — Business logic (payments, ai, government, etc.)
    - `/src/routes/` — API routing
    - `/src/utils/` — Helper functions/utilities
- `frontend/` — Modern React app (Vite, Tailwind, GSAP, REST API hooks)
- `mobile/`
    - `/app/` - Expo Router (file-based routing)
    - `/services/` - Business & server logic (bookings, ai, etc.)
    - `/components/` - UI & feature modules
    - Multi-platform internationalization, calendar, payment, auth
- `docs/` — How-to, webhook samples, API docs, payment setup.  
- `.github/ISSUE_TEMPLATE/`, `CONTRIBUTING.md`, and `CHANGELOG.md` ��� Community & professional process.

---

## 🌈 Tech Stack

| Layer    | Main Tech                 | Notes                                 |
|----------|--------------------------|---------------------------------------|
| Frontend | React, Vite, Tailwind    | Blazing fast modern web, GSAP effects |
| Mobile   | React Native (Expo)      | iOS/Android/PWA, TypeScript           |
| Backend  | Node.js, Express, Sequelize | PostgreSQL, socket, payments         |
| Messaging| Socket.IO, WebSocket     | Real-time everything                  |
| Payments | Chapa, Telebirr, CBE Birr| Full breadth of Ethiopia-first options|
| Auth     | JWT, refresh tokens      | Secure user, admin auth               |
| AI/ML    | Custom matching algorithms | Project matchmaking, scoring        |
| DevOps   | Docker, PM2, Sentry      | Deployment, monitoring, analytics     |
| Infra    | Redis, SMTP, SSL         | Caching, email, security, backups     |
| Testing  | Jest, React Testing Lib, Detox | Automated code/test/CI           |

---

## 🔥 Quickstart — Get Yachi Running Locally

```bash
# 1. Clone
git clone https://github.com/OMI2KH/yachi.git
cd yachi

# 2. Backend Setup
cd backend
cp .env.example .env           # Configure your DB, payment keys, etc.
npm install
npx sequelize-cli db:create && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all
npm run dev

# 3. Frontend Setup
cd ../frontend
npm install
npm run dev

# 4. Mobile App Setup
cd ../mobile
npm install
npx expo start
```

**Tips:**  
- Supports Windows (`copy`), Linux/Mac (`cp`).
- You *must* configure payment provider credentials for live payments.  
- Run with Docker for full stack in one go (`docker-compose up --build`).

---

## 🌍 Payment Integration

Yachi is the undisputed leader of Ethiopian payment innovation:

- **Chapa** – Cards, bank, mobile
- **Telebirr** – Mobile money & QR codes
- **CBE Birr** – Direct to Commercial Bank of Ethiopia (adapters ready)
- **Wallet System** – Secure in-app top-ups/transfers

**How it works:**  
1. User books a service.
2. Payment initialized via `/api/v1/payments/initialize` (backend).
3. Redirect/user completes with provider.
4. Webhook callback verifies and finalizes the payment.
5. Payout to provider, receipts sent (Amharic/English!).

**.env Configs:**
```
# Chapa Keys
CHAPA_SECRET_KEY=xxx
CHAPA_WEBHOOK_SECRET=xxx
# Telebirr
TELEBIRR_APP_KEY=xxx
TELEBIRR_WEBHOOK_SECRET=xxx
# CBE Birr -- replace stub before PROD!
CBE_BIRR_MERCHANT_ID=xxx
CBE_BIRR_API_KEY=xxx
```

> For advanced usage (e.g. webhook validation), see `docs/payment-webhooks.md`.

### Example: Initialize Payment

```bash
curl -X POST https://api.yachi.et/v1/payments/initialize \
  -H "Authorization: Bearer <token>" \
  -d '{ "gateway": "chapa", "amount": 500, "currency": "ETB" }'
```

---

## 🤖 AI & Government Portal

**AI Matching:**  
- Assigns best workers to construction jobs by skill, rating, logistics, timeline, and budget.
- Used via `ai-assignment-service.js`

**Sample: Worker assignment**

```typescript
import { aiAssignmentService } from '../services/ai-assignment-service';
const bestTeam = await aiAssignmentService.matchWorkers({ projectType: 'building_construction', location: 'Addis Ababa', budget: 1000000 });
```

**Government Portal:**  
- Power dashboard for ministries, agencies: tender mgmt, project oversight, analytics.
- Massive-scale support: securely handle Ethiopian Gov. projects, compliance, reporting.

---

## 📑 API Endpoints

All documented in OpenAPI/Swagger (auto-generated in backend).

**Highlights:**

- `/api/v1/auth/*` — Registration, login, refresh, forgot/reset
- `/api/v1/users/*` — Profile, payment method mgmt
- `/api/v1/products/*` — CRUD for services/products
- `/api/v1/orders/*` — Booking, cancel, view
- `/api/v1/payments/*` — Payments, verifications, status
- `/api/v1/admin/*` — Dashboards, analytics, admin ops
- `/api/v1/notifications/` — Messages, notifications

> See the backend `README.md` and API docs for full list!

---

## 🗄️ Database Models

| Model         | Description                       | Key Fields                          |
|---------------|-----------------------------------|-------------------------------------|
| User          | Customer & Provider profiles      | Auth, profile, role, wallet         |
| Service/Product | Bookable services or items      | Pricing, category, provider         |
| Order         | Booking/order details             | Items, amounts, payment, status     |
| Payment       | Payment transactions              | Gateway, status, provider/refs      |
| Review        | Client reviews                    | Rating, comment, timestamps         |
| Notification  | Delivery of alerts & events       | User, type, message                 |
| GovernmentProject | Public sector projects        | Ministry, status, tenders, budget   |

> Extensible via Sequelize (backend), TypeScript defs (mobile).

---

## 📲 Mobile App — Yachi on iOS, Android, Web

- **Expo, TypeScript, React Navigation**
- Fast, scalable, beautiful Material/Amharic UI
- Secure login, full booking/payments, offline-ready
- Native push, deep linking, biometric auth ready!
- **Use Expo CLI or EAS for custom builds**

### Sample Directory

```
mobile/app/
├── (auth)/         # Auth screens/routes
├── (services)/     # Service discovery
├── (booking)/      # Booking UX
├── (payment)/      # Payment integration workflow
├── (profile)/      # Profile, settings
└── (tabs)/         # Navigation
```

#### Payment Integration Example

```typescript
import { paymentService } from '../services/payment-service';
const receipt = await paymentService.process({ gateway: 'chapa', amount: 400, metadata: {...} });
```

---

## 🧪 Testing

**Backend:**

```bash
# Run all unit and integration tests
npm test
npm run test:coverage   # See code coverage %
npm run test:integration
```

**Mobile:**

```bash
# Unit/Integration/E2E
npm test
npm test:integration
npm test:e2e

# Coverage
npm run test:coverage
```

- Jest, React Testing Library, Detox, MSW are used for full stack test coverage!
- All merges require green CI.

---

## 🚀 Deployment

- **Docker Compose:** Run the whole suite with one command.
    ```bash
    docker-compose up --build
    ```
- **Manual production:**
    ```bash
    # Install dependencies
    npm install --production
    # Run migrations
    npx sequelize-cli db:migrate
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    ```

---

## 📊 Monitoring & Analytics

- Real-time logs: Winston, Morgan
- Errors: Sentry, Crashlytics
- User & ops analytics: Google Analytics, custom dashboards
- Local dashboard for admins/power users

---

## 🔒 Security

- Full JWT authentication, role-based access, refresh tokens
- Rate limiting, helmet, secure CORS
- Bank-grade payment processing (PCI DSS aligned, where possible)
- Audited for XSS, SQLi, CSRF, and other threats
- Data never stored in plain text, encrypted at rest and in transit

---

## 📚 Documentation

- See `/docs` for payment webhooks, setup guides, and more
- Inline code comments and API docs (auto-generated)

---

## 🗣️ Ethiopian Specifics

- 🇪🇹 **Local Compliance**: Follows NBE, ERCA, and local gov policies
- 💱 **ETB native**: 100% Ethiopian Birr, multi-currency future ready.
- 📄 **Receipts**: Legally compliant, Amharic & English
- 📞 **Local Support**: Addis-based support, Amharic-speaking team
- 📆 **Ethiopian Calendar**: Localized date/time everywhere
- 🧾 **Government Dashboards:** Ministry use, revenue/tender tracking
- 🈳 **Full multi-language:** English, Amharic, Oromo, extendable

---

## 🤝 Contributing

👋 **Join us!** We love contributions large & small.

1. Fork this repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m "Add cool feature"`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See `CONTRIBUTING.md` for standards, PR process, and guidelines!

---

## 📜 License

- Backend: Proprietary (contact for commercial terms)
- Mobile: MIT ([mobile/LICENSE](mobile/LICENSE))
- Community, open engagement welcome — reach out for enterprise!

---

## 🆘 Support

- Email: <support@yachi.et>
- Phone: +251-901 862 465 (mobile team)
- Addis Office: See website

---

<div align="center">

Built with ❤️ and ambition for Ethiopia and beyond.<br/>
<a href="https://yachi.et">Website</a> | <a href="#">App Store</a> | <a href="#">Google Play</a> | <a href="#">Twitter</a>

</div>

---

<!--
This README merges all docs. For the *latest* details, see subdir READMEs.
-->
