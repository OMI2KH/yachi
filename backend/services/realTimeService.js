const { CacheService } = require('./cacheService');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiGamification } = require('./yachiGamification');
const { YachiSecurity } = require('./yachiSecurity');

class RealTimeService {
  static io = null;
  static connectedUsers = new Map();
  static onlineWorkers = new Set();
  static onlineClients = new Set();
  static roomSubscriptions = new Map();
  static messageQueue = [];
  static isProcessingQueue = false;

  // 🚀 ENHANCED INITIALIZATION
  static initialize(io) {
    this.io = io;

    // Middleware for authentication and rate limiting
    io.use(this.authenticateSocket.bind(this));
    io.use(this.rateLimitSocket.bind(this));

    io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Start background processors
    this.startBackgroundProcessors();
    
    console.log('✅ Yachi RealTime Service initialized');
  }

  // 🛡️ SOCKET AUTHENTICATION MIDDLEWARE
  static async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = await YachiSecurity.verifySocketToken(token);
      if (!user) {
        return next(new Error('Invalid authentication token'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userData = user;
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }

  // 🛡️ RATE LIMITING MIDDLEWARE
  static async rateLimitSocket(socket, next) {
    const key = `socket_rate_limit:${socket.handshake.address}`;
    const limit = await CacheService.checkRateLimit(key, 100, 60000); // 100 connections per minute
    
    if (!limit.allowed) {
      return next(new Error('Rate limit exceeded'));
    }
    
    next();
  }

  // 🎯 CONNECTION HANDLER
  static handleConnection(socket) {
    const userId = socket.userId;
    const userRole = socket.userRole;

    console.log(`🔗 Yachi ${userRole} connected: ${socket.id} (User: ${userId})`);

    // Track connected user
    this.connectedUsers.set(socket.id, {
      userId,
      userRole,
      socket,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Join user to personal room
    socket.join(this.getUserRoom(userId));
    
    // Track online status
    if (userRole === 'provider' || userRole === 'graduate') {
      this.onlineWorkers.add(userId);
      this.emitToRoom('workers_online', 'workerOnline', { userId, online: true });
    } else {
      this.onlineClients.add(userId);
    }

    // 📱 CORE EVENT HANDLERS
    this.setupCoreHandlers(socket);
    
    // 💬 CHAT EVENT HANDLERS
    this.setupChatHandlers(socket);
    
    // 🎪 GAMIFICATION EVENT HANDLERS
    this.setupGamificationHandlers(socket);
    
    // 🔔 NOTIFICATION HANDLERS
    this.setupNotificationHandlers(socket);
    
    // 📊 ANALYTICS HANDLERS
    this.setupAnalyticsHandlers(socket);

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });

    // Send connection confirmation
    socket.emit('connectionEstablished', {
      socketId: socket.id,
      userId,
      userRole,
      serverTime: new Date().toISOString(),
      onlineWorkers: this.onlineWorkers.size,
      onlineClients: this.onlineClients.size
    });

    // Track connection analytics
    YachiAnalytics.trackUserConnection(userId, userRole, 'connect');
  }

  // 📱 CORE EVENT HANDLERS
  static setupCoreHandlers(socket) {
    const userId = socket.userId;
    const userRole = socket.userRole;

    // Service booking events
    socket.on('bookService', async (bookingData) => {
      try {
        await this.handleServiceBooking(socket, bookingData);
      } catch (error) {
        socket.emit('bookingError', { error: error.message });
      }
    });

    // Booking status updates
    socket.on('updateBookingStatus', async (updateData) => {
      try {
        await this.handleBookingStatusUpdate(socket, updateData);
      } catch (error) {
        socket.emit('bookingUpdateError', { error: error.message });
      }
    });

    // Worker availability
    socket.on('updateAvailability', async (availabilityData) => {
      try {
        await this.handleAvailabilityUpdate(socket, availabilityData);
      } catch (error) {
        socket.emit('availabilityError', { error: error.message });
      }
    });

    // Location sharing
    socket.on('shareLocation', async (locationData) => {
      try {
        await this.handleLocationSharing(socket, locationData);
      } catch (error) {
        socket.emit('locationError', { error: error.message });
      }
    });

    // Typing indicators
    socket.on('typingStart', (data) => {
      socket.to(this.getUserRoom(data.receiverId)).emit('userTyping', {
        userId,
        conversationId: data.conversationId,
        typing: true
      });
    });

    socket.on('typingStop', (data) => {
      socket.to(this.getUserRoom(data.receiverId)).emit('userTyping', {
        userId,
        conversationId: data.conversationId,
        typing: false
      });
    });
  }

  // 💬 CHAT EVENT HANDLERS
  static setupChatHandlers(socket) {
    const userId = socket.userId;

    socket.on('sendMessage', async (messageData) => {
      try {
        await this.handleMessageSend(socket, messageData);
      } catch (error) {
        socket.emit('messageError', { error: error.message });
      }
    });

    socket.on('markMessagesRead', async (data) => {
      try {
        await this.handleMarkMessagesRead(socket, data);
      } catch (error) {
        socket.emit('markReadError', { error: error.message });
      }
    });

    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });
  }

