/**
 * Yachi Enterprise Chat Controller
 * Advanced real-time communication with AI-powered features
 * Ethiopian market specialization with multi-language support
 * @version 2.0.0
 * @class ChatController
 */

const { Sequelize, Op } = require('sequelize');
const moment = require('moment-timezone');

// Enterprise Services
const { 
    Chat, 
    Message, 
    User, 
    Booking, 
    Service,
    Notification,
    SecurityLog
} = require('../models');

const { 
    YachiLogger, 
    AuditLogger, 
    PerformanceLogger 
} = require('../utils/logger');

const { 
    RedisManager, 
    CacheService, 
    DistributedLock,
    PubSubService
} = require('../services/cache');

const { 
    AIService, 
    LanguageProcessingService,
    SentimentAnalysisService
} = require('../services/ai');

const { 
    AnalyticsEngine, 
    BusinessIntelligenceService 
} = require('../services/analytics');

const { 
    NotificationOrchestrator,
    SMSService,
    EmailService
} = require('../services/communication');

const { 
    FileProcessingService,
    MediaValidationService
} = require('../services/media');

const { 
    ContentModerationService,
    FraudDetectionService
} = require('../services/security');

const { 
    EthiopianCalendarService,
    TranslationService
} = require('../services/localization');

class ChatController {
    constructor() {
        this.chatConfig = {
            message: {
                maxLength: 2000,
                rateLimit: 10, // messages per minute
                retentionDays: 365,
                supportedLanguages: ['en', 'am', 'om']
            },
            file: {
                maxSize: 50 * 1024 * 1024, // 50MB
                allowedTypes: [
                    'image/jpeg', 'image/png', 'image/gif',
                    'application/pdf', 'application/msword',
                    'video/mp4', 'audio/mpeg'
                ],
                maxFilesPerMessage: 5
            },
            realtime: {
                typingTimeout: 5000, // 5 seconds
                onlineStatusTimeout: 30000, // 30 seconds
                reconnectAttempts: 5
            }
        };

        this.setupChatIntervals();
        this.initializeChatWorkflows();
        this.setupSocketHandlers();
    }

    /**
     * 🏗️ Setup enterprise-grade intervals and background jobs
     */
    setupChatIntervals() {
        // Online status cleanup
        setInterval(() => this.cleanupOnlineStatus(), 60 * 1000); // Every minute
        
        // Message delivery status sync
        setInterval(() => this.syncDeliveryStatus(), 2 * 60 * 1000); // Every 2 minutes
        
        // Chat analytics aggregation
        setInterval(() => this.aggregateChatAnalytics(), 30 * 60 * 1000); // Every 30 minutes
        
        // Expired file cleanup
        setInterval(() => this.cleanupExpiredFiles(), 24 * 60 * 60 * 1000); // Daily
    }

    /**
     * 🔄 Initialize chat workflows and state machines
     */
    initializeChatWorkflows() {
        this.chatWorkflows = {
            BOOKING: this.bookingChatWorkflow.bind(this),
            SUPPORT: this.supportChatWorkflow.bind(this),
            CONSTRUCTION: this.constructionChatWorkflow.bind(this),
            GOVERNMENT: this.governmentChatWorkflow.bind(this)
        };

        this.messageTypes = {
            TEXT: 'text',
            IMAGE: 'image',
            FILE: 'file',
            SYSTEM: 'system',
            LOCATION: 'location',
            PAYMENT: 'payment',
            BOOKING_UPDATE: 'booking_update'
        };
    }

    /**
     * 🔌 Setup Socket.IO event handlers
     */
    setupSocketHandlers() {
        this.socketHandlers = {
            'message:send': this.handleSocketMessage.bind(this),
            'typing:start': this.handleTypingStart.bind(this),
            'typing:stop': this.handleTypingStop.bind(this),
            'message:read': this.handleMessageRead.bind(this),
            'user:online': this.handleUserOnline.bind(this),
            'user:offline': this.handleUserOffline.bind(this)
        };
    }

