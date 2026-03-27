const express = require('express');
const { Op } = require('sequelize');
const { Message, Job, User, Conversation, MessageRead, MessageAttachment, Reaction } = require('../models');
const auth = require('../middleware/auth');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { YachiMessaging } = require('../services/yachiMessaging');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { YachiSecurity } = require('../services/yachiSecurity');
const { MediaService } = require('../services/mediaService');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const MessageSchema = {
  send: z.object({
    jobId: z.number().int().positive(),
    recipientId: z.number().int().positive(),
    content: z.string().min(1).max(5000),
    type: z.enum(['text', 'system', 'file', 'image', 'video', 'audio', 'location', 'payment']).default('text'),
    metadata: z.object({
      replyTo: z.number().int().positive().optional(),
      forwardFrom: z.number().int().positive().optional(),
      urgent: z.boolean().default(false),
      encrypted: z.boolean().default(false),
      expiresIn: z.number().int().positive().optional() // hours
    }).optional(),
    attachments: z.array(z.object({
      type: z.enum(['image', 'video', 'audio', 'document', 'other']),
      url: z.string().url(),
      name: z.string(),
      size: z.number().int().positive(),
      mimeType: z.string()
    })).optional()
  }),

  conversation: z.object({
    jobId: z.number().int().positive(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(50),
    before: z.string().datetime().optional(),
    after: z.string().datetime().optional()
  }),

  react: z.object({
    reaction: z.string().min(1).max(10),
    messageId: z.number().int().positive()
  }),

  typing: z.object({
    jobId: z.number().int().positive(),
    recipientId: z.number().int().positive(),
    isTyping: z.boolean()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  CONVERSATION: (jobId, userId1, userId2) => `conversation:${jobId}:${Math.min(userId1, userId2)}:${Math.max(userId1, userId2)}`,
  UNREAD_COUNTS: (userId) => `unread:${userId}`,
  TYPING_STATUS: (jobId, userId) => `typing:${jobId}:${userId}`,
  MESSAGE: (messageId) => `message:${messageId}`
};

// 🚀 SEND INTELLIGENT MESSAGE
router.post('/', auth, async (req, res) => {
  try {
    const validatedData = MessageSchema.send.parse(req.body);

    // 🛡️ Security and permission checks
    const securityCheck = await YachiSecurity.canSendMessage(
      req.user.userId, 
      validatedData.recipientId, 
      validatedData.jobId
    );
    
    if (!securityCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: securityCheck.reason,
        code: securityCheck.code
      });
    }

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 🔐 Encrypt message if requested
      let finalContent = validatedData.content;
      if (validatedData.metadata?.encrypted) {
        finalContent = await YachiMessaging.encryptMessage(
          validatedData.content, 
          req.user.userId, 
          validatedData.recipientId
        );
      }

      // 📝 Create message with UUID
      const message = await Message.create({
        uuid: uuidv4(),
        senderId: req.user.userId,
        recipientId: validatedData.recipientId,
        jobId: validatedData.jobId,
        content: finalContent,
        type: validatedData.type,
        status: 'sent',
        metadata: {
          ...validatedData.metadata,
          encrypted: validatedData.metadata?.encrypted || false,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          deviceId: req.headers['x-device-id']
        },
        expiresAt: validatedData.metadata?.expiresIn ? 
          new Date(Date.now() + validatedData.metadata.expiresIn * 60 * 60 * 1000) : null
      }, { transaction });

      // 📎 Handle attachments
      if (validatedData.attachments && validatedData.attachments.length > 0) {
        const attachments = await Promise.all(
          validatedData.attachments.map(async (attachment) => {
            // 🛡️ Validate and process attachment
            const processedAttachment = await MediaService.validateAndProcessAttachment(
              attachment, 
              req.user.userId
            );

            return MessageAttachment.create({
              messageId: message.id,
              type: processedAttachment.type,
              url: processedAttachment.url,
              thumbnailUrl: processedAttachment.thumbnailUrl,
              name: processedAttachment.name,
              size: processedAttachment.size,
              mimeType: processedAttachment.mimeType,
              metadata: processedAttachment.metadata
            }, { transaction });
          })
        );

        message.attachments = attachments;
      }

      // 🔄 Handle reply threading
      if (validatedData.metadata?.replyTo) {
        await Message.update({
          replyCount: sequelize.literal('replyCount + 1')
        }, {
          where: { id: validatedData.metadata.replyTo },
          transaction
        });

        // 📝 Add reply reference
        await Message.update({
          metadata: {
            ...message.metadata,
            repliedMessage: validatedData.metadata.replyTo
          }
        }, {
          where: { id: message.id },
          transaction
        });
      }

      // 💬 Update or create conversation
      await Conversation.upsert({
        jobId: validatedData.jobId,
        user1Id: Math.min(req.user.userId, validatedData.recipientId),
        user2Id: Math.max(req.user.userId, validatedData.recipientId),
        lastMessageId: message.id,
        lastActivity: new Date(),
        unreadCount: sequelize.literal(`CASE WHEN user1Id = ${validatedData.recipientId} THEN unreadCount + 1 ELSE unreadCount END`)
      }, { transaction });

      await transaction.commit();

      // 📡 Real-time broadcasting
      const messageWithDetails = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'avatar', 'verifiedBadge']
          },
          {
            model: MessageAttachment,
            as: 'attachments'
          },
          {
            model: Message,
            as: 'repliedTo',
            include: [{
              model: User,
              as: 'sender',
              attributes: ['id', 'name', 'avatar']
            }]
          }
        ]
      });

      // 🌐 Emit via WebSocket to specific room
      req.io.to(`job_${validatedData.jobId}`).emit('message_sent', {
        message: messageWithDetails,
        conversationUpdate: await getConversationSummary(validatedData.jobId, req.user.userId, validatedData.recipientId)
      });

      // 📧 Send push notifications
      await YachiNotifications.sendMessageNotification({
        message: messageWithDetails,
        recipientId: validatedData.recipientId,
        senderId: req.user.userId,
        jobId: validatedData.jobId
      });

      // 🎪 Award messaging points
      await YachiGamification.awardMessageSent(req.user.userId, messageWithDetails);

      // 🗑️ Clear relevant caches
      await clearMessageCaches(validatedData.jobId, req.user.userId, validatedData.recipientId);

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: {
          message: messageWithDetails,
          delivery: {
            status: 'sent',
            timestamp: new Date().toISOString()
          }
        },
        gamification: {
          pointsAwarded: 5,
          streak: await YachiGamification.getMessageStreak(req.user.userId)
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Send Message Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      code: 'MESSAGE_SEND_FAILED'
    });
  }
});

