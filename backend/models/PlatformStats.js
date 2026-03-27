module.exports = (sequelize, DataTypes) => {
  const PlatformStats = sequelize.define('PlatformStats', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    stats: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'platform_stats',
    indexes: [
      {
        fields: ['date']
      }
    ]
  });

  return PlatformStats;
};