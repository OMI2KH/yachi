module.exports = (sequelize) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'jobs', key: 'id' }
    },
    participant1Id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    participant2Id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    lastMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'messages', key: 'id' }
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessagePreview: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    unreadCount1: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    unreadCount2: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    blockedBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'conversations',
    timestamps: true
  });

  return Conversation;
};