  // 🎪 GAMIFICATION EVENT HANDLERS
  static setupGamificationHandlers(socket) {
    const userId = socket.userId;

    socket.on('achievementUnlocked', (achievementData) => {
      this.handleAchievementUnlock(socket, achievementData);
    });

    socket.on('levelUp', (levelData) => {
      this.handleLevelUp(socket, levelData);
    });

    socket.on('pointsEarned', (pointsData) => {
      this.handlePointsEarned(socket, pointsData);
    });
  }

  // 🔔 NOTIFICATION HANDLERS
  static setupNotificationHandlers(socket) {
    socket.on('subscribeNotifications', (data) => {
      socket.join('notifications');
    });

    socket.on('unsubscribeNotifications', (data) => {
      socket.leave('notifications');
    });

    socket.on('notificationRead', (notificationId) => {
      this.handleNotificationRead(socket, notificationId);
    });
  }

  // 📊 ANALYTICS HANDLERS
  static setupAnalyticsHandlers(socket) {
    socket.on('trackEvent', (eventData) => {
      YachiAnalytics.trackRealTimeEvent(socket.userId, eventData);
    });

    socket.on('pageView', (pageData) => {
      YachiAnalytics.trackPageView(socket.userId, pageData);
    });
  }

  // 🚀 CORE EVENT HANDLERS IMPLEMENTATION
  static async handleServiceBooking(socket, bookingData) {
    const { providerId, serviceId, clientId, bookingDetails } = bookingData;

    // Validate booking data
    if (!providerId || !serviceId || !clientId) {
      throw new Error('Invalid booking data');
    }

    // Create booking in database (pseudo-code)
    const booking = await this.createBooking(bookingData);

    // Notify provider
    this.emitToUser(providerId, 'newBooking', {
      booking,
      client: socket.userData,
      timestamp: new Date().toISOString()
    });

    // Notify client
    socket.emit('bookingConfirmed', {
      booking,
      provider: await this.getUserData(providerId),
      timestamp: new Date().toISOString()
    });

    // Broadcast to relevant rooms
    this.emitToRoom('bookings', 'bookingCreated', {
      booking,
      clientId,
      providerId
    });

    // Track analytics
    YachiAnalytics.trackBookingCreation(booking);
  }