    /**
     * 💬 ENTERPRISE MESSAGE SENDING
     */
    sendMessage = async (req, res) => {
        const transaction = await this.startTransaction();
        const userId = req.user.userId;
        const lockKey = `chat:send:${userId}`;

        try {
            const lock = await DistributedLock.acquire(lockKey, 5000);
            if (!lock) {
                return this.sendErrorResponse(res, 429, {
                    code: 'MESSAGE_RATE_LIMITED',
                    message: 'Please wait before sending another message'
                });
            }

            const messageData = req.body;
            const clientInfo = this.extractClientInfo(req);

            // 🛡️ Enterprise Validation Chain
            const validationResult = await this.validateEnterpriseMessage(messageData, userId, clientInfo);
            if (!validationResult.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'MESSAGE_VALIDATION_FAILED',
                    message: 'Message validation failed',
                    details: validationResult.errors
                });
            }

            const { chat, recipient } = validationResult;

            // 🚨 Rate Limiting Check
            const rateLimitCheck = await this.checkMessageRateLimit(userId, chat.id);
            if (!rateLimitCheck.allowed) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 429, {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Message rate limit exceeded',
                    retryAfter: rateLimitCheck.retryAfter
                });
            }

            // 🔍 Content Moderation
            const moderationResult = await ContentModerationService.moderateMessage(messageData);
            if (moderationResult.blocked) {
                await this.handleBlockedMessage(userId, messageData, moderationResult, transaction);
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'CONTENT_VIOLATION',
                    message: 'Message contains inappropriate content',
                    reason: moderationResult.reason
                });
            }

            // 🎯 AI-Powered Message Processing
            const aiProcessing = await this.processMessageWithAI(messageData, userId, chat.id);
            
            // 📁 File Processing (if any)
            let fileAttachments = [];
            if (messageData.attachments && messageData.attachments.length > 0) {
                fileAttachments = await this.processMessageAttachments(
                    messageData.attachments, 
                    userId, 
                    transaction
                );
            }

            // 📝 Enterprise Message Creation
            const message = await this.createEnterpriseMessage({
                chatId: chat.id,
                senderId: userId,
                messageData,
                attachments: fileAttachments,
                aiProcessing,
                moderation: moderationResult,
                clientInfo
            }, transaction);

            // 🔄 Real-time Broadcasting
            await this.broadcastMessageToParticipants(message, chat, transaction);

            // 📱 Multi-Channel Notifications
            await this.sendMessageNotifications(message, chat, recipient, transaction);

            // 📊 Comprehensive Analytics
            await AnalyticsEngine.trackMessageSent(message, clientInfo);
            await BusinessIntelligenceService.recordChatEvent('MESSAGE_SENT', message);

            // 🤖 AI-Powered Auto-Responses
            if (aiProcessing.requiresAutoResponse) {
                await this.generateAutoResponse(message, chat, aiProcessing, transaction);
            }

            await transaction.commit();

            // 🚀 Success Response
            return this.sendSuccessResponse(res, 201, {
                message: 'Message sent successfully',
                data: {
                    message: this.sanitizeEnterpriseMessage(message),
                    metadata: {
                        moderation: moderationResult.status,
                        aiProcessing: aiProcessing.appliedFeatures,
                        realtime: {
                            delivered: true,
                            broadcasted: true
                        }
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            await this.handleMessageSendError(error, req);
            
            return this.sendErrorResponse(res, 500, {
                code: 'MESSAGE_SEND_FAILED',
                message: 'Message sending process failed',
                internalCode: error.code,
                supportReference: this.generateSupportReference()
            });
        } finally {
            await DistributedLock.release(lockKey, lock);
        }
    };

    /**
     * 📨 ENTERPRISE MESSAGE RETRIEVAL
     */
    getMessages = async (req, res) => {
        try {
            const { chatId } = req.params;
            const userId = req.user.userId;
            const { 
                page = 1, 
                limit = 50, 
                before = null,
                after = null 
            } = req.query;

            // 🛡️ Authorization Check
            const chat = await Chat.findOne({
                where: { 
                    id: chatId,
                    participants: { [Op.contains]: [userId] }
                },
                include: [
                    {
                        model: Booking,
                        as: 'booking',
                        attributes: ['id', 'status', 'serviceId']
                    }
                ]
            });

            if (!chat) {
                return this.sendErrorResponse(res, 404, {
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found or access denied'
                });
            }

            const cacheKey = `messages:${chatId}:${page}:${limit}:${before}:${after}`;
            
            const messages = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.retrieveEnterpriseMessages(chatId, userId, {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    before,
                    after
                });
            }, { ttl: 60 }); // 1 minute cache for messages

            // 📝 Mark messages as read
            await this.markMessagesAsRead(chatId, userId, messages.latestMessageId);

            return this.sendSuccessResponse(res, 200, {
                message: 'Messages retrieved successfully',
                data: {
                    messages: messages.data,
                    pagination: messages.pagination,
                    chat: this.sanitizeEnterpriseChat(chat),
                    metadata: {
                        unreadCount: messages.unreadCount,
                        totalMessages: messages.pagination.total,
                        hasMore: messages.pagination.hasMore
                    }
                }
            });

        } catch (error) {
            YachiLogger.error('Message retrieval error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'MESSAGE_RETRIEVAL_FAILED',
                message: 'Failed to retrieve messages'
            });
        }
    };

    /**
     * 💬 ENTERPRISE CHAT MANAGEMENT
     */
    getChats = async (req, res) => {
        try {
            const userId = req.user.userId;
            const { 
                page = 1, 
                limit = 20,
                type = 'all' 
            } = req.query;

            const cacheKey = `chats:user:${userId}:${page}:${limit}:${type}`;

            const chats = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.retrieveEnterpriseChats(userId, {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    type
                });
            }, { ttl: 120 }); // 2 minute cache for chats list

            return this.sendSuccessResponse(res, 200, {
                message: 'Chats retrieved successfully',
                data: {
                    chats: chats.data,
                    pagination: chats.pagination,
                    summary: {
                        totalChats: chats.pagination.total,
                        unreadMessages: chats.totalUnread,
                        activeChats: chats.activeCount
                    },
                    metadata: {
                        onlineUsers: await this.getOnlineUsers(chats.data),
                        lastActive: chats.lastActive
                    }
                }
            });

        } catch (error) {
            YachiLogger.error('Chat retrieval error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'CHAT_RETRIEVAL_FAILED',
                message: 'Failed to retrieve chats'
            });
        }
    };

    /**
     * 🔄 REAL-TIME TYPING INDICATORS
     */
    handleTyping = async (req, res) => {
        try {
            const { chatId } = req.params;
            const userId = req.user.userId;
            const { isTyping } = req.body;

            // 🛡️ Authorization Check
            const chat = await Chat.findOne({
                where: { 
                    id: chatId,
                    participants: { [Op.contains]: [userId] }
                }
            });

            if (!chat) {
                return this.sendErrorResponse(res, 404, {
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found'
                });
            }

            // 🔄 Broadcast Typing Status
            await PubSubService.publish(`chat:${chatId}:typing`, {
                userId,
                isTyping,
                timestamp: new Date().toISOString()
            });

            // 💾 Store Typing Status (for offline users)
            await RedisManager.setex(
                `typing:${chatId}:${userId}`,
                10, // 10 second expiry
                JSON.stringify({ isTyping, timestamp: Date.now() })
            );

            return this.sendSuccessResponse(res, 200, {
                message: isTyping ? 'Typing indicator started' : 'Typing indicator stopped',
                data: {
                    chatId,
                    userId,
                    isTyping,
                    broadcasted: true
                }
            });

        } catch (error) {
            YachiLogger.error('Typing indicator error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'TYPING_INDICATOR_FAILED',
                message: 'Failed to update typing indicator'
            });
        }
    };

    /**
     * ✅ MESSAGE READ RECEIPTS
     */
    markAsRead = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { chatId } = req.params;
            const userId = req.user.userId;
            const { messageIds, upToMessageId } = req.body;

            // 🛡️ Authorization Check
            const chat = await Chat.findOne({
                where: { 
                    id: chatId,
                    participants: { [Op.contains]: [userId] }
                },
                transaction
            });

            if (!chat) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found'
                });
            }

            // 📝 Update Read Status
            const readResult = await this.updateMessageReadStatus(
                chatId, 
                userId, 
                { messageIds, upToMessageId }, 
                transaction
            );

            // 🔄 Broadcast Read Receipts
            await this.broadcastReadReceipts(chatId, userId, readResult, transaction);

            // 📊 Analytics
            await AnalyticsEngine.trackMessageRead(chatId, userId, readResult);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Messages marked as read',
                data: {
                    chatId,
                    markedRead: readResult.markedCount,
                    lastRead: readResult.lastReadMessageId,
                    notifications: {
                        sentToParticipants: true
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Mark as read error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'MARK_READ_FAILED',
                message: 'Failed to mark messages as read'
            });
        }
    };

    /**
     * 📎 FILE UPLOAD AND SHARING
     */
    uploadFile = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { chatId } = req.params;
            const userId = req.user.userId;
            const files = req.files;

            if (!files || files.length === 0) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'NO_FILES_PROVIDED',
                    message: 'No files provided for upload'
                });
            }

            // 🛡️ Authorization Check
            const chat = await Chat.findOne({
                where: { 
                    id: chatId,
                    participants: { [Op.contains]: [userId] }
                },
                transaction
            });

            if (!chat) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found'
                });
            }

            // 🚨 File Validation
            const validationResults = await this.validateFiles(files, userId);
            if (!validationResults.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'FILE_VALIDATION_FAILED',
                    message: 'File validation failed',
                    details: validationResults.errors
                });
            }

            // 📁 File Processing
            const processedFiles = await this.processChatFiles(files, userId, transaction);

            // 📝 Create File Message
            const fileMessage = await this.createFileMessage(
                chatId, 
                userId, 
                processedFiles, 
                transaction
            );

            // 🔄 Broadcast File Message
            await this.broadcastMessageToParticipants(fileMessage, chat, transaction);

            // 📊 Analytics
            await AnalyticsEngine.trackFileUpload(fileMessage, processedFiles);

            await transaction.commit();

            return this.sendSuccessResponse(res, 201, {
                message: 'Files uploaded successfully',
                data: {
                    message: this.sanitizeEnterpriseMessage(fileMessage),
                    files: processedFiles.map(file => ({
                        id: file.id,
                        name: file.originalName,
                        size: file.size,
                        type: file.mimeType,
                        url: file.url
                    })),
                    metadata: {
                        totalFiles: processedFiles.length,
                        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0)
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('File upload error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'FILE_UPLOAD_FAILED',
                message: 'File upload process failed'
            });
        }
    };

    /**
     * 🎯 CHAT SEARCH AND DISCOVERY
     */
    searchMessages = async (req, res) => {
        try {
            const { chatId } = req.params;
            const userId = req.user.userId;
            const { 
                query, 
                page = 1, 
                limit = 20,
                filters = {} 
            } = req.query;

            if (!query || query.trim().length < 2) {
                return this.sendErrorResponse(res, 400, {
                    code: 'INVALID_SEARCH_QUERY',
                    message: 'Search query must be at least 2 characters long'
                });
            }

            // 🛡️ Authorization Check
            const chat = await Chat.findOne({
                where: { 
                    id: chatId,
                    participants: { [Op.contains]: [userId] }
                }
            });

            if (!chat) {
                return this.sendErrorResponse(res, 404, {
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found'
                });
            }

            const cacheKey = `search:${chatId}:${userId}:${query}:${page}:${limit}:${JSON.stringify(filters)}`;

            const searchResults = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.performEnterpriseMessageSearch(chatId, userId, {
                    query: query.trim(),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    filters
                });
            }, { ttl: 300 }); // 5 minute cache for search results

            return this.sendSuccessResponse(res, 200, {
                message: 'Search completed successfully',
                data: {
                    results: searchResults.messages,
                    query,
                    pagination: searchResults.pagination,
                    metadata: {
                        totalMatches: searchResults.pagination.total,
                        searchTime: searchResults.searchTime,
                        highlightedTerms: searchResults.highlightedTerms
                    }
                }
            });

        } catch (error) {
            YachiLogger.error('Message search error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'SEARCH_FAILED',
                message: 'Message search process failed'
            });
        }
    };

    /**
     * 📊 CHAT ANALYTICS AND INSIGHTS
     */
    getChatAnalytics = async (req, res) => {
        try {
            const { chatId } = req.params;
            const userId = req.user.userId;
            const { period = 'month' } = req.query;

            // 🛡️ Authorization Check
            const chat = await Chat.findOne({
                where: { 
                    id: chatId,
                    participants: { [Op.contains]: [userId] }
                }
            });

            if (!chat) {
                return this.sendErrorResponse(res, 404, {
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found'
                });
            }

            const cacheKey = `analytics:chat:${chatId}:${period}`;

            const analytics = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.generateChatAnalytics(chatId, userId, period);
            }, { ttl: 600 }); // 10 minute cache

            // 🤖 AI-Powered Insights
            const insights = await AIService.generateChatInsights(analytics, period);

            return this.sendSuccessResponse(res, 200, {
                message: 'Chat analytics retrieved successfully',
                data: {
                    analytics,
                    insights,
                    period,
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            YachiLogger.error('Chat analytics error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'ANALYTICS_RETRIEVAL_FAILED',
                message: 'Failed to retrieve chat analytics'
            });
        }
    };

    /**
     * 🛠️ ENTERPRISE UTILITY METHODS
     */

    /**
     * Validate enterprise message with comprehensive checks
     */
    async validateEnterpriseMessage(messageData, userId, clientInfo) {
        const errors = [];
        const warnings = [];

        // 📝 Basic Validation
        if (!messageData.chatId) {
            errors.push('CHAT_ID_REQUIRED');
        }

        if (!messageData.content && (!messageData.attachments || messageData.attachments.length === 0)) {
            errors.push('CONTENT_OR_ATTACHMENTS_REQUIRED');
        }

        if (messageData.content && messageData.content.length > this.chatConfig.message.maxLength) {
            errors.push('CONTENT_TOO_LONG');
        }

        // 🔍 Chat Existence and Authorization
        const chat = await Chat.findOne({
            where: { 
                id: messageData.chatId,
                participants: { [Op.contains]: [userId] }
            },
            include: [
                {
                    model: User,
                    as: 'participantDetails',
                    attributes: ['id', 'name', 'status']
                }
            ]
        });

        if (!chat) {
            errors.push('CHAT_NOT_FOUND');
            return { valid: false, errors, warnings };
        }

        // 👤 Recipient Validation
        const recipientId = chat.participants.find(id => id !== userId);
        const recipient = chat.participantDetails.find(user => user.id === recipientId);

        if (!recipient || recipient.status !== 'active') {
            errors.push('RECIPIENT_UNAVAILABLE');
        }

        // 📁 Attachment Validation
        if (messageData.attachments && messageData.attachments.length > 0) {
            const attachmentValidation = await this.validateAttachments(messageData.attachments);
            if (!attachmentValidation.valid) {
                errors.push(...attachmentValidation.errors);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            chat,
            recipient
        };
    }

    /**
     * Check message rate limiting
     */
    async checkMessageRateLimit(userId, chatId) {
        const key = `rate_limit:${userId}:${chatId}`;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute

        const currentCount = await RedisManager.get(key) || 0;
        
        if (currentCount >= this.chatConfig.message.rateLimit) {
            const ttl = await RedisManager.ttl(key);
            return {
                allowed: false,
                retryAfter: ttl
            };
        }

        // Increment counter
        if (currentCount === 0) {
            await RedisManager.setex(key, 60, 1); // Set with 1 minute expiry
        } else {
            await RedisManager.incr(key);
        }

        return {
            allowed: true,
            currentCount: parseInt(currentCount) + 1,
            limit: this.chatConfig.message.rateLimit
        };
    }

    /**
     * Process message with AI features
     */
    async processMessageWithAI(messageData, userId, chatId) {
        const features = {
            languageDetection: false,
            translation: false,
            sentimentAnalysis: false,
            autoResponse: false,
            contentSuggestions: false
        };

        const results = {};

        try {
            // 🌍 Language Detection
            if (messageData.content) {
                features.languageDetection = true;
                results.language = await LanguageProcessingService.detectLanguage(messageData.content);
                
                // 🔤 Translation for Ethiopian Languages
                if (results.language.detected !== 'en') {
                    features.translation = true;
                    results.translation = await TranslationService.translateMessage(
                        messageData.content,
                        results.language.detected,
                        'en'
                    );
                }
            }

            // 😊 Sentiment Analysis
            features.sentimentAnalysis = true;
            results.sentiment = await SentimentAnalysisService.analyzeMessage(messageData.content);

            // 🤖 Auto-Response Detection
            if (results.sentiment.score < -0.5) { // Negative sentiment
                features.autoResponse = true;
                results.requiresAutoResponse = true;
                results.suggestedResponse = await AIService.generateComfortResponse(messageData.content);
            }

            // 💡 Content Suggestions
            features.contentSuggestions = true;
            results.suggestions = await AIService.generateMessageSuggestions(messageData.content, chatId);

            return {
                appliedFeatures: features,
                results,
                requiresAutoResponse: results.requiresAutoResponse || false
            };

        } catch (error) {
            YachiLogger.error('AI message processing failed:', error);
            return {
                appliedFeatures: features,
                results: {},
                requiresAutoResponse: false,
                error: 'AI_PROCESSING_FAILED'
            };
        }
    }

    /**
     * Process message attachments
     */
    async processMessageAttachments(attachments, userId, transaction) {
        const processedAttachments = [];

        for (const attachment of attachments) {
            try {
                const processedFile = await FileProcessingService.processChatAttachment(attachment, {
                    userId,
                    maxSize: this.chatConfig.file.maxSize,
                    allowedTypes: this.chatConfig.file.allowedTypes
                });

                if (processedFile.success) {
                    processedAttachments.push(processedFile.data);
                } else {
                    YachiLogger.warn('File processing failed:', processedFile.error);
                }
            } catch (error) {
                YachiLogger.error('Attachment processing error:', error);
            }
        }

        return processedAttachments;
    }

    /**
     * Create enterprise message with comprehensive data
     */
    async createEnterpriseMessage(messageParams, transaction) {
        const {
            chatId,
            senderId,
            messageData,
            attachments,
            aiProcessing,
            moderation,
            clientInfo
        } = messageParams;

        return await Message.create({
            chatId,
            senderId,
            content: messageData.content,
            type: messageData.type || this.messageTypes.TEXT,
            attachments: attachments.map(att => ({
                id: att.id,
                type: att.type,
                url: att.url,
                name: att.originalName,
                size: att.size
            })),
            metadata: {
                creation: clientInfo,
                aiProcessing: aiProcessing.results,
                moderation: {
                    status: moderation.status,
                    flags: moderation.flags,
                    confidence: moderation.confidence
                },
                delivery: {
                    status: 'sent',
                    sentAt: new Date().toISOString()
                },
                version: '2.0.0'
            }
        }, { transaction });
    }

    /**
     * Broadcast message to chat participants
     */
    async broadcastMessageToParticipants(message, chat, transaction) {
        const participants = chat.participants;
        const broadcastPromises = [];

        for (const participantId of participants) {
            if (participantId !== message.senderId) {
                // 🔄 Real-time Socket Broadcast
                broadcastPromises.push(
                    PubSubService.publish(`user:${participantId}:messages`, {
                        type: 'NEW_MESSAGE',
                        message: this.sanitizeEnterpriseMessage(message),
                        chat: this.sanitizeEnterpriseChat(chat)
                    })
                );

                // 💾 Store for offline users
                broadcastPromises.push(
                    RedisManager.lpush(
                        `offline:${participantId}:messages`,
                        JSON.stringify(message)
                    )
                );
            }
        }

        await Promise.allSettled(broadcastPromises);

        // 📝 Update chat last message
        await Chat.update({
            lastMessageAt: new Date(),
            lastMessage: message.content ? 
                message.content.substring(0, 100) : 
                `Sent ${message.attachments?.length || 0} files`,
            unreadCount: Sequelize.literal(`CASE 
                WHEN "unreadCount" IS NULL THEN 1 
                ELSE "unreadCount" + 1 
            END`)
        }, {
            where: { id: chat.id },
            transaction
        });
    }

    /**
     * Send multi-channel notifications for new messages
     */
    async sendMessageNotifications(message, chat, recipient, transaction) {
        const notificationPromises = [];

        // 🔔 Push Notification
        notificationPromises.push(
            NotificationOrchestrator.sendPushNotification(recipient.id, {
                title: `New message from ${message.sender?.name || 'User'}`,
                body: message.content ? 
                    message.content.substring(0, 100) : 
                    'Sent an attachment',
                data: {
                    chatId: chat.id,
                    messageId: message.id,
                    type: 'NEW_MESSAGE'
                }
            })
        );

        // 📧 Email Notification (if offline for long)
        const isOnline = await RedisManager.get(`user:${recipient.id}:online`);
        if (!isOnline) {
            notificationPromises.push(
                EmailService.sendMessageNotification(recipient.email, {
                    senderName: message.sender?.name,
                    messagePreview: message.content?.substring(0, 150),
                    chatId: chat.id
                })
            );
        }

        // 📱 SMS Notification (for urgent messages)
        if (chat.bookingId && message.type === this.messageTypes.BOOKING_UPDATE) {
            notificationPromises.push(
                SMSService.sendMessageAlert(recipient.phone, {
                    sender: message.sender?.name,
                    chatId: chat.id
                })
            );
        }

        await Promise.allSettled(notificationPromises);
    }

    /**
     * Retrieve enterprise messages with advanced features
     */
    async retrieveEnterpriseMessages(chatId, userId, options) {
        const { page, limit, before, after } = options;

        const whereConditions = { chatId };

        // ⏰ Time-based filtering
        if (before) {
            whereConditions.createdAt = { [Op.lt]: new Date(before) };
        } else if (after) {
            whereConditions.createdAt = { [Op.gt]: new Date(after) };
        }

        const messages = await Message.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: (page - 1) * limit
        });

        // 📊 Calculate unread count
        const unreadCount = await Message.count({
            where: {
                chatId,
                senderId: { [Op.ne]: userId },
                readBy: { [Op.not]: { [Op.contains]: [userId] } }
            }
        });

        const latestMessage = messages.rows[0];

        return {
            data: messages.rows.map(msg => this.sanitizeEnterpriseMessage(msg)).reverse(),
            pagination: {
                page,
                limit,
                total: messages.count,
                pages: Math.ceil(messages.count / limit),
                hasMore: (page * limit) < messages.count
            },
            unreadCount,
            latestMessageId: latestMessage?.id || null
        };
    }

    /**
     * Handle Socket.IO message events
     */
    async handleSocketMessage(socket, data) {
        try {
            const userId = socket.userId;
            const { chatId, content, type, attachments } = data;

            // 🛡️ Validation
            const validation = await this.validateEnterpriseMessage(
                { chatId, content, type, attachments }, 
                userId, 
                { ip: socket.handshake.address }
            );

            if (!validation.valid) {
                socket.emit('message:error', {
                    code: 'VALIDATION_FAILED',
                    errors: validation.errors
                });
                return;
            }

            // 📝 Create and broadcast message
            const message = await this.createEnterpriseMessage({
                chatId,
                senderId: userId,
                messageData: { content, type, attachments },
                attachments: [],
                aiProcessing: {},
                moderation: { status: 'approved' },
                clientInfo: { ip: socket.handshake.address }
            });

            await this.broadcastMessageToParticipants(message, validation.chat);

            // ✅ Confirm delivery to sender
            socket.emit('message:delivered', {
                messageId: message.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            YachiLogger.error('Socket message handling error:', error);
            socket.emit('message:error', {
                code: 'PROCESSING_FAILED',
                message: 'Failed to process message'
            });
        }
    }

    /**
     * Standardized success response
     */
    sendSuccessResponse(res, statusCode, data) {
        return res.status(statusCode).json({
            success: true,
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Standardized error response
     */
    sendErrorResponse(res, statusCode, error) {
        return res.status(statusCode).json({
            success: false,
            timestamp: new Date().toISOString(),
            error: {
                ...error,
                referenceId: this.generateSupportReference()
            }
        });
    }

    /**
     * Generate unique support reference
     */
    generateSupportReference() {
        return `YCH${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    /**
     * Start database transaction with retry logic
     */
    async startTransaction() {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await sequelize.transaction();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
    }

    /**
     * Extract comprehensive client information
     */
    extractClientInfo(req) {
        return {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            fingerprint: req.headers['x-client-fingerprint'] || this.generateClientFingerprint(req),
            geoLocation: req.headers['x-geo-location'],
            deviceInfo: {
                type: req.headers['x-device-type'],
                os: req.headers['x-device-os'],
                browser: req.headers['x-device-browser']
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Sanitize enterprise message for response
     */
    sanitizeEnterpriseMessage(message) {
        const sanitized = { ...message.toJSON() };
        
        // Remove sensitive data
        delete sanitized.metadata?.creation?.ip;
        delete sanitized.metadata?.creation?.userAgent;
        delete sanitized.metadata?.moderation?.flags;
        
        return sanitized;
    }

    /**
     * Sanitize enterprise chat for response
     */
    sanitizeEnterpriseChat(chat) {
        const sanitized = { ...chat.toJSON() };
        
        // Remove sensitive participant data
        if (sanitized.participantDetails) {
            sanitized.participantDetails = sanitized.participantDetails.map(participant => ({
                id: participant.id,
                name: participant.name,
                avatar: participant.avatar,
                isOnline: participant.isOnline || false
            }));
        }
        
        return sanitized;
    }
}

// 🚀 Export enterprise controller
module.exports = ChatController;