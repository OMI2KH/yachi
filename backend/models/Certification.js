// models/Certification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { YachiAI } = require('../services/yachiAI');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { emailService } = require('../services/emailService');
const { smsService } = require('../services/smsService');
const logger = require('../utils/logger');

const Certification = sequelize.define('Certification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Certification Information
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Certification name is required' },
      len: { args: [3, 255], msg: 'Name must be between 3 and 255 characters' }
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 1000], msg: 'Description cannot exceed 1000 characters' }
    }
  },
  
  // Categorization
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Certification category is required' },
      isIn: {
        args: [[
          'plumbing', 'electrical', 'cleaning', 'tutoring', 'beauty', 
          'fitness', 'repair', 'installation', 'transport', 'catering',
          'event_planning', 'healthcare', 'consulting', 'construction',
          'landscaping', 'pet_care', 'personal_care', 'tech_support',
          'moving_services', 'safety', 'quality', 'management', 
          'technical', 'professional', 'vocational', 'other'
        ]],
        msg: 'Invalid certification category'
      }
    }
  },
  
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Issuing Authority
  issuingOrganization: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Issuing organization is required' }
    }
  },
  
  organizationWebsite: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Organization website must be a valid URL' }
    }
  },
  
  organizationLogo: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Organization logo must be a valid URL' }
    }
  },
  
  // Certification Details
  certificationCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Official certification code/number'
  },
  
  certificationLevel: {
    type: DataTypes.ENUM('basic', 'intermediate', 'advanced', 'expert', 'master'),
    defaultValue: 'basic'
  },
  
  credentialUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: { msg: 'Credential URL must be a valid URL' }
    },
    comment: 'Link to official credential verification'
  },
  
  // Validity Period
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: { msg: 'Issue date must be a valid date' },
      isPast(value) {
        if (value && new Date(value) > new Date()) {
          throw new Error('Issue date cannot be in the future');
        }
      }
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
  
  // Verification Status
  status: {
    type: DataTypes.ENUM(
      'pending_verification',  // Submitted, waiting for verification
      'verified',              // Successfully verified
      'rejected',              // Verification failed
      'expired',               // Certification has expired
      'suspended',             // Temporarily suspended
      'revoked'                // Permanently revoked
    ),
    defaultValue: 'pending_verification'
  },
  
  verificationMethod: {
    type: DataTypes.ENUM('automatic', 'manual', 'third_party', 'self_attested'),
    defaultValue: 'manual'
  },
  
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin who verified this certification'
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
  
  // Documents and Evidence
  documentUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Document URL is required' },
      isUrl: { msg: 'Document URL must be a valid URL' }
    }
  },
  
  documentMetadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Metadata about the certification document'
  },
  
  additionalDocuments: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidDocuments(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Additional documents must be an array');
        }
        if (value && value.length > 5) {
          throw new Error('Cannot have more than 5 additional documents');
        }
      }
    }
  },
  
  // Skills and Competencies
  skillsCovered: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidSkills(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Skills covered must be an array');
        }
      }
    },
    comment: 'Skills that this certification validates'
  },
  
  competencyAreas: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidCompetencies(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Competency areas must be an array');
        }
      }
    }
  },
  
  // Market Value
  marketValue: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'premium'),
    defaultValue: 'medium'
  },
  
  salaryBoost: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Salary boost must be positive' },
      max: { args: [100], msg: 'Salary boost cannot exceed 100%' }
    },
    comment: 'Estimated salary increase percentage'
  },
  
  recognitionLevel: {
    type: DataTypes.ENUM('local', 'regional', 'national', 'international'),
    defaultValue: 'local'
  },
  
  // Renewal Information
  renewalRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  renewalPeriod: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: { args: [1], msg: 'Renewal period must be at least 1 month' }
    },
    comment: 'Renewal period in months'
  },
  
  renewalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Renewal cost cannot be negative' }
    },
    comment: 'Cost of renewal in ETB'
  },
  
  // Verification Analytics
  verificationAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  lastVerificationAttempt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // AI and Analytics
  aiAnalysis: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'AI-powered analysis of certification document'
  },
  
  trustScore: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    validate: {
      min: { args: [0], msg: 'Trust score cannot be less than 0' },
      max: { args: [1], msg: 'Trust score cannot be greater than 1' }
    }
  },
  
  // Notifications
  renewalReminders: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Renewal reminder history'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional certification metadata'
  }

}, {
  tableName: 'certifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_certification_user',
      fields: ['user_id']
    },
    {
      name: 'idx_certification_status',
      fields: ['status']
    },
    {
      name: 'idx_certification_category',
      fields: ['category']
    },
    {
      name: 'idx_certification_organization',
      fields: ['issuing_organization']
    },
    {
      name: 'idx_certification_issue_date',
      fields: ['issue_date']
    },
    {
      name: 'idx_certification_expiry_date',
      fields: ['expiry_date']
    },
    {
      name: 'idx_certification_verified',
      fields: ['verified_at']
    },
    {
      name: 'idx_certification_trust_score',
      fields: ['trust_score']
    },
    {
      name: 'idx_certification_level',
      fields: ['certification_level']
    },
    {
      name: 'idx_certification_search',
      fields: ['name', 'issuing_organization'],
      type: 'FULLTEXT'
    },
    {
      name: 'idx_certification_skills',
      fields: ['skills_covered'],
      using: 'GIN'
    }
  ],
  hooks: {
    beforeValidate: async (certification) => {
      await Certification.hooks.beforeValidateHook(certification);
    },
    beforeCreate: async (certification) => {
      await Certification.hooks.beforeCreateHook(certification);
    },
    afterCreate: async (certification) => {
      await Certification.hooks.afterCreateHook(certification);
    },
    afterUpdate: async (certification) => {
      await Certification.hooks.afterUpdateHook(certification);
    },
    afterDestroy: async (certification) => {
      await Certification.hooks.afterDestroyHook(certification);
    }
  }
});

