module.exports = function errorHandler(err, req, res, next) {
  if (!err) return next();

  if (err.name === 'ValidationError') {
    const errors = err.details || [];
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  if (err.name === 'JsonWebTokenError' || err.message === 'Invalid token' || err.message === 'jwt malformed') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  return res.status(500).json({ success: false, message: 'Internal server error' });
};
const { YachiLogger } = require('../utils/logger');
const { RedisService } = require('../services/redisService');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RealTimeService } = require('../services/realTimeService');

class ErrorHandlingMiddleware {
  static errorCounts = new Map();
  static alertThresholds = new Map();
  static recentErrors = [];

  // 🚀 ENHANCED ERROR HANDLING MIDDLEWARE
  static handleErrors = (err, req, res, next) => {
    const errorId = this.generateErrorId();
    const startTime = req.startTime || Date.now();
    const responseTime = Date.now() - startTime;

    try {
      // 🎯 Classify and enrich the error
      const classifiedError = this.classifyError(err, req);
      const enrichedError = this.enrichError(classifiedError, req, errorId, responseTime);

      // 📊 Track error metrics
      this.trackErrorMetrics(enrichedError);

      // 🚨 Check for alert conditions
      this.checkForAlerts(enrichedError);

      // 📝 Log the error appropriately
      this.logError(enrichedError);

      // 🛡️ Send appropriate response to client
      const clientResponse = this.buildClientResponse(enrichedError, req);

      // 📈 Send analytics event
      this.sendAnalyticsEvent(enrichedError, req);

      // 🔄 Handle operational vs programmer errors
      this.handleErrorRecovery(enrichedError);

      res.status(clientResponse.statusCode).json(clientResponse);

    } catch (loggingError) {
      // Fallback error handling if our error handler fails
      console.error('💥 CRITICAL: Error handler failed:', loggingError);
      console.error('Original error:', err);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorId: 'emergency_fallback'
      });
    }
  };

  // 🎯 ERROR CLASSIFICATION
  static classifyError = (err, req) => {
    const error = { ...err };
    
    // Determine error type
    if (err.name === 'ValidationError') {
      error.type = 'VALIDATION_ERROR';
      error.statusCode = 400;
      error.isOperational = true;
    } else if (err.name === 'UnauthorizedError') {
      error.type = 'AUTHENTICATION_ERROR';
      error.statusCode = 401;
      error.isOperational = true;
    } else if (err.name === 'ForbiddenError') {
      error.type = 'AUTHORIZATION_ERROR';
      error.statusCode = 403;
      error.isOperational = true;
    } else if (err.name === 'NotFoundError') {
      error.type = 'RESOURCE_NOT_FOUND';
      error.statusCode = 404;
      error.isOperational = true;
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      error.type = 'FILE_TOO_LARGE';
      error.statusCode = 413;
      error.isOperational = true;
    } else if (err.code === 'ECONNREFUSED') {
      error.type = 'DATABASE_CONNECTION_ERROR';
      error.statusCode = 503;
      error.isOperational = true;
    } else if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      error.type = 'CLIENT_ERROR';
      error.isOperational = true;
    } else {
      error.type = 'INTERNAL_SERVER_ERROR';
      error.statusCode = error.statusCode || 500;
      error.isOperational = error.isOperational || false;
    }

    // Add request context
    error.requestContext = {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      correlationId: req.correlationId
    };

    return error;
  };

  // 🎯 ERROR ENRICHMENT
  static enrichError = (err, req, errorId, responseTime) => {
    return {
      ...err,
      errorId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: 'yachi-api',
      version: process.env.npm_package_version || '1.0.0',
      responseTime,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      
      // Stack trace processing
      stack: err.stack,
      simplifiedStack: this.simplifyStackTrace(err.stack),
      
      // Additional context
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      
      // Error chain for nested errors
      originalError: err.originalError || null,
      cause: err.cause || null
    };
  };

  // 📊 ERROR METRICS AND TRACKING
  static trackErrorMetrics = (error) => {
    const errorType = error.type;
    const currentCount = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, currentCount + 1);

    // Track recent errors for analysis
    this.recentErrors.push({
      errorId: error.errorId,
      type: error.type,
      timestamp: error.timestamp,
      path: error.requestContext?.path,
      statusCode: error.statusCode
    });

    // Keep only last 100 errors in memory
    if (this.recentErrors.length > 100) {
      this.recentErrors = this.recentErrors.slice(-50);
    }

    // Store in Redis for distributed monitoring
    if (RedisService.isHealthy()) {
      const key = `error_metrics:${error.type}:${new Date().toISOString().split('T')[0]}`;
      RedisService.increment(key, 1);
      RedisService.expire(key, 86400); // 24 hours
    }
  };

  // 🚨 ALERTING SYSTEM
  static checkForAlerts = (error) => {
    const errorType = error.type;
    
    // Check rate-based alerts
    if (this.isHighErrorRate(errorType)) {
      this.triggerRateAlert(error);
    }

    // Check critical errors
    if (this.isCriticalError(error)) {
      this.triggerCriticalAlert(error);
    }

    // Check for new error patterns
    if (this.isNewErrorPattern(error)) {
      this.triggerPatternAlert(error);
    }
  };

  static isHighErrorRate = (errorType) => {
    const count = this.errorCounts.get(errorType) || 0;
    const threshold = this.alertThresholds.get(errorType) || 10; // Default threshold
    
    return count > threshold && count % threshold === 1; // Alert on threshold crossing
  };

  static isCriticalError = (error) => {
    const criticalErrors = [
      'DATABASE_CONNECTION_ERROR',
      'INTERNAL_SERVER_ERROR',
      'MEMORY_LEAK_DETECTED'
    ];

    return criticalErrors.includes(error.type) || 
           error.statusCode >= 500 ||
           !error.isOperational;
  };

  static isNewErrorPattern = (error) => {
    // Check if this error pattern hasn't been seen recently
    const recentSimilarErrors = this.recentErrors.filter(e => 
      e.type === error.type && 
      e.path === error.requestContext?.path
    );

    return recentSimilarErrors.length === 1; // First occurrence
  };

  static triggerRateAlert = (error) => {
    const alert = {
      type: 'HIGH_ERROR_RATE',
      errorType: error.type,
      count: this.errorCounts.get(error.type),
      timestamp: new Date().toISOString(),
      errorId: error.errorId
    };

    YachiLogger.critical(`High error rate detected: ${error.type}`, alert);
    RealTimeService.emitToRoom('error_monitoring', 'highErrorRate', alert);
  };

  static triggerCriticalAlert = (error) => {
    const alert = {
      type: 'CRITICAL_ERROR',
      errorType: error.type,
      message: error.message,
      timestamp: new Date().toISOString(),
      errorId: error.errorId,
      path: error.requestContext?.path
    };

    YachiLogger.critical(`Critical error: ${error.type}`, alert);
    RealTimeService.emitToRoom('error_monitoring', 'criticalError', alert);
    
    // TODO: Integrate with external alerting (PagerDuty, Slack, etc.)
  };

  static triggerPatternAlert = (error) => {
    const alert = {
      type: 'NEW_ERROR_PATTERN',
      errorType: error.type,
      message: error.message,
      path: error.requestContext?.path,
      timestamp: new Date().toISOString(),
      errorId: error.errorId
    };

    YachiLogger.warn(`New error pattern detected: ${error.type}`, alert);
    RealTimeService.emitToRoom('error_monitoring', 'newErrorPattern', alert);
  };

  // 📝 INTELLIGENT ERROR LOGGING
  static logError = (error) => {
    const logContext = {
      errorId: error.errorId,
      type: error.type,
      statusCode: error.statusCode,
      path: error.requestContext?.path,
      method: error.requestContext?.method,
      userId: error.requestContext?.userId,
      correlationId: error.requestContext?.correlationId,
      responseTime: error.responseTime,
      isOperational: error.isOperational
    };

    if (error.statusCode >= 500 || !error.isOperational) {
      // Server errors and programmer errors
      YachiLogger.error(`Server Error: ${error.message}`, {
        ...logContext,
        stack: error.stack,
        simplifiedStack: error.simplifiedStack
      });
    } else if (error.statusCode >= 400) {
      // Client errors (operational)
      YachiLogger.warn(`Client Error: ${error.message}`, logContext);
    } else {
      // Other errors
      YachiLogger.info(`Error: ${error.message}`, logContext);
    }

    // Log to Redis for distributed tracing
    if (RedisService.isHealthy()) {
      RedisService.rPush('error_logs', JSON.stringify({
        ...error,
        logContext
      }));
    }
  };

  // 🛡️ CLIENT RESPONSE BUILDING
  static buildClientResponse = (error, req) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const showDetails = !isProduction || error.statusCode < 500;

    const baseResponse = {
      success: false,
      error: showDetails ? error.message : this.getClientFriendlyMessage(error),
      errorId: error.errorId,
      type: showDetails ? error.type : undefined,
      timestamp: error.timestamp,
      path: error.requestContext?.path
    };

    // Add validation errors if present
    if (error.type === 'VALIDATION_ERROR' && error.details) {
      baseResponse.validationErrors = error.details;
    }

    // Add stack trace in development
    if (!isProduction && error.stack) {
      baseResponse.stack = error.simplifiedStack;
    }

    // Add retry information for transient errors
    if (this.isRetryableError(error)) {
      baseResponse.retryable = true;
      baseResponse.retryAfter = this.getRetryAfterTime(error);
    }

    return {
      statusCode: error.statusCode,
      ...baseResponse
    };
  };

  static getClientFriendlyMessage = (error) => {
    const messages = {
      'VALIDATION_ERROR': 'The provided data is invalid',
      'AUTHENTICATION_ERROR': 'Authentication required',
      'AUTHORIZATION_ERROR': 'Access denied',
      'RESOURCE_NOT_FOUND': 'Resource not found',
      'FILE_TOO_LARGE': 'File size exceeds limit',
      'DATABASE_CONNECTION_ERROR': 'Service temporarily unavailable',
      'INTERNAL_SERVER_ERROR': 'Internal server error'
    };

    return messages[error.type] || 'An error occurred';
  };

  static isRetryableError = (error) => {
    const retryableErrors = [
      'DATABASE_CONNECTION_ERROR',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE'
    ];

    return retryableErrors.includes(error.type) || 
           error.statusCode === 503 ||
           error.statusCode === 429;
  };

  static getRetryAfterTime = (error) => {
    // Implement retry logic based on error type
    switch (error.type) {
      case 'DATABASE_CONNECTION_ERROR':
        return 30; // 30 seconds
      case 'RATE_LIMIT_ERROR':
        return 60; // 60 seconds
      default:
        return 5; // 5 seconds
    }
  };

  // 📈 ANALYTICS INTEGRATION
  static sendAnalyticsEvent = (error, req) => {
    const analyticsEvent = {
      category: 'error',
      action: error.type,
      label: error.requestContext?.path,
      value: error.statusCode,
      customDimensions: {
        errorId: error.errorId,
        isOperational: error.isOperational,
        responseTime: error.responseTime,
        userId: error.requestContext?.userId,
        environment: process.env.NODE_ENV
      }
    };

    YachiAnalytics.trackErrorEvent(analyticsEvent);
  };

  // 🔄 ERROR RECOVERY AND CLEANUP
  static handleErrorRecovery = (error) => {
    // Handle database connection errors
    if (error.type === 'DATABASE_CONNECTION_ERROR') {
      this.handleDatabaseRecovery(error);
    }

    // Handle memory-related errors
    if (error.message.includes('JavaScript heap out of memory')) {
      this.handleMemoryRecovery(error);
    }

    // Clean up resources for operational errors
    if (error.isOperational) {
      this.cleanupOperationalError(error);
    }
  };

  static handleDatabaseRecovery = (error) => {
    YachiLogger.warn('Database connection error - initiating recovery', {
      errorId: error.errorId
    });
    
    // TODO: Implement database connection recovery logic
    // This could involve reconnecting, failing over, etc.
  };

  static handleMemoryRecovery = (error) => {
    YachiLogger.critical('Memory error detected - performing cleanup', {
      errorId: error.errorId,
      memoryUsage: process.memoryUsage()
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear caches if necessary
    RedisService.del('*').catch(() => {});
  };

  static cleanupOperationalError = (error) => {
    // Clean up any temporary resources for operational errors
    // This is a placeholder for resource cleanup logic
  };

  // 🛠️ UTILITY METHODS
  static generateErrorId = () => {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  static simplifyStackTrace = (stack) => {
    if (!stack) return null;
    
    // Remove node_modules paths and simplify stack trace
    return stack.split('\n')
      .slice(0, 10) // Limit stack trace length
      .map(line => line
        .replace(/\s+at\s+/g, ' → ')
        .replace(/\(.*node_modules.*\)/g, '(node_modules)')
        .replace(/\(.*\)/g, '')
        .trim()
      )
      .filter(line => line.length > 0);
  };

  static sanitizeHeaders = (headers) => {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-access-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '***REDACTED***';
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = '***REDACTED***';
      }
    });
    
    return sanitized;
  };

  static sanitizeBody = (body) => {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  };

  // 📊 MONITORING AND STATUS
  static getErrorMetrics = () => {
    return {
      counts: Object.fromEntries(this.errorCounts),
      recentErrors: this.recentErrors.slice(-20),
      alertThresholds: Object.fromEntries(this.alertThresholds),
      timestamp: new Date().toISOString()
    };
  };

  static setAlertThreshold = (errorType, threshold) => {
    this.alertThresholds.set(errorType, threshold);
  };

  static resetMetrics = () => {
    this.errorCounts.clear();
    this.recentErrors = [];
  };
}

// 🎯 COMPATIBILITY LAYER (for existing code)
const legacyErrorHandler = (err, req, res, next) => {
  ErrorHandlingMiddleware.handleErrors(err, req, res, next);
};

module.exports = {
  // Enhanced error handler
  handleErrors: ErrorHandlingMiddleware.handleErrors,
  GlobalErrorHandler: ErrorHandlingMiddleware.handleErrors,
  
  // Legacy compatibility
  legacyErrorHandler,
  
  // Utility exports
  getErrorMetrics: ErrorHandlingMiddleware.getErrorMetrics,
  setAlertThreshold: ErrorHandlingMiddleware.setAlertThreshold,
  resetErrorMetrics: ErrorHandlingMiddleware.resetMetrics,
  
  // Error classification utility
  classifyError: ErrorHandlingMiddleware.classifyError
};

// OperationalError class for expressing operational initialization failures
class OperationalError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'OperationalError';
    this.cause = cause;
    this.isOperational = true;
    this.statusCode = 500;
  }
}

module.exports.OperationalError = OperationalError;
