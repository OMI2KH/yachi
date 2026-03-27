'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Services', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      title: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      subcategory: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.ENUM('ETB', 'USD'),
        defaultValue: 'ETB'
      },
      duration: {
        type: Sequelize.INTEGER, // in minutes
        allowNull: true
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
      // Media
      images: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      primaryImage: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      // Tags and metadata
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      requirements: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      // Stats
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.0
      },
      reviewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      bookingCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Status
      status: {
        type: Sequelize.ENUM('draft', 'active', 'inactive', 'suspended', 'deleted'),
        defaultValue: 'active'
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      premiumListing: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('Services', ['providerId']);
    await queryInterface.addIndex('Services', ['category']);
    await queryInterface.addIndex('Services', ['status']);
    await queryInterface.addIndex('Services', ['price']);
    await queryInterface.addIndex('Services', ['rating']);
    await queryInterface.addIndex('Services', ['createdAt']);
    await queryInterface.addIndex('Services', ['latitude', 'longitude']);
    
    // GIN index for tags array search
    await queryInterface.addIndex('Services', ['tags'], {
      using: 'GIN',
      operator: 'jsonb_path_ops'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Services');
  }
};