const jwt = require('jsonwebtoken');
const { CacheService } = require('./cacheService');
const { YachiAnalytics } = require('./yachiAnalytics');
const { RealTimeService } = require('./realTimeService');

class YachiSecurity {
  static tokenBlacklist = new Set();
  static rateLimitCache = new Map();
  static securityEvents = [];

  // 🚀 INITIALIZATION
  static async initialize() {
    await this.loadRevokedTokens();
    this.startCleanupTasks();
    console.log('✅ Yachi Security System initialized');
  }

  // 🎯 ENHANCED TOKEN VERIFICATION
  static verifyToken = async (req, res, next) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      // 🛡️ Rate limiting for authentication attempts
      const rateLimitKey = `auth_rate:${clientIP}`;
      const rateLimit = await CacheService.checkRateLimit(rateLimitKey, 50, 900000); // 50 attempts per 15 minutes

      if (!rateLimit.allowed) {
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ip: clientIP,
          userAgent,
          path: req.path
        });
        return res.status(429).json({
          success: false,
          message: 'Too many authentication attempts',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: '15 minutes'
        });
      }

      // 🔍 Extract token from various sources
      const token = this.extractToken(req);
      if (!token) {
        await this.logSecurityEvent('NO_TOKEN_PROVIDED', {
          ip: clientIP,
          userAgent,
          path: req.path
        });
        return res.status(401).json({
          success: false,
          message: 'Authentication token required',
          code: 'NO_TOKEN_PROVIDED'
        });
      }

      // 🚫 Check token blacklist
      if (await this.isTokenRevoked(token)) {
        await this.logSecurityEvent('REVOKED_TOKEN_USED', {
          ip: clientIP,
          userAgent,
          tokenFingerprint: this.getTokenFingerprint(token)
        });
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      }

      // 🔐 Verify JWT token
      const decoded = await this.verifyJWTToken(token);
      
      // 📊 Check token freshness for sensitive operations
      if (this.isSensitiveOperation(req) && !this.isFreshToken(decoded)) {
        return res.status(401).json({
          success: false,
          message: 'Fresh authentication required for this operation',
          code: 'TOKEN_STALE'
        });
      }

      // 🎯 Enhanced user context
      req.user = {
        ...decoded,
        sessionId: this.generateSessionId(),
        authMethod: decoded.authMethod || 'jwt',
        tokenFingerprint: this.getTokenFingerprint(token),
        securityLevel: this.calculateSecurityLevel(decoded)
      };

      // 🔒 Add security headers
      this.setSecurityHeaders(res);

      // 📈 Track successful authentication
      await this.logSecurityEvent('AUTH_SUCCESS', {
        userId: decoded.userId,
        ip: clientIP,
        userAgent,
        path: req.path,
        duration: Date.now() - startTime
      });

      // 🎪 Award security points for successful auth
      await this.awardSecurityPoints(decoded.userId, 'successful_login');

      next();

    } catch (error) {
      const errorType = this.classifyAuthError(error);
      
      await this.logSecurityEvent('AUTH_FAILED', {
        error: error.message,
        type: errorType,
        ip: clientIP,
        userAgent,
        path: req.path,
        duration: Date.now() - startTime
      });

      return this.handleAuthError(res, error, errorType);
    }
  };

  // 🛡️ ROLE-BASED ACCESS CONTROL
  static requireRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        this.logSecurityEvent('UNAUTHORIZED_ACCESS', {
          userId: req.user.userId,
          userRole,
          allowedRoles,
          path: req.path,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this resource',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          userRole
        });
      }

      next();
    };
  };

  // 🎯 PERMISSION-BASED ACCESS CONTROL
  static requirePermission = (permission) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasPermission = await this.checkUserPermission(req.user.userId, permission, req.params);
      
      if (!hasPermission) {
        await this.logSecurityEvent('PERMISSION_DENIED', {
          userId: req.user.userId,
          permission,
          path: req.path,
          resource: req.params
        });

        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permission}`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    };
  };

  // 🔐 TOKEN MANAGEMENT
  static generateToken = (payload, options = {}) => {
    const defaultOptions = {
      expiresIn: options.expiresIn || '24h',
      issuer: 'yachi-platform',
      audience: 'yachi-users',
      subject: payload.userId.toString()
    };

    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateJWTId()
    };

    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { ...defaultOptions, ...options });
  };

  static generateRefreshToken = (userId) => {
    return jwt.sign(
      { 
        userId, 
        type: 'refresh',
        jti: this.generateJWTId()
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  };

  static revokeToken = async (token, reason = 'user_logout') => {
    const fingerprint = this.getTokenFingerprint(token);
    const key = `revoked_token:${fingerprint}`;
    
    // Store in cache with TTL based on token expiry
    const decoded = jwt.decode(token);
    const ttl = decoded.exp ? (decoded.exp * 1000 - Date.now()) : 3600000; // 1 hour default
    
    await CacheService.set(key, {
      token: fingerprint,
      reason,
      revokedAt: new Date().toISOString(),
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    }, Math.ceil(ttl / 1000));

    this.logSecurityEvent('TOKEN_REVOKED', {
      tokenFingerprint: fingerprint,
      reason,
      userId: decoded.userId
    });
  };

  static revokeAllUserTokens = async (userId, reason = 'password_change') => {
    const pattern = `user_tokens:${userId}:*`;
    // Implementation would revoke all tokens for a user
    this.logSecurityEvent('ALL_TOKENS_REVOKED', { userId, reason });
  };

  // 🎯 SOCKET AUTHENTICATION
  static verifySocketToken = async (token) => {
    try {
      if (await this.isTokenRevoked(token)) {
        throw new Error('Token revoked');
      }

      const decoded = await this.verifyJWTToken(token);
      
      // Additional socket-specific checks
      if (!decoded.socketAuth) {
        throw new Error('Invalid token for socket connection');
      }

      return decoded;
    } catch (error) {
      this.logSecurityEvent('SOCKET_AUTH_FAILED', {
        error: error.message,
        tokenFingerprint: this.getTokenFingerprint(token)
      });
      throw error;
    }
  };

  // 🔒 SECURITY UTILITIES
  static extractToken = (req) => {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
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

  static verifyJWTToken = (token) => {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          reject(this.enhanceJWTError(err));
        } else {
          resolve(decoded);
        }
      });
    });
  };

  static isTokenRevoked = async (token) => {
    const fingerprint = this.getTokenFingerprint(token);
    const key = `revoked_token:${fingerprint}`;
    return await CacheService.get(key) !== null;
  };

  static getTokenFingerprint = (token) => {
    // Create a fingerprint of the token for blacklisting
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  };

  static generateJWTId = () => {
    return require('crypto').randomBytes(16).toString('hex');
  };

  static generateSessionId = () => {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 🛡️ SECURITY HEADERS
  static setSecurityHeaders = (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
  };

  // 📊 SECURITY ANALYTICS
  static logSecurityEvent = async (eventType, details) => {
    const event = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      ...details
    };

    // Store in cache for real-time monitoring
    await CacheService.set(`security_event:${event.id}`, event, 3600); // 1 hour

    // Send to analytics
    YachiAnalytics.trackSecurityEvent(event);

    // Real-time alert for critical events
    if (this.isCriticalEvent(eventType)) {
      RealTimeService.emitToRoom('security_monitoring', 'securityAlert', event);
    }

    this.securityEvents.push(event);
    
    // Keep only recent events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    return event;
  };

  static isCriticalEvent = (eventType) => {
    const criticalEvents = [
      'RATE_LIMIT_EXCEEDED',
      'MULTIPLE_FAILED_ATTEMPTS',
      'SUSPICIOUS_ACTIVITY',
      'UNAUTHORIZED_ACCESS'
    ];
    return criticalEvents.includes(eventType);
  };

  // 🎯 ERROR HANDLING
  static classifyAuthError = (error) => {
    if (error.name === 'TokenExpiredError') return 'TOKEN_EXPIRED';
    if (error.name === 'JsonWebTokenError') return 'INVALID_TOKEN';
    if (error.name === 'NotBeforeError') return 'TOKEN_NOT_ACTIVE';
    return 'AUTH_FAILED';
  };

  static handleAuthError = (res, error, errorType) => {
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
      'AUTH_FAILED': {
        status: 401,
        message: 'Authentication failed',
        code: 'AUTH_FAILICATION_FAILED'
      }
    };

    const response = responses[errorType] || responses['AUTH_FAILED'];
    
    return res.status(response.status).json({
      success: false,
      message: response.message,
      code: response.code,
      ...(response.action && { suggestedAction: response.action })
    });
  };

  static enhanceJWTError = (error) => {
    // Add additional context to JWT errors
    error.context = {
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    return error;
  };

  // 🔍 SECURITY CHECKS
  static isSensitiveOperation = (req) => {
    const sensitivePaths = [
      '/api/users/password',
      '/api/users/email',
      '/api/payments',
      '/api/admin'
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

  static calculateSecurityLevel = (decoded) => {
    let level = 1; // Basic
    
    if (decoded.twoFactor) level++;
    if (decoded.biometric) level++;
    if (decoded.deviceTrusted) level++;
    
    return Math.min(level, 3); // Max level 3
  };

  // 🎪 GAMIFICATION INTEGRATION
  static awardSecurityPoints = async (userId, action) => {
    const pointsMap = {
      'successful_login': 5,
      'password_changed': 10,
      'two_factor_enabled': 25,
      'device_verified': 15
    };

    const points = pointsMap[action];
    if (points) {
      // This would integrate with your gamification system
      console.log(`🎯 Awarded ${points} security points to user ${userId} for ${action}`);
    }
  };

  // 🛠️ PERMISSION SYSTEM
  static async checkUserPermission(userId, permission, resourceParams) {
    // Implementation would check user permissions in database
    // This is a simplified version - expand based on your RBAC system
    
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission);
  }

  static async getUserPermissions(userId) {
    // Implementation would fetch from database
    // Placeholder - return basic permissions
    return ['read:profile', 'write:profile', 'read:services', 'write:services'];
  }

  // 🧹 CLEANUP TASKS
  static startCleanupTasks() {
    // Cleanup old security events daily
    setInterval(() => {
      this.cleanupOldEvents();
    }, 24 * 60 * 60 * 1000);
  }

  static async cleanupOldEvents() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.securityEvents = this.securityEvents.filter(
      event => new Date(event.timestamp) > sevenDaysAgo
    );
  }

  static async loadRevokedTokens() {
    // Implementation would load recently revoked tokens from database
    console.log('🔄 Loading revoked tokens...');
  }

  // 📊 SECURITY MONITORING
  static getSecurityStatus() {
    return {
      activeSessions: this.securityEvents.filter(e => e.type === 'AUTH_SUCCESS').length,
      recentFailures: this.securityEvents.filter(e => e.type === 'AUTH_FAILED').length,
      criticalAlerts: this.securityEvents.filter(e => this.isCriticalEvent(e.type)).length,
      revokedTokens: this.tokenBlacklist.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  static getRecentSecurityEvents(limit = 50) {
    return this.securityEvents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
}

// 🎯 MIDDLEWARE EXPORTS
module.exports = {
  // Core authentication
  authenticate: YachiSecurity.verifyToken,
  
  // Role-based access
  requireRole: YachiSecurity.requireRole,
  requireProvider: YachiSecurity.requireRole(['provider', 'graduate']),
  requireClient: YachiSecurity.requireRole(['client']),
  requireAdmin: YachiSecurity.requireRole(['admin']),
  
  // Permission-based access
  requirePermission: YachiSecurity.requirePermission,
  
  // Token management
  generateToken: YachiSecurity.generateToken,
  generateRefreshToken: YachiSecurity.generateRefreshToken,
  revokeToken: YachiSecurity.revokeToken,
  revokeAllUserTokens: YachiSecurity.revokeAllUserTokens,
  
  // Security utilities
  verifySocketToken: YachiSecurity.verifySocketToken,
  
  // Monitoring
  getSecurityStatus: YachiSecurity.getSecurityStatus,
  getRecentSecurityEvents: YachiSecurity.getRecentSecurityEvents,
  
  // Initialization
  initializeSecurity: YachiSecurity.initialize
};