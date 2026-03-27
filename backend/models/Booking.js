// models/Booking.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { emailService } = require('../services/emailService');
const { smsService } = require('../services/smsService');
const logger = require('../utils/logger');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Booking Information
  bookingNumber: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false,
    comment: 'Human-readable booking reference number'
  },
  
  // Relationship IDs
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  providerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },
  
  // Booking Details
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Booking title is required' },
      len: { args: [5, 255], msg: 'Title must be between 5 and 255 characters' }
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 2000], msg: 'Description cannot exceed 2000 characters' }
    }
  },
  
  // Scheduling Information
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: { msg: 'Scheduled date must be a valid date' },
      isFuture(value) {
        if (new Date(value) <= new Date()) {
          throw new Error('Scheduled date must be in the future');
        }
      }
    }
  },
  
  scheduledTime: {
    type: DataTypes.TIME,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Scheduled time is required' }
    }
  },
  
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [15], msg: 'Duration must be at least 15 minutes' },
      max: { args: [480], msg: 'Duration cannot exceed 8 hours' }
    },
    comment: 'Estimated duration in minutes'
  },
  
  // Location Information
  location: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    validate: {
      isValidLocation(value) {
        if (!value.address) {
          throw new Error('Location address is required');
        }
        if (!value.coordinates || !value.coordinates.latitude || !value.coordinates.longitude) {
          throw new Error('Location coordinates are required');
        }
      }
    }
  },
  
  // Pricing and Payment
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Base price must be positive' }
    }
  },
  
  additionalFees: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Additional fees cannot be negative' }
    }
  },
  
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Discount cannot be negative' }
    }
  },
  
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Total amount must be positive' }
    }
  },
  
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'ETB',
    validate: {
      isAlpha: { msg: 'Currency must be alphabetic' },
      len: { args: [3, 3], msg: 'Currency must be 3 characters' }
    }
  },
  
  // Payment Information
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'),
    defaultValue: 'pending'
  },
  
  paymentMethod: {
    type: DataTypes.ENUM('chapa', 'telebirr', 'cbebirr', 'cash', 'bank_transfer'),
    allowNull: true
  },
  
  paymentId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference to payment transaction'
  },
  
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Booking Status
  status: {
    type: DataTypes.ENUM(
      'pending',           // Booking created, waiting for provider acceptance
      'accepted',          // Provider accepted the booking
      'confirmed',         // Payment completed, booking confirmed
      'in_progress',       // Service is currently being provided
      'completed',         // Service completed successfully
      'cancelled',         // Booking was cancelled
      'rejected',          // Provider rejected the booking
      'expired',           // Booking expired without action
      'disputed',          // There is a dispute about the service
      'refunded'           // Booking was refunded
    ),
    defaultValue: 'pending'
  },
  
  // Cancellation Information
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  cancelledBy: {
    type: DataTypes.ENUM('client', 'provider', 'system'),
    allowNull: true
  },
  
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Completion Information
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  actualDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual service duration in minutes'
  },
  
  completionNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Rating and Review
  clientRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: { args: [1], msg: 'Rating must be at least 1' },
      max: { args: [5], msg: 'Rating cannot exceed 5' }
    }
  },
  
  clientReview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  providerRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: { args: [1], msg: 'Rating must be at least 1' },
      max: { args: [5], msg: 'Rating cannot exceed 5' }
    }
  },
  
  providerFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Communication
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  requirements: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Specific requirements for this booking'
  },
  
  // Emergency Information
  isEmergency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  emergencyContact: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Emergency contact information'
  },
  
  // AI and Analytics
  aiRecommendations: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered recommendations for this booking'
  },
  
  performanceMetrics: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Performance analytics for this booking'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional booking metadata'
  }

}, {
  tableName: 'bookings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_booking_client',
      fields: ['client_id']
    },
    {
      name: 'idx_booking_provider',
      fields: ['provider_id']
    },
    {
      name: 'idx_booking_service',
      fields: ['service_id']
    },
    {
      name: 'idx_booking_status',
      fields: ['status']
    },
    {
      name: 'idx_booking_scheduled_date',
      fields: ['scheduled_date']
    },
    {
      name: 'idx_booking_number',
      fields: ['booking_number'],
      unique: true
    },
    {
      name: 'idx_booking_payment_status',
      fields: ['payment_status']
    },
    {
      name: 'idx_booking_created',
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeValidate: async (booking) => {
      await Booking.hooks.beforeValidateHook(booking);
    },
    beforeCreate: async (booking) => {
      await Booking.hooks.beforeCreateHook(booking);
    },
    afterCreate: async (booking) => {
      await Booking.hooks.afterCreateHook(booking);
    },
    afterUpdate: async (booking) => {
      await Booking.hooks.afterUpdateHook(booking);
    },
    afterDestroy: async (booking) => {
      await Booking.hooks.afterDestroyHook(booking);
    }
  }
});

