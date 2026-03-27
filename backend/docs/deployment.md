Yachi Backend Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying the Yachi backend to various environments including production, staging, and development.

## 📋 Prerequisites

### System Requirements
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB+ SSD
- **OS**: Ubuntu 20.04 LTS+, CentOS 8+, or Amazon Linux 2

### Required Software
- Node.js 18.17.0+
- PostgreSQL 14+
- Redis 6.2+
- PM2 5.0+
- Nginx 1.18+

## 🏗️ Infrastructure Architecture

Load Balancer (AWS ALB/Nginx)
↓
Auto Scaling Group
↓
EC2 Instances (Backend API)
↓
PostgreSQL (RDS)
↓
Redis (ElastiCache)
↓
S3 Bucket (Uploads)
text


## 🔧 Environment Configurations

### Production Environment (.env.production)
```env
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DB_HOST=yachi-prod.cluster-xxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=yachi_production
DB_USER=yachi_prod_user
DB_PASS=your_secure_password_prod

# Redis
REDIS_URL=redis://yachi-cache.xxx.0001.use1.cache.amazonaws.com:6379

# JWT
JWT_SECRET=your_super_secure_jwt_secret_production
JWT_EXPIRES_IN=7d

# AWS
AWS_ACCESS_KEY_ID=AKIAXXXPROD
AWS_SECRET_ACCESS_KEY=your_prod_secret_key
AWS_REGION=us-east-1
S3_BUCKET=yachi-uploads-prod

# M-Pesa Production
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your_prod_consumer_key
MPESA_CONSUMER_SECRET=your_prod_consumer_secret
MPESA_SHORTCODE=123456

# SMS
AT_API_KEY=prod_api_key_xxx
AT_USERNAME=yachi_prod

# AI Services
OPENAI_API_KEY=sk-prod-xxx

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/xxx

Staging Environment (.env.staging)
env

NODE_ENV=staging
PORT=3001
API_VERSION=v1

# Database
DB_HOST=yachi-staging.cluster-xxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=yachi_staging
DB_USER=yachi_staging_user
DB_PASS=your_secure_password_staging

# Redis
REDIS_URL=redis://yachi-staging-cache.xxx.0001.use1.cache.amazonaws.com:6379

# AWS
AWS_ACCESS_KEY_ID=AKIAXXXSTAGING
AWS_SECRET_ACCESS_KEY=your_staging_secret_key
S3_BUCKET=yachi-uploads-staging

# M-Pesa Sandbox
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_staging_consumer_key
MPESA_CONSUMER_SECRET=your_staging_consumer_secret

🐳 Docker Deployment
Dockerfile
dockerfile

FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create upload directories
RUN mkdir -p uploads/profiles uploads/portfolios uploads/documents uploads/temp

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node health-check.js

# Start application
CMD ["npm", "start"]

Docker Compose (Development)
yaml

version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    networks:
      - yachi-network

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: yachi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - yachi-network

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - yachi-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - yachi-network

volumes:
  postgres_data:
  redis_data:

networks:
  yachi-network:
    driver: bridge

Docker Compose (Production)
yaml

version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./uploads:/app/uploads
      - /app/node_modules
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "node", "health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - yachi-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    deploy:
      replicas: 2
    depends_on:
      - app
    networks:
      - yachi-network

networks:
  yachi-network:
    driver: bridge

☁️ AWS Deployment
EC2 Launch Configuration
bash

#!/bin/bash
# user-data.sh

#!/bin/bash
yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2
npm install -g pm2

# Install PostgreSQL client
amazon-linux-extras install postgresql14 -y

# Install Nginx
yum install nginx -y

# Create application directory
mkdir -p /opt/yachi-backend
chown ec2-user:ec2-user /opt/yachi-backend

# Configure Nginx
cat > /etc/nginx/conf.d/yachi.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # File upload size limit
    client_max_body_size 50M;
}
EOF

# Start Nginx
systemctl enable nginx
systemctl start nginx

AWS RDS PostgreSQL Setup
sql

-- Production Database
CREATE DATABASE yachi_production;
CREATE USER yachi_prod_user WITH PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE yachi_production TO yachi_prod_user;

-- Create extensions
\c yachi_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Optimize performance
ALTER DATABASE yachi_production SET random_page_cost = 1.1;
ALTER DATABASE yachi_production SET effective_cache_size = '4GB';

Elasticache Redis Configuration
json

{
    "CacheNodeType": "cache.t3.medium",
    "Engine": "redis",
    "EngineVersion": "6.2",
    "NumCacheNodes": 2,
    "AutomaticFailoverEnabled": true,
    "MultiAZEnabled": true
}

🚀 PM2 Configuration
pm2.config.js
javascript

module.exports = {
  apps: [{
    name: 'yachi-api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    // Application monitoring
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true,
    
    // Restart strategies
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Health check
    health_check_url: 'http://localhost:3000/health',
    health_check_interval: 30000
  }]
};

PM2 Commands
bash

# Start application
pm2 start pm2.config.js --env production

# Monitor application
pm2 monit

# Log management
pm2 logs
pm2 logs --lines 100
pm2 flush

# Process management
pm2 restart yachi-api
pm2 reload yachi-api
pm2 stop yachi-api
pm2 delete yachi-api

# Save process list
pm2 save
pm2 startup

🔒 SSL Configuration
Nginx SSL Configuration
nginx

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    
    # SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-Proto https;
        # ... other proxy settings
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

📊 Monitoring & Logging
Application Monitoring
javascript

// monitoring.js
const monitor = require('pm2-io-apm').init({
  transactions: true,
  http: true
});

// Custom metrics
const metrics = {
  active_users: monitor.metric({
    name: 'Active Users'
  }),
  requests_per_minute: monitor.metric({
    name: 'Requests/Minute',
    unit: 'req/min'
  }),
  error_rate: monitor.metric({
    name: 'Error Rate',
    unit: '%'
  })
};

Log Rotation
bash

# logrotate configuration: /etc/logrotate.d/yachi
/opt/yachi-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    dateext
    dateformat -%Y%m%d
}

🔄 CI/CD Pipeline
GitHub Actions (.github/workflows/deploy.yml)
yaml

name: Deploy Yachi Backend

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:6-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: yachi_test
        DB_USER: postgres
        DB_PASS: password
        REDIS_URL: redis://localhost:6379
    
    - name: Run security audit
      run: npm audit --audit-level moderate

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Staging
      uses: appleboy/ssh-action@v0.1.7
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.STAGING_USER }}
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          cd /opt/yachi-backend
          git pull origin develop
          npm ci --production
          npm run db:migrate
          pm2 reload pm2.config.js --env staging
          echo "Staging deployment completed"

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Production
      uses: appleboy/ssh-action@v0.1.7
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          cd /opt/yachi-backend
          git pull origin main
          npm ci --production
          npm run db:migrate
          pm2 reload pm2.config.js --env production
          echo "Production deployment completed"

🗄️ Database Migration Strategy
Migration Scripts
bash

#!/bin/bash
# deploy-migration.sh

#!/bin/bash
set -e

echo "Starting database migration..."

# Backup database
echo "Creating backup..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
echo "Running migrations..."
npm run db:migrate

# Run seed data if needed
if [ "$1" == "--seed" ]; then
    echo "Seeding database..."
    npm run db:seed
fi

echo "Migration completed successfully"

Rollback Procedure
bash

#!/bin/bash
# rollback-migration.sh

#!/bin/bash
set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Starting rollback..."

# Restore from backup
echo "Restoring from backup: $BACKUP_FILE"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $BACKUP_FILE

echo "Rollback completed successfully"

🔍 Health Checks
Health Check Endpoint
javascript

// health-check.js
const healthCheck = async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
    external_services: await checkExternalServices()
  };

  const allHealthy = Object.values(checks).every(check => check.healthy);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  });
};

📈 Performance Optimization
Database Optimization
sql

-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_services_provider_id ON services(provider_id);
CREATE INDEX CONCURRENTLY idx_bookings_status ON bookings(status);
CREATE INDEX CONCURRENTLY idx_transactions_created_at ON transactions(created_at);

-- Partition large tables
CREATE TABLE transactions_2024 PARTITION OF transactions 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

Application Optimization
javascript

// Enable compression
app.use(compression());

// Implement caching
app.use('/api/v1/workers', cacheMiddleware('5 minutes'));

// Database connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

🛡️ Security Checklist

    SSL/TLS encryption enabled

    Database encryption at rest

    Regular security updates

    Firewall configured

    Intrusion detection system

    Regular backups

    Access logging

    Rate limiting

    Input validation

    SQL injection prevention

🚨 Emergency Procedures
Database Recovery
bash

# Stop application
pm2 stop yachi-api

# Restore backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -c latest_backup.dump

# Start application
pm2 start yachi-api

Rollback Deployment
bash

# Revert to previous git commit
git log --oneline -5
git reset --hard <previous_commit_hash>

# Restart application
pm2 restart yachi-api

📞 Support & Maintenance
Monitoring Tools

    Application: PM2, New Relic

    Database: pgAdmin, RDS Performance Insights

    Infrastructure: CloudWatch, Datadog

    Logs: ELK Stack, CloudWatch Logs

Regular Maintenance Tasks

    Weekly database backups

    Monthly security updates

    Quarterly performance reviews

    Annual security audits

Next Steps:

    Set up your production environment variables

    Configure SSL certificates

    Set up monitoring and alerting

    Test deployment in staging

    Schedule regular maintenance tasks

text


This deployment guide provides comprehensive coverage for deploying your Yachi backend across different environments.