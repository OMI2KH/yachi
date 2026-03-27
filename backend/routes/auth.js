/**
 * Yachi Enterprise Authentication Routes
 * Advanced Security & Multi-Role User Management
 * @version 2.0.0
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Enterprise Models
const { 
    User, 
    UserProfile, 
    SecurityLog, 
    VerificationToken,
    Session,
    GamificationProfile,
    PremiumSubscription
} = require('../models');

// Enterprise Middleware
const { 
    authenticate, 
    authorize, 
    require2FA,
    validateSession 
} = require('../middleware/auth');

// Enterprise Services
const { YachiGamification } = require('../services/yachiGamification');
const { YachiSecurity } = require('../services/yachiSecurity');
const { EmailService } = require('../services/emailService');
const { NotificationService } = require('../services/notificationService');
const { RedisService } = require('../services/redisService');
const { SMSService } = require('../services/smsService');
const { GeolocationService } = require('../services/geolocationService');

const router = express.Router();

// 🛡️ ENTERPRISE RATE LIMITING
const authLimiters = {
    // Basic authentication rate limiting
    auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: {
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts'
        },
        standardHeaders: true,
        legacyHeaders: false
    }),

    // Strict limits for sensitive operations
    strict: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 5,
        message: {
            success: false,
            code: 'ACCOUNT_TEMPORARILY_LOCKED',
            message: 'Account temporarily locked due to suspicious activity'
        }
    }),

    // Password reset specific limits
    passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 3,
        message: {
            success: false,
            code: 'PASSWORD_RESET_LIMIT',
            message: 'Too many password reset attempts'
        }
    }),

    // Verification endpoints
    verification: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: {
            success: false,
            code: 'VERIFICATION_LIMIT',
            message: 'Too many verification attempts'
        }
    })
};

// 🎯 ENTERPRISE VALIDATION SCHEMAS
const EnterpriseAuthSchema = {
    register: z.object({
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name cannot exceed 50 characters')
            .regex(/^[a-zA-Z\s\u1200-\u137F]+$/, 'Name can only contain letters and spaces'),
        email: z.string()
            .email('Invalid email address')
            .transform(email => email.toLowerCase()),
        phone: z.string()
            .regex(/^(\+251|0)[9][0-9]{8}$/, 'Invalid Ethiopian phone number')
            .transform(phone => phone.startsWith('0') ? '+251' + phone.slice(1) : phone),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                'Password must contain uppercase, lowercase, number and special character'),
        role: z.enum(['client', 'provider', 'graduate', 'government', 'admin'])
            .default('client'),
        dateOfBirth: z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
            .refine(dob => {
                const age = new Date().getFullYear() - new Date(dob).getFullYear();
                return age >= 18;
            }, 'Must be at least 18 years old'),
        acceptTerms: z.boolean()
            .refine(val => val === true, 'You must accept terms and conditions'),
        referralCode: z.string().optional(),
        location: z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            address: z.string().optional(),
            city: z.enum(['addis_ababa', 'dire_dawa', 'mekelle', 'bahir_dar', 'hawassa', 'gondar', 'jimma', 'dessie'])
        }).optional(),
        preferences: z.object({
            language: z.enum(['en', 'am', 'om']).default('en'),
            currency: z.enum(['ETB', 'USD']).default('ETB'),
            notifications: z.object({
                email: z.boolean().default(true),
                sms: z.boolean().default(false),
                push: z.boolean().default(true)
            }).default({}),
            marketingEmails: z.boolean().default(false)
        }).optional().default({})
    }),

    login: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
        deviceInfo: z.object({
            userAgent: z.string(),
            ipAddress: z.string().ip(),
            deviceId: z.string().optional(),
            deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
            os: z.string().optional(),
            browser: z.string().optional()
        }).optional(),
        location: z.object({
            latitude: z.number().optional(),
            longitude: z.number().optional(),
            city: z.string().optional()
        }).optional(),
        rememberMe: z.boolean().default(false)
    }),

    verifyEmail: z.object({
        token: z.string().length(64, 'Invalid verification token'),
        email: z.string().email('Invalid email address')
    }),

    verifyPhone: z.object({
        phone: z.string().regex(/^(\+251|0)[9][0-9]{8}$/, 'Invalid Ethiopian phone number'),
        code: z.string().length(6, 'Verification code must be 6 digits')
    }),

    forgotPassword: z.object({
        email: z.string().email('Invalid email address'),
        channel: z.enum(['email', 'sms']).default('email')
    }),

    resetPassword: z.object({
        token: z.string().length(64, 'Invalid reset token'),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                'Password must contain uppercase, lowercase, number and special character'),
        confirmPassword: z.string()
    }).refine(data => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword']
    }),

    changePassword: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                'Password must contain uppercase, lowercase, number and special character'),
        confirmNewPassword: z.string()
    }).refine(data => data.newPassword === data.confirmNewPassword, {
        message: 'Passwords do not match',
        path: ['confirmNewPassword']
    }),

    socialLogin: z.object({
        provider: z.enum(['google', 'facebook', 'apple']),
        accessToken: z.string(),
        deviceInfo: z.object({
            userAgent: z.string(),
            ipAddress: z.string().ip(),
            deviceId: z.string().optional()
        }).optional()
    })
};

// 🔐 ENTERPRISE CACHE CONFIGURATION
const CACHE_CONFIG = {
    USER_SESSION: (userId) => `enterprise:user:session:${userId}`,
    VERIFICATION_ATTEMPTS: (email) => `enterprise:auth:verification:${email}`,
    PASSWORD_RESET: (token) => `enterprise:auth:password_reset:${token}`,
    PHONE_VERIFICATION: (phone) => `enterprise:auth:phone_verification:${phone}`,
    SUSPICIOUS_ACTIVITY: (ip) => `enterprise:security:suspicious:${ip}`
};

// 🚀 ENTERPRISE REGISTRATION WITH MULTI-LEVEL VERIFICATION
router.post('/register', authLimiters.auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        // 🛡️ Enterprise Validation
        const validatedData = EnterpriseAuthSchema.register.parse(req.body);

        // 🎯 Advanced Security Pre-Checks
        const securityAudit = await YachiSecurity.performRegistrationAudit(validatedData, req.ip);
        if (!securityAudit.approved) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                code: securityAudit.code,
                message: securityAudit.message,
                details: securityAudit.details
            });
        }

        // 🔍 Check for existing user with advanced duplicate detection
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: validatedData.email },
                    { phone: validatedData.phone }
                ]
            }
        });

        if (existingUser) {
            await transaction.rollback();
            return res.status(409).json({
                success: false,
                code: 'USER_ALREADY_EXISTS',
                message: 'User with this email or phone already exists',
                field: existingUser.email === validatedData.email ? 'email' : 'phone'
            });
        }

        // 🔐 Enterprise Password Hashing
        const hashedPassword = await bcrypt.hash(validatedData.password, 12);

        // 👤 Create Enterprise User
        const user = await User.create({
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            password: hashedPassword,
            role: validatedData.role,
            dateOfBirth: validatedData.dateOfBirth,
            status: 'pending_verification',
            preferences: validatedData.preferences,
            referralCode: await generateEnterpriseReferralCode(),
            location: validatedData.location,
            security: {
                registrationIp: req.ip,
                registrationDate: new Date(),
                riskScore: securityAudit.riskScore
            }
        }, { transaction });

        // 📝 Create Comprehensive User Profile
        await UserProfile.create({
            userId: user.id,
            displayName: validatedData.name,
            language: validatedData.preferences.language,
            currency: validatedData.preferences.currency,
            notificationPreferences: validatedData.preferences.notifications,
            location: validatedData.location,
            verificationStatus: {
                email: false,
                phone: false,
                identity: false,
                portfolio: validatedData.role === 'provider' ? false : null
            }
        }, { transaction });

        // 🎪 Initialize Enterprise Gamification
        await YachiGamification.initializeEnterpriseProfile(user.id, validatedData.role);

        // 📧 Send Multi-Channel Verification
        const emailToken = await generateVerificationToken(user.id, 'email_verification');
        const phoneCode = await generatePhoneVerificationCode(user.id);

        await EmailService.sendEnterpriseVerificationEmail(user.email, user.name, emailToken);
        await SMSService.sendVerificationSMS(user.phone, phoneCode);

        // 🔒 Enterprise Security Logging
        await SecurityLog.create({
            userId: user.id,
            action: 'enterprise_registration',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'success',
            securityLevel: 'high',
            metadata: {
                role: validatedData.role,
                location: validatedData.location,
                riskScore: securityAudit.riskScore,
                referralCode: validatedData.referralCode
            }
        }, { transaction });

        // 💼 Handle Enterprise Referral System
        if (validatedData.referralCode) {
            await handleEnterpriseReferral(user.id, validatedData.referralCode, transaction);
        }

        await transaction.commit();

        // 🎯 Generate Enterprise Tokens
        const temporaryToken = generateTemporaryAccessToken(user);

        res.status(201).json({
            success: true,
            code: 'REGISTRATION_SUCCESS',
            message: 'Registration successful. Please verify your email and phone.',
            data: {
                temporaryToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    requiresVerification: true
                },
                verification: {
                    emailSent: true,
                    smsSent: true,
                    nextSteps: ['verify_email', 'verify_phone']
                }
            },
            gamification: {
                welcomePoints: 500,
                achievements: ['Welcome to Yachi'],
                nextMilestone: 'Complete Verification'
            }
        });

    } catch (error) {
        await transaction.rollback();
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                message: 'Registration validation failed',
                errors: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Enterprise Registration Error:', error);
        
        await SecurityLog.create({
            action: 'enterprise_registration_failed',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'failed',
            securityLevel: 'high',
            metadata: {
                email: req.body.email,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });

        res.status(500).json({
            success: false,
            code: 'REGISTRATION_FAILED',
            message: 'Enterprise registration failed. Please contact support.'
        });
    }
});

// 🔑 ENTERPRISE LOGIN WITH ADVANCED SECURITY
router.post('/login', authLimiters.auth, async (req, res) => {
    try {
        const validatedData = EnterpriseAuthSchema.login.parse(req.body);

        // 🔍 Enterprise User Lookup with Security
        const user = await User.findOne({
            where: {
                email: validatedData.email.toLowerCase(),
                status: {
                    [Op.notIn]: ['suspended', 'deleted', 'banned']
                }
            },
            include: [
                {
                    model: UserProfile,
                    attributes: ['loginAttempts', 'lastLogin', 'accountLockedUntil', 'twoFactorEnabled']
                },
                {
                    model: PremiumSubscription,
                    where: { status: 'active' },
                    required: false
                }
            ]
        });

        // 🛡️ Advanced Security: Prevent Timing Attacks & User Enumeration
        const fakeHash = '$2b$12$' + crypto.randomBytes(16).toString('hex');
        await bcrypt.compare(validatedData.password, fakeHash);

        if (!user) {
            await SecurityLog.create({
                action: 'login_failed_nonexistent',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'failed',
                securityLevel: 'medium',
                metadata: {
                    email: validatedData.email,
                    reason: 'user_not_found'
                }
            });

            return res.status(401).json({
                success: false,
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        // 🔒 Enterprise Account Lock Check
        if (user.UserProfile.accountLockedUntil && user.UserProfile.accountLockedUntil > new Date()) {
            return res.status(423).json({
                success: false,
                code: 'ACCOUNT_TEMPORARILY_LOCKED',
                message: 'Account temporarily locked due to security concerns',
                retryAfter: Math.ceil((user.UserProfile.accountLockedUntil - new Date()) / 1000),
                supportContact: 'support@yachi.et'
            });
        }

        // 🔐 Enterprise Password Verification
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

        if (!isPasswordValid) {
            await handleFailedLoginAttempt(user, req.ip, validatedData.deviceInfo);
            
            const remainingAttempts = 5 - (user.UserProfile.loginAttempts + 1);
            
            return res.status(401).json({
                success: false,
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
                security: {
                    remainingAttempts,
                    accountLock: remainingAttempts <= 0
                }
            });
        }

        // ✅ Enterprise Successful Login
        await handleSuccessfulLogin(user, validatedData, req);

        // 🎯 Generate Enterprise Tokens
        const tokens = await generateEnterpriseTokens(user, validatedData.rememberMe);

        // 📊 Update Enterprise Session
        await createEnterpriseSession(user.id, tokens, validatedData.deviceInfo);

        res.json({
            success: true,
            code: 'LOGIN_SUCCESS',
            message: 'Enterprise login successful',
            data: {
                ...tokens,
                user: await getEnterpriseUserProfile(user.id),
                session: {
                    id: await createSessionId(user.id),
                    requires2FA: user.UserProfile.twoFactorEnabled,
                    securityLevel: 'enterprise'
                }
            },
            gamification: await YachiGamification.getLoginRewards(user.id),
            premium: user.PremiumSubscriptions.length > 0
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                message: 'Login validation failed',
                errors: error.errors
            });
        }

        console.error('Enterprise Login Error:', error);
        
        await SecurityLog.create({
            action: 'enterprise_login_error',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'error',
            securityLevel: 'high',
            metadata: {
                error: error.message,
                email: req.body.email
            }
        });

        res.status(500).json({
            success: false,
            code: 'LOGIN_FAILED',
            message: 'Enterprise login failed. Please try again.'
        });
    }
});

// 🔄 ENTERPRISE TOKEN REFRESH
router.post('/refresh', authLimiters.auth, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                code: 'REFRESH_TOKEN_REQUIRED',
                message: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findByPk(decoded.userId);

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                code: 'INVALID_REFRESH_TOKEN',
                message: 'Invalid refresh token'
            });
        }

        // 🎯 Generate new tokens
        const tokens = await generateEnterpriseTokens(user, false);

        res.json({
            success: true,
            code: 'TOKEN_REFRESHED',
            message: 'Tokens refreshed successfully',
            data: tokens
        });

    } catch (error) {
        console.error('Token Refresh Error:', error);
        
        res.status(401).json({
            success: false,
            code: 'REFRESH_TOKEN_INVALID',
            message: 'Refresh token is invalid or expired'
        });
    }
});

// 📧 ENTERPRISE EMAIL VERIFICATION
router.post('/verify-email', authLimiters.verification, async (req, res) => {
    try {
        const validatedData = EnterpriseAuthSchema.verifyEmail.parse(req.body);

        const verification = await VerificationToken.findOne({
            where: {
                token: validatedData.token,
                type: 'email_verification',
                expiresAt: { [Op.gt]: new Date() }
            },
            include: [{
                model: User,
                where: { email: validatedData.email.toLowerCase() }
            }]
        });

        if (!verification) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_VERIFICATION_TOKEN',
                message: 'Invalid or expired verification token'
            });
        }

        // ✅ Update Enterprise User Status
        await User.update({
            status: user => user.status === 'pending_verification' ? 'active' : user.status,
            emailVerified: true,
            emailVerifiedAt: new Date()
        }, { where: { id: verification.userId } });

        // 🗑️ Cleanup used token
        await verification.destroy();

        // 🎪 Award Enterprise Verification Points
        await YachiGamification.awardEnterpriseVerification(verification.userId);

        // 📧 Send Enterprise Welcome Email
        await EmailService.sendEnterpriseWelcomeEmail(validatedData.email, verification.User.name);

        res.json({
            success: true,
            code: 'EMAIL_VERIFIED',
            message: 'Email verified successfully',
            data: {
                user: await getEnterpriseUserProfile(verification.userId)
            },
            gamification: {
                pointsAwarded: 1000,
                achievements: ['Email Verified', 'Verification Starter'],
                nextMilestone: 'Verify Phone Number'
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                message: 'Verification validation failed',
                errors: error.errors
            });
        }

        console.error('Email Verification Error:', error);
        res.status(500).json({
            success: false,
            code: 'VERIFICATION_FAILED',
            message: 'Email verification failed'
        });
    }
});

// 🔑 ENTERPRISE PASSWORD MANAGEMENT
router.post('/forgot-password', authLimiters.passwordReset, async (req, res) => {
    try {
        const validatedData = EnterpriseAuthSchema.forgotPassword.parse(req.body);

        const user = await User.findOne({
            where: { email: validatedData.email.toLowerCase() }
        });

        // 🛡️ Enterprise Security: Prevent Email Enumeration
        if (!user) {
            return res.json({
                success: true,
                code: 'PASSWORD_RESET_EMAIL_SENT',
                message: 'If the email exists, a password reset link has been sent'
            });
        }

        // 🚨 Enterprise Rate Limiting
        const resetAttempts = await RedisService.incrementCounter(
            `enterprise:password_reset:${user.id}`, 
            3600
        );

        if (resetAttempts > 3) {
            return res.status(429).json({
                success: false,
                code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
                message: 'Too many password reset attempts'
            });
        }

        // 🔐 Generate Enterprise Reset Token
        const resetToken = await generateEnterprisePasswordResetToken(user.id);

        // 📧 Send Enterprise Reset Email
        await EmailService.sendEnterprisePasswordResetEmail(user.email, user.name, resetToken);

        // 🔒 Enterprise Security Logging
        await SecurityLog.create({
            userId: user.id,
            action: 'enterprise_password_reset_requested',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'success',
            securityLevel: 'high'
        });

        res.json({
            success: true,
            code: 'PASSWORD_RESET_EMAIL_SENT',
            message: 'If the email exists, a password reset link has been sent'
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                message: 'Password reset validation failed',
                errors: error.errors
            });
        }

        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            code: 'PASSWORD_RESET_FAILED',
            message: 'Password reset request failed'
        });
    }
});

// 👤 ENTERPRISE USER PROFILE
router.get('/me', authenticate, validateSession, async (req, res) => {
    try {
        const user = await getEnterpriseUserProfile(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                code: 'USER_NOT_FOUND',
                message: 'User profile not found'
            });
        }

        // 📊 Update Enterprise Activity Tracking
        await UserProfile.update({
            lastActive: new Date(),
            activityStreak: sequelize.literal('activity_streak + 1')
        }, { where: { userId: req.userId } });

        res.json({
            success: true,
            code: 'PROFILE_RETRIEVED',
            message: 'User profile retrieved successfully',
            data: user
        });

    } catch (error) {
        console.error('Get User Profile Error:', error);
        res.status(500).json({
            success: false,
            code: 'PROFILE_RETRIEVAL_FAILED',
            message: 'Failed to fetch user profile'
        });
    }
});

// 🚀 ENTERPRISE UTILITY FUNCTIONS

/**
 * Generate Enterprise Authentication Tokens
 */
