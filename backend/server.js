/**
 * Yachi Enterprise Server
 * Ethiopian Service Marketplace & AI Construction Platform
 * @version 2.0.0
 * @class YachiServer
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

// Core Services
const ConfigService = require('./config');
const DatabaseService = require('./database/connection');
const RedisService = require('./config/redis');
const SocketService = require('./services/realTimeService');
const AIService = require('./services/aiService');
const PaymentService = require('./services/paymentService');
const NotificationService = require('./services/yachiNotifications');

// Optional Sentry integration (safe require)
let Sentry = null;
try {
  Sentry = require('@sentry/node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
    console.log('Sentry initialized');
  }
} catch (e) {
  // Sentry not installed or failed to init — continue without it
  Sentry = null;
}

// Enterprise Middleware
const { GlobalErrorHandler, OperationalError } = require('./middleware/errorHandler');
const SecurityMiddleware = require('./middleware/security');
const { RequestLogger, SystemLogger } = require('./middleware/logger');

// API Routes
const APIRouter = require('./routes/api');
const HealthRouter = require('./routes/health');

class YachiEnterpriseServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = this.initializeSocketIO();
    
    this.config = ConfigService;
    this.port = this.config.server.port;
    this.env = this.config.server.env;
    this.isProduction = this.env === 'production';
    this.cpuCount = os.cpus().length;

    this.systemLogger = new SystemLogger();
  }

  /**
   * Initialize Socket.IO with enterprise configuration
   * @returns {Object} Socket.IO instance
   */
  initializeSocketIO() {
    return socketIo(this.server, {
      cors: {
        origin: this.config.cors.origins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8, // 100MB for file transfers
      transports: ['websocket', 'polling']
    });
  }

  /**
   * Master server initialization process
   */
  async initialize() {
    try {
      this.systemLogger.info('🚀 Initializing Yachi Enterprise Server...');

      // Cluster mode for production
      if (this.isProduction && cluster.isMaster) {
        await this.initializeCluster();
        return;
      }

      await this.initializeServices();
      await this.setupInfrastructure();
      await this.startServer();

    } catch (error) {
      this.systemLogger.error('❌ Server initialization failed', error);
      process.exit(1);
    }
  }

  /**
   * Initialize cluster mode for production
   */
  async initializeCluster() {
    this.systemLogger.info(`🎯 Starting ${this.cpuCount} worker processes`);

    for (let i = 0; i < this.cpuCount; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      this.systemLogger.warn(`🔄 Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
  }

  /**
   * Initialize core services and dependencies
   */
  async initializeServices() {
    const serviceInitializers = [
      { name: 'Database', service: DatabaseService },
      { name: 'Redis', service: RedisService },
      { name: 'AI Engine', service: AIService, condition: this.config.features.aiConstruction },
      { name: 'Payment Gateways', service: PaymentService, condition: this.config.features.payments },
      { name: 'Notification System', service: NotificationService, condition: this.config.features.notifications }
    ];

    for (const { name, service, condition = true } of serviceInitializers) {
      if (condition) {
        try {
          await service.initialize();
          this.systemLogger.info(`✅ ${name} Service initialized`);
        } catch (error) {
          throw new OperationalError(`Failed to initialize ${name} Service`, error);
        }
      }
    }
  }

  /**
   * Setup server infrastructure and middleware
   */
  async setupInfrastructure() {
    this.setupSecurityLayer();
    this.setupMiddlewareLayer();
    this.setupAPILayer();
    this.setupRealTimeLayer();
    this.setupErrorHandlingLayer();
  }

  /**
   * Enterprise security configuration
   */
  setupSecurityLayer() {
    // Helmet security headers
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.chapa.co", "https://api.telebirr.com"]
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = this.config.cors.origins;
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
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
        'X-Client-Version'
      ]
    }));

    // Rate limiting strategies
    this.setupRateLimiting();

    // Data sanitization
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp({
      whitelist: [
        'price', 'rating', 'duration', 'distance', 
        'page', 'limit', 'sort', 'fields', 'category',
        'latitude', 'longitude', 'radius'
      ]
    }));

    // Custom security middleware
    this.app.use(SecurityMiddleware);
  }

  /**
   * Advanced rate limiting configuration
   */
  setupRateLimiting() {
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: this.config.rateLimit.maxRequests,
      message: {
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const authLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: {
        success: false,
        error: 'Auth rate limit exceeded',
        message: 'Too many authentication attempts, please try again in an hour.'
      }
    });

    const aiLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      message: {
        success: false,
        error: 'AI service rate limit exceeded',
        message: 'Too many AI requests, please try again in a minute.'
      }
    });

    // Apply rate limits
    this.app.use('/api', generalLimiter);
    this.app.use('/api/v1/auth', authLimiter);
    this.app.use('/api/v1/ai', aiLimiter);
  }

  /**
   * Enterprise middleware stack
   */
  setupMiddlewareLayer() {
    // Body parsing with limits
    // Sentry request handler if available
    if (Sentry && Sentry.Handlers && typeof Sentry.Handlers.requestHandler === 'function') {
      this.app.use(Sentry.Handlers.requestHandler());
    }
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb',
      parameterLimit: 100
    }));

    // Compression
    this.app.use(compression({
      level: 6,
      threshold: 1024
    }));

    // Static file serving
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
      maxAge: this.isProduction ? '1d' : '0',
      etag: true,
      lastModified: true
    }));

    // Advanced logging
    this.setupLogging();

    // Request context and logging
    this.app.use(RequestLogger);
  }

  /**
   * Advanced logging configuration
   */
  setupLogging() {
    if (this.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      const accessLogStream = fs.createWriteStream(
        path.join(__dirname, 'logs', 'access.log'),
        { flags: 'a', encoding: 'utf8' }
      );
      
      const logFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';
      
      this.app.use(morgan(logFormat, { 
        stream: accessLogStream,
        skip: (req) => req.url === '/health' // Skip health checks in production logs
      }));
    }
  }

  /**
   * API routing layer
   */
  setupAPILayer() {
    // Health checks
    this.app.use('/health', HealthRouter);

    // API Version 1
    this.app.use('/api/v1', APIRouter);

    // API Documentation
    this.app.use('/docs', express.static(path.join(__dirname, 'public/docs')));

    // Feature status endpoint
    this.app.get('/features', (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          platform: 'Yachi Enterprise',
          version: '2.0.0',
          features: this.config.features,
          environment: this.env,
          timestamp: new Date().toISOString()
        }
      });
    });

    // 404 handler
    this.app.all('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'ENDPOINT_NOT_FOUND',
        message: `Route ${req.originalUrl} not found on this server`,
        documentation: `${req.protocol}://${req.get('host')}/docs`
      });
    });
  }

  /**
   * Real-time communication layer
   */
  setupRealTimeLayer() {
    // Socket.IO authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('AUTH_TOKEN_REQUIRED'));
        }

        // Verify JWT token
        const user = await this.verifySocketToken(token);
        
        if (!user) {
          return next(new Error('INVALID_AUTH_TOKEN'));
        }

        // Attach user to socket session
        socket.user = user;
        socket.join(`user:${user.id}`);
        socket.join(`role:${user.role}`);

        next();
      } catch (error) {
        next(new Error('AUTHENTICATION_FAILED'));
      }
    });

    // Initialize Socket.IO handlers
    SocketService.initialize(this.io);

    this.systemLogger.info('✅ Real-time communication layer initialized');
  }

  /**
   * Verify Socket.IO authentication token
   */
  async verifySocketToken(token) {
    // Implementation would integrate with your auth service
    // This is a placeholder for the actual implementation
    const jwt = require('jsonwebtoken');
    return jwt.verify(token.replace('Bearer ', ''), this.config.security.jwtSecret);
  }

  /**
   * Global error handling layer
   */
  setupErrorHandlingLayer() {
    // Sentry error handler
    if (Sentry && Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') {
      this.app.use(Sentry.Handlers.errorHandler());
    }

    // Global error handler
    const { GlobalErrorHandler } = require('./middleware/errorHandler');
    this.app.use(GlobalErrorHandler);

    // Process event handlers
    this.setupProcessHandlers();
  }

  /**
   * Process event handlers for graceful shutdown
   */
  setupProcessHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
      this.systemLogger.error('UNHANDLED_REJECTION', { reason, promise });
      
      // Graceful shutdown in production
      if (this.isProduction) {
        this.gracefulShutdown();
      }
    });

    process.on('uncaughtException', (error) => {
      this.systemLogger.error('UNCAUGHT_EXCEPTION', error);
      
      // Graceful shutdown
      this.gracefulShutdown();
    });

    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Start the enterprise server
   */
  async startServer() {
    this.server.listen(this.port, () => {
      this.systemLogger.info(`
        🎉 Yachi Enterprise Server Started Successfully!
        
        📊 SERVER INFORMATION
        =====================
        Environment: ${this.env}
        Port: ${this.port}
        PID: ${process.pid}
        Platform: ${process.platform}
        Node: ${process.version}
        
        🌐 ENDPOINTS
        ============
        API: http://localhost:${this.port}/api/v1
        Documentation: http://localhost:${this.port}/docs
        Health: http://localhost:${this.port}/health
        Features: http://localhost:${this.port}/features
        
        🚀 FEATURES STATUS
        ==================
        AI Construction: ${this.config.features.aiConstruction ? '✅' : '❌'}
        Payment Gateways: ${this.config.features.payments ? '✅' : '❌'} 
        Government Portal: ${this.config.features.government ? '✅' : '❌'}
        Premium Features: ${this.config.features.premium ? '✅' : '❌'}
        Gamification: ${this.config.features.gamification ? '✅' : '❌'}
        
        ⏰ Startup Time: ${new Date().toISOString()}
        💾 Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
      `);
    });

    // Startup diagnostics
    this.runStartupDiagnostics();
  }

  /**
   * Run startup diagnostics and health checks
   */
  async runStartupDiagnostics() {
    try {
      // Database connectivity check
      await DatabaseService.healthCheck();
      
      // Redis connectivity check  
      await RedisService.healthCheck();
      
      // External service health checks
      if (this.config.features.payments) {
        await PaymentService.healthCheck();
      }

      this.systemLogger.info('✅ All startup diagnostics passed');

    } catch (error) {
      this.systemLogger.warn('⚠️ Startup diagnostics warning', error);
    }
  }

  /**
   * Graceful shutdown procedure
   */
  async gracefulShutdown() {
    this.systemLogger.info('🔄 Starting graceful shutdown...');

    const shutdownSteps = [
      { name: 'HTTP Server', action: () => new Promise(resolve => this.server.close(resolve)) },
      { name: 'Socket.IO', action: () => new Promise(resolve => this.io.close(resolve)) },
      { name: 'Database Connections', action: () => DatabaseService.close() },
      { name: 'Redis Connections', action: () => RedisService.close() },
      { name: 'AI Service', action: () => AIService.close() },
      { name: 'Payment Service', action: () => PaymentService.close() }
    ];

    for (const step of shutdownSteps) {
      try {
        this.systemLogger.info(`Closing ${step.name}...`);
        await step.action();
        this.systemLogger.info(`✅ ${step.name} closed successfully`);
      } catch (error) {
        this.systemLogger.error(`❌ Error closing ${step.name}`, error);
      }
    }

    this.systemLogger.info('👋 Yachi Enterprise Server shut down gracefully');
    process.exit(0);
  }
}

// Server initialization and startup
const yachiServer = new YachiEnterpriseServer();

// Handle module dependencies
if (require.main === module) {
  yachiServer.initialize();
}

module.exports = yachiServer;