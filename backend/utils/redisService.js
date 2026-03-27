class RedisService {
  static isHealthy() {
    return true;
  }

  static async rPush(key, value) {
    return true;
  }

  static async lTrim(key, start, stop) {
    return true;
  }

  static async get(key) {
    return null;
  }

  static async set(key, value, ttl) {
    return true;
  }

  static async del(key) {
    return true;
  }

  static async initialize() {
    return true;
  }
}

module.exports = { RedisService };
