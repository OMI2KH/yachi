'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      firstName: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },
      avatar: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      coverImage: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      dateOfBirth: {
        type: Sequelize.DATE,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('client', 'provider', 'graduate', 'admin', 'super_admin', 'moderator'),
        defaultValue: 'client',
        allowNull: false
      },
      faydaId: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true
      },
      // Verification fields
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      phoneVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      faydaVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      selfieVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      documentVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      verificationStatus: {
        type: Sequelize.ENUM('pending', 'in_review', 'verified', 'rejected', 'expired'),
        defaultValue: 'pending'
      },
      verificationScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Location fields
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
      // Preferences
      preferences: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      notificationPreferences: {
        type: Sequelize.JSONB,
        defaultValue: {
          email: true,
          sms: true,
          push: true,
          inApp: true
        }
      },
      // Gamification fields
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      experience: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      totalPoints: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Stats fields
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.0
      },
      reviewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      completedJobs: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      responseRate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.0
      },
      // Availability
      availability: {
        type: Sequelize.ENUM('available', 'busy', 'away', 'unavailable'),
        defaultValue: 'available'
      },
      availabilityMetadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      // Skills
      skills: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      skillsMetadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      // Security fields
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      twoFactorSecret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      loginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lockUntil: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Status
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'banned'),
        defaultValue: 'active'
      },
      suspensionReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      suspensionUntil: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('Users', ['email']);
    await queryInterface.addIndex('Users', ['phone']);
    await queryInterface.addIndex('Users', ['role']);
    await queryInterface.addIndex('Users', ['status']);
    await queryInterface.addIndex('Users', ['latitude', 'longitude']);
    await queryInterface.addIndex('Users', ['verificationStatus']);
    await queryInterface.addIndex('Users', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};