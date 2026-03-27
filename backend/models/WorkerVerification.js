// models/WorkerVerification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { emailService } = require('../services/emailService');
const { smsService } = require('../services/smsService');
const logger = require('../utils/logger');

const WorkerVerification = sequelize.define('WorkerVerification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Information
  verificationType: {
    type: DataTypes.ENUM(
      'fayda_id',           // Ethiopian National ID
      'passport',           // International Passport
      'driving_license',    // Driver's License
      'selfie',             // Selfie for liveness detection
      'biometric',          // Biometric verification
      'address_proof',      // Utility bill, rental agreement
      'education_certificate', // Academic qualifications
      'professional_certificate', // Professional certifications
      'work_permit',        // Work authorization
      'business_license',   // Business registration
      'insurance',          // Insurance documentation
      'background_check',   // Criminal background check
      'skill_assessment',   // Skill verification test
      'portfolio_review',   // Portfolio evaluation
      'reference_check'     // Professional references
    ),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Verification type is required' }
    }
  },
  
  // Document Information
  documentNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: { args: [0, 100], msg: 'Document number cannot exceed 100 characters' }
    },
    comment: 'ID number, passport number, etc.'
  },
  
  documentImage: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Document image is required' },
      isUrl: { msg: 'Document image must be a valid URL' }
    }
  },
  
  documentImageBack: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Document image back must be a valid URL' }
    },
    comment: 'For documents with front/back sides'
  },
  
  documentMetadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional document metadata (dimensions, size, etc.)'
  },
  
  // Verification Status
  status: {
    type: DataTypes.ENUM(
      'pending_submission',  // Not yet submitted
      'submitted',           // Submitted, waiting for processing
      'processing',          // AI/Manual processing in progress
      'verified',            // Successfully verified
      'rejected',            // Verification failed
      'expired',             // Verification expired
      'suspended',           // Temporarily suspended
      'under_review',        // Requires manual review
      'needs_additional_info' // More information required
    ),
    defaultValue: 'pending_submission'
  },
  
  // Verification Details
  verificationMethod: {
    type: DataTypes.ENUM('automatic', 'manual', 'ai_assisted', 'third_party'),
    defaultValue: 'automatic'
  },
  
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin or system that verified this document'
  },
  
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Rejection reason cannot exceed 500 characters' }
    }
  },
  
  // Validity Period
  issueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: { msg: 'Issue date must be a valid date' }
    }
  },
  
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: { msg: 'Expiry date must be a valid date' },
      isAfterIssueDate(value) {
        if (value && this.issueDate && new Date(value) <= new Date(this.issueDate)) {
          throw new Error('Expiry date must be after issue date');
        }
      }
    }
  },
  
  doesNotExpire: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Processing Information
  processingAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  lastProcessingAttempt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  processingTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Processing time in milliseconds'
  },
  
  // AI Analysis Results
  aiAnalysis: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered analysis of verification document'
  },
  
  confidenceScore: {
    type: DataTypes.DECIMAL(4, 3),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Confidence score cannot be less than 0' },
      max: { args: [1], msg: 'Confidence score cannot be greater than 1' }
    }
  },
  
  riskScore: {
    type: DataTypes.DECIMAL(4, 3),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Risk score cannot be less than 0' },
      max: { args: [1], msg: 'Risk score cannot be greater than 1' }
    }
  },
  
  // Extracted Data
  extractedData: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Data extracted from the document (name, DOB, etc.)'
  },
  
  // Additional Information
  additionalInfo: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional information provided during verification'
  },
  
  // Security and Audit
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    validate: {
      isIP: { msg: 'IP address must be a valid IP address' }
    }
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Device fingerprint for security'
  },
  
  // Review Information
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 1000], msg: 'Review notes cannot exceed 1000 characters' }
    }
  },
  
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin who reviewed this verification'
  },
  
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Retry Information
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: {
      min: 1
    }
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional verification metadata'
  }

}, {
  tableName: 'worker_verifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_verification_user',
      fields: ['user_id']
    },
    {
      name: 'idx_verification_type',
      fields: ['verification_type']
    },
    {
      name: 'idx_verification_status',
      fields: ['status']
    },
    {
      name: 'idx_verification_document_number',
      fields: ['document_number']
    },
    {
      name: 'idx_verification_confidence',
      fields: ['confidence_score']
    },
    {
      name: 'idx_verification_risk',
      fields: ['risk_score']
    },
    {
      name: 'idx_verification_verified_at',
      fields: ['verified_at']
    },
    {
      name: 'idx_verification_expiry_date',
      fields: ['expiry_date']
    },
    {
      name: 'idx_verification_created',
      fields: ['created_at']
    },
    {
      name: 'idx_verification_type_status',
      fields: ['verification_type', 'status']
    }
  ],
  hooks: {
    beforeValidate: async (verification) => {
      await WorkerVerification.hooks.beforeValidateHook(verification);
    },
    beforeCreate: async (verification) => {
      await WorkerVerification.hooks.beforeCreateHook(verification);
    },
    afterCreate: async (verification) => {
      await WorkerVerification.hooks.afterCreateHook(verification);
    },
    afterUpdate: async (verification) => {
      await WorkerVerification.hooks.afterUpdateHook(verification);
    },
    afterDestroy: async (verification) => {
      await WorkerVerification.hooks.afterDestroyHook(verification);
    }
  }
});

