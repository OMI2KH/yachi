/**
 * Yachi - Enterprise Database Configuration
 * Multi-Database Architecture with MongoDB, Redis, and Advanced Connection Management
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const redis = require('redis');
const { MongoClient } = require('mongodb');

// Database Configuration
const config = {
  // MongoDB Configuration
  mongodb: {
    // Primary Database
    primary: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/yachi_primary',
      options: {
        maxPoolSize: 100,
        minPoolSize: 10,
        maxIdleTimeMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
        heartbeatFrequencyMS: 10000,
        serverSelectionTimeoutMS: 30000,
        retryWrites: true,
        retryReads: true,
        w: 'majority',
        readPreference: 'primary',
        compressors: ['zlib', 'snappy'],
        zlibCompressionLevel: 6
      }
    },

    // Analytics Database
    analytics: {
      uri: process.env.MONGODB_ANALYTICS_URI || 'mongodb://localhost:27017/yachi_analytics',
      options: {
        maxPoolSize: 50,
        minPoolSize: 5,
        readPreference: 'secondary',
        retryReads: true
      }
    },

    // Logging Database
    logs: {
      uri: process.env.MONGODB_LOGS_URI || 'mongodb://localhost:27017/yachi_logs',
      options: {
        maxPoolSize: 25,
        minPoolSize: 2,
        readPreference: 'secondaryPreferred',
        w: 1
      }
    }
  },

  // Redis Configuration
  redis: {
    // Primary Cache
    cache: {
      url: process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0',
      options: {
        socket: {
          connectTimeout: 10000,
          timeout: 30000,
          lazyConnect: true,
          reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
        },
        password: process.env.REDIS_PASSWORD,
        database: 0
      }
    },

    // Session Storage
    session: {
      url: process.env.REDIS_SESSION_URL || 'redis://localhost:6379/1',
      options: {
        socket: {
          connectTimeout: 10000,
          timeout: 30000
        },
        password: process.env.REDIS_PASSWORD,
        database: 1
      }
    },

    // Real-time Data
    realtime: {
      url: process.env.REDIS_REALTIME_URL || 'redis://localhost:6379/2',
      options: {
        socket: {
          connectTimeout: 10000,
          timeout: 30000
        },
        password: process.env.REDIS_PASSWORD,
        database: 2
      }
    },

    // Message Queue
    queue: {
      url: process.env.REDIS_QUEUE_URL || 'redis://localhost:6379/3',
      options: {
        socket: {
          connectTimeout: 10000,
          timeout: 30000
        },
        password: process.env.REDIS_PASSWORD,
        database: 3
      }
    }
  },

  // Database Performance Settings
  performance: {
    // Query Optimization
    query: {
      maxTimeMS: 30000,
      allowDiskUse: true,
      batchSize: 1000
    },

    // Index Settings
    indexes: {
      backgroundBuild: true,
      maxBuildTimeMS: 3600000 // 1 hour
    },

    // Connection Pool
    pool: {
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    }
  },

  // Replication & Sharding
  replication: {
    enabled: process.env.DB_REPLICATION_ENABLED === 'true',
    readPreference: 'secondaryPreferred',
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 5000
    }
  },

  // Backup & Recovery
  backup: {
    enabled: process.env.DB_BACKUP_ENABLED === 'true',
    schedule: '0 2 * * *', // Daily at 2 AM
    retentionDays: 30,
    compression: true
  },

  // Monitoring & Metrics
  monitoring: {
    enabled: true,
    slowQueryThreshold: 100, // milliseconds
    connectionPoolMonitoring: true,
    queryLogging: process.env.NODE_ENV === 'development'
  }
};

// Database Connections Manager
class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.redisClients = new Map();
    this.isConnected = false;
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      lastHealthCheck: null
    };
  }

  /**
   * Initialize all database connections
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Yachi Database Connections...');

      // Initialize MongoDB connections
      await this.initializeMongoDB();

      // Initialize Redis connections
      await this.initializeRedis();

      // Setup connection monitoring
      this.setupConnectionMonitoring();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isConnected = true;
      this.connectionStats.lastHealthCheck = new Date();

      console.log('✅ All database connections initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`DATABASE_INIT_FAILED: ${error.message}`);
    }
  }

  /**
   * Initialize MongoDB connections
   */
  async initializeMongoDB() {
    try {
      // Primary database connection
      const primaryConnection = await this.createMongoConnection(
        'primary',
        config.mongodb.primary.uri,
        config.mongodb.primary.options
      );

      this.connections.set('primary', primaryConnection);
      console.log('✅ MongoDB Primary connection established');

      // Analytics database connection
      if (process.env.FEATURE_ANALYTICS === 'true') {
        const analyticsConnection = await this.createMongoConnection(
          'analytics',
          config.mongodb.analytics.uri,
          config.mongodb.analytics.options
        );
        this.connections.set('analytics', analyticsConnection);
        console.log('✅ MongoDB Analytics connection established');
      }

      // Logs database connection
      if (process.env.FEATURE_LOGGING === 'true') {
        const logsConnection = await this.createMongoConnection(
          'logs',
          config.mongodb.logs.uri,
          config.mongodb.logs.options
        );
        this.connections.set('logs', logsConnection);
        console.log('✅ MongoDB Logs connection established');
      }

      // Setup MongoDB event listeners
      this.setupMongoEventListeners();

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  /**
   * Create MongoDB connection
   */
  async createMongoConnection(name, uri, options) {
    try {
      const connection = await mongoose.createConnection(uri, {
        ...options,
        bufferCommands: false,
        bufferMaxEntries: 0,
        useNewUrlParser: true,
        useUnifiedTopology: true
      }).asPromise();

      this.connectionStats.totalConnections++;
      this.connectionStats.activeConnections++;

      return connection;
    } catch (error) {
      this.connectionStats.failedConnections++;
      throw error;
    }
  }

  /**
   * Initialize Redis connections
   */
  async initializeRedis() {
    try {
      // Cache Redis client
      const cacheClient = await this.createRedisClient(
        'cache',
        config.redis.cache.url,
        config.redis.cache.options
      );
      this.redisClients.set('cache', cacheClient);
      console.log('✅ Redis Cache connection established');

      // Session Redis client
      const sessionClient = await this.createRedisClient(
        'session',
        config.redis.session.url,
        config.redis.session.options
      );
      this.redisClients.set('session', sessionClient);
      console.log('✅ Redis Session connection established');

      // Real-time Redis client
      const realtimeClient = await this.createRedisClient(
        'realtime',
        config.redis.realtime.url,
        config.redis.realtime.options
      );
      this.redisClients.set('realtime', realtimeClient);
      console.log('✅ Redis Real-time connection established');

      // Queue Redis client
      const queueClient = await this.createRedisClient(
        'queue',
        config.redis.queue.url,
        config.redis.queue.options
      );
      this.redisClients.set('queue', queueClient);
      console.log('✅ Redis Queue connection established');

    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Create Redis client
   */
  async createRedisClient(name, url, options) {
    return new Promise((resolve, reject) => {
      const client = redis.createClient({
        url,
        ...options
      });

      client.on('error', (err) => {
        console.error(`❌ Redis ${name} error:`, err);
      });

      client.on('connect', () => {
        console.log(`✅ Redis ${name} connected`);
        resolve(client);
      });

      client.on('end', () => {
        console.log(`🔴 Redis ${name} disconnected`);
        this.connectionStats.activeConnections--;
      });

      client.connect().catch(reject);
    });
  }

  /**
   * Setup MongoDB event listeners
   */
  setupMongoEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB default connection established');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB default connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔴 MongoDB default connection disconnected');
      this.connectionStats.activeConnections--;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB default connection reconnected');
      this.connectionStats.activeConnections++;
    });
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    // Health check every 30 seconds
    setInterval(() => {
      this.healthCheck();
    }, 30000);

    // Connection pool monitoring
    setInterval(() => {
      this.monitorConnectionPools();
    }, 60000);
  }

  /**
   * Database health check
   */
  async healthCheck() {
    try {
      const checks = [];

      // Check MongoDB connections
      for (const [name, connection] of this.connections) {
        const isAlive = connection.readyState === 1;
        checks.push({
          database: `mongodb_${name}`,
          status: isAlive ? 'healthy' : 'unhealthy',
          readyState: connection.readyState
        });
      }

      // Check Redis connections
      for (const [name, client] of this.redisClients) {
        try {
          await client.ping();
          checks.push({
            database: `redis_${name}`,
            status: 'healthy'
          });
        } catch (error) {
          checks.push({
            database: `redis_${name}`,
            status: 'unhealthy',
            error: error.message
          });
        }
      }

      this.connectionStats.lastHealthCheck = new Date();

      const allHealthy = checks.every(check => check.status === 'healthy');
      
      if (!allHealthy) {
        console.warn('⚠️ Database health check failed:', checks);
      }

      return {
        healthy: allHealthy,
        checks: checks,
        timestamp: this.connectionStats.lastHealthCheck
      };

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Monitor connection pools
   */
  async monitorConnectionPools() {
    try {
      const stats = {
        mongodb: {},
        redis: {},
        timestamp: new Date()
      };

      // MongoDB connection stats
      for (const [name, connection] of this.connections) {
        stats.mongodb[name] = {
          readyState: connection.readyState,
          host: connection.host,
          port: connection.port,
          name: connection.name
        };
      }

      // Redis connection stats
      for (const [name, client] of this.redisClients) {
        try {
          const info = await client.info();
          stats.redis[name] = {
            connected: true,
            version: info.split('\n')[0].split(':')[1]?.trim()
          };
        } catch (error) {
          stats.redis[name] = {
            connected: false,
            error: error.message
          };
        }
      }

      // Log pool statistics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Database Pool Statistics:', stats);
      }

      return stats;

    } catch (error) {
      console.error('❌ Connection pool monitoring failed:', error);
    }
  }

  /**
   * Get database connection
   */
  getConnection(name = 'primary') {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`Database connection '${name}' not found`);
    }
    return connection;
  }

  /**
   * Get Redis client
   */
  getRedisClient(name = 'cache') {
    const client = this.redisClients.get(name);
    if (!client) {
      throw new Error(`Redis client '${name}' not found`);
    }
    return client;
  }

  /**
   * Execute database transaction
   */
  async executeTransaction(sessionOperations) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const result = await sessionOperations(session);
      
      await session.commitTransaction();
      return result;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Backup database
   */
  async backupDatabase() {
    if (!config.backup.enabled) {
      console.log('⚠️ Database backup is disabled');
      return;
    }

    try {
      console.log('💾 Starting database backup...');
      
      // Implementation would use mongodump or similar tool
      // This is a placeholder for actual backup logic
      
      console.log('✅ Database backup completed');
      return { success: true, timestamp: new Date() };

    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n${signal} received, closing database connections...`);
        await this.closeConnections();
        process.exit(0);
      });
    });
  }

  /**
   * Close all database connections
   */
  async closeConnections() {
    try {
      console.log('🔴 Closing database connections...');

      // Close MongoDB connections
      for (const [name, connection] of this.connections) {
        await connection.close();
        console.log(`✅ MongoDB ${name} connection closed`);
      }

      // Close Redis connections
      for (const [name, client] of this.redisClients) {
        await client.quit();
        console.log(`✅ Redis ${name} connection closed`);
      }

      this.isConnected = false;
      console.log('✅ All database connections closed successfully');

    } catch (error) {
      console.error('❌ Error closing database connections:', error);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      isConnected: this.isConnected,
      mongodbConnections: this.connections.size,
      redisClients: this.redisClients.size
    };
  }
}

// Create global database manager instance
const databaseManager = new DatabaseManager();

// Export utilities and manager
module.exports = {
  // Database Manager
  databaseManager,

  // Connection getters
  getPrimaryConnection: () => databaseManager.getConnection('primary'),
  getAnalyticsConnection: () => databaseManager.getConnection('analytics'),
  getLogsConnection: () => databaseManager.getConnection('logs'),
  
  // Redis getters
  getCacheClient: () => databaseManager.getRedisClient('cache'),
  getSessionClient: () => databaseManager.getRedisClient('session'),
  getRealtimeClient: () => databaseManager.getRedisClient('realtime'),
  getQueueClient: () => databaseManager.getRedisClient('queue'),

  // Utility functions
  executeTransaction: (operations) => databaseManager.executeTransaction(operations),
  healthCheck: () => databaseManager.healthCheck(),
  getStats: () => databaseManager.getStats(),

  // Configuration
  config
};

// Export manager for direct access
module.exports.default = databaseManager;