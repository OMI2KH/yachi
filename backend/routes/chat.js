const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();
const { verifyToken, authorizeRoles } = require('../utils/authHelpers');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { YachiSecurity } = require('../services/yachiSecurity');
const { MessageService } = require('../services/messageService');
const { MediaService } = require('../services/mediaService');
const redis = require('../config/redis');
const socket = require('../config/socket');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const MessageSchema = {
  send: z.object({
    recipientId: z.number().int().positive(),
    content: z.string().min(1).max(2000),
    type: z.enum(['text', 'image', 'video', 'file', 'location', 'system']).default('text'),
    metadata: z.object({
      replyTo: z.number().int().positive().optional(),
      forwardFrom: z.number().int().positive().optional(),
      reactions: z.array(z.string()).optional(),
      urgent: z.boolean().default(false),
      encrypted: z.boolean().default(false)
    }).optional(),
    attachments: z.array(z.object({
      type: z.enum(['image', 'video', 'file', 'audio']),
      url: z.string().url(),
      name: z.string().optional(),
      size: z.number().int().positive().optional(),
      duration: z.number().int().positive().optional()
    })).optional(),
    scheduling: z.object({
      sendAt: z.string().datetime().optional(),
      expireAt: z.string().datetime().optional()
    }).optional()
  }),

  conversation: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(50),
    before: z.string().datetime().optional(),
    after: z.string().datetime().optional(),
    types: z.array(z.string()).optional()
  }),

  update: z.object({
    content: z.string().min(1).max(2000).optional(),
    reactions: z.array(z.string()).optional(),
    metadata: z.object({}).passthrough().optional()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  CONVERSATION: (userId1, userId2) => `messages:conversation:${Math.min(userId1, userId2)}:${Math.max(userId1, userId2)}`,
  USER_CONVERSATIONS: (userId) => `messages:conversations:${userId}`,
  UNREAD_COUNTS: (userId) => `messages:unread:${userId}`,
  MESSAGE: (messageId) => `messages:message:${messageId}`
};

// 🚀 GET CONVERSATION WITH INTELLIGENT PAGINATION
router.get('/conversation/:userId', verifyToken, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    const validatedParams = MessageSchema.conversation.parse(req.query);

    if (isNaN(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // 🛡️ Check if users can communicate
    const canCommunicate = await MessageService.canUsersCommunicate(req.user.userId, otherUserId);
    if (!canCommunicate.allowed) {
      return res.status(403).json({
        success: false,
        message: canCommunicate.reason,
        code: 'COMMUNICATION_RESTRICTED'
      });
    }

    // 🎯 Generate cache key
    const cacheKey = CACHE_KEYS.CONVERSATION(req.user.userId, otherUserId) + 
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

    // 🎯 Build where clause
    const where = {
      OR: [
        { senderId: req.user.userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: req.user.userId }
      ]
    };

    // ⏰ Time-based filtering
    if (validatedParams.before) {
      where.timestamp = { ...where.timestamp, lt: new Date(validatedParams.before) };
    }
    if (validatedParams.after) {
      where.timestamp = { ...where.timestamp, gt: new Date(validatedParams.after) };
    }

    // 🎯 Type filtering
    if (validatedParams.types && validatedParams.types.length > 0) {
      where.type = { in: validatedParams.types };
    }

    // 📊 Get messages with pagination
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              verifiedBadge: true,
              onlineStatus: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              avatar: true,
              verifiedBadge: true
            }
          },
          attachments: true,
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (validatedParams.page - 1) * validatedParams.limit,
        take: validatedParams.limit
      }),
      prisma.message.count({ where })
    ]);

    // 🔄 Reverse for chronological order
    const chronologicalMessages = messages.reverse();

    // ✅ Mark messages as read
    await markMessagesAsRead(req.user.userId, otherUserId);

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
        canCommunicate: canCommunicate
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

