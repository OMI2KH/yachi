"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_packages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(12,2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ETB' },
      duration_days: { type: Sequelize.INTEGER, allowNull: false },
      impressions_per_day: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      max_duration_seconds: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ad_packages');
  }
};
