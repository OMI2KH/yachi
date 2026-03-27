/**
 * Yachi Enterprise SMS Service
 * Multi-Provider SMS Gateway with Ethiopian Market Focus
 * @version 2.0.0
 * @class EnterpriseSMSService
 */

const twilio = require('twilio');
const axios = require('axios');
const crypto = require('crypto');
const redis = require('../config/redis');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiSecurity } = require('./yachiSecurity');
const { YachiGamification } = require('./yachiGamification');
const logger = require('../utils/logger');

class EnterpriseSMSService {
    constructor() {
        this.providers = new Map();
        this.providerWeights = new Map();
        this.fallbackChain = [];
        this.performanceMetrics = new Map();
        
        this.initializeEnterpriseProviders();
        this.loadProviderConfigurations();
        this.startPerformanceMonitoring();
        
        this.rateLimitConfig = {
            windowMs: 60000,
            limits: {
                otp_verification: 3,
                appointment_reminder: 10,
                payment_confirmation: 15,
                marketing: 2,
                emergency: 50,
                general: 5
            }
        };
        
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2
        };
        
        this.cacheConfig = {
            messageIdempotency: 300, // 5 minutes
            otpVerification: 300,    // 5 minutes
            rateLimiting: 900,       // 15 minutes
            providerHealth: 60       // 1 minute
        };
        
