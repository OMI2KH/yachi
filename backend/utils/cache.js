const redis = require('redis');
const { compress, decompress } = require('lz-string');
const { performance } = require('perf_hooks');

class RedisService {
  static client = null;
  static clusterClient = null;
  static isClusterMode = process.env.REDIS_CLUSTER === 'true';
  static compressionEnabled = process.env.REDIS_COMPRESSION === 'true';
  static metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    compressionSavings: 0
  };

  // 🚀 ENHANCED INITIALIZATION
  static async initialize() {
    try {
      console.log('🔄 Initializing Redis Service...');
      
      const config = this.getRedisConfig();
      
      if (this.isClusterMode) {
        await this.initializeCluster(config);
      } else {
        await this.initializeStandalone(config);
      }

      await this.setupEventHandlers();
      await this.performHealthCheck();
      
      console.log('✅ Redis Service initialized successfully');
      console.log(`🎯 Mode: ${this.isClusterMode ? 'Cluster' : 'Standalone'}`);
      console.log(`🔧 Compression: ${this.compressionEnabled ? 'Enabled' : 'Disabled'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      throw error;
    }
  }

  // 🎯 CONFIGURATION MANAGEMENT
  static getRedisConfig() {
    const baseConfig = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        reconnectStrategy: (retries) => {
          console.log(`🔄 Redis reconnecting attempt ${retries}`);
          return Math.min(retries * 100, 5000);
        },
        connectTimeout: 10000,
        lazyConnect: true
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB) || 0
    };

    // Production optimizations
    if (process.env.NODE_ENV === 'production') {
      baseConfig.socket.keepAlive = 5000;
      baseConfig.socket.noDelay = true;
      baseConfig.socket.tls = process.env.REDIS_TLS === 'true';
    }

    return baseConfig;
  }

  // 🏗️ CLUSTER INITIALIZATION
  static async initializeCluster(config) {
    try {
      console.log('🏗️ Initializing Redis Cluster...');
      
      const clusterConfig = {
        rootNodes: [{
          socket: config.socket
        }],
        defaults: {
          socket: config.socket,
          password: config.password
        }
      };

      this.client = redis.createCluster(clusterConfig);
      
      await this.client.connect();
      console.log('✅ Redis Cluster connected successfully');
    } catch (error) {
      console.error('❌ Redis Cluster connection failed:', error);
      throw error;
    }
  }

  // 🏗️ STANDALONE INITIALIZATION
  static async initializeStandalone(config) {
    try {
      console.log('🏗️ Initializing Redis Standalone...');
      
      this.client = redis.createClient(config);
      await this.setupStandaloneEventHandlers();
      await this.client.connect();
      
      console.log('✅ Redis Standalone connected successfully');
    } catch (error) {
      console.error('❌ Redis Standalone connection failed:', error);
      throw error;
    }
  }

  // 🎯 EVENT HANDLERS
  static async setupEventHandlers() {
    this.client.on('error', (err) => {
      this.metrics.errors++;
      console.error('❌ Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('🔗 Redis connecting...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready for commands');
    });

    this.client.on('end', () => {
      console.log('🔴 Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  static async setupStandaloneEventHandlers() {
    this.client.on('error', (err) => {
      this.metrics.errors++;
      console.error('❌ Redis Standalone Error:', err);
    });

    this.client.on('connect', () => {
      console.log('🔗 Redis Standalone connecting...');
    });
  }

  // 🚀 CORE CACHE OPERATIONS - ENHANCED
  static async get(key, options = {}) {
    const startTime = performance.now();
    
    try {
      if (!this.client || !await this.isHealthy()) {
        this.metrics.misses++;
        return options.defaultValue !== undefined ? options.defaultValue : null;
      }

      let value = await this.client.get(key);

      if (value === null) {
        this.metrics.misses++;
        return options.defaultValue !== undefined ? options.defaultValue : null;
      }

      // Handle compression
      if (this.compressionEnabled && options.decompress !== false) {
        value = this.decompressData(value);
      }

      // Handle JSON parsing
      if (options.parseJSON !== false) {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not JSON
        }
      }

      this.metrics.hits++;
      const duration = performance.now() - startTime;
      
      // Log slow queries
      if (duration > 100) {
        console.warn(`🐌 Slow cache get: ${key} took ${duration.toFixed(2)}ms`);
      }

      return value;

    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache get error for key ${key}:`, error);
      return options.defaultValue !== undefined ? options.defaultValue : null;
    }
  }

  static async set(key, value, options = {}) {
    const startTime = performance.now();
    
    try {
      if (!this.client || !await this.isHealthy()) {
        return false;
      }

      let processedValue = value;
      const originalSize = JSON.stringify(value).length;

      // Handle JSON stringification
      if (options.stringifyJSON !== false && typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }

      // Handle compression
      if (this.compressionEnabled && options.compress !== false) {
        processedValue = this.compressData(processedValue);
        const compressedSize = processedValue.length;
        this.metrics.compressionSavings += (originalSize - compressedSize);
      }

      const expiration = options.expiry || options.expiration || 3600; // Default 1 hour
      const setOptions = {};

      if (expiration > 0) {
        setOptions.EX = expiration;
      }

      if (options.nx) {
        setOptions.NX = true;
      }

      if (options.xx) {
        setOptions.XX = true;
      }

      const result = await this.client.set(key, processedValue, setOptions);
      this.metrics.sets++;
      
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`🐌 Slow cache set: ${key} took ${duration.toFixed(2)}ms`);
      }

      return result === 'OK';

    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  static async del(key) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return false;
      }
      
      const result = await this.client.del(key);
      this.metrics.deletes++;
      return result > 0;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  // 🚀 BATCH OPERATIONS
  static async mget(keys, options = {}) {
    try {
      if (!this.client || !await this.isHealthy() || !keys.length) {
        return keys.map(() => options.defaultValue !== undefined ? options.defaultValue : null);
      }

      const values = await this.client.mGet(keys);
      
      return values.map(value => {
        if (value === null) {
          this.metrics.misses++;
          return options.defaultValue !== undefined ? options.defaultValue : null;
        }

        if (this.compressionEnabled && options.decompress !== false) {
          value = this.decompressData(value);
        }

        if (options.parseJSON !== false) {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if not JSON
          }
        }

        this.metrics.hits++;
        return value;
      });

    } catch (error) {
      this.metrics.errors++;
      console.error('Cache mget error:', error);
      return keys.map(() => options.defaultValue !== undefined ? options.defaultValue : null);
    }
  }

  static async mset(keyValuePairs, options = {}) {
    try {
      if (!this.client || !await this.isHealthy() || !keyValuePairs.length) {
        return false;
      }

      const pipeline = [];
      
      for (const [key, value] of keyValuePairs) {
        let processedValue = value;

        if (options.stringifyJSON !== false && typeof value === 'object') {
          processedValue = JSON.stringify(value);
        }

        if (this.compressionEnabled && options.compress !== false) {
          processedValue = this.compressData(processedValue);
        }

        const setOptions = ['set', key, processedValue];
        
        if (options.expiry || options.expiration) {
          setOptions.push('EX', options.expiry || options.expiration);
        }

        pipeline.push(setOptions);
      }

      await this.client.multi(pipeline).exec();
      this.metrics.sets += keyValuePairs.length;
      
      return true;

    } catch (error) {
      this.metrics.errors++;
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // 🎯 ADVANCED CACHE PATTERNS
  static async getOrSet(key, fetchData, options = {}) {
    // Try to get from cache first
    const cached = await this.get(key, options);
    
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchData();
    
    // Store in cache
    await this.set(key, freshData, options);
    
    return freshData;
  }

  static async exists(key) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return false;
      }
      return await this.client.exists(key) === 1;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  static async expire(key, seconds) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return false;
      }
      return await this.client.expire(key, seconds);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  static async ttl(key) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return -2; // Key doesn't exist
      }
      return await this.client.ttl(key);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  // 🔍 PATTERN-BASED OPERATIONS
  static async deletePattern(pattern) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return 0;
      }

      let deletedCount = 0;

      if (this.isClusterMode) {
        // For cluster mode, we need to scan each node
        const masters = this.client.masters;
        for (const master of masters) {
          const client = await master.client;
          const keys = await this.scanKeys(client, pattern);
          if (keys.length > 0) {
            const result = await client.del(keys);
            deletedCount += result;
          }
        }
      } else {
        // For standalone
        const keys = await this.scanKeys(this.client, pattern);
        if (keys.length > 0) {
          const result = await this.client.del(keys);
          deletedCount += result;
        }
      }

      this.metrics.deletes += deletedCount;
      return deletedCount;

    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  static async scanKeys(client, pattern, count = 100) {
    const keys = [];
    let cursor = 0;

    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: count
      });
      
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys;
  }

  // 📈 COUNTERS & INCREMENTS
  static async increment(key, by = 1) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return null;
      }
      return await this.client.incrBy(key, by);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  static async decrement(key, by = 1) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return null;
      }
      return await this.client.decrBy(key, by);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache decrement error for key ${key}:`, error);
      return null;
    }
  }

  // 🏆 LEADERBOARD & SORTED SETS
  static async zAdd(key, score, member) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return false;
      }
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      this.metrics.errors++;
      console.error(`Sorted set add error for key ${key}:`, error);
      return false;
    }
  }

  static async zRange(key, start, stop, options = {}) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return [];
      }
      return await this.client.zRange(key, start, stop, options);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Sorted set range error for key ${key}:`, error);
      return [];
    }
  }

  static async zRevRange(key, start, stop, options = {}) {
    try {
      if (!this.client || !await this.isHealthy()) {
        return [];
      }
      return await this.client.zRevRange(key, start, stop, options);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Sorted set reverse range error for key ${key}:`, error);
      return [];
    }
  }

  // 📊 COMPRESSION UTILITIES
  static compressData(data) {
    try {
      return compress(data);
    } catch (error) {
      console.error('Compression error:', error);
      return data; // Return original data if compression fails
    }
  }

  static decompressData(data) {
    try {
      return decompress(data);
    } catch (error) {
      console.error('Decompression error:', error);
      return data; // Return original data if decompression fails
    }
  }

  // 🩺 HEALTH & MONITORING
  static async isHealthy() {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  static async performHealthCheck() {
    try {
      await this.client.ping();
      console.log('❤️ Redis health check passed');
      return true;
    } catch (error) {
      console.error('💔 Redis health check failed:', error);
      return false;
    }
  }

  static async getStatus() {
    try {
      const health = await this.isHealthy();
      const info = health ? await this.client.info() : null;
      
      return {
        status: health ? 'OK' : 'ERROR',
        mode: this.isClusterMode ? 'cluster' : 'standalone',
        compression: this.compressionEnabled,
        metrics: { ...this.metrics },
        info: health ? this.parseRedisInfo(info) : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  static parseRedisInfo(infoString) {
    const info = {};
    const lines = infoString.split('\r\n');
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          info[key] = value;
        }
      }
    }
    
    return info;
  }

  static getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.metrics.hits + this.metrics.misses > 0 ? 
        (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 : 0,
      compressionRatio: this.metrics.compressionSavings > 0 ? 
        (this.metrics.compressionSavings / (this.metrics.compressionSavings + this.metrics.sets)) * 100 : 0
    };
  }

  static resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      compressionSavings: 0
    };
  }

  // 🎯 YACHI-SPECIFIC CACHE HELPERS
  static async cacheWorkerProfile(workerId, profileData, expiration = 3600) {
    const key = `worker:profile:${workerId}`;
    return await this.set(key, profileData, { expiration });
  }

  static async getWorkerProfile(workerId) {
    const key = `worker:profile:${workerId}`;
    return await this.get(key);
  }

  static async cacheWorkerSearch(params, results, expiration = 1800) {
    const key = `worker:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`;
    return await this.set(key, results, { expiration });
  }

  static async getWorkerSearch(params) {
    const key = `worker:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`;
    return await this.get(key);
  }

  static async clearWorkerCaches(workerId) {
    const patterns = [
      `worker:profile:${workerId}`,
      `worker:verification:${workerId}`,
      `worker:stats:${workerId}`,
      `worker:portfolio:${workerId}`,
      `worker:dashboard:${workerId}`,
      `worker:search:*` // Clear all search caches
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deletePattern(pattern);
    }

    console.log(`🧹 Cleared ${totalDeleted} cache entries for worker ${workerId}`);
    return totalDeleted;
  }

  // 🎯 RATE LIMITING HELPERS
  static async checkRateLimit(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old entries
    await this.client.zRemRangeByScore(key, 0, windowStart);
    
    // Get current count
    const currentCount = await this.client.zCard(key);
    
    if (currentCount < limit) {
      // Add new entry
      await this.client.zAdd(key, { score: now, value: now.toString() });
      
      // Set expiry
      await this.client.expire(key, Math.ceil(windowMs / 1000));
      
      return { allowed: true, remaining: limit - currentCount - 1 };
    }
    
    return { allowed: false, remaining: 0 };
  }

  // 🚀 CLEANUP
  static async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        console.log('🔴 Redis client disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }
  }
}

// 🎯 COMPATIBILITY LAYER (for existing code)
const legacyRedis = {
  get: async (key) => {
    return await RedisService.get(key);
  },
  set: async (key, value, expiry) => {
    return await RedisService.set(key, value, { expiration: expiry });
  },
  del: async (key) => {
    return await RedisService.del(key);
  }
};

module.exports = {
  // Enhanced service
  RedisService,
  
  // Legacy compatibility
  ...legacyRedis,
  
  // Utility exports
  initializeRedis: RedisService.initialize,
  getRedisStatus: RedisService.getStatus,
  getRedisMetrics: RedisService.getMetrics,
  clearWorkerCaches: RedisService.clearWorkerCaches
};
