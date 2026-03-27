FROM node:18-alpine

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S yachi -u 1001

# Change ownership
RUN chown -R yachi:nodejs /app
USER yachi

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/health-check.js

# Copy startup scripts
COPY scripts ./scripts
RUN chmod +x ./scripts/start.sh ./scripts/run_migrations.sh || true

# Start application via wrapper script that runs migrations
CMD ["./scripts/start.sh"]