'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Bookings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      providerId: {
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
        allowNull: false,
        references: {
          model: 'Services',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Booking details
      scheduledDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER, // in minutes
        allowNull: false
      },
      // Location
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      address: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      // Pricing
      basePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      serviceFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.ENUM('ETB', 'USD'),
        defaultValue: 'ETB'
      },
      // Special requests
      specialRequests: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      emergencyContact: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      // Status
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired', 'disputed'),
        defaultValue: 'pending'
      },
      paymentStatus: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'),
        defaultValue: 'pending'
      },
      // Timeline
      timeline: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      // Metadata
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      // Cancellation
      cancelledBy: {
        type: Sequelize.ENUM('client', 'provider', 'system'),
        allowNull: true
      },
      cancellationReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancellationFee: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      // Completion
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completionNotes: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('Bookings', ['clientId']);
    await queryInterface.addIndex('Bookings', ['providerId']);
    await queryInterface.addIndex('Bookings', ['serviceId']);
    await queryInterface.addIndex('Bookings', ['status']);
    await queryInterface.addIndex('Bookings', ['paymentStatus']);
    await queryInterface.addIndex('Bookings', ['scheduledDate']);
    await queryInterface.addIndex('Bookings', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Bookings');
  }
};