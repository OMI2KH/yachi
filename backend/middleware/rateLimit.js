// middleware/rateLimit.js
const redis = require('../config/redis');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const logger = require('../utils/logger');

class RateLimitService {
  constructor() {
    this.defaultWindowMs = 15 * 60 * 1000; // 15 minutes
    this.maxRequestsPerWindow = 100;
    this.trustedProxies = process.env.TRUSTED_PROXIES ? process.env.TRUSTED_PROXIES.split(',') : [];
    this.rateLimitConfig = this.loadRateLimitConfig();
  }

  /**
   * Load rate limit configuration for different endpoints
   */
  loadRateLimitConfig() {
    return {
      // Authentication endpoints
      'auth': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        skipSuccessfulRequests: true
      },
      'otp': {
        windowMs: 60 * 1000, // 1 minute
        max: 3,
        message: 'Too many OTP requests, please try again later.',
        code: 'OTP_RATE_LIMIT_EXCEEDED'
      },
      'password-reset': {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        message: 'Too many password reset attempts, please try again later.',
        code: 'PASSWORD_RESET_LIMIT_EXCEEDED'
      },

      // API endpoints
      'api': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: 'Too many API requests, please slow down.',
        code: 'API_RATE_LIMIT_EXCEEDED'
      },
      'search': {
        windowMs: 60 * 1000, // 1 minute
        max: 30,
        message: 'Too many search requests, please try again later.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
      },
      'upload': {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: 'Too many file uploads, please try again later.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
      },

      // Payment endpoints
      'payment': {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10,
        message: 'Too many payment attempts, please try again later.',
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
      },

      // Messaging endpoints
      'messages': {
        windowMs: 60 * 1000, // 1 minute
        max: 20,
        message: 'Too many messages, please slow down.',
        code: 'MESSAGES_RATE_LIMIT_EXCEEDED'
      },

      // Admin endpoints
      'admin': {
        windowMs: 60 * 1000, // 1 minute
        max: 50,
        message: 'Too many admin requests, please slow down.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
      },

      // Public endpoints (more lenient)
      'public': {
        windowMs: 60 * 1000, // 1 minute
        max: 60,
        message: 'Too many requests, please try again later.',
        code: 'PUBLIC_RATE_LIMIT_EXCEEDED'
      },

