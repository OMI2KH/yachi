# Yachi - ያቺ 🇪🇹

**Enterprise-Level Ethiopian Service Marketplace Platform**

> Connecting skilled Ethiopian service providers with clients through AI-powered matching, secure payments, and quality assurance.

![Yachi Banner](https://via.placeholder.com/1200x400/078930/FFFFFF?text=Yachi+-+Ethiopian+Service+Marketplace)

## 🚀 Overview

Yachi is a comprehensive service marketplace platform specifically designed for the Ethiopian market. We connect skilled service providers (plumbers, electricians, construction workers, cleaners, etc.) with clients seeking reliable services. Our platform features AI-powered worker matching, Ethiopian payment integration, and government project support.

### 🌟 Key Features

- **🤖 AI-Powered Construction Matching** - Intelligent worker assignment for construction projects
- **🏛️ Government Portal** - Large-scale infrastructure project management
- **💳 Ethiopian Payment Integration** - Chapa, Telebirr, and CBE Birr support
- **🌍 Multi-Language** - English and Amharic support
- **📱 Cross-Platform** - iOS, Android, and Web support
- **⭐ Premium Features** - Enhanced visibility and verification
- **🔒 Enterprise Security** - Bank-grade security and data protection

## 🏗️ Architecture

yachi-mobile/
├── app/ # App router directory (Expo Router)
├── components/ # Reusable React components
├── contexts/ # React contexts for state management
├── hooks/ # Custom React hooks
├── services/ # Business logic and API services
├── utils/ # Utility functions and helpers
├── types/ # TypeScript type definitions
├── constants/ # App constants and configuration
├── assets/ # Images, fonts, and static files
└── config/ # App configuration files
text


## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and SDK
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based routing
- **React Navigation** - Navigation handling

### State Management
- **React Context** - Global state management
- **React Query** - Server state management
- **Async Storage** - Local data persistence

### Backend Integration
- **RESTful APIs** - Ethiopian market optimized
- **WebSocket** - Real-time chat and notifications
- **GraphQL** - Efficient data fetching (optional)

### Ethiopian Market Specific
- **Ethiopian Calendar** - Local date handling
- **Amharic Support** - RTL and localization
- **Payment Gateways** - Chapa, Telebirr, CBE Birr
- **Government APIs** - Ethiopian government integration

## 📋 Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yachi-ethiopia/yachi-mobile.git
cd yachi-mobile

2. Install Dependencies
bash

# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install

3. Environment Setup

Create .env file from example:
bash

cp .env.example .env

Configure your environment variables:
env

# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.yachi.et/v1
EXPO_PUBLIC_ENVIRONMENT=development

# Payment Gateways
EXPO_PUBLIC_CHAPA_PUBLIC_KEY=your_chapa_public_key
EXPO_PUBLIC_TELEBIRR_MERCHANT_ID=your_telebirr_merchant_id
EXPO_PUBLIC_CBE_BIRR_APP_ID=your_cbe_birr_app_id

# Third Party Services
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id

# EAS
EXPO_PUBLIC_EAS_PROJECT_ID=your_eas_project_id

4. Start Development
bash

# Start Expo development server
npx expo start

# For specific platforms
npx expo start --ios
npx expo start --android
npx expo start --web

🏗️ Project Structure
Core Directories
text

app/
├── (auth)/              # Authentication routes
├── (tabs)/              # Main tab navigation
├── (services)/          # Service management
├── (bookings)/          # Booking management
├── (construction)/      # Construction projects
├── (government)/        # Government portal
├── (payment)/           # Payment processing
├── (premium)/           # Premium features
├── (profile)/           # User profiles
└── modal.js            # Global modal system

components/
├── ui/                  # Basic UI components
├── forms/               # Form components
├── service/             # Service-related components
├── booking/             # Booking components
├── payment/             # Payment components
├── construction/        # Construction components
├── government/          # Government components
├── chat/                # Messaging components
├── profile/             # Profile components
└── admin/               # Admin components

services/
├── auth-service.js      # Authentication service
├── booking-service.js   # Booking management
├── payment-service.js   # Payment processing
├── construction-service.js # Construction projects
├── ai-assignment-service.js # AI worker matching
├── government-service.js # Government projects
└── payment-gateways/    # Ethiopian payment integrations

🔧 Configuration
App Configuration (app.json)

    Multi-platform support (iOS, Android, Web)

    Ethiopian market optimization

    Payment gateway configuration

    Security and permissions

EAS Configuration (eas.json)

    Development, Preview, Production builds

    Ethiopian payment gateway environments

    Automated App Store deployment

    Build caching and optimization

💳 Payment Integration
Supported Payment Methods

    Chapa - Ethiopian payment gateway

    Telebirr - Ethio Telecom payment

    CBE Birr - Commercial Bank of Ethiopia

    Wallet System - In-app balance

Payment Flow
typescript

// Example payment integration
import { paymentService } from '../services/payment-service';

const processPayment = async (paymentData) => {
  return await paymentService.process({
    gateway: 'chapa',
    amount: 500, // ETB
    currency: 'ETB',
    metadata: {
      serviceId: '123',
      bookingId: '456'
    }
  });
};

🤖 AI Features
Construction Worker Matching
typescript

// AI-powered worker assignment
import { aiAssignmentService } from '../services/ai-assignment-service';

const matchWorkers = async (projectData) => {
  return await aiAssignmentService.matchWorkers({
    projectType: 'building_construction',
    squareArea: 120,
    floorCount: 3,
    budget: 500000, // ETB
    location: 'Addis Ababa',
    timeline: 90 // days
  });
};

Government Project Management
typescript

// Government project handling
import { governmentService } from '../services/government-service';

const createGovernmentProject = async (projectData) => {
  return await governmentService.createProject({
    projectCode: 'GOV-ETH-2024-001',
    ministry: 'Ministry of Urban Development',
    tenderNumber: 'TENDER-ETH-2024-001',
    budget: 50000000, // ETB
    timeline: 365 // days
  });
};

🌐 Internationalization
Supported Languages

    English (Primary)

    Amharic (አማርኛ) - Ethiopian local language

    Oromo (Oromoo) - Regional language support

Localization Setup
typescript

// Example localization
import { I18n } from 'i18n-js';

const translations = {
  en: {
    welcome: 'Welcome to Yachi',
    services: 'Services',
    bookings: 'Bookings'
  },
  am: {
    welcome: 'እንኳን ወደ ያቺ በደህና መጡ',
    services: 'አገልግሎቶች',
    bookings: 'ቦቂንጎች'
  }
};

🔒 Security Features

    End-to-end encryption for sensitive data

    Biometric authentication support

    Secure payment processing

    Data privacy compliance (Ethiopian regulations)

    Regular security audits

🧪 Testing
Test Structure
bash

# Run all tests
npm test

# Run specific test suites
npm test:unit          # Unit tests
npm test:integration   # Integration tests
npm test:e2e          # End-to-end tests

# Test coverage
npm run test:coverage

Testing Tools

    Jest - Unit testing framework

    React Testing Library - Component testing

    Detox - E2E testing

    MSW - API mocking

📱 Deployment
Development Builds
bash

# Development build
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform all

App Store Deployment
bash

# Submit to App Store
eas submit --platform ios --profile production

# Submit to Google Play
eas submit --platform android --profile production

👥 Team Structure
Development Teams

    Mobile Team - React Native development

    Backend Team - API and service development

    AI Team - Machine learning and matching algorithms

    DevOps Team - Infrastructure and deployment

    QA Team - Quality assurance and testing

Project Management

    Agile Methodology with 2-week sprints

    Jira/Linear for task management

    GitHub for version control

    Slack/Discord for communication

📊 Analytics & Monitoring
Key Metrics

    User Engagement - Daily active users, session duration

    Business Metrics - Bookings completed, revenue generated

    Performance Metrics - App load time, crash rates

    Ethiopian Market - Regional usage, payment success rates

Monitoring Tools

    Sentry - Error tracking and performance monitoring

    Google Analytics - User behavior analytics

    Custom Dashboards - Ethiopian market specific metrics

    Crashlytics - Real-time crash reporting

🤝 Contributing

We welcome contributions from the community! Please see our Contributing Guide for details.
Development Workflow

    Fork the repository

    Create a feature branch (git checkout -b feature/amazing-feature)

    Commit your changes (git commit -m 'Add amazing feature')

    Push to the branch (git push origin feature/amazing-feature)

    Open a Pull Request

Code Standards

    TypeScript for type safety

    ESLint for code quality

    Prettier for code formatting

    Conventional Commits for commit messages

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
🆘 Support
Documentation

    API Documentation

    Component Library

    Deployment Guide

Community

    Discord Server

    GitHub Discussions

    Community Forum

Enterprise Support

    Email: enterprise@yachi.et

    Phone: +251 11 123 4567

    Office: Addis Ababa, Ethiopia

🙏 Acknowledgments

    Ethiopian Software Developers Community

    React Native and Expo teams

    Ethiopian Payment Gateway providers

    Our amazing beta testers across Ethiopia

<div align="center">

Built with ❤️ in Ethiopia for Ethiopians

Website | App Store | Google Play | Twitter
</div> ```
 
  required dependencys

npm install @react-native-community/netinfo
# or
yarn add @react-native-community/netinfo