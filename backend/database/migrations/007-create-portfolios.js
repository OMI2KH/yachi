'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Portfolios', {
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
      // Portfolio item details
      title: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      imageUrl: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      thumbnailUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      // Tags and metadata
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      // Visibility
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      // AI Analysis results
      qualityScore: {
        type: Sequelize.DECIMAL(3, 2),
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
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('Portfolios', ['userId']);
    await queryInterface.addIndex('Portfolios', ['category']);
    await queryInterface.addIndex('Portfolios', ['isPublic']);
    await queryInterface.addIndex('Portfolios', ['qualityScore']);
    await queryInterface.addIndex('Portfolios', ['createdAt']);
    
    // GIN index for tags array search
    await queryInterface.addIndex('Portfolios', ['tags'], {
      using: 'GIN',
      operator: 'jsonb_path_ops'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Portfolios');
  }
};