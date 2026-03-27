'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Bookings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Transaction details
      type: {
        type: Sequelize.ENUM('payment', 'refund', 'withdrawal', 'commission', 'bonus'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.ENUM('ETB', 'USD'),
        defaultValue: 'ETB'
      },
      fee: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      netAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      // Payment method
      paymentMethod: {
        type: Sequelize.ENUM('telebirr', 'cbebirr', 'hello_cash', 'bank_transfer', 'card', 'cash'),
        allowNull: true
      },
      paymentProvider: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      paymentReference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      // Status
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
        defaultValue: 'pending'
      },
      // Metadata
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      // Timestamps
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('Transactions', ['userId']);
    await queryInterface.addIndex('Transactions', ['bookingId']);
    await queryInterface.addIndex('Transactions', ['type']);
    await queryInterface.addIndex('Transactions', ['status']);
    await queryInterface.addIndex('Transactions', ['paymentReference']);
    await queryInterface.addIndex('Transactions', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Transactions');
  }
};