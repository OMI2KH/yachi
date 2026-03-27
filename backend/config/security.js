const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { YachiLogger } = require('../utils/logger');

/**
 * 🛡️ Yachi Security Configuration
 * Comprehensive security setup for the Yachi platform
 */

class SecurityConfig {
  constructor() {
    this.setupEnvironment();
  }

  /**
   * 🎯 Environment-based security configuration
   */
  setupEnvironment() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTesting = process.env.NODE_ENV === 'test';
  }

  /**
   * 🔐 Password Security Configuration
   */
  get passwordConfig() {
    return {
      // BCrypt configuration
      saltRounds: this.isProduction ? 12 : 10,
      minLength: 8,
      maxLength: 128,
      
      // Password complexity requirements
      complexity: {
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        minStrength: 3 // 1-4 scale
      },
      
      // Password policy
      policy: {
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        historySize: 5, // Remember last 5 passwords
        expiryDays: 90, // Password expires after 90 days
        warningDays: 7 // Warn 7 days before expiry
      }
    };
  }

  /**
   * 🎫 JWT Configuration
   */
  get jwtConfig() {
    return {
      // Secret keys (rotate in production)
      accessTokenSecret: process.env.JWT_ACCESS_SECRET || this.generateFallbackSecret('access'),
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET || this.generateFallbackSecret('refresh'),
      resetTokenSecret: process.env.JWT_RESET_SECRET || this.generateFallbackSecret('reset'),
      verifyTokenSecret: process.env.JWT_VERIFY_SECRET || this.generateFallbackSecret('verify'),
      
      // Token expiration
      expiration: {
        accessToken: '15m',    // 15 minutes
        refreshToken: '7d',     // 7 days
        resetToken: '1h',       // 1 hour
        verifyToken: '24h',     // 24 hours
        sessionToken: '30m'     // 30 minutes
      },
      
      // Token settings
      issuer: 'yachi-backend',
      audience: 'yachi-users',
      algorithm: 'HS256'
    };
  }

  /**
   * 🚦 Rate Limiting Configuration
   */
  get rateLimitConfig() {
    const baseConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      
      // Custom handler
      handler: (req, res) => {
        YachiLogger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
          endpoint: req.url,
          method: req.method,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(this.rateLimitConfig.windowMs / 1000)
        });
      }
    };

    return {
      // General API limits
      general: baseConfig,

      // Strict limits for sensitive endpoints
      strict: {
        ...baseConfig,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10 // 10 requests per window
      },

      // Auth-specific limits
      auth: {
        ...baseConfig,
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // 5 login attempts per hour
        skipSuccessfulRequests: true
      },

      // File upload limits
      upload: {
        ...baseConfig,
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20 // 20 uploads per hour
      },

      // Payment limits
      payment: {
        ...baseConfig,
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10 // 10 payment attempts per hour
      }
    };
  }

  /**
   * 🔒 CORS Configuration
   */
  get corsConfig() {
    const allowedOrigins = this.getAllowedOrigins();
    
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          YachiLogger.warn(`CORS blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version',
        'X-Device-ID',
        'Accept',
        'Origin',
        'Cache-Control'
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count',
        'X-API-Version'
      ],
      maxAge: 86400 // 24 hours
    };
  }

  /**
   * 🛡️ Helmet Security Headers Configuration
   */
  get helmetConfig() {
    const baseConfig = {
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.yachi.com"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"]
        }
      }
    };

    // Production-specific enhancements
    if (this.isProduction) {
      baseConfig.hsts = {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      };
    }

    return baseConfig;
  }

  /**
   * 🔐 Data Encryption Configuration
   */
  get encryptionConfig() {
    return {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      authTagLength: 16,
      saltLength: 64,
      
      // Sensitive data fields to encrypt
      encryptedFields: [
        'faydaId',
        'passportNumber',
        'drivingLicense',
        'bankAccount',
        'phoneNumber',
        'email',
        'address'
      ],
      
      // Key rotation configuration
      keyRotation: {
        enabled: true,
        rotationDays: 90,
        previousKeys: [] // Store previous keys for decryption
      }
    };
  }

  /**
   * 🕵️‍♂️ Input Validation & Sanitization
   */
  get validationConfig() {
    return {
      maxInputLength: {
        string: 1000,
        text: 10000,
        array: 100,
        objectDepth: 10
      },
      
      allowedContentTypes: [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ],
      
      maxFileSize: {
        image: 5 * 1024 * 1024, // 5MB
        document: 10 * 1024 * 1024, // 10MB
        video: 100 * 1024 * 1024 // 100MB
      },
      
      allowedFileTypes: {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        video: ['video/mp4', 'video/mpeg', 'video/quicktime']
      },
      
        sqlInjectionPatterns: [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)\b)/gi,
          // Use RegExp constructor to avoid issues with slash-delimited literals
          new RegExp("('|\"|;|--|\\\\|\\*|/)", 'g')
        ],
      
      xssPatterns: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ]
    };
  }

  /**
   * 🔍 Audit Logging Configuration
   */
  get auditConfig() {
    return {
      logSensitiveActions: true,
      sensitiveEndpoints: [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/password-reset',
        '/api/payments/process',
        '/api/users/verify',
        '/api/workers/fayda-upload',
        '/api/admin/*'
      ],
      
      logFields: [
        'timestamp',
        'userId',
        'ipAddress',
        'userAgent',
        'endpoint',
        'method',
        'statusCode',
        'responseTime',
        'errorMessage'
      ],
      
      excludeFields: [
        'password',
        'token',
        'secret',
        'privateKey',
        'creditCard'
      ]
    };
  }

  /**
   * 🎯 API Security Configuration
   */
  get apiSecurityConfig() {
    return {
      version: '1.0.0',
      requiredHeaders: [
        'User-Agent',
        'Accept',
        'Content-Type'
      ],
      
      // API Key authentication
      apiKeys: {
        enabled: true,
        headerName: 'X-API-Key',
        rotationDays: 30
      },
      
      // Request signing
      requestSigning: {
        enabled: this.isProduction,
        algorithm: 'sha256',
        headerName: 'X-Signature',
        timestampHeader: 'X-Timestamp',
        maxTimeDiff: 5 * 60 * 1000 // 5 minutes
      },
      
      // Response security
      responseSecurity: {
        hideServerVersion: true,
        removeSensitiveData: true,
        sanitizeErrors: true
      }
    };
  }

  /**
   * 🛡️ Session Security Configuration
   */
  get sessionConfig() {
    return {
      cookie: {
        name: 'yachi_session',
        httpOnly: true,
        secure: this.isProduction,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.COOKIE_DOMAIN || '.yachi.com',
        path: '/'
      },
      
      redis: {
        prefix: 'session:',
        ttl: 24 * 60 * 60 // 24 hours in seconds
      },
      
      regeneration: {
        enablePeriodic: true,
        interval: 4 * 60 * 60 * 1000, // 4 hours
        enableOnSuspicion: true
      }
    };
  }

  /**
   * 🔒 Two-Factor Authentication Configuration
   */
  get twoFactorConfig() {
    return {
      enabled: true,
      issuer: 'Yachi Platform',
      algorithm: 'SHA1',
      digits: 6,
      period: 30, // seconds
      window: 1, // Allow 1 period before/after
      
      // Backup codes
      backupCodes: {
        count: 10,
        length: 8,
        format: 'alphanumeric'
      },
      
      // Recovery options
      recovery: {
        email: true,
        sms: true,
        securityQuestions: false
      }
    };
  }

  /**
   * 🚨 Threat Detection Configuration
   */
  get threatDetectionConfig() {
    return {
      // Brute force detection
      bruteForce: {
        enabled: true,
        maxAttempts: 5,
        timeWindow: 15 * 60 * 1000, // 15 minutes
        blockDuration: 30 * 60 * 1000 // 30 minutes
      },
      
      // Geographic anomalies
      geoDetection: {
        enabled: true,
        allowedCountries: ['ET', 'US', 'GB', 'CA', 'AU'], // Ethiopia + common
        alertOnUnknown: true
      },
      
      // Device fingerprinting
      deviceFingerprinting: {
        enabled: true,
        components: ['userAgent', 'acceptHeaders', 'language', 'timezone', 'screenResolution'],
        tolerance: 0.8 // 80% match required
      },
      
      // Behavioral analysis
      behavioralAnalysis: {
        enabled: true,
        learningPeriod: 30, // days
        anomalyThreshold: 2.0 // standard deviations
      }
    };
  }

  /**
   * 🛠️ Utility Methods
   */

  /**
   * Generate fallback secret for development
   */
  generateFallbackSecret(purpose) {
    if (this.isProduction) {
      throw new Error(`JWT ${purpose} secret not configured in production`);
    }
    
    YachiLogger.warn(`Using fallback ${purpose} secret - configure JWT_${purpose.toUpperCase()}_SECRET`);
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Get allowed CORS origins
   */
  getAllowedOrigins() {
    const defaultOrigins = [
      'https://yachi.com',
      'https://www.yachi.com',
      'https://app.yachi.com',
      'https://admin.yachi.com'
    ];

    if (this.isDevelopment) {
      defaultOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // Vite
        'http://127.0.0.1:3000'
      );
    }

    // Add environment-specific origins
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
      defaultOrigins.push(...envOrigins.split(','));
    }

    return defaultOrigins;
  }

  /**
   * Create rate limiters
   */
  createRateLimiters() {
    return {
      general: rateLimit(this.rateLimitConfig.general),
      strict: rateLimit(this.rateLimitConfig.strict),
      auth: rateLimit(this.rateLimitConfig.auth),
      upload: rateLimit(this.rateLimitConfig.upload),
      payment: rateLimit(this.rateLimitConfig.payment)
    };
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const checks = {
      length: password.length >= this.passwordConfig.minLength,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const strength = Object.values(checks).filter(Boolean).length;
    
    return {
      valid: strength >= this.passwordConfig.complexity.minStrength,
      strength,
      checks,
      suggestions: this.getPasswordSuggestions(checks)
    };
  }

  /**
   * Get password suggestions
   */
  getPasswordSuggestions(checks) {
    const suggestions = [];
    
    if (!checks.length) {
      suggestions.push(`Password must be at least ${this.passwordConfig.minLength} characters long`);
    }
    if (!checks.uppercase) {
      suggestions.push('Include at least one uppercase letter');
    }
    if (!checks.lowercase) {
      suggestions.push('Include at least one lowercase letter');
    }
    if (!checks.number) {
      suggestions.push('Include at least one number');
    }
    if (!checks.symbol) {
      suggestions.push('Include at least one symbol');
    }

    return suggestions;
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input, type = 'string') {
    if (input == null) return input;

    switch (type) {
      case 'string':
        return String(input)
          .substring(0, this.validationConfig.maxInputLength.string)
          .replace(this.validationConfig.xssPatterns[0], '')
          .replace(this.validationConfig.xssPatterns[1], '')
          .replace(this.validationConfig.xssPatterns[2], '')
          .trim();

      case 'email':
        return String(input)
          .toLowerCase()
          .substring(0, 254)
          .replace(/[^a-zA-Z0-9@._+-]/g, '')
          .trim();

      case 'number':
        const num = Number(input);
        return isNaN(num) ? null : num;

      case 'phone':
        return String(input)
          .replace(/[^\d+]/g, '')
          .substring(0, 15);

      default:
        return input;
    }
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length = 32, type = 'alphanumeric') {
    const chars = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      numeric: '0123456789',
      hex: '0123456789abcdef',
      base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    };

    const characterSet = chars[type] || chars.alphanumeric;
    let result = '';
    
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += characterSet[randomBytes[i] % characterSet.length];
    }

    return result;
  }

  /**
   * Encrypt sensitive data
   */
  encryptSensitiveData(data, key) {
    const iv = crypto.randomBytes(this.encryptionConfig.ivLength);
    const cipher = crypto.createCipheriv(
      this.encryptionConfig.algorithm, 
      key, 
      iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decryptSensitiveData(encryptedData, key) {
    const decipher = crypto.createDecipheriv(
      this.encryptionConfig.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get security middleware configuration
   */
  getSecurityMiddleware() {
    return {
      helmet: helmet(this.helmetConfig),
      cors: cors(this.corsConfig),
      rateLimiters: this.createRateLimiters()
    };
  }

  /**
   * Get complete security configuration
   */
  getConfig() {
    return {
      environment: this.isProduction ? 'production' : 'development',
      password: this.passwordConfig,
      jwt: this.jwtConfig,
      rateLimit: this.rateLimitConfig,
      cors: this.corsConfig,
      helmet: this.helmetConfig,
      encryption: this.encryptionConfig,
      validation: this.validationConfig,
      audit: this.auditConfig,
      apiSecurity: this.apiSecurityConfig,
      session: this.sessionConfig,
      twoFactor: this.twoFactorConfig,
      threatDetection: this.threatDetectionConfig
    };
  }
}

// 🚀 Create singleton instance
const securityConfig = new SecurityConfig();

module.exports = securityConfig;