  static async handleMessageSend(socket, messageData) {
    const { receiverId, conversationId, content, messageType = 'text' } = messageData;

    // Validate message
    if (!receiverId || !content) {
      throw new Error('Invalid message data');
    }

    // Rate limiting for messages
    const rateLimitKey = `message_rate:${socket.userId}`;
    const limit = await CacheService.checkRateLimit(rateLimitKey, 60, 60000); // 60 messages per minute
    
    if (!limit.allowed) {
      throw new Error('Message rate limit exceeded');
    }

    // Create message (pseudo-code)
    const message = await this.createMessage({
      senderId: socket.userId,
      receiverId,
      conversationId,
      content,
      messageType,
      timestamp: new Date()
    });

    // Emit to receiver
    this.emitToUser(receiverId, 'newMessage', {
      message,
      sender: socket.userData,
      conversationId
    });

    // Emit to sender for confirmation
    socket.emit('messageSent', {
      message,
      timestamp: new Date().toISOString()
    });

    // Emit to conversation room if exists
    if (conversationId) {
      this.emitToRoom(`conversation_${conversationId}`, 'conversationMessage', {
        message,
        sender: socket.userData
      });
    }

    // Track analytics
    YachiAnalytics.trackMessageSent(socket.userId, receiverId, messageType);
  }

  static async handleAchievementUnlock(socket, achievementData) {
    const { achievementId, achievementName, points } = achievementData;

    // Emit to user
    socket.emit('achievementNotification', {
      achievementId,
      achievementName,
      points,
      unlockedAt: new Date().toISOString(),
      user: socket.userData
    });

    // Broadcast to friends/network if achievement is significant
    if (points >= 100) {
      this.emitToRoom('achievements', 'userAchievement', {
        userId: socket.userId,
        userName: socket.userData.name,
        achievementName,
        points,
        timestamp: new Date().toISOString()
      });
    }

    // Track analytics
    YachiAnalytics.trackAchievementUnlock(socket.userId, achievementData);
  }

  // 🎯 UTILITY METHODS
  static getUserRoom(userId) {
    return `user_${userId}`;
  }

  static getWorkerRoom(workerId) {
    return `worker_${workerId}`;
  }

  static getConversationRoom(conversationId) {
    return `conversation_${conversationId}`;
  }