// 🚀 SEND MESSAGE WITH ADVANCED FEATURES
router.post('/send', verifyToken, async (req, res) => {
  try {
    const validatedData = MessageSchema.send.parse(req.body);

    // 🛡️ Security and permission checks
    const securityCheck = await YachiSecurity.canSendMessage(req.user.userId, validatedData.recipientId);
    if (!securityCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: securityCheck.reason,
        code: securityCheck.code
      });
    }

    // 💼 Start transaction
    const transaction = await prisma.$transaction(async (prisma) => {
      // 🔐 Encrypt content if needed
      let finalContent = validatedData.content;
      if (validatedData.metadata?.encrypted) {
        finalContent = await MessageService.encryptMessage(validatedData.content, req.user.userId, validatedData.recipientId);
      }

      // 📝 Create message
      const message = await prisma.message.create({
        data: {
          uuid: uuidv4(),
          senderId: req.user.userId,
          recipientId: validatedData.recipientId,
          content: finalContent,
          type: validatedData.type,
          status: 'sent',
          metadata: {
            ...validatedData.metadata,
            encrypted: validatedData.metadata?.encrypted || false,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          },
          timestamp: new Date(),
          ...(validatedData.scheduling?.sendAt && { scheduledFor: new Date(validatedData.scheduling.sendAt) }),
          ...(validatedData.scheduling?.expireAt && { expiresAt: new Date(validatedData.scheduling.expireAt) })
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              verifiedBadge: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              avatar: true,
              verifiedBadge: true
            }
          }
        }
      });

      // 📎 Handle attachments
      if (validatedData.attachments && validatedData.attachments.length > 0) {
        const attachments = await Promise.all(
          validatedData.attachments.map(async (attachment) => {
            const processedAttachment = await MediaService.processMessageAttachment(attachment, req.user.userId);
            
            return prisma.messageAttachment.create({
              data: {
                messageId: message.id,
                type: processedAttachment.type,
                url: processedAttachment.url,
                thumbnailUrl: processedAttachment.thumbnailUrl,
                name: processedAttachment.name,
                size: processedAttachment.size,
                duration: processedAttachment.duration,
                metadata: processedAttachment.metadata
              }
            });
          })
        );

        message.attachments = attachments;
      }

      // 🔄 Handle reply threading
      if (validatedData.metadata?.replyTo) {
        await prisma.message.update({
          where: { id: validatedData.metadata.replyTo },
          data: {
            replyCount: { increment: 1 }
          }
        });
      }

      return message;
    });

    // 📡 Real-time broadcasting
    socket.io.to(`user_${validatedData.recipientId}`).emit('message_received', {
      message: transaction,
      conversation: await getConversationSummary(req.user.userId, validatedData.recipientId)
    });

    // 📧 Push notifications
    await YachiNotifications.sendMessageNotification(transaction);

    // 🎪 Award messaging points
    await YachiGamification.awardMessageSent(req.user.userId, transaction);

    // 🗑️ Clear relevant caches
    await clearMessageCaches(req.user.userId, validatedData.recipientId);

    // 📊 Analytics
    await MessageService.trackMessageAnalytics(transaction);

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: transaction,
        delivery: {
          status: 'sent',
          timestamp: new Date().toISOString(),
          read: false
        }
      },
      gamification: {
        pointsAwarded: 5,
        streak: await YachiGamification.getMessageStreak(req.user.userId)
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

    console.error('Send Message Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      code: 'MESSAGE_SEND_FAILED'
    });
  }
});

