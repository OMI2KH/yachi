const jwt = require('jsonwebtoken');
const { auth, validate, rateLimit } = require('../../middleware');
const { setupTestDB } = require('./setup');

describe('Middleware Unit Tests', () => {
  let sequelize;

  beforeAll(async () => {
    sequelize = setupTestDB();
  });

  describe('Authentication Middleware', () => {
    it('should allow requests with valid JWT token', () => {
      const req = {
        headers: {
          authorization: 'Bearer valid.token.here'
        }
      };
      const res = {};
      const next = jest.fn();

      // Mock JWT verification
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 1, role: 'provider' });

      auth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({ userId: 1, role: 'provider' });
    });

    it('should reject requests without authorization header', () => {
      const req = {
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.'
      });
    });

    it('should reject requests with invalid token', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token.'
      });
    });
  });

  describe('Validation Middleware', () => {
    it('should validate request body against schema', () => {
      const schema = {
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 }
          },
          required: ['email', 'password']
        }
      };

      const req = {
        body: {
          email: 'test@example.com',
          password: 'securepass123'
        }
      };
      const res = {};
      const next = jest.fn();

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid request body', () => {
      const schema = {
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' }
          },
          required: ['email']
        }
      };

      const req = {
        body: {
          email: 'invalid-email'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      validate(schema)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should allow requests under rate limit', async () => {
      const req = {
        ip: '192.168.1.1',
        path: '/api/test'
      };
      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Mock Redis to allow request
      const redis = require('../../config/redis');
      redis.get.mockResolvedValue(null); // No previous requests

      await rateLimit()(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block requests over rate limit', async () => {
      const req = {
        ip: '192.168.1.1',
        path: '/api/test'
      };
      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Mock Redis to show many requests
      const redis = require('../../config/redis');
      redis.get.mockResolvedValue('100'); // Already made 100 requests

      await rateLimit({ windowMs: 900000, max: 100 })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests, please try again later.'
      });
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle validation errors', () => {
      const errorHandler = require('../../middleware/errorHandler');
      
      const error = {
        name: 'ValidationError',
        details: [{ message: 'Invalid email' }]
      };
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Invalid email' }]
      });
    });

    it('should handle JWT errors', () => {
      const errorHandler = require('../../middleware/errorHandler');
      
      const error = {
        name: 'JsonWebTokenError',
        message: 'Invalid token'
      };
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should handle unknown errors', () => {
      const errorHandler = require('../../middleware/errorHandler');
      
      const error = new Error('Unknown error');
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});