// 🚀 GET CONVERSATION WITH INTELLIGENT PAGINATION
router.get('/conversation/:jobId/:otherUserId', auth, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const otherUserId = parseInt(req.params.otherUserId);
    const validatedParams = MessageSchema.conversation.parse({
      jobId,
      ...req.query
    });

    // 🛡️ Verify conversation access
    const canAccess = await YachiSecurity.canAccessConversation(
      req.user.userId, 
      otherUserId, 
      jobId
    );

    if (!canAccess.allowed) {
      return res.status(403).json({
        success: false,
        message: canAccess.reason,
        code: 'CONVERSATION_ACCESS_DENIED'
      });
    }

    const cacheKey = CACHE_KEYS.CONVERSATION(jobId, req.user.userId, otherUserId) + 
      `:${validatedParams.page}:${validatedParams.limit}:${validatedParams.before}:${validatedParams.after}`;

    // 🔍 Try cache first
    const cachedMessages = await redis.get(cacheKey);
    if (cachedMessages) {
      return res.json({
        success: true,
        ...JSON.parse(cachedMessages),
        source: 'cache'
      });
    }

    // 🎯 Build query for messages
    const where = {
      jobId,
      [Op.or]: [
        { senderId: req.user.userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: req.user.userId }
      ]
    };

    // ⏰ Time-based filtering
    if (validatedParams.before) {
      where.createdAt = { ...where.createdAt, [Op.lt]: new Date(validatedParams.before) };
    }
    if (validatedParams.after) {
      where.createdAt = { ...where.createdAt, [Op.gt]: new Date(validatedParams.after) };
    }

    const [messages, total] = await Promise.all([
      Message.findAll({
        where,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'onlineStatus']
          },
          {
            model: MessageAttachment,
            as: 'attachments'
          },
          {
            model: Message,
            as: 'repliedTo',
            include: [{
              model: User,
              as: 'sender',
              attributes: ['id', 'name', 'avatar']
            }]
          },
          {
            model: Reaction,
            as: 'reactions',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'avatar']
            }]
          },
          {
            model: MessageRead,
            as: 'reads',
            where: { userId: req.user.userId },
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: validatedParams.limit,
        offset: (validatedParams.page - 1) * validatedParams.limit
      }),
      Message.count({ where })
    ]);

    // 🔄 Reverse for chronological order
    const chronologicalMessages = messages.reverse();

    // ✅ Mark messages as read
    await markMessagesAsRead(req.user.userId, otherUserId, jobId);

    // 🎪 Enhance with gamification data
    const enhancedMessages = await YachiGamification.enhanceMessagesWithGamification(chronologicalMessages);

    const result = {
      messages: enhancedMessages,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        pages: Math.ceil(total / validatedParams.limit),
        hasMore: (validatedParams.page * validatedParams.limit) < total
      },
      conversation: {
        otherUser: await getUserSafeProfile(otherUserId),
        unreadCount: 0, // Reset after marking as read
        canCommunicate: canAccess
      }
    };

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Fetch Conversation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      code: 'FETCH_CONVERSATION_FAILED'
    });
  }
});