  // 🚀 EMISSION METHODS
  static emitToUser(userId, event, data) {
    if (!this.io) return;

    this.io.to(this.getUserRoom(userId)).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId()
    });
  }

  static emitToRoom(room, event, data) {
    if (!this.io) return;

    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId()
    });
  }

  static emitToWorkers(event, data) {
    if (!this.io) return;

    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId()
    });
  }

  static emitToAll(event, data) {
    if (!this.io) return;

    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId()
    });
  }

  // 🎯 BACKGROUND PROCESSORS
  static startBackgroundProcessors() {
    // Process message queue every second
    setInterval(() => {
      this.processMessageQueue();
    }, 1000);

    // Cleanup disconnected users every 5 minutes
    setInterval(() => {
      this.cleanupDisconnectedUsers();
    }, 5 * 60 * 1000);

    // Update online stats every 30 seconds
    setInterval(() => {
      this.broadcastOnlineStats();
    }, 30 * 1000);
  }

  static async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      const batch = this.messageQueue.splice(0, 50); // Process 50 messages at a time
      
      for (const message of batch) {
        try {
          await this.deliverMessage(message);
        } catch (error) {
          console.error('Failed to deliver message:', error);
          // Optionally retry or move to dead letter queue
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  static async deliverMessage(message) {
    const { userId, event, data } = message;
    
    if (this.isUserOnline(userId)) {
      this.emitToUser(userId, event, data);
    } else {
      // Store for later delivery when user comes online
      await this.storeOfflineMessage(userId, event, data);
    }
  }

  static cleanupDisconnectedUsers() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, userData] of this.connectedUsers.entries()) {
      if (now - userData.lastActivity > timeout) {
        // Force disconnect inactive users
        userData.socket.disconnect();
        this.connectedUsers.delete(socketId);
      }
    }
  }

  static broadcastOnlineStats() {
    this.emitToAll('onlineStats', {
      onlineWorkers: this.onlineWorkers.size,
      onlineClients: this.onlineClients.size,
      totalConnections: this.connectedUsers.size,
      timestamp: new Date().toISOString()
    });
  }

  // 🛑 DISCONNECTION HANDLER
  static handleDisconnection(socket, reason) {
    const userId = socket.userId;
    const userRole = socket.userRole;

    console.log(`❌ Yachi ${userRole} disconnected: ${socket.id} (Reason: ${reason})`);

    // Remove from connected users
    this.connectedUsers.delete(socket.id);

    // Update online status
    if (userRole === 'provider' || userRole === 'graduate') {
      this.onlineWorkers.delete(userId);
      this.emitToRoom('workers_online', 'workerOffline', { userId, online: false });
    } else {
      this.onlineClients.delete(userId);
    }

    // Track disconnection analytics
    YachiAnalytics.trackUserConnection(userId, userRole, 'disconnect', reason);

    // Notify relevant users about offline status
    this.emitToRoom('presence', 'userOffline', {
      userId,
      userRole,
      lastSeen: new Date().toISOString(),
      reason
    });
  }

  // 🎯 HELPER METHODS
  static isUserOnline(userId) {
    return Array.from(this.connectedUsers.values()).some(user => user.userId === userId);
  }

  static generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getUserConnections(userId) {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.userId === userId)
      .map(user => ({
        socketId: user.socket.id,
        connectedAt: user.connectedAt,
        lastActivity: user.lastActivity
      }));
  }

  // 📊 STATUS & MONITORING
  static getStatus() {
    return {
      connectedUsers: this.connectedUsers.size,
      onlineWorkers: this.onlineWorkers.size,
      onlineClients: this.onlineClients.size,
      messageQueueLength: this.messageQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      timestamp: new Date().toISOString()
    };
  }

  static getDetailedStats() {
    const workersByRole = {};
    const clientsByType = {};

    for (const userData of this.connectedUsers.values()) {
      if (userData.userRole === 'provider' || userData.userRole === 'graduate') {
        workersByRole[userData.userRole] = (workersByRole[userData.userRole] || 0) + 1;
      } else {
        clientsByType[userData.userRole] = (clientsByType[userData.userRole] || 0) + 1;
      }
    }

    return {
      ...this.getStatus(),
      workersByRole,
      clientsByType,
      activeConversations: this.roomSubscriptions.size
    };
  }

  // 🎯 YACHI-SPECIFIC REAL-TIME FEATURES
  static async notifyWorkerNewJob(workerId, jobData) {
    this.emitToUser(workerId, 'newJobOpportunity', {
      job: jobData,
      priority: jobData.priority || 'normal',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to accept
      timestamp: new Date().toISOString()
    });
  }

  static async notifyBookingStatusUpdate(bookingId, newStatus, updatedBy) {
    const booking = await this.getBookingData(bookingId);
    
    this.emitToUser(booking.clientId, 'bookingStatusUpdated', {
      bookingId,
      newStatus,
      updatedBy,
      timestamp: new Date().toISOString()
    });

    this.emitToUser(booking.providerId, 'bookingStatusUpdated', {
      bookingId,
      newStatus,
      updatedBy,
      timestamp: new Date().toISOString()
    });
  }

  static async broadcastGamificationLeaderboard(leaderboardData) {
    this.emitToAll('leaderboardUpdate', {
      leaderboard: leaderboardData,
      updatedAt: new Date().toISOString()
    });
  }

  // Placeholder methods for database operations
  static async createBooking(bookingData) {
    // Implementation would interact with your database
    return { id: 'booking_' + Date.now(), ...bookingData, status: 'pending' };
  }

  static async createMessage(messageData) {
    // Implementation would interact with your database
    return { id: 'msg_' + Date.now(), ...messageData };
  }

  static async getUserData(userId) {
    // Implementation would fetch from database
    return { id: userId, name: 'User ' + userId };
  }

  static async getBookingData(bookingId) {
    // Implementation would fetch from database
    return { id: bookingId, clientId: 'client1', providerId: 'provider1' };
  }

  static async storeOfflineMessage(userId, event, data) {
    // Implementation would store in database for later delivery
    console.log(`Storing offline message for user ${userId}: ${event}`);
  }
}

module.exports = { RealTimeService };