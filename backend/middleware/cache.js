// middleware/cache.js
const redis = require('../config/redis');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const logger = require('../utils/logger');

class CacheMiddleware {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
    this.cacheConfig = this.loadCacheConfig();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    this.startStatsTracking();
  }

  /**
   * Load cache configuration
   */
  loadCacheConfig() {
    return {
      // TTL configurations (in seconds)
      ttl: {
        short: 60, // 1 minute
        medium: 300, // 5 minutes
        long: 3600, // 1 hour
        veryLong: 86400, // 24 hours
        permanent: 604800 // 7 days
      },

      // Cache key patterns
      patterns: {
        user: 'user:{id}',
        userProfile: 'user:profile:{id}',
        worker: 'worker:{id}',
        workerProfile: 'worker:profile:{id}',
        service: 'service:{id}',
        services: 'services:{category}:{page}',
        search: 'search:{query}:{filters}',
        location: 'location:{lat}:{lng}:{radius}',
        analytics: 'analytics:{type}:{date}',
        config: 'config:{key}'
      },

      // Cache groups for bulk operations
      groups: {
        user: ['user:', 'user:profile:'],
        worker: ['worker:', 'worker:profile:', 'worker:stats:'],
        service: ['service:', 'services:'],
        search: ['search:'],
        location: ['location:']
      },

      // Endpoint cache configurations
      endpoints: {
        '/api/users/:id': { ttl: 'medium', key: 'user:{id}' },
        '/api/workers/:id': { ttl: 'long', key: 'worker:{id}' },
        '/api/services/:id': { ttl: 'medium', key: 'service:{id}' },
        '/api/search/workers': { ttl: 'short', key: 'search:workers:{query}' },
        '/api/search/services': { ttl: 'short', key: 'search:services:{query}' },
        '/api/locations/nearby': { ttl: 'medium', key: 'location:{lat}:{lng}:{radius}' }
      }
    };
  }

  /**
   * Start cache statistics tracking
   */
  startStatsTracking() {
    // Reset stats every hour
    setInterval(() => {
      this.logCacheStats();
      this.resetCacheStats();
    }, 3600000);
  }

  /**
   * Main cache middleware
   */
  cacheMiddleware(options = {}) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests or when explicitly disabled
      if (req.method !== 'GET' || req.headers['x-no-cache'] === 'true') {
        return next();
      }

      // Skip caching for authenticated user-specific data unless explicitly allowed
      if (req.user && !options.cacheAuthenticated) {
        return next();
      }

      try {
        const cacheKey = this.generateCacheKey(req, options);
        const cachedData = await this.get(cacheKey);

        if (cachedData !== null) {
          // Cache hit - return cached data
          this.cacheStats.hits++;
          
          const data = JSON.parse(cachedData);
          
          // Set cache headers
          this.setCacheHeaders(res, options.ttl);
          
          logger.debug('Cache hit', {
            key: cacheKey,
            endpoint: req.path,
            userId: req.user?.userId
          });

          return res.json({
            ...data,
            _cached: true,
            _cachedAt: new Date().toISOString()
          });
        }

        // Cache miss - proceed with request
        this.cacheStats.misses++;
        
        // Store original res.json method
        const originalJson = res.json;
        
        // Override res.json to capture response data
        res.json = (body) => {
          // Restore original method
          res.json = originalJson;
          
          // Cache the response if successful
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.set(cacheKey, body, this.getTTL(options.ttl))
              .catch(error => logger.error('Cache set error:', error));
          }
          
          // Send original response
          return originalJson.call(res, body);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        // On error, proceed without caching
        next();
      }
    };
  }

  /**
   * Generate cache key from request
   */
  generateCacheKey(req, options) {
    // Use custom key generator if provided
    if (options.keyGenerator) {
      return options.keyGenerator(req);
    }

    // Use endpoint configuration
    const endpointConfig = this.getEndpointConfig(req.path);
    if (endpointConfig) {
      return this.buildKeyFromPattern(endpointConfig.key, req);
    }

    // Default key generation
    const keyParts = [
      req.path,
      JSON.stringify(req.query),
      req.user?.userId || 'anonymous'
    ];

    return `cache:${Buffer.from(keyParts.join('|')).toString('base64')}`;
  }

  /**
   * Get endpoint-specific cache configuration
   */
  getEndpointConfig(path) {
    for (const [endpoint, config] of Object.entries(this.cacheConfig.endpoints)) {
      const pattern = new RegExp('^' + endpoint.replace(/:\w+/g, '([^/]+)') + '$');
      if (pattern.test(path)) {
        return config;
      }
    }
    return null;
  }

  /**
   * Build cache key from pattern
   */
  buildKeyFromPattern(pattern, req) {
    let key = pattern;
    
    // Replace path parameters
    const params = req.params;
    for (const [param, value] of Object.entries(params)) {
      key = key.replace(`{${param}}`, value);
    }

    // Replace query parameters
    const query = req.query;
    for (const [param, value] of Object.entries(query)) {
      key = key.replace(`{${param}}`, Array.isArray(value) ? value.join(',') : value);
    }

    // Add user context if needed
    if (req.user && key.includes('{user}')) {
      key = key.replace('{user}', req.user.userId);
    }

    return key;
  }

  /**
   * Get TTL value
   */
  getTTL(ttlOption) {
    if (typeof ttlOption === 'number') {
      return ttlOption;
    }

    return this.cacheConfig.ttl[ttlOption] || this.defaultTTL;
  }

  /**
   * Set cache headers in response
   */
  setCacheHeaders(res, ttlOption) {
    const ttl = this.getTTL(ttlOption);
    
    res.set({
      'Cache-Control': `public, max-age=${ttl}`,
      'X-Cache': 'HIT',
      'X-Cache-TTL': ttl.toString()
    });
  }

  /**
   * Distributed lock middleware
   */
  distributedLockMiddleware(options = {}) {
    return async (req, res, next) => {
      const lockKey = `lock:${req.path}:${req.user?.userId || 'anonymous'}`;
      const lockTTL = options.ttl || 30; // 30 seconds default
      
      try {
        // Try to acquire lock
        const acquired = await this.acquireLock(lockKey, lockTTL);
        
        if (!acquired) {
          return res.status(429).json({
            success: false,
            message: 'Operation in progress, please try again later',
            code: 'OPERATION_IN_PROGRESS'
          });
        }

        // Store lock key in request for cleanup
        req._lockKey = lockKey;

        next();
      } catch (error) {
        logger.error('Distributed lock error:', error);
        next();
      }
    };
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(key, ttl = 30) {
    const lockValue = Date.now().toString();
    
    const result = await redis.set(key, lockValue, 'NX', 'EX', ttl);
    return result === 'OK';
  }

  /**
   * Release distributed lock
   */
  async releaseLock(key) {
    await redis.del(key);
  }

  /**
   * Cache invalidation middleware
   */
  cacheInvalidationMiddleware(options = {}) {
    return async (req, res, next) => {
      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to handle cache invalidation
      res.json = async (body) => {
        // Restore original method
        res.json = originalJson;

        // Invalidate cache if request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            await this.invalidateCache(req, options);
          } catch (error) {
            logger.error('Cache invalidation error:', error);
          }
        }

        // Send original response
        return originalJson.call(res, body);
      };

      next();
    };
  }

  /**
   * Invalidate cache based on request
   */
  async invalidateCache(req, options) {
    const invalidationPatterns = this.getInvalidationPatterns(req, options);
    
    for (const pattern of invalidationPatterns) {
      await this.deleteByPattern(pattern);
    }

    logger.debug('Cache invalidated', {
      patterns: invalidationPatterns,
      endpoint: req.path,
      method: req.method,
      userId: req.user?.userId
    });
  }

  /**
   * Get cache invalidation patterns for request
   */
  getInvalidationPatterns(req, options) {
    const patterns = [];

    // User-related cache invalidation
    if (req.user) {
      patterns.push(`user:${req.user.userId}*`);
      patterns.push(`user:profile:${req.user.userId}*`);
    }

    // Endpoint-specific invalidation
    switch (req.path) {
      case '/api/users/:id':
      case '/api/users':
        patterns.push('user:*');
        patterns.push('user:profile:*');
        break;
        
      case '/api/workers/:id':
      case '/api/workers':
        patterns.push('worker:*');
        patterns.push('worker:profile:*');
        patterns.push('worker:stats:*');
        break;
        
      case '/api/services/:id':
      case '/api/services':
        patterns.push('service:*');
        patterns.push('services:*');
        break;
        
      case '/api/search/workers':
        patterns.push('search:workers:*');
        break;
        
      case '/api/search/services':
        patterns.push('search:services:*');
        break;
    }

    // Add custom patterns from options
    if (options.patterns) {
      patterns.push(...options.patterns);
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Rate limiting with cache middleware
   */
  rateLimitCacheMiddleware(limit = 100, windowMs = 900000) { // 100 requests per 15 minutes
    return async (req, res, next) => {
      const identifier = req.user?.userId || this.getClientIP(req);
      const key = `rate_limit:${req.path}:${identifier}`;
      
      try {
        const current = await this.incrementCounter(key, windowMs);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': Math.max(0, limit - current.count).toString(),
          'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString()
        });

        if (current.count > limit) {
          return res.status(429).json({
            success: false,
            message: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((windowMs - (Date.now() - current.resetTime)) / 1000)
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limit cache error:', error);
        next();
      }
    };
  }

  /**
   * Increment counter with window
   */
  async incrementCounter(key, windowMs) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const counterKey = `${key}:${windowStart}`;
    
    const count = await redis.incr(counterKey);
    
    // Set expiry if this is the first increment
    if (count === 1) {
      await redis.expire(counterKey, Math.ceil(windowMs / 1000));
    }

    return {
      count,
      resetTime: windowStart + windowMs
    };
  }

  /**
   * Session cache middleware
   */
  sessionCacheMiddleware() {
    return async (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const sessionKey = `session:${req.user.userId}`;
      
      try {
        // Try to get session from cache
        const cachedSession = await this.get(sessionKey);
        
        if (cachedSession) {
          req.session = JSON.parse(cachedSession);
          req.session._cached = true;
        } else {
          // Session not in cache, will be set by session middleware
          req.session = {};
        }

        // Override res.end to cache session
        const originalEnd = res.end;
        res.end = async (...args) => {
          if (req.session && !req.session._cached) {
            await this.set(sessionKey, req.session, 3600); // Cache for 1 hour
          }
          originalEnd.apply(res, args);
        };

        next();
      } catch (error) {
        logger.error('Session cache error:', error);
        next();
      }
    };
  }

  /**
   * Database query cache middleware
   */
  queryCacheMiddleware(options = {}) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `query:${req.path}:${JSON.stringify(req.query)}`;
      
      try {
        const cachedResult = await this.get(cacheKey);
        
        if (cachedResult) {
          req.cachedQuery = JSON.parse(cachedResult);
          req.cachedQuery._cached = true;
        }

        next();
      } catch (error) {
        logger.error('Query cache error:', error);
        next();
      }
    };
  }

  /**
   * Cache warming middleware
   */
  cacheWarmingMiddleware(patterns = []) {
    return async (req, res, next) => {
      // This would typically run in background jobs
      // For middleware, we can warm cache for specific endpoints
      
      if (patterns.includes(req.path)) {
        // Warm cache in background
        this.warmCache(req.path, req.query)
          .catch(error => logger.error('Cache warming error:', error));
      }

      next();
    };
  }

  /**
   * Warm cache for specific data
   */
  async warmCache(endpoint, query = {}) {
    // Implementation would depend on specific data to warm
    // This is a placeholder for actual cache warming logic
    logger.debug('Cache warming initiated', { endpoint, query });
  }

  /**
   * Basic Cache Operations
   */

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const value = await redis.get(key);
      return value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      this.cacheStats.sets++;
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key) {
    try {
      await redis.del(key);
      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async deleteByPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        this.cacheStats.deletes += keys.length;
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache delete by pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget(keys) {
    try {
      const values = await redis.mget(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return [];
    }
  }

  /**
   * Set multiple keys
   */
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      const multi = redis.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        multi.setex(key, ttl, serializedValue);
      }
      
      await multi.exec();
      this.cacheStats.sets += Object.keys(keyValuePairs).length;
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Utility Methods
   */

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
  }

  /**
   * Log cache statistics
   */
  logCacheStats() {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
    
    logger.info('Cache statistics', {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: `${hitRate.toFixed(2)}%`,
      sets: this.cacheStats.sets,
      deletes: this.cacheStats.deletes
    });

    // Track in analytics
    YachiAnalytics.trackCacheStats({
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate,
      sets: this.cacheStats.sets,
      deletes: this.cacheStats.deletes,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Get cache information
   */
  async getCacheInfo() {
    try {
      const info = await redis.info();
      const keys = await redis.keys('*');
      
      return {
        redisInfo: info,
        totalKeys: keys.length,
        stats: { ...this.cacheStats },
        memoryUsage: await this.getMemoryUsage()
      };
    } catch (error) {
      logger.error('Get cache info error:', error);
      return null;
    }
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage() {
    try {
      const info = await redis.info('memory');
      const lines = info.split('\r\n');
      const memoryLine = lines.find(line => line.startsWith('used_memory:'));
      return memoryLine ? memoryLine.split(':')[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll() {
    try {
      await redis.flushdb();
      logger.warn('Cache cleared completely');
      return true;
    } catch (error) {
      logger.error('Clear all cache error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await redis.ping();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// Create singleton instance
const cacheMiddleware = new CacheMiddleware();

// Export middleware functions
module.exports = {
  // Main cache middleware
  cache: (options) => cacheMiddleware.cacheMiddleware(options),
  
  // Distributed locking
  distributedLock: (options) => cacheMiddleware.distributedLockMiddleware(options),
  
  // Cache invalidation
  invalidateCache: (options) => cacheMiddleware.cacheInvalidationMiddleware(options),
  
  // Rate limiting with cache
  rateLimitCache: (limit, windowMs) => cacheMiddleware.rateLimitCacheMiddleware(limit, windowMs),
  
  // Session caching
  sessionCache: () => cacheMiddleware.sessionCacheMiddleware(),
  
  // Query caching
  queryCache: (options) => cacheMiddleware.queryCacheMiddleware(options),
  
  // Cache warming
  warmCache: (patterns) => cacheMiddleware.cacheWarmingMiddleware(patterns),
  
  // Basic cache operations
  get: (key) => cacheMiddleware.get(key),
  set: (key, value, ttl) => cacheMiddleware.set(key, value, ttl),
  delete: (key) => cacheMiddleware.delete(key),
  deleteByPattern: (pattern) => cacheMiddleware.deleteByPattern(pattern),
  exists: (key) => cacheMiddleware.exists(key),
  mget: (keys) => cacheMiddleware.mget(keys),
  mset: (keyValuePairs, ttl) => cacheMiddleware.mset(keyValuePairs, ttl),
  
  // Utility functions
  getCacheInfo: () => cacheMiddleware.getCacheInfo(),
  healthCheck: () => cacheMiddleware.healthCheck(),
  clearAll: () => cacheMiddleware.clearAll(),
  
  // Middleware instance for advanced usage
  cacheMiddleware
};