// Static Methods
Certification.hooks = {
  /**
   * Before validate hook
   */
  beforeValidateHook: async (certification) => {
    if (certification.isNewRecord || certification.changed('documentUrl')) {
      await Certification.hooks.generateAIAnalysis(certification);
    }
    
    if (certification.isNewRecord || certification.changed('status')) {
      await Certification.hooks.handleStatusChange(certification);
    }
    
    if (certification.isNewRecord || certification.changed('expiryDate')) {
      await Certification.hooks.validateExpiryDate(certification);
    }
    
    // Set doesNotExpire based on expiryDate
    if (certification.expiryDate === null) {
      certification.doesNotExpire = true;
    }
  },

  /**
   * Generate AI analysis for certification document
   */
  generateAIAnalysis: async (certification) => {
    try {
      const analysis = await YachiAI.analyzeDocument({
        documentUrl: certification.documentUrl,
        documentType: 'certification',
        issuingOrganization: certification.issuingOrganization,
        certificationName: certification.name
      });

      certification.aiAnalysis = analysis;
      
      // Update trust score based on AI analysis
      if (analysis.confidenceScore) {
        certification.trustScore = analysis.confidenceScore;
      }
      
      // Extract skills from certification if not provided
      if (analysis.skills && certification.skillsCovered.length === 0) {
        certification.skillsCovered = analysis.skills;
      }
      
      // Set initial status based on AI confidence
      if (analysis.confidenceScore > 0.8 && certification.status === 'pending_verification') {
        certification.status = 'verified';
        certification.verificationMethod = 'automatic';
        certification.verifiedAt = new Date();
      }

    } catch (error) {
      logger.error('Certification AI analysis failed:', error);
      // Don't throw error to prevent certification creation from failing
    }
  },

  /**
   * Handle certification status changes
   */
  handleStatusChange: async (certification) => {
    const previousStatus = certification.previous('status');
    const newStatus = certification.status;

    // Set verification timestamp when verified
    if (newStatus === 'verified' && previousStatus !== 'verified') {
      certification.verifiedAt = new Date();
      
      // Send verification success notification
      await Certification.hooks.sendVerificationNotification(certification, 'verified');
    }
    
    // Handle rejection
    else if (newStatus === 'rejected' && previousStatus !== 'rejected') {
      await Certification.hooks.sendVerificationNotification(certification, 'rejected');
    }
    
    // Handle expiration
    else if (newStatus === 'expired' && previousStatus !== 'expired') {
      await Certification.hooks.sendExpirationNotification(certification);
    }
  },

  /**
   * Validate expiry date
   */
  validateExpiryDate: async (certification) => {
    if (certification.expiryDate && new Date(certification.expiryDate) <= new Date()) {
      certification.status = 'expired';
    }
  },

  /**
   * Send verification notifications
   */
  sendVerificationNotification: async (certification, status) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(certification.userId);
      
      if (!user) return;

      const notificationData = {
        user: user.toJSON(),
        certification: certification.toJSON(),
        status
      };

      if (status === 'verified') {
        // SMS notification
        await smsService.sendSMS(user.phone,
          `Congratulations! Your certification "${certification.name}" has been verified.`,
          { purpose: 'certification_verified', userId: user.id }
        );

        // Email notification
        await emailService.sendEmail(user.email, 'certification-verified', {
          user: { name: user.name },
          certification: {
            name: certification.name,
            organization: certification.issuingOrganization,
            verifiedAt: certification.verifiedAt
          }
        });
      } else if (status === 'rejected') {
        // SMS notification
        await smsService.sendSMS(user.phone,
          `Your certification "${certification.name}" was rejected. Reason: ${certification.rejectionReason}`,
          { purpose: 'certification_rejected', userId: user.id }
        );

        // Email notification
        await emailService.sendEmail(user.email, 'certification-rejected', {
          user: { name: user.name },
          certification: {
            name: certification.name,
            organization: certification.issuingOrganization,
            rejectionReason: certification.rejectionReason
          }
        });
      }

    } catch (error) {
      logger.error('Verification notification failed:', error);
    }
  },

  /**
   * Send expiration notification
   */
  sendExpirationNotification: async (certification) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(certification.userId);
      
      if (!user) return;

      // SMS notification
      await smsService.sendSMS(user.phone,
        `Your certification "${certification.name}" has expired. Please renew it to maintain your verified status.`,
        { purpose: 'certification_expired', userId: user.id }
      );

      // Email notification
      await emailService.sendEmail(user.email, 'certification-expired', {
        user: { name: user.name },
        certification: {
          name: certification.name,
          organization: certification.issuingOrganization,
          expiryDate: certification.expiryDate
        },
        renewalInfo: certification.renewalRequired ? {
          cost: certification.renewalCost,
          period: certification.renewalPeriod
        } : null
      });

    } catch (error) {
      logger.error('Expiration notification failed:', error);
    }
  },

  /**
   * Before create hook
   */
  beforeCreateHook: async (certification) => {
    // Validate user's certification limit
    await Certification.hooks.validateCertificationLimit(certification.userId);
    
    // Set initial verification attempt
    certification.verificationAttempts = 1;
    certification.lastVerificationAttempt = new Date();
  },

  /**
   * Validate user's certification limit
   */
  validateCertificationLimit: async (userId) => {
    const certificationCount = await Certification.count({
      where: { 
        userId,
        status: { [sequelize.Op.notIn]: ['rejected', 'revoked'] }
      }
    });

    const maxCertifications = process.env.MAX_CERTIFICATIONS_PER_USER || 20;
    
    if (certificationCount >= maxCertifications) {
      throw new Error(`Certification limit reached. Maximum ${maxCertifications} certifications allowed.`);
    }
  },

  /**
   * After create hook
   */
  afterCreateHook: async (certification) => {
    try {
      // Track certification creation
      await YachiAnalytics.trackCertificationCreation(certification);
      
      // Update user's certification count
      await Certification.hooks.updateUserCertificationCount(certification.userId);

      // Send submission confirmation
      await Certification.hooks.sendSubmissionConfirmation(certification);

    } catch (error) {
      logger.error('After create hook error:', error);
    }
  },

  /**
   * Send submission confirmation
   */
  sendSubmissionConfirmation: async (certification) => {
    try {
      const { User } = require('./index');
      const user = await User.findByPk(certification.userId);
      
      if (!user) return;

      await smsService.sendSMS(user.phone,
        `Your certification "${certification.name}" has been submitted for verification. We'll notify you once it's reviewed.`,
        { purpose: 'certification_submitted', userId: user.id }
      );

    } catch (error) {
      logger.error('Submission confirmation failed:', error);
    }
  },

  /**
   * After update hook
   */
  afterUpdateHook: async (certification) => {
    try {
      // Track certification updates
      if (certification.changed()) {
        await YachiAnalytics.trackCertificationUpdate(certification);
      }
      
      // Update user stats if status changed
      if (certification.changed('status')) {
        await Certification.hooks.updateUserCertificationCount(certification.userId);
      }

      // Schedule renewal reminders if verified
      if (certification.status === 'verified' && certification.renewalRequired) {
        await Certification.hooks.scheduleRenewalReminders(certification);
      }

    } catch (error) {
      logger.error('After update hook error:', error);
    }
  },

  /**
   * Schedule renewal reminders
   */
  scheduleRenewalReminders: async (certification) => {
    if (!certification.expiryDate || !certification.renewalRequired) return;

    const expiryDate = new Date(certification.expiryDate);
    const now = new Date();
    const monthsUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24 * 30);

    // Schedule reminders at 3 months, 1 month, and 1 week before expiry
    const reminderIntervals = [3, 1, 0.25]; // months
    
    for (const interval of reminderIntervals) {
      if (monthsUntilExpiry > interval) {
        const reminderDate = new Date(expiryDate);
        reminderDate.setMonth(reminderDate.getMonth() - interval);
        
        // This would typically be handled by a job scheduler
        // For now, we'll store the reminder schedule
        certification.renewalReminders.push({
          scheduledDate: reminderDate.toISOString(),
          interval: `${interval} months`,
          sent: false
        });
      }
    }

    await certification.save();
  },

  /**
   * After destroy hook
   */
  afterDestroyHook: async (certification) => {
    try {
      // Track certification deletion
      await YachiAnalytics.trackCertificationDeletion(certification);
      
      // Update user's certification count
      await Certification.hooks.updateUserCertificationCount(certification.userId);
      
      // Clean up documents
      await Certification.hooks.cleanupCertificationDocuments(certification);

    } catch (error) {
      logger.error('After destroy hook error:', error);
    }
  },

  /**
   * Update user certification count
   */
  updateUserCertificationCount: async (userId) => {
    try {
      const { User } = require('./index');
      
      const verifiedCertificationsCount = await Certification.count({
        where: { 
          userId, 
          status: 'verified'
        }
      });
      
      await User.update(
        { verifiedCertificationsCount },
        { where: { id: userId } }
      );
      
    } catch (error) {
      logger.error('User certification count update error:', error);
    }
  },

  /**
   * Clean up certification documents
   */
  cleanupCertificationDocuments: async (certification) => {
    try {
      const { fileUploadService } = require('../services/fileUploadService');
      
      // Delete main document
      if (certification.documentUrl) {
        await fileUploadService.deleteFile(certification.documentUrl);
      }
      
      // Delete additional documents
      if (certification.additionalDocuments && Array.isArray(certification.additionalDocuments)) {
        for (const doc of certification.additionalDocuments) {
          if (doc.url) {
            await fileUploadService.deleteFile(doc.url);
          }
        }
      }
      
    } catch (error) {
      logger.error('Certification document cleanup failed:', error);
    }
  }
};

