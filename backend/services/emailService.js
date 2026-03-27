// services/emailService.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const redis = require('../config/redis');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiAI } = require('./yachiAI');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporters = {
      primary: this.createPrimaryTransporter(),
      secondary: this.createSecondaryTransporter(),
      marketing: this.createMarketingTransporter()
    };
    
    this.activeTransporter = 'primary';
    this.templateCache = new Map();
    this.rateLimitWindow = 3600000; // 1 hour
    this.maxRetries = 3;
    
    this.initializeEmailService();
  }

  /**
   * Create primary email transporter
   */
  createPrimaryTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10
    });
  }

  /**
   * Create secondary email transporter (SendGrid)
   */
  createSecondaryTransporter() {
    if (process.env.SENDGRID_API_KEY) {
      return nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    }
    return null;
  }

  /**
   * Create marketing email transporter (Mailchimp/Mailgun)
   */
  createMarketingTransporter() {
    if (process.env.MAILGUN_API_KEY) {
      return nodemailer.createTransporter({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_USER,
          pass: process.env.MAILGUN_API_KEY
        }
      });
    }
    return null;
  }

  /**
   * Initialize email service
   */
  initializeEmailService() {
    // Verify transporter configuration
    this.verifyTransporters();
    
    // Register custom Handlebars helpers
    this.registerHandlebarsHelpers();
    
    // Preload commonly used templates
    this.preloadTemplates();

    logger.info('Email Service initialized successfully');
  }

  /**
   * Verify all email transporters
   */
  async verifyTransporters() {
    for (const [name, transporter] of Object.entries(this.transporters)) {
      if (transporter) {
        try {
          await transporter.verify();
          logger.info(`Email transporter ${name} verified successfully`);
        } catch (error) {
          logger.warn(`Email transporter ${name} verification failed:`, error.message);
        }
      }
    }
  }

  /**
   * Register custom Handlebars helpers
   */
  registerHandlebarsHelpers() {
    // Format currency for Ethiopian Birr
    handlebars.registerHelper('formatCurrency', function(amount) {
      if (!amount) return '₦0';
      return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB'
      }).format(amount);
    });

    // Format date
    handlebars.registerHelper('formatDate', function(date) {
      return new Date(date).toLocaleDateString('en-ET', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Format date with time
    handlebars.registerHelper('formatDateTime', function(date) {
      return new Date(date).toLocaleString('en-ET', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Conditional comparison
    handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Check if value exists
    handlebars.registerHelper('exists', function(value) {
      return value !== null && value !== undefined && value !== '';
    });

    // Localized text
    handlebars.registerHelper('localize', function(text, language) {
      const translations = {
        'thank_you': {
          'en': 'Thank you',
          'am': 'እናመሰግናለን',
          'or': 'Galatoomaa'
        },
        'view_details': {
          'en': 'View Details',
          'am': 'ዝርዝሮችን ይመልከቱ',
          'or': 'Fa\'iinsa ilaali'
        }
        // Add more translations as needed
      };

      return translations[text]?.[language] || translations[text]?.['en'] || text;
    });
  }

  /**
   * Preload commonly used email templates
   */
  async preloadTemplates() {
    const commonTemplates = [
      'welcome',
      'otp-verification',
      'booking-confirmation',
      'payment-receipt',
      'password-reset'
    ];

    for (const template of commonTemplates) {
      try {
        await this.loadTemplate(template);
      } catch (error) {
        logger.warn(`Failed to preload template ${template}:`, error.message);
      }
    }
  }

  /**
   * Send email with template
   */
  async sendEmail(to, templateName, data, options = {}) {
    const emailId = this.generateEmailId();
    const startTime = Date.now();

    try {
      // Validate email parameters
      this.validateEmailParameters(to, templateName, data);

      // Check rate limiting
      await this.checkRateLimit(to, options.purpose);

      // Load and compile template
      const template = await this.loadTemplate(templateName);
      const { subject, html, text } = await this.compileTemplate(template, data, options.language);

      // Prepare email options
      const mailOptions = {
        from: this.getFromAddress(options.purpose),
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        replyTo: options.replyTo || process.env.EMAIL_REPLY_TO,
        headers: {
          'X-Email-ID': emailId,
          'X-Template': templateName,
          'X-Purpose': options.purpose || 'general'
        },
        ...options.mailOptions
      };

      // Add CC and BCC if specified
      if (options.cc) mailOptions.cc = options.cc;
      if (options.bcc) mailOptions.bcc = options.bcc;

      // Add attachments if any
      if (options.attachments) {
        mailOptions.attachments = await this.processAttachments(options.attachments);
      }

      // Send email with retry logic
      const result = await this.sendWithRetry(mailOptions, options.priority);

      // Track successful delivery
      await this.trackEmailDelivery({
        emailId,
        to,
        template: templateName,
        purpose: options.purpose,
        subject,
        status: 'sent',
        provider: result.provider,
        deliveryTime: Date.now() - startTime,
        messageId: result.messageId
      });

      logger.info(`Email sent successfully to ${to}`, {
        emailId,
        template: templateName,
        purpose: options.purpose,
        provider: result.provider,
        deliveryTime: Date.now() - startTime
      });

      return {
        success: true,
        emailId,
        messageId: result.messageId,
        provider: result.provider,
        queued: result.queued || false
      };

    } catch (error) {
      // Track failed delivery
      await this.trackEmailDelivery({
        emailId,
        to,
        template: templateName,
        purpose: options.purpose,
        status: 'failed',
        error: error.message,
        deliveryTime: Date.now() - startTime
      });

      logger.error('Email sending failed:', {
        emailId,
        to,
        template: templateName,
        purpose: options.purpose,
        error: error.message
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email with retry logic
   */
  async sendWithRetry(mailOptions, priority = 'medium', attempt = 1) {
    const transporterName = this.selectTransporter(priority);
    const transporter = this.transporters[transporterName];

    if (!transporter) {
      throw new Error(`No email transporter available for ${transporterName}`);
    }

    try {
      const result = await transporter.sendMail(mailOptions);
      return {
        ...result,
        provider: transporterName,
        queued: result.queued || false
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        logger.warn(`Email send attempt ${attempt} failed, retrying...`, {
          error: error.message,
          transporter: transporterName
        });

        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt) * 1000);
        return await this.sendWithRetry(mailOptions, priority, attempt + 1);
      }

      // Try fallback transporter
      if (transporterName !== 'primary') {
        logger.warn(`Falling back to primary transporter after ${attempt} attempts`);
        return await this.sendWithRetry(mailOptions, priority, 1);
      }

      throw error;
    }
  }

  /**
   * Select appropriate transporter based on priority
   */
  selectTransporter(priority) {
    const priorityMap = {
      high: 'primary',
      medium: 'primary',
      low: 'marketing',
      bulk: 'marketing'
    };

    const selected = priorityMap[priority] || 'primary';
    return this.transporters[selected] ? selected : 'primary';
  }

  /**
   * Load email template
   */
  async loadTemplate(templateName) {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'emails',
      `${templateName}.html`
    );

    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const template = {
        html: templateContent,
        subject: this.extractSubject(templateContent),
        text: this.extractTextContent(templateContent)
      };

      // Cache the template
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      logger.error(`Failed to load email template: ${templateName}`, error);
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  /**
   * Extract subject from template
   */
  extractSubject(templateContent) {
    const subjectMatch = templateContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    return subjectMatch ? subjectMatch[1].trim() : 'Notification from Yachi';
  }

  /**
   * Extract text content from HTML
   */
  extractTextContent(htmlContent) {
    return htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Compile template with data
   */
  async compileTemplate(template, data, language = 'en') {
    const context = {
      ...data,
      language: language || 'en',
      currentYear: new Date().getFullYear(),
      platform: {
        name: 'Yachi',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@yachi.com',
        website: process.env.WEBSITE_URL || 'https://yachi.com',
        phone: process.env.SUPPORT_PHONE || '+251-911-123456'
      },
      user: data.user || {}
    };

    try {
      const compiledHtml = handlebars.compile(template.html)(context);
      const compiledSubject = handlebars.compile(template.subject)(context);
      const compiledText = template.text ? handlebars.compile(template.text)(context) : null;

      // AI-powered content optimization
      const optimizedContent = await YachiAI.optimizeEmailContent({
        html: compiledHtml,
        subject: compiledSubject,
        context,
        language
      });

      return {
        subject: optimizedContent.subject || compiledSubject,
        html: optimizedContent.html || compiledHtml,
        text: optimizedContent.text || compiledText
      };
    } catch (error) {
      logger.error('Template compilation failed:', error);
      throw new Error('Failed to compile email template');
    }
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user, options = {}) {
    const data = {
      user: {
        name: user.name,
        email: user.email,
        type: user.role
      },
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    return await this.sendEmail(
      user.email,
      'welcome',
      data,
      {
        purpose: 'welcome',
        priority: 'high',
        language: user.language || 'en',
        ...options
      }
    );
  }

  /**
   * Send OTP verification email
   */
  async sendOTPEmail(email, otpCode, options = {}) {
    const data = {
      otp: otpCode,
      expiresIn: options.expiresIn || 10, // minutes
      purpose: options.purpose || 'account_verification'
    };

    const result = await this.sendEmail(
      email,
      'otp-verification',
      data,
      {
        purpose: 'otp_verification',
        priority: 'high',
        language: options.language || 'en',
        ...options
      }
    );

    // Cache OTP for verification
    const verificationKey = `email_otp:${email}`;
    await redis.setex(verificationKey, (options.expiresIn || 10) * 60, otpCode);

    return result;
  }

  /**
   * Verify OTP from email
   */
  async verifyEmailOTP(email, otpCode) {
    const verificationKey = `email_otp:${email}`;
    
    try {
      const storedOTP = await redis.get(verificationKey);
      
      if (!storedOTP) {
        throw new Error('OTP expired or not found');
      }

      if (storedOTP !== otpCode) {
        await this.trackFailedOTPAttempt(email);
        throw new Error('Invalid OTP code');
      }

      // Clear OTP after successful verification
      await redis.del(verificationKey);

      await YachiAnalytics.trackEmailOTPVerification(email, true);

      logger.info(`Email OTP verified successfully for ${email}`);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      await YachiAnalytics.trackEmailOTPVerification(email, false);
      throw error;
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(booking, user, options = {}) {
    const data = {
      user: {
        name: user.name,
        email: user.email
      },
      booking: {
        id: booking.id,
        service: booking.serviceName,
        date: booking.scheduledDate,
        time: booking.scheduledTime,
        duration: booking.duration,
        amount: booking.amount,
        provider: booking.providerName,
        location: booking.location
      },
      bookingUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    return await this.sendEmail(
      user.email,
      'booking-confirmation',
      data,
      {
        purpose: 'booking_confirmation',
        priority: 'high',
        language: user.language || 'en',
        ...options
      }
    );
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(payment, user, options = {}) {
    const data = {
      user: {
        name: user.name,
        email: user.email
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        service: payment.serviceName,
        date: payment.paidAt,
        method: payment.paymentMethod,
        transactionId: payment.transactionId
      },
      receiptUrl: `${process.env.FRONTEND_URL}/receipts/${payment.id}`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    return await this.sendEmail(
      user.email,
      'payment-receipt',
      data,
      {
        purpose: 'payment_receipt',
        priority: 'medium',
        language: user.language || 'en',
        ...options
      }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken, options = {}) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const data = {
      user: {
        name: user.name,
        email: user.email
      },
      resetUrl,
      expiresIn: 60 // minutes
    };

    return await this.sendEmail(
      user.email,
      'password-reset',
      data,
      {
        purpose: 'password_reset',
        priority: 'high',
        language: user.language || 'en',
        ...options
      }
    );
  }

  /**
   * Send worker application status update
   */
  async sendApplicationStatusUpdate(user, application, options = {}) {
    const data = {
      user: {
        name: user.name,
        email: user.email
      },
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        reviewedAt: application.reviewedAt,
        comments: application.comments
      },
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    return await this.sendEmail(
      user.email,
      'application-status',
      data,
      {
        purpose: 'application_update',
        priority: 'medium',
        language: user.language || 'en',
        ...options
      }
    );
  }

  /**
   * Send service completion notification
   */
  async sendServiceCompletionNotification(service, client, worker, options = {}) {
    const data = {
      client: {
        name: client.name,
        email: client.email
      },
      worker: {
        name: worker.name,
        rating: worker.rating
      },
      service: {
        id: service.id,
        type: service.type,
        completedAt: service.completedAt,
        amount: service.amount,
        location: service.location
      },
      reviewUrl: `${process.env.FRONTEND_URL}/services/${service.id}/review`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    };

    return await this.sendEmail(
      client.email,
      'service-completion',
      data,
      {
        purpose: 'service_completion',
        priority: 'medium',
        language: client.language || 'en',
        ...options
      }
    );
  }

  /**
   * Send bulk marketing email
   */
  async sendBulkEmail(recipients, templateName, data, options = {}) {
    const results = {
      successful: [],
      failed: []
    };

    // Process in batches to avoid overwhelming the email service
    const batchSize = options.batchSize || 50;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.sendEmail(
            recipient.email,
            templateName,
            { ...data, user: recipient },
            {
              purpose: 'marketing',
              priority: 'low',
              language: recipient.language || 'en',
              ...options
            }
          );
          
          results.successful.push({
            email: recipient.email,
            result
          });
        } catch (error) {
          results.failed.push({
            email: recipient.email,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Process email attachments
   */
  async processAttachments(attachments) {
    return attachments.map(attachment => ({
      filename: attachment.filename,
      path: attachment.path,
      contentType: attachment.contentType,
      ...(attachment.content && { content: attachment.content })
    }));
  }

  /**
   * Get from address based on email purpose
   */
  getFromAddress(purpose) {
    const addresses = {
      welcome: `"Yachi Welcome" <welcome@${process.env.EMAIL_DOMAIN}>`,
      otp_verification: `"Yachi Security" <security@${process.env.EMAIL_DOMAIN}>`,
      booking_confirmation: `"Yachi Bookings" <bookings@${process.env.EMAIL_DOMAIN}>`,
      payment_receipt: `"Yachi Payments" <payments@${process.env.EMAIL_DOMAIN}>`,
      password_reset: `"Yachi Security" <security@${process.env.EMAIL_DOMAIN}>`,
      marketing: `"Yachi Updates" <updates@${process.env.EMAIL_DOMAIN}>`,
      general: `"Yachi" <noreply@${process.env.EMAIL_DOMAIN}>`
    };

    return addresses[purpose] || addresses.general;
  }

  /**
   * Validate email parameters
   */
  validateEmailParameters(to, templateName, data) {
    if (!to || !this.isValidEmail(to)) {
      throw new Error('Invalid recipient email address');
    }

    if (!templateName) {
      throw new Error('Email template name is required');
    }

    if (!data) {
      throw new Error('Email data is required');
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check rate limiting for email sending
   */
  async checkRateLimit(email, purpose) {
    const rateLimitKey = `email_rate:${email}:${purpose}`;
    const blockKey = `email_blocked:${email}`;

    // Check if email is blocked
    const isBlocked = await redis.get(blockKey);
    if (isBlocked) {
      throw new Error('Email sending temporarily blocked for this address');
    }

    // Check rate limit
    const currentCount = await redis.incr(rateLimitKey);
    
    if (currentCount === 1) {
      await redis.expire(rateLimitKey, this.rateLimitWindow / 1000);
    }

    const limits = {
      otp_verification: 5,
      password_reset: 3,
      welcome: 2,
      marketing: 1,
      general: 10
    };

    const limit = limits[purpose] || limits.general;

    if (currentCount > limit) {
      // Block email temporarily if exceeding limits significantly
      if (currentCount > limit * 2) {
        await redis.setex(blockKey, 3600, 'blocked'); // Block for 1 hour
      }

      throw new Error(`Email rate limit exceeded for ${purpose}. Please try again later.`);
    }
  }

  /**
   * Track failed OTP attempts
   */
  async trackFailedOTPAttempt(email) {
    const attemptKey = `email_otp_attempts:${email}`;
    const attempts = await redis.incr(attemptKey);
    
    if (attempts === 1) {
      await redis.expire(attemptKey, 900); // 15 minutes
    }

    if (attempts >= 5) {
      const blockKey = `email_otp_blocked:${email}`;
      await redis.setex(blockKey, 3600, 'blocked'); // Block for 1 hour
      
      logger.warn(`Email OTP attempts blocked for ${email} after ${attempts} failed attempts`);
    }

    await YachiAnalytics.trackEvent('email_otp_failed_attempt', {
      email,
      attempts,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate unique email ID
   */
  generateEmailId() {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track email delivery analytics
   */
  async trackEmailDelivery(deliveryData) {
    try {
      await YachiAnalytics.trackEmailEvent(deliveryData);

      // Store in database for reporting
      const { EmailDelivery } = require('../models');
      
      await EmailDelivery.create({
        emailId: deliveryData.emailId,
        recipient: deliveryData.to,
        template: deliveryData.template,
        purpose: deliveryData.purpose,
        subject: deliveryData.subject,
        provider: deliveryData.provider,
        status: deliveryData.status,
        deliveryTime: deliveryData.deliveryTime,
        messageId: deliveryData.messageId,
        error: deliveryData.error
      });

    } catch (error) {
      logger.error('Failed to track email delivery:', error);
    }
  }

  /**
   * Get email delivery status
   */
  async getDeliveryStatus(emailId) {
    try {
      const { EmailDelivery } = require('../models');
      
      const delivery = await EmailDelivery.findOne({
        where: { emailId },
        attributes: ['status', 'deliveryTime', 'provider', 'messageId', 'error']
      });

      return delivery || { status: 'unknown' };
    } catch (error) {
      logger.error('Failed to get email delivery status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(timeRange = '7d') {
    try {
      const { EmailDelivery, Sequelize } = require('../models');
      
      const where = this.buildTimeRangeQuery(timeRange);
      
      const stats = await EmailDelivery.findAll({
        where,
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
          [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = "sent" THEN 1 ELSE 0 END')), 'sent'],
          [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = "failed" THEN 1 ELSE 0 END')), 'failed'],
          [Sequelize.fn('AVG', Sequelize.col('deliveryTime')), 'avgDeliveryTime'],
          [Sequelize.fn('COUNT', Sequelize.literal('DISTINCT recipient')), 'uniqueRecipients']
        ],
        raw: true
      });

      const purposeStats = await EmailDelivery.findAll({
        where,
        attributes: [
          'purpose',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('AVG', Sequelize.col('deliveryTime')), 'avgDeliveryTime']
        ],
        group: ['purpose'],
        raw: true
      });

      return {
        overview: stats[0] || {},
        byPurpose: purposeStats,
        timeRange
      };
    } catch (error) {
      logger.error('Failed to get email statistics:', error);
      throw new Error('Failed to retrieve email statistics');
    }
  }

  /**
   * Build time range query for statistics
   */
  buildTimeRangeQuery(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      createdAt: {
        [Sequelize.Op.gte]: startDate
      }
    };
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = { emailService };