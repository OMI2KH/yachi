// Minimal Jest setup for backend tests
// Sets timezone and provides a lightweight global logger mock
process.env.TZ = process.env.TZ || 'Africa/Addis_Ababa';

// Increase default timeout for slower CI/dev machines
jest.setTimeout(20000);

// Provide a minimal global logger used by tests
global.testLogger = {
  info: () => {},
  warn: () => {},
  error: () => {}
};

// Silence console during tests by default (can be enabled by setting TEST_VERBOSE)
if (!process.env.TEST_VERBOSE) {
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
}

module.exports = {};

// Expose app and request for integration tests
try {
  // server exports yachiServer instance with `.app`
  const yachiServer = require('../../server');
  if (yachiServer && yachiServer.app) {
    global.app = yachiServer.app;
    // supertest will wrap express app for request testing
    try {
      const supertest = require('supertest');
      global.request = supertest(global.app);
    } catch (e) {
      // supertest not installed for test runtime; tests that rely on request should mock it
      global.request = undefined;
    }
  }
} catch (e) {
  // ignore; tests that require server should import their own app instance
}
