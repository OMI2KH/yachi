const { YachiLogger } = require('../utils/logger');

/**
 * 🎯 Yachi Services Configuration
 * Centralized configuration for all external and internal services
 */

class ServicesConfig {
  constructor() {
    this.setupEnvironment();
    this.validateConfig();
  }

  /**
   * 🎯 Environment setup
   */
  setupEnvironment() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTesting = process.env.NODE_ENV === 'test';
  }

  /**
   * 🔍 Configuration validation
   */
  validateConfig() {
    const required = [
      'PAYMENT_PROVIDER',
      'EMAIL_SERVICE',
      'SMS_PROVIDER',
      'FILE_STORAGE_PROVIDER'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0 && this.isProduction) {
      YachiLogger.error(`Missing required service configuration: ${missing.join(', ')}`);
      throw new Error(`Missing service configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * 💳 Payment Services Configuration
   */
  get paymentServices() {
    return {
      // Primary payment provider
      primary: {
        provider: process.env.PAYMENT_PROVIDER || 'telebirr',
        name: 'TeleBirr',
        baseUrl: process.env.TELEBIRR_BASE_URL || 'https://api.telebirr.com/v1',
        apiKey: process.env.TELEBIRR_API_KEY,
        secretKey: process.env.TELEBIRR_SECRET_KEY,
        merchantId: process.env.TELEBIRR_MERCHANT_ID,
        appId: process.env.TELEBIRR_APP_ID,
        
        // Configuration
        timeout: 30000,
        retryAttempts: 3,
        webhookSecret: process.env.TELEBIRR_WEBHOOK_SECRET,
        
        // Features
        features: {
          mobileMoney: true,
          bankTransfer: true,
          internationalPayments: false,
          recurringPayments: true,
          refunds: true
        },

        // Endpoints
        endpoints: {
          payment: '/payments/initiate',
          verify: '/payments/verify',
          refund: '/payments/refund',
          webhook: '/webhooks/telebirr'
        }
      },

      // Fallback payment providers
      fallbacks: [
        {
          provider: 'hellocash',
          name: 'HelloCash',
          baseUrl: process.env.HELLOCASH_BASE_URL || 'https://api.hellocash.com/v1',
          apiKey: process.env.HELLOCASH_API_KEY,
          timeout: 25000,
          retryAttempts: 2,
          enabled: !!process.env.HELLOCASH_API_KEY
        },
        {
          provider: 'cbe',
          name: 'CBE Birr',
          baseUrl: process.env.CBE_BASE_URL || 'https://api.cbe.com.et/v1',
          apiKey: process.env.CBE_API_KEY,
          timeout: 25000,
          retryAttempts: 2,
          enabled: !!process.env.CBE_API_KEY
        }
      ],

      // Payment configuration
      config: {
        defaultCurrency: 'ETB',
        supportedCurrencies: ['ETB', 'USD'],
        minAmount: 1, // 1 ETB
        maxAmount: 100000, // 100,000 ETB
        settlementDelay: 2, // days
        feePercentage: 0.015, // 1.5%
        taxPercentage: 0.15, // 15% VAT
        
        // Security
        encryption: {
          algorithm: 'aes-256-gcm',
          key: process.env.PAYMENT_ENCRYPTION_KEY
        },

        // Webhooks
        webhooks: {
          enabled: true,
          signatureHeader: 'X-Payment-Signature',
          verification: {
            enabled: true,
            tolerance: 5 * 60 * 1000 // 5 minutes
          }
        }
      }
    };
  }

  /**
   * 📧 Email Services Configuration
   */
  get emailServices() {
    return {
      // Primary email provider
      primary: {
        provider: process.env.EMAIL_SERVICE || 'sendgrid',
        name: 'SendGrid',
        apiKey: process.env.SENDGRID_API_KEY,
        baseUrl: 'https://api.sendgrid.com/v3',
        fromEmail: process.env.FROM_EMAIL || 'noreply@yachi.com',
        fromName: process.env.FROM_NAME || 'Yachi Platform',
        
        // Configuration
        timeout: 15000,
        retryAttempts: 3,
        
        // Templates
        templates: {
          welcome: 'd-welcome-template-id',
          verification: 'd-verification-template-id',
          passwordReset: 'd-password-reset-template-id',
          bookingConfirmation: 'd-booking-confirmation-template-id',
          paymentReceipt: 'd-payment-receipt-template-id',
          workerVerification: 'd-worker-verification-template-id'
        }
      },

      // Fallback email provider
      fallback: {
        provider: 'mailgun',
        name: 'Mailgun',
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        baseUrl: `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}`,
        timeout: 15000,
        retryAttempts: 2,
        enabled: !!process.env.MAILGUN_API_KEY
      },

      // Email configuration
      config: {
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 100,
        rateLimit: 100, // emails per hour
        tracking: {
          opens: true,
          clicks: true
        },
        
        // Templates configuration
        templateConfig: {
          company: {
            name: 'Yachi',
            logo: 'https://yachi.com/logo.png',
            address: 'Addis Ababa, Ethiopia',
            phone: '+251-XXX-XXXX',
            website: 'https://yachi.com'
          },
          colors: {
            primary: '#10B981',
            secondary: '#3B82F6',
            background: '#F9FAFB'
          }
        }
      }
    };
  }

  /**
   * 📱 SMS Services Configuration
   */
  get smsServices() {
    return {
      // Primary SMS provider
      primary: {
        provider: process.env.SMS_PROVIDER || 'ethio telecom',
        name: 'Ethio Telecom SMS',
        apiKey: process.env.ETHIO_TELECOM_SMS_API_KEY,
        baseUrl: process.env.ETHIO_TELECOM_SMS_BASE_URL,
        shortCode: process.env.SMS_SHORT_CODE,
        
        // Configuration
        timeout: 10000,
        retryAttempts: 2,
        
        // Features
        features: {
          unicode: true,
          flashMessages: false,
          scheduledSMS: true
        }
      },

      // Fallback SMS providers
      fallbacks: [
        {
          provider: 'africastalking',
          name: 'Africa\'s Talking',
          username: process.env.AT_USERNAME,
          apiKey: process.env.AT_API_KEY,
          shortCode: process.env.AT_SHORT_CODE,
          timeout: 10000,
          retryAttempts: 2,
          enabled: !!process.env.AT_API_KEY
        },
        {
          provider: 'twilio',
          name: 'Twilio',
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          phoneNumber: process.env.TWILIO_PHONE_NUMBER,
          timeout: 10000,
          retryAttempts: 2,
          enabled: !!process.env.TWILIO_ACCOUNT_SID
        }
      ],

      // SMS configuration
      config: {
        maxLength: 160,
        unicodeMaxLength: 70,
        rateLimit: 50, // SMS per minute
        defaultCountryCode: 'ET',
        allowedCountries: ['ET', 'US', 'GB'],
        
        // Templates
        templates: {
          verification: 'Your Yachi verification code is: {code}. Valid for 10 minutes.',
          welcome: 'Welcome to Yachi! Start finding skilled workers or offering your services today.',
          bookingConfirmed: 'Your booking with {worker} is confirmed for {date}. Details: {url}',
          paymentConfirmed: 'Payment of {amount} ETB received for {service}. Thank you!',
          appointmentReminder: 'Reminder: Your appointment with {worker} is in {time}.'
        }
      }
    };
  }

  /**
   * 📁 File Storage Services Configuration
   */
  get fileStorageServices() {
    return {
      // Primary storage provider
      primary: {
        provider: process.env.FILE_STORAGE_PROVIDER || 'cloudinary',
        name: 'Cloudinary',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        
        // Configuration
        timeout: 30000,
        retryAttempts: 3,
        
        // Upload presets
        uploadPresets: {
          profile: 'yachi_profile_preset',
          portfolio: 'yachi_portfolio_preset',
          document: 'yachi_document_preset',
          temporary: 'yachi_temp_preset'
        },

        // Transformations
        transformations: {
          profile: {
            width: 300,
            height: 300,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            format: 'webp'
          },
          portfolio: {
            width: 800,
            height: 600,
            crop: 'limit',
            quality: 'auto',
            format: 'webp'
          },
          thumbnail: {
            width: 150,
            height: 150,
            crop: 'fill',
            quality: 'auto',
            format: 'webp'
          },
          document: {
            quality: 'auto',
            format: 'pdf'
          }
        }
      },

      // Fallback storage provider
      fallback: {
        provider: 'aws',
        name: 'AWS S3',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_BUCKET_NAME,
        timeout: 30000,
        retryAttempts: 2,
        enabled: !!process.env.AWS_ACCESS_KEY_ID
      },

      // File storage configuration
      config: {
        maxFileSize: {
          image: 10 * 1024 * 1024, // 10MB
          document: 25 * 1024 * 1024, // 25MB
          video: 100 * 1024 * 1024 // 100MB
        },
        
        allowedMimeTypes: {
          image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
          document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
          video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo']
        },
        
        // Storage paths
        paths: {
          profiles: 'profiles',
          portfolios: 'portfolios',
          documents: 'documents',
          verifications: 'verifications',
          temp: 'temp'
        },
        
        // CDN configuration
        cdn: {
          enabled: true,
          baseUrl: process.env.CDN_BASE_URL,
          cacheTtl: 31536000 // 1 year
        }
      }
    };
  }

  /**
   * 🎯 AI/ML Services Configuration
   */
  get aiServices() {
    return {
      // Yachi AI Service
      yachiAI: {
        baseUrl: process.env.YACHI_AI_BASE_URL || 'http://localhost:8000',
        apiKey: process.env.YACHI_AI_API_KEY,
        timeout: 45000,
        retryAttempts: 2,
        
        // Endpoints
        endpoints: {
          analyzeSkills: '/ai/skills/analyze',
          verifyDocument: '/ai/documents/verify',
          matchWorkers: '/ai/matching/workers',
          predictPricing: '/ai/pricing/predict',
          sentimentAnalysis: '/ai/sentiment/analyze',
          portfolioEnhancement: '/ai/portfolio/enhance'
        },
        
        // Features
        features: {
          skillAnalysis: true,
          documentVerification: true,
          workerMatching: true,
          pricePrediction: true,
          sentimentAnalysis: true,
          portfolioEnhancement: true,
          fraudDetection: true
        },
        
        // Configuration
        config: {
          confidenceThreshold: 0.8,
          maxWorkersToMatch: 20,
          analysisTimeout: 30000
        }
      },

      // External AI services
      external: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          organization: process.env.OPENAI_ORG_ID,
          timeout: 30000,
          retryAttempts: 2,
          enabled: !!process.env.OPENAI_API_KEY,
          models: {
            chat: 'gpt-4',
            embedding: 'text-embedding-ada-002'
          }
        },
        
        googleAI: {
          apiKey: process.env.GOOGLE_AI_API_KEY,
          timeout: 30000,
          retryAttempts: 2,
          enabled: !!process.env.GOOGLE_AI_API_KEY
        }
      }
    };
  }

  /**
   * 📊 Analytics Services Configuration
   */
  get analyticsServices() {
    return {
      yachiAnalytics: {
        enabled: true,
        baseUrl: process.env.YACHI_ANALYTICS_BASE_URL || 'http://localhost:8001',
        apiKey: process.env.YACHI_ANALYTICS_API_KEY,
        timeout: 10000,
        retryAttempts: 1,
        
        // Endpoints
        endpoints: {
          trackEvent: '/analytics/events/track',
          getUserStats: '/analytics/users/stats',
          getPlatformStats: '/analytics/platform/stats',
          getRevenueStats: '/analytics/revenue/stats'
        },
        
        // Events to track
        events: {
          user: ['signup', 'login', 'profile_update', 'verification'],
          worker: ['service_created', 'booking_accepted', 'job_completed', 'review_received'],
          client: ['service_booked', 'payment_made', 'review_given'],
          platform: ['search_performed', 'match_made', 'transaction_completed']
        },
        
        // Configuration
        config: {
          batchSize: 50,
          flushInterval: 30000, // 30 seconds
          retentionDays: 365
        }
      },

      // External analytics
      external: {
        googleAnalytics: {
          measurementId: process.env.GA_MEASUREMENT_ID,
          enabled: !!process.env.GA_MEASUREMENT_ID
        },
        
        mixpanel: {
          token: process.env.MIXPANEL_TOKEN,
          enabled: !!process.env.MIXPANEL_TOKEN
        }
      }
    };
  }

  /**
   * 🎮 Gamification Services Configuration
   */
  get gamificationServices() {
    return {
      yachiGamification: {
        enabled: true,
        baseUrl: process.env.YACHI_GAMIFICATION_BASE_URL || 'http://localhost:8002',
        apiKey: process.env.YACHI_GAMIFICATION_API_KEY,
        timeout: 10000,
        retryAttempts: 1,
        
        // Endpoints
        endpoints: {
          awardPoints: '/gamification/points/award',
          getLeaderboard: '/gamification/leaderboard',
          getUserProfile: '/gamification/user/profile',
          checkAchievements: '/gamification/achievements/check'
        },
        
        // Points system
        points: {
          verification: {
            fayda: 50,
            selfie: 25,
            document: 10
          },
          profile: {
            complete: 100,
            skillAdded: 5,
            portfolioAdded: 15
          },
          transactions: {
            jobCompleted: 20,
            positiveReview: 10,
            repeatClient: 15
          },
          social: {
            referral: 25,
            share: 5
          }
        },
        
        // Achievements
        achievements: {
          verifiedIdentity: { points: 50, badge: 'verified' },
          profileComplete: { points: 100, badge: 'complete' },
          firstJob: { points: 20, badge: 'starter' },
          fiveStarRating: { points: 50, badge: 'excellent' },
          powerUser: { points: 500, badge: 'power' }
        },
        
        // Leaderboards
        leaderboards: {
          weekly: { reset: 'weekly', limit: 100 },
          monthly: { reset: 'monthly', limit: 100 },
          allTime: { reset: 'never', limit: 100 }
        }
      }
    };
  }

  /**
   * 🔔 Notification Services Configuration
   */
  get notificationServices() {
    return {
      yachiNotifications: {
        enabled: true,
        baseUrl: process.env.YACHI_NOTIFICATIONS_BASE_URL || 'http://localhost:8003',
        apiKey: process.env.YACHI_NOTIFICATIONS_API_KEY,
        timeout: 10000,
        retryAttempts: 1,
        
        // Endpoints
        endpoints: {
          sendNotification: '/notifications/send',
          getUserNotifications: '/notifications/user',
          markAsRead: '/notifications/read',
          getSettings: '/notifications/settings'
        },
        
        // Channels
        channels: {
          email: true,
          sms: true,
          push: true,
          inApp: true
        },
        
        // Templates
        templates: {
          welcome: 'welcome_notification',
          verification: 'verification_notification',
          booking: 'booking_notification',
          payment: 'payment_notification',
          review: 'review_notification',
          system: 'system_notification'
        },
        
        // Configuration
        config: {
          batchSize: 100,
          rateLimit: 1000, // notifications per hour
          retentionDays: 90,
          priorityLevels: ['low', 'normal', 'high', 'urgent']
        }
      },

      // Push notification services
      push: {
        fcm: {
          projectId: process.env.FCM_PROJECT_ID,
          privateKey: process.env.FCM_PRIVATE_KEY,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          enabled: !!process.env.FCM_PRIVATE_KEY
        },
        
        apns: {
          teamId: process.env.APNS_TEAM_ID,
          keyId: process.env.APNS_KEY_ID,
          privateKey: process.env.APNS_PRIVATE_KEY,
          enabled: !!process.env.APNS_PRIVATE_KEY
        }
      }
    };
  }

  /**
   * 🗺️ Geolocation Services Configuration
   */
  get geolocationServices() {
    return {
      primary: {
        provider: 'google',
        name: 'Google Maps',
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
        baseUrl: 'https://maps.googleapis.com/maps/api',
        timeout: 10000,
        retryAttempts: 2,
        
        // Endpoints
        endpoints: {
          geocode: '/geocode/json',
          reverseGeocode: '/geocode/json',
          distance: '/distancematrix/json',
          places: '/place/nearbysearch/json'
        }
      },

      // Fallback provider
      fallback: {
        provider: 'mapbox',
        name: 'Mapbox',
        apiKey: process.env.MAPBOX_API_KEY,
        baseUrl: 'https://api.mapbox.com',
        timeout: 10000,
        retryAttempts: 2,
        enabled: !!process.env.MAPBOX_API_KEY
      },

      // Configuration
      config: {
        defaultCountry: 'ET',
        supportedCountries: ['ET', 'US', 'GB', 'CA', 'AU'],
        maxRadius: 100, // km
        cacheTtl: 24 * 60 * 60, // 24 hours
        rateLimit: 1000 // requests per day
      }
    };
  }

  /**
   * 🔍 Search Services Configuration
   */
  get searchServices() {
    return {
      primary: {
        provider: 'elasticsearch',
        name: 'Elasticsearch',
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
        timeout: 10000,
        retryAttempts: 2,
        
        // Indices
        indices: {
          workers: 'yachi_workers',
          services: 'yachi_services',
          jobs: 'yachi_jobs',
          users: 'yachi_users'
        },
        
        // Configuration
        config: {
          maxResults: 100,
          defaultPageSize: 20,
          highlightFields: ['name', 'skills', 'description'],
          fuzzyMatching: true,
          synonyms: true
        }
      },

      // Fallback search
      fallback: {
        provider: 'database',
        name: 'Database Search',
        enabled: true
      }
    };
  }

  /**
   * 📊 Monitoring & Health Check Services
   */
  get monitoringServices() {
    return {
      // Application monitoring
      application: {
        provider: 'sentry',
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        enabled: !!process.env.SENTRY_DSN,
        
        // Configuration
        config: {
          tracesSampleRate: 0.1,
          profilesSampleRate: 0.1
        }
      },

      // Performance monitoring
      performance: {
        provider: 'newrelic',
        licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
        appName: process.env.NEW_RELIC_APP_NAME || 'Yachi Backend',
        enabled: !!process.env.NEW_RELIC_LICENSE_KEY
      },

      // Uptime monitoring
      uptime: {
        provider: 'pingdom',
        apiKey: process.env.PINGDOM_API_KEY,
        enabled: !!process.env.PINGDOM_API_KEY
      },

      // Log management
      logging: {
        provider: 'logtail',
        sourceToken: process.env.LOGTAIL_SOURCE_TOKEN,
        enabled: !!process.env.LOGTAIL_SOURCE_TOKEN
      }
    };
  }

  /**
   * 🛠️ Utility Methods
   */

  /**
   * Get service configuration by name
   */
  getServiceConfig(serviceName) {
    const serviceMap = {
      payment: this.paymentServices,
      email: this.emailServices,
      sms: this.smsServices,
      storage: this.fileStorageServices,
      ai: this.aiServices,
      analytics: this.analyticsServices,
      gamification: this.gamificationServices,
      notifications: this.notificationServices,
      geolocation: this.geolocationServices,
      search: this.searchServices,
      monitoring: this.monitoringServices
    };

    return serviceMap[serviceName] || null;
  }

  /**
   * Check if a service is enabled
   */
  isServiceEnabled(serviceName) {
    const config = this.getServiceConfig(serviceName);
    if (!config) return false;

    // Check primary service configuration
    if (config.primary && config.primary.enabled === false) {
      return false;
    }

    // Check if required environment variables are set
    switch (serviceName) {
      case 'payment':
        return !!process.env.PAYMENT_PROVIDER;
      case 'email':
        return !!process.env.EMAIL_SERVICE;
      case 'sms':
        return !!process.env.SMS_PROVIDER;
      case 'storage':
        return !!process.env.FILE_STORAGE_PROVIDER;
      default:
        return true;
    }
  }

  /**
   * Get fallback service configuration
   */
  getFallbackService(serviceName) {
    const config = this.getServiceConfig(serviceName);
    if (!config || !config.fallbacks) return null;

    return config.fallbacks.find(fallback => fallback.enabled) || null;
  }

  /**
   * Validate service configuration
   */
  validateServiceConfig(serviceName) {
    const config = this.getServiceConfig(serviceName);
    if (!config) {
      throw new Error(`Service configuration not found: ${serviceName}`);
    }

    const issues = [];

    // Check primary service
    if (config.primary) {
      const requiredFields = this.getRequiredFields(serviceName);
      for (const field of requiredFields) {
        if (!config.primary[field] && !process.env[field]) {
          issues.push(`Missing required field: ${field}`);
        }
      }
    }

    if (issues.length > 0) {
      YachiLogger.warn(`Service configuration issues for ${serviceName}:`, issues);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get required fields for a service
   */
  getRequiredFields(serviceName) {
    const requiredFields = {
      payment: ['apiKey', 'secretKey'],
      email: ['apiKey', 'fromEmail'],
      sms: ['apiKey'],
      storage: ['apiKey', 'apiSecret'],
      ai: ['apiKey'],
      analytics: ['apiKey'],
      gamification: ['apiKey'],
      notifications: ['apiKey'],
      geolocation: ['apiKey'],
      search: ['node']
    };

    return requiredFields[serviceName] || [];
  }

  /**
   * Get all services status
   */
  getServicesStatus() {
    const services = [
      'payment', 'email', 'sms', 'storage', 'ai', 
      'analytics', 'gamification', 'notifications',
      'geolocation', 'search', 'monitoring'
    ];

    const status = {};
    for (const service of services) {
      status[service] = {
        enabled: this.isServiceEnabled(service),
        config: this.validateServiceConfig(service),
        fallback: this.getFallbackService(service) ? true : false
      };
    }

    return status;
  }

  /**
   * Get complete services configuration
   */
  getConfig() {
    return {
      environment: this.isProduction ? 'production' : 'development',
      services: {
        payment: this.paymentServices,
        email: this.emailServices,
        sms: this.smsServices,
        storage: this.fileStorageServices,
        ai: this.aiServices,
        analytics: this.analyticsServices,
        gamification: this.gamificationServices,
        notifications: this.notificationServices,
        geolocation: this.geolocationServices,
        search: this.searchServices,
        monitoring: this.monitoringServices
      },
      status: this.getServicesStatus()
    };
  }
}

// 🚀 Create singleton instance
const servicesConfig = new ServicesConfig();

module.exports = servicesConfig;