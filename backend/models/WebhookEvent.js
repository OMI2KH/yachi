module.exports = (sequelize, DataTypes) => {
  return sequelize.define('WebhookEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    eventId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: 'webhook_provider_event_unique'
    },
    reference: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    rawPayload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    headers: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    processed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
    ,attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'webhook_events',
    underscored: true,
    timestamps: true
  });
};
