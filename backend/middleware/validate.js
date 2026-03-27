const { YachiLogger } = require('../utils/logger');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { RedisService } = require('../services/redisService');
const { RealTimeService } = require('../services/realTimeService');

class ValidationMiddleware {
  static validationCache = new Map();
  static rateLimitCache = new Map();
  static validationMetrics = {
    total: 0,
    passed: 0,
    failed: 0,
    cached: 0
  };

  // 🚀 ENHANCED VALIDATION MIDDLEWARE
  static validate = (schema, options = {}) => {
    return async (req, res, next) => {
      const startTime = Date.now();
      const validationId = this.generateValidationId();
      const source = options.source || 'body'; // body, query, params, headers

      try {
        this.validationMetrics.total++;

        // 🛡️ Rate limiting for validation attempts
        const rateLimitKey = `validation_rate:${req.ip}:${req.path}`;
        const rateLimit = await this.checkValidationRateLimit(rateLimitKey);
        if (!rateLimit.allowed) {
          await this.logValidationEvent('RATE_LIMIT_EXCEEDED', {
            validationId,
            ip: req.ip,
            path: req.path,
            source
          });

          return res.status(429).json({
            success: false,
            message: 'Too many validation attempts',
            code: 'VALIDATION_RATE_LIMITED',
            retryAfter: rateLimit.retryAfter,
            validationId
          });
        }

        // 🔍 Get data to validate based on source
        const dataToValidate = this.getDataFromSource(req, source);
        
        // 🎯 Check cache for identical validation requests
        const cacheKey = this.generateCacheKey(schema, dataToValidate, source);
        const cachedResult = await this.getCachedValidation(cacheKey);
        
        if (cachedResult) {
          this.validationMetrics.cached++;
          req.validatedData = cachedResult.validatedData;
          
          YachiLogger.debug('Validation cache hit', {
            validationId,
            path: req.path,
            source,
            cacheKey
          });
          
          return next();
        }

        // 📋 Perform validation with enhanced options
        const validationOptions = {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false,
          convert: true,
          cache: true,
          context: {
            user: req.user,
            method: req.method,
            path: req.path,
            ip: req.ip,
            headers: req.headers
          },
          ...options.joiOptions
        };

        const { error, value: validatedData } = schema.validate(dataToValidate, validationOptions);

        // 📊 Track validation result
        await this.trackValidationMetrics(validationId, !error, req.path, source);

        if (error) {
          // 🎯 Enhanced error processing
          const processedErrors = this.processValidationErrors(error, schema, dataToValidate);
          
          await this.logValidationEvent('VALIDATION_FAILED', {
            validationId,
            path: req.path,
            source,
            errors: processedErrors.client,
            rawErrors: processedErrors.raw,
            dataSample: this.sanitizeDataSample(dataToValidate),
            duration: Date.now() - startTime,
            userId: req.user?.id
          });

          // 🚨 Check for suspicious validation patterns
          await this.checkSuspiciousPatterns(processedErrors.raw, req, validationId);

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: processedErrors.client,
            validationId,
            ...(process.env.NODE_ENV !== 'production' && {
              debug: {
                schema: this.getSchemaDescription(schema),
                received: this.sanitizeDataSample(dataToValidate)
              }
            })
          });
        }

        // ✅ Validation successful
        const validationDuration = Date.now() - startTime;

        // 💾 Cache successful validation
        if (options.cache !== false && validationDuration < 1000) {
          await this.cacheValidationResult(cacheKey, validatedData);
        }

        // 🎯 Set validated data with metadata
        req.validatedData = validatedData;
        req.validationMetadata = {
          validationId,
          source,
          duration: validationDuration,
          cached: false
        };

        await this.logValidationEvent('VALIDATION_SUCCESS', {
          validationId,
          path: req.path,
          source,
          duration: validationDuration,
          userId: req.user?.id,
          dataType: this.getDataType(validatedData)
        });

        YachiLogger.debug('Validation successful', {
          validationId,
          path: req.path,
          source,
          duration: validationDuration
        });

        next();

      } catch (error) {
        // 🚨 Handle validation system errors
        YachiLogger.error('Validation system error', {
          validationId,
          error: error.message,
          stack: error.stack,
          path: req.path,
          source
        });

        // Fallback to basic validation
        const fallbackResult = await this.fallbackValidation(schema, req, source, validationId);
        if (fallbackResult.error) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: fallbackResult.errors,
            validationId
          });
        }

        req.validatedData = fallbackResult.validatedData;
        next();
      }
    };
  };

  // 🎯 MULTI-SOURCE VALIDATION
  static validateBody = (schema, options = {}) => 
    this.validate(schema, { ...options, source: 'body' });

  static validateQuery = (schema, options = {}) => 
    this.validate(schema, { ...options, source: 'query' });

  static validateParams = (schema, options = {}) => 
    this.validate(schema, { ...options, source: 'params' });

  static validateHeaders = (schema, options = {}) => 
    this.validate(schema, { ...options, source: 'headers' });

  static validateMulti = (schemas, options = {}) => {
    return async (req, res, next) => {
      const results = {};
      
      for (const [source, schema] of Object.entries(schemas)) {
        const validateFn = this.validate(schema, { ...options, source });
        
        try {
          await new Promise((resolve, reject) => {
            validateFn(req, res, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          results[source] = req.validatedData;
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `Validation failed for ${source}`,
            code: 'MULTI_VALIDATION_ERROR',
            source,
            errors: error.errors || [error.message],
            validationId: error.validationId
          });
        }
      }
      
      next();
    };
  };

  // 🛡️ SECURITY & RATE LIMITING
  static checkValidationRateLimit = async (key) => {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxAttempts = 100;

    try {
      const attempts = await RedisService.get(key) || [];
      const recentAttempts = attempts.filter(time => now - time < windowMs);
      
      if (recentAttempts.length >= maxAttempts) {
        const oldestAttempt = Math.min(...recentAttempts);
        const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
        
        return { allowed: false, retryAfter };
      }

      recentAttempts.push(now);
      await RedisService.set(key, recentAttempts, Math.ceil(windowMs / 1000));

      return { allowed: true, remaining: maxAttempts - recentAttempts.length };

    } catch (error) {
      YachiLogger.error('Rate limit check failed', { error: error.message, key });
      return { allowed: true }; // Fail open
    }
  };

  // 💾 CACHING SYSTEM
  static generateCacheKey = (schema, data, source) => {
    const schemaString = schema.describe ? JSON.stringify(schema.describe()) : schema.toString();
    const dataString = JSON.stringify(data);
    return `validation:${Buffer.from(schemaString + dataString + source).toString('base64')}`;
  };

  static getCachedValidation = async (cacheKey) => {
    try {
      if (RedisService.isHealthy()) {
        const cached = await RedisService.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
      }
    } catch (error) {
      YachiLogger.warn('Cache read failed', { error: error.message, cacheKey });
    }
    return null;
  };

  static cacheValidationResult = async (cacheKey, validatedData) => {
    try {
      if (RedisService.isHealthy()) {
        await RedisService.set(cacheKey, JSON.stringify({
          validatedData,
          cachedAt: new Date().toISOString()
        }), 300); // 5 minutes cache
      }
    } catch (error) {
      YachiLogger.warn('Cache write failed', { error: error.message, cacheKey });
    }
  };

  // 🎯 ERROR PROCESSING
  static processValidationErrors = (error, schema, originalData) => {
    const rawErrors = error.details.map(detail => ({
      path: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
      context: detail.context
    }));

    const clientErrors = rawErrors.map(error => {
      // 🎯 User-friendly error messages
      const friendlyMessage = this.getFriendlyErrorMessage(error, schema);
      
      return {
        field: error.path,
        message: friendlyMessage,
        code: this.getErrorCode(error.type)
      };
    });

    // 🚨 Identify sensitive data exposure
    const sensitiveFields = this.identifySensitiveFields(rawErrors, originalData);
    if (sensitiveFields.length > 0) {
      YachiLogger.security('Sensitive data in validation errors', {
        fields: sensitiveFields,
        errorCount: rawErrors.length
      });
    }

    return {
      raw: rawErrors,
      client: clientErrors,
      sensitiveFields
    };
  };

  static getFriendlyErrorMessage = (error, schema) => {
    const fieldName = error.path[error.path.length - 1] || 'field';
    
    const messageTemplates = {
      'string.empty': `Please provide ${fieldName}`,
      'string.email': `Please provide a valid email address for ${fieldName}`,
      'string.min': `${fieldName} must be at least {#limit} characters`,
      'string.max': `${fieldName} must not exceed {#limit} characters`,
      'number.min': `${fieldName} must be at least {#limit}`,
      'number.max': `${fieldName} must not exceed {#limit}`,
      'any.required': `${fieldName} is required`,
      'any.only': `Please select a valid option for ${fieldName}`,
      'string.pattern.base': `Please provide a valid format for ${fieldName}`
    };

    return messageTemplates[error.type] || error.message;
  };

  static getErrorCode = (errorType) => {
    const codeMap = {
      'string.empty': 'REQUIRED_FIELD',
      'any.required': 'REQUIRED_FIELD',
      'string.email': 'INVALID_EMAIL',
      'string.min': 'MIN_LENGTH',
      'string.max': 'MAX_LENGTH',
      'number.min': 'MIN_VALUE',
      'number.max': 'MAX_VALUE',
      'any.only': 'INVALID_OPTION',
      'string.pattern.base': 'INVALID_FORMAT'
    };

    return codeMap[errorType] || 'VALIDATION_ERROR';
  };

  // 🚨 SECURITY CHECKS
  static checkSuspiciousPatterns = async (errors, req, validationId) => {
    const suspiciousPatterns = [
      // SQL injection patterns
      { pattern: /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i, type: 'SQL_INJECTION' },
      // XSS patterns
      { pattern: /(<script|javascript:|onload=|onerror=)/i, type: 'XSS_ATTEMPT' },
      // Path traversal
      { pattern: /(\.\.\/|\.\.\\)/, type: 'PATH_TRAVERSAL' }
    ];

    for (const error of errors) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.pattern.test(error.message)) {
          await YachiLogger.security('Suspicious validation pattern detected', {
            validationId,
            patternType: pattern.type,
            errorMessage: error.message,
            ip: req.ip,
            userId: req.user?.id,
            path: req.path
          });

          RealTimeService.emitToRoom('security_monitoring', 'suspiciousValidation', {
            validationId,
            patternType: pattern.type,
            ip: req.ip,
            path: req.path
          });
        }
      }
    }
  };

  static identifySensitiveFields = (errors, data) => {
    const sensitivePatterns = [
      'password', 'token', 'secret', 'key', 'creditcard', 'ssn', 'cvv'
    ];

    return errors
      .map(error => error.path.join('.').toLowerCase())
      .filter(field => sensitivePatterns.some(pattern => field.includes(pattern)));
  };

  // 📊 ANALYTICS & MONITORING
  static trackValidationMetrics = async (validationId, success, path, source) => {
    this.validationMetrics[success ? 'passed' : 'failed']++;

    const metrics = {
      validationId,
      success,
      path,
      source,
      timestamp: new Date().toISOString()
    };

    // Send to analytics
    YachiAnalytics.trackValidationEvent(metrics);

    // Store in Redis for monitoring
    if (RedisService.isHealthy()) {
      const key = `validation_metrics:${new Date().toISOString().split('T')[0]}`;
      await RedisService.hIncrBy(key, success ? 'passed' : 'failed', 1);
      await RedisService.expire(key, 86400); // 24 hours
    }
  };

  static logValidationEvent = async (eventType, details) => {
    const event = {
      id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      ...details
    };

    if (eventType === 'VALIDATION_FAILED') {
      YachiLogger.warn('Validation failed', event);
    } else if (eventType === 'VALIDATION_SUCCESS') {
      YachiLogger.debug('Validation successful', event);
    } else {
      YachiLogger.info(`Validation event: ${eventType}`, event);
    }

    return event;
  };

  // 🛠️ UTILITY METHODS
  static generateValidationId = () => {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  static getDataFromSource = (req, source) => {
    const sources = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    };
    
    return sources[source] || req.body;
  };

  static sanitizeDataSample = (data) => {
    if (typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cvv'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  };

  static getSchemaDescription = (schema) => {
    try {
      return schema.describe ? schema.describe() : 'Schema description not available';
    } catch {
      return 'Schema description not available';
    }
  };

  static getDataType = (data) => {
    if (Array.isArray(data)) return 'array';
    if (data === null) return 'null';
    return typeof data;
  };

  // 🔄 FALLBACK VALIDATION
  static fallbackValidation = async (schema, req, source, validationId) => {
    try {
      const data = this.getDataFromSource(req, source);
      const { error, value } = schema.validate(data, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        const processedErrors = this.processValidationErrors(error, schema, data);
        return { error: true, errors: processedErrors.client };
      }

      return { error: false, validatedData: value };
    } catch (fallbackError) {
      YachiLogger.error('Fallback validation failed', {
        validationId,
        error: fallbackError.message,
        source
      });

      return { 
        error: true, 
        errors: ['Validation system error'] 
      };
    }
  };

  // 📈 STATUS & METRICS
  static getValidationMetrics = () => {
    return {
      ...this.validationMetrics,
      successRate: this.validationMetrics.total > 0 ? 
        (this.validationMetrics.passed / this.validationMetrics.total) * 100 : 0,
      cacheHitRate: this.validationMetrics.total > 0 ? 
        (this.validationMetrics.cached / this.validationMetrics.total) * 100 : 0,
      timestamp: new Date().toISOString()
    };
  };

  static resetMetrics = () => {
    this.validationMetrics = {
      total: 0,
      passed: 0,
      failed: 0,
      cached: 0
    };
  };
}

// 🎯 COMPATIBILITY LAYER (for existing code)
const legacyValidate = (schema) => {
  return ValidationMiddleware.validateBody(schema);
};

module.exports = {
  // Enhanced validation
  validate: ValidationMiddleware.validate,
  validateBody: ValidationMiddleware.validateBody,
  validateQuery: ValidationMiddleware.validateQuery,
  validateParams: ValidationMiddleware.validateParams,
  validateHeaders: ValidationMiddleware.validateHeaders,
  validateMulti: ValidationMiddleware.validateMulti,
  
  // Legacy compatibility
  legacyValidate,
  
  // Utility exports
  getValidationMetrics: ValidationMiddleware.getValidationMetrics,
  resetValidationMetrics: ValidationMiddleware.resetMetrics,
  
  // Error processing utilities
  processValidationErrors: ValidationMiddleware.processValidationErrors,
  getFriendlyErrorMessage: ValidationMiddleware.getFriendlyErrorMessage
};
