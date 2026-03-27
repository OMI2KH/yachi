// backend/services/payment-gateways/chapaService.js

const axios = require('axios');
const crypto = require('crypto');
const qs = require('querystring');

class ChapaService {
    constructor(config) {
        this.config = {
            baseUrl: config.baseUrl || 'https://api.chapa.co/v1',
            secretKey: config.secretKey,
            webhookSecret: config.webhookSecret,
            redirectUrl: config.redirectUrl,
            timeout: config.timeout || 30000,
            ...config
        };
        
        this.axiosInstance = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.secretKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Initialize a payment transaction
     * @param {Object} paymentData - Payment details
     * @returns {Promise<Object>} - Payment initialization response
     */
    async initializePayment(paymentData) {
        try {
            const txRef = paymentData.tx_ref || this.generateTransactionRef();
            
            const payload = {
                amount: paymentData.amount,
                currency: paymentData.currency || 'ETB',
                email: paymentData.email,
                first_name: paymentData.first_name,
                last_name: paymentData.last_name,
                tx_ref: txRef,
                callback_url: paymentData.callback_url || this.config.redirectUrl,
                return_url: paymentData.return_url,
                customization: paymentData.customization || {
                    title: 'Payment Checkout',
                    description: 'Complete your payment'
                },
                meta: {
                    ...paymentData.meta,
                    customer_id: paymentData.customer_id,
                    order_id: paymentData.order_id,
                    product_id: paymentData.product_id
                }
            };

            // Add optional fields if provided
            if (paymentData.phone_number) payload.phone_number = paymentData.phone_number;
            if (paymentData.subaccounts) payload.subaccounts = paymentData.subaccounts;

            const response = await this.axiosInstance.post('/transaction/initialize', payload);
            
            return {
                success: true,
                data: {
                    checkout_url: response.data.data.checkout_url,
                    tx_ref: txRef,
                    payment_url: response.data.data.checkout_url,
                    reference: txRef,
                    message: 'Payment initialized successfully'
                },
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'initializePayment');
        }
    }

    /**
     * Verify a payment transaction
     * @param {string} transactionRef - Transaction reference to verify
     * @returns {Promise<Object>} - Payment verification response
     */
    async verifyPayment(transactionRef) {
        try {
            const response = await this.axiosInstance.get(`/transaction/verify/${transactionRef}`);
            
            const paymentData = response.data.data;
            
            return {
                success: paymentData.status === 'success',
                data: {
                    status: paymentData.status,
                    tx_ref: paymentData.tx_ref,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    charged_amount: paymentData.charged_amount,
                    fee: paymentData.fee,
                    payment_method: paymentData.payment_method,
                    created_at: paymentData.created_at,
                    updated_at: paymentData.updated_at,
                    customer: paymentData.customer,
                    meta: paymentData.meta
                },
                message: paymentData.status === 'success' ? 'Payment verified successfully' : 'Payment verification failed',
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'verifyPayment');
        }
    }

    /**
     * Create a subaccount
     * @param {Object} subaccountData - Subaccount details
     * @returns {Promise<Object>} - Subaccount creation response
     */
    async createSubaccount(subaccountData) {
        try {
            const payload = {
                business_name: subaccountData.business_name,
                account_name: subaccountData.account_name,
                bank_code: subaccountData.bank_code,
                account_number: subaccountData.account_number,
                split_type: subaccountData.split_type || 'percentage',
                split_value: subaccountData.split_value
            };

            const response = await this.axiosInstance.post('/subaccount', payload);
            
            return {
                success: true,
                data: response.data.data,
                message: 'Subaccount created successfully',
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'createSubaccount');
        }
    }

    /**
     * Get all subaccounts
     * @returns {Promise<Object>} - List of subaccounts
     */
    async getSubaccounts() {
        try {
            const response = await this.axiosInstance.get('/subaccount');
            
            return {
                success: true,
                data: response.data.data,
                message: 'Subaccounts retrieved successfully',
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'getSubaccounts');
        }
    }

    /**
     * Update a subaccount
     * @param {string} subaccountId - Subaccount ID
     * @param {Object} updateData - Updated subaccount data
     * @returns {Promise<Object>} - Update response
     */
    async updateSubaccount(subaccountId, updateData) {
        try {
            const response = await this.axiosInstance.put(`/subaccount/${subaccountId}`, updateData);
            
            return {
                success: true,
                data: response.data.data,
                message: 'Subaccount updated successfully',
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'updateSubaccount');
        }
    }

    /**
     * Delete a subaccount
     * @param {string} subaccountId - Subaccount ID
     * @returns {Promise<Object>} - Delete response
     */
    async deleteSubaccount(subaccountId) {
        try {
            await this.axiosInstance.delete(`/subaccount/${subaccountId}`);
            
            return {
                success: true,
                message: 'Subaccount deleted successfully'
            };

        } catch (error) {
            return this.handleError(error, 'deleteSubaccount');
        }
    }

    /**
     * Get bank list
     * @returns {Promise<Object>} - List of supported banks
     */
    async getBanks() {
        try {
            const response = await this.axiosInstance.get('/banks');
            
            return {
                success: true,
                data: response.data.data,
                message: 'Banks retrieved successfully',
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'getBanks');
        }
    }

    /**
     * Verify webhook signature
     * @param {string} signature - Webhook signature
     * @param {Object} payload - Webhook payload
     * @returns {boolean} - Whether signature is valid
     */
    verifyWebhookSignature(signature, payload) {
        try {
            if (!this.config.webhookSecret) {
                throw new Error('Webhook secret is not configured');
            }

            const computedSignature = crypto
                .createHmac('sha256', this.config.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return signature === computedSignature;

        } catch (error) {
            console.error('Error verifying webhook signature:', error);
            return false;
        }
    }

    /**
     * Process webhook event
     * @param {Object} webhookData - Webhook payload
     * @param {string} signature - Webhook signature
     * @returns {Object} - Processed webhook data
     */
    processWebhook(webhookData, signature) {
        try {
            // Verify signature
            if (!this.verifyWebhookSignature(signature, webhookData)) {
                throw new Error('Invalid webhook signature');
            }

            const event = webhookData.event;
            const data = webhookData.data;

            return {
                success: true,
                event,
                data: {
                    tx_ref: data.tx_ref,
                    status: data.status,
                    amount: data.amount,
                    currency: data.currency,
                    customer: data.customer,
                    meta: data.meta,
                    created_at: data.created_at,
                    updated_at: data.updated_at
                },
                message: `Webhook ${event} processed successfully`,
                rawData: webhookData
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Webhook processing failed'
            };
        }
    }

    /**
     * Generate a unique transaction reference
     * @returns {string} - Unique transaction reference
     */
    generateTransactionRef() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        return `TX-${timestamp}-${random}`;
    }

    /**
     * Handle API errors
     * @param {Error} error - Error object
     * @param {string} operation - Operation name
     * @returns {Object} - Formatted error response
     */
    handleError(error, operation) {
        console.error(`Chapa ${operation} error:`, error);

        let errorMessage = 'Payment processing failed';
        let errorCode = 'PAYMENT_ERROR';
        let statusCode = 500;

        if (error.response) {
            // The request was made and the server responded with a status code
            statusCode = error.response.status;
            const chapaError = error.response.data;

            switch (statusCode) {
                case 400:
                    errorMessage = chapaError.message || 'Bad request';
                    errorCode = 'BAD_REQUEST';
                    break;
                case 401:
                    errorMessage = 'Invalid secret key';
                    errorCode = 'UNAUTHORIZED';
                    break;
                case 403:
                    errorMessage = 'Forbidden - Check your API permissions';
                    errorCode = 'FORBIDDEN';
                    break;
                case 404:
                    errorMessage = 'Resource not found';
                    errorCode = 'NOT_FOUND';
                    break;
                case 422:
                    errorMessage = chapaError.message || 'Validation failed';
                    errorCode = 'VALIDATION_ERROR';
                    break;
                case 429:
                    errorMessage = 'Too many requests';
                    errorCode = 'RATE_LIMIT_EXCEEDED';
                    break;
                default:
                    errorMessage = chapaError.message || 'Payment gateway error';
            }

        } else if (error.request) {
            // The request was made but no response was received
            errorMessage = 'No response from payment gateway';
            errorCode = 'NETWORK_ERROR';
            statusCode = 503;
        } else {
            // Something happened in setting up the request
            errorMessage = error.message || 'Payment configuration error';
        }

        return {
            success: false,
            error: {
                message: errorMessage,
                code: errorCode,
                statusCode,
                operation,
                timestamp: new Date().toISOString()
            },
            message: errorMessage
        };
    }

    /**
     * Get payment status
     * @param {string} transactionRef - Transaction reference
     * @returns {Promise<Object>} - Payment status
     */
    async getPaymentStatus(transactionRef) {
        try {
            const response = await this.axiosInstance.get(`/transaction/${transactionRef}/status`);
            
            return {
                success: true,
                data: {
                    status: response.data.data.status,
                    tx_ref: transactionRef,
                    message: response.data.message
                },
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'getPaymentStatus');
        }
    }

    /**
     * Create a payment link
     * @param {Object} linkData - Payment link data
     * @returns {Promise<Object>} - Payment link response
     */
    async createPaymentLink(linkData) {
        try {
            const payload = {
                title: linkData.title,
                description: linkData.description,
                amount: linkData.amount,
                currency: linkData.currency || 'ETB',
                redirect_url: linkData.redirect_url || this.config.redirectUrl,
                meta: linkData.meta || {}
            };

            const response = await this.axiosInstance.post('/payment-links', payload);
            
            return {
                success: true,
                data: {
                    link_url: response.data.data.link_url,
                    link_id: response.data.data.id,
                    ...response.data.data
                },
                message: 'Payment link created successfully',
                rawResponse: response.data
            };

        } catch (error) {
            return this.handleError(error, 'createPaymentLink');
        }
    }

    /**
     * Check service health
     * @returns {Promise<Object>} - Health status
     */
    async checkHealth() {
        try {
            const response = await this.axiosInstance.get('/health');
            
            return {
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                rawResponse: response.data
            };

        } catch (error) {
            return {
                success: false,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Factory function for creating ChapaService instance
function createChapaService(config) {
    if (!config.secretKey) {
        throw new Error('Chapa secret key is required');
    }
    
    return new ChapaService(config);
}

module.exports = {
    ChapaService,
    createChapaService
};