// 🎯 GET USER CONVERSATIONS LIST
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const cacheKey = CACHE_KEYS.USER_CONVERSATIONS(req.user.userId) + `:${page}:${limit}`;
    const cachedConversations = await redis.get(cacheKey);

    if (cachedConversations) {
      return res.json({
        success: true,
        ...JSON.parse(cachedConversations),
        source: 'cache'
      });
    }

    // 🎯 Get recent conversations with last message
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT ON (conversation_partner.id)
        conversation_partner.id as userId,
        conversation_partner.name,
        conversation_partner.avatar,
        conversation_partner.verifiedBadge,
        conversation_partner.onlineStatus,
        last_message.content as lastMessage,
        last_message.timestamp as lastMessageAt,
        last_message.type as lastMessageType,
        unread.count as unreadCount
      FROM users conversation_partner
      INNER JOIN messages last_message ON (
        last_message.id = (
          SELECT id FROM messages 
          WHERE (senderId = ${req.user.userId} AND recipientId = conversation_partner.id) 
             OR (senderId = conversation_partner.id AND recipientId = ${req.user.userId})
          ORDER BY timestamp DESC 
          LIMIT 1
        )
      )
      LEFT JOIN (
        SELECT senderId, COUNT(*) as count
        FROM messages 
        WHERE recipientId = ${req.user.userId} AND status = 'delivered'
        GROUP BY senderId
      ) unread ON unread.senderId = conversation_partner.id
      WHERE conversation_partner.id IN (
        SELECT DISTINCT 
          CASE 
            WHEN senderId = ${req.user.userId} THEN recipientId 
            ELSE senderId 
          END as partner_id
        FROM messages 
        WHERE senderId = ${req.user.userId} OR recipientId = ${req.user.userId}
      )
      ORDER BY conversation_partner.id, last_message.timestamp DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;

    const total = await prisma.message.groupBy({
      by: ['senderId', 'recipientId'],
      where: {
        OR: [
          { senderId: req.user.userId },
          { recipientId: req.user.userId }
        ]
      }
    }).then(groups => new Set(groups.flatMap(g => [g.senderId, g.recipientId])).size - 1); // Exclude self

    const result = {
      conversations,
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

// 🎯 MARK MESSAGES AS READ
router.post('/conversation/:userId/read', verifyToken, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);

    if (isNaN(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    const updated = await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: req.user.userId,
        status: 'delivered'
      },
      data: {
        status: 'read',
        readAt: new Date()
      }
    });

    // 📡 Notify sender about read receipt
    socket.io.to(`user_${otherUserId}`).emit('messages_read', {
      readerId: req.user.userId,
      timestamp: new Date()
    });

    // 🗑️ Clear caches
    await clearMessageCaches(req.user.userId, otherUserId);

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: {
        count: updated.count,
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

// 🎯 DELETE MESSAGE
router.delete('/message/:messageId', verifyToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

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
    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    const deletionWindow = 5 * 60 * 1000; // 5 minutes

    if (messageAge > deletionWindow) {
      return res.status(400).json({
        success: false,
        message: 'Message can only be deleted within 5 minutes of sending',
        code: 'DELETION_WINDOW_EXPIRED'
      });
    }

    await prisma.message.delete({
      where: { id: messageId }
    });

    // 📡 Notify recipient about deletion
    socket.io.to(`user_${message.recipientId}`).emit('message_deleted', {
      messageId: messageId,
      deletedBy: req.user.userId
    });

    // 🗑️ Clear caches
    await clearMessageCaches(req.user.userId, message.recipientId);

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

// 🎯 SEARCH MESSAGES
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { query, conversationId, page = 1, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
        code: 'INVALID_QUERY'
      });
    }

    const where = {
      OR: [
        { senderId: req.user.userId },
        { recipientId: req.user.userId }
      ],
      content: {
        contains: query,
        mode: 'insensitive'
      }
    };

    if (conversationId) {
      const otherUserId = parseInt(conversationId);
      where.OR = [
        { senderId: req.user.userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: req.user.userId }
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        query,
        conversationId: conversationId || null
      }
    });

  } catch (error) {
    console.error('Search Messages Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      code: 'SEARCH_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// ✅ Mark Messages as Read
async function markMessagesAsRead(userId, otherUserId) {
  await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      recipientId: userId,
      status: 'delivered'
    },
    data: {
      status: 'read',
      readAt: new Date()
    }
  });

  // 🗑️ Clear unread count cache
  await redis.del(CACHE_KEYS.UNREAD_COUNTS(userId));
}

// 👤 Get User Safe Profile
async function getUserSafeProfile(userId) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatar: true,
      verifiedBadge: true,
      onlineStatus: true,
      lastActive: true
    }
  });
}

// 💬 Get Conversation Summary
async function getConversationSummary(userId1, userId2) {
  const lastMessage = await prisma.message.findFirst({
    where: {
      OR: [
        { senderId: userId1, recipientId: userId2 },
        { senderId: userId2, recipientId: userId1 }
      ]
    },
    orderBy: { timestamp: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });

  const unreadCount = await prisma.message.count({
    where: {
      senderId: userId2,
      recipientId: userId1,
      status: 'delivered'
    }
  });

  return {
    lastMessage,
    unreadCount,
    updatedAt: lastMessage?.timestamp || new Date()
  };
}

// 🔢 Get Total Unread Count
async function getTotalUnreadCount(userId) {
  const cacheKey = CACHE_KEYS.UNREAD_COUNTS(userId);
  const cachedCount = await redis.get(cacheKey);

  if (cachedCount) {
    return parseInt(cachedCount);
  }

  const count = await prisma.message.count({
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
async function clearMessageCaches(userId1, userId2) {
  const patterns = [
    CACHE_KEYS.CONVERSATION(userId1, userId2) + '*',
    CACHE_KEYS.USER_CONVERSATIONS(userId1) + '*',
    CACHE_KEYS.USER_CONVERSATIONS(userId2) + '*',
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

module.exports = router;