// Static Methods
Booking.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (booking) => {
    if (booking.isNewRecord) {
      await Booking.hooks.generateBookingNumber(booking);
      await Booking.hooks.calculateTotalAmount(booking);
    }
    
    if (booking.changed('status')) {
      await Booking.hooks.handleStatusChange(booking);
    }
  },

  /**
   * Generate unique booking number
   */
  generateBookingNumber: async (booking) => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    booking.bookingNumber = `BK${timestamp}${random}`;
  },

  /**
   * Calculate total amount
   */
  calculateTotalAmount: async (booking) => {
    const total = parseFloat(booking.basePrice) + 
                 parseFloat(booking.additionalFees || 0) - 
                 parseFloat(booking.discount || 0);
    
    booking.totalAmount = Math.max(0, total);
  },

  /**
   * Handle status changes
   */
  handleStatusChange: async (booking) => {
    const previousStatus = booking.previous('status');
    const newStatus = booking.status;

    // Set timestamps based on status changes
    if (newStatus === 'accepted' && previousStatus === 'pending') {
      booking.acceptedAt = new Date();
    } else if (newStatus === 'in_progress' && previousStatus !== 'in_progress') {
      booking.startedAt = new Date();
    } else if (newStatus === 'completed' && previousStatus !== 'completed') {
      booking.completedAt = new Date();
    } else if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
      booking.cancelledAt = new Date();
    }

    // Send notifications based on status changes
    await Booking.hooks.sendStatusNotifications(booking, previousStatus, newStatus);
  },

  /**
   * Send status change notifications
   */
  sendStatusNotifications: async (booking, previousStatus, newStatus) => {
    try {
      const { User, Service } = require('./index');
      
      // Get client and provider details
      const [client, provider, service] = await Promise.all([
        User.findByPk(booking.clientId),
        User.findByPk(booking.providerId),
        Service.findByPk(booking.serviceId)
      ]);

      const notificationData = {
        booking: booking.toJSON(),
        client: client.toJSON(),
        provider: provider.toJSON(),
        service: service.toJSON()
      };

      switch (newStatus) {
        case 'accepted':
          // Notify client that provider accepted
          await Booking.hooks.sendBookingAcceptedNotifications(notificationData);
          break;
          
        case 'confirmed':
          // Notify both parties about confirmation
          await Booking.hooks.sendBookingConfirmedNotifications(notificationData);
          break;
          
        case 'in_progress':
          // Notify client that service started
          await Booking.hooks.sendServiceStartedNotifications(notificationData);
          break;
          
        case 'completed':
          // Notify about completion and request review
          await Booking.hooks.sendServiceCompletedNotifications(notificationData);
          break;
          
        case 'cancelled':
          // Notify about cancellation
          await Booking.hooks.sendBookingCancelledNotifications(notificationData);
          break;
          
        case 'rejected':
          // Notify client about rejection
          await Booking.hooks.sendBookingRejectedNotifications(notificationData);
          break;
      }

    } catch (error) {
      logger.error('Status notification failed:', error);
    }
  },

  /**
   * Send booking accepted notifications
   */
  sendBookingAcceptedNotifications: async (data) => {
    const { client, provider, booking, service } = data;
    
    // SMS to client
    await smsService.sendSMS(client.phone, 
      `Your booking #${booking.bookingNumber} for ${service.title} has been accepted by ${provider.name}. They will contact you soon.`,
      { purpose: 'booking_accepted', userId: client.id }
    );

    // Email to client
    await emailService.sendEmail(client.email, 'booking-accepted', {
      client: { name: client.name },
      provider: { name: provider.name },
      service: { title: service.title },
      booking: {
        number: booking.bookingNumber,
        date: booking.scheduledDate,
        time: booking.scheduledTime
      }
    });
  },

  /**
   * Before create hook
   */
  beforeCreateHook: async (booking) => {
    // Validate provider availability
    await Booking.hooks.validateProviderAvailability(booking);
    
    // Generate AI recommendations
    await Booking.hooks.generateAIRecommendations(booking);
  },

  /**
   * Validate provider availability
   */
  validateProviderAvailability: async (booking) => {
    const conflictingBookings = await Booking.count({
      where: {
        providerId: booking.providerId,
        status: ['accepted', 'confirmed', 'in_progress'],
        scheduledDate: booking.scheduledDate,
        id: { [sequelize.Op.ne]: booking.id }
      }
    });

    if (conflictingBookings > 0) {
      throw new Error('Provider is not available at the selected time');
    }
  },

  /**
   * Generate AI recommendations
   */
  generateAIRecommendations: async (booking) => {
    try {
      const recommendations = await YachiAI.generateBookingRecommendations({
        serviceId: booking.serviceId,
        clientId: booking.clientId,
        scheduledDate: booking.scheduledDate,
        location: booking.location
      });

      booking.aiRecommendations = recommendations;
    } catch (error) {
      logger.error('AI recommendations generation failed:', error);
      // Don't throw error to prevent booking creation from failing
    }
  },

  /**
   * After create hook
   */
  afterCreateHook: async (booking) => {
    try {
      // Track booking creation
      await YachiAnalytics.trackBookingCreation(booking);
      
      // Send booking request to provider
      await Booking.hooks.sendBookingRequestNotifications(booking);
      
      // Set expiration timer for pending bookings
      await Booking.hooks.setBookingExpiration(booking);

    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * Send booking request notifications
   */
  sendBookingRequestNotifications: async (booking) => {
    const { User, Service } = require('./index');
    
    const [provider, service, client] = await Promise.all([
      User.findByPk(booking.providerId),
      Service.findByPk(booking.serviceId),
      User.findByPk(booking.clientId)
    ]);

    // SMS to provider
    await smsService.sendSMS(provider.phone,
      `New booking request from ${client.name} for ${service.title} on ${booking.scheduledDate}. Please respond within 24 hours.`,
      { purpose: 'booking_request', userId: provider.id }
    );

    // Email to provider
    await emailService.sendEmail(provider.email, 'booking-request', {
      provider: { name: provider.name },
      client: { name: client.name },
      service: { title: service.title },
      booking: {
        number: booking.bookingNumber,
        date: booking.scheduledDate,
        time: booking.scheduledTime,
        location: booking.location.address
      },
      acceptUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}/accept`,
      rejectUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}/reject`
    });
  },

  /**
   * Set booking expiration
   */
  setBookingExpiration: async (booking) => {
    // Bookings expire after 24 hours if not accepted
    const expirationTime = new Date(booking.createdAt);
    expirationTime.setHours(expirationTime.getHours() + 24);

    // This would typically be handled by a job scheduler
    // For now, we'll just store the expiration time
    booking.metadata = {
      ...booking.metadata,
      expiresAt: expirationTime.toISOString()
    };
    
    await booking.save();
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (booking) => {
    try {
      // Track booking updates
      if (booking.changed()) {
        await YachiAnalytics.trackBookingUpdate(booking);
      }
      
      // Update service booking count if completed
      if (booking.status === 'completed' && booking.previous('status') !== 'completed') {
        await Booking.hooks.updateServiceStats(booking.serviceId);
        await Booking.hooks.updateProviderStats(booking.providerId);
      }

    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * Update service statistics
   */
  updateServiceStats: async (serviceId) => {
    try {
      const { Service } = require('./index');
      
      const completedBookings = await Booking.count({
        where: { 
          serviceId, 
          status: 'completed' 
        }
      });
      
      await Service.increment('bookingCount', {
        by: 1,
        where: { id: serviceId }
      });
      
    } catch (error) {
      logger.error('Service stats update error:', error);
    }
  },

  /**
   * Update provider statistics
   */
  updateProviderStats: async (providerId) => {
    try {
      const { User } = require('./index');
      
      const completedBookings = await Booking.count({
        where: { 
          providerId, 
          status: 'completed' 
        }
      });
      
      const totalBookings = await Booking.count({
        where: { providerId }
      });
      
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
      
      await User.update(
        { 
          completedJobs: completedBookings,
          completionRate 
        },
        { where: { id: providerId } }
      );
      
    } catch (error) {
      logger.error('Provider stats update error:', error);
    }
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (booking) => {
    try {
      // Track booking deletion
      await YachiAnalytics.trackBookingDeletion(booking);
      
    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  }
};

// Instance Methods
Booking.prototype.getInstanceMethods = function() {
  return {
    /**
     * Accept booking
     */
    accept: async function(providerId) {
      if (this.providerId !== providerId) {
        throw new Error('Only the assigned provider can accept this booking');
      }
      
      if (this.status !== 'pending') {
        throw new Error(`Cannot accept booking with status: ${this.status}`);
      }
      
      await this.update({ status: 'accepted' });
      
      logger.info('Booking accepted', {
        bookingId: this.id,
        providerId: this.providerId,
        clientId: this.clientId
      });
      
      return this;
    },

    /**
     * Reject booking
     */
    reject: async function(providerId, reason = '') {
      if (this.providerId !== providerId) {
        throw new Error('Only the assigned provider can reject this booking');
      }
      
      if (this.status !== 'pending') {
        throw new Error(`Cannot reject booking with status: ${this.status}`);
      }
      
      await this.update({ 
        status: 'rejected',
        cancellationReason: reason,
        cancelledBy: 'provider'
      });
      
      logger.info('Booking rejected', {
        bookingId: this.id,
        providerId: this.providerId,
        clientId: this.clientId,
        reason
      });
      
      return this;
    },

    /**
     * Cancel booking
     */
    cancel: async function(userId, userType, reason = '') {
      const validUserTypes = ['client', 'provider', 'system'];
      if (!validUserTypes.includes(userType)) {
        throw new Error('Invalid user type for cancellation');
      }
      
      if (userType === 'client' && this.clientId !== userId) {
        throw new Error('Only the client can cancel this booking');
      }
      
      if (userType === 'provider' && this.providerId !== userId) {
        throw new Error('Only the provider can cancel this booking');
      }
      
      const allowedStatuses = ['pending', 'accepted', 'confirmed'];
      if (!allowedStatuses.includes(this.status)) {
        throw new Error(`Cannot cancel booking with status: ${this.status}`);
      }
      
      await this.update({
        status: 'cancelled',
        cancellationReason: reason,
        cancelledBy: userType
      });
      
      logger.info('Booking cancelled', {
        bookingId: this.id,
        cancelledBy: userType,
        userId,
        reason
      });
      
      return this;
    },

    /**
     * Start service
     */
    startService: async function(providerId) {
      if (this.providerId !== providerId) {
        throw new Error('Only the assigned provider can start this service');
      }
      
      if (this.status !== 'confirmed') {
        throw new Error(`Cannot start service with status: ${this.status}`);
      }
      
      await this.update({ status: 'in_progress' });
      
      logger.info('Service started', {
        bookingId: this.id,
        providerId: this.providerId
      });
      
      return this;
    },

    /**
     * Complete service
     */
    completeService: async function(providerId, notes = '') {
      if (this.providerId !== providerId) {
        throw new Error('Only the assigned provider can complete this service');
      }
      
      if (this.status !== 'in_progress') {
        throw new Error(`Cannot complete service with status: ${this.status}`);
      }
      
      // Calculate actual duration
      const startTime = this.startedAt || this.acceptedAt;
      const actualDuration = startTime ? 
        Math.round((new Date() - new Date(startTime)) / (1000 * 60)) : 
        this.duration;
      
      await this.update({
        status: 'completed',
        completionNotes: notes,
        actualDuration,
        completedAt: new Date()
      });
      
      logger.info('Service completed', {
        bookingId: this.id,
        providerId: this.providerId,
        actualDuration,
        notes
      });
      
      return this;
    },

    /**
     * Confirm payment
     */
    confirmPayment: async function(paymentData) {
      if (this.paymentStatus === 'completed') {
        throw new Error('Payment already completed');
      }
      
      await this.update({
        paymentStatus: 'completed',
        paymentMethod: paymentData.method,
        paymentId: paymentData.id,
        paidAt: new Date(),
        status: 'confirmed'
      });
      
      logger.info('Payment confirmed', {
        bookingId: this.id,
        paymentId: paymentData.id,
        amount: this.totalAmount
      });
      
      return this;
    },

    /**
     * Add client review
     */
    addClientReview: async function(rating, review) {
      if (this.status !== 'completed') {
        throw new Error('Can only review completed bookings');
      }
      
      if (this.clientRating) {
        throw new Error('Review already submitted');
      }
      
      await this.update({
        clientRating: rating,
        clientReview: review
      });
      
      // Update service rating
      const { Service } = require('./index');
      const service = await Service.findByPk(this.serviceId);
      if (service) {
        await service.updateRating(rating, this.id);
      }
      
      logger.info('Client review added', {
        bookingId: this.id,
        rating,
        serviceId: this.serviceId
      });
      
      return this;
    },

    /**
     * Add provider feedback
     */
    addProviderFeedback: async function(rating, feedback, providerId) {
      if (this.providerId !== providerId) {
        throw new Error('Only the assigned provider can add feedback');
      }
      
      if (this.status !== 'completed') {
        throw new Error('Can only add feedback for completed bookings');
      }
      
      await this.update({
        providerRating: rating,
        providerFeedback: feedback
      });
      
      logger.info('Provider feedback added', {
        bookingId: this.id,
        rating,
        providerId
      });
      
      return this;
    },

    /**
     * Check if booking can be modified
     */
    canBeModified: function() {
      const modifiableStatuses = ['pending', 'accepted'];
      return modifiableStatuses.includes(this.status);
    },

    /**
     * Check if booking can be cancelled
     */
    canBeCancelled: function() {
      const cancellableStatuses = ['pending', 'accepted', 'confirmed'];
      return cancellableStatuses.includes(this.status);
    },

    /**
     * Get booking timeline
     */
    getTimeline: function() {
      const timeline = [];
      
      if (this.createdAt) {
        timeline.push({
          event: 'booking_created',
          timestamp: this.createdAt,
          description: 'Booking request submitted'
        });
      }
      
      if (this.acceptedAt) {
        timeline.push({
          event: 'booking_accepted',
          timestamp: this.acceptedAt,
          description: 'Provider accepted the booking'
        });
      }
      
      if (this.paidAt) {
        timeline.push({
          event: 'payment_confirmed',
          timestamp: this.paidAt,
          description: 'Payment completed'
        });
      }
      
      if (this.startedAt) {
        timeline.push({
          event: 'service_started',
          timestamp: this.startedAt,
          description: 'Service started'
        });
      }
      
      if (this.completedAt) {
        timeline.push({
          event: 'service_completed',
          timestamp: this.completedAt,
          description: 'Service completed'
        });
      }
      
      if (this.cancelledAt) {
        timeline.push({
          event: 'booking_cancelled',
          timestamp: this.cancelledAt,
          description: `Booking cancelled by ${this.cancelledBy}`
        });
      }
      
      return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    /**
     * Calculate refund amount
     */
    calculateRefundAmount: function() {
      if (this.status !== 'cancelled') {
        return 0;
      }
      
      const cancellationTime = this.cancelledAt || new Date();
      const scheduledTime = new Date(this.scheduledDate);
      const hoursUntilService = (scheduledTime - cancellationTime) / (1000 * 60 * 60);
      
      let refundPercentage = 100;
      
      if (hoursUntilService < 24) {
        refundPercentage = 50;
      }
      
      if (hoursUntilService < 2) {
        refundPercentage = 0;
      }
      
      return (this.totalAmount * refundPercentage) / 100;
    }
  };
};

// Static Methods
Booking.findUserBookings = async function(userId, userType, filters = {}) {
  const where = {};
  
  if (userType === 'client') {
    where.clientId = userId;
  } else if (userType === 'provider') {
    where.providerId = userId;
  } else {
    throw new Error('Invalid user type. Must be "client" or "provider"');
  }
  
  // Apply filters
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.dateFrom) {
    where.scheduledDate = { [sequelize.Op.gte]: filters.dateFrom };
  }
  
  if (filters.dateTo) {
    where.scheduledDate = { ...where.scheduledDate, [sequelize.Op.lte]: filters.dateTo };
  }
  
  return await Booking.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: userType === 'client' ? 'provider' : 'client',
        attributes: ['id', 'name', 'avatar', 'phone', 'email']
      },
      {
        model: sequelize.models.Service,
        as: 'service',
        attributes: ['id', 'title', 'category', 'images']
      }
    ],
    order: [['scheduledDate', 'DESC']],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Booking.getProviderSchedule = async function(providerId, startDate, endDate) {
  return await Booking.findAll({
    where: {
      providerId,
      scheduledDate: {
        [sequelize.Op.between]: [startDate, endDate]
      },
      status: ['accepted', 'confirmed', 'in_progress']
    },
    attributes: ['id', 'scheduledDate', 'scheduledTime', 'duration', 'title', 'status'],
    order: [['scheduledDate', 'ASC'], ['scheduledTime', 'ASC']]
  });
};

Booking.getBookingStats = async function(providerId, timeRange = '30d') {
  const startDate = new Date();
  switch (timeRange) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }
  
  const stats = await Booking.findAll({
    where: {
      providerId,
      createdAt: { [sequelize.Op.gte]: startDate }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completedBookings'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "cancelled" THEN 1 ELSE 0 END')), 'cancelledBookings'],
      [sequelize.fn('AVG', sequelize.literal('CASE WHEN status = "completed" THEN client_rating ELSE NULL END')), 'avgRating'],
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

Booking.findExpiredBookings = async function() {
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() - 24);
  
  return await Booking.findAll({
    where: {
      status: 'pending',
      createdAt: { [sequelize.Op.lt]: expirationTime }
    }
  });
};

// Associations will be defined in the model index file
Booking.associate = function(models) {
  Booking.belongsTo(models.User, {
    foreignKey: 'clientId',
    as: 'client',
    onDelete: 'CASCADE'
  });
  
  Booking.belongsTo(models.User, {
    foreignKey: 'providerId',
    as: 'provider',
    onDelete: 'CASCADE'
  });
  
  Booking.belongsTo(models.Service, {
    foreignKey: 'serviceId',
    as: 'service',
    onDelete: 'CASCADE'
  });
  
  Booking.hasOne(models.Review, {
    foreignKey: 'bookingId',
    as: 'review'
  });
  
  Booking.hasOne(models.Payment, {
    foreignKey: 'bookingId',
    as: 'payment'
  });
};

module.exports = Booking;