// 🚀 GET USER CONVERSATIONS LIST
router.get('/conversations', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const cacheKey = `user_conversations:${req.user.userId}:${page}:${limit}`;
    const cachedConversations = await redis.get(cacheKey);

    if (cachedConversations) {
      return res.json({
        success: true,
        ...JSON.parse(cachedConversations),
        source: 'cache'
      });
    }

    // 🎯 Get recent conversations with last message
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [
          { user1Id: req.user.userId },
          { user2Id: req.user.userId }
        ]
      },
      include: [
        {
          model: Message,
          as: 'lastMessage',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'avatar']
          }]
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [['lastActivity', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 🎯 Enhance with unread counts and user details
    const enhancedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.user1Id === req.user.userId ? conv.user2Id : conv.user1Id;
        const otherUser = await getUserSafeProfile(otherUserId);
        
        const unreadCount = await Message.count({
          where: {
            jobId: conv.jobId,
            senderId: otherUserId,
            recipientId: req.user.userId,
            status: 'delivered'
          }
        });

        return {
          id: conv.id,
          job: conv.job,
          otherUser,
          lastMessage: conv.lastMessage,
          unreadCount,
          lastActivity: conv.lastActivity,
          metadata: await getConversationMetadata(conv.jobId, req.user.userId, otherUserId)
        };
      })
    );

    const total = await Conversation.count({
      where: {
        [Op.or]: [
          { user1Id: req.user.userId },
          { user2Id: req.user.userId }
        ]
      }
    });

    const result = {
      conversations: enhancedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalConversations: total,
        unreadTotal: await getTotalUnreadCount(req.user.userId)
      }
    };

    // 💾 Cache for 1 minute
    await redis.setex(cacheKey, 60, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Conversations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      code: 'FETCH_CONVERSATIONS_FAILED'
    });
  }
});

