import api from './api.js';

/**
 * Fetch a list of products with optional query parameters
 * @param {Object} params - Query parameters (e.g., filters, pagination)
 * @returns {Promise<Array>} - Array of products
 */
export const getProducts = async (params = {}) => {
  try {
    const response = await api.get('/api/products', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};

/**
 * Fetch a single product by its ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} - Product object
 */
export const getProductById = async (id) => {
  try {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch product with id ${id}:`, error);
    throw error;
  }
};
