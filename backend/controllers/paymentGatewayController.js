/**
 * Yachi Enterprise Payment Gateway Controller
 * Advanced Ethiopian payment gateway integration with multi-provider support
 * AI-powered fraud detection and comprehensive financial management
 * @version 2.0.0
 * @class PaymentGatewayController
 */

const { Sequelize, Op } = require('sequelize');
const crypto = require('crypto');
const moment = require('moment-timezone');

// Enterprise Services
const { 
    Transaction, 
    PaymentGateway, 
    User, 
    Booking,
    Payout,
    Refund,
    SecurityLog
} = require('../models');

const { 
    YachiLogger, 
    AuditLogger, 
    PerformanceLogger 
} = require('../utils/logger');

const { 
    RedisManager, 
    CacheService, 
    DistributedLock 
} = require('../services/cache');

const { 
    FraudDetectionService,
    RiskAssessmentService,
    SecurityService
} = require('../services/security');

const { 
    AnalyticsEngine, 
    BusinessIntelligenceService 
} = require('../services/analytics');

const { 
    NotificationOrchestrator,
    SMSService,
    EmailService
} = require('../services/communication');

const { 
    EthiopianCalendarService,
    LocalizationService
} = require('../services/localization');

// Ethiopian Payment Gateway Services
const {
    ChapaService,
    TelebirrService,
    CbeBirrService,
    PaymentOrchestrator
} = require('../services/payment');

class PaymentGatewayController {
    constructor() {
        this.paymentConfig = {
            gateways: {
                CHAPA: {
                    name: 'Chapa',
                    currency: 'ETB',
                    supportedMethods: ['CARD', 'BANK', 'MOBILE'],
                    transactionLimit: 500000, // 500,000 ETB
                    dailyLimit: 5000000, // 5,000,000 ETB
                    fee: 0.015 // 1.5%
                },
                TELEBIRR: {
                    name: 'Telebirr',
                    currency: 'ETB',
                    supportedMethods: ['MOBILE'],
                    transactionLimit: 10000, // 10,000 ETB
                    dailyLimit: 50000, // 50,000 ETB
                    fee: 0.01 // 1%
                },
                CBE_BIRR: {
                    name: 'CBE Birr',
                    currency: 'ETB',
                    supportedMethods: ['MOBILE', 'BANK'],
                    transactionLimit: 25000, // 25,000 ETB
                    dailyLimit: 100000, // 100,000 ETB
                    fee: 0.008 // 0.8%
                }
            },
            security: {
                maxRetryAttempts: 3,
                lockoutDuration: 900, // 15 minutes
                webhookVerification: true,
                encryptionRequired: true
            },
            compliance: {
                taxRate: 0.15, // 15% VAT
                platformFee: 0.10, // 10% platform fee
                reportingThreshold: 10000 // 10,000 ETB
            }
        };

        this.setupPaymentIntervals();
        this.initializePaymentWorkflows();
    }

    /**
     * 💰 Setup enterprise-grade payment intervals and background jobs
     */
    setupPaymentIntervals() {
        // Transaction reconciliation
        setInterval(() => this.reconcileTransactions(), 30 * 60 * 1000); // Every 30 minutes
        
        // Failed payment retry
        setInterval(() => this.retryFailedPayments(), 60 * 60 * 1000); // Every hour
        
        // Payout processing
        setInterval(() => this.processScheduledPayouts(), 2 * 60 * 60 * 1000); // Every 2 hours
        
        // Fraud monitoring
        setInterval(() => this.monitorFraudPatterns(), 15 * 60 * 1000); // Every 15 minutes
    }

    /**
     * 🔄 Initialize payment workflows and state machines
     */
    initializePaymentWorkflows() {
        this.paymentWorkflows = {
            STANDARD: this.standardPaymentWorkflow.bind(this),
            ESCROW: this.escrowPaymentWorkflow.bind(this),
            INSTANT: this.instantPaymentWorkflow.bind(this),
            SUBSCRIPTION: this.subscriptionPaymentWorkflow.bind(this)
        };

        this.paymentStates = {
            INITIATED: 'initiated',
            PENDING: 'pending',
            PROCESSING: 'processing',
            COMPLETED: 'completed',
            FAILED: 'failed',
            REFUNDED: 'refunded',
            DISPUTED: 'disputed'
        };
    }

