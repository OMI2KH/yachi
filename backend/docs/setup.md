# Yachi Backend Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- AWS CLI (for file uploads)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/yachi-backend.git
cd yachi-backend

    Install dependencies

bash

npm install

    Environment Configuration

bash

cp .env.example .env
# Edit .env with your configuration

    Database Setup

bash

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

    Start the application

bash

# Development
npm run dev

# Production
npm start

📁 Project Structure
text

yachi-backend/
├── config/          # Configuration files
├── controllers/     # Business logic
├── services/        # External services
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
└── database/        # Database management

🔧 Configuration
Environment Variables
env

# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yachi
DB_USER=postgres
DB_PASS=password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=yachi-uploads

# Payment (M-Pesa)
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-shortcode

# SMS (Africa's Talking)
AT_API_KEY=your-api-key
AT_USERNAME=your-username

# AI Services
OPENAI_API_KEY=your-openai-key

🗄️ Database Setup
PostgreSQL Installation

Ubuntu/Debian:
bash

sudo apt update
sudo apt install postgresql postgresql-contrib

macOS:
bash

brew install postgresql

Windows: Download from postgresql.org
Database Creation
sql

CREATE DATABASE yachi;
CREATE USER yachi_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE yachi TO yachi_user;

Redis Installation
bash

# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Windows
# Download from https://github.com/microsoftarchive/redis/releases

🛣️ API Routes Overview
Authentication Routes (/api/v1/auth)

    POST /register - User registration

    POST /login - User login

    POST /logout - User logout

    POST /refresh-token - Refresh JWT token

    POST /forgot-password - Password reset request

    POST /reset-password - Password reset

User Routes (/api/v1/users)

    GET /profile - Get user profile

    PUT /profile - Update user profile

    GET /workers - List workers

    GET /workers/:id - Get worker details

    PUT /preferences - Update user preferences

Worker Routes (/api/v1/workers)

    POST /fayda-upload - Upload Fayda ID

    POST /selfie-verify - Selfie verification

    POST /document-upload - Document upload

    POST /portfolio-upload - Portfolio upload

    PUT /availability - Update availability

    PUT /skills - Update skills

    PUT /level - Calculate worker level

Service Routes (/api/v1/services)

    GET / - List services

    POST / - Create service

    GET /:id - Get service details

    PUT /:id - Update service

    DELETE /:id - Delete service

    GET /:id/reviews - Get service reviews

Booking Routes (/api/v1/bookings)

    POST / - Create booking

    GET / - List user bookings

    GET /:id - Get booking details

    PUT /:id/status - Update booking status

    POST /:id/cancel - Cancel booking

Payment Routes (/api/v1/payments)

    POST /initiate - Initiate payment

    POST /mpesa/callback - M-Pesa callback

    GET /transactions - Payment history

    POST /withdraw - Withdraw earnings

Chat Routes (/api/v1/chat)

    GET /conversations - List conversations

    GET /conversations/:id/messages - Get messages

    POST /messages - Send message

    PUT /messages/:id/read - Mark as read

Admin Routes (/api/v1/admin)

    GET /dashboard - Admin dashboard

    GET /users - Manage users

    GET /transactions - All transactions

    PUT /users/:id/status - Update user status

    GET /analytics - Platform analytics

🔐 Authentication Flow

    User Registration

        Validate input data

        Hash password

        Create user record

        Generate verification token

        Send welcome email

    User Login

        Verify credentials

        Generate JWT tokens

        Update last login

        Return user data

    Protected Routes

        Verify JWT token

        Check user permissions

        Attach user to request

        Handle token refresh

📊 Database Models
Core Models

    User - Platform users (clients, workers, admins)

    Service - Services offered by workers

    Booking - Service appointments

    Transaction - Payment records

    Review - Service reviews and ratings

    Conversation - Chat conversations

    Message - Chat messages

Worker Models

    WorkerVerification - Identity verification

    Portfolio - Worker portfolio items

    Skill - Worker skills

    Certification - Professional certifications

🛡️ Security Features

    JWT-based authentication

    Password hashing with bcrypt

    Rate limiting per endpoint

    Input validation with Zod

    SQL injection prevention

    XSS protection

    CORS configuration

    Helmet.js for security headers

📈 Monitoring & Logging
Logging Levels

    error - Application errors

    warn - Warning messages

    info - General information

    http - HTTP requests

    debug - Debug information

Health Checks
bash

# Application health
GET /health

# Database health
GET /health/db

# Redis health
GET /health/redis

🧪 Testing
bash

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run specific test file
npm test -- routes/auth.test.js

🐳 Docker Deployment
Using Docker Compose
bash

# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

Manual Docker
bash

# Build image
docker build -t yachi-backend .

# Run container
docker run -p 3000:3000 yachi-backend

🔄 API Versioning

All routes are versioned under /api/v1/. Future versions will use /api/v2/, etc.
📡 WebSocket Events
Real-time Features

    Live chat messages

    Booking status updates

    Notification delivery

    Online status tracking

🎯 Error Handling
Standard Error Response
json

{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}

Common Error Codes

    VALIDATION_ERROR - Input validation failed

    AUTH_REQUIRED - Authentication required

    PERMISSION_DENIED - Insufficient permissions

    NOT_FOUND - Resource not found

    RATE_LIMITED - Too many requests

📝 API Documentation

Full API documentation available at:

    Swagger UI: /api/docs

    OpenAPI Spec: /api/docs.json

🚀 Deployment
PM2 (Recommended)
bash

# Start application
pm2 start pm2.config.js

# Monitor
pm2 monit

# Logs
pm2 logs

Manual Process
bash

# Build application
npm run build

# Start production server
npm start

🔧 Development Scripts
bash

npm run dev          # Development server
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:reset     # Reset database
npm run lint         # Code linting
npm run format       # Code formatting

📞 Support

For technical support:

    Email: dev-support@yachi.com

    Slack: #yachi-backend

    Issues: GitHub Issues

Next Steps:

    Configure your environment variables

    Set up the database

    Run the application

    Test the API endpoints

text.