async function generateEnterpriseTokens(user, rememberMe = false) {
    const accessToken = jwt.sign(
        {
            userId: user.id,
            role: user.role,
            email: user.email,
            verified: user.emailVerified,
            level: user.level,
            security: 'enterprise'
        },
        process.env.JWT_ENTERPRISE_SECRET,
        {
            expiresIn: rememberMe ? '30d' : '7d',
            issuer: 'yachi-enterprise',
            subject: user.id.toString(),
            jwtid: crypto.randomBytes(16).toString('hex')
        }
    );

    const refreshToken = jwt.sign(
        {
            userId: user.id,
            type: 'enterprise_refresh',
            security: 'high'
        },
        process.env.JWT_ENTERPRISE_REFRESH_SECRET,
        {
            expiresIn: '90d',
            issuer: 'yachi-enterprise',
            jwtid: crypto.randomBytes(16).toString('hex')
        }
    );

    return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: rememberMe ? 2592000 : 604800, // 30 days or 7 days in seconds
        scope: 'enterprise'
    };
}

/**
 * Get Enterprise User Profile
 */
async function getEnterpriseUserProfile(userId) {
    const user = await User.findByPk(userId, {
        attributes: {
            exclude: ['password', 'tokenVersion', 'resetToken', 'securityAnswers']
        },
        include: [
            {
                model: UserProfile,
                attributes: ['displayName', 'avatar', 'bio', 'language', 'currency', 'lastLogin', 'verificationStatus']
            },
            {
                model: GamificationProfile,
                attributes: ['points', 'level', 'badges', 'achievements']
            },
            {
                model: PremiumSubscription,
                where: { status: 'active' },
                required: false,
                attributes: ['type', 'expiresAt', 'features']
            }
        ]
    });

    if (!user) return null;

    const profile = user.toJSON();
    
    // 🎯 Add Enterprise Features
    profile.enterprise = {
        security: {
            twoFactorEnabled: user.UserProfile.twoFactorEnabled,
            lastPasswordChange: user.lastPasswordChange,
            suspiciousActivity: await YachiSecurity.checkSuspiciousActivity(userId),
            trustScore: await YachiSecurity.calculateTrustScore(userId)
        },
        gamification: user.GamificationProfile,
        premium: user.PremiumSubscriptions.length > 0,
        verification: user.UserProfile.verificationStatus
    };

    return profile;
}