// Static Methods
WorkerVerification.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (verification) => {
    if (verification.isNewRecord || verification.changed('documentImage')) {
      await WorkerVerification.hooks.processVerificationDocument(verification);
    }
    
    if (verification.isNewRecord || verification.changed('status')) {
      await WorkerVerification.hooks.handleStatusChange(verification);
    }
    
    if (verification.isNewRecord || verification.changed('expiryDate')) {
      await WorkerVerification.hooks.validateExpiryDate(verification);
    }
    
    // Set doesNotExpire based on expiryDate
    if (verification.expiryDate === null) {
      verification.doesNotExpire = true;
    }
  },

  /**
   * Process verification document with AI
   */
  processVerificationDocument: async (verification) => {
    if (!verification.documentImage) return;

    try {
      const startTime = Date.now();
      
      // AI-powered document analysis
      const analysis = await YachiAI.analyzeDocument({
        documentUrl: verification.documentImage,
        documentType: verification.verificationType,
        documentNumber: verification.documentNumber,
        userId: verification.userId
      });

      verification.aiAnalysis = analysis;
      verification.confidenceScore = analysis.confidenceScore || 0.0;
      verification.riskScore = analysis.riskScore || 0.0;
      verification.extractedData = analysis.extractedData || {};
      verification.processingTime = Date.now() - startTime;
      verification.processingAttempts = (verification.processingAttempts || 0) + 1;
      verification.lastProcessingAttempt = new Date();

      // Determine initial status based on AI analysis
      if (analysis.confidenceScore >= 0.8) {
        verification.status = 'verified';
        verification.verificationMethod = 'automatic';
        verification.verifiedAt = new Date();
      } else if (analysis.confidenceScore >= 0.6) {
        verification.status = 'under_review';
      } else {
        verification.status = 'rejected';
        verification.rejectionReason = analysis.rejectionReason || 'Low confidence score';
      }

      // Extract issue and expiry dates if available
      if (analysis.issueDate) {
        verification.issueDate = new Date(analysis.issueDate);
      }
      
      if (analysis.expiryDate) {
        verification.expiryDate = new Date(analysis.expiryDate);
      }

    } catch (error) {
      logger.error('Verification document processing failed:', error);
      verification.status = 'under_review';
      verification.aiAnalysis = { error: error.message };
    }
  },

  /**
   * Handle verification status changes
   */
  handleStatusChange: async (verification) => {
    const previousStatus = verification.previous('status');
    const newStatus = verification.status;

    // Set verification timestamp when verified
    if (newStatus === 'verified' && previousStatus !== 'verified') {
      verification.verifiedAt = new Date();
      
      // Update user verification status
      await WorkerVerification.hooks.updateUserVerificationStatus(verification);
      
      // Send verification success notification
      await WorkerVerification.hooks.sendVerificationNotification(verification, 'verified');
    }
    
    // Handle rejection
    else if (newStatus === 'rejected' && previousStatus !== 'rejected') {
      await WorkerVerification.hooks.sendVerificationNotification(verification, 'rejected');
      
      // Check if max retries reached
      if (verification.retryCount >= verification.maxRetries) {
        await WorkerVerification.hooks.handleMaxRetriesReached(verification);
      }
    }
    
    // Handle expiration
    else if (newStatus === 'expired' && previousStatus !== 'expired') {
      await WorkerVerification.hooks.sendExpirationNotification(verification);
      
      // Update user verification status
      await WorkerVerification.hooks.updateUserVerificationStatus(verification);
    }
    
    // Handle submission
    else if (newStatus === 'submitted' && previousStatus === 'pending_submission') {
      await WorkerVerification.hooks.sendSubmissionNotification(verification);
    }
  },

  /**
   * Update user verification status
   */
  updateUserVerificationStatus: async (verification) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(verification.userId);
      
      if (!user) return;

      const updateData = {};
      
      // Update specific verification type status
      switch (verification.verificationType) {
        case 'fayda_id':
          updateData.faydaVerified = verification.status === 'verified';
          updateData.faydaVerificationScore = verification.confidenceScore;
          break;
        case 'selfie':
          updateData.selfieVerified = verification.status === 'verified';
          updateData.selfieVerificationScore = verification.confidenceScore;
          break;
        case 'passport':
        case 'driving_license':
          updateData.documentVerified = verification.status === 'verified';
          updateData.documentVerificationScore = verification.confidenceScore;
          break;
      }
      
      // Calculate overall verification score
      const verificationScores = [];
      if (user.faydaVerificationScore) verificationScores.push(user.faydaVerificationScore);
      if (user.selfieVerificationScore) verificationScores.push(user.selfieVerificationScore);
      if (user.documentVerificationScore) verificationScores.push(user.documentVerificationScore);
      
      if (verificationScores.length > 0) {
        updateData.overallVerificationScore = verificationScores.reduce((a, b) => a + b) / verificationScores.length;
      }
      
      await User.update(updateData, { where: { id: verification.userId } });
      
    } catch (error) {
      logger.error('User verification status update failed:', error);
    }
  },

  /**
   * Send verification notifications
   */
  sendVerificationNotification: async (verification, status) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(verification.userId);
      
      if (!user) return;

      const notificationData = {
        user: user.toJSON(),
        verification: verification.toJSON(),
        status
      };

      if (status === 'verified') {
        // SMS notification
        await smsService.sendSMS(user.phone,
          `Congratulations! Your ${verification.verificationType.replace('_', ' ')} verification has been approved.`,
          { purpose: 'verification_approved', userId: user.id }
        );

        // Email notification
        await emailService.sendEmail(user.email, 'verification-approved', {
          user: { name: user.name },
          verification: {
            type: verification.verificationType.replace('_', ' '),
            verifiedAt: verification.verifiedAt,
            confidenceScore: Math.round(verification.confidenceScore * 100)
          }
        });
      } else if (status === 'rejected') {
        // SMS notification
        await smsService.sendSMS(user.phone,
          `Your ${verification.verificationType.replace('_', ' ')} verification was rejected. Reason: ${verification.rejectionReason}`,
          { purpose: 'verification_rejected', userId: user.id }
        );

        // Email notification
        await emailService.sendEmail(user.email, 'verification-rejected', {
          user: { name: user.name },
          verification: {
            type: verification.verificationType.replace('_', ' '),
            rejectionReason: verification.rejectionReason
          },
          retryCount: verification.retryCount,
          maxRetries: verification.maxRetries
        });
      }

    } catch (error) {
      logger.error('Verification notification failed:', error);
    }
  },

  /**
   * Send expiration notification
   */
  sendExpirationNotification: async (verification) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(verification.userId);
      
      if (!user) return;

      // SMS notification
      await smsService.sendSMS(user.phone,
        `Your ${verification.verificationType.replace('_', ' ')} verification has expired. Please renew it to maintain your verified status.`,
        { purpose: 'verification_expired', userId: user.id }
      );

      // Email notification
      await emailService.sendEmail(user.email, 'verification-expired', {
        user: { name: user.name },
        verification: {
          type: verification.verificationType.replace('_', ' '),
          expiryDate: verification.expiryDate
        }
      });

    } catch (error) {
      logger.error('Expiration notification failed:', error);
    }
  },

  /**
   * Send submission notification
   */
  sendSubmissionNotification: async (verification) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(verification.userId);
      
      if (!user) return;

      await smsService.sendSMS(user.phone,
        `Your ${verification.verificationType.replace('_', ' ')} verification has been submitted. We'll notify you once it's processed.`,
        { purpose: 'verification_submitted', userId: user.id }
      );

    } catch (error) {
      logger.error('Submission notification failed:', error);
    }
  },

  /**
   * Handle max retries reached
   */
  handleMaxRetriesReached: async (verification) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(verification.userId);
      
      if (!user) return;

      // Send final rejection notification
      await smsService.sendSMS(user.phone,
        `Your ${verification.verificationType.replace('_', ' ')} verification has been permanently rejected after ${verification.maxRetries} attempts. Please contact support for assistance.`,
        { purpose: 'verification_permanently_rejected', userId: user.id }
      );

      // Log for admin review
      logger.warn('Maximum verification retries reached', {
        userId: verification.userId,
        verificationType: verification.verificationType,
        retryCount: verification.retryCount
      });

    } catch (error) {
      logger.error('Max retries handling failed:', error);
    }
  },

  /**
   * Validate expiry date
   */
  validateExpiryDate: async (verification) => {
    if (verification.expiryDate && new Date(verification.expiryDate) <= new Date()) {
      verification.status = 'expired';
    }
  },

  /**
   * Before create hook
   */
  beforeCreateHook: async (verification) => {
    // Set initial processing attempt
    verification.processingAttempts = 1;
    verification.lastProcessingAttempt = new Date();
    
    // Set status to submitted if document is provided
    if (verification.documentImage && verification.status === 'pending_submission') {
      verification.status = 'submitted';
    }
  },

  /**
   * After create hook
   */
  afterCreateHook: async (verification) => {
    try {
      // Track verification creation
      await YachiAnalytics.trackVerificationCreation(verification);

    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (verification) => {
    try {
      // Track verification updates
      if (verification.changed()) {
        await YachiAnalytics.trackVerificationUpdate(verification);
      }

    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (verification) => {
    try {
      // Track verification deletion
      await YachiAnalytics.trackVerificationDeletion(verification);
      
      // Update user verification status
      await WorkerVerification.hooks.updateUserVerificationStatus(verification);
      
      // Clean up document files
      await WorkerVerification.hooks.cleanupVerificationDocuments(verification);

    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  },

  /**
   * Clean up verification documents
   */
  cleanupVerificationDocuments: async (verification) => {
    try {
      const { fileUploadService } = require('../services/fileUploadService');
      
      // Delete main document
      if (verification.documentImage) {
        await fileUploadService.deleteFile(verification.documentImage);
      }
      
      // Delete back document if exists
      if (verification.documentImageBack) {
        await fileUploadService.deleteFile(verification.documentImageBack);
      }
      
    } catch (error) {
      logger.error('Verification document cleanup failed:', error);
    }
  }
};

// Instance Methods
WorkerVerification.prototype.getInstanceMethods = function() {
  return {
    /**
     * Submit verification for processing
     */
    submit: async function() {
      if (this.status !== 'pending_submission') {
        throw new Error('Verification has already been submitted');
      }
      
      if (!this.documentImage) {
        throw new Error('Document image is required for submission');
      }
      
      await this.update({
        status: 'submitted',
        submittedAt: new Date()
      });
      
      logger.info('Verification submitted', {
        verificationId: this.id,
        userId: this.userId,
        type: this.verificationType
      });
      
      return this;
    },

    /**
     * Process verification with AI
     */
    process: async function() {
      if (this.status !== 'submitted' && this.status !== 'under_review') {
        throw new Error('Verification cannot be processed in current status');
      }
      
      await WorkerVerification.hooks.processVerificationDocument(this);
      await this.save();
      
      return this;
    },

    /**
     * Verify manually by admin
     */
    verifyManually: async function(adminId, notes = '') {
      if (this.status === 'verified') {
        throw new Error('Verification is already verified');
      }
      
      await this.update({
        status: 'verified',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        verificationMethod: 'manual',
        confidenceScore: 1.0,
        reviewNotes: notes,
        reviewedBy: adminId,
        reviewedAt: new Date()
      });
      
      logger.info('Verification manually verified', {
        verificationId: this.id,
        adminId,
        type: this.verificationType
      });
      
      return this;
    },

    /**
     * Reject verification
     */
    reject: async function(adminId, reason) {
      if (this.status === 'rejected') {
        throw new Error('Verification is already rejected');
      }
      
      if (!reason) {
        throw new Error('Rejection reason is required');
      }
      
      await this.update({
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        retryCount: this.retryCount + 1
      });
      
      logger.info('Verification rejected', {
        verificationId: this.id,
        adminId,
        type: this.verificationType,
        reason
      });
      
      return this;
    },

    /**
     * Request additional information
     */
    requestAdditionalInfo: async function(adminId, infoRequested) {
      if (this.status === 'verified') {
        throw new Error('Cannot request additional info for verified verification');
      }
      
      await this.update({
        status: 'needs_additional_info',
        reviewNotes: infoRequested,
        reviewedBy: adminId,
        reviewedAt: new Date()
      });
      
      logger.info('Additional info requested', {
        verificationId: this.id,
        adminId,
        type: this.verificationType
      });
      
      return this;
    },

    /**
     * Retry verification
     */
    retry: async function(newDocumentImage = null) {
      if (this.retryCount >= this.maxRetries) {
        throw new Error('Maximum retry attempts reached');
      }
      
      const updates = {
        status: 'submitted',
        retryCount: this.retryCount + 1,
        processingAttempts: 0,
        lastProcessingAttempt: null,
        aiAnalysis: {},
        confidenceScore: 0.0,
        riskScore: 0.0
      };
      
      if (newDocumentImage) {
        updates.documentImage = newDocumentImage;
      }
      
      await this.update(updates);
      
      logger.info('Verification retry initiated', {
        verificationId: this.id,
        retryCount: this.retryCount,
        type: this.verificationType
      });
      
      return this;
    },

    /**
     * Check if verification is valid
     */
    isValid: function() {
      if (this.status !== 'verified') return false;
      if (this.doesNotExpire) return true;
      if (!this.expiryDate) return true;
      
      return new Date(this.expiryDate) > new Date();
    },

    /**
     * Check if verification is expiring soon
     */
    isExpiringSoon: function(days = 30) {
      if (!this.expiryDate || this.doesNotExpire) return false;
      
      const expiryDate = new Date(this.expiryDate);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + days);
      
      return expiryDate <= threshold && expiryDate > new Date();
    },

    /**
     * Get days until expiry
     */
    getDaysUntilExpiry: function() {
      if (!this.expiryDate || this.doesNotExpire) return null;
      
      const expiryDate = new Date(this.expiryDate);
      const now = new Date();
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    },

    /**
     * Update extracted data
     */
    updateExtractedData: async function(newData) {
      const extractedData = {
        ...this.extractedData,
        ...newData,
        lastUpdated: new Date().toISOString()
      };
      
      await this.update({ extractedData });
      return extractedData;
    },

    /**
     * Get verification analytics
     */
    getAnalytics: async function() {
      try {
        const analytics = await YachiAnalytics.getVerificationAnalytics(this.id);
        return analytics;
      } catch (error) {
        logger.error('Get verification analytics failed:', error);
        return null;
      }
    },

    /**
     * Check if verification can be retried
     */
    canRetry: function() {
      return this.retryCount < this.maxRetries && this.status !== 'verified';
    },

    /**
     * Get verification score category
     */
    getScoreCategory: function() {
      if (this.confidenceScore >= 0.9) return 'excellent';
      if (this.confidenceScore >= 0.8) return 'good';
      if (this.confidenceScore >= 0.6) return 'fair';
      return 'poor';
    }
  };
};

// Static Methods
WorkerVerification.findUserVerifications = async function(userId, filters = {}) {
  const where = { userId };
  
  // Apply filters
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.verificationType) {
    where.verificationType = filters.verificationType;
  }
  
  if (filters.validOnly) {
    where.status = 'verified';
    where[sequelize.Op.or] = [
      { doesNotExpire: true },
      { expiryDate: { [sequelize.Op.gt]: new Date() } },
      { expiryDate: null }
    ];
  }
  
  return await WorkerVerification.findAll({
    where,
    order: [
      ['status', 'ASC'],
      ['verifiedAt', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

WorkerVerification.findExpiringVerifications = async function(days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  
  return await WorkerVerification.findAll({
    where: {
      status: 'verified',
      doesNotExpire: false,
      expiryDate: {
        [sequelize.Op.lte]: threshold,
        [sequelize.Op.gt]: new Date()
      }
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ]
  });
};

WorkerVerification.findPendingReview = async function(filters = {}) {
  const where = {
    status: { [sequelize.Op.in]: ['under_review', 'needs_additional_info'] }
  };
  
  // Apply filters
  if (filters.verificationType) {
    where.verificationType = filters.verificationType;
  }
  
  if (filters.minConfidence) {
    where.confidenceScore = { [sequelize.Op.gte]: filters.minConfidence };
  }
  
  return await WorkerVerification.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'rating']
      }
    ],
    order: [
      ['confidenceScore', 'DESC'],
      ['createdAt', 'ASC']
    ],
    limit: filters.limit || 50,
    offset: filters.offset || 0
  });
};

WorkerVerification.getVerificationStats = async function(userId = null) {
  const where = userId ? { userId } : {};
  
  const stats = await WorkerVerification.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalVerifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "verified" THEN 1 ELSE 0 END')), 'verifiedVerifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "pending_submission" THEN 1 ELSE 0 END')), 'pendingSubmission'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "submitted" THEN 1 ELSE 0 END')), 'submittedVerifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "under_review" THEN 1 ELSE 0 END')), 'underReview'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "rejected" THEN 1 ELSE 0 END')), 'rejectedVerifications'],
      [sequelize.fn('AVG', sequelize.col('confidence_score')), 'avgConfidenceScore'],
      [sequelize.fn('AVG', sequelize.col('processing_time')), 'avgProcessingTime']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

