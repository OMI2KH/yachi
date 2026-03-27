const FixtureLoader = require('./loader');

// Create and export loader instance
const fixtureLoader = new FixtureLoader();

// Export utility functions
module.exports = {
  fixtureLoader,
  
  // Load all fixtures
  loadAllFixtures: () => fixtureLoader.loadAllFixturesSequentially(),
  
  // Load specific fixture
  loadFixture: (fixtureName) => fixtureLoader.loadFixture(fixtureName),
  
  // Unload all fixtures
  unloadAllFixtures: () => fixtureLoader.unloadAllFixtures(),
  
  // Unload specific fixture
  unloadFixture: (fixtureName) => fixtureLoader.unloadFixture(fixtureName),
  
  // List available fixtures
  listFixtures: () => fixtureLoader.listFixtures(),
  
  // Get fixture data (for testing)
  getFixture: (fixtureName) => fixtureLoader.fixtures[fixtureName]
};