// Minimal RedisService wrapper used by application and tests
const redisConfig = require('../config/redis');

class RedisService {
  static async initialize() {
    // noop for tests/local
    return redisConfig;
  }

  static async ping() {
    if (redisConfig && typeof redisConfig.ping === 'function') return redisConfig.ping();
    return 'PONG';
  }

  static async get(key) {
    return redisConfig.get ? redisConfig.get(key) : null;
  }

  static async set(key, value, opts) {
    if (redisConfig.set) return redisConfig.set(key, value, opts);
    return true;
  }

  static async del(key) {
    if (redisConfig.del) return redisConfig.del(key);
    return true;
  }

  static async close() {
    if (redisConfig.quit) return redisConfig.quit();
    return true;
  }
}

module.exports = { RedisService };