    /**
     * 💳 ENTERPRISE PAYMENT INITIATION
     */
    initiatePayment = async (req, res) => {
        const transaction = await this.startTransaction();
        const userId = req.user.userId;
        const lockKey = `payment:initiate:${userId}`;

        try {
            const lock = await DistributedLock.acquire(lockKey, 10000);
            if (!lock) {
                return this.sendErrorResponse(res, 429, {
                    code: 'CONCURRENT_PAYMENT',
                    message: 'Please complete your current payment process'
                });
            }

            const paymentData = req.body;
            const clientInfo = this.extractClientInfo(req);

            // 🛡️ Enterprise Payment Validation
            const validationResult = await this.validateEnterprisePayment(paymentData, userId, clientInfo);
            if (!validationResult.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'PAYMENT_VALIDATION_FAILED',
                    message: 'Payment validation failed',
                    details: validationResult.errors,
                    suggestions: validationResult.suggestions
                });
            }

            // 🚨 Fraud & Risk Assessment
            const riskAssessment = await FraudDetectionService.assessPaymentRisk({
                userId,
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                gateway: paymentData.gateway,
                ...clientInfo
            });

            if (riskAssessment.riskLevel === 'HIGH') {
                await this.logSecurityEvent('HIGH_RISK_PAYMENT_ATTEMPT', { userId, ...paymentData }, clientInfo);
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'HIGH_RISK_PAYMENT',
                    message: 'Payment requires additional verification',
                    verificationMethods: riskAssessment.verificationMethods
                });
            }

            // 🎯 Gateway Selection & Optimization
            const gatewaySelection = await this.selectOptimalGateway(paymentData, riskAssessment);
            if (!gatewaySelection.available) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'GATEWAY_UNAVAILABLE',
                    message: 'Selected payment gateway is not available',
                    alternatives: gatewaySelection.alternatives
                });
            }

            // 💰 Fee Calculation & Tax Compliance
            const feeCalculation = await this.calculatePaymentFees(paymentData, gatewaySelection);
            
            // 🔐 Payment Encryption & Tokenization
            const securePayment = await this.securePaymentData(paymentData, gatewaySelection, clientInfo);

            // 📝 Enterprise Payment Record Creation
            const paymentRecord = await this.createEnterprisePaymentRecord({
                userId,
                paymentData,
                gatewaySelection,
                feeCalculation,
                securePayment,
                riskAssessment,
                clientInfo
            }, transaction);

            // 🤖 AI-Powered Payment Routing
            const paymentRouting = await this.routePaymentToGateway(paymentRecord, gatewaySelection, transaction);

            // 🔔 Payment Initiation Notifications
            await NotificationOrchestrator.sendPaymentInitiationNotifications(paymentRecord, req.user);

            // 📊 Payment Analytics
            await AnalyticsEngine.trackPaymentInitiation(paymentRecord, clientInfo, riskAssessment);
            await BusinessIntelligenceService.recordPaymentEvent('INITIATED', paymentRecord);

            await transaction.commit();

            // 🚀 Success Response
            return this.sendSuccessResponse(res, 201, {
                message: 'Payment initiated successfully',
                data: {
                    payment: this.sanitizePaymentRecord(paymentRecord),
                    gateway: {
                        selected: gatewaySelection.gateway,
                        checkoutUrl: paymentRouting.checkoutUrl,
                        reference: paymentRouting.reference,
                        expiresAt: paymentRouting.expiresAt
                    },
                    financials: {
                        amount: paymentData.amount,
                        fees: feeCalculation.breakdown,
                        total: feeCalculation.totalAmount,
                        currency: 'ETB'
                    },
                    security: {
                        riskLevel: riskAssessment.riskLevel,
                        verificationRequired: riskAssessment.verificationRequired,
                        token: securePayment.token
                    }
                },
                nextSteps: [
                    'Complete payment on gateway page',
                    'Payment will be verified automatically',
                    'Receipt will be sent via email'
                ]
            });

        } catch (error) {
            await transaction.rollback();
            await this.handlePaymentInitiationError(error, req);
            
            return this.sendErrorResponse(res, 500, {
                code: 'PAYMENT_INITIATION_FAILED',
                message: 'Payment initiation process failed',
                internalCode: error.code,
                supportReference: this.generateSupportReference()
            });
        } finally {
            await DistributedLock.release(lockKey, lock);
        }
    };

    /**
     * ✅ PAYMENT VERIFICATION AND CONFIRMATION
     */
    verifyPayment = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { transactionId, gatewayReference } = req.body;
            const userId = req.user.userId;

            // 🔍 Payment Record Retrieval
            const paymentRecord = await Transaction.findOne({
                where: {
                    id: transactionId,
                    userId,
                    status: this.paymentStates.PENDING
                },
                include: [
                    {
                        model: Booking,
                        as: 'booking',
                        attributes: ['id', 'serviceId', 'providerId']
                    }
                ],
                transaction
            });

            if (!paymentRecord) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'PAYMENT_NOT_FOUND',
                    message: 'Payment record not found or already processed'
                });
            }

            // 🎯 Gateway-Specific Verification
            const verificationResult = await this.verifyWithGateway(paymentRecord, gatewayReference, transaction);
            if (!verificationResult.verified) {
                await this.handleFailedVerification(paymentRecord, verificationResult, transaction);
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'PAYMENT_VERIFICATION_FAILED',
                    message: 'Payment verification failed',
                    reason: verificationResult.reason,
                    retryable: verificationResult.retryable
                });
            }

            // ✅ Payment Confirmation Processing
            const confirmationResult = await this.confirmPayment(paymentRecord, verificationResult, transaction);

            // 💰 Fund Allocation & Escrow Management
            const fundAllocation = await this.allocatePaymentFunds(paymentRecord, confirmationResult, transaction);

            // 📊 Transaction Completion
            await this.completeTransaction(paymentRecord, confirmationResult, transaction);

            // 🔔 Success Notifications
            await NotificationOrchestrator.sendPaymentSuccessNotifications(paymentRecord, req.user);

            // 📈 Analytics & Reporting
            await AnalyticsEngine.trackPaymentCompletion(paymentRecord, verificationResult);
            await BusinessIntelligenceService.recordPaymentEvent('COMPLETED', paymentRecord);

            // 🏛️ Tax & Compliance Reporting
            await this.reportToTaxAuthority(paymentRecord, transaction);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Payment verified and completed successfully',
                data: {
                    payment: this.sanitizePaymentRecord(paymentRecord),
                    verification: {
                        gateway: paymentRecord.gateway,
                        reference: gatewayReference,
                        verifiedAt: new Date().toISOString()
                    },
                    financials: {
                        amount: paymentRecord.amount,
                        fees: paymentRecord.metadata.feeCalculation.breakdown,
                        netAmount: fundAllocation.netAmount,
                        currency: paymentRecord.currency
                    },
                    receipt: {
                        number: confirmationResult.receiptNumber,
                        downloadUrl: confirmationResult.receiptUrl,
                        taxInvoice: confirmationResult.taxInvoice
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Payment verification error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'PAYMENT_VERIFICATION_FAILED',
                message: 'Payment verification process failed'
            });
        }
    };

    /**
     * 🔄 PAYMENT WEBHOOK HANDLER
     */
    handleWebhook = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const webhookData = req.body;
            const gateway = req.params.gateway;
            const signature = req.headers['x-signature'];

            // 🛡️ Webhook Authentication
            const authResult = await this.authenticateWebhook(gateway, webhookData, signature);
            if (!authResult.authenticated) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 401, {
                    code: 'WEBHOOK_AUTHENTICATION_FAILED',
                    message: 'Webhook authentication failed'
                });
            }

            // 🔍 Webhook Data Validation
            const validationResult = await this.validateWebhookData(gateway, webhookData);
            if (!validationResult.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'INVALID_WEBHOOK_DATA',
                    message: 'Webhook data validation failed'
                });
            }

            // 🎯 Webhook Processing
            const processingResult = await this.processWebhookEvent(gateway, webhookData, transaction);

            // 📊 Webhook Analytics
            await AnalyticsEngine.trackWebhookEvent(gateway, webhookData.eventType, processingResult);

            await transaction.commit();

            // ✅ Acknowledge webhook receipt
            return res.status(200).json({
                success: true,
                message: 'Webhook processed successfully',
                processedAt: new Date().toISOString()
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Webhook processing error:', error);
            
            // ❌ Still acknowledge to prevent retries
            return res.status(200).json({
                success: false,
                message: 'Webhook processing failed, will retry',
                error: error.message
            });
        }
    };

    /**
     * 💸 ENTERPRISE PAYOUT PROCESSING
     */
    processPayout = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { providerId, amount, method, destination } = req.body;
            const processorId = req.user.userId;

            // 🛡️ Payout Authorization
            const authCheck = await this.validatePayoutAuthorization(processorId, providerId, amount);
            if (!authCheck.authorized) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'PAYOUT_UNAUTHORIZED',
                    message: 'Not authorized to process this payout'
                });
            }

            // 💰 Balance Verification
            const balanceCheck = await this.verifyProviderBalance(providerId, amount);
            if (!balanceCheck.sufficient) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'INSUFFICIENT_BALANCE',
                    message: 'Provider has insufficient balance for payout',
                    availableBalance: balanceCheck.available,
                    requestedAmount: amount
                });
            }

            // 🚨 Payout Risk Assessment
            const riskAssessment = await RiskAssessmentService.assessPayoutRisk({
                providerId,
                amount,
                method,
                destination,
                processorId
            });

            if (riskAssessment.riskLevel === 'HIGH') {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'HIGH_RISK_PAYOUT',
                    message: 'Payout requires manual approval',
                    approvalWorkflow: riskAssessment.approvalWorkflow
                });
            }

            // 🎯 Payout Method Processing
            const payoutResult = await this.executePayout(providerId, amount, method, destination, transaction);

            // 📝 Payout Record Creation
            const payoutRecord = await this.createPayoutRecord({
                providerId,
                amount,
                method,
                destination,
                processorId,
                payoutResult,
                riskAssessment
            }, transaction);

            // 🔔 Payout Notifications
            await NotificationOrchestrator.sendPayoutNotifications(payoutRecord, req.user);

            // 📊 Payout Analytics
            await AnalyticsEngine.trackPayoutProcessing(payoutRecord, riskAssessment);
            await BusinessIntelligenceService.recordPayoutEvent('PROCESSED', payoutRecord);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Payout processed successfully',
                data: {
                    payout: this.sanitizePayoutRecord(payoutRecord),
                    financials: {
                        amount: amount,
                        fees: payoutResult.fees,
                        netAmount: payoutResult.netAmount,
                        currency: 'ETB'
                    },
                    destination: {
                        method: method,
                        details: this.maskSensitiveData(destination),
                        estimatedArrival: payoutResult.estimatedArrival
                    },
                    receipt: {
                        number: payoutResult.receiptNumber,
                        reference: payoutResult.reference
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Payout processing error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'PAYOUT_PROCESSING_FAILED',
                message: 'Payout processing failed'
            });
        }
    };

    /**
     * 🔄 REFUND MANAGEMENT SYSTEM
     */
    processRefund = async (req, res) => {
        const transaction = await this.startTransaction();
        
        try {
            const { transactionId, reason, amount } = req.body;
            const processorId = req.user.userId;

            // 🔍 Transaction Validation
            const originalTransaction = await Transaction.findOne({
                where: {
                    id: transactionId,
                    status: this.paymentStates.COMPLETED
                },
                include: [
                    {
                        model: Booking,
                        as: 'booking',
                        attributes: ['id', 'clientId', 'providerId', 'status']
                    }
                ],
                transaction
            });

            if (!originalTransaction) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 404, {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: 'Original transaction not found or not eligible for refund'
                });
            }

            // 🛡️ Refund Authorization
            const authCheck = await this.validateRefundAuthorization(processorId, originalTransaction);
            if (!authCheck.authorized) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 403, {
                    code: 'REFUND_UNAUTHORIZED',
                    message: 'Not authorized to process this refund'
                });
            }

            // 💰 Refund Amount Validation
            const refundValidation = await this.validateRefundAmount(originalTransaction, amount);
            if (!refundValidation.valid) {
                await transaction.rollback();
                return this.sendErrorResponse(res, 400, {
                    code: 'INVALID_REFUND_AMOUNT',
                    message: refundValidation.message,
                    maxRefundable: refundValidation.maxRefundable
                });
            }

            // 🔄 Refund Processing
            const refundResult = await this.executeRefund(originalTransaction, amount, reason, transaction);

            // 📝 Refund Record Creation
            const refundRecord = await this.createRefundRecord({
                originalTransaction,
                amount,
                reason,
                processorId,
                refundResult
            }, transaction);

            // 🔔 Refund Notifications
            await NotificationOrchestrator.sendRefundNotifications(refundRecord, req.user);

            // 📊 Refund Analytics
            await AnalyticsEngine.trackRefundProcessing(refundRecord);
            await BusinessIntelligenceService.recordRefundEvent('PROCESSED', refundRecord);

            await transaction.commit();

            return this.sendSuccessResponse(res, 200, {
                message: 'Refund processed successfully',
                data: {
                    refund: this.sanitizeRefundRecord(refundRecord),
                    originalTransaction: this.sanitizePaymentRecord(originalTransaction),
                    financials: {
                        refundAmount: amount,
                        originalAmount: originalTransaction.amount,
                        currency: originalTransaction.currency
                    },
                    timeline: {
                        processedAt: new Date().toISOString(),
                        estimatedArrival: refundResult.estimatedArrival
                    }
                }
            });

        } catch (error) {
            await transaction.rollback();
            YachiLogger.error('Refund processing error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'REFUND_PROCESSING_FAILED',
                message: 'Refund processing failed'
            });
        }
    };

    /**
     * 📊 PAYMENT GATEWAY ANALYTICS
     */
    getGatewayAnalytics = async (req, res) => {
        try {
            const { gateway, timeframe = 'month', metrics = 'all' } = req.query;
            const userId = req.user.userId;

            // 🛡️ Analytics Authorization
            const analyticsAuth = await this.validateAnalyticsAccess(userId, gateway);
            if (!analyticsAuth.authorized) {
                return this.sendErrorResponse(res, 403, {
                    code: 'ANALYTICS_ACCESS_DENIED',
                    message: 'Not authorized to access payment gateway analytics'
                });
            }

            const cacheKey = `analytics:gateway:${gateway || 'all'}:${timeframe}:${metrics}:${userId}`;

            const analytics = await CacheService.getWithFallback(cacheKey, async () => {
                return await this.generateGatewayAnalytics(gateway, timeframe, metrics);
            }, { ttl: 300 }); // 5 minute cache

            return this.sendSuccessResponse(res, 200, {
                message: 'Payment gateway analytics retrieved successfully',
                data: {
                    analytics,
                    timeframe,
                    gateway: gateway || 'all',
                    generatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            YachiLogger.error('Gateway analytics error:', error);
            
            return this.sendErrorResponse(res, 500, {
                code: 'ANALYTICS_RETRIEVAL_FAILED',
                message: 'Failed to retrieve payment gateway analytics'
            });
        }
    };

    /**
     * 🛠️ ENTERPRISE UTILITY METHODS
     */

    /**
     * Validate enterprise payment with comprehensive checks
     */
    async validateEnterprisePayment(paymentData, userId, clientInfo) {
        const errors = [];
        const suggestions = [];

        // 💰 Amount Validation
        if (!paymentData.amount || paymentData.amount <= 0) {
            errors.push('INVALID_AMOUNT');
        }

        // 🏦 Gateway Validation
        if (!paymentData.gateway || !this.paymentConfig.gateways[paymentData.gateway.toUpperCase()]) {
            errors.push('INVALID_GATEWAY');
            suggestions.push(`Supported gateways: ${Object.keys(this.paymentConfig.gateways).join(', ')}`);
        }

        // 💳 Payment Method Validation
        if (paymentData.paymentMethod) {
            const gatewayConfig = this.paymentConfig.gateways[paymentData.gateway.toUpperCase()];
            if (!gatewayConfig.supportedMethods.includes(paymentData.paymentMethod)) {
                errors.push('UNSUPPORTED_PAYMENT_METHOD');
                suggestions.push(`Supported methods for ${paymentData.gateway}: ${gatewayConfig.supportedMethods.join(', ')}`);
            }
        }

        // 📏 Transaction Limits
        const gatewayConfig = this.paymentConfig.gateways[paymentData.gateway.toUpperCase()];
        if (paymentData.amount > gatewayConfig.transactionLimit) {
            errors.push('AMOUNT_EXCEEDS_LIMIT');
            suggestions.push(`Maximum transaction amount for ${paymentData.gateway}: ${gatewayConfig.transactionLimit} ETB`);
        }

        // 👤 User Payment History Check
        const userHistory = await this.checkUserPaymentHistory(userId, paymentData.gateway);
        if (userHistory.dailyLimitExceeded) {
            errors.push('DAILY_LIMIT_EXCEEDED');
            suggestions.push(`Daily limit: ${gatewayConfig.dailyLimit} ETB. Try again tomorrow or use a different gateway.`);
        }

        return {
            valid: errors.length === 0,
            errors,
            suggestions,
            userHistory
        };
    }

    /**
     * Select optimal payment gateway
     */
    async selectOptimalGateway(paymentData, riskAssessment) {
        const availableGateways = await this.getAvailableGateways();
        
        // 🎯 AI-Powered Gateway Selection
        const selectionCriteria = {
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            riskLevel: riskAssessment.riskLevel,
            userPreferences: paymentData.preferences,
            gatewayPerformance: await this.getGatewayPerformance()
        };

        const optimalGateway = await PaymentOrchestrator.selectOptimalGateway(selectionCriteria);

        if (!optimalGateway.available) {
            return {
                available: false,
                alternatives: availableGateways.filter(gw => gw.available)
            };
        }

        return {
            available: true,
            gateway: optimalGateway.gateway,
            config: this.paymentConfig.gateways[optimalGateway.gateway],
            score: optimalGateway.score,
            reasons: optimalGateway.reasons
        };
    }

    /**
     * Calculate payment fees with Ethiopian tax compliance
     */
    async calculatePaymentFees(paymentData, gatewaySelection) {
        const gatewayFee = paymentData.amount * gatewaySelection.config.fee;
        const platformFee = paymentData.amount * this.paymentConfig.compliance.platformFee;
        const vat = (paymentData.amount + gatewayFee + platformFee) * this.paymentConfig.compliance.taxRate;

        const totalAmount = paymentData.amount + gatewayFee + platformFee + vat;

        return {
            amount: paymentData.amount,
            gatewayFee: Math.round(gatewayFee),
            platformFee: Math.round(platformFee),
            vat: Math.round(vat),
            totalAmount: Math.round(totalAmount),
            breakdown: {
                amount: paymentData.amount,
                gatewayFee,
                platformFee,
                vat,
                totalAmount
            },
            currency: 'ETB'
        };
    }

    /**
     * Secure payment data with encryption and tokenization
     */
    async securePaymentData(paymentData, gatewaySelection, clientInfo) {
        // 🔐 Encrypt sensitive data
        const encryptedData = await SecurityService.encryptPaymentData({
            paymentMethod: paymentData.paymentMethod,
            cardDetails: paymentData.cardDetails,
            mobileNumber: paymentData.mobileNumber,
            userDetails: paymentData.userDetails
        });

        // 🎫 Generate payment token
        const paymentToken = crypto.randomBytes(32).toString('hex');

        // 💾 Store secure data
        await RedisManager.setex(
            `payment:token:${paymentToken}`,
            3600, // 1 hour expiry
            JSON.stringify({
                encryptedData,
                gateway: gatewaySelection.gateway,
                clientInfo,
                createdAt: new Date().toISOString()
            })
        );

        return {
            token: paymentToken,
            encrypted: true,
            expiry: 3600
        };
    }

    /**
     * Create enterprise payment record
     */
    async createEnterprisePaymentRecord(paymentParams, transaction) {
        const {
            userId,
            paymentData,
            gatewaySelection,
            feeCalculation,
            securePayment,
            riskAssessment,
            clientInfo
        } = paymentParams;

        return await Transaction.create({
            userId,
            type: 'payment',
            amount: paymentData.amount,
            currency: 'ETB',
            gateway: gatewaySelection.gateway,
            status: this.paymentStates.INITIATED,
            reference: this.generatePaymentReference(gatewaySelection.gateway),
            metadata: {
                creation: clientInfo,
                paymentData: {
                    ...paymentData,
                    sensitiveData: securePayment.token // Store token instead of raw data
                },
                gatewaySelection,
                feeCalculation,
                riskAssessment,
                security: {
                    token: securePayment.token,
                    encrypted: securePayment.encrypted
                },
                version: '2.0.0'
            }
        }, { transaction });
    }

    /**
     * Route payment to selected gateway
     */
    async routePaymentToGateway(paymentRecord, gatewaySelection, transaction) {
        const gatewayService = this.getGatewayService(gatewaySelection.gateway);
        
        const paymentRequest = {
            amount: paymentRecord.amount,
            currency: paymentRecord.currency,
            reference: paymentRecord.reference,
            customer: paymentRecord.metadata.paymentData.userDetails,
            metadata: {
                transactionId: paymentRecord.id,
                userId: paymentRecord.userId
            }
        };

        const gatewayResponse = await gatewayService.initiatePayment(paymentRequest);

        // 📝 Update payment record with gateway response
        await Transaction.update({
            status: this.paymentStates.PENDING,
            metadata: {
                ...paymentRecord.metadata,
                gatewayResponse: {
                    checkoutUrl: gatewayResponse.checkoutUrl,
                    reference: gatewayResponse.reference,
                    expiresAt: gatewayResponse.expiresAt
                }
            }
        }, {
            where: { id: paymentRecord.id },
            transaction
        });

        return {
            checkoutUrl: gatewayResponse.checkoutUrl,
            reference: gatewayResponse.reference,
            expiresAt: gatewayResponse.expiresAt
        };
    }

    /**
     * Verify payment with gateway
     */
    async verifyWithGateway(paymentRecord, gatewayReference, transaction) {
        const gatewayService = this.getGatewayService(paymentRecord.gateway);
        
        try {
            const verificationResult = await gatewayService.verifyPayment(gatewayReference);

            if (verificationResult.success) {
                return {
                    verified: true,
                    gatewayData: verificationResult.data,
                    verifiedAt: new Date().toISOString()
                };
            } else {
                return {
                    verified: false,
                    reason: verificationResult.error,
                    retryable: verificationResult.retryable
                };
            }
        } catch (error) {
            YachiLogger.error(`Gateway verification failed for ${paymentRecord.gateway}:`, error);
            return {
                verified: false,
                reason: 'GATEWAY_VERIFICATION_ERROR',
                retryable: true
            };
        }
    }

    /**
     * Get gateway service instance
     */
    getGatewayService(gateway) {
        switch (gateway.toUpperCase()) {
            case 'CHAPA':
                return ChapaService;
            case 'TELEBIRR':
                return TelebirrService;
            case 'CBE_BIRR':
                return CbeBirrService;
            default:
                throw new Error(`Unsupported gateway: ${gateway}`);
        }
    }

    /**
     * Generate unique payment reference
     */
    generatePaymentReference(gateway) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        const gatewayCode = gateway.substr(0, 3).toUpperCase();
        
        return `YCH-${gatewayCode}-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Mask sensitive data for responses
     */
    maskSensitiveData(data) {
        if (typeof data === 'string') {
            return data.replace(/.(?=.{4})/g, '*');
        }
        if (typeof data === 'object') {
            const masked = { ...data };
            if (masked.cardNumber) masked.cardNumber = '**** **** **** ' + masked.cardNumber.slice(-4);
            if (masked.mobileNumber) masked.mobileNumber = masked.mobileNumber.replace(/\d(?=\d{4})/g, '*');
            return masked;
        }
        return data;
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
                referenceId: this.generateSupportReference()
            }
        });
    }

    /**
     * Generate unique support reference
     */
    generateSupportReference() {
        return `YCH-PAY-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    /**
     * Start database transaction with retry logic
     */
    async startTransaction() {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await sequelize.transaction();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
    }

    /**
     * Extract comprehensive client information
     */
    extractClientInfo(req) {
        return {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            fingerprint: req.headers['x-client-fingerprint'] || this.generateClientFingerprint(req),
            deviceInfo: {
                type: req.headers['x-device-type'],
                os: req.headers['x-device-os'],
                browser: req.headers['x-device-browser']
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Sanitize payment record for response
     */
    sanitizePaymentRecord(paymentRecord) {
        const sanitized = { ...paymentRecord.toJSON() };
        
        // Remove sensitive data
        delete sanitized.metadata?.paymentData?.sensitiveData;
        delete sanitized.metadata?.paymentData?.cardDetails;
        delete sanitized.metadata?.security?.token;
        
        return sanitized;
    }

    /**
     * Reconcile transactions with gateways
     */
    async reconcileTransactions() {
        try {
            const pendingTransactions = await Transaction.findAll({
                where: {
                    status: this.paymentStates.PENDING,
                    createdAt: {
                        [Op.lt]: moment().subtract(2, 'hours').toDate()
                    }
                }
            });

            for (const transaction of pendingTransactions) {
                await this.reconcileSingleTransaction(transaction);
            }

            YachiLogger.info(`Reconciled ${pendingTransactions.length} pending transactions`);
        } catch (error) {
            YachiLogger.error('Transaction reconciliation failed:', error);
        }
    }
}

// 🚀 Export enterprise controller
module.exports = PaymentGatewayController;