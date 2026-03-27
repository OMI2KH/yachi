const jwt = require('jsonwebtoken');
const { RedisService } = require('../services/redisService');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeService } = require('../services/realTimeService');
const logger = require('../utils/logger');

class AuthenticationMiddleware {
  static rateLimitCache = new Map();
  static securityEvents = [];

  // 🚀 ENHANCED AUTHENTICATION MIDDLEWARE
  static authenticate = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    try {
      // 🛡️ Rate limiting for authentication attempts
      const rateLimitResult = await this.checkRateLimit(clientIP, req.path);
      if (!rateLimitResult.allowed) {
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          requestId,
          ip: clientIP,
          userAgent,
          path: req.path,
          method: req.method
        });

        return res.status(429).json({
          success: false,
          message: 'Too many authentication attempts',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter
        });
      }

      // 🔍 Extract token from multiple sources
      const token = this.extractToken(req);
      if (!token) {
        await this.logSecurityEvent('NO_TOKEN_PROVIDED', {
          requestId,
          ip: clientIP,
          userAgent,
          path: req.path
        });

        return res.status(401).json({
          success: false,
          message: 'Authentication token required',
          code: 'NO_TOKEN_PROVIDED',
          requestId
        });
      }

      // 🚫 Check token blacklist/revocation
      if (await this.isTokenRevoked(token)) {
        await this.logSecurityEvent('REVOKED_TOKEN_USED', {
          requestId,
          ip: clientIP,
          userAgent,
          tokenFingerprint: this.getTokenFingerprint(token)
        });

        return res.status(401).json({
          success: false,
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED',
          requestId
        });
      }

      // 🔐 Verify JWT token with enhanced security
      const decoded = await this.verifyJWTToken(token, req);

      // 📊 Check token freshness for sensitive operations
      if (this.isSensitiveOperation(req) && !this.isFreshToken(decoded)) {
        return res.status(401).json({
          success: false,
          message: 'Fresh authentication required for this operation',
          code: 'TOKEN_STALE',
          requestId
        });
      }

      // 🎯 Enhanced user context with security metadata
      req.user = {
        id: decoded.userId,
        role: decoded.role,
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId || this.generateSessionId(),
        authMethod: decoded.authMethod || 'jwt',
        securityLevel: this.calculateSecurityLevel(decoded),
        tokenFingerprint: this.getTokenFingerprint(token)
      };

      req.requestId = requestId;
      req.clientIP = clientIP;

      // 🔒 Add security headers
      this.setSecurityHeaders(res);

      // 📈 Track successful authentication
      await this.logSecurityEvent('AUTH_SUCCESS', {
        requestId,
        userId: decoded.userId,
        ip: clientIP,
        userAgent,
        path: req.path,
        duration: Date.now() - startTime,
        securityLevel: req.user.securityLevel
      });

      // 🎪 Award security points for successful auth
      await YachiSecurity.awardSecurityPoints(decoded.userId, 'successful_login');

      logger.info('Authentication successful', {
        requestId,
        userId: decoded.userId,
        path: req.path,
        duration: Date.now() - startTime
      });

      next();

    } catch (error) {
      const errorType = this.classifyAuthError(error);
      const duration = Date.now() - startTime;

      await this.logSecurityEvent('AUTH_FAILED', {
        requestId,
        error: error.message,
        type: errorType,
        ip: clientIP,
        userAgent,
        path: req.path,
        duration
      });

      return this.handleAuthError(res, error, errorType, requestId);
    }
  };

  // 🛡️ ROLE-BASED ACCESS CONTROL
  static requireRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          requestId: req.requestId
        });
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        this.logSecurityEvent('UNAUTHORIZED_ACCESS', {
          requestId: req.requestId,
          userId: req.user.id,
          userRole,
          allowedRoles,
          path: req.path,
          ip: req.clientIP
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this resource',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          userRole,
          requestId: req.requestId
        });
      }

      logger.debug('Role access granted', {
        requestId: req.requestId,
        userId: req.user.id,
        role: userRole,
        path: req.path
      });

      next();
    };
  };

  // 🎯 PERMISSION-BASED ACCESS CONTROL
  static requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
          requestId: req.requestId
        });
      }

      const hasPermission = await this.checkUserPermission(
        req.user.id, 
        requiredPermission, 
        req.params
      );
      
      if (!hasPermission) {
        await this.logSecurityEvent('PERMISSION_DENIED', {
          requestId: req.requestId,
          userId: req.user.id,
          permission: requiredPermission,
          path: req.path,
          resource: req.params
        });

        return res.status(403).json({
          success: false,
          message: `Permission denied: ${requiredPermission}`,
          code: 'PERMISSION_DENIED',
          requestId: req.requestId
        });
      }

      logger.debug('Permission granted', {
        requestId: req.requestId,
        userId: req.user.id,
        permission: requiredPermission,
        path: req.path
      });

      next();
    };
  };

  // 🔐 TOKEN MANAGEMENT
  static extractToken = (req) => {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-Access-Token header
    if (req.headers['x-access-token']) {
      return req.headers['x-access-token'];
    }

    // Check query parameter
    if (req.query.token) {
      return req.query.token;
    }

    // Check cookies
    if (req.cookies && req.cookies.access_token) {
      return req.cookies.access_token;
    }

    return null;
  };

  static verifyJWTToken = async (token, req) => {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          reject(this.enhanceJWTError(err, token, req));
        } else {
          // Additional security checks
          this.performAdditionalChecks(decoded, token, req)
            .then(() => resolve(decoded))
            .catch(reject);
        }
      });
    });
  };

  static performAdditionalChecks = async (decoded, token, req) => {
    // Check if token was issued before password change
    if (decoded.passwordChangedAt) {
      const user = await this.getUserSecurityInfo(decoded.userId);
      if (user && user.passwordChangedAt > new Date(decoded.iat * 1000)) {
        throw new Error('Token invalidated by password change');
      }
    }

    // Check device fingerprint if available
    if (decoded.deviceFingerprint) {
      const currentFingerprint = this.generateDeviceFingerprint(req);
      if (decoded.deviceFingerprint !== currentFingerprint) {
        throw new Error('Device fingerprint mismatch');
      }
    }

    // Check for suspicious location changes
    await this.checkLocationAnomaly(decoded, req);
  };

  // 🛡️ SECURITY CHECKS
  static checkRateLimit = async (ip, path) => {
    const key = `auth_rate_limit:${ip}:${path}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;

    try {
      const attempts = await RedisService.get(key) || [];
      
      // Remove old attempts outside the window
      const recentAttempts = attempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxAttempts) {
        const oldestAttempt = Math.min(...recentAttempts);
        const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
        
        return { allowed: false, retryAfter };
      }

      // Add current attempt
      recentAttempts.push(now);
      await RedisService.set(key, recentAttempts, Math.ceil(windowMs / 1000));

      return { allowed: true, remaining: maxAttempts - recentAttempts.length };

    } catch (error) {
      logger.error('Rate limit check failed', { error: error.message, ip, path });
      return { allowed: true }; // Fail open for rate limiting
    }
  };

  static isTokenRevoked = async (token) => {
    try {
      const fingerprint = this.getTokenFingerprint(token);
      const key = `revoked_token:${fingerprint}`;
      return await RedisService.get(key) !== null;
    } catch (error) {
      logger.error('Token revocation check failed', { error: error.message });
      return false; // Fail open for revocation checks
    }
  };

  static isSensitiveOperation = (req) => {
    const sensitivePaths = [
      '/api/users/password',
      '/api/users/email',
      '/api/payments',
      '/api/admin',
      '/api/security'
    ];
    
    const sensitiveMethods = ['DELETE', 'PUT', 'POST'];
    
    return sensitivePaths.some(path => req.path.includes(path)) && 
           sensitiveMethods.includes(req.method);
  };

  static isFreshToken = (decoded) => {
    // Consider token fresh if issued within last 15 minutes
    const issuedAt = decoded.iat * 1000;
    return (Date.now() - issuedAt) < (15 * 60 * 1000);
  };

  // 🎯 UTILITY METHODS
  static generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  static generateSessionId = () => {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  static getClientIP = (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
  };

  static getTokenFingerprint = (token) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  };

  static generateDeviceFingerprint = (req) => {
    const components = [
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.headers['accept-encoding']
    ].filter(Boolean).join('|');
    
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(components).digest('hex');
  };

  static calculateSecurityLevel = (decoded) => {
    let level = 1; // Basic
    
    if (decoded.twoFactor) level++;
    if (decoded.biometric) level++;
    if (decoded.deviceTrusted) level++;
    if (decoded.hardwareKey) level++;
    
    return Math.min(level, 4); // Max level 4
  };

  static setSecurityHeaders = (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  };

  // 📊 ERROR HANDLING
  static classifyAuthError = (error) => {
    if (error.name === 'TokenExpiredError') return 'TOKEN_EXPIRED';
    if (error.name === 'JsonWebTokenError') return 'INVALID_TOKEN';
    if (error.name === 'NotBeforeError') return 'TOKEN_NOT_ACTIVE';
    if (error.message.includes('password change')) return 'PASSWORD_CHANGED';
    if (error.message.includes('device fingerprint')) return 'DEVICE_MISMATCH';
    return 'AUTH_FAILED';
  };

  static handleAuthError = (res, error, errorType, requestId) => {
    const responses = {
      'TOKEN_EXPIRED': {
        status: 401,
        message: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED',
        action: 'refresh_token'
      },
      'INVALID_TOKEN': {
        status: 401,
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
        action: 'reauthenticate'
      },
      'TOKEN_NOT_ACTIVE': {
        status: 401,
        message: 'Token not yet active',
        code: 'TOKEN_NOT_ACTIVE'
      },
      'PASSWORD_CHANGED': {
        status: 401,
        message: 'Session invalidated by security change',
        code: 'PASSWORD_CHANGED',
        action: 'reauthenticate'
      },
      'DEVICE_MISMATCH': {
        status: 401,
        message: 'Suspicious activity detected',
        code: 'DEVICE_MISMATCH',
        action: 'reauthenticate'
      },
      'AUTH_FAILED': {
        status: 401,
        message: 'Authentication failed',
        code: 'AUTHENTICATION_FAILED'
      }
    };

    const response = responses[errorType] || responses['AUTH_FAILED'];
    
    logger.warn('Authentication failed', {
      requestId,
      errorType,
      error: error.message,
      code: response.code
    });

    return res.status(response.status).json({
      success: false,
      message: response.message,
      code: response.code,
      requestId,
      ...(response.action && { suggestedAction: response.action })
    });
  };

  static enhanceJWTError = (error, token, req) => {
    error.context = {
      timestamp: new Date().toISOString(),
      tokenFingerprint: this.getTokenFingerprint(token),
      clientIP: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path
    };
    return error;
  };

  // 📈 SECURITY MONITORING
  static logSecurityEvent = async (eventType, details) => {
    const event = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      ...details
    };

    // Store in Redis for analysis
    try {
      await RedisService.rPush('security_events', JSON.stringify(event));
      await RedisService.lTrim('security_events', -10000, -1); // Keep last 10k events
    } catch (error) {
      logger.error('Failed to log security event to Redis', { error: error.message });
    }

    // Send to analytics
    YachiAnalytics.trackSecurityEvent(event);

    // Real-time alert for critical events
    if (this.isCriticalSecurityEvent(eventType)) {
      RealTimeService.emitToRoom('security_monitoring', 'securityAlert', event);
    }

    this.securityEvents.push(event);
    
    // Keep only recent events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    return event;
  };

  static isCriticalSecurityEvent = (eventType) => {
    const criticalEvents = [
      'RATE_LIMIT_EXCEEDED',
      'UNAUTHORIZED_ACCESS',
      'REVOKED_TOKEN_USED',
      'MULTIPLE_FAILED_ATTEMPTS'
    ];
    return criticalEvents.includes(eventType);
  };

  // 🎯 PLACEHOLDER METHODS FOR EXTERNAL INTEGRATIONS
  static async getUserSecurityInfo(userId) {
    // Implementation would fetch from database
    // Return: { passwordChangedAt: Date, twoFactorEnabled: boolean, etc. }
    return null;
  }

  static async checkUserPermission(userId, permission, resourceParams) {
    // Implementation would check user permissions in database
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  static async getUserPermissions(userId) {
    // Implementation would fetch from database
    return ['read:profile', 'write:profile', 'read:services', 'write:services'];
  }

  static async checkLocationAnomaly(decoded, req) {
    // Implementation would check for suspicious location changes
    // This could integrate with geo-location services
    return true; // Placeholder
  }
}

// 🎯 MIDDLEWARE EXPORTS
module.exports = {
  // Core authentication
  authenticate: AuthenticationMiddleware.authenticate,
  
  // Role-based access
  requireRole: AuthenticationMiddleware.requireRole,
  requireProvider: AuthenticationMiddleware.requireRole(['provider', 'graduate']),
  requireClient: AuthenticationMiddleware.requireRole(['client']),
  requireAdmin: AuthenticationMiddleware.requireRole(['admin']),
  
  // Permission-based access
  requirePermission: AuthenticationMiddleware.requirePermission,
  
  // Utility methods
  extractToken: AuthenticationMiddleware.extractToken,
  getTokenFingerprint: AuthenticationMiddleware.getTokenFingerprint,
  
  // Security monitoring
  getSecurityEvents: () => AuthenticationMiddleware.securityEvents
};
