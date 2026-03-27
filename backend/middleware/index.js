const errorHandler = require('./errorHandler');

// Authentication middleware (simple JWT-based for tests)
function auth(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message === 'jwt malformed' ? 'Invalid token.' : 'Invalid token.' });
  }
}

// Validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    // Minimal JSON schema-ish validation for tests
    if (!schema || !schema.body) return next();
    const body = req.body || {};
    const required = schema.body.required || [];
    for (const field of required) {
      if (body[field] === undefined) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ message: `${field} is required` }] });
      }
    }
    return next();
  };
}

// Rate limit middleware factory (uses config/redis mock in tests)
function rateLimit(opts = {}) {
  const windowMs = opts.windowMs || 15 * 60 * 1000;
  const max = opts.max || 100;

  return async (req, res, next) => {
    const redis = require('../config/redis');
    try {
      const key = `rate:${req.ip}:${req.path}`;
      const current = await (redis.get ? redis.get(key) : (async () => null)());
      const count = current ? parseInt(current, 10) : 0;
      if (count >= max) {
        return res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
      }
      // In test/mock this will be a noop
      if (redis.set) await redis.set(key, (count + 1).toString(), { ttl: Math.floor(windowMs / 1000) });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count - 1));
      return next();
    } catch (e) {
      return next();
    }
  };
}

module.exports = { auth, validate, rateLimit, errorHandler };
