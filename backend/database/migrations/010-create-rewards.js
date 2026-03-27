'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Rewards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('discount', 'badge', 'feature', 'physical', 'digital', 'recognition'),
        allowNull: false
      },
      pointsCost: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      quantityAvailable: {
        type: Sequelize.INTEGER,
        allowNull: true // null means unlimited
      },
      maxPerUser: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('Rewards', ['type']);
    await queryInterface.addIndex('Rewards', ['pointsCost']);
    await queryInterface.addIndex('Rewards', ['isActive']);
    await queryInterface.addIndex('Rewards', ['startDate', 'endDate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Rewards');
  }
};