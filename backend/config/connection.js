const { Sequelize } = require('sequelize');
const { YachiLogger } = require('../utils/logger');
const { configManager } = require('../config');

/**
 * 🗃️ Yachi Database Connection Manager
 * Advanced database connection management with connection pooling,
 * health monitoring, and failover strategies
 */

class DatabaseConnectionManager {
  constructor() {
    this.connections = new Map();
    this.primaryConnection = null;
    this.replicaConnections = [];
    this.connectionStats = {
      totalQueries: 0,
      failedQueries: 0,
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0
    };
    
    this.setupEventHandlers();
  }

  /**
   * 🎯 Setup database event handlers
   */
  setupEventHandlers() {
    process.on('beforeExit', async () => {
      await this.closeAllConnections();
    });

    process.on('SIGINT', async () => {
      await this.closeAllConnections();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.closeAllConnections();
      process.exit(0);
    });
  }

  /**
   * 🚀 Initialize primary database connection
   */
  async initializePrimaryConnection() {
    try {
      const dbConfig = configManager.get('database');
      
      if (!dbConfig) {
        throw new Error('Database configuration not found');
      }

      YachiLogger.info('Initializing primary database connection...');

      const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        
        // Connection pooling
        pool: {
          max: dbConfig.pool?.max || 20,
          min: dbConfig.pool?.min || 2,
          acquire: dbConfig.pool?.acquire || 60000,
          idle: dbConfig.pool?.idle || 30000,
          evict: dbConfig.pool?.evict || 10000
        },
        
        // Logging
        logging: (msg) => {
          if (configManager.isDevelopment()) {
            YachiLogger.debug(msg);
          }
        },
        
        // Performance optimization
        benchmark: true,
        retry: {
          max: 3,
          timeout: 30000,
          match: [
            /ConnectionError/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /ECONNREFUSED/,
            /ETIMEDOUT/,
            /EHOSTUNREACH/,
            /ENOTFOUND/
          ],
          backoffBase: 100,
          backoffExponent: 1.1
        },
        
        // Query optimization
        dialectOptions: {
          connectTimeout: 60000,
          requestTimeout: 60000,
          cancelTimeout: 30000,
          encrypt: dbConfig.dialectOptions?.encrypt || false,
          enableArithAbort: dbConfig.dialectOptions?.enableArithAbort || true,
          multiSubnetFailover: dbConfig.dialectOptions?.multiSubnetFailover || false,
          readOnlyIntent: false
        },
        
        // Additional settings
        define: {
          timestamps: true,
          paranoid: true,
          underscored: true,
          freezeTableName: false
        },
        
        // Timezone
        timezone: '+03:00', // Ethiopia timezone
        
        // Transaction configuration
        transactionType: Sequelize.Transaction.TYPES.IMMEDIATE,
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });

      // 🛡️ Add connection event handlers
      this.setupConnectionEvents(sequelize, 'primary');

      // 🔍 Test connection
      await this.testConnection(sequelize, 'primary');

      this.primaryConnection = sequelize;
      this.connections.set('primary', sequelize);
      
      this.connectionStats.successfulConnections++;
      YachiLogger.info('Primary database connection established successfully');

