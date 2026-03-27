module.exports = (sequelize, DataTypes) => {
  const Leaderboard = sequelize.define('Leaderboard', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'alltime'),
      allowNull: false
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'leaderboards',
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['periodStart', 'periodEnd']
      }
    ]
  });

  return Leaderboard;
};