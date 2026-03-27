/**
 * CBE Birr Payment Gateway Service
 * Integration with Commercial Bank of Ethiopia's CBE Birr mobile payment system
 * Documentation: https://developer.cbe.com.et/
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { PaymentError, ValidationError, NetworkError } = require('../errors/paymentErrors');
const logger = require('../../utils/logger');

class CBEBirrService {
    constructor(config) {
        this.config = {
            baseURL: config.baseURL || 'https://api.cbe.com.et/v1',
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            merchantId: config.merchantId,
            terminalId: config.terminalId,
            timeout: config.timeout || 30000,
            environment: config.environment || 'sandbox', // sandbox, production
            callbackURL: config.callbackURL,
            currency: config.currency || 'ETB',
            ...config
        };

        // Initialize axios instance
        this.client = axios.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Add request interceptor for authentication
        this.client.interceptors.request.use(
            this._addAuthentication.bind(this),
            error => Promise.reject(error)
        );

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            this._handleError.bind(this)
        );

        logger.info(`CBE Birr Service initialized in ${this.config.environment} mode`);
    }

    /**
     * Generate request signature
     * @param {Object} data - Request data
     * @returns {String} - HMAC-SHA256 signature
     */
    _generateSignature(data) {
        const timestamp = Date.now();
        const message = `${JSON.stringify(data)}${timestamp}${this.config.apiSecret}`;
        
        return crypto
            .createHmac('sha256', this.config.apiSecret)
            .update(message)
            .digest('hex');
    }

    /**
     * Add authentication headers to request
     */
    _addAuthentication(config) {
        const timestamp = Date.now();
        const requestId = uuidv4();
        
        // Generate signature for the request
        const signature = this._generateSignature(config.data || {});
        
        config.headers['X-API-Key'] = this.config.apiKey;
        config.headers['X-Timestamp'] = timestamp;
        config.headers['X-Request-ID'] = requestId;
        config.headers['X-Signature'] = signature;
        config.headers['X-Merchant-ID'] = this.config.merchantId;
        config.headers['X-Terminal-ID'] = this.config.terminalId;
        
        return config;
    }

    /**
     * Handle API errors
     */
    _handleError(error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            const { status, data } = error.response;
            
            logger.error('CBE Birr API Error:', {
                status,
                data,
                url: error.config.url
            });

            switch (status) {
                case 400:
                    throw new ValidationError(data.message || 'Bad request to CBE Birr API', data);
                case 401:
                    throw new PaymentError('Invalid CBE Birr API credentials', 'AUTH_FAILED');
                case 403:
                    throw new PaymentError('Access denied to CBE Birr API', 'ACCESS_DENIED');
                case 404:
                    throw new PaymentError('CBE Birr resource not found', 'NOT_FOUND');
                case 429:
                    throw new PaymentError('Rate limit exceeded for CBE Birr API', 'RATE_LIMITED');
                case 500:
                    throw new PaymentError('CBE Birr server error', 'SERVER_ERROR');
                default:
                    throw new PaymentError(
                        `CBE Birr API error: ${status} - ${data.message || 'Unknown error'}`,
                        'API_ERROR'
                    );
            }
        } else if (error.request) {
            // The request was made but no response was received
            logger.error('CBE Birr Network Error:', error.message);
            throw new NetworkError('No response from CBE Birr API', 'NETWORK_ERROR');
        } else {
            // Something happened in setting up the request
            logger.error('CBE Birr Setup Error:', error.message);
            throw new PaymentError(`CBE Birr setup error: ${error.message}`, 'SETUP_ERROR');
        }
    }

    /**
     * Initialize payment request
     * @param {Object} paymentData - Payment information
     * @returns {Promise<Object>} - Payment initialization response
     */
    async initializePayment(paymentData) {
        try {
            const {
                amount,
                phoneNumber,
                transactionId,
                description,
                metadata = {}
            } = paymentData;

            // Validate required fields
            if (!amount || amount <= 0) {
                throw new ValidationError('Invalid payment amount', 'INVALID_AMOUNT');
            }

            if (!phoneNumber || !/^2519[0-9]{8}$/.test(phoneNumber)) {
                throw new ValidationError('Invalid Ethiopian phone number format', 'INVALID_PHONE');
            }

            // Prepare payment request
            const requestData = {
                merchantReference: transactionId || `YACHI_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
                amount: Number(amount).toFixed(2),
                currency: this.config.currency,
                customerPhone: phoneNumber,
                customerEmail: metadata.email,
                description: description || 'Yachi Service Payment',
                callbackURL: this.config.callbackURL,
                metadata: {
                    ...metadata,
                    service: 'yachi',
                    timestamp: new Date().toISOString()
                }
            };

            logger.info('Initializing CBE Birr payment:', {
                merchantReference: requestData.merchantReference,
                amount: requestData.amount,
                phoneNumber: requestData.customerPhone
            });

            const response = await this.client.post('/payments/initiate', requestData);

            return {
                success: true,
                paymentId: response.data.paymentId,
                merchantReference: requestData.merchantReference,
                checkoutUrl: response.data.checkoutUrl,
                expiresAt: response.data.expiresAt,
                qrCode: response.data.qrCode,
                instructions: response.data.instructions,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to initialize CBE Birr payment:', error);
            throw error;
        }
    }

    /**
     * Verify payment status
     * @param {String} paymentId - CBE Birr payment ID
     * @returns {Promise<Object>} - Payment verification response
     */
    async verifyPayment(paymentId) {
        try {
            if (!paymentId) {
                throw new ValidationError('Payment ID is required', 'MISSING_PAYMENT_ID');
            }

            logger.info('Verifying CBE Birr payment:', { paymentId });

            const response = await this.client.get(`/payments/${paymentId}/status`);

            return {
                success: response.data.status === 'SUCCESSFUL',
                paymentId: response.data.paymentId,
                status: response.data.status,
                amount: response.data.amount,
                currency: response.data.currency,
                customerPhone: response.data.customerPhone,
                transactionReference: response.data.transactionReference,
                merchantReference: response.data.merchantReference,
                paidAt: response.data.paidAt,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to verify CBE Birr payment:', error);
            throw error;
        }
    }

    /**
     * Process payment callback from CBE Birr
     * @param {Object} callbackData - Callback data from CBE Birr
     * @returns {Promise<Object>} - Processed callback response
     */
    async processCallback(callbackData) {
        try {
            logger.info('Processing CBE Birr callback:', {
                merchantReference: callbackData.merchantReference,
                status: callbackData.status
            });

            // Verify callback signature
            const isValid = this._verifyCallbackSignature(callbackData);
            if (!isValid) {
                throw new PaymentError('Invalid callback signature', 'INVALID_SIGNATURE');
            }

            return {
                success: callbackData.status === 'SUCCESSFUL',
                paymentId: callbackData.paymentId,
                status: callbackData.status,
                amount: callbackData.amount,
                currency: callbackData.currency,
                merchantReference: callbackData.merchantReference,
                transactionReference: callbackData.transactionReference,
                customerPhone: callbackData.customerPhone,
                paidAt: callbackData.paidAt,
                rawData: callbackData
            };

        } catch (error) {
            logger.error('Failed to process CBE Birr callback:', error);
            throw error;
        }
    }

    /**
     * Verify callback signature from CBE Birr
     * @param {Object} callbackData - Callback data
     * @returns {Boolean} - True if signature is valid
     */
    _verifyCallbackSignature(callbackData) {
        try {
            const { signature, ...data } = callbackData;
            
            if (!signature) {
                logger.warn('Missing signature in CBE Birr callback');
                return false;
            }

            const calculatedSignature = this._generateSignature(data);
            const isValid = signature === calculatedSignature;

            if (!isValid) {
                logger.warn('Invalid signature in CBE Birr callback', {
                    provided: signature.substring(0, 10) + '...',
                    calculated: calculatedSignature.substring(0, 10) + '...'
                });
            }

            return isValid;

        } catch (error) {
            logger.error('Error verifying CBE Birr callback signature:', error);
            return false;
        }
    }

    /**
     * Refund payment
     * @param {Object} refundData - Refund information
     * @returns {Promise<Object>} - Refund response
     */
    async refundPayment(refundData) {
        try {
            const {
                paymentId,
                amount,
                reason,
                transactionId
            } = refundData;

            if (!paymentId) {
                throw new ValidationError('Payment ID is required for refund', 'MISSING_PAYMENT_ID');
            }

            if (!amount || amount <= 0) {
                throw new ValidationError('Invalid refund amount', 'INVALID_AMOUNT');
            }

            const requestData = {
                paymentId,
                amount: Number(amount).toFixed(2),
                currency: this.config.currency,
                reason: reason || 'Customer request',
                reference: transactionId || `REFUND_${uuidv4().replace(/-/g, '').substring(0, 16)}`
            };

            logger.info('Processing CBE Birr refund:', requestData);

            const response = await this.client.post('/payments/refund', requestData);

            return {
                success: response.data.status === 'SUCCESSFUL',
                refundId: response.data.refundId,
                status: response.data.status,
                amount: response.data.amount,
                reference: response.data.reference,
                processedAt: response.data.processedAt,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to process CBE Birr refund:', error);
            throw error;
        }
    }

    /**
     * Check account balance
     * @returns {Promise<Object>} - Account balance information
     */
    async checkBalance() {
        try {
            logger.info('Checking CBE Birr account balance');

            const response = await this.client.get('/account/balance');

            return {
                success: true,
                availableBalance: response.data.availableBalance,
                ledgerBalance: response.data.ledgerBalance,
                currency: response.data.currency,
                lastUpdated: response.data.lastUpdated,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to check CBE Birr balance:', error);
            throw error;
        }
    }

    /**
     * Get payment history
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Payment history
     */
    async getPaymentHistory(options = {}) {
        try {
            const {
                startDate,
                endDate,
                limit = 50,
                offset = 0,
                status
            } = options;

            const params = {
                limit,
                offset
            };

            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (status) params.status = status;

            logger.info('Fetching CBE Birr payment history:', params);

            const response = await this.client.get('/payments/history', { params });

            return {
                success: true,
                payments: response.data.payments,
                total: response.data.total,
                limit: response.data.limit,
                offset: response.data.offset,
                hasMore: response.data.hasMore,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to fetch CBE Birr payment history:', error);
            throw error;
        }
    }

    /**
     * Validate phone number for CBE Birr
     * @param {String} phoneNumber - Phone number to validate
     * @returns {Promise<Object>} - Validation result
     */
    async validatePhoneNumber(phoneNumber) {
        try {
            if (!phoneNumber || !/^2519[0-9]{8}$/.test(phoneNumber)) {
                return {
                    isValid: false,
                    error: 'Invalid Ethiopian phone number format'
                };
            }

            const response = await this.client.post('/customers/validate', {
                phoneNumber
            });

            return {
                isValid: response.data.isValid,
                customerName: response.data.customerName,
                accountStatus: response.data.accountStatus,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to validate CBE Birr phone number:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Simulate payment for testing (sandbox only)
     * @param {Object} simulationData - Simulation parameters
     * @returns {Promise<Object>} - Simulation response
     */
    async simulatePayment(simulationData) {
        if (this.config.environment !== 'sandbox') {
            throw new PaymentError('Simulation only available in sandbox mode', 'SIMULATION_DISABLED');
        }

        try {
            const {
                phoneNumber,
                amount,
                status = 'SUCCESSFUL'
            } = simulationData;

            const requestData = {
                phoneNumber,
                amount: Number(amount).toFixed(2),
                status,
                merchantReference: `SIM_${uuidv4().replace(/-/g, '').substring(0, 16)}`
            };

            logger.info('Simulating CBE Birr payment:', requestData);

            const response = await this.client.post('/sandbox/simulate', requestData);

            return {
                success: true,
                simulationId: response.data.simulationId,
                status: response.data.status,
                paymentId: response.data.paymentId,
                checkoutUrl: response.data.checkoutUrl,
                rawResponse: response.data
            };

        } catch (error) {
            logger.error('Failed to simulate CBE Birr payment:', error);
            throw error;
        }
    }

    /**
     * Health check for CBE Birr service
     * @returns {Promise<Object>} - Health status
     */
    async healthCheck() {
        try {
            const startTime = Date.now();
            
            const response = await this.client.get('/health', {
                timeout: 10000
            });

            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                responseTime,
                environment: this.config.environment,
                version: response.data.version,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('CBE Birr health check failed:', error);
            
            return {
                status: 'unhealthy',
                error: error.message,
                environment: this.config.environment,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = CBEBirrService;

// Export error types for convenience
module.exports.PaymentError = PaymentError;
module.exports.ValidationError = ValidationError;
module.exports.NetworkError = NetworkError;