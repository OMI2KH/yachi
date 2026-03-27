// database/migrations/20240101000000-create-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.UUID, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      // ... other fields
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Users');
  }
};