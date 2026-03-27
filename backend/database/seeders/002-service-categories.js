'use strict';

const { SERVICE_CATEGORIES } = require('../../utils/constants');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert service categories into a lookup table (optional)
    // This is for reference - actual categories are enforced in application logic
    const categories = Object.entries(SERVICE_CATEGORIES).map(([code, category]) => ({
      code,
      name: category.name,
      subcategories: category.subcategories,
      description: `${category.name} services in Ethiopia`,
      isActive: true,
      displayOrder: Object.keys(SERVICE_CATEGORIES).indexOf(code) + 1,
      icon: `category-${code}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('ServiceCategories', categories);
    
    console.log('✅ Service categories seeded successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ServiceCategories', {});
  }
};