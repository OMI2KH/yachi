import api from './api.js';

/**
 * Create a checkout session for online payments
 * @param {Object} data - Payment data including product, amount, customer info
 * @returns {Promise<Object>} - Session info or payment link
 */
export const createCheckoutSession = async (data) => {
  try {
    const response = await api.post('/api/create-checkout-session', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
};

/**
 * Initiate a Telebirr payment
 * @param {Object} data - Payment data including transaction ID, amount, customer info
 * @returns {Promise<Object>} - Payment response
 */
export const createTelebirrPayment = async (data) => {
  try {
    const response = await api.post('/api/payments/telebirr', data);
    return response.data;
  } catch (error) {
    console.error('Telebirr payment failed:', error);
    throw error;
  }
};

/**
 * Initiate an Mpesa payment
 * @param {Object} data - Payment data including transaction ID, amount, customer info
 * @returns {Promise<Object>} - Payment response
 */
export const createMpesaPayment = async (data) => {
  try {
    const response = await api.post('/api/payments/mpesa', data);
    return response.data;
  } catch (error) {
    console.error('Mpesa payment failed:', error);
    throw error;
  }
};
