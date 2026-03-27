const models = require('../../models');

// Ensure the test DB is clean and ready before tests run
let sequelize = models.sequelize;

beforeAll(async () => {
  if (!sequelize) sequelize = models.sequelize;
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  if (sequelize && sequelize.close) await sequelize.close();
});

beforeEach(async () => {
  // Clear database before each test
  await sequelize.sync({ force: true });
});

const setupTestDB = () => sequelize;

// Mock Redis for testing
const setupTestRedis = () => {
  beforeAll(async () => {
    // Use a mock Redis client for testing
    jest.mock('../../config/redis', () => ({
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      quit: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
};

// Mock external services
const mockExternalServices = () => {
  jest.mock('../../services/yachiAI', () => ({
    analyzeSkills: jest.fn(),
    calculateWorkerLevel: jest.fn(),
    analyzePortfolioItem: jest.fn()
  }));

  jest.mock('../../services/yachiGamification', () => ({
    awardVerification: jest.fn(),
    awardSelfieVerification: jest.fn(),
    awardDocumentUpload: jest.fn(),
    awardPortfolioUpload: jest.fn(),
    awardSkillUpdate: jest.fn(),
    awardLevelUp: jest.fn(),
    getWorkerGamificationProfile: jest.fn()
  }));

  jest.mock('../../services/yachiAnalytics', () => ({
    trackAvailabilityChange: jest.fn()
  }));

  jest.mock('../../services/yachiNotifications', () => ({
    sendVerificationUpdate: jest.fn(),
    sendSelfieVerificationSuccess: jest.fn(),
    sendAvailabilityUpdate: jest.fn()
  }));

  jest.mock('../../services/mediaService', () => ({
    processVerificationDocument: jest.fn(),
    processSelfieImage: jest.fn(),
    processPortfolioItem: jest.fn()
  }));

  jest.mock('../../services/verificationService', () => ({
    verifyDocument: jest.fn(),
    verifySelfie: jest.fn(),
    analyzeDocument: jest.fn()
  }));
};

module.exports = {
  setupTestDB,
  setupTestRedis,
  mockExternalServices
};