const { DataTypes } = require('sequelize');
const { YachiGamification } = require('../services/yachiGamification');
const { RealTimeService } = require('../services/realTimeService');
const { YachiNotifications } = require('../services/yachiNotifications');

module.exports = (sequelize) => {
  const Message = sequelize.define(
    'Message',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      
      // 👥 Participant Information
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { 
          model: 'users', 
          key: 'id' 
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { 
          model: 'users', 
          key: 'id' 
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      jobId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { 
          model: 'jobs', 
          key: 'id' 
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { 
          model: 'conversations', 
          key: 'id' 
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },

      // 💬 Message Content
      content: {
        type: DataTypes.TEXT,
        allowNull: true, // Allow null for media-only messages
        validate: {
          len: {
            args: [0, 10000],
            msg: 'Message content cannot exceed 10,000 characters.',
          },
          contentOrMedia: function(value) {
            if (!value && !this.media && !this.systemMessage) {
              throw new Error('Message must have content, media, or be a system message');
            }
          }
        },
      },
      messageType: {
        type: DataTypes.ENUM(
          'text',           // Regular text message
          'image',          // Image attachment
          'video',          // Video attachment
          'audio',          // Voice message
          'document',       // File/document
          'location',       // Location sharing
          'contact',        // Contact sharing
          'system',         // System-generated message
          'booking',        // Booking-related message
          'payment',        // Payment-related message
          'quote',          // Service quote
          'quick_reply'     // Pre-defined quick replies
        ),
        defaultValue: 'text',
        allowNull: false
      },
      systemMessage: {
        type: DataTypes.STRING(500),
        allowNull: true
      },

      // 🖼️ Media Attachments
      media: {
        type: DataTypes.JSONB,
        defaultValue: null,
        validate: {
          isValidMedia: function(value) {
            if (value && this.messageType !== 'system') {
              if (this.messageType === 'image' && !value.url) {
                throw new Error('Image messages must have a URL');
              }
              if (this.messageType === 'audio' && !value.duration) {
                throw new Error('Audio messages must have duration');
              }
            }
          }
        }
      },
      thumbnail: {
        type: DataTypes.STRING,
        allowNull: true
      },
      fileSize: {
        type: DataTypes.INTEGER, // in bytes
        allowNull: true
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      // 📊 Message Status & Tracking
      status: {
        type: DataTypes.ENUM(
          'sent',           // Message sent successfully
          'delivered',      // Message delivered to recipient
          'read',           // Message read by recipient
          'failed',         // Message failed to send
          'pending'         // Message being processed
        ),
        defaultValue: 'sent'
      },
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      delivered: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      sentAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },

      // 🎪 Yachi Gamification Features
      gamification: {
        type: DataTypes.JSONB,
        defaultValue: {
          pointsAwarded: 0,
          achievementTriggered: false,
          streakMaintained: false,
          qualityScore: 0
        }
      },

      // 🔍 Message Metadata
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {
          clientInfo: {
            platform: null,
            version: null,
            userAgent: null
          },
          encryption: {
            encrypted: false,
            algorithm: null,
            keyId: null
          },
          edits: {
            count: 0,
            history: []
          },
          reactions: [],
          mentions: [],
          hashtags: []
        }
      },

      // ⚙️ Advanced Features
      isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      editedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      editHistory: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      replyTo: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { 
          model: 'messages', 
          key: 'id' 
        }
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deletedFor: {
        type: DataTypes.ARRAY(DataTypes.UUID), // User IDs for whom message is deleted
        defaultValue: []
      },

      // 📈 Analytics & Performance
      deliveryAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastDeliveryAttempt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true // For temporary messages
      }

    },
    {
      tableName: 'messages',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: async (message) => {
          // Validate media based on message type
          await message.validateMedia();
          
          // Set sent timestamp
          message.sentAt = new Date();
        },
        afterCreate: async (message) => {
          // Award points for active communication
          await YachiGamification.awardMessagePoints(message.senderId);
          
          // Send real-time notification
          await RealTimeService.emitToUser(message.recipientId, 'new_message', {
            messageId: message.id,
            senderId: message.senderId,
            conversationId: message.conversationId,
            preview: message.getPreview(),
            timestamp: message.sentAt
          });
          
          // Update conversation last message
          await message.updateConversationLastMessage();
          
          // Send push notification
          await YachiNotifications.sendMessageNotification(message);
        },
        afterUpdate: async (message) => {
          // Handle read receipts
          if (message.changed('read') && message.read) {
            message.readAt = new Date();
            await message.save();
            
            // Notify sender that message was read
            await RealTimeService.emitToUser(message.senderId, 'message_read', {
              messageId: message.id,
              readAt: message.readAt,
              readerId: message.recipientId
            });
          }
          
          // Handle delivery status
          if (message.changed('delivered') && message.delivered) {
            message.deliveredAt = new Date();
            await message.save();
          }
        }
      },
      indexes: [
        { fields: ['sender_id'] },
        { fields: ['recipient_id'] },
        { fields: ['job_id'] },
        { fields: ['conversation_id'] },
        { fields: ['created_at'] },
        { fields: ['status'] },
        { fields: ['message_type'] },
        { 
          fields: ['conversation_id', 'created_at'],
          name: 'messages_conversation_created_idx'
        },
        {
          fields: ['reply_to']
        },
        {
          fields: ['expires_at'],
          where: { expires_at: { [sequelize.Op.ne]: null } }
        }
      ]
    }
  );

  // 🎯 Instance Methods
  Message.prototype.validateMedia = async function() {
    if (this.media && this.messageType !== 'system') {
      switch (this.messageType) {
        case 'image':
          if (!this.media.url) {
            throw new Error('Image messages must have a URL');
          }
          // Validate image dimensions if provided
          if (this.media.dimensions && (!this.media.dimensions.width || !this.media.dimensions.height)) {
            throw new Error('Image dimensions must include width and height');
          }
          break;
          
        case 'audio':
          if (!this.media.url || !this.media.duration) {
            throw new Error('Audio messages must have URL and duration');
          }
          if (this.media.duration > 300) { // 5 minutes max
            throw new Error('Audio messages cannot exceed 5 minutes');
          }
          break;
          
        case 'video':
          if (!this.media.url || !this.media.duration) {
            throw new Error('Video messages must have URL and duration');
          }
          if (this.media.duration > 600) { // 10 minutes max
            throw new Error('Video messages cannot exceed 10 minutes');
          }
          break;
          
        case 'document':
          if (!this.media.url || !this.media.name) {
            throw new Error('Document messages must have URL and name');
          }
          // Validate file size (10MB max)
          if (this.fileSize > 10 * 1024 * 1024) {
            throw new Error('Document size cannot exceed 10MB');
          }
          break;
      }
    }
  };

  Message.prototype.getPreview = function() {
    switch (this.messageType) {
      case 'text':
        return this.content.length > 50 ? this.content.substring(0, 50) + '...' : this.content;
      case 'image':
        return '📷 Image';
      case 'video':
        return '🎥 Video';
      case 'audio':
        return '🎤 Audio message';
      case 'document':
        return '📄 Document';
      case 'location':
        return '📍 Location';
      case 'system':
        return this.systemMessage;
      default:
        return 'New message';
    }
  };

  Message.prototype.markAsRead = async function(readerId) {
    if (this.recipientId === readerId && !this.read) {
      this.read = true;
      this.readAt = new Date();
      this.status = 'read';
      await this.save();
    }
  };

  Message.prototype.markAsDelivered = async function() {
    if (!this.delivered) {
      this.delivered = true;
      this.deliveredAt = new Date();
      this.status = 'delivered';
      await this.save();
    }
  };

  Message.prototype.edit = async function(newContent, editorId) {
    if (this.senderId !== editorId) {
      throw new Error('Only the message sender can edit the message');
    }
    
    const editHistory = this.editHistory || [];
    editHistory.push({
      previousContent: this.content,
      editedAt: new Date(),
      editedBy: editorId
    });
    
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    this.editHistory = editHistory;
    this.metadata.edits.count = editHistory.length;
    this.metadata.edits.history = editHistory;
    
    await this.save();
  };

  Message.prototype.softDelete = async function(userId) {
    if (!this.deletedFor.includes(userId)) {
      this.deletedFor = [...this.deletedFor, userId];
      await this.save();
    }
  };

  Message.prototype.addReaction = async function(userId, reaction) {
    const reactions = this.metadata.reactions || [];
    const existingReactionIndex = reactions.findIndex(r => r.userId === userId);
    
    if (existingReactionIndex > -1) {
      reactions[existingReactionIndex].reaction = reaction;
      reactions[existingReactionIndex].timestamp = new Date();
    } else {
      reactions.push({
        userId,
        reaction,
        timestamp: new Date()
      });
    }
    
    this.metadata.reactions = reactions;
    await this.save();
    
    // Notify about reaction
    await RealTimeService.emitToUser(this.senderId, 'message_reacted', {
      messageId: this.id,
      reactorId: userId,
      reaction: reaction
    });
  };

  Message.prototype.updateConversationLastMessage = async function() {
    const Conversation = sequelize.models.Conversation;
    await Conversation.update(
      {
        lastMessageId: this.id,
        lastMessageAt: this.sentAt,
        lastMessagePreview: this.getPreview()
      },
      {
        where: { id: this.conversationId }
      }
    );
  };

  // 🎯 Static Methods
  Message.findByConversation = function(conversationId, options = {}) {
    const whereClause = {
      conversationId,
      isDeleted: false
    };
    
    // Exclude messages deleted for the current user
    if (options.currentUserId) {
      whereClause.deletedFor = {
        [sequelize.Op.not]: sequelize.literal(`'${options.currentUserId}' = ANY("deleted_for")`)
      };
    }
    
    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      limit: options.limit || 50,
      offset: options.offset || 0,
      include: options.include || []
    });
  };

  Message.getUnreadCount = function(userId, conversationId = null) {
    const whereClause = {
      recipientId: userId,
      read: false,
      isDeleted: false
    };
    
    if (conversationId) {
      whereClause.conversationId = conversationId;
    }
    
    return this.count({ where: whereClause });
  };

  Message.markConversationAsRead = async function(conversationId, userId) {
    return this.update(
      {
        read: true,
        readAt: new Date(),
        status: 'read'
      },
      {
        where: {
          conversationId,
          recipientId: userId,
          read: false
        }
      }
    );
  };

  Message.findMediaMessages = function(conversationId, messageType = null) {
    const whereClause = {
      conversationId,
      messageType: {
        [sequelize.Op.in]: ['image', 'video', 'audio', 'document']
      },
      isDeleted: false
    };
    
    if (messageType) {
      whereClause.messageType = messageType;
    }
    
    return this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'messageType', 'media', 'thumbnail', 'sentAt', 'senderId']
    });
  };

  // 🎯 Association Method
  Message.associate = (models) => {
    Message.belongsTo(models.User, { 
      foreignKey: 'senderId', 
      as: 'Sender' 
    });
    Message.belongsTo(models.User, { 
      foreignKey: 'recipientId', 
      as: 'Recipient' 
    });
    Message.belongsTo(models.Job, { 
      foreignKey: 'jobId', 
      as: 'Job' 
    });
    Message.belongsTo(models.Conversation, { 
      foreignKey: 'conversationId', 
      as: 'Conversation' 
    });
    Message.belongsTo(models.Message, { 
      foreignKey: 'replyTo', 
      as: 'ParentMessage' 
    });
  };

  return Message;
};