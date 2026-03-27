module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    participants: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Bookings',
        key: 'id'
      }
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Services',
        key: 'id'
      }
    },
    lastMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessageBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    unreadCount: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'chats',
    indexes: [
      {
        fields: ['participants']
      },
      {
        fields: ['bookingId']
      },
      {
        fields: ['lastMessageAt']
      }
    ]
  });

  Chat.associate = function(models) {
    Chat.belongsTo(models.Booking, {
      foreignKey: 'bookingId',
      as: 'booking'
    });
    Chat.belongsTo(models.Service, {
      foreignKey: 'serviceId',
      as: 'service'
    });
    Chat.hasMany(models.Message, {
      foreignKey: 'chatId',
      as: 'messages'
    });
    Chat.belongsToMany(models.User, {
      through: 'chat_participants',
      foreignKey: 'chatId',
      otherKey: 'userId',
      as: 'participants'
    });
    Chat.belongsTo(models.Message, {
      foreignKey: 'lastMessageId',
      as: 'lastMessage'
    });
  };

  return Chat;
};