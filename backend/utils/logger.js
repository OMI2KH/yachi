const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, colorize, metadata, json } = format;
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const { RedisService } = require('./redisService');
const { RealTimeService } = require('./realTimeService');

class YachiLogger {
  static logger = null;
  static logBuffer = [];
  static isBufferProcessing = false;
  static metrics = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0,
    critical: 0,
    performance: 0
  };

  // 🚀 ENHANCED INITIALIZATION
  static async initialize(options = {}) {
    try {
      if (process.env.NODE_ENV !== 'test') console.log('🔄 Initializing Yachi Logger...');

      // Ensure logs directory exists
      const logDir = path.join(__dirname, '../logs');
      await this.ensureLogDirectory(logDir);

      // Configure logger
      this.logger = this.createLoggerInstance(logDir, options);

      // Start background processors (skip in tests)
      if (process.env.NODE_ENV !== 'test') this.startBackgroundProcessors();

      // Handle uncaught exceptions
      this.handleUncaughtExceptions();

      if (process.env.NODE_ENV !== 'test') console.log('✅ Yachi Logger initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Yachi Logger initialization failed:', error);
      throw error;
    }
  }

  // 🏗️ LOGGER CONFIGURATION
  static createLoggerInstance(logDir, options) {
    const {
      level = process.env.LOG_LEVEL || 'info',
      enableConsole = true,
      enableFile = true,
      enableRedis = false,
      serviceName = 'yachi-platform'
    } = options;

    const customFormat = combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] }),
      errors({ stack: true }),
      this.yachiLogFormat()
    );

    const transportConfigs = [];

    // Console transport (colored for development)
    if (enableConsole) {
      transportConfigs.push(
        new transports.Console({
          level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
          format: combine(
            colorize(),
            this.yachiLogFormat()
          ),
          handleExceptions: true
        })
      );
    }

    // File transports
    if (enableFile) {
      // Error-specific log file
      transportConfigs.push(
        new transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: customFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Combined log file
      transportConfigs.push(
        new transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: customFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Debug log file (development only)
      if (process.env.NODE_ENV === 'development') {
        transportConfigs.push(
          new transports.File({
            filename: path.join(logDir, 'debug.log'),
            level: 'debug',
            format: customFormat,
            maxsize: 10485760,
            maxFiles: 5
          })
        );
      }

      // Performance log file
      transportConfigs.push(
        new transports.File({
          filename: path.join(logDir, 'performance.log'),
          level: 'info',
          format: combine(
            timestamp(),
            json()
          ),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }

    // Redis transport for distributed logging
    if (enableRedis) {
      transportConfigs.push(
        new transports.Stream({
          stream: {
            write: (message) => this.writeToRedis(message)
          }
        })
      );
    }

    const logger = createLogger({
      level,
      format: customFormat,
      transports: transportConfigs,
      exitOnError: false,
      defaultMeta: {
        service: serviceName,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      }
    });

    return logger;
  }

  // 🎯 CUSTOM LOG FORMAT
  static yachiLogFormat() {
    return printf(({ level, message, timestamp, stack, metadata, correlationId, userId, sessionId }) => {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message: stack || message,
        correlationId: correlationId || 'N/A',
        userId: userId || 'N/A',
        sessionId: sessionId || 'N/A',
        ...metadata
      };

      // Format for different outputs
      if (process.env.NODE_ENV === 'production') {
        return JSON.stringify(logEntry);
      } else {
        return `${timestamp} [${level}] ${correlationId ? `[${correlationId}]` : ''} ${userId ? `[User:${userId}]` : ''}: ${stack || message} ${Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : ''}`;
      }
    });
  }

  // 🚀 ENHANCED LOGGING METHODS
  static info(message, meta = {}) {
    this.metrics.info++;
    this.logger.info(message, this.enrichMetadata(meta));
    this.bufferLog('info', message, meta);
  }

  static warn(message, meta = {}) {
    this.metrics.warn++;
    this.logger?.warn ? this.logger.warn(message, this.enrichMetadata(meta)) : console.warn(message, meta);
    this.bufferLog('warn', message, meta);
    
    // Real-time alert for warnings
    if (typeof RealTimeService !== 'undefined' && RealTimeService && RealTimeService.emitToRoom) {
      RealTimeService.emitToRoom('logging_dashboard', 'logWarning', {
        message,
        meta,
        timestamp: new Date().toISOString()
      });
    }
  }

  static error(message, meta = {}) {
    this.metrics.error++;
    this.logger?.error ? this.logger.error(message, this.enrichMetadata(meta)) : console.error(message, meta);
    this.bufferLog('error', message, meta);
    
    // Real-time alert for errors
    if (typeof RealTimeService !== 'undefined' && RealTimeService && RealTimeService.emitToRoom) {
      RealTimeService.emitToRoom('logging_dashboard', 'logError', {
        message,
        meta,
        timestamp: new Date().toISOString()
      });
    }

    // Critical errors trigger additional alerts
    if (meta.critical) {
      this.handleCriticalError(message, meta);
    }
  }

  static debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.metrics.debug++;
      this.logger?.debug ? this.logger.debug(message, this.enrichMetadata(meta)) : console.debug(message, meta);
      this.bufferLog('debug', message, meta);
    }
  }

  static critical(message, meta = {}) {
    this.metrics.critical++;
    const enrichedMeta = { ...meta, critical: true };
    this.logger?.error ? this.logger.error(`🚨 CRITICAL: ${message}`, this.enrichMetadata(enrichedMeta)) : console.error(message, enrichedMeta);
    this.bufferLog('critical', message, enrichedMeta);
    
    // Immediate alert for critical issues
    this.handleCriticalError(message, enrichedMeta);
  }

  // 📊 PERFORMANCE LOGGING
  static async performance(operation, fn, meta = {}) {
    const startTime = performance.now();
    const correlationId = this.generateCorrelationId();

    try {
      this.debug(`🚀 Starting: ${operation}`, { ...meta, correlationId, operation });

      const result = await fn();

      const duration = performance.now() - startTime;
      this.metrics.performance++;

      // Log performance
      this.logger.info('Performance metric', {
        ...this.enrichMetadata(meta),
        correlationId,
        operation,
        duration: Math.round(duration),
        status: 'success'
      });

      // Warn for slow operations
      if (duration > 1000) { // 1 second threshold
        this.warn(`Slow operation: ${operation} took ${Math.round(duration)}ms`, {
          ...meta,
          correlationId,
          operation,
          duration
        });
      }

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.error(`Failed: ${operation} after ${Math.round(duration)}ms`, {
        ...meta,
        correlationId,
        operation,
        duration: Math.round(duration),
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  // 🎯 SECURITY LOGGING
  static security(event, meta = {}) {
    const securityMeta = {
      ...meta,
      category: 'security',
      severity: meta.severity || 'medium'
    };

    this.logger.warn(`🔒 SECURITY: ${event}`, this.enrichMetadata(securityMeta));
    
    // Real-time security alerts
    RealTimeService.emitToRoom('security_dashboard', 'securityEvent', {
      event,
      meta: securityMeta,
      timestamp: new Date().toISOString()
    });
  }

  // 💰 BUSINESS LOGGING
  static business(event, data = {}) {
    const businessMeta = {
      ...data,
      category: 'business',
      eventType: event
    };

    this.logger.info(`💼 BUSINESS: ${event}`, this.enrichMetadata(businessMeta));
    
    // Analytics integration
    RealTimeService.emitToRoom('analytics_dashboard', 'businessEvent', {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // 🎪 GAMIFICATION LOGGING
  static gamification(event, data = {}) {
    const gamificationMeta = {
      ...data,
      category: 'gamification',
      eventType: event
    };

    this.logger.info(`🎯 GAMIFICATION: ${event}`, this.enrichMetadata(gamificationMeta));
  }

  // 🛠️ UTILITY METHODS
  static enrichMetadata(meta = {}) {
    const correlationId = meta.correlationId || this.generateCorrelationId();
    
    return {
      ...meta,
      correlationId,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  static generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async ensureLogDirectory(logDir) {
    try {
      await fsPromises.access(logDir);
    } catch {
      await fsPromises.mkdir(logDir, { recursive: true });
      console.log(`📁 Created log directory: ${logDir}`);
    }
  }

  // 🔄 BUFFERED LOGGING FOR PERFORMANCE
  static bufferLog(level, message, meta) {
    const logEntry = {
      level,
      message,
      meta: this.enrichMetadata(meta),
      timestamp: new Date().toISOString()
    };

    this.logBuffer.push(logEntry);

    // Process buffer if it reaches threshold
    if (this.logBuffer.length >= 100 && !this.isBufferProcessing) {
      this.processLogBuffer();
    }
  }

  static async processLogBuffer() {
    if (this.isBufferProcessing || this.logBuffer.length === 0) return;

    this.isBufferProcessing = true;

    try {
      const batch = this.logBuffer.splice(0, 100);
      
      // Store in Redis for distributed analysis
      if (typeof RedisService !== 'undefined' && RedisService && RedisService.isHealthy && RedisService.isHealthy()) {
        await RedisService.rPush('log_buffer', JSON.stringify(batch));
      }

      // Process critical logs immediately
      const criticalLogs = batch.filter(log => log.level === 'critical' || log.level === 'error');
      for (const log of criticalLogs) {
        await this.handleCriticalLog(log);
      }

    } catch (error) {
      console.error('Log buffer processing error:', error);
    } finally {
      this.isBufferProcessing = false;

      // Continue processing if more logs accumulated
      if (this.logBuffer.length > 0) {
        setImmediate(() => this.processLogBuffer());
      }
    }
  }

  // 🚨 CRITICAL ERROR HANDLING
  static handleCriticalError(message, meta) {
    // Send immediate alerts
    RealTimeService.emitToRoom('critical_alerts', 'criticalError', {
      message,
      meta,
      timestamp: new Date().toISOString(),
      service: 'yachi-platform'
    });

    // TODO: Integrate with external alerting (PagerDuty, Slack, etc.)
    console.error('🚨 CRITICAL ERROR ALERT:', message, meta);
  }

  static async handleCriticalLog(log) {
    // Additional handling for critical logs
    // Could include: email alerts, SMS, external monitoring services
    console.error('🔄 Processing critical log:', log);
  }

  // 📡 REDIS LOGGING INTEGRATION
  static async writeToRedis(message) {
    try {
      if (typeof RedisService !== 'undefined' && RedisService && RedisService.isHealthy && RedisService.isHealthy()) {
        await RedisService.rPush('application_logs', message);
        
        // Keep only last 10,000 log entries
        await RedisService.lTrim('application_logs', -10000, -1);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') console.error('Redis logging error:', error);
    }
  }

  // 🔄 BACKGROUND PROCESSORS
  static startBackgroundProcessors() {
    // Avoid background timers during tests; these keep Jest running.
    if (process.env.NODE_ENV === 'test') return;

    // Process log buffer every 30 seconds
    setInterval(() => {
      this.processLogBuffer();
    }, 30000);

    // Report metrics every hour
    setInterval(() => {
      this.reportMetrics();
    }, 3600000);

    // Cleanup old logs daily
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  // 🧹 CLEANUP & MAINTENANCE
  static async cleanupOldLogs() {
    const logDir = path.join(__dirname, '../logs');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const files = await fsPromises.readdir(logDir);
      
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = await fsPromises.stat(filePath);
          
          if (stats.mtime < thirtyDaysAgo) {
            await fsPromises.unlink(filePath);
            this.info(`Cleaned up old log file: ${file}`);
          }
        }
      }
    } catch (error) {
      this.error('Log cleanup error:', { error: error.message });
    }
  }

  static async reportMetrics() {
    const metrics = this.getMetrics();
    
    this.info('Logging metrics report', { metrics });
    
    // Reset counters for next period
    this.metrics.info = 0;
    this.metrics.warn = 0;
    this.metrics.error = 0;
    this.metrics.debug = 0;
    this.metrics.critical = 0;
    this.metrics.performance = 0;
  }

  // 🎯 MORGAN STREAM COMPATIBILITY
  static getMorganStream() {
    return {
      write: (message) => {
        this.info(message.trim(), { category: 'http', source: 'morgan' });
      }
    };
  }

  // 📊 STATUS & MONITORING
  static getMetrics() {
    return {
      ...this.metrics,
      bufferSize: this.logBuffer.length,
      isBufferProcessing: this.isBufferProcessing,
      totalLogs: Object.values(this.metrics).reduce((sum, count) => sum + count, 0),
      errorRate: this.metrics.info > 0 ? (this.metrics.error / this.metrics.info) * 100 : 0,
      timestamp: new Date().toISOString()
    };
  }

  static getStatus() {
    return {
      initialized: !!this.logger,
      level: this.logger?.level || 'unknown',
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  // 🛡️ UNCAUGHT EXCEPTION HANDLING
  static handleUncaughtExceptions() {
    process.on('uncaughtException', (error) => {
      this.critical('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        pid: process.pid
      });
      
      // Graceful shutdown
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
      });
    });
  }
}

// 🎯 COMPATIBILITY LAYER (for existing code)
const legacyLogger = {
  info: (message, meta) => YachiLogger.info(message, meta),
  warn: (message, meta) => YachiLogger.warn(message, meta),
  error: (message, meta) => YachiLogger.error(message, meta),
  debug: (message, meta) => YachiLogger.debug(message, meta),
  stream: YachiLogger.getMorganStream()
};

module.exports = {
  // Enhanced logger
  logger: YachiLogger,
  
  // Legacy compatibility
  ...legacyLogger,
  
  // Utility exports
  initializeLogger: YachiLogger.initialize,
  getLoggerStatus: YachiLogger.getStatus,
  getLoggerMetrics: YachiLogger.getMetrics,
  
  // Specialized logging methods
  performance: YachiLogger.performance,
  security: YachiLogger.security,
  business: YachiLogger.business,
  gamification: YachiLogger.gamification,
  critical: YachiLogger.critical
};
