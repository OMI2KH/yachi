const { fixtureLoader } = require('./index');

const command = process.argv[2];
const fixtureName = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'load':
        if (fixtureName) {
          await fixtureLoader.loadFixture(fixtureName);
        } else {
          await fixtureLoader.loadAllFixturesSequentially();
        }
        break;
      
      case 'unload':
        if (fixtureName) {
          await fixtureLoader.unloadFixture(fixtureName);
        } else {
          await fixtureLoader.unloadAllFixtures();
        }
        break;
      
      case 'list':
        fixtureLoader.listFixtures();
        break;
      
      case 'reset':
        await fixtureLoader.unloadAllFixtures();
        await fixtureLoader.loadAllFixturesSequentially();
        break;
      
      default:
        console.log(`
🎯 Yachi Fixture Management CLI

Usage:
  node cli.js load [fixture]     Load all fixtures or specific fixture
  node cli.js unload [fixture]   Unload all fixtures or specific fixture
  node cli.js list               List all available fixtures
  node cli.js reset              Reset database with all fixtures

Examples:
  node cli.js load               Load all fixtures
  node cli.js load extensive-users  Load specific fixture
  node cli.js list               Show available fixtures
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}