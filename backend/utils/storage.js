// Minimal storage manager stub for tests
const storageManager = {
  initialize: async () => true,
  upload: async (key, data) => ({ key, url: `https://test.local/${key}` }),
  delete: async (key) => true,
  get: async (key) => null
};

module.exports = { storageManager };
