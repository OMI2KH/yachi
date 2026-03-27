// Minimal in-memory cache and circuit breaker stub for tests
class RedisManager {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async setex(key, ttl, value) {
    this.store.set(key, value);
    // ignore ttl for tests
  }

  async del(key) {
    this.store.delete(key);
  }

  async rPush() {
    return true;
  }

  async lTrim() {
    return true;
  }

  isHealthy() {
    return true;
  }
}

class CacheService {
  constructor() {
    this.redis = new RedisManager();
    this.mem = new Map();
  }

  async get(key) {
    if (this.mem.has(key)) return this.mem.get(key);
    return this.redis.get(key);
  }

  async set(key, value, ttl) {
    this.mem.set(key, value);
    return true;
  }

  async getWithFallback(key, fn, opts = {}) {
    const existing = await this.get(key);
    if (existing) return existing;
    const value = await fn();
    await this.set(key, value, opts.ttl);
    return value;
  }
}

class CircuitBreaker {
  constructor() {
    this.open = false;
  }

  async call(fn) {
    if (this.open) throw new Error('Circuit open');
    try {
      return await fn();
    } catch (e) {
      this.open = true;
      throw e;
    }
  }
}

module.exports = {
  RedisManager: new RedisManager(),
  CacheService: new CacheService(),
  CircuitBreaker: CircuitBreaker
};
