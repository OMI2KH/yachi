'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GamificationProfiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Points and levels
      totalPoints: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      availablePoints: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      experience: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      // Streaks
      currentStreak: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      longestStreak: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lastActivityDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Achievements
      achievements: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      badges: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      // Stats
      stats: {
        type: Sequelize.JSONB,
        defaultValue: {
          challengesCompleted: 0,
          rewardsRedeemed: 0,
          pointsByCategory: {},
          dailyAverage: 0
        }
      },
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      // Timestamps
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
    await queryInterface.addIndex('GamificationProfiles', ['userId']);
    await queryInterface.addIndex('GamificationProfiles', ['level']);
    await queryInterface.addIndex('GamificationProfiles', ['totalPoints']);
    await queryInterface.addIndex('GamificationProfiles', ['currentStreak']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GamificationProfiles');
  }
};