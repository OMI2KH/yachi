const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const { ERROR_CODES, ROLES, PERMISSIONS } = require('./constants');

// 🎯 SECURITY CONFIGURATION
const SECURITY_CONFIG = {
  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'yachi-super-secret-key-change-in-production',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    ISSUER: process.env.JWT_ISSUER || 'yachi-platform',
    AUDIENCE: process.env.JWT_AUDIENCE || 'yachi-users'
  },

  // Password Policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_AGE_DAYS: 90, // Password expiration
    HISTORY_COUNT: 5  // Remember last 5 passwords
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // Limit each IP to 100 requests per windowMs
    SKIP_SUCCESSFUL_REQUESTS: false
  },

  // CORS Configuration
  CORS: {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://yachi.com',
      'https://www.yachi.com'
    ],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    ALLOWED_HEADERS: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-CSRF-Token'
    ]
  },

  // Security Headers
  SECURITY_HEADERS: {
    CSP: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    HSTS: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  },

  // Threat Detection
  THREAT_DETECTION: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
    SUSPICIOUS_ACTIVITY_WINDOW: 5 * 60 * 1000 // 5 minutes
  }
};

// 🎯 ENCRYPTION SERVICE
class EncryptionService {
  /**
   * Generate cryptographic salt
   */
  static generateSalt(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data with salt
   */
  static async hashData(data, salt = null) {
    const usedSalt = salt || this.generateSalt();
    const hash = crypto.createHmac('sha512', usedSalt);
    hash.update(data);
    const value = hash.digest('hex');
    
    return {
      salt: usedSalt,
      hash: value
    };
  }

  /**
   * Verify hashed data
   */
  static async verifyHash(data, hash, salt) {
    const newHash = await this.hashData(data, salt);
    return newHash.hash === hash;
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(text, key = process.env.ENCRYPTION_KEY) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        iv: iv.toString('hex'),
        data: encrypted,
        authTag: authTag.toString('hex'),
        algorithm
      };
    } catch (error) {
      throw new SecurityError('Encryption failed', 'ENCRYPTION_FAILED', { originalError: error.message });
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    try {
      const { iv, data, authTag, algorithm } = encryptedData;
      const decipher = crypto.createDecipher(algorithm, key);
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      decipher.setIV(Buffer.from(iv, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new SecurityError('Decryption failed', 'DECRYPTION_FAILED', { originalError: error.message });
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// 🎯 AUTHENTICATION SERVICE
class AuthenticationService {
  /**
   * Generate JWT token
   */
  static generateToken(payload, options = {}) {
    const {
      expiresIn = SECURITY_CONFIG.JWT.EXPIRES_IN,
      type = 'access'
    } = options;

    const tokenPayload = {
      ...payload,
      type,
      jti: uuidv4(), // JWT ID for tracking
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, SECURITY_CONFIG.JWT.SECRET, {
      expiresIn,
      issuer: SECURITY_CONFIG.JWT.ISSUER,
      audience: SECURITY_CONFIG.JWT.AUDIENCE
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token, options = {}) {
    const { requireType = null } = options;

    try {
      const decoded = jwt.verify(token, SECURITY_CONFIG.JWT.SECRET, {
        issuer: SECURITY_CONFIG.JWT.ISSUER,
        audience: SECURITY_CONFIG.JWT.AUDIENCE
      });

      if (requireType && decoded.type !== requireType) {
        throw new SecurityError('Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new SecurityError('Token has expired', 'TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new SecurityError('Invalid token', 'INVALID_TOKEN');
      }
      throw new SecurityError('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId) {
    const payload = {
      userId,
      type: 'refresh'
    };

    return this.generateToken(payload, {
      expiresIn: SECURITY_CONFIG.JWT.REFRESH_EXPIRES_IN
    });
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password against policy
   */
  static validatePassword(password) {
    const issues = [];

    if (password.length < SECURITY_CONFIG.PASSWORD_POLICY.MIN_LENGTH) {
      issues.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_POLICY.MIN_LENGTH} characters long`);
    }

    if (SECURITY_CONFIG.PASSWORD_POLICY.REQUIRE_UPPERCASE && !/(?=.*[A-Z])/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    }

    if (SECURITY_CONFIG.PASSWORD_POLICY.REQUIRE_LOWERCASE && !/(?=.*[a-z])/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    }

    if (SECURITY_CONFIG.PASSWORD_POLICY.REQUIRE_NUMBERS && !/(?=.*\d)/.test(password)) {
      issues.push('Password must contain at least one number');
    }

    if (SECURITY_CONFIG.PASSWORD_POLICY.REQUIRE_SYMBOLS && !/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      issues.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'letmein', 'welcome'];
    if (commonPasswords.includes(password.toLowerCase())) {
      issues.push('Password is too common and easily guessable');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate OTP code
   */
  static generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    
    return otp;
  }

  /**
   * Generate API key
   */
  static generateApiKey(prefix = 'yachi') {
    const random = crypto.randomBytes(20).toString('hex');
    return `${prefix}_${random}`;
  }
}

// 🎯 THREAT DETECTION SERVICE
class ThreatDetectionService {
  /**
   * Detect SQL injection attempts
   */
  static detectSQLInjection(input) {
    if (typeof input !== 'string') return false;

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)\b)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /('|"|;|--|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar)/i,
      /(\b(WAITFOR|DELAY|SLEEP)\b)/i,
      /(\b(XP_|SP_|FN_)\b)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect XSS attempts
   */
  static detectXSS(input) {
    if (typeof input !== 'string') return false;

    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<\s*iframe/gi,
      /<\s*form/gi,
      /<\s*meta/gi,
      /<\s*object/gi,
      /<\s*embed/gi,
      /<\s*applet/gi,
      /<\s*link/gi,
      /expression\s*\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect path traversal attempts
   */
  static detectPathTraversal(input) {
    if (typeof input !== 'string') return false;

    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /\/etc\/passwd/,
      /\/etc\/shadow/,
      /\/proc\/self/,
      /\.\.%2f/,
      /\.\.%5c/
    ];

    return traversalPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect command injection attempts
   */
  static detectCommandInjection(input) {
    if (typeof input !== 'string') return false;

    const commandPatterns = [
      /[;&|`$(){}[\]]/,
      /(\b(rm|del|mkdir|chmod|chown|wget|curl|nc|netcat)\b)/i,
      /(\|.*\b(cat|ls|dir|echo|print)\b)/i
    ];

    return commandPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Scan for multiple threat types
   */
  static scanForThreats(input, context = 'general') {
    const threats = [];

    if (this.detectSQLInjection(input)) {
      threats.push({
        type: 'SQL_INJECTION',
        severity: 'high',
        message: 'Potential SQL injection detected'
      });
    }

    if (this.detectXSS(input)) {
      threats.push({
        type: 'XSS',
        severity: 'high',
        message: 'Potential cross-site scripting detected'
      });
    }

    if (this.detectPathTraversal(input)) {
      threats.push({
        type: 'PATH_TRAVERSAL',
        severity: 'medium',
        message: 'Potential path traversal detected'
      });
    }

    if (this.detectCommandInjection(input)) {
      threats.push({
        type: 'COMMAND_INJECTION',
        severity: 'high',
        message: 'Potential command injection detected'
      });
    }

    return {
      isSafe: threats.length === 0,
      threats,
      context
    };
  }

  /**
   * Analyze request for suspicious patterns
   */
  static analyzeRequest(req) {
    const suspiciousPatterns = [];

    // Check user agent
    if (!req.headers['user-agent'] || req.headers['user-agent'].length < 10) {
      suspiciousPatterns.push('Missing or suspicious User-Agent');
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-cluster-client-ip'];
    suspiciousHeaders.forEach(header => {
      if (req.headers[header] && !validator.isIP(req.headers[header].split(',')[0])) {
        suspiciousPatterns.push(`Suspicious ${header} header`);
      }
    });

    // Check request body for threats
    if (req.body && typeof req.body === 'object') {
      const bodyString = JSON.stringify(req.body);
      const bodyThreats = this.scanForThreats(bodyString, 'request-body');
      if (!bodyThreats.isSafe) {
        suspiciousPatterns.push(...bodyThreats.threats.map(t => t.message));
      }
    }

    // Check query parameters
    if (req.query && typeof req.query === 'object') {
      const queryString = JSON.stringify(req.query);
      const queryThreats = this.scanForThreats(queryString, 'query-parameters');
      if (!queryThreats.isSafe) {
        suspiciousPatterns.push(...queryThreats.threats.map(t => t.message));
      }
    }

    return {
      isSuspicious: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
      riskLevel: suspiciousPatterns.length > 2 ? 'high' : suspiciousPatterns.length > 0 ? 'medium' : 'low'
    };
  }
}

// 🎯 RATE LIMITING SERVICE
class RateLimitingService {
  /**
   * Create rate limiters for different endpoints
   */
  static createRateLimiters() {
    return {
      // General API rate limiting
      general: rateLimit({
        windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
        max: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS,
        message: {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false
      }),

      // Stricter limits for authentication endpoints
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: {
          error: 'Too many authentication attempts',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter: 900 // 15 minutes in seconds
        },
        skipSuccessfulRequests: true
      }),

      // File upload limits
      upload: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 uploads per hour
        message: {
          error: 'Too many file uploads',
          code: 'UPLOAD_LIMIT_EXCEEDED',
          retryAfter: 3600 // 1 hour in seconds
        }
      }),

      // Payment endpoint limits
      payment: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 payment attempts per hour
        message: {
          error: 'Too many payment attempts',
          code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
          retryAfter: 3600
        }
      })
    };
  }

  /**
   * Create dynamic rate limiter based on user role
   */
  static createRoleBasedRateLimiter() {
    return (req, res, next) => {
      let maxRequests;

      switch (req.user?.role) {
        case ROLES.ADMIN:
        case ROLES.SUPER_ADMIN:
          maxRequests = 1000; // Higher limits for admins
          break;
        case ROLES.PROVIDER:
          maxRequests = 500; // Medium limits for providers
          break;
        case ROLES.CLIENT:
        default:
          maxRequests = 100; // Standard limits for clients
      }

      return rateLimit({
        windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
        max: maxRequests,
        keyGenerator: (req) => req.user?.id || req.ip,
        message: {
          error: 'Rate limit exceeded for your account type',
          code: 'ROLE_RATE_LIMIT_EXCEEDED'
        }
      })(req, res, next);
    };
  }
}

// 🎯 SECURITY HEADERS SERVICE
class SecurityHeadersService {
  /**
   * Configure Helmet with custom security headers
   */
  static configureHelmet() {
    return helmet({
      contentSecurityPolicy: SECURITY_CONFIG.SECURITY_HEADERS.CSP,
      hsts: SECURITY_CONFIG.SECURITY_HEADERS.HSTS,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    });
  }

  /**
   * Add custom security headers
   */
  static addCustomSecurityHeaders(req, res, next) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Feature policy
    res.setHeader('Feature-Policy', [
      "camera 'none'",
      "microphone 'none'",
      "geolocation 'none'",
      "payment 'none'"
    ].join('; '));

    next();
  }

  /**
   * Configure CORS with security options
   */
  static configureCORS() {
    return (req, res, next) => {
      const origin = req.headers.origin;
      
      if (SECURITY_CONFIG.CORS.ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Methods', SECURITY_CONFIG.CORS.ALLOWED_METHODS.join(','));
      res.setHeader('Access-Control-Allow-Headers', SECURITY_CONFIG.CORS.ALLOWED_HEADERS.join(','));
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    };
  }
}

// 🎯 ACCESS CONTROL SERVICE
class AccessControlService {
  /**
   * Check if user has permission
   */
  static hasPermission(user, permission) {
    if (!user || !user.role) return false;

    const rolePermissions = {
      [ROLES.CLIENT]: [
        PERMISSIONS.PROFILE_VIEW,
        PERMISSIONS.PROFILE_EDIT,
        PERMISSIONS.SERVICE_VIEW,
        PERMISSIONS.BOOKING_CREATE,
        PERMISSIONS.BOOKING_VIEW,
        PERMISSIONS.PAYMENT_CREATE,
        PERMISSIONS.PAYMENT_VIEW
      ],
      [ROLES.PROVIDER]: [
        PERMISSIONS.PROFILE_VIEW,
        PERMISSIONS.PROFILE_EDIT,
        PERMISSIONS.SERVICE_CREATE,
        PERMISSIONS.SERVICE_EDIT,
        PERMISSIONS.SERVICE_VIEW,
        PERMISSIONS.BOOKING_VIEW,
        PERMISSIONS.PAYMENT_VIEW
      ],
      [ROLES.ADMIN]: Object.values(PERMISSIONS),
      [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS)
    };

    return rolePermissions[user.role]?.includes(permission) || false;
  }

  /**
   * Check if user has any of the required permissions
   */
  static hasAnyPermission(user, permissions) {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user can access resource (ownership check)
   */
  static canAccessResource(user, resource, resourceType) {
    if (!user || !resource) return false;

    // Admins can access everything
    if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
      return true;
    }

    // Check ownership based on resource type
    switch (resourceType) {
      case 'user':
        return user.id === resource.id;
      
      case 'service':
        return user.id === resource.providerId;
      
      case 'booking':
        return user.id === resource.clientId || user.id === resource.providerId;
      
      case 'review':
        return user.id === resource.authorId || user.id === resource.revieweeId;
      
      default:
        return false;
    }
  }

  /**
   * Middleware for permission checking
   */
  static requirePermission(permission) {
    return (req, res, next) => {
      if (!this.hasPermission(req.user, permission)) {
        throw new SecurityError(
          'Insufficient permissions',
          'INSUFFICIENT_PERMISSIONS',
          { requiredPermission: permission }
        );
      }
      next();
    };
  }

  /**
   * Middleware for resource ownership check
   */
  static requireOwnership(resourceType, idParam = 'id') {
    return async (req, res, next) => {
      try {
        const resourceId = req.params[idParam];
        const ResourceModel = require(`../models/${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`);
        
        const resource = await ResourceModel.findByPk(resourceId);
        if (!resource) {
          throw new SecurityError('Resource not found', 'RESOURCE_NOT_FOUND');
        }

        if (!this.canAccessResource(req.user, resource, resourceType)) {
          throw new SecurityError('Access denied', 'ACCESS_DENIED');
        }

        req.resource = resource;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

// 🎯 AUDIT LOGGING SERVICE
class AuditLogService {
  /**
   * Log security events
   */
  static async logSecurityEvent(event, context = {}) {
    const SecurityLog = require('../models/SecurityLog');
    
    try {
      await SecurityLog.create({
        eventType: event.type,
        severity: event.severity || 'medium',
        userId: context.userId || null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: event.description,
        metadata: {
          ...context,
          timestamp: new Date().toISOString()
        }
      });

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SECURITY] ${event.type}: ${event.description}`, context);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(userId, eventType, ipAddress, userAgent, metadata = {}) {
    await this.logSecurityEvent({
      type: `AUTH_${eventType.toUpperCase()}`,
      description: `Authentication ${eventType} for user ${userId}`,
      severity: eventType === 'FAILED' ? 'high' : 'low'
    }, {
      userId,
      ipAddress,
      userAgent,
      ...metadata
    });
  }

  /**
   * Log access control events
   */
  static async logAccessEvent(userId, eventType, resource, ipAddress, userAgent) {
    await this.logSecurityEvent({
      type: `ACCESS_${eventType.toUpperCase()}`,
      description: `${eventType} access to ${resource.type} ${resource.id}`,
      severity: eventType === 'DENIED' ? 'medium' : 'low'
    }, {
      userId,
      ipAddress,
      userAgent,
      resource
    });
  }
}

// 🎯 SECURITY ERROR CLASS
class SecurityError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.details = details;
    this.statusCode = this.getStatusCode(code);
  }

  getStatusCode(code) {
    const statusMap = {
      'TOKEN_EXPIRED': 401,
      'INVALID_TOKEN': 401,
      'INSUFFICIENT_PERMISSIONS': 403,
      'ACCESS_DENIED': 403,
      'RATE_LIMIT_EXCEEDED': 429,
      'ENCRYPTION_FAILED': 500,
      'DECRYPTION_FAILED': 500,
      'VALIDATION_FAILED': 400
    };

    return statusMap[code] || 400;
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      ...(Object.keys(this.details).length > 0 && { details: this.details })
    };
  }
}

// 🎯 SECURITY MIDDLEWARE
class SecurityMiddleware {
  /**
   * Threat detection middleware
   */
  static threatDetection() {
    return (req, res, next) => {
      const threatAnalysis = ThreatDetectionService.analyzeRequest(req);
      
      if (threatAnalysis.isSuspicious) {
        AuditLogService.logSecurityEvent({
          type: 'SUSPICIOUS_REQUEST',
          description: `Suspicious request detected with ${threatAnalysis.patterns.length} patterns`,
          severity: threatAnalysis.riskLevel
        }, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          patterns: threatAnalysis.patterns,
          url: req.url,
          method: req.method
        });

        if (threatAnalysis.riskLevel === 'high') {
          return res.status(400).json({
            success: false,
            error: 'Suspicious request detected',
            code: 'SUSPICIOUS_REQUEST'
          });
        }
      }

      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  static sanitizeInput() {
    return (req, res, next) => {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeObject(req.query);
      }

      next();
    };
  }

  static sanitizeObject(obj) {
    const sanitized = { ...obj };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = validator.escape(value.trim());
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }
}

// 🎯 EXPORT ALL SECURITY SERVICES
module.exports = {
  SECURITY_CONFIG,
  EncryptionService,
  AuthenticationService,
  ThreatDetectionService,
  RateLimitingService,
  SecurityHeadersService,
  AccessControlService,
  AuditLogService,
  SecurityMiddleware,
  SecurityError
};

// Convenience helper exports matching test expectations
module.exports.sanitizeInput = function(input) {
  if (typeof input !== 'string') return input;
  // Remove script tags and escape
  const stripped = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  return require('validator').escape(stripped).trim();
};

module.exports.maskSensitiveData = function(value) {
  if (!value) return value;
  const str = String(value);
  // Email masking
  if (str.includes('@')) {
    const [user, domain] = str.split('@');
    return user.slice(0, 2) + '****@' + domain;
  }
  // Numeric masking (phone / card)
  if (/^\+?\d+$/.test(str)) {
    const digits = str.replace(/[^\d]/g, '');
    // International style with leading + (e.g. +2547...)
    if (str.startsWith('+')) {
      const start = str.slice(0, 4); // +254
      const end = digits.slice(-3);
      return start + '******' + end;
    }
    // Long numeric values -> card numbers: keep first 6, last 4
    if (digits.length >= 13) {
      const start = digits.slice(0, 6);
      const end = digits.slice(-4);
      return start + '******' + end;
    }
    // Typical phone numbers: keep first 4, last 3
    const start = digits.slice(0, 4);
    const end = digits.slice(-3);
    return start + '******' + end;
  }
  // Fallback
  return str.slice(0, 2) + '****' + str.slice(-2);
};

module.exports.generateSecureToken = function(len = 32) {
  return EncryptionService.generateSecureToken(len);
};