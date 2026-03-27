'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('WorkerVerifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      // Document details
      documentType: {
        type: Sequelize.ENUM('fayda_id', 'passport', 'driving_license', 'degree_certificate', 'professional_certificate', 'business_license', 'selfie', 'portfolio'),
        allowNull: false
      },
      documentNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      documentImage: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      // Verification details
      issuingAuthority: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      issueDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Status
      status: {
        type: Sequelize.ENUM('pending', 'in_review', 'verified', 'rejected', 'expired'),
        defaultValue: 'pending'
      },
      verifiedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // AI Verification results
      verificationScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      confidenceScore: {
        type: Sequelize.DECIMAL(5, 4),
        defaultValue: 0.0
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
    await queryInterface.addIndex('WorkerVerifications', ['userId']);
    await queryInterface.addIndex('WorkerVerifications', ['documentType']);
    await queryInterface.addIndex('WorkerVerifications', ['status']);
    await queryInterface.addIndex('WorkerVerifications', ['verifiedAt']);
    await queryInterface.addIndex('WorkerVerifications', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('WorkerVerifications');
  }
};