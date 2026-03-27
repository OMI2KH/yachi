"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('badge_purchases', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      badge_type: { type: Sequelize.STRING(50), allowNull: false },
      amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ETB' },
      status: { type: Sequelize.ENUM('initiated','success','failed','refunded'), allowNull: false, defaultValue: 'initiated' },
      payment_reference: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('badge_purchases');
  }
};