// Instance Methods
Certification.prototype.getInstanceMethods = function() {
  return {
    /**
     * Verify certification
     */
    verify: async function(adminId, notes = '') {
      if (this.status === 'verified') {
        throw new Error('Certification is already verified');
      }
      
      await this.update({
        status: 'verified',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        verificationMethod: 'manual',
        metadata: {
          ...this.metadata,
          verificationNotes: notes,
          verifiedByAdmin: adminId
        }
      });
      
      logger.info('Certification verified', {
        certificationId: this.id,
        certificationName: this.name,
        adminId
      });
      
      return this;
    },

    /**
     * Reject certification
     */
    reject: async function(adminId, reason) {
      if (this.status === 'rejected') {
        throw new Error('Certification is already rejected');
      }
      
      if (!reason) {
        throw new Error('Rejection reason is required');
      }
      
      await this.update({
        status: 'rejected',
        rejectionReason: reason,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        metadata: {
          ...this.metadata,
          rejectedByAdmin: adminId
        }
      });
      
      logger.info('Certification rejected', {
        certificationId: this.id,
        certificationName: this.name,
        adminId,
        reason
      });
      
      return this;
    },

    /**
     * Renew certification
     */
    renew: async function(newExpiryDate, documentUrl = null) {
      if (!this.renewalRequired) {
        throw new Error('This certification does not require renewal');
      }
      
      if (!newExpiryDate || new Date(newExpiryDate) <= new Date()) {
        throw new Error('Renewal expiry date must be in the future');
      }
      
      const updates = {
        expiryDate: newExpiryDate,
        status: 'pending_verification',
        verificationAttempts: this.verificationAttempts + 1,
        lastVerificationAttempt: new Date()
      };
      
      if (documentUrl) {
        updates.documentUrl = documentUrl;
        // Trigger new AI analysis
        updates.aiAnalysis = {};
        updates.trustScore = 0.0;
      }
      
      await this.update(updates);
      
      logger.info('Certification renewal submitted', {
        certificationId: this.id,
        certificationName: this.name,
        newExpiryDate
      });
      
      return this;
    },

    /**
     * Add additional document
     */
    addDocument: async function(documentData) {
      const additionalDocuments = this.additionalDocuments || [];
      
      if (additionalDocuments.length >= 5) {
        throw new Error('Maximum 5 additional documents allowed');
      }
      
      const newDocument = {
        id: require('crypto').randomBytes(8).toString('hex'),
        url: documentData.url,
        name: documentData.name || 'Additional Document',
        description: documentData.description || '',
        uploadedAt: new Date().toISOString()
      };
      
      additionalDocuments.push(newDocument);
      
      await this.update({ additionalDocuments });
      return additionalDocuments;
    },

    /**
     * Remove additional document
     */
    removeDocument: async function(documentId) {
      const additionalDocuments = this.additionalDocuments.filter(doc => doc.id !== documentId);
      await this.update({ additionalDocuments });
      return additionalDocuments;
    },

    /**
     * Check if certification is valid
     */
    isValid: function() {
      if (this.status !== 'verified') return false;
      if (this.doesNotExpire) return true;
      if (!this.expiryDate) return true;
      
      return new Date(this.expiryDate) > new Date();
    },

    /**
     * Check if certification is expiring soon
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
     * Add skill coverage
     */
    addSkill: async function(skillId) {
      const skillsCovered = this.skillsCovered || [];
      
      if (!skillsCovered.includes(skillId)) {
        skillsCovered.push(skillId);
        await this.update({ skillsCovered });
      }
      
      return skillsCovered;
    },

    /**
     * Remove skill coverage
     */
    removeSkill: async function(skillId) {
      const skillsCovered = this.skillsCovered.filter(id => id !== skillId);
      await this.update({ skillsCovered });
      return skillsCovered;
    },

    /**
     * Update trust score
     */
    updateTrustScore: async function() {
      try {
        const analysis = await YachiAI.analyzeDocument({
          documentUrl: this.documentUrl,
          documentType: 'certification',
          issuingOrganization: this.issuingOrganization
        });

        if (analysis.confidenceScore) {
          await this.update({ trustScore: analysis.confidenceScore });
        }
        
        return analysis.confidenceScore;
        
      } catch (error) {
        logger.error('Trust score update failed:', error);
        return this.trustScore;
      }
    },

    /**
     * Get certification analytics
     */
    getAnalytics: async function() {
      try {
        const analytics = await YachiAnalytics.getCertificationAnalytics(this.id);
        return analytics;
      } catch (error) {
        logger.error('Get certification analytics failed:', error);
        return null;
      }
    },

    /**
     * Send manual reminder
     */
    sendRenewalReminder: async function() {
      if (!this.isExpiringSoon()) {
        throw new Error('Certification is not expiring soon');
      }
      
      await Certification.hooks.sendExpirationNotification(this);
      
      // Record the reminder
      const renewalReminders = this.renewalReminders || [];
      renewalReminders.push({
        sentDate: new Date().toISOString(),
        type: 'manual',
        expiryDate: this.expiryDate
      });
      
      await this.update({ renewalReminders });
      
      return true;
    }
  };
};

