import { Platform } from 'react-native';
import { 
  CHAT_CONFIG, 
  MESSAGE_TYPES, 
  MESSAGE_STATUS,
  CONVERSATION_TYPES 
} from '../config/chat';
import { 
  SECURITY_LEVELS,
  ENCRYPTION_LEVELS 
} from '../config/security';
import { 
  validateMessageContent,
  sanitizeMessageText,
  encryptMessage,
  decryptMessage 
} from '../utils/security';
import { 
  formatEthiopianDate,
  formatMessageTime 
} from '../utils/formatters';
import { 
  uploadFile,
  validateFileType,
  validateFileSize 
} from '../services/upload-service';
import { 
  sendPushNotification,
  scheduleLocalNotification 
} from '../services/notification-service';
import { 
  trackChatEvent,
  logSecurityEvent 
} from '../services/analytics-service';
import api from './api';

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageQueue = [];
    this.typingTimeouts = new Map();
    this.conversationCache = new Map();
    this.messageCache = new Map();
    this.subscriptions = new Map();
  }

  // ==================== REAL-TIME COMMUNICATION ====================

  /**
   * Initialize WebSocket connection for real-time chat
   */
  async initializeSocket(userId, token) {
    try {
      if (this.socket) {
        await this.disconnect();
      }

      const wsUrl = `${CHAT_CONFIG.WS_BASE_URL}?userId=${userId}&token=${token}`;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('Chat WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.processMessageQueue();
        this.emit('connection_established');
      };

      this.socket.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };

      this.socket.onclose = (event) => {
        console.log('Chat WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.handleReconnection();
      };

      this.socket.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        this.emit('connection_error', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      throw new Error('SOCKET_INIT_FAILED');
    }
  }

  /**
   * Handle WebSocket reconnection with exponential backoff
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection_lost');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(async () => {
      this.reconnectAttempts++;
      console.log(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      try {
        // Get fresh token and retry connection
        const authService = await import('./auth-service');
        const { user, token } = authService.default.getCurrentSession();
        
        if (user && token) {
          await this.initializeSocket(user.id, token);
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Send message via WebSocket with guaranteed delivery
   */
  async sendRealTimeMessage(message) {
    try {
      if (!this.isConnected || !this.socket) {
        // Queue message for later delivery
        this.messageQueue.push({
          ...message,
          timestamp: Date.now(),
          retryCount: 0
        });
        throw new Error('SOCKET_NOT_CONNECTED');
      }

      const messageWithMetadata = {
        ...message,
        messageId: this.generateMessageId(),
        sentAt: new Date().toISOString(),
        deliveryAttempt: 1
      };

      this.socket.send(JSON.stringify(messageWithMetadata));

      // Track message delivery
      this.trackMessageDelivery(messageWithMetadata.messageId);

      return messageWithMetadata;

    } catch (error) {
      console.error('Failed to send real-time message:', error);
      throw error;
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  async processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        await this.sendRealTimeMessage(message);
      } catch (error) {
        // Re-queue failed messages with retry limit
        if (message.retryCount < 3) {
          message.retryCount++;
          this.messageQueue.push(message);
        } else {
          console.error('Message failed after max retries:', message);
          this.emit('message_delivery_failed', message);
        }
      }
    }
  }

  // ==================== MESSAGE MANAGEMENT ====================

  /**
   * Send a message with comprehensive validation and encryption
   */
  async sendMessage(conversationId, messageData, options = {}) {
    try {
      const {
        type = MESSAGE_TYPES.TEXT,
        encryptionLevel = ENCRYPTION_LEVELS.STANDARD,
        replyTo = null,
        tempId = null
      } = options;

      // Validate inputs
      const validation = await this.validateMessage(conversationId, messageData, type);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate temporary ID for optimistic updates
      const messageTempId = tempId || this.generateMessageId();

      // Create message object
      const message = {
        id: messageTempId,
        conversationId,
        type,
        content: messageData.content,
        senderId: messageData.senderId,
        timestamp: new Date().toISOString(),
        status: MESSAGE_STATUS.SENDING,
        encryptionLevel,
        replyTo: replyTo || null,
        metadata: {
          deviceInfo: this.getDeviceInfo(),
          userAgent: navigator?.userAgent,
          ...messageData.metadata
        },
        _temp: true
      };

      // Handle media upload if applicable
      if (type !== MESSAGE_TYPES.TEXT && messageData.file) {
        const uploadResult = await this.handleMediaUpload(messageData.file, type);
        message.content = uploadResult.url;
        message.metadata.fileInfo = uploadResult.fileInfo;
        message.metadata.uploadId = uploadResult.uploadId;
      }

      // Encrypt sensitive message content
      if (encryptionLevel > ENCRYPTION_LEVELS.NONE) {
        message.content = await encryptMessage(message.content, encryptionLevel);
        message.isEncrypted = true;
      }

      // Sanitize text content
      if (type === MESSAGE_TYPES.TEXT) {
        message.content = sanitizeMessageText(message.content);
      }

      // Optimistically add to cache
      this.addMessageToCache(conversationId, message);

      // Send via real-time connection
      let deliveryResult;
      try {
        deliveryResult = await this.sendRealTimeMessage({
          type: 'message',
          payload: message
        });
      } catch (socketError) {
        // Fallback to HTTP API if WebSocket fails
        deliveryResult = await this.sendMessageViaAPI(conversationId, message);
      }

      // Update cache with server response
      this.updateMessageInCache(conversationId, messageTempId, {
        id: deliveryResult.id,
        status: MESSAGE_STATUS.SENT,
        timestamp: deliveryResult.timestamp,
        serverId: deliveryResult.serverId,
        _temp: false
      });

      // Send push notifications
      await this.sendMessageNotifications(conversationId, message);

      // Track analytics
      await trackChatEvent('message_sent', {
        conversationId,
        messageId: deliveryResult.id,
        messageType: type,
        encryptionLevel,
        hasMedia: type !== MESSAGE_TYPES.TEXT
      });

      await logSecurityEvent('message_sent', {
        conversationId,
        messageId: deliveryResult.id,
        senderId: messageData.senderId,
        messageType: type
      });

      return deliveryResult;

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update message status to failed
      if (conversationId && tempId) {
        this.updateMessageInCache(conversationId, tempId, {
          status: MESSAGE_STATUS.FAILED,
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }

      throw this.handleChatError(error);
    }
  }

  /**
   * Fallback method to send message via HTTP API
   */
  async sendMessageViaAPI(conversationId, message) {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        message
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message via API');
      }

      return response.data.message;

    } catch (error) {
      console.error('API message send failed:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(conversationId, options = {}) {
    try {
      const {
        before = null,
        after = null,
        limit = CHAT_CONFIG.PAGINATION.LIMIT,
        forceRefresh = false,
        includeDeleted = false
      } = options;

      // Check cache first
      const cacheKey = this.getMessagesCacheKey(conversationId, options);
      if (!forceRefresh) {
        const cachedMessages = this.getMessageCache(cacheKey);
        if (cachedMessages) {
          return cachedMessages;
        }
      }

      const params = {
        limit,
        includeDeleted,
        ...(before && { before }),
        ...(after && { after })
      };

      const response = await api.get(
        `/chat/conversations/${conversationId}/messages`,
        params
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch messages');
      }

      const { messages, pagination } = response.data;

      // Process messages (decrypt, format, etc.)
      const processedMessages = await this.processIncomingMessages(messages);

      const result = {
        messages: processedMessages,
        pagination: {
          hasMore: pagination.hasMore,
          nextCursor: pagination.nextCursor,
          total: pagination.total
        }
      };

      // Cache the results
      this.setMessageCache(cacheKey, result);

      // Update conversation cache
      this.updateConversationCache(conversationId, {
        lastMessage: processedMessages[0],
        updatedAt: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error('Failed to get messages:', error);
      throw this.handleChatError(error);
    }
  }

  /**
   * Delete a message with options for everyone or just sender
   */
  async deleteMessage(conversationId, messageId, options = {}) {
    try {
      const {
        forEveryone = false,
        deleteReason = 'user_deleted'
      } = options;

      const response = await api.delete(
        `/chat/messages/${messageId}`,
        { forEveryone, deleteReason }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete message');
      }

      // Update local cache
      if (forEveryone) {
        this.removeMessageFromCache(conversationId, messageId);
      } else {
        this.updateMessageInCache(conversationId, messageId, {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deleteReason
        });
      }

      await trackChatEvent('message_deleted', {
        conversationId,
        messageId,
        forEveryone,
        deleteReason
      });

      return {
        success: true,
        message: 'Message deleted successfully'
      };

    } catch (error) {
      console.error('Failed to delete message:', error);
      throw this.handleChatError(error);
    }
  }

  // ==================== CONVERSATION MANAGEMENT ====================

  /**
   * Get all conversations for user
   */
  async getConversations(options = {}) {
    try {
      const {
        forceRefresh = false,
        includeUnreadCounts = true,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = options;

      // Check cache first
      if (!forceRefresh) {
        const cachedConversations = this.getConversationCache('all');
        if (cachedConversations) {
          return cachedConversations;
        }
      }

      const params = {
        includeUnreadCounts,
        sortBy,
        sortOrder
      };

      const response = await api.get('/chat/conversations', params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch conversations');
      }

      const conversations = response.data.conversations;

      // Cache conversations
      this.setConversationCache('all', conversations);

      // Update unread counts
      if (includeUnreadCounts) {
        this.updateUnreadCounts(conversations);
      }

      return conversations;

    } catch (error) {
      console.error('Failed to get conversations:', error);
      throw this.handleChatError(error);
    }
  }

  /**
   * Create or get existing conversation
   */
  async getOrCreateConversation(participantIds, options = {}) {
    try {
      const {
        type = CONVERSATION_TYPES.DIRECT,
        title = null,
        metadata = {},
        initialMessage = null
      } = options;

      // Validate participants
      if (!participantIds || participantIds.length === 0) {
        throw new Error('At least one participant is required');
      }

      // For direct messages, check if conversation already exists
      if (type === CONVERSATION_TYPES.DIRECT && participantIds.length === 2) {
        const existingConversation = await this.findExistingConversation(participantIds);
        if (existingConversation) {
          return existingConversation;
        }
      }

      // Create new conversation
      const conversationData = {
        type,
        participantIds,
        title: title || this.generateConversationTitle(participantIds, type),
        metadata,
        initialMessage
      };

      const response = await api.post('/chat/conversations', conversationData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create conversation');
      }

      const conversation = response.data.conversation;

      // Clear conversations cache
      this.invalidateConversationsCache();

      await trackChatEvent('conversation_created', {
        conversationId: conversation.id,
        type,
        participantCount: participantIds.length
      });

      return conversation;

    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw this.handleChatError(error);
    }
  }

  /**
   * Update conversation details
   */
  async updateConversation(conversationId, updates, options = {}) {
    try {
      const validation = this.validateConversationUpdates(updates);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.put(
        `/chat/conversations/${conversationId}`,
        updates
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update conversation');
      }

      const updatedConversation = response.data.conversation;

      // Update cache
      this.setConversationCache(conversationId, updatedConversation);
      this.invalidateConversationsCache();

      await trackChatEvent('conversation_updated', {
        conversationId,
        updatedFields: Object.keys(updates)
      });

      return updatedConversation;

    } catch (error) {
      console.error('Failed to update conversation:', error);
      throw this.handleChatError(error);
    }
  }

  // ==================== MESSAGE STATUS & DELIVERY ====================

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId, messageIds = []) {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/read`,
        { messageIds }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark messages as read');
      }

      // Update local cache
      if (messageIds.length > 0) {
        this.updateMessagesStatus(conversationId, messageIds, MESSAGE_STATUS.READ);
      }

      // Update unread count
      this.updateUnreadCount(conversationId, 0);

      // Send read receipts via WebSocket
      if (this.isConnected) {
        this.sendRealTimeMessage({
          type: 'read_receipt',
          payload: {
            conversationId,
            messageIds,
            readAt: new Date().toISOString()
          }
        });
      }

      return {
        success: true,
        readCount: response.data.readCount
      };

    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw this.handleChatError(error);
    }
  }

  /**
   * Mark messages as delivered
   */
  async markAsDelivered(conversationId, messageIds = []) {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/delivered`,
        { messageIds }
      );

      if (!response.success) {
        console.warn('Failed to mark messages as delivered:', response.error);
        return { success: false };
      }

      // Update local cache
      if (messageIds.length > 0) {
        this.updateMessagesStatus(conversationId, messageIds, MESSAGE_STATUS.DELIVERED);
      }

      return {
        success: true,
        deliveredCount: response.data.deliveredCount
      };

    } catch (error) {
      console.error('Failed to mark messages as delivered:', error);
      return { success: false };
    }
  }

  /**
   * Track message delivery status
   */
  async trackMessageDelivery(messageId) {
    const deliveryTimeout = setTimeout(async () => {
      // If message not delivered within timeout, mark as failed
      this.updateMessageStatus(messageId, MESSAGE_STATUS.FAILED);
      
      await trackChatEvent('message_delivery_failed', {
        messageId,
        reason: 'delivery_timeout'
      });
    }, CHAT_CONFIG.DELIVERY_TIMEOUT);

    this.deliveryTimeouts.set(messageId, deliveryTimeout);
  }

  // ==================== TYPING INDICATORS ====================

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId, isTyping = true) {
    try {
      if (!this.isConnected) return;

      await this.sendRealTimeMessage({
        type: 'typing_indicator',
        payload: {
          conversationId,
          isTyping,
          userId: await this.getCurrentUserId(),
          timestamp: new Date().toISOString()
        }
      });

      // Clear previous timeout
      if (this.typingTimeouts.has(conversationId)) {
        clearTimeout(this.typingTimeouts.get(conversationId));
      }

      // Set timeout to automatically stop typing indicator
      if (isTyping) {
        const timeout = setTimeout(() => {
          this.sendTypingIndicator(conversationId, false);
        }, CHAT_CONFIG.TYPING_TIMEOUT);

        this.typingTimeouts.set(conversationId, timeout);
      }

    } catch (error) {
      console.warn('Failed to send typing indicator:', error);
    }
  }

  // ==================== MEDIA HANDLING ====================

  /**
   * Handle media file upload for messages
   */
  async handleMediaUpload(file, mediaType) {
    try {
      // Validate file
      const validation = await validateFileType(file, mediaType);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const sizeValidation = validateFileSize(file.size, mediaType);
      if (!sizeValidation.isValid) {
        throw new Error(sizeValidation.error);
      }

      // Upload file
      const uploadResult = await uploadFile(file, {
        category: 'chat',
        mediaType,
        compression: CHAT_CONFIG.MEDIA_COMPRESSION[mediaType]
      });

      return {
        url: uploadResult.url,
        fileInfo: {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          dimensions: uploadResult.dimensions,
          duration: uploadResult.duration
        },
        uploadId: uploadResult.uploadId
      };

    } catch (error) {
      console.error('Media upload failed:', error);
      throw new Error(`MEDIA_UPLOAD_FAILED: ${error.message}`);
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Send push notifications for new messages
   */
  async sendMessageNotifications(conversationId, message) {
    try {
      // Get conversation details
      const conversation = await this.getConversationById(conversationId);
      if (!conversation) return;

      // Don't send notifications for system messages or if user is active
      if (message.type === MESSAGE_TYPES.SYSTEM || this.isUserActive()) {
        return;
      }

      const notificationPayload = {
        title: this.getNotificationTitle(conversation, message),
        body: this.getNotificationBody(message),
        data: {
          type: 'new_message',
          conversationId,
          messageId: message.id,
          senderId: message.senderId
        },
        priority: 'high',
        badge: await this.getUnreadCount() + 1
      };

      // Send push notification
      await sendPushNotification(conversation.participants, notificationPayload);

      // Schedule local notification for mobile
      if (Platform.OS !== 'web') {
        await scheduleLocalNotification(notificationPayload);
      }

    } catch (error) {
      console.warn('Failed to send message notifications:', error);
    }
  }

  // ==================== SECURITY & VALIDATION ====================

  /**
   * Validate message before sending
   */
  async validateMessage(conversationId, messageData, messageType) {
    const errors = [];

    // Check conversation exists and user is participant
    try {
      const conversation = await this.getConversationById(conversationId);
      if (!conversation) {
        errors.push('Conversation not found');
      } else if (!conversation.participants.includes(messageData.senderId)) {
        errors.push('User not in conversation');
      }
    } catch (error) {
      errors.push('Failed to validate conversation');
    }

    // Validate message content
    const contentValidation = validateMessageContent(messageData.content, messageType);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors);
    }

    // Check rate limiting
    if (await this.isRateLimited(messageData.senderId)) {
      errors.push('Message rate limit exceeded');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user is rate limited
   */
  async isRateLimited(userId) {
    const now = Date.now();
    const userMessages = this.getMessageCache(`user_${userId}`) || [];
    
    const recentMessages = userMessages.filter(msg => 
      now - new Date(msg.timestamp).getTime() < CHAT_CONFIG.RATE_LIMIT.WINDOW
    );

    return recentMessages.length >= CHAT_CONFIG.RATE_LIMIT.MAX_MESSAGES;
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Add message to cache
   */
  addMessageToCache(conversationId, message) {
    const cacheKey = `messages_${conversationId}`;
    const cached = this.messageCache.get(cacheKey) || [];
    this.messageCache.set(cacheKey, [message, ...cached]);
  }

  /**
   * Update message in cache
   */
  updateMessageInCache(conversationId, messageId, updates) {
    const cacheKey = `messages_${conversationId}`;
    const cached = this.messageCache.get(cacheKey);
    
    if (cached) {
      const updated = cached.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      this.messageCache.set(cacheKey, updated);
    }
  }

  /**
   * Get messages cache key
   */
  getMessagesCacheKey(conversationId, options) {
    return `messages_${conversationId}_${JSON.stringify(options)}`;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId() {
    try {
      const authService = await import('./auth-service');
      const session = authService.default.getCurrentSession();
      return session?.user?.id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is currently active
   */
  isUserActive() {
    // Implement based on your app's activity tracking
    return document.hasFocus?.() || true;
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model,
      brand: Platform.constants?.Brand,
      userAgent: navigator?.userAgent
    };
  }

  /**
   * Handle chat-specific errors
   */
  handleChatError(error) {
    const errorMap = {
      'SOCKET_NOT_CONNECTED': 'Real-time connection unavailable',
      'MESSAGE_TOO_LONG': `Message must be less than ${CHAT_CONFIG.LIMITS.MESSAGE_LENGTH} characters`,
      'MEDIA_UPLOAD_FAILED': 'Failed to upload media file',
      'RATE_LIMIT_EXCEEDED': 'Please wait before sending more messages',
      'INVALID_CONVERSATION': 'Conversation not found or access denied'
    };

    const message = errorMap[error.message] || 
                   error.response?.data?.message || 
                   'Chat operation failed';

    return new Error(message);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    this.messageCache.clear();
    this.conversationCache.clear();
    
    this.isConnected = false;
  }

  // ==================== EVENT EMITTER ====================

  /**
   * Simple event emitter for real-time updates
   */
  on(event, callback) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event).add(callback);
  }

  off(event, callback) {
    if (this.subscriptions.has(event)) {
      this.subscriptions.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.subscriptions.has(event)) {
      this.subscriptions.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleIncomingMessage(messageData) {
    try {
      const message = JSON.parse(messageData);
      
      switch (message.type) {
        case 'new_message':
          this.handleNewMessage(message.payload);
          break;
        case 'message_update':
          this.handleMessageUpdate(message.payload);
          break;
        case 'typing_indicator':
          this.handleTypingIndicator(message.payload);
          break;
        case 'read_receipt':
          this.handleReadReceipt(message.payload);
          break;
        case 'conversation_update':
          this.handleConversationUpdate(message.payload);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse incoming message:', error);
    }
  }

  /**
   * Handle new incoming message
   */
  async handleNewMessage(message) {
    try {
      // Process and decrypt message
      const processedMessage = await this.processIncomingMessage(message);
      
      // Add to cache
      this.addMessageToCache(message.conversationId, processedMessage);
      
      // Emit event
      this.emit('new_message', processedMessage);
      
      // Update conversation
      this.updateConversationCache(message.conversationId, {
        lastMessage: processedMessage,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to handle new message:', error);
    }
  }

  /**
   * Process incoming messages (decryption, formatting, etc.)
   */
  async processIncomingMessages(messages) {
    return Promise.all(messages.map(msg => this.processIncomingMessage(msg)));
  }

  async processIncomingMessage(message) {
    try {
      // Decrypt message if encrypted
      if (message.isEncrypted && message.encryptionLevel > ENCRYPTION_LEVELS.NONE) {
        message.content = await decryptMessage(message.content, message.encryptionLevel);
      }

      // Format timestamps
      message.formattedTime = formatMessageTime(message.timestamp);
      message.formattedDate = formatEthiopianDate(message.timestamp);

      return message;
    } catch (error) {
      console.error('Failed to process incoming message:', error);
      return message;
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;