// 🚀 ADD REACTION TO MESSAGE
router.post('/react', auth, async (req, res) => {
  try {
    const validatedData = MessageSchema.react.parse(req.body);

    const message = await Message.findByPk(validatedData.messageId, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id']
      }]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // 🛡️ Check if user can react to this message
    if (![message.senderId, message.recipientId].includes(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot react to this message',
        code: 'REACTION_UNAUTHORIZED'
      });
    }

    // 🔄 Add or update reaction
    const [reaction, created] = await Reaction.findOrCreate({
      where: {
        messageId: validatedData.messageId,
        userId: req.user.userId
      },
      defaults: {
        reaction: validatedData.reaction
      }
    });

    if (!created) {
      reaction.reaction = validatedData.reaction;
      await reaction.save();
    }

    // 📡 Broadcast reaction update
    req.io.to(`job_${message.jobId}`).emit('message_reacted', {
      messageId: validatedData.messageId,
      reaction: validatedData.reaction,
      userId: req.user.userId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        reaction,
        created
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Add Reaction Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      code: 'ADD_REACTION_FAILED'
    });
  }
});

// 🚀 TYPING INDICATOR
router.post('/typing', auth, async (req, res) => {
  try {
    const validatedData = MessageSchema.typing.parse(req.body);

    const cacheKey = CACHE_KEYS.TYPING_STATUS(validatedData.jobId, req.user.userId);
    
    if (validatedData.isTyping) {
      // 💾 Set typing status with 5-second expiry
      await redis.setex(cacheKey, 5, 'typing');
      
      // 📡 Broadcast typing indicator
      req.io.to(`job_${validatedData.jobId}`).emit('user_typing', {
        jobId: validatedData.jobId,
        userId: req.user.userId,
        recipientId: validatedData.recipientId,
        isTyping: true,
        timestamp: new Date().toISOString()
      });
    } else {
      // 🗑️ Clear typing status
      await redis.del(cacheKey);
      
      req.io.to(`job_${validatedData.jobId}`).emit('user_typing', {
        jobId: validatedData.jobId,
        userId: req.user.userId,
        recipientId: validatedData.recipientId,
        isTyping: false,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Typing status ${validatedData.isTyping ? 'started' : 'stopped'}`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Typing Indicator Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update typing status',
      code: 'TYPING_UPDATE_FAILED'
    });
  }
});

// 🚀 MARK MESSAGES AS READ
router.post('/conversation/:jobId/:otherUserId/read', auth, async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const otherUserId = parseInt(req.params.otherUserId);

    const updated = await Message.update({
      status: 'read',
      readAt: new Date()
    }, {
      where: {
        jobId,
        senderId: otherUserId,
        recipientId: req.user.userId,
        status: 'delivered'
      }
    });

    // 📡 Notify sender about read receipt
    req.io.to(`job_${jobId}`).emit('messages_read', {
      jobId,
      readerId: req.user.userId,
      senderId: otherUserId,
      timestamp: new Date().toISOString()
    });

    // 🗑️ Clear caches
    await clearMessageCaches(jobId, req.user.userId, otherUserId);

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: {
        count: updated[0],
        readAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Mark Messages Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      code: 'MARK_READ_FAILED'
    });
  }
});

// 🚀 DELETE MESSAGE
router.delete('/message/:messageId', auth, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // 🛡️ Check ownership
    if (message.senderId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Can only delete your own messages',
        code: 'DELETE_UNAUTHORIZED'
      });
    }

    // 🕒 Check if within deletion window (5 minutes)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const deletionWindow = 5 * 60 * 1000; // 5 minutes

    if (messageAge > deletionWindow) {
      return res.status(400).json({
        success: false,
        message: 'Message can only be deleted within 5 minutes of sending',
        code: 'DELETION_WINDOW_EXPIRED'
      });
    }

    await Message.destroy({
      where: { id: messageId }
    });

    // 📡 Notify recipient about deletion
    req.io.to(`job_${message.jobId}`).emit('message_deleted', {
      messageId: messageId,
      deletedBy: req.user.userId,
      timestamp: new Date().toISOString()
    });

    // 🗑️ Clear caches
    await clearMessageCaches(message.jobId, req.user.userId, message.recipientId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        messageId: messageId,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete Message Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      code: 'DELETE_MESSAGE_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// ✅ Mark Messages as Read
async function markMessagesAsRead(userId, otherUserId, jobId) {
  await Message.update({
    status: 'read',
    readAt: new Date()
  }, {
    where: {
      jobId,
      senderId: otherUserId,
      recipientId: userId,
      status: 'delivered'
    }
  });

  // 🗑️ Clear unread count cache
  await redis.del(CACHE_KEYS.UNREAD_COUNTS(userId));
}

// 👤 Get User Safe Profile
async function getUserSafeProfile(userId) {
  return await User.findByPk(userId, {
    attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'onlineStatus', 'lastActive'],
    include: [{
      model: UserProfile,
      attributes: ['displayName', 'bio']
    }]
  });
}

// 💬 Get Conversation Summary
async function getConversationSummary(jobId, userId1, userId2) {
  const lastMessage = await Message.findOne({
    where: {
      jobId,
      [Op.or]: [
        { senderId: userId1, recipientId: userId2 },
        { senderId: userId2, recipientId: userId1 }
      ]
    },
    order: [['createdAt', 'DESC']],
    include: [{
      model: User,
      as: 'sender',
      attributes: ['id', 'name', 'avatar']
    }]
  });

  const unreadCount = await Message.count({
    where: {
      jobId,
      senderId: userId2,
      recipientId: userId1,
      status: 'delivered'
    }
  });

  return {
    lastMessage,
    unreadCount,
    updatedAt: lastMessage?.createdAt || new Date()
  };
}

// 🔢 Get Total Unread Count
async function getTotalUnreadCount(userId) {
  const cacheKey = CACHE_KEYS.UNREAD_COUNTS(userId);
  const cachedCount = await redis.get(cacheKey);

  if (cachedCount) {
    return parseInt(cachedCount);
  }

  const count = await Message.count({
    where: {
      recipientId: userId,
      status: 'delivered'
    }
  });

  // 💾 Cache for 30 seconds
  await redis.setex(cacheKey, 30, count.toString());

  return count;
}

// 🗑️ Clear Message Caches
async function clearMessageCaches(jobId, userId1, userId2) {
  const patterns = [
    CACHE_KEYS.CONVERSATION(jobId, userId1, userId2) + '*',
    `user_conversations:${userId1}*`,
    `user_conversations:${userId2}*`,
    CACHE_KEYS.UNREAD_COUNTS(userId1),
    CACHE_KEYS.UNREAD_COUNTS(userId2)
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 📊 Get Conversation Metadata
async function getConversationMetadata(jobId, userId1, userId2) {
  const messageCount = await Message.count({
    where: {
      jobId,
      [Op.or]: [
        { senderId: userId1, recipientId: userId2 },
        { senderId: userId2, recipientId: userId1 }
      ]
    }
  });

  const attachmentCount = await MessageAttachment.count({
    include: [{
      model: Message,
      where: {
        jobId,
        [Op.or]: [
          { senderId: userId1, recipientId: userId2 },
          { senderId: userId2, recipientId: userId1 }
        ]
      }
    }]
  });

  return {
    messageCount,
    attachmentCount,
    startedAt: await getConversationStartDate(jobId, userId1, userId2)
  };
}

// 📅 Get Conversation Start Date
async function getConversationStartDate(jobId, userId1, userId2) {
  const firstMessage = await Message.findOne({
    where: {
      jobId,
      [Op.or]: [
        { senderId: userId1, recipientId: userId2 },
        { senderId: userId2, recipientId: userId1 }
      ]
    },
    order: [['createdAt', 'ASC']],
    attributes: ['createdAt']
  });

  return firstMessage?.createdAt || new Date();
}

module.exports = router;