const fs = require('fs');
const path = require('path');
const { sequelize } = require('../connection');

class FixtureLoader {
  constructor() {
    this.fixtures = {};
    this.loadAllFixtures();
  }

  loadAllFixtures() {
    const fixturesDir = __dirname;
    
    fs.readdirSync(fixturesDir)
      .filter(file => file.endsWith('.json'))
      .forEach(file => {
        const fixturePath = path.join(fixturesDir, file);
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        const fixtureName = path.basename(file, '.json');
        this.fixtures[fixtureName] = fixtureData;
      });
  }

  async loadFixture(fixtureName) {
    const fixture = this.fixtures[fixtureName];
    if (!fixture) {
      throw new Error(`Fixture '${fixtureName}' not found`);
    }

    console.log(`📦 Loading fixture: ${fixture.name}`);
    console.log(`📝 ${fixture.description}`);

    const tables = fixture.tables;
    
    for (const [tableName, records] of Object.entries(tables)) {
      console.log(`  ↪ Loading ${records.length} records into ${tableName}...`);
      
      try {
        // Use bulkCreate with individualHooks: true to handle timestamps properly
        await sequelize.models[tableName].bulkCreate(records, {
          validate: true,
          individualHooks: true,
          ignoreDuplicates: true
        });
        
        console.log(`  ✅ Successfully loaded ${records.length} records into ${tableName}`);
      } catch (error) {
        console.error(`  ❌ Error loading ${tableName}:`, error.message);
        throw error;
      }
    }

    console.log(`✅ Fixture '${fixtureName}' loaded successfully\n`);
  }

  async loadAllFixturesSequentially() {
    const fixtureNames = Object.keys(this.fixtures).sort();
    
    for (const fixtureName of fixtureNames) {
      await this.loadFixture(fixtureName);
    }
    
    console.log('🎉 All fixtures loaded successfully!');
  }

  async unloadFixture(fixtureName) {
    const fixture = this.fixtures[fixtureName];
    if (!fixture) {
      throw new Error(`Fixture '${fixtureName}' not found`);
    }

    console.log(`🗑️  Unloading fixture: ${fixture.name}`);

    const tables = Object.keys(fixture.tables).reverse(); // Reverse order for proper deletion
    
    for (const tableName of tables) {
      console.log(`  ↪ Clearing table: ${tableName}...`);
      
      try {
        await sequelize.models[tableName].destroy({ where: {}, truncate: true, cascade: true });
        console.log(`  ✅ Successfully cleared ${tableName}`);
      } catch (error) {
        console.error(`  ❌ Error clearing ${tableName}:`, error.message);
        throw error;
      }
    }

    console.log(`✅ Fixture '${fixtureName}' unloaded successfully\n`);
  }

  async unloadAllFixtures() {
    const fixtureNames = Object.keys(this.fixtures).sort().reverse();
    
    for (const fixtureName of fixtureNames) {
      await this.unloadFixture(fixtureName);
    }
    
    console.log('🧹 All fixtures unloaded successfully!');
  }

  listFixtures() {
    console.log('\n📁 Available Fixtures:');
    Object.entries(this.fixtures).forEach(([name, fixture]) => {
      console.log(`  📄 ${name}: ${fixture.name}`);
      console.log(`     ${fixture.description}`);
      console.log(`     Tables: ${Object.keys(fixture.tables).join(', ')}`);
    });
    console.log('');
  }
}

module.exports = FixtureLoader;