        logger.info('🏢 Enterprise SMS Service Initialized', {
            providers: Array.from(this.providers.keys()),
            version: '2.0.0'
        });
    }

    /**
     * Initialize enterprise-grade SMS providers
     */
    initializeEnterpriseProviders() {
        // Primary Ethiopian Providers
        this.initializeEthioTelecom();
        this.initializeEthioTel();
        this.initializeSafaricom();
        
        // International Providers (Fallback)
        this.initializeTwilio();
        this.initializeAfricaTalking();
        this.initializeMessageBird();
        
        // Specialized Providers
        this.initializeGatewayAPI();
        this.initializeClickatell();
        
        this.buildOptimalFallbackChain();
    }

    /**
     * Initialize Ethio Telecom with enterprise features
     */
    initializeEthioTelecom() {
        if (process.env.ETHIO_TELECOM_API_KEY && process.env.ETHIO_TELECOM_SECRET) {
            this.providers.set('ethio_telecom', {
                name: 'Ethio Telecom',
                type: 'primary',
                weight: 100,
                config: {
                    apiKey: process.env.ETHIO_TELECOM_API_KEY,
                    secret: process.env.ETHIO_TELECOM_SECRET,
                    baseURL: process.env.ETHIO_TELECOM_BASE_URL || 'https://api.ethiotelecom.et/enterprise/sms/v2',
                    senderId: process.env.ETHIO_TELECOM_SENDER_ID || 'Yachi',
                    priority: 'high',
                    features: ['unicode', 'concatenation', 'delivery_reports', 'ethiopian_coverage']
                },
                send: (payload) => this.sendViaEthioTelecom(payload)
            });
        }
    }

    /**
     * Initialize Ethio Tel (Alternative Ethiopian Provider)
     */
    initializeEthioTel() {
        if (process.env.ETHIO_TEL_API_KEY) {
            this.providers.set('ethio_tel', {
                name: 'Ethio Tel',
                type: 'primary',
                weight: 90,
                config: {
                    apiKey: process.env.ETHIO_TEL_API_KEY,
                    baseURL: process.env.ETHIO_TEL_BASE_URL || 'https://api.ethiotel.et/sms/v1',
                    senderId: process.env.ETHIO_TEL_SENDER_ID || 'Yachi',
                    features: ['unicode', 'ethiopian_coverage', 'high_volume']
                },
                send: (payload) => this.sendViaEthioTel(payload)
            });
        }
    }

    /**
     * Initialize Safaricom (Ethiopian Operation)
     */
    initializeSafaricom() {
        if (process.env.SAFARICOM_ETH_API_KEY && process.env.SAFARICOM_ETH_SECRET) {
            this.providers.set('safaricom_eth', {
                name: 'Safaricom Ethiopia',
                type: 'primary',
                weight: 85,
                config: {
                    apiKey: process.env.SAFARICOM_ETH_API_KEY,
                    secret: process.env.SAFARICOM_ETH_SECRET,
                    baseURL: process.env.SAFARICOM_ETH_BASE_URL || 'https://api.safaricom.et/sms',
                    features: ['unicode', 'delivery_reports', 'ethiopian_coverage']
                },
                send: (payload) => this.sendViaSafaricomEth(payload)
            });
        }
    }

    /**
     * Initialize Twilio with enterprise configuration
     */
    initializeTwilio() {
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.providers.set('twilio', {
                name: 'Twilio',
                type: 'fallback',
                weight: 80,
                config: {
                    accountSid: process.env.TWILIO_ACCOUNT_SID,
                    authToken: process.env.TWILIO_AUTH_TOKEN,
                    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
                    webhookUrl: `${process.env.API_BASE_URL}/webhooks/sms/twilio/status`,
                    features: ['global_coverage', 'delivery_reports', 'two_way_messaging']
                },
                client: twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN),
                send: (payload) => this.sendViaTwilio(payload)
            });
        }
    }

    /**
     * Initialize Africa's Talking
     */
    initializeAfricaTalking() {
        if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
            this.providers.set('africastalking', {
                name: 'Africa\'s Talking',
                type: 'fallback',
                weight: 75,
                config: {
                    apiKey: process.env.AFRICASTALKING_API_KEY,
                    username: process.env.AFRICASTALKING_USERNAME,
                    baseURL: 'https://api.africastalking.com/version1',
                    features: ['african_coverage', 'bulk_sms', 'voice_sms']
                },
                send: (payload) => this.sendViaAfricaTalking(payload)
            });
        }
    }

    /**
     * Load provider configurations and weights
     */
    loadProviderConfigurations() {
        // Calculate dynamic weights based on performance
        this.providers.forEach((provider, name) => {
            const performance = this.performanceMetrics.get(name) || { successRate: 0.95, avgResponseTime: 500 };
            const baseWeight = provider.weight;
            const performanceWeight = Math.floor(performance.successRate * 100);
            const finalWeight = Math.floor((baseWeight + performanceWeight) / 2);
            
            this.providerWeights.set(name, finalWeight);
        });
    }

    /**
     * Build optimal fallback chain based on weights
     */
    buildOptimalFallbackChain() {
        this.fallbackChain = Array.from(this.providers.entries())
            .sort(([,a], [,b]) => (this.providerWeights.get(b.name) || 0) - (this.providerWeights.get(a.name) || 0))
            .map(([name]) => name);
    }

    /**
     * Enterprise SMS sending with intelligent routing
     */
    async sendEnterpriseSMS(to, message, options = {}) {
        const enterpriseContext = this.createEnterpriseContext(to, message, options);
        const messageId = this.generateEnterpriseMessageId();
        
        try {
            // Pre-send validation and security checks
            await this.performPreSendValidation(enterpriseContext);
            
            // Apply rate limiting and security checks
            await this.applyEnterpriseRateLimiting(enterpriseContext);
            
            // Select optimal provider
            const selectedProvider = await this.selectOptimalProvider(enterpriseContext);
            
            // Prepare enterprise payload
            const enterprisePayload = this.createEnterprisePayload(enterpriseContext, selectedProvider, messageId);
            
            // Send with retry logic
            const result = await this.sendWithEnterpriseRetry(selectedProvider, enterprisePayload);
            
            // Track successful delivery
            await this.trackEnterpriseDelivery({
                ...enterpriseContext,
                messageId,
                provider: selectedProvider,
                result,
                status: 'delivered'
            });
            
            // Cache for idempotency
            await this.cacheEnterpriseMessage(messageId, enterpriseContext);
            
            logger.info('✅ Enterprise SMS delivered successfully', {
                messageId,
                provider: selectedProvider,
                to: enterpriseContext.validatedNumber,
                purpose: enterpriseContext.purpose,
                cost: result.cost
            });
            
            return this.createEnterpriseResponse(result, messageId, selectedProvider);
            
        } catch (error) {
            await this.handleEnterpriseSendFailure(enterpriseContext, messageId, error);
            throw this.createEnterpriseError(error, enterpriseContext);
        }
    }

    /**
     * Create enterprise context for SMS sending
     */
    createEnterpriseContext(to, message, options) {
        const validatedNumber = this.validateAndFormatPhoneNumber(to);
        const sanitizedMessage = this.sanitizeEnterpriseMessage(message, options);
        
        return {
            originalNumber: to,
            validatedNumber,
            originalMessage: message,
            sanitizedMessage,
            purpose: options.purpose || 'general',
            priority: options.priority || 'medium',
            userId: options.userId,
            userType: options.userType,
            language: options.language || 'en',
            metadata: {
                ...options.metadata,
                timestamp: new Date().toISOString(),
                messageLength: sanitizedMessage.length,
                segments: Math.ceil(sanitizedMessage.length / 160)
            },
            security: {
                ipAddress: options.ipAddress,
                userAgent: options.userAgent,
                deviceId: options.deviceId
            }
        };
    }

    /**
     * Advanced phone number validation and formatting
     */
    validateAndFormatPhoneNumber(phoneNumber) {
        if (!phoneNumber) {
            throw new EnterpriseSMSError('PHONE_NUMBER_REQUIRED', 'Phone number is required');
        }

        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Ethiopian number validation and formatting
        if (cleaned.startsWith('251')) {
            if (cleaned.length === 12) return `+${cleaned}`;
            if (cleaned.length === 9) return `+251${cleaned}`;
        }
        
        // Handle local Ethiopian format (0XXXXXXXXX)
        if (cleaned.startsWith('0') && cleaned.length === 10) {
            return `+251${cleaned.substring(1)}`;
        }
        
        // International format validation
        const countryCodes = {
            '1': 11,  // USA/Canada
            '44': 12,  // UK
            '254': 12, // Kenya
            '255': 12, // Tanzania
            '256': 12, // Uganda
            '257': 12  // Burundi
        };
        
        for (const [code, length] of Object.entries(countryCodes)) {
            if (cleaned.startsWith(code) && cleaned.length === length) {
                return `+${cleaned}`;
            }
        }
        
        throw new EnterpriseSMSError('INVALID_PHONE_FORMAT', `Invalid phone number format: ${phoneNumber}`);
    }

    /**
     * Enterprise message sanitization
     */
    sanitizeEnterpriseMessage(message, options) {
        let sanitized = message.trim();
        
        // Character set validation
        const allowedChars = /[\\u0000-\\u007F\\u1200-\\u137F\\u1380-\\u1399\\u2D80-\\u2DDF\\uAB00-\\uAB2F]/g;
        sanitized = sanitized.replace(new RegExp(`[^${allowedChars.source}]`, 'g'), '');
        
        // Length management with concatenation support
        const maxLength = options.allowConcatenation ? 459 : 160;
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength - 3) + '...';
            logger.warn('Message truncated due to length limits', {
                originalLength: message.length,
                finalLength: sanitized.length
            });
        }
        
        // Content security filtering
        sanitized = this.applyContentSecurityFilters(sanitized);
        
        return sanitized;
    }

    /**
     * Apply content security filters
     */
    applyContentSecurityFilters(message) {
        const securityPatterns = [
            // SQL Injection patterns
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b)/gi,
            // XSS patterns
            /(<script|javascript:|onload=|onerror=)/gi,
            // Command injection
            /(\|&;`\$\(\))/g
        ];
        
        let filtered = message;
        securityPatterns.forEach(pattern => {
            filtered = filtered.replace(pattern, '[FILTERED]');
        });
        
        return filtered;
    }

    /**
     * Perform pre-send validation
     */
    async performPreSendValidation(context) {
        // Check if number is blocked
        const isBlocked = await redis.get(`sms_blocked:${context.validatedNumber}`);
        if (isBlocked) {
            throw new EnterpriseSMSError('NUMBER_BLOCKED', 'This phone number is temporarily blocked from receiving SMS');
        }
        
        // Check for duplicate messages (idempotency)
        const messageHash = crypto.createHash('md5').update(context.sanitizedMessage).digest('hex');
        const duplicateKey = `sms_duplicate:${context.validatedNumber}:${messageHash}`;
        const recentDuplicate = await redis.get(duplicateKey);
        if (recentDuplicate) {
            throw new EnterpriseSMSError('DUPLICATE_MESSAGE', 'Similar message was recently sent to this number');
        }
        
        // Security validation
        const securityCheck = await YachiSecurity.validateSMSRequest(context);
        if (!securityCheck.approved) {
            throw new EnterpriseSMSError('SECURITY_BLOCKED', securityCheck.reason);
        }
        
        // Set duplicate prevention cache
        await redis.setex(duplicateKey, 300, 'sent'); // 5 minutes
    }

    /**
     * Apply enterprise rate limiting
     */
    async applyEnterpriseRateLimiting(context) {
        const { validatedNumber, purpose } = context;
        const limitConfig = this.rateLimitConfig.limits[purpose] || this.rateLimitConfig.limits.general;
        
        const rateLimitKey = `sms_rate:${validatedNumber}:${purpose}`;
        const currentCount = await redis.incr(rateLimitKey);
        
        if (currentCount === 1) {
            await redis.expire(rateLimitKey, this.rateLimitConfig.windowMs / 1000);
        }
        
        if (currentCount > limitConfig) {
            // Track excessive attempts for security
            await this.trackExcessiveAttempts(validatedNumber, purpose, currentCount);
            throw new EnterpriseSMSError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded for ${purpose}`);
        }
    }

    /**
     * Select optimal provider based on multiple factors
     */
    async selectOptimalProvider(context) {
        const availableProviders = this.fallbackChain.filter(providerName => {
            const provider = this.providers.get(providerName);
            return provider && this.isProviderHealthy(providerName);
        });
        
        if (availableProviders.length === 0) {
            throw new EnterpriseSMSError('NO_PROVIDERS_AVAILABLE', 'No SMS providers are currently available');
        }
        
        // Weighted random selection based on performance
        const weightedProviders = availableProviders.map(name => ({
            name,
            weight: this.providerWeights.get(name) || 50
        }));
        
        const totalWeight = weightedProviders.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const provider of weightedProviders) {
            random -= provider.weight;
            if (random <= 0) {
                return provider.name;
            }
        }
        
        return availableProviders[0];
    }

    /**
     * Check provider health status
     */
    isProviderHealthy(providerName) {
        const health = this.performanceMetrics.get(providerName);
        if (!health) return true;
        
        return health.successRate > 0.8 && health.lastFailureTime < Date.now() - 300000; // 5 minutes
    }

    /**
     * Send with enterprise retry logic
     */
    async sendWithEnterpriseRetry(providerName, payload, attempt = 1) {
        try {
            const provider = this.providers.get(providerName);
            if (!provider) {
                throw new EnterpriseSMSError('PROVIDER_UNAVAILABLE', `SMS provider ${providerName} is not available`);
            }
            
            const startTime = Date.now();
            const result = await provider.send(payload);
            const responseTime = Date.now() - startTime;
            
            // Update performance metrics
            this.updateProviderPerformance(providerName, true, responseTime);
            
            return result;
            
        } catch (error) {
            // Update performance metrics for failure
            this.updateProviderPerformance(providerName, false, 0);
            
            if (attempt < this.retryConfig.maxRetries) {
                const delay = this.calculateRetryDelay(attempt);
                await this.delay(delay);
                return this.sendWithEnterpriseRetry(providerName, payload, attempt + 1);
            }
            
            throw error;
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(attempt) {
        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1);
        return Math.min(delay, this.retryConfig.maxDelay);
    }

    /**
     * Send OTP with enterprise security
     */
    async sendEnterpriseOTP(phoneNumber, otpCode, options = {}) {
        const enterpriseOptions = {
            purpose: 'otp_verification',
            priority: 'high',
            language: options.language || 'en',
            userId: options.userId,
            userType: options.userType,
            metadata: {
                otpType: options.otpType || 'authentication',
                expiresIn: options.expiresIn || 300,
                operation: options.operation || 'verify_account'
            },
            ...options
        };
        
        const message = this.generateEnterpriseOTPMessage(otpCode, enterpriseOptions);
        const result = await this.sendEnterpriseSMS(phoneNumber, message, enterpriseOptions);
        
        // Cache OTP for verification
        await this.cacheEnterpriseOTP(phoneNumber, otpCode, enterpriseOptions);
        
        // Track OTP sending for analytics
        await YachiAnalytics.trackOTPEvent('sent', {
            phoneNumber,
            otpType: enterpriseOptions.metadata.otpType,
            provider: result.provider
        });
        
        return result;
    }

    /**
     * Generate enterprise OTP message templates
     */
    generateEnterpriseOTPMessage(otpCode, options) {
        const templates = {
            en: {
                authentication: `Yachi Security: Your verification code is ${otpCode}. Valid for 5 minutes. Never share this code.`,
                transaction: `Yachi Transaction: Use ${otpCode} to authorize your transaction. Valid for 3 minutes.`,
                login: `Yachi Login: Your access code is ${otpCode}. Expires in 5 minutes.`,
                reset: `Yachi Password Reset: Use ${otpCode} to reset your password. Valid for 10 minutes.`
            },
            am: {
                authentication: `የ Yachi ደህንነት: የማረጋገጫ ኮድዎ ${otpCode} ነው። ለ 5 ደቂቃዎች የሚሰራ። ኮድዎን ከማንኛውም ጋር አያጋሩ።`,
                transaction: `Yachi ግብይት: ግብይትዎን ለማረጋገጥ ${otpCode} ይጠቀሙ። ለ 3 ደቂቃዎች የሚሰራ።`,
                login: `Yachi መግቢያ: የመግቢያ ኮድዎ ${otpCode} ነው። ለ 5 ደቂቃዎች የሚሰራ።`,
                reset: `Yachi የይለፍ ቃል መቀየሪያ: የይለፍ ቃልዎን ለመቀየር ${otpCode} ይጠቀሙ። ለ 10 ደቂቃዎች የሚሰራ።`
            },
            or: {
                authentication: `Yachi Nageenya: Koodi mirkanaa'aa keessan ${otpCode}. Yeroo daqiiqaa 5 tiif oola. Koodii kana hin qoodin.`,
                transaction: `Yachi Daldala: Daldala keessan mirkaneessuu ${otpCode} fayyadamaa. Yeroo daqiiqaa 3 tiif oola.`,
                login: `Yachi Seensa: Koodi seenaa keessan ${otpCode}. Yeroo daqiiqaa 5 tiif oola.`,
                reset: `Yachi Jecha Icciti: Jecha icciti keessan jijjiiruu ${otpCode} fayyadamaa. Yeroo daqiiqaa 10 tiif oola.`
            }
        };
        
        const language = options.language || 'en';
        const otpType = options.metadata?.otpType || 'authentication';
        
        return templates[language]?.[otpType] || templates.en.authentication;
    }

    /**
     * Enterprise OTP verification
     */
    async verifyEnterpriseOTP(phoneNumber, otpCode, options = {}) {
        const startTime = Date.now();
        
        try {
            const validatedNumber = this.validateAndFormatPhoneNumber(phoneNumber);
            const cacheKey = `enterprise_otp:${validatedNumber}`;
            
            // Get stored OTP data
            const storedData = await redis.get(cacheKey);
            if (!storedData) {
                throw new EnterpriseSMSError('OTP_EXPIRED', 'OTP has expired or does not exist');
            }
            
            const { code, attempts = 0, maxAttempts = 5 } = JSON.parse(storedData);
            
            // Check attempt limits
            if (attempts >= maxAttempts) {
                await this.handleOTPBruteForce(validatedNumber, attempts);
                throw new EnterpriseSMSError('MAX_ATTEMPTS_EXCEEDED', 'Maximum OTP attempts exceeded');
            }
            
            // Verify code
            if (code !== otpCode) {
                // Increment attempt counter
                await redis.setex(cacheKey, 300, JSON.stringify({
                    code,
                    attempts: attempts + 1,
                    maxAttempts
                }));
                
                await YachiAnalytics.trackOTPEvent('failed_attempt', {
                    phoneNumber: validatedNumber,
                    attempts: attempts + 1
                });
                
                throw new EnterpriseSMSError('INVALID_OTP', 'Invalid OTP code');
            }
            
            // Clear OTP after successful verification
            await redis.del(cacheKey);
            
            // Track successful verification
            await YachiAnalytics.trackOTPEvent('verified', {
                phoneNumber: validatedNumber,
                verificationTime: Date.now() - startTime
            });
            
            // Award gamification points for successful verification
            await YachiGamification.awardOTPVerification(options.userId);
            
            return {
                success: true,
                message: 'OTP verified successfully',
                verificationTime: Date.now() - startTime
            };
            
        } catch (error) {
            await YachiAnalytics.trackOTPEvent('verification_failed', {
                phoneNumber,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Handle OTP brute force attempts
     */
    async handleOTPBruteForce(phoneNumber, attempts) {
        const blockKey = `otp_blocked:${phoneNumber}`;
        await redis.setex(blockKey, 3600, 'blocked'); // Block for 1 hour
        
        // Security alert
        await YachiSecurity.alertSuspiciousActivity({
            type: 'otp_brute_force',
            phoneNumber,
            attempts,
            timestamp: new Date().toISOString(),
            severity: 'high'
        });
        
        logger.warn('🔒 OTP brute force detected', {
            phoneNumber,
            attempts,
            action: 'blocked_for_1_hour'
        });
    }

    /**
     * Cache enterprise OTP with enhanced security
     */
    async cacheEnterpriseOTP(phoneNumber, otpCode, options) {
        const validatedNumber = this.validateAndFormatPhoneNumber(phoneNumber);
        const cacheKey = `enterprise_otp:${validatedNumber}`;
        
        const otpData = {
            code: otpCode,
            attempts: 0,
            maxAttempts: options.maxAttempts || 5,
            created: new Date().toISOString(),
            expires: new Date(Date.now() + (options.expiresIn || 300) * 1000).toISOString(),
            purpose: options.metadata?.otpType || 'authentication'
        };
        
        await redis.setex(cacheKey, options.expiresIn || 300, JSON.stringify(otpData));
        
        // Also cache for idempotency prevention
        const idempotencyKey = `otp_sent:${validatedNumber}`;
        await redis.setex(idempotencyKey, 60, 'sent'); // Prevent resend for 60 seconds
    }

    // Provider-specific implementations would continue here...
    // [Previous provider implementations with enterprise enhancements]

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Monitor provider health every 30 seconds
        setInterval(() => {
            this.monitorProviderHealth();
        }, 30000);
        
        // Update provider weights every 5 minutes
        setInterval(() => {
            this.loadProviderConfigurations();
            this.buildOptimalFallbackChain();
        }, 300000);
    }

    /**
     * Monitor provider health status
     */
    async monitorProviderHealth() {
        for (const [providerName] of this.providers) {
            const health = await this.checkProviderHealth(providerName);
            this.performanceMetrics.set(providerName, health);
        }
    }

    /**
     * Enterprise error handling
     */
    async handleEnterpriseSendFailure(context, messageId, error) {
        await this.trackEnterpriseDelivery({
            ...context,
            messageId,
            status: 'failed',
            error: error.message,
            errorCode: error.code
        });
        
        // Update provider performance
        if (context.provider) {
            this.updateProviderPerformance(context.provider, false, 0);
        }
        
        // Security monitoring for repeated failures
        await YachiSecurity.monitorSMSFailurePattern(context, error);
        
        logger.error('❌ Enterprise SMS delivery failed', {
            messageId,
            to: context.validatedNumber,
            purpose: context.purpose,
            error: error.message,
            errorCode: error.code
        });
    }

    /**
     * Create enterprise error response
     */
    createEnterpriseError(error, context) {
        if (error instanceof EnterpriseSMSError) {
            return error;
        }
        
        return new EnterpriseSMSError(
            'SEND_FAILED',
            `Failed to send SMS: ${error.message}`,
            {
                originalError: error.message,
                context: {
                    to: context.validatedNumber,
                    purpose: context.purpose
                }
            }
        );
    }
}

/**
 * Enterprise SMS Error Class
 */
class EnterpriseSMSError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'EnterpriseSMSError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
    
    toJSON() {
        return {
            error: true,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

// Create singleton instance
const enterpriseSMSService = new EnterpriseSMSService();

module.exports = { enterpriseSMSService, EnterpriseSMSError };