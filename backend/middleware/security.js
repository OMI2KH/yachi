// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('./rateLimit');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiAI } = require('../services/yachiAI');
const logger = require('../utils/logger');

class SecurityService {
  constructor() {
    this.suspiciousActivities = new Map();
    this.blockedIPs = new Map();
    this.trustedDevices = new Map();
    this.securityConfig = this.loadSecurityConfig();
  }

  /**
   * Load security configuration
   */
  loadSecurityConfig() {
    return {
      // CORS configuration
      cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://yachi.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
        credentials: true,
        maxAge: 86400 // 24 hours
      },

      // Helmet security headers configuration
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "https://api.yachi.com"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: { policy: "same-origin" },
        crossOriginResourcePolicy: { policy: "same-origin" }
      },

      // Rate limiting configuration
      rateLimit: {
        auth: { windowMs: 900000, max: 5 },
        api: { windowMs: 900000, max: 100 },
        strict: { windowMs: 3600000, max: 10 }
      },

      // Security monitoring
      monitoring: {
        suspiciousLoginAttempts: 5,
        failedOtpAttempts: 3,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
      }
    };
  }

  /**
   * Main security middleware
   */
  securityMiddleware() {
    return [
      // Helmet security headers
      this.helmetMiddleware(),
      
      // CORS configuration
      this.corsMiddleware(),
      
      // Request logging
      this.requestLoggerMiddleware(),
      
      // IP filtering
      this.ipFilterMiddleware(),
      
      // Request sanitization
      this.sanitizationMiddleware(),
      
      // Security headers
      this.securityHeadersMiddleware(),
      
      // Bot detection
      this.botDetectionMiddleware()
    ];
  }

  /**
   * Enhanced helmet middleware
   */
  helmetMiddleware() {
    return helmet(this.securityConfig.helmet);
  }

  /**
   * CORS middleware
   */
  corsMiddleware() {
    const cors = require('cors');
    return cors(this.securityConfig.cors);
  }

  /**
   * Request logger middleware
   */
  requestLoggerMiddleware() {
    return (req, res, next) => {
      const requestId = crypto.randomBytes(16).toString('hex');
      req.requestId = requestId;
      
      const startTime = Date.now();
      
      // Log request
      logger.info('Incoming request', {
        requestId,
        method: req.method,
        url: req.url,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        userId: req.user?.userId || 'anonymous'
      });

      // Monitor response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        logger.info('Request completed', {
          requestId,
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          ip: this.getClientIP(req),
          userId: req.user?.userId || 'anonymous'
        });

        // Track suspicious responses
        if (res.statusCode >= 400) {
          this.trackSuspiciousResponse(req, res, duration);
        }
      });

      next();
    };
  }

  /**
   * IP filtering middleware
   */
  ipFilterMiddleware() {
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);
      
      // Check if IP is blocked
      if (this.isIPBlocked(clientIP)) {
        logger.warn('Blocked IP attempt', {
          ip: clientIP,
          url: req.url,
          userAgent: req.headers['user-agent']
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'IP_BLOCKED'
        });
      }

      // Check for suspicious IP patterns
      this.checkSuspiciousIP(clientIP, req);

      next();
    };
  }

  /**
   * Request sanitization middleware
   */
  sanitizationMiddleware() {
    return (req, res, next) => {
      // Sanitize request body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    };
  }

  /**
   * Security headers middleware
   */
  securityHeadersMiddleware() {
    return (req, res, next) => {
      // Additional security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), location=()',
        'X-Request-ID': req.requestId
      });

      next();
    };
  }

  /**
   * Bot detection middleware
   */
  botDetectionMiddleware() {
    return (req, res, next) => {
      const userAgent = req.headers['user-agent'] || '';
      const clientIP = this.getClientIP(req);

      // Check for common bot patterns
      if (this.isLikelyBot(userAgent, clientIP)) {
        logger.warn('Bot detection triggered', {
          ip: clientIP,
          userAgent,
          url: req.url
        });

        // Track bot activity
        this.trackBotActivity(req);

        // For sensitive endpoints, require additional verification
        if (this.isSensitiveEndpoint(req)) {
          return this.handleBotDetection(req, res);
        }
      }

      next();
    };
  }

  /**
   * Advanced authentication security middleware
   */
  authSecurityMiddleware() {
    return [
      // Rate limiting for auth endpoints
      rateLimit.rateLimit('auth'),
      
      // Brute force protection
      this.bruteForceProtectionMiddleware(),
      
      // Device fingerprinting
      this.deviceFingerprintingMiddleware(),
      
      // Session security
      this.sessionSecurityMiddleware()
    ];
  }

  /**
   * Brute force protection middleware
   */
  bruteForceProtectionMiddleware() {
    return async (req, res, next) => {
      const clientIP = this.getClientIP(req);
      const identifier = req.body.email || req.body.phone || clientIP;

      try {
        // Check failed attempts
        const failedAttempts = await this.getFailedAuthAttempts(identifier);
        
        if (failedAttempts >= this.securityConfig.monitoring.suspiciousLoginAttempts) {
          // Block for increasing duration based on attempts
          const blockDuration = Math.min(failedAttempts * 15 * 60 * 1000, 24 * 60 * 60 * 1000); // Max 24 hours
          await this.blockIP(clientIP, blockDuration);
          
          logger.warn('Brute force protection triggered', {
            identifier,
            ip: clientIP,
            failedAttempts,
            blockDuration
          });

          return res.status(429).json({
            success: false,
            message: 'Too many failed attempts. Please try again later.',
            code: 'BRUTE_FORCE_BLOCKED',
            retryAfter: Math.ceil(blockDuration / 1000)
          });
        }

        next();
      } catch (error) {
        logger.error('Brute force protection error:', error);
        next();
      }
    };
  }

  /**
   * Device fingerprinting middleware
   */
  deviceFingerprintingMiddleware() {
    return (req, res, next) => {
      const fingerprint = this.generateDeviceFingerprint(req);
      req.deviceFingerprint = fingerprint;

      // Check if device is trusted
      if (req.user && !this.isDeviceTrusted(req.user.userId, fingerprint)) {
        req.requiresDeviceVerification = true;
      }

      next();
    };
  }

  /**
   * Session security middleware
   */
  sessionSecurityMiddleware() {
    return (req, res, next) => {
      if (!req.user) return next();

      // Check session age
      if (req.user.sessionIssuedAt) {
        const sessionAge = Date.now() - new Date(req.user.sessionIssuedAt).getTime();
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge > maxSessionAge) {
          return res.status(401).json({
            success: false,
            message: 'Session expired',
            code: 'SESSION_EXPIRED'
          });
        }
      }

      // Check for simultaneous sessions
      this.checkSimultaneousSessions(req);

      next();
    };
  }

  /**
   * File upload security middleware
   */
  fileUploadSecurityMiddleware() {
    return async (req, res, next) => {
      if (!req.file && !req.files) return next();

      const files = req.file ? [req.file] : req.files;

      try {
        for (const file of files) {
          // Check file size
          if (file.size > this.securityConfig.monitoring.maxFileSize) {
            throw new Error(`File too large: ${file.originalname}`);
          }

          // Check MIME type
          if (!this.securityConfig.monitoring.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`Invalid file type: ${file.mimetype}`);
          }

          // Scan for malware patterns
          const isSafe = await this.scanFileForThreats(file);
          if (!isSafe) {
            throw new Error(`File security check failed: ${file.originalname}`);
          }

          // Validate image integrity
          if (file.mimetype.startsWith('image/')) {
            await this.validateImageIntegrity(file);
          }
        }

        next();
      } catch (error) {
        logger.error('File upload security check failed:', error);
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'FILE_SECURITY_CHECK_FAILED'
        });
      }
    };
  }

  /**
   * API key validation middleware
   */
  apiKeyValidationMiddleware() {
    return async (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: 'API key required',
          code: 'API_KEY_REQUIRED'
        });
      }

      try {
        const isValid = await this.validateAPIKey(apiKey, req);
        
        if (!isValid) {
          return res.status(401).json({
            success: false,
            message: 'Invalid API key',
            code: 'INVALID_API_KEY'
          });
        }

        // Check API key permissions
        const hasPermission = await this.checkAPIPermissions(apiKey, req);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        next();
      } catch (error) {
        logger.error('API key validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          code: 'API_VALIDATION_ERROR'
        });
      }
    };
  }

  /**
   * Data validation and sanitization middleware
   */
  dataValidationMiddleware(schema) {
    return (req, res, next) => {
      try {
        // Validate request data against schema
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }));

          logger.warn('Data validation failed', {
            requestId: req.requestId,
            errors: validationErrors,
            userId: req.user?.userId
          });

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: validationErrors
          });
        }

        // Replace with sanitized data
        req.body = value;
        next();
      } catch (error) {
        logger.error('Data validation middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          code: 'VALIDATION_PROCESSING_ERROR'
        });
      }
    };
  }

  /**
   * SQL injection protection middleware
   */
  sqlInjectionProtectionMiddleware() {
    return (req, res, next) => {
      const suspiciousPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b)/i,
        /(\b(OR|AND)\s+['"]?\d+['"]?\s*[=<>])/i,
        /(--|\/\*|\*\/|;)/,
        /(\b(WAITFOR|DELAY)\b)/i
      ];

      const checkValue = (value) => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        return false;
      };

      // Check body
      if (req.body && this.searchObject(req.body, checkValue)) {
        return this.handleSuspiciousActivity(req, res, 'SQL_INJECTION_ATTEMPT');
      }

      // Check query parameters
      if (req.query && this.searchObject(req.query, checkValue)) {
        return this.handleSuspiciousActivity(req, res, 'SQL_INJECTION_ATTEMPT');
      }

      // Check URL parameters
      if (req.params && this.searchObject(req.params, checkValue)) {
        return this.handleSuspiciousActivity(req, res, 'SQL_INJECTION_ATTEMPT');
      }

      next();
    };
  }

  /**
   * XSS protection middleware
   */
  xssProtectionMiddleware() {
    return (req, res, next) => {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /expression\s*\(/gi,
        /vbscript:/gi
      ];

      const checkValue = (value) => {
        if (typeof value === 'string') {
          return xssPatterns.some(pattern => pattern.test(value));
        }
        return false;
      };

      if (req.body && this.searchObject(req.body, checkValue)) {
        return this.handleSuspiciousActivity(req, res, 'XSS_ATTEMPT');
      }

      next();
    };
  }

  /**
   * Utility Methods
   */

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip) {
    const blockInfo = this.blockedIPs.get(ip);
    if (blockInfo && blockInfo.expires > Date.now()) {
      return true;
    }
    
    // Clean up expired blocks
    if (blockInfo && blockInfo.expires <= Date.now()) {
      this.blockedIPs.delete(ip);
    }
    
    return false;
  }

  /**
   * Block IP address
   */
  async blockIP(ip, duration = 3600000) { // Default 1 hour
    this.blockedIPs.set(ip, {
      expires: Date.now() + duration,
      reason: 'suspicious_activity',
      timestamp: new Date().toISOString()
    });

    // Log the block
    logger.warn('IP address blocked', {
      ip,
      duration,
      reason: 'suspicious_activity'
    });

    // Track in analytics
    await YachiAnalytics.trackSecurityEvent({
      type: 'IP_BLOCKED',
      ip,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(req) {
    const components = [
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.headers['accept-encoding'],
      this.getClientIP(req)
    ].filter(Boolean).join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /**
   * Check if device is trusted
   */
  isDeviceTrusted(userId, fingerprint) {
    const userDevices = this.trustedDevices.get(userId) || new Set();
    return userDevices.has(fingerprint);
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  /**
   * Sanitize single value
   */
  sanitizeValue(value) {
    if (typeof value !== 'string') return value;

    // Remove potentially dangerous characters
    return value
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Search object for suspicious patterns
   */
  searchObject(obj, checkFn) {
    if (typeof obj === 'string') {
      return checkFn(obj);
    }

    if (Array.isArray(obj)) {
      return obj.some(item => this.searchObject(item, checkFn));
    }

    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => this.searchObject(value, checkFn));
    }

    return false;
  }

  /**
   * Check for suspicious IP patterns
   */
  checkSuspiciousIP(ip, req) {
    // Check for known VPN/Tor IPs (simplified)
    const suspiciousRanges = [
      /^185\./,
      /^192\./,
      /^45\./
    ];

    const isSuspicious = suspiciousRanges.some(range => range.test(ip));
    
    if (isSuspicious) {
      this.trackSuspiciousActivity(req, 'SUSPICIOUS_IP', {
        ip,
        type: 'VPN/TOR_DETECTED'
      });
    }
  }

  /**
   * Detect bots
   */
  isLikelyBot(userAgent, ip) {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ];

    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    // Additional checks for headless browsers
    const headlessIndicators = [
      'HeadlessChrome',
      'PhantomJS',
      'Puppeteer'
    ];

    const isHeadless = headlessIndicators.some(indicator => userAgent.includes(indicator));

    return isBot || isHeadless;
  }

  /**
   * Check if endpoint is sensitive
   */
  isSensitiveEndpoint(req) {
    const sensitiveEndpoints = [
      '/api/auth/',
      '/api/payments/',
      '/api/admin/',
      '/api/upload/'
    ];

    return sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
  }

  /**
   * Handle bot detection
   */
  handleBotDetection(req, res) {
    // Implement CAPTCHA or additional verification
    return res.status(403).json({
      success: false,
      message: 'Additional verification required',
      code: 'BOT_DETECTED',
      verificationRequired: true
    });
  }

  /**
   * Track suspicious activity
   */
  async trackSuspiciousActivity(req, type, metadata = {}) {
    const activity = {
      type,
      requestId: req.requestId,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      endpoint: `${req.method} ${req.path}`,
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Store in memory for quick access
    const key = `${activity.ip}_${type}`;
    this.suspiciousActivities.set(key, activity);

    // Track in analytics
    await YachiAnalytics.trackSecurityEvent(activity);

    // AI-powered threat analysis
    try {
      const threatAnalysis = await YachiAI.analyzeThreat(activity);
      if (threatAnalysis.riskLevel === 'high') {
        await this.blockIP(activity.ip, 3600000); // Block for 1 hour
      }
    } catch (error) {
      logger.error('Threat analysis failed:', error);
    }

    logger.warn('Suspicious activity detected', activity);
  }

  /**
   * Get failed authentication attempts
   */
  async getFailedAuthAttempts(identifier) {
    const key = `auth_failures:${identifier}`;
    const failures = await redis.get(key);
    return parseInt(failures) || 0;
  }

  /**
   * Scan file for threats
   */
  async scanFileForThreats(file) {
    // Implement file scanning logic
    // This could integrate with antivirus APIs or use pattern matching
    
    const suspiciousPatterns = [
      /eval\(/,
      /base64_decode\(/,
      /shell_exec\(/,
      /system\(/
    ];

    const buffer = file.buffer || await fs.readFile(file.path);
    const content = buffer.toString('utf8');

    return !suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate image integrity
   */
  async validateImageIntegrity(file) {
    // Implement image validation logic
    // Check for valid image structure, dimensions, etc.
    return true;
  }

  /**
   * Handle suspicious activity response
   */
  handleSuspiciousActivity(req, res, type) {
    this.trackSuspiciousActivity(req, type);

    return res.status(403).json({
      success: false,
      message: 'Suspicious activity detected',
      code: type,
      requestId: req.requestId
    });
  }
}

// Create singleton instance
const securityService = new SecurityService();

// Export middleware functions
module.exports = {
  // Main security middleware stack
  securityMiddleware: () => securityService.securityMiddleware(),
  
  // Authentication security
  authSecurityMiddleware: () => securityService.authSecurityMiddleware(),
  
  // File upload security
  fileUploadSecurity: () => securityService.fileUploadSecurityMiddleware(),
  
  // API key validation
  apiKeyValidation: () => securityService.apiKeyValidationMiddleware(),
  
  // Data validation
  dataValidation: (schema) => securityService.dataValidationMiddleware(schema),
  
  // SQL injection protection
  sqlInjectionProtection: () => securityService.sqlInjectionProtectionMiddleware(),
  
  // XSS protection
  xssProtection: () => securityService.xssProtectionMiddleware(),
  
  // Utility functions
  getClientIP: (req) => securityService.getClientIP(req),
  trackSuspiciousActivity: (req, type, metadata) => securityService.trackSuspiciousActivity(req, type, metadata),
  
  // Service instance for advanced usage
  securityService
};