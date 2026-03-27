/**
 * Yachi Enterprise Authentication Controller
 * Comprehensive security, authentication, and user management system
 * @version 2.0.0
 * @class AuthController
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Sequelize, Op } = require('sequelize');
const { authenticator } = require('otplib');

// Enterprise Services
const { 
    User, 
    Session, 
    VerificationToken, 
    SecurityLog,
    GamificationProfile 
} = require('../models');
const { YachiLogger, AuditLogger } = require('../utils/logger');
const { 
    TokenService, 
    CryptoService, 
    ValidationService 
} = require('../services/security');
const { 
    RedisManager, 
    CacheService, 
    RateLimitService 
} = require('../services/cache');
const { 
    EmailService, 
    SMSService, 
    NotificationService 
} = require('../services/communication');
const { 
    AnalyticsService, 
    BusinessIntelligenceService 
} = require('../services/analytics');
const { 
    GamificationEngine, 
    AchievementService 
} = require('../services/gamification');
const { 
    RiskAssessmentService, 
    FraudDetectionService 
} = require('../services/security');

class AuthController {
    constructor() {
        this.rateLimitService = new RateLimitService();
        this.tokenService = new TokenService();
        this.cryptoService = new CryptoService();
        this.riskService = new RiskAssessmentService();
        this.fraudService = new FraudDetectionService();
        
        this.setupCleanupIntervals();
        this.initializeSecurityPolicies();
    }

    /**
     * 🧹 Initialize cleanup intervals for security and performance
     */
    setupCleanupIntervals() {
        // Clean expired sessions every 30 minutes
        setInterval(() => this.cleanExpiredSessions(), 30 * 60 * 1000);
        
        // Clean expired tokens every hour
        setInterval(() => this.cleanExpiredTokens(), 60 * 60 * 1000);
        
        // Clean rate limit data every 2 hours
        setInterval(() => this.rateLimitService.cleanExpiredData(), 2 * 60 * 60 * 1000);
    }

    /**
     * 🔒 Initialize security policies and configurations
     */
    initializeSecurityPolicies() {
        this.securityPolicies = {
            password: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                maxAgeDays: 90,
                historySize: 5
            },
            session: {
                maxConcurrentSessions: 5,
                sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
                refreshTokenRotation: true
            },
            rateLimiting: {
                login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
                registration: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
                passwordReset: { maxAttempts: 5, windowMs: 24 * 60 * 60 * 1000 }
            }
        };
    }

    /**
     * 🎯 USER REGISTRATION - Enterprise Grade
     */
    register = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const registrationData = req.body;
            const clientInfo = this.extractClientInfo(req);

            // 🛡️ Enterprise Validation Chain
            const validationResult = await this.validateRegistration(registrationData, clientInfo);
            if (!validationResult.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'VALIDATION_FAILED',
                    message: 'Registration validation failed',
                    details: validationResult.errors,
                    clientId: clientInfo.fingerprint
                });
            }

            // 🚨 Fraud & Risk Assessment
            const riskAssessment = await this.riskService.assessRegistrationRisk(
                registrationData, 
                clientInfo
            );
            
            if (riskAssessment.riskLevel === 'HIGH') {
                await this.logSecurityEvent('FRAUD_DETECTION', registrationData, clientInfo);
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'REGISTRATION_BLOCKED',
                    message: 'Registration blocked due to security policy'
                });
            }

            // 🔒 Password Security
            const passwordHash = await this.cryptoService.hashPassword(registrationData.password);
            
            // 👤 User Creation with Metadata
            const user = await User.create({
                ...this.sanitizeUserData(registrationData),
                password: passwordHash,
                status: 'PENDING_VERIFICATION',
                riskScore: riskAssessment.riskScore,
                metadata: {
                    registration: {
                        ...clientInfo,
                        timestamp: new Date().toISOString(),
                        riskLevel: riskAssessment.riskLevel
                    },
                    security: {
                        lastPasswordChange: new Date(),
                        passwordHistory: [passwordHash]
                    }
                }
            }, { transaction });

            // 🎪 Gamification & Engagement
            await GamificationEngine.initializeUserProfile(user.id);
            await AchievementService.awardRegistrationAchievement(user.id);

            // 📧 Multi-Channel Verification
            await this.initiateVerificationProcess(user, transaction);

            // 📊 Analytics & Business Intelligence
            await AnalyticsService.trackUserRegistration(user, registrationData, riskAssessment);
            await BusinessIntelligenceService.recordRegistrationEvent(user, clientInfo);

            // 🛡️ Security Logging
            await this.logSecurityEvent('USER_REGISTERED', user, clientInfo, transaction);

            await transaction.commit();

            // 🚀 Success Response
            return this.sendSuccessResponse(res, 201, {
                message: 'Registration successful. Verification required.',
                data: {
                    user: this.sanitizeUserResponse(user),
                    verification: {
                        emailRequired: true,
                        phoneRequired: !!user.phone,
                        faydaRequired: user.role === 'PROVIDER'
                    },
                    riskLevel: riskAssessment.riskLevel
                },
                gamification: {
                    pointsAwarded: 100,
                    achievements: ['WELCOME_TO_YACHI'],
                    nextMilestone: 'Complete Profile Verification'
                }
            });

        } catch (error) {
            await transaction.rollback();
            await this.handleRegistrationError(error, req);
            
            return this.sendErrorResponse(res, 500, {
                code: 'REGISTRATION_FAILED',
                message: 'Registration process failed',
                internalCode: error.code
            });
        }
    };

    /**
     * 🔐 ENTERPRISE LOGIN SYSTEM
     */
    login = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { email, password, twoFactorCode, deviceId, loginContext } = req.body;
            const clientInfo = this.extractClientInfo(req);

            // 🛡️ Pre-Login Security Checks
            const securityCheck = await this.performPreLoginSecurityChecks(email, clientInfo);
            if (!securityCheck.allowed) {
                return this.sendErrorResponse(res, securityCheck.statusCode, {
                    code: securityCheck.code,
                    message: securityCheck.message,
                    retryAfter: securityCheck.retryAfter
                });
            }

            // 🔍 User Authentication
            const authResult = await this.authenticateUser(email, password, twoFactorCode, clientInfo);
            if (!authResult.success) {
                await this.handleFailedLogin(email, authResult.reason, clientInfo);
                return this.sendErrorResponse(res, 401, {
                    code: 'AUTHENTICATION_FAILED',
                    message: authResult.message
                });
            }

            const { user, requires2FA } = authResult;

            if (requires2FA) {
                await transaction.commit();
                return this.sendSuccessResponse(res, 206, {
                    message: 'Two-factor authentication required',
                    data: { requires2FA: true },
                    nextStep: 'Provide 2FA code'
                });
            }

            // 🚨 Post-Authentication Security
            const postAuthCheck = await this.performPostAuthenticationChecks(user, clientInfo);
            if (!postAuthCheck.allowed) {
                await transaction.rollback();
                return this.sendErrorResponse(res, postAuthCheck.statusCode, {
                    code: postAuthCheck.code,
                    message: postAuthCheck.message
                });
            }

            // 🎯 Session Management
            const session = await this.createUserSession(user, deviceId, clientInfo, transaction);
            
            // 📊 Login Analytics
            await AnalyticsService.trackUserLogin(user, clientInfo, loginContext);
            await BusinessIntelligenceService.recordLoginEvent(user, clientInfo);

            // 🎪 Engagement Features
            await GamificationEngine.recordLoginActivity(user.id);
            await AchievementService.checkLoginAchievements(user.id);

            await transaction.commit();

            // 🚀 Success Response
            return this.sendSuccessResponse(res, 200, {
                message: 'Login successful',
                data: {
                    user: this.sanitizeUserResponse(user),
                    session: this.sanitizeSessionResponse(session),
                    security: {
                        riskLevel: postAuthCheck.riskLevel,
                        recommendations: postAuthCheck.recommendations
                    }
                },
                gamification: {
                    pointsAwarded: 10,
                    streak: await GamificationEngine.getLoginStreak(user.id)
                }
            });

        } catch (error) {
            await transaction.rollback();
            await this.handleLoginError(error, req);
            
            return this.sendErrorResponse(res, 500, {
                code: 'LOGIN_PROCESS_FAILED',
                message: 'Login process encountered an error'
            });
        }
    };

    /**
     * 🔄 ADVANCED TOKEN MANAGEMENT
     */
    refreshToken = async (req, res) => {
        try {
            const { refreshToken, deviceId } = req.body;
            const clientInfo = this.extractClientInfo(req);

            // 🛡️ Token Validation
            const validation = await this.validateRefreshToken(refreshToken, clientInfo);
            if (!validation.valid) {
                return this.sendErrorResponse(res, 401, {
                    code: validation.code,
                    message: validation.message
                });
            }

            const { user, session } = validation;

            // 🎯 Token Rotation Strategy
            const newTokens = await this.rotateTokens(user, session, deviceId, clientInfo);

            // 📊 Analytics
            await AnalyticsService.trackTokenRefresh(user, clientInfo);

            return this.sendSuccessResponse(res, 200, {
                message: 'Tokens refreshed successfully',
                data: {
                    tokens: newTokens,
                    security: {
                        tokenRotation: true,
                        previousTokenRevoked: true
                    }
                }
            });

        } catch (error) {
            YachiLogger.error('Token refresh error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'TOKEN_REFRESH_FAILED',
                message: 'Token refresh process failed'
            });
        }
    };

    /**
     * 🚪 ENTERPRISE LOGOUT SYSTEM
     */
    logout = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { logoutAll, deviceId } = req.body;
            const userId = req.user.userId;
            const clientInfo = this.extractClientInfo(req);

            if (logoutAll) {
                // 🔒 Logout from all devices
                await this.logoutAllSessions(userId, clientInfo, transaction);
            } else if (deviceId) {
                // 🔒 Logout specific device
                await this.logoutDevice(userId, deviceId, clientInfo, transaction);
            } else {
                // 🔒 Logout current session
                await this.logoutCurrentSession(req.user.sessionId, clientInfo, transaction);
            }

            // 📊 Analytics
            await AnalyticsService.trackUserLogout(userId, clientInfo, { logoutAll });

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully',
                data: {
                    logoutType: logoutAll ? 'ALL_DEVICES' : 'SINGLE_SESSION',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Logout error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'LOGOUT_FAILED',
                message: 'Logout process failed'
            });
        }
    };

    /**
     * 🔐 PASSWORD MANAGEMENT SYSTEM
     */
    changePassword = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;
            const clientInfo = this.extractClientInfo(req);

            // 🛡️ Comprehensive Password Validation
            const validation = await this.validatePasswordChange(
                userId, 
                currentPassword, 
                newPassword, 
                clientInfo
            );
            
            if (!validation.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: validation.code,
                    message: validation.message,
                    details: validation.details
                });
            }

            // 🔒 Password Update
            await this.updateUserPassword(userId, newPassword, transaction);

            // 🚨 Security Enforcement
            await this.enforcePasswordChangeSecurity(userId, clientInfo, transaction);

            // 📊 Analytics
            await AnalyticsService.trackPasswordChange(userId, clientInfo);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Password changed successfully',
                data: {
                    security: {
                        forcedLogout: true,
                        sessionsTerminated: true
                    },
                    nextSteps: ['Re-login required on all devices']
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Password change error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'PASSWORD_CHANGE_FAILED',
                message: 'Password change process failed'
            });
        }
    };

    /**
     * 📧 VERIFICATION MANAGEMENT SYSTEM
     */
    verifyEmail = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { token } = req.body;
            const clientInfo = this.extractClientInfo(req);

            const verificationResult = await this.processEmailVerification(token, clientInfo, transaction);
            
            if (!verificationResult.success) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: verificationResult.code,
                    message: verificationResult.message
                });
            }

            const { user } = verificationResult;

            // 🎪 Gamification
            await GamificationEngine.awardVerificationAchievement(user.id, 'EMAIL');
            await AchievementService.unlockVerificationBadge(user.id);

            // 📊 Analytics
            await AnalyticsService.trackVerificationEvent(user, 'EMAIL', clientInfo);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Email verified successfully',
                data: {
                    user: this.sanitizeUserResponse(user),
                    verification: {
                        email: true,
                        progress: await this.getVerificationProgress(user.id)
                    }
                },
                gamification: {
                    pointsAwarded: 50,
                    achievements: ['EMAIL_VERIFIED'],
                    nextMilestone: 'Verify Phone Number'
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Email verification error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'EMAIL_VERIFICATION_FAILED',
                message: 'Email verification process failed'
            });
        }
    };

    /**
     * 🔒 TWO-FACTOR AUTHENTICATION SYSTEM
     */
    enable2FA = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const userId = req.user.userId;
            const clientInfo = this.extractClientInfo(req);

            // 🎯 2FA Setup
            const setupResult = await this.setupTwoFactorAuthentication(userId, clientInfo, transaction);
            
            if (!setupResult.success) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: setupResult.code,
                    message: setupResult.message
                });
            }

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Two-factor authentication setup initiated',
                data: {
                    twoFactor: {
                        secret: setupResult.secret,
                        qrCodeUrl: setupResult.qrCodeUrl,
                        manualEntryCode: setupResult.manualEntryCode,
                        setupRequired: true
                    },
                    backupCodes: setupResult.backupCodes
                },
                security: {
                    warning: 'Save backup codes securely',
                    nextStep: 'Verify 2FA setup'
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('2FA setup error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: '2FA_SETUP_FAILED',
                message: 'Two-factor authentication setup failed'
            });
        }
    };

    /**
     * 🛠️ ENTERPRISE UTILITY METHODS
     */

    /**
     * Start database transaction with retry logic
     */
    async startTransaction() {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await sequelize.transaction();
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                }
            }
        }
        
        throw new Error(`Transaction start failed after ${maxRetries} attempts: ${lastError.message}`);
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
     * Generate client fingerprint for tracking
     */
    generateClientFingerprint(req) {
        const components = [
            req.ip,
            req.headers['user-agent'],
            req.headers['accept-language'],
            req.headers['accept-encoding']
        ];
        
        return crypto
            .createHash('sha256')
            .update(components.join('|'))
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Comprehensive registration validation
     */
    async validateRegistration(data, clientInfo) {
        const errors = [];
        const warnings = [];

        // 📧 Email Validation
        if (!ValidationService.isValidEmail(data.email)) {
            errors.push('INVALID_EMAIL_FORMAT');
        }

        // 🔒 Password Strength
        const passwordStrength = ValidationService.validatePasswordStrength(data.password);
        if (!passwordStrength.valid) {
            errors.push('WEAK_PASSWORD', ...passwordStrength.suggestions);
        }

        // 👤 User Type Validation
        if (!['CLIENT', 'PROVIDER', 'GRADUATE'].includes(data.userType)) {
            errors.push('INVALID_USER_TYPE');
        }

        // 📱 Phone Validation (Ethiopian)
        if (data.phone && !ValidationService.isValidEthiopianPhone(data.phone)) {
            errors.push('INVALID_ETHIOPIAN_PHONE');
        }

        // 🏛️ Fayda ID Validation
        if (data.faydaId && !ValidationService.isValidFaydaId(data.faydaId)) {
            warnings.push('INVALID_FAYDA_ID_FORMAT');
        }

        // 🌍 Geographic Restrictions
        const geoCheck = await ValidationService.checkGeographicRestrictions(clientInfo.geoLocation);
        if (!geoCheck.allowed) {
            errors.push('GEOGRAPHIC_RESTRICTION');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            riskFactors: passwordStrength.riskFactors
        };
    }

    /**
     * Initiate multi-channel verification process
     */
    async initiateVerificationProcess(user, transaction) {
        const verificationPromises = [];

        // 📧 Email Verification
        verificationPromises.push(
            this.sendEmailVerification(user, transaction)
        );

        // 📱 SMS Verification
        if (user.phone) {
            verificationPromises.push(
                this.sendSMSVerification(user, transaction)
            );
        }

        // 🏛️ Fayda Verification (for providers)
        if (user.role === 'PROVIDER' && user.faydaId) {
            verificationPromises.push(
                this.initiateFaydaVerification(user, transaction)
            );
        }

        await Promise.allSettled(verificationPromises);
    }

    /**
     * Send enterprise email verification
     */
    async sendEmailVerification(user, transaction) {
        try {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await VerificationToken.create({
                userId: user.id,
                token,
                type: 'EMAIL_VERIFICATION',
                expiresAt,
                metadata: {
                    channel: 'EMAIL',
                    attempts: 0
                }
            }, { transaction });

            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
            
            await EmailService.sendTemplateEmail('EMAIL_VERIFICATION', user.email, {
                user: this.sanitizeUserResponse(user),
                verificationUrl,
                expiresAt: expiresAt.toISOString()
            });

            AuditLogger.info(`Email verification sent to ${user.email}`, {
                userId: user.id,
                tokenId: token.substring(0, 8)
            });

        } catch (error) {
            YachiLogger.error('Email verification send failed:', error);
            throw new Error('EMAIL_VERIFICATION_SEND_FAILED');
        }
    }

    /**
     * Send SMS verification
     */
    async sendSMSVerification(user, transaction) {
        try {
            const code = crypto.randomBytes(3).toString('hex').toUpperCase();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await VerificationToken.create({
                userId: user.id,
                token: code,
                type: 'PHONE_VERIFICATION',
                expiresAt
            }, { transaction });

            await SMSService.sendVerificationSMS(user.phone, code);

            AuditLogger.info(`SMS verification sent to ${user.phone}`, {
                userId: user.id,
                code
            });

        } catch (error) {
            YachiLogger.error('SMS verification send failed:', error);
            throw new Error('SMS_VERIFICATION_SEND_FAILED');
        }
    }

    /**
     * Sanitize user data for response
     */
    sanitizeUserResponse(user) {
        const sanitized = { ...user.toJSON() };
        
        // Remove sensitive fields
        const sensitiveFields = [
            'password',
            'twoFactorSecret',
            'resetToken',
            'faydaId', // Encrypted in database
            'metadata.security'
        ];
        
        sensitiveFields.forEach(field => {
            delete sanitized[field];
        });

        // Add computed fields
        sanitized.verificationStatus = this.calculateVerificationStatus(user);
        sanitized.trustScore = this.calculateTrustScore(user);
        
        return sanitized;
    }

    /**
     * Calculate user verification status
     */
    calculateVerificationStatus(user) {
        const verifications = [];
        
        if (user.emailVerified) verifications.push('EMAIL');
        if (user.phoneVerified) verifications.push('PHONE');
        if (user.faydaVerified) verifications.push('FAYDA');
        if (user.portfolioVerified) verifications.push('PORTFOLIO');

        return {
            level: verifications.length,
            verifications,
            completed: verifications.length >= 2 // Minimum verification requirement
        };
    }

    /**
     * Calculate user trust score
     */
    calculateTrustScore(user) {
        let score = 0;
        
        if (user.emailVerified) score += 25;
        if (user.phoneVerified) score += 25;
        if (user.faydaVerified) score += 30;
        if (user.portfolioVerified) score += 20;
        
        // Additional factors
        if (user.reviewCount > 10) score += 10;
        if (user.rating >= 4.5) score += 10;
        
        return Math.min(score, 100);
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
                referenceId: crypto.randomBytes(8).toString('hex')
            }
        });
    }

    /**
     * Log security event with comprehensive context
     */
    async logSecurityEvent(action, entity, clientInfo, transaction = null) {
        const logData = {
            action,
            entityType: entity.constructor.name,
            entityId: entity.id,
            ...clientInfo,
            severity: this.determineEventSeverity(action),
            metadata: {
                userAgent: clientInfo.userAgent,
                geoLocation: clientInfo.geoLocation,
                riskLevel: clientInfo.riskLevel
            }
        };

        if (transaction) {
            await SecurityLog.create(logData, { transaction });
        } else {
            await SecurityLog.create(logData);
        }

        AuditLogger.security(action, logData);
    }

    /**
     * Determine event severity for logging
     */
    determineEventSeverity(action) {
        const severityMap = {
            'USER_REGISTERED': 'LOW',
            'LOGIN_SUCCESS': 'LOW',
            'LOGIN_FAILED': 'MEDIUM',
            'PASSWORD_CHANGE': 'MEDIUM',
            '2FA_ENABLED': 'HIGH',
            'FRAUD_DETECTION': 'CRITICAL'
        };
        
        return severityMap[action] || 'LOW';
    }

    /**
     * Clean expired sessions
     */
    async cleanExpiredSessions() {
        try {
            const result = await Session.destroy({
                where: {
                    expiresAt: { [Op.lt]: new Date() }
                }
            });
            
            YachiLogger.info(`Cleaned ${result} expired sessions`);
        } catch (error) {
            YachiLogger.error('Session cleanup failed:', error);
        }
    }

    /**
     * Clean expired tokens
     */
    async cleanExpiredTokens() {
        try {
            const result = await VerificationToken.destroy({
                where: {
                    expiresAt: { [Op.lt]: new Date() }
                }
            });
            
            YachiLogger.info(`Cleaned ${result} expired tokens`);
        } catch (error) {
            YachiLogger.error('Token cleanup failed:', error);
        }
    }
}

// 🚀 Export enterprise controller
module.exports = AuthController;