// Static Methods
Certification.findUserCertifications = async function(userId, filters = {}) {
  const where = { userId };
  
  // Apply filters
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.category) {
    where.category = filters.category;
  }
  
  if (filters.validOnly) {
    where.status = 'verified';
    where[sequelize.Op.or] = [
      { doesNotExpire: true },
      { expiryDate: { [sequelize.Op.gt]: new Date() } },
      { expiryDate: null }
    ];
  }
  
  return await Certification.findAll({
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

Certification.findExpiringCertifications = async function(days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  
  return await Certification.findAll({
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

Certification.findPendingVerification = async function(filters = {}) {
  const where = {
    status: 'pending_verification'
  };
  
  // Apply filters
  if (filters.category) {
    where.category = filters.category;
  }
  
  if (filters.verificationMethod) {
    where.verificationMethod = filters.verificationMethod;
  }
  
  return await Certification.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'rating']
      }
    ],
    order: [['createdAt', 'ASC']],
    limit: filters.limit || 50,
    offset: filters.offset || 0
  });
};

Certification.getCertificationStats = async function(userId = null) {
  const where = userId ? { userId } : {};
  
  const stats = await Certification.findAll({
    where,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCertifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "verified" THEN 1 ELSE 0 END')), 'verifiedCertifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "pending_verification" THEN 1 ELSE 0 END')), 'pendingCertifications'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "expired" THEN 1 ELSE 0 END')), 'expiredCertifications'],
      [sequelize.fn('AVG', sequelize.col('trust_score')), 'avgTrustScore']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

