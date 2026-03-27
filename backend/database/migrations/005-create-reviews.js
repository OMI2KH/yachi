'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reviews', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      revieweeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      serviceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Services',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Bookings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Review content
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        }
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Response from service provider
      response: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Status
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'flagged'),
        defaultValue: 'approved'
      },
      // Flags for inappropriate content
      flags: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      flaggedBy: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        defaultValue: []
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
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('Reviews', ['authorId']);
    await queryInterface.addIndex('Reviews', ['revieweeId']);
    await queryInterface.addIndex('Reviews', ['serviceId']);
    await queryInterface.addIndex('Reviews', ['bookingId']);
    await queryInterface.addIndex('Reviews', ['rating']);
    await queryInterface.addIndex('Reviews', ['status']);
    await queryInterface.addIndex('Reviews', ['createdAt']);
    
    // Unique constraint - one review per booking
    await queryInterface.addConstraint('Reviews', {
      fields: ['bookingId'],
      type: 'unique',
      name: 'unique_booking_review'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Reviews');
  }
};