      return sequelize;

    } catch (error) {
      this.connectionStats.failedConnections++;
      YachiLogger.error('Failed to initialize primary database connection:', error);
      throw error;
    }
  }

  /**
   * 🔄 Initialize replica connections for read scalability
   */
  async initializeReplicaConnections() {
    try {
      const replicaConfigs = configManager.get('database.replicas') || [];
      
      if (replicaConfigs.length === 0) {
        YachiLogger.info('No replica configurations found, proceeding with primary only');
        return;
      }

      YachiLogger.info(`Initializing ${replicaConfigs.length} replica connections...`);

      for (const [index, replicaConfig] of replicaConfigs.entries()) {
        try {
          const replicaName = `replica-${index + 1}`;
          
          const sequelize = new Sequelize(replicaConfig.database, replicaConfig.username, replicaConfig.password, {
            host: replicaConfig.host,
            port: replicaConfig.port,
            dialect: replicaConfig.dialect,
            
            // Read-only pool configuration
            pool: {
              max: replicaConfig.pool?.max || 15,
              min: replicaConfig.pool?.min || 1,
              acquire: replicaConfig.pool?.acquire || 60000,
              idle: replicaConfig.pool?.idle || 30000,
              evict: replicaConfig.pool?.evict || 10000
            },
            
            // Read-only mode
            replication: {
              read: [
                { host: replicaConfig.host, port: replicaConfig.port }
              ],
              write: { host: replicaConfig.host, port: replicaConfig.port }
            },
            
            logging: (msg) => {
              if (configManager.isDevelopment()) {
                YachiLogger.debug(`[${replicaName}] ${msg}`);
              }
            },
            
            dialectOptions: {
              readOnlyIntent: true
            }
          });

          // 🛡️ Add connection event handlers
          this.setupConnectionEvents(sequelize, replicaName);

          // 🔍 Test connection
          await this.testConnection(sequelize, replicaName);

          this.replicaConnections.push(sequelize);
          this.connections.set(replicaName, sequelize);
          
          this.connectionStats.successfulConnections++;
          YachiLogger.info(`Replica connection established: ${replicaName}`);

        } catch (error) {
          this.connectionStats.failedConnections++;
          YachiLogger.error(`Failed to initialize replica connection ${index + 1}:`, error);
        }
      }

      YachiLogger.info(`Successfully initialized ${this.replicaConnections.length} replica connections`);

    } catch (error) {
      YachiLogger.error('Failed to initialize replica connections:', error);
    }
  }

  /**
   * 🛡️ Setup connection event handlers
   */
  setupConnectionEvents(sequelize, connectionName) {
    sequelize.addHook('beforeQuery', (options, query) => {
      this.connectionStats.totalQueries++;
      YachiLogger.debug(`[${connectionName}] Executing query: ${query}`);
    });

    sequelize.addHook('afterQuery', (options, query, result) => {
      const executionTime = options.benchmark ? `${options.benchmark}ms` : 'unknown';
      YachiLogger.debug(`[${connectionName}] Query completed in ${executionTime}`);
    });

    sequelize.addHook('queryError', (error, options, query) => {
      this.connectionStats.failedQueries++;
      YachiLogger.error(`[${connectionName}] Query failed:`, {
        error: error.message,
        query: query,
        stack: configManager.isDevelopment() ? error.stack : undefined
      });
    });

    // Connection events
    sequelize.connectionManager.on('connect', () => {
      YachiLogger.debug(`[${connectionName}] Database connected`);
    });

    sequelize.connectionManager.on('disconnect', () => {
      YachiLogger.warn(`[${connectionName}] Database disconnected`);
    });

    sequelize.connectionManager.on('acquire', (connection) => {
      YachiLogger.debug(`[${connectionName}] Connection acquired from pool`);
    });

    sequelize.connectionManager.on('release', (connection) => {
      YachiLogger.debug(`[${connectionName}] Connection released to pool`);
    });

    sequelize.connectionManager.on('destroy', (connection) => {
      YachiLogger.debug(`[${connectionName}] Connection destroyed`);
    });
  }

  /**
   * 🔍 Test database connection
   */
  async testConnection(sequelize, connectionName) {
    try {
      this.connectionStats.connectionAttempts++;
      
      await sequelize.authenticate();
      
      // Test basic query
      await sequelize.query('SELECT 1+1 as result', { 
        type: Sequelize.QueryTypes.SELECT,
        raw: true 
      });
      
      YachiLogger.debug(`[${connectionName}] Connection test successful`);
      return true;

    } catch (error) {
      YachiLogger.error(`[${connectionName}] Connection test failed:`, error);
      throw error;
    }
  }

  /**
   * 🎯 Get database connection for read/write operations
   */
  getConnection(operationType = 'write') {
    try {
      // Always use primary for write operations
      if (operationType === 'write' || !this.primaryConnection) {
        if (!this.primaryConnection) {
          throw new Error('Primary database connection not available');
        }
        return this.primaryConnection;
      }

      // Use replica for read operations if available
      if (operationType === 'read' && this.replicaConnections.length > 0) {
        // Simple round-robin load balancing
        const replicaIndex = this.connectionStats.totalQueries % this.replicaConnections.length;
        return this.replicaConnections[replicaIndex];
      }

      // Fallback to primary
      return this.primaryConnection;

    } catch (error) {
      YachiLogger.error('Failed to get database connection:', error);
      throw error;
    }
  }

  /**
   * 📊 Get connection statistics
   */
  getConnectionStats() {
    const poolStats = {};
    
    for (const [name, connection] of this.connections) {
      const pool = connection.connectionManager.pool;
      poolStats[name] = {
        total: pool.size,
        available: pool.available,
        waiting: pool.waiting,
        acquired: pool.acquired,
        max: pool.max,
        min: pool.min
      };
    }

    return {
      ...this.connectionStats,
      pools: poolStats,
      replicaCount: this.replicaConnections.length,
      primaryAvailable: !!this.primaryConnection,
      replicasAvailable: this.replicaConnections.length
    };
  }

  /**
   * 🩺 Health check for all connections
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: {}
    };

    try {
      // Check primary connection
      if (this.primaryConnection) {
        const primaryHealth = await this.testConnection(this.primaryConnection, 'primary-health-check');
        health.connections.primary = {
          status: primaryHealth ? 'healthy' : 'unhealthy',
          latency: await this.measureConnectionLatency(this.primaryConnection)
        };
      } else {
        health.connections.primary = { status: 'not_connected' };
        health.status = 'unhealthy';
      }

      // Check replica connections
      health.connections.replicas = [];
      for (const [index, replica] of this.replicaConnections.entries()) {
        try {
          const replicaHealth = await this.testConnection(replica, `replica-${index + 1}-health-check`);
          const replicaLatency = await this.measureConnectionLatency(replica);
          
          health.connections.replicas.push({
            name: `replica-${index + 1}`,
            status: replicaHealth ? 'healthy' : 'unhealthy',
            latency: replicaLatency
          });

          if (!replicaHealth) {
            health.status = 'degraded';
          }
        } catch (error) {
          health.connections.replicas.push({
            name: `replica-${index + 1}`,
            status: 'unhealthy',
            error: error.message
          });
          health.status = 'degraded';
        }
      }

      // Add pool statistics
      health.poolStats = this.getConnectionStats().pools;

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
      YachiLogger.error('Database health check failed:', error);
    }

    return health;
  }

  /**
   * ⏱️ Measure connection latency
   */
  async measureConnectionLatency(sequelize) {
    const start = Date.now();
    try {
      await sequelize.query('SELECT 1', { 
        type: Sequelize.QueryTypes.SELECT,
        raw: true 
      });
      return Date.now() - start;
    } catch (error) {
      return -1;
    }
  }

  /**
   * 🔄 Retry mechanism for failed operations
   */
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        YachiLogger.warn(`Database operation attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (this.isConnectionError(error) && attempt < maxRetries) {
          const backoffDelay = delay * Math.pow(2, attempt - 1);
          YachiLogger.info(`Retrying in ${backoffDelay}ms...`);
          await this.sleep(backoffDelay);
          
          // Try to re-establish connection
          await this.reconnectIfNeeded();
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 🔌 Reconnect if connection is lost
   */
  async reconnectIfNeeded() {
    try {
      if (this.primaryConnection) {
        await this.testConnection(this.primaryConnection, 'primary-reconnect-check');
      } else {
        await this.initializePrimaryConnection();
      }
    } catch (error) {
      YachiLogger.error('Failed to reconnect to database:', error);
    }
  }

  /**
   * 🔍 Check if error is a connection error
   */
  isConnectionError(error) {
    const connectionErrors = [
      'SequelizeConnectionError',
      'SequelizeConnectionRefusedError',
      'SequelizeHostNotFoundError',
      'SequelizeHostNotReachableError',
      'SequelizeInvalidConnectionError',
      'SequelizeConnectionTimedOutError',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENOTFOUND'
    ];

    return connectionErrors.some(errorType => 
      error.name === errorType || error.code === errorType || error.message.includes(errorType)
    );
  }

  /**
   * 💤 Sleep utility function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🗑️ Close all database connections
   */
  async closeAllConnections() {
    YachiLogger.info('Closing all database connections...');
    
    const closePromises = [];
    
    for (const [name, connection] of this.connections) {
      closePromises.push(
        connection.close()
          .then(() => {
            YachiLogger.info(`Database connection closed: ${name}`);
          })
          .catch(error => {
            YachiLogger.error(`Error closing database connection ${name}:`, error);
          })
      );
    }

    await Promise.allSettled(closePromises);
    
    this.connections.clear();
    this.primaryConnection = null;
    this.replicaConnections = [];
    
    YachiLogger.info('All database connections closed');
  }

  /**
   * 🔧 Execute database migration
   */
  async runMigrations() {
    try {
      YachiLogger.info('Running database migrations...');
      
      const { Umzug, SequelizeStorage } = require('umzug');
      const sequelize = this.getConnection('write');
      
      const umzug = new Umzug({
        migrations: {
          glob: '../migrations/*.js',
          resolve: ({ name, path, context }) => {
            const migration = require(path);
            return {
              name,
              up: async () => migration.up(context, Sequelize),
              down: async () => migration.down(context, Sequelize)
            };
          }
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger: YachiLogger
      });

      const migrations = await umzug.up();
      YachiLogger.info(`Completed ${migrations.length} migrations`);
      
      return migrations;

    } catch (error) {
      YachiLogger.error('Database migration failed:', error);
      throw error;
    }
  }

  /**
   * 🌱 Execute database seeds
   */
  async runSeeds() {
    try {
      if (!configManager.isDevelopment() && !configManager.isTest()) {
        YachiLogger.warn('Seeds can only run in development or test environment');
        return;
      }

      YachiLogger.info('Running database seeds...');
      
      const sequelize = this.getConnection('write');
      const { readdirSync } = require('fs');
      const { join } = require('path');
      
      const seedsPath = join(__dirname, '../seeders');
      const seedFiles = readdirSync(seedsPath)
        .filter(file => file.endsWith('.js'))
        .sort();

      for (const file of seedFiles) {
        try {
          const seed = require(join(seedsPath, file));
          await seed.up(sequelize.getQueryInterface(), Sequelize);
          YachiLogger.debug(`Seed completed: ${file}`);
        } catch (error) {
          YachiLogger.error(`Seed failed for ${file}:`, error);
          throw error;
        }
      }

      YachiLogger.info(`Completed ${seedFiles.length} seeds`);

    } catch (error) {
      YachiLogger.error('Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 Initialize all database connections
   */
  async initializeAllConnections() {
    try {
      YachiLogger.info('Initializing all database connections...');
      
      await this.initializePrimaryConnection();
      await this.initializeReplicaConnections();
      
      // Run migrations in production, seeds in development
      if (configManager.isProduction()) {
        await this.runMigrations();
      } else if (configManager.isDevelopment()) {
        await this.runMigrations();
        await this.runSeeds();
      }
      
      YachiLogger.info('All database connections initialized successfully');
      
      return {
        primary: this.primaryConnection,
        replicas: this.replicaConnections.length,
        stats: this.getConnectionStats()
      };

    } catch (error) {
      YachiLogger.error('Failed to initialize database connections:', error);
      throw error;
    }
  }
}

// 🚀 Create singleton instance
const dbConnectionManager = new DatabaseConnectionManager();

module.exports = {
  dbConnectionManager,
  Sequelize,
  
  // Utility exports
  getConnection: (operationType) => dbConnectionManager.getConnection(operationType),
  healthCheck: () => dbConnectionManager.healthCheck(),
  getStats: () => dbConnectionManager.getConnectionStats(),
  closeConnections: () => dbConnectionManager.closeAllConnections(),
  withRetry: (operation, maxRetries, delay) => 
    dbConnectionManager.withRetry(operation, maxRetries, delay),
  
  // Initialization
  initialize: () => dbConnectionManager.initializeAllConnections()
};