Certification.searchCertifications = async function(query, filters = {}) {
  const where = {
    status: 'verified',
    [sequelize.Op.or]: [
      { name: { [sequelize.Op.iLike]: `%${query}%` } },
      { issuingOrganization: { [sequelize.Op.iLike]: `%${query}%` } },
      { description: { [sequelize.Op.iLike]: `%${query}%` } }
    ]
  };
  
  // Apply additional filters
  Object.assign(where, filters);
  
  return await Certification.findAll({
    where,
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'avatar', 'rating']
      }
    ],
    order: [['trustScore', 'DESC']],
    limit: filters.limit || 20,
    offset: filters.offset || 0
  });
};

Certification.getPopularOrganizations = async function(limit = 10) {
  const results = await Certification.findAll({
    attributes: [
      'issuingOrganization',
      [sequelize.fn('COUNT', sequelize.col('id')), 'certificationCount'],
      [sequelize.fn('AVG', sequelize.col('trust_score')), 'avgTrustScore'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "verified" THEN 1 ELSE 0 END')), 'verifiedCount']
    ],
    where: {
      status: 'verified'
    },
    group: ['issuingOrganization'],
    order: [[sequelize.literal('"certificationCount"'), 'DESC']],
    limit
  });
  
  return results;
};

// Associations will be defined in the model index file
Certification.associate = function(models) {
  Certification.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });
  
  Certification.belongsTo(models.User, {
    foreignKey: 'verifiedBy',
    as: 'verifier'
  });
  
  Certification.belongsToMany(models.Skill, {
    through: 'CertificationSkills',
    foreignKey: 'certificationId',
    otherKey: 'skillId',
    as: 'skills'
  });
};

module.exports = Certification;