/**
 * Handle Failed Login Attempt
 */
async function handleFailedLoginAttempt(user, ipAddress, deviceInfo) {
    const newAttempts = (user.UserProfile.loginAttempts || 0) + 1;
    let lockUntil = null;

    if (newAttempts >= 5) {
        lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await UserProfile.update({
        loginAttempts: newAttempts,
        accountLockedUntil: lockUntil
    }, { where: { userId: user.id } });

    // 🔒 Enterprise Security Logging
    await SecurityLog.create({
        userId: user.id,
        action: 'enterprise_login_failed',
        ipAddress,
        userAgent: deviceInfo?.userAgent,
        status: 'failed',
        securityLevel: 'high',
        metadata: {
            attempts: newAttempts,
            deviceInfo,
            lockUntil
        }
    });

    // 🚨 Enterprise Alert System
    if (newAttempts >= 3) {
        await NotificationService.sendSecurityAlert(user, {
            type: 'multiple_failed_logins',
            attempts: newAttempts,
            ipAddress,
            deviceInfo
        });
    }
}

/**
 * Handle Successful Login
 */
async function handleSuccessfulLogin(user, loginData, req) {
    // Reset login attempts
    await UserProfile.update({
        loginAttempts: 0,
        accountLockedUntil: null,
        lastLogin: new Date(),
        lastActive: new Date()
    }, { where: { userId: user.id } });

    // 🎪 Award Enterprise Login Rewards
    await YachiGamification.awardEnterpriseLogin(user.id);

    // 📱 Update Enterprise Device Tracking
    await updateEnterpriseDevice(user.id, loginData.deviceInfo);

    // 🔒 Enterprise Security Logging
    await SecurityLog.create({
        userId: user.id,
        action: 'enterprise_login_success',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success',
        securityLevel: 'high',
        metadata: {
            deviceId: loginData.deviceInfo?.deviceId,
            rememberMe: loginData.rememberMe,
            location: loginData.location
        }
    });

    // 📧 Enterprise Security Notification
    if (await isNewEnterpriseDevice(user.id, loginData.deviceInfo)) {
        await NotificationService.sendEnterpriseNewLoginAlert(user, loginData.deviceInfo, loginData.location);
    }
}

/**
 * Generate Enterprise Referral Code
 */
async function generateEnterpriseReferralCode() {
    let code;
    let exists = true;
    
    while (exists) {
        code = 'YACHI-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const existingUser = await User.findOne({ where: { referralCode: code } });
        exists = !!existingUser;
    }
    
    return code;
}

/**
 * Create Enterprise Session
 */
async function createEnterpriseSession(userId, tokens, deviceInfo) {
    const sessionData = {
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        deviceInfo,
        lastActive: new Date(),
        security: 'enterprise'
    };

    await RedisService.setex(
        CACHE_CONFIG.USER_SESSION(userId),
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify(sessionData)
    );
}

/**
 * Generate Session ID
 */
async function createSessionId(userId) {
    return crypto.createHash('sha256')
        .update(userId + Date.now() + crypto.randomBytes(16))
        .digest('hex');
}

module.exports = router;