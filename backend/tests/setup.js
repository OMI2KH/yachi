// Global test setup for backend tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Mock heavy external/integration services before requiring app
jest.mock('../services/realTimeService', () => ({
  initialize: async () => true,
  emitToRoom: jest.fn(),
  emit: jest.fn()
}));

// Mock optional middleware packages that may not be installed in test environment
jest.mock('express-mongo-sanitize', () => jest.fn(() => (req, res, next) => next()), { virtual: true });
jest.mock('xss-clean', () => jest.fn(() => (req, res, next) => next()), { virtual: true });
jest.mock('hpp', () => jest.fn(() => (req, res, next) => next()), { virtual: true });

// Mock heavy external libs that may not be present in CI/test environment
jest.mock('mongoose', () => ({
  connect: jest.fn(async () => true),
  connection: { on: jest.fn(), once: jest.fn() },
  Schema: function() {},
  model: function() { return function() {}; }
}), { virtual: true });

jest.mock('mongodb', () => ({ MongoClient: { connect: jest.fn(async () => true) } }), { virtual: true });

// Provide a lightweight Sequelize mock to avoid sqlite3 / postgres requirements in tests
jest.mock('sequelize', () => {
  const jestFn = require('jest-mock').fn;
  class Sequelize {
    constructor() {}
    define(name, schema) {
      function Model(values = {}) { Object.assign(this, values); }
      Model.prototype = {};
      Model.findOne = jestFn();
      Model.findAll = jestFn();
      Model.create = jestFn();
      Model.update = jestFn();
      Model.destroy = jestFn();
      Model.belongsTo = jestFn();
      Model.hasMany = jestFn();
      return Model;
    }
    authenticate() { return Promise.resolve(true); }
    sync() { return Promise.resolve(true); }
  }
  const DataTypes = {
    STRING: (len) => ({ type: 'STRING', length: len }),
    UUID: 'UUID',
    UUIDV4: 'UUIDV4',
    INTEGER: 'INTEGER',
    JSONB: 'JSONB',
    TEXT: 'TEXT',
    BOOLEAN: 'BOOLEAN',
    DATE: 'DATE',
    ENUM: (...args) => ({ type: 'ENUM', values: args }),
    ARRAY: (inner) => ({ type: 'ARRAY', of: inner })
  };
  const Op = {};
  return { Sequelize, DataTypes, Op };
}, { virtual: true });

jest.mock('../config/redis', () => ({
  initialize: async () => true,
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  quit: jest.fn(),
  rPush: jest.fn(),
  lTrim: jest.fn(),
  isHealthy: () => true
}));

// Provide a comprehensive logger mock used across services
jest.mock('../utils/logger', () => {
  const fn = require('jest-mock').fn;
  const loggerImpl = {
    info: fn(),
    warn: fn(),
    error: fn(),
    debug: fn(),
    critical: fn(),
    getMorganStream: () => ({ write: () => {} })
  };

  const YachiLogger = {
    logger: loggerImpl,
    metrics: { info: 0, warn: 0, error: 0 },
    info: (...args) => loggerImpl.info(...args),
    warn: (...args) => loggerImpl.warn(...args),
    error: (...args) => loggerImpl.error(...args),
    debug: (...args) => loggerImpl.debug(...args),
    bufferLog: fn()
  };

  return {
    YachiLogger,
    PerformanceLogger: { recordAIOperation: fn() },
    AuditLogger: { record: fn() },
    logger: loggerImpl,
    initializeLogger: async () => true,
    info: loggerImpl.info,
    warn: loggerImpl.warn,
    error: loggerImpl.error,
    debug: loggerImpl.debug,
    critical: loggerImpl.critical,
    performance: fn()
  };
}, { virtual: true });

// Expose a lightweight express `app` and supertest `request` globally for tests
const express = require('express');
const supertest = require('supertest');
const app = express();
app.use(express.json());
app.get('/__health', (req, res) => res.json({ ok: true }));
global.app = app;
global.request = supertest;

// Increase default timeout for CI slow machines
jest.setTimeout(30000);