WorkerVerification.getUserVerificationStatus = async function(userId) {
  const verifications = await WorkerVerification.findAll({
    where: { 
      userId,
      status: 'verified'
    },
    attributes: ['verificationType', 'confidenceScore', 'verifiedAt', 'expiryDate']
  });
  
  const status = {
    faydaVerified: false,
    selfieVerified: false,
    documentVerified: false,
    overallScore: 0,
    verifiedTypes: []
  };
  
  let totalScore = 0;
  let count = 0;
  
  verifications.forEach(verification => {
    switch (verification.verificationType) {
      case 'fayda_id':
        status.faydaVerified = true;
        status.verifiedTypes.push('fayda_id');
        totalScore += verification.confidenceScore;
        count++;
        break;
      case 'selfie':
        status.selfieVerified = true;
        status.verifiedTypes.push('selfie');
        totalScore += verification.confidenceScore;
        count++;
        break;
      case 'passport':
      case 'driving_license':
        status.documentVerified = true;
        status.verifiedTypes.push(verification.verificationType);
        totalScore += verification.confidenceScore;
        count++;
        break;
    }
  });
  
  status.overallScore = count > 0 ? totalScore / count : 0;
  
  return status;
};

// Associations will be defined in the model index file
WorkerVerification.associate = function(models) {
  WorkerVerification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });
  
  WorkerVerification.belongsTo(models.User, {
    foreignKey: 'verifiedBy',
    as: 'verifier'
  });
  
  WorkerVerification.belongsTo(models.User, {
    foreignKey: 'reviewedBy',
    as: 'reviewer'
  });
};

module.exports = WorkerVerification;