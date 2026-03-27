/**
 * Yachi - Enterprise Redis Configuration
 * Advanced Redis Management with Clustering, Sentinel Support, and Performance Optimization
 * @version 1.0.0
 */

const redis = require('redis');
const { Cluster } = require('redis');
const { YachiLogger } = require('../utils/logger');
const { performance } = require('perf_hooks');

/**
 * Enterprise Redis Manager
 * Advanced Redis client management with clustering, sentinel support, and performance optimization
 */
class RedisManager {
  constructor() {
    this.clients = new Map();
    this.clusters = new Map();
    this.monitoring = new Map();
    this.initialized = false;
    
    // Connection statistics
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      totalCommands: 0,
      commandErrors: 0,
      lastHealthCheck: null
    };

    // Default configuration
    this.defaultConfig = {
      // Connection settings
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        tls: process.env.REDIS_TLS === 'true',
        reconnectStrategy: (retries) => this.calculateReconnectDelay(retries),
        connectTimeout: 10000,
        lazyConnect: true
      },
      password: process.env.REDIS_PASSWORD,
      database: 0,
      
      // Performance settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      enableAutoPipelining: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      readOnly: false,
      
      // Monitoring
      monitorCommands: process.env.NODE_ENV === 'development'
    };

    // Redis Cluster configuration
    this.clusterConfig = {
      rootNodes: [
        {
          socket: {
            host: process.env.REDIS_CLUSTER_HOST_1 || 'localhost',
            port: parseInt(process.env.REDIS_CLUSTER_PORT_1) || 6379
          }
        }
      ],
      defaults: {
        ...this.defaultConfig,
        socket: {
          ...this.defaultConfig.socket,
          tls: process.env.REDIS_CLUSTER_TLS === 'true'
        }
      },
      useReplicas: true,
      maxCommandRedirections: 16,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 100,
      retryDelayOnTryAgain: 100
    };

    // Redis Sentinel configuration
    this.sentinelConfig = {
      sentinels: [
        {
          host: process.env.REDIS_SENTINEL_HOST_1 || 'localhost',
          port: parseInt(process.env.REDIS_SENTINEL_PORT_1) || 26379
        }
      ],
      name: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
      password: process.env.REDIS_SENTINEL_PASSWORD,
      sentinelPassword: process.env.REDIS_SENTINEL_AUTH_PASSWORD,
      ...this.defaultConfig
    };
  }

  /**
   * Initialize Redis manager with all configured clients
   */
  async initialize() {
    if (this.initialized) {
      YachiLogger.warn('Redis manager already initialized');
      return true;
    }

    try {
      YachiLogger.info('🚀 Initializing Yachi Redis Manager...');

      // Create specialized clients for different use cases
      await this.createSpecializedClients();

      // Setup monitoring and health checks
      await this.setupMonitoring();

      // Setup performance tracking
      await this.setupPerformanceTracking();

      this.initialized = true;
      this.stats.lastHealthCheck = new Date();

      YachiLogger.info('✅ Redis manager initialized successfully', {
        totalClients: this.clients.size,
        totalClusters: this.clusters.size,
        environment: process.env.NODE_ENV
      });

      return true;

    } catch (error) {
      YachiLogger.error('❌ Redis manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create specialized Redis clients for different use cases
   */
  async createSpecializedClients() {
    const clients = [
      // Primary cache client
      {
        name: 'cache',
        config: {
          database: 0,
          maxRetriesPerRequest: 1,
          socket: { ...this.defaultConfig.socket, connectTimeout: 5000 }
        }
      },

      // Session storage client
      {
        name: 'session',
        config: {
          database: 1,
          maxRetriesPerRequest: 2,
          socket: { ...this.defaultConfig.socket, connectTimeout: 10000 }
        }
      },

      // Real-time pub/sub client
      {
        name: 'pubsub',
        config: {
          database: 2,
          autoResubscribe: true,
          autoResendUnfulfilledCommands: false,
          readOnly: false
        }
      },

      // Rate limiting client
      {
        name: 'rate-limit',
        config: {
          database: 3,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false
        }
      },

      // Search and indexing client
      {
        name: 'search',
        config: {
          database: 4,
          maxRetriesPerRequest: 3
        }
      },

      // Background jobs client
      {
        name: 'jobs',
        config: {
          database: 5,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: true
        }
      },

      // Analytics client
      {
        name: 'analytics',
        config: {
          database: 6,
          maxRetriesPerRequest: 1,
          readOnly: false
        }
      }
    ];

    for (const clientConfig of clients) {
      try {
        await this.createClient(clientConfig.name, clientConfig.config);
        YachiLogger.debug(`✅ Created Redis client: ${clientConfig.name}`);
      } catch (error) {
        YachiLogger.error(`❌ Failed to create Redis client ${clientConfig.name}:`, error);
        
        // For critical clients, throw error
        if (['cache', 'session'].includes(clientConfig.name)) {
          throw error;
        }
      }
    }

    // Create Redis Cluster if enabled
    if (process.env.REDIS_CLUSTER_ENABLED === 'true') {
      await this.createRedisCluster();
    }

    // Create Redis Sentinel if enabled
    if (process.env.REDIS_SENTINEL_ENABLED === 'true') {
      await this.createRedisSentinel();
    }
  }

  /**
   * Create Redis client with enhanced configuration
   */
  async createClient(clientName, customConfig = {}) {
    try {
      const config = { 
        ...this.defaultConfig, 
        ...customConfig,
        name: clientName
      };

      const client = redis.createClient(config);

      // Setup event handlers
      this.setupClientEventHandlers(client, clientName);

      // Connect to Redis
      await client.connect();

      // Verify connection
      await client.ping();

      this.clients.set(clientName, client);
      this.stats.totalConnections++;
      this.stats.activeConnections++;

      YachiLogger.info(`✅ Redis client "${clientName}" connected successfully`);

      return client;

    } catch (error) {
      this.stats.failedConnections++;
      YachiLogger.error(`❌ Failed to create Redis client "${clientName}":`, error);
      throw error;
    }
  }

  /**
   * Create Redis Cluster client
   */
  async createRedisCluster() {
    try {
      const cluster = new Cluster(this.clusterConfig.rootNodes, this.clusterConfig.defaults);

      cluster.on('connect', () => {
        YachiLogger.info('🔗 Redis Cluster connecting...');
      });

      cluster.on('ready', () => {
        YachiLogger.info('✅ Redis Cluster ready');
        this.clusters.set('cluster', cluster);
      });

      cluster.on('error', (err) => {
        YachiLogger.error('❌ Redis Cluster error:', err);
      });

      cluster.on('node error', (err, node) => {
        YachiLogger.warn(`⚠️ Redis Cluster node error (${node.options?.host}:${node.options?.port}):`, err);
      });

      await cluster.connect();
      YachiLogger.info('✅ Redis Cluster connected successfully');

    } catch (error) {
      YachiLogger.error('❌ Redis Cluster connection failed:', error);
      throw error;
    }
  }

  /**
   * Create Redis Sentinel client
   */
  async createRedisSentinel() {
    try {
      const client = redis.createClient(this.sentinelConfig);

      client.on('connect', () => {
        YachiLogger.info('🛡️ Redis Sentinel connecting...');
      });

      client.on('ready', () => {
        YachiLogger.info('✅ Redis Sentinel ready');
        this.clients.set('sentinel', client);
      });

      client.on('error', (err) => {
        YachiLogger.error('❌ Redis Sentinel error:', err);
      });

      await client.connect();
      YachiLogger.info('✅ Redis Sentinel connected successfully');

    } catch (error) {
      YachiLogger.error('❌ Redis Sentinel connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup client event handlers
   */
  setupClientEventHandlers(client, clientName) {
    client.on('connect', () => {
      YachiLogger.debug(`🔗 Redis client "${clientName}" connecting...`);
    });

    client.on('ready', () => {
      YachiLogger.info(`✅ Redis client "${clientName}" ready`);
      this.stats.activeConnections++;
    });

    client.on('error', (err) => {
      YachiLogger.error(`❌ Redis client "${clientName}" error:`, err);
      this.stats.commandErrors++;
    });

    client.on('end', () => {
      YachiLogger.warn(`🔴 Redis client "${clientName}" disconnected`);
      this.stats.activeConnections--;
    });

    client.on('reconnecting', () => {
      YachiLogger.info(`🔄 Redis client "${clientName}" reconnecting...`);
    });

    // Command monitoring (development only)
    if (this.defaultConfig.monitorCommands) {
      client.on('command', (command) => {
        YachiLogger.debug(`📝 Redis command: ${command.name}`, {
          client: clientName,
          command: command.name,
          args: command.args.slice(0, 2) // Log first 2 args only
        });
      });
    }
  }

  /**
   * Setup monitoring and health checks
   */
  async setupMonitoring() {
    // Health check every 30 seconds
    setInterval(async () => {
      await this.performHealthChecks();
    }, 30000);

    // Performance metrics every minute
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 60000);

    YachiLogger.debug('✅ Redis monitoring enabled');
  }

  /**
   * Setup performance tracking
   */
  async setupPerformanceTracking() {
    // Track command execution times
    const originalSendCommand = redis.RedisClient.prototype.sendCommand;
    
    redis.RedisClient.prototype.sendCommand = function(command) {
      const startTime = performance.now();
      this.stats.totalCommands++;
      
      return originalSendCommand.call(this, command).finally(() => {
        const duration = performance.now() - startTime;
        
        // Log slow commands
        if (duration > 100) { // 100ms threshold
          YachiLogger.warn(`🐌 Slow Redis command: ${command.name}`, {
            duration: duration.toFixed(2),
            client: this.options?.name,
            args: command.args.slice(0, 2)
          });
        }
      });
    };
  }

  /**
   * Perform health checks on all clients
   */
  async performHealthChecks() {
    const healthResults = [];

    for (const [name, client] of this.clients) {
      try {
        const startTime = performance.now();
        await client.ping();
        const latency = performance.now() - startTime;

        const info = await client.info();
        const stats = this.parseRedisInfo(info);

        healthResults.push({
          client: name,
          status: 'healthy',
          latency: latency.toFixed(2),
          ...stats
        });

      } catch (error) {
        healthResults.push({
          client: name,
          status: 'unhealthy',
          error: error.message
        });
        
        YachiLogger.error(`❌ Redis health check failed for "${name}":`, error);
      }
    }

    this.stats.lastHealthCheck = new Date();
    
    // Log health summary
    const healthyCount = healthResults.filter(r => r.status === 'healthy').length;
    const totalCount = healthResults.length;

    if (healthyCount < totalCount) {
      YachiLogger.warn(`⚠️ Redis health check: ${healthyCount}/${totalCount} clients healthy`);
    }

    return healthResults;
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      connections: this.stats,
      clients: {}
    };

    for (const [name, client] of this.clients) {
      try {
        const info = await client.info();
        metrics.clients[name] = this.parseRedisInfo(info);
      } catch (error) {
        YachiLogger.error(`❌ Failed to collect metrics for client "${name}":`, error);
      }
    }

    // Store metrics for analytics
    this.monitoring.set('performance_metrics', metrics);

    return metrics;
  }

  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(infoString) {
    const lines = infoString.split('\r\n');
    const sections = {};
    let currentSection = '';

    lines.forEach(line => {
      if (line.startsWith('#')) {
        currentSection = line.slice(2).toLowerCase();
        sections[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (currentSection && sections[currentSection]) {
          sections[currentSection][key] = value;
        }
      }
    });

    return {
      memory: {
        used: sections.memory?.used_memory_human,
        peak: sections.memory?.used_memory_peak_human,
        fragmentation: sections.memory?.mem_fragmentation_ratio
      },
      stats: {
        connected_clients: sections.clients?.connected_clients,
        blocked_clients: sections.clients?.blocked_clients,
        total_commands_processed: sections.stats?.total_commands_processed
      },
      persistence: {
        rdb_last_save_time: sections.persistence?.rdb_last_save_time,
        aof_enabled: sections.persistence?.aof_enabled
      },
      replication: {
        role: sections.replication?.role,
        connected_slaves: sections.replication?.connected_slaves
      }
    };
  }

  /**
   * Calculate reconnect delay with exponential backoff and jitter
   */
  calculateReconnectDelay(retries) {
    const baseDelay = 100; // 100ms base
    const maxDelay = 30000; // 30 seconds max
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, retries), maxDelay);
    const jitter = Math.random() * 100; // 0-100ms jitter
    return exponentialDelay + jitter;
  }

  /**
   * Get Redis client by name
   */
  async getClient(clientName = 'cache') {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = this.clients.get(clientName);
    if (!client) {
      throw new Error(`Redis client "${clientName}" not found`);
    }

    if (!client.isOpen) {
      YachiLogger.warn(`Redis client "${clientName}" is not open, reconnecting...`);
      await client.connect();
    }

    return client;
  }

  /**
   * Execute command with retry logic
   */
  async executeCommand(clientName, command, args = [], options = {}) {
    const { maxRetries = 3, timeout = 5000 } = options;
    const client = await this.getClient(clientName);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        const result = await client[command](...args);
        const duration = performance.now() - startTime;

        this.stats.totalCommands++;

        // Log slow commands
        if (duration > 100) {
          YachiLogger.warn(`🐌 Slow Redis command: ${command}`, {
            client: clientName,
            duration: duration.toFixed(2),
            attempt
          });
        }

        return result;

      } catch (error) {
        YachiLogger.error(`Redis command failed (attempt ${attempt}/${maxRetries}):`, {
          client: clientName,
          command,
          error: error.message
        });

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.calculateReconnectDelay(attempt)));
      }
    }
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown() {
    YachiLogger.info('🔴 Shutting down Redis manager...');

    const shutdownPromises = [];

    // Close all clients
    for (const [name, client] of this.clients) {
      shutdownPromises.push(
        (async () => {
          try {
            if (client.isOpen) {
              await client.quit();
              YachiLogger.debug(`✅ Redis client "${name}" closed`);
            }
          } catch (error) {
            YachiLogger.error(`❌ Error closing Redis client "${name}":`, error);
            await client.disconnect(); // Force disconnect
          }
        })()
      );
    }

    // Close all clusters
    for (const [name, cluster] of this.clusters) {
      shutdownPromises.push(
        (async () => {
          try {
            await cluster.quit();
            YachiLogger.debug(`✅ Redis cluster "${name}" closed`);
          } catch (error) {
            YachiLogger.error(`❌ Error closing Redis cluster "${name}":`, error);
            await cluster.disconnect();
          }
        })()
      );
    }

    await Promise.allSettled(shutdownPromises);
    
    this.clients.clear();
    this.clusters.clear();
    this.initialized = false;

    YachiLogger.info('✅ Redis manager shutdown completed');
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      initialized: this.initialized,
      clientCount: this.clients.size,
      clusterCount: this.clusters.size,
      activeClients: Array.from(this.clients.values()).filter(client => client.isOpen).length
    };
  }

  /**
   * Clear database (development only)
   */
  async clearDatabase(clientName = 'cache', dbIndex = 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database clearance not allowed in production');
    }

    const client = await this.getClient(clientName);
    await client.select(dbIndex);
    await client.flushDb();
    
    YachiLogger.info(`🧹 Cleared Redis database ${dbIndex} for client "${clientName}"`);
  }
}

