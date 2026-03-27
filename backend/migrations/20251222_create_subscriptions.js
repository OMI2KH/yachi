"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      plan_id: { type: Sequelize.UUID, allowNull: false },
      status: { type: Sequelize.ENUM('active','cancelled','past_due','trialing'), allowNull: false, defaultValue: 'active' },
      start_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      end_date: { type: Sequelize.DATE, allowNull: true },
      recurring_amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ETB' },
      payment_method: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscriptions');
  }
};