      // Strict endpoints (very restrictive)
      'strict': {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5,
        message: 'Too many requests from this IP, access temporarily blocked.',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
      }
    };
  }

  /**
   * Main rate limiting middleware
   */
  rateLimit(configKey = 'api') {
    return async (req, res, next) => {
      try {
        const config = this.rateLimitConfig[configKey] || this.rateLimitConfig['api'];
        const identifier = this.getIdentifier(req, configKey);
        
        if (!identifier) {
          return next(); // Skip rate limiting if no identifier
        }

        // Check if this request should be skipped
        if (this.shouldSkipRateLimit(req, config)) {
          return next();
        }

        const key = this.generateKey(identifier, configKey, req.method, req.path);
        const current = await this.incrementCounter(key, config.windowMs);

        // Set rate limit headers
        this.setRateLimitHeaders(res, current, config);

        // Check if rate limit exceeded
        if (current.count > config.max) {
          await this.handleRateLimitExceeded(req, identifier, configKey, current);
          
          return res.status(429).json({
            success: false,
            message: config.message,
            code: config.code,
            retryAfter: Math.ceil((config.windowMs - (Date.now() - current.resetTime)) / 1000),
            limit: config.max,
            remaining: 0,
            reset: new Date(current.resetTime).toISOString()
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limit middleware error:', error);
        // On error, allow the request to proceed (fail open)
        next();
      }
    };
  }

  /**
   * Get client identifier (IP, user ID, or API key)
   */
  getIdentifier(req, configKey) {
    // For authenticated users, use user ID
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }

    // For API keys
    if (req.headers['x-api-key']) {
      return `api_key:${req.headers['x-api-key']}`;
    }

    // For OTP endpoints, use phone/email
    if (configKey === 'otp' && req.body.phone) {
      return `otp:${req.body.phone}`;
    }
    if (configKey === 'otp' && req.body.email) {
      return `otp:${req.body.email}`;
    }

    // Default to IP address
    return `ip:${this.getClientIP(req)}`;
  }

  /**
   * Get client IP address considering proxies
   */
  getClientIP(req) {
    // Check forwarded headers (behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim());
      // Return the first non-trusted IP
      for (const ip of ips) {
        if (!this.isTrustedProxy(ip)) {
          return ip;
        }
      }
    }

    // Check other common headers
    const realIP = req.headers['x-real-ip'];
    if (realIP && !this.isTrustedProxy(realIP)) {
      return realIP;
    }

    // Fallback to connection remote address
    return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Check if IP is a trusted proxy
   */
  isTrustedProxy(ip) {
    return this.trustedProxies.includes(ip);
  }

  /**
   * Generate Redis key for rate limiting
   */
  generateKey(identifier, configKey, method, path) {
    const timestamp = Math.floor(Date.now() / this.defaultWindowMs) * this.defaultWindowMs;
    return `rate_limit:${configKey}:${identifier}:${method}:${path}:${timestamp}`;
  }

  /**
   * Increment rate limit counter
   */
  async incrementCounter(key, windowMs) {
    const multi = redis.multi();
    
    // Increment counter
    multi.incr(key);
    
    // Set expiry if this is the first request
    multi.ttl(key);
    
    const results = await multi.exec();
    const count = results[0][1];
    const ttl = results[1][1];

    // Set expiry if key is new
    if (ttl === -1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

    return {
      count,
      resetTime,
      remaining: Math.max(0, this.rateLimitConfig.api.max - count)
    };
  }

  /**
   * Set rate limit headers in response
   */
  setRateLimitHeaders(res, current, config) {
    res.set({
      'X-RateLimit-Limit': config.max.toString(),
      'X-RateLimit-Remaining': current.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString()
    });
  }

  /**
   * Handle rate limit exceeded event
   */
  async handleRateLimitExceeded(req, identifier, configKey, current) {
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];
    const endpoint = `${req.method} ${req.path}`;

    // Log the rate limit event
    logger.warn('Rate limit exceeded:', {
      identifier,
      configKey,
      endpoint,
      clientIP,
      userAgent,
      count: current.count,
      limit: this.rateLimitConfig[configKey].max
    });

    // Track analytics
    await YachiAnalytics.trackRateLimitEvent({
      identifier,
      configKey,
      endpoint,
      clientIP,
      userAgent,
      count: current.count,
      limit: this.rateLimitConfig[configKey].max,
      timestamp: new Date().toISOString()
    });

    // Check for suspicious activity
    if (current.count > this.rateLimitConfig[configKey].max * 2) {
      await this.handleSuspiciousActivity(req, identifier, configKey, current);
    }
  }

  /**
   * Handle suspicious activity (potential abuse)
   */
  async handleSuspiciousActivity(req, identifier, configKey, current) {
    const clientIP = this.getClientIP(req);
    
    // Block the identifier temporarily
    const blockKey = `rate_limit_block:${identifier}`;
    await redis.setex(blockKey, 3600, 'blocked'); // Block for 1 hour

    // Alert security system
    await YachiSecurity.alertSuspiciousActivity({
      type: 'rate_limit_abuse',
      identifier,
      configKey,
      clientIP,
      count: current.count,
      limit: this.rateLimitConfig[configKey].max,
      endpoint: `${req.method} ${req.path}`,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    logger.warn('Suspicious activity detected and blocked:', {
      identifier,
      configKey,
      clientIP,
      count: current.count
    });
  }

  /**
   * Check if request should skip rate limiting
   */
  shouldSkipRateLimit(req, config) {
    // Skip successful requests for certain endpoints (like auth)
    if (config.skipSuccessfulRequests && req.user) {
      return true;
    }

    // Skip for trusted IPs (admin, internal services)
    if (this.isTrustedIP(req)) {
      return true;
    }

    // Skip for premium users
    if (req.user && req.user.isPremium) {
      return true;
    }

    // Skip health checks
    if (req.path === '/health' || req.path === '/status') {
      return true;
    }

    return false;
  }

  /**
   * Check if IP is trusted (admin, internal networks)
   */
  isTrustedIP(req) {
    const clientIP = this.getClientIP(req);
    const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];
    
    return trustedIPs.includes(clientIP) || 
           clientIP.startsWith('10.') || 
           clientIP.startsWith('192.168.') ||
           clientIP === '127.0.0.1' ||
           clientIP === '::1';
  }

  /**
   * Dynamic rate limiting based on user behavior
   */
  dynamicRateLimit() {
    return async (req, res, next) => {
      try {
        const identifier = this.getIdentifier(req, 'dynamic');
        if (!identifier) return next();

        // Get user trust score
        const trustScore = await this.calculateTrustScore(identifier, req);
        
        // Adjust limits based on trust score
        const dynamicConfig = this.getDynamicConfig(trustScore);
        
        const key = this.generateKey(identifier, 'dynamic', req.method, req.path);
        const current = await this.incrementCounter(key, dynamicConfig.windowMs);

        this.setRateLimitHeaders(res, current, dynamicConfig);

        if (current.count > dynamicConfig.max) {
          await this.handleRateLimitExceeded(req, identifier, 'dynamic', current);
          
          return res.status(429).json({
            success: false,
            message: dynamicConfig.message,
            code: 'DYNAMIC_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((dynamicConfig.windowMs - (Date.now() - current.resetTime)) / 1000)
          });
        }

        next();
      } catch (error) {
        logger.error('Dynamic rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Calculate user trust score for dynamic rate limiting
   */
  async calculateTrustScore(identifier, req) {
    let score = 50; // Default score

    // Boost score for authenticated users
    if (req.user) {
      score += 20;

      // Boost for verified users
      if (req.user.faydaVerified) score += 15;
      if (req.user.selfieVerified) score += 10;
      if (req.user.documentVerified) score += 10;

      // Boost for users with completed transactions
      const completedTransactions = await this.getUserTransactionCount(req.user.userId);
      score += Math.min(completedTransactions, 50); // Max 50 points for transactions

      // Boost for premium users
      if (req.user.isPremium) score += 25;
    }

    // Reduce score for recent violations
    const violations = await this.getRecentViolations(identifier);
    score -= violations * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get dynamic rate limit configuration based on trust score
   */
  getDynamicConfig(trustScore) {
    if (trustScore >= 80) {
      return {
        windowMs: 15 * 60 * 1000,
        max: 200, // High trust users get higher limits
        message: 'Too many requests, please slow down.'
      };
    } else if (trustScore >= 60) {
      return {
        windowMs: 15 * 60 * 1000,
        max: 100, // Standard users
        message: 'Too many requests, please try again later.'
      };
    } else if (trustScore >= 40) {
      return {
        windowMs: 15 * 60 * 1000,
        max: 50, // Lower trust users
        message: 'Too many requests, please try again later.'
      };
    } else {
      return {
        windowMs: 60 * 60 * 1000,
        max: 10, // Very low trust users
        message: 'Too many requests, access temporarily restricted.'
      };
    }
  }

  /**
   * Get user's completed transaction count
   */
  async getUserTransactionCount(userId) {
    try {
      const { Transaction } = require('../models');
      const count = await Transaction.count({
        where: {
          userId,
          status: 'completed'
        }
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get recent rate limit violations for identifier
   */
  async getRecentViolations(identifier) {
    const key = `rate_limit_violations:${identifier}`;
    const violations = await redis.get(key);
    return parseInt(violations) || 0;
  }

  /**
   * Concurrency limiting middleware
   */
  concurrencyLimit(maxConcurrent = 5) {
    const activeRequests = new Map();

    return async (req, res, next) => {
      const identifier = this.getIdentifier(req, 'concurrency');
      
      if (!identifier) {
        return next();
      }

      const currentActive = activeRequests.get(identifier) || 0;

      if (currentActive >= maxConcurrent) {
        return res.status(429).json({
          success: false,
          message: 'Too many concurrent requests, please try again later.',
          code: 'CONCURRENCY_LIMIT_EXCEEDED'
        });
      }

      // Increment active count
      activeRequests.set(identifier, currentActive + 1);

      // Decrement when response finishes
      const cleanup = () => {
        const current = activeRequests.get(identifier) || 0;
        if (current <= 1) {
          activeRequests.delete(identifier);
        } else {
          activeRequests.set(identifier, current - 1);
        }
      };

      res.on('finish', cleanup);
      res.on('close', cleanup);

      next();
    };
  }

  /**
   * Endpoint-specific rate limiting
   */
  endpointRateLimit() {
    return async (req, res, next) => {
      const endpointConfig = this.getEndpointConfig(req.path, req.method);
      
      if (endpointConfig) {
        const config = this.rateLimitConfig[endpointConfig.key] || this.rateLimitConfig['api'];
        const identifier = this.getIdentifier(req, endpointConfig.key);
        
        if (identifier) {
          const key = this.generateKey(identifier, endpointConfig.key, req.method, req.path);
          const current = await this.incrementCounter(key, config.windowMs);

          this.setRateLimitHeaders(res, current, config);

          if (current.count > config.max) {
            await this.handleRateLimitExceeded(req, identifier, endpointConfig.key, current);
            
            return res.status(429).json({
              success: false,
              message: config.message,
              code: config.code,
              retryAfter: Math.ceil((config.windowMs - (Date.now() - current.resetTime)) / 1000)
            });
          }
        }
      }

      next();
    };
  }

  /**
   * Get endpoint-specific rate limit configuration
   */
  getEndpointConfig(path, method) {
    const endpointRules = {
      // Authentication endpoints
      '/api/auth/login': { key: 'auth', method: 'POST' },
      '/api/auth/register': { key: 'auth', method: 'POST' },
      '/api/auth/otp/send': { key: 'otp', method: 'POST' },
      '/api/auth/otp/verify': { key: 'otp', method: 'POST' },
      '/api/auth/password/reset': { key: 'password-reset', method: 'POST' },
      
      // Search endpoints
      '/api/search/workers': { key: 'search', method: 'GET' },
      '/api/search/services': { key: 'search', method: 'GET' },
      
      // Upload endpoints
      '/api/upload/profile': { key: 'upload', method: 'POST' },
      '/api/upload/portfolio': { key: 'upload', method: 'POST' },
      '/api/upload/documents': { key: 'upload', method: 'POST' },
      
      // Payment endpoints
      '/api/payments/initiate': { key: 'payment', method: 'POST' },
      '/api/payments/verify': { key: 'payment', method: 'POST' },
      
      // Message endpoints
      '/api/messages/send': { key: 'messages', method: 'POST' },
      
      // Admin endpoints
      '/api/admin/': { key: 'admin', method: 'ALL' }
    };

    // Find matching rule
    for (const [endpoint, rule] of Object.entries(endpointRules)) {
      if (path.startsWith(endpoint) && (rule.method === 'ALL' || rule.method === method)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Get rate limit status for monitoring
   */
  async getRateLimitStatus(identifier) {
    const status = {};
    
    for (const [configKey, config] of Object.entries(this.rateLimitConfig)) {
      const key = this.generateKey(identifier, configKey, 'GET', '/api/test');
      const count = await redis.get(key);
      
      status[configKey] = {
        current: parseInt(count) || 0,
        limit: config.max,
        windowMs: config.windowMs,
        remaining: Math.max(0, config.max - (parseInt(count) || 0))
      };
    }
    
    return status;
  }

  /**
   * Reset rate limit for specific identifier
   */
  async resetRateLimit(identifier, configKey) {
    const pattern = `rate_limit:${configKey}:${identifier}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    return { success: true, resetCount: keys.length };
  }

  /**
   * Get global rate limit statistics
   */
  async getGlobalStats(timeRange = '1h') {
    try {
      const pattern = 'rate_limit:*';
      const keys = await redis.keys(pattern);
      
      const stats = {
        totalRequests: 0,
        activeIdentifiers: new Set(),
        endpointBreakdown: {},
        configBreakdown: {}
      };

      for (const key of keys) {
        const count = parseInt(await redis.get(key)) || 0;
        stats.totalRequests += count;

        // Extract identifier and config from key
        const parts = key.split(':');
        const configKey = parts[1];
        const identifier = parts[2];
        const method = parts[3];
        const endpoint = parts[4];

        stats.activeIdentifiers.add(identifier);

        // Endpoint breakdown
        const endpointKey = `${method} ${endpoint}`;
        stats.endpointBreakdown[endpointKey] = (stats.endpointBreakdown[endpointKey] || 0) + count;

        // Config breakdown
        stats.configBreakdown[configKey] = (stats.configBreakdown[configKey] || 0) + count;
      }

      return {
        ...stats,
        activeIdentifiers: stats.activeIdentifiers.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get global rate limit stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const rateLimitService = new RateLimitService();

// Export middleware functions
module.exports = {
  // Basic rate limiting
  rateLimit: (configKey) => rateLimitService.rateLimit(configKey),
  
  // Dynamic rate limiting based on user trust
  dynamicRateLimit: () => rateLimitService.dynamicRateLimit(),
  
  // Endpoint-specific rate limiting
  endpointRateLimit: () => rateLimitService.endpointRateLimit(),
  
  // Concurrency limiting
  concurrencyLimit: (maxConcurrent) => rateLimitService.concurrencyLimit(maxConcurrent),
  
  // Utility functions
  getRateLimitStatus: (identifier) => rateLimitService.getRateLimitStatus(identifier),
  resetRateLimit: (identifier, configKey) => rateLimitService.resetRateLimit(identifier, configKey),
  getGlobalStats: (timeRange) => rateLimitService.getGlobalStats(timeRange),
  
  // Service instance for advanced usage
  rateLimitService
};