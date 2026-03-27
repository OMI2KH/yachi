'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Challenges', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('onboarding', 'engagement', 'productivity', 'social', 'mastery', 'special'),
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard', 'expert'),
        defaultValue: 'medium'
      },
      pointsReward: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      requirements: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER, // in days
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      maxCompletions: {
        type: Sequelize.INTEGER,
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
    await queryInterface.addIndex('Challenges', ['category']);
    await queryInterface.addIndex('Challenges', ['difficulty']);
    await queryInterface.addIndex('Challenges', ['isActive']);
    await queryInterface.addIndex('Challenges', ['startDate', 'endDate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Challenges');
  }
};