// Create singleton instance
const redisManager = new RedisManager();

/**
 * Redis Utility Functions
 */
const redisUtils = {
  // Key generation with namespacing
  generateKey: (namespace, ...parts) => {
    const validParts = parts.filter(part => part != null && part !== '');
    return `yachi:${namespace}:${validParts.join(':')}`;
  },

  // Safe JSON serialization
  safeStringify: (data) => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      YachiLogger.error('JSON stringify error:', error);
      return 'null';
    }
  },

  // Safe JSON parsing
  safeParse: (data) => {
    if (data == null) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      YachiLogger.error('JSON parse error:', error);
      return data;
    }
  },

  // Set with expiry and retry
  setWithRetry: async (client, key, value, options = {}) => {
    const { ttl = 3600, maxRetries = 3 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const serializedValue = redisUtils.safeStringify(value);
        if (ttl > 0) {
          await client.setEx(key, ttl, serializedValue);
        } else {
          await client.set(key, serializedValue);
        }
        return true;
      } catch (error) {
        YachiLogger.warn(`Redis set attempt ${attempt} failed for key "${key}":`, error);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
    return false;
  },

  // Get with fallback
  getWithFallback: async (client, key, fallbackFn = null, options = {}) => {
    const { ttl = 3600, refresh = false } = options;
    
    try {
      if (!refresh) {
        const cached = await client.get(key);
        if (cached !== null) {
          return redisUtils.safeParse(cached);
        }
      }

      if (fallbackFn && typeof fallbackFn === 'function') {
        const freshData = await fallbackFn();
        if (freshData !== null && freshData !== undefined) {
          await redisUtils.setWithRetry(client, key, freshData, { ttl });
          return freshData;
        }
      }

      return null;
    } catch (error) {
      YachiLogger.error(`Redis get failed for key "${key}":`, error);
      if (fallbackFn) {
        try {
          return await fallbackFn();
        } catch (fallbackError) {
          YachiLogger.error('Fallback function failed:', fallbackError);
        }
      }
      throw error;
    }
  },

  // Delete keys by pattern
  deleteByPattern: async (client, pattern) => {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        const pipeline = client.multi();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
        YachiLogger.info(`🗑️ Deleted ${keys.length} keys matching: ${pattern}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      YachiLogger.error(`Error deleting pattern "${pattern}":`, error);
      throw error;
    }
  },

  // Atomic increment with TTL
  atomicIncrement: async (client, key, ttl = 3600) => {
    const luaScript = `
      local current = redis.call('GET', KEYS[1])
      if current then
        return redis.call('INCR', KEYS[1])
      else
        redis.call('SETEX', KEYS[1], ARGV[1], 1)
        return 1
      end
    `;

    try {
      const result = await client.eval(luaScript, {
        keys: [key],
        arguments: [ttl.toString()]
      });
      return parseInt(result);
    } catch (error) {
      YachiLogger.error(`Atomic increment failed for key "${key}":`, error);
      throw error;
    }
  }
};

// Export configuration and utilities
module.exports = {
  redisManager,
  redisUtils,
  
  // Quick access methods
  getClient: (name = 'cache') => redisManager.getClient(name),
  executeCommand: (clientName, command, args, options) => 
    redisManager.executeCommand(clientName, command, args, options),
  getStats: () => redisManager.getStats(),
  healthCheck: () => redisManager.performHealthChecks(),
  
  // Configuration
  redisConfig: redisManager.defaultConfig,
  clusterConfig: redisManager.clusterConfig,
  sentinelConfig: redisManager.sentinelConfig
};

// Auto-initialize in non-test environments
if (process.env.NODE_ENV !== 'test') {
  redisManager.initialize().catch(console.error);
}

// When running tests, export a lightweight mock-friendly interface so tests
// can set `.get.mockResolvedValue(...)` etc. without initializing real clients.
if (process.env.NODE_ENV === 'test') {
  // If Jest is available, use jest.fn to create mockable functions.
  const makeMock = (resolveWith = null) => {
    if (typeof jest !== 'undefined' && typeof jest.fn === 'function') {
      const fn = jest.fn();
      fn.mockResolvedValue(resolveWith);
      return fn;
    }
    return async () => resolveWith;
  };

  module.exports = {
    redisManager: {
      initialize: async () => true,
      getClient: async () => ({ get: makeMock(null), set: makeMock(true), del: makeMock(true) })
    },
    redisUtils: {
      generateKey: (ns, ...parts) => `yachi:${ns}:${parts.join(':')}`,
      safeStringify: (d) => JSON.stringify(d),
      safeParse: (d) => { try { return JSON.parse(d); } catch { return d; } }
    },
    getClient: async (name = 'cache') => ({ get: makeMock(null), set: makeMock(true), del: makeMock(true) }),
    executeCommand: async () => null,
    getStats: () => ({}),
    healthCheck: async () => [],
    redisConfig: {},
    clusterConfig: {},
    sentinelConfig: {}
  };
}