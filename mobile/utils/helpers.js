// utils/helpers.js
/**
 * Enterprise Helper Utilities for Yachi Platform
 * Comprehensive utility functions for Ethiopian service marketplace
 * Version: 2.0.0
 */

import { 
  ETHIOPIAN_CONSTANTS, 
  USER_ROLES, 
  SERVICE_CATEGORIES, 
  WORKER_TYPES,
  BOOKING_CONSTANTS,
  PAYMENT_CONSTANTS,
  CONSTRUCTION_CONSTANTS 
} from './constants';

// ===== VALIDATION HELPERS =====

/**
 * Validate Ethiopian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid Ethiopian phone number
 */
export const isValidEthiopianPhone = (phone) => {
  if (!phone) return false;
  
  // Remove any non-digit characters except leading +
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  
  // Ethiopian phone number patterns
  const patterns = [
    /^\+251[1-59]\d{8}$/, // International format
    /^0[1-59]\d{8}$/,     // Local format
    /^251[1-59]\d{8}$/,   // Without + prefix
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  
  const isValid = Object.values(requirements).every(Boolean);
  const strength = Object.values(requirements).filter(Boolean).length;
  
  return {
    isValid,
    strength,
    requirements,
    score: Math.round((strength / Object.keys(requirements).length) * 100),
  };
};

/**
 * Validate Ethiopian ID number
 * @param {string} idNumber - ID number to validate
 * @returns {boolean} True if valid format
 */
export const isValidEthiopianID = (idNumber) => {
  if (!idNumber) return false;
  
  // Basic Ethiopian ID format validation
  const idRegex = /^[A-Z]{1,2}\d{5,10}$/i;
  return idRegex.test(idNumber);
};

// ===== USER AND ROLE HELPERS =====

/**
 * Check if user has specific permission
 * @param {Object} user - User object
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  
  const userPermissions = USER_ROLES.PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission) || userPermissions.includes('*');
};

/**
 * Check if user can access feature
 * @param {Object} user - User object
 * @param {string} feature - Feature to check
 * @returns {boolean} True if user can access feature
 */
export const canAccessFeature = (user, feature) => {
  const featurePermissions = {
    'ai_construction_matching': [USER_ROLES.CONSTRUCTION_MANAGER, USER_ROLES.GOVERNMENT_OFFICIAL, USER_ROLES.ADMIN],
    'government_portal': [USER_ROLES.GOVERNMENT_OFFICIAL, USER_ROLES.ADMIN],
    'premium_features': [USER_ROLES.SERVICE_PROVIDER, USER_ROLES.CLIENT],
    'admin_dashboard': [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN],
  };
  
  const allowedRoles = featurePermissions[feature] || [];
  return allowedRoles.includes(user?.role);
};

/**
 * Get user display name
 * @param {Object} user - User object
 * @returns {string} Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.businessName) {
    return user.businessName;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'Unknown User';
};

/**
 * Check if user is verified
 * @param {Object} user - User object
 * @returns {boolean} True if user is verified
 */
export const isUserVerified = (user) => {
  if (!user) return false;
  
  return user.isEmailVerified && user.isPhoneVerified && user.isProfileComplete;
};

// ===== SERVICE AND BOOKING HELPERS =====

/**
 * Calculate service completion time
 * @param {Object} service - Service object
 * @param {number} quantity - Service quantity
 * @returns {number} Estimated minutes
 */
export const calculateServiceTime = (service, quantity = 1) => {
  const baseTime = service.estimatedDuration || 60; // Default 1 hour
  return baseTime * quantity;
};

/**
 * Check if service provider is available
 * @param {Object} provider - Service provider
 * @param {Date} startTime - Requested start time
 * @param {number} duration - Service duration in minutes
 * @returns {boolean} True if available
 */
export const isProviderAvailable = (provider, startTime, duration) => {
  if (!provider?.availability) return true;
  
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  // Check if within business hours
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  
  if (startHour < 8 || endHour > 18) {
    return false; // Outside business hours
  }
  
  // Check existing bookings (simplified)
  const conflictingBookings = provider.bookings?.filter(booking => {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    
    return (startTime < bookingEnd && endTime > bookingStart);
  });
  
  return !conflictingBookings?.length;
};

/**
 * Calculate booking total amount
 * @param {Object} service - Service object
 * @param {number} quantity - Quantity
 * @param {Object} options - Additional options
 * @returns {number} Total amount in cents
 */
export const calculateBookingTotal = (service, quantity = 1, options = {}) => {
  const basePrice = service.price * quantity;
  const additionalFees = options.additionalFees || 0;
  
  return basePrice + additionalFees;
};

/**
 * Check if booking can be cancelled
 * @param {Object} booking - Booking object
 * @returns {Object} { canCancel: boolean, reason: string }
 */
export const canCancelBooking = (booking) => {
  if (!booking) {
    return { canCancel: false, reason: 'Booking not found' };
  }
  
  const now = new Date();
  const bookingStart = new Date(booking.startTime);
  const hoursUntilBooking = (bookingStart - now) / (1000 * 60 * 60);
  
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return { canCancel: false, reason: 'Booking cannot be cancelled in current status' };
  }
  
  if (hoursUntilBooking < BOOKING_CONSTANTS.CANCELLATION_POLICY.FREE_CANCELLATION_HOURS) {
    return { 
      canCancel: true, 
      reason: 'Cancellation may incur fees',
      willIncurFee: true 
    };
  }
  
  return { canCancel: true, reason: 'Free cancellation available' };
};

// ===== CONSTRUCTION PROJECT HELPERS =====

/**
 * Calculate construction project team requirements
 * @param {Object} project - Project details
 * @returns {Object} Team requirements
 */
export const calculateTeamRequirements = (project) => {
  const { type, size, complexity, budget } = project;
  
  const baseRequirements = {
    residential: {
      minWorkers: 3,
      maxWorkers: 10,
      roles: ['mason', 'carpenter', 'laborer'],
    },
    commercial: {
      minWorkers: 5,
      maxWorkers: 20,
      roles: ['engineer', 'architect', 'mason', 'steel_fixer', 'electrician'],
    },
    government: {
      minWorkers: 10,
      maxWorkers: 50,
      roles: ['project_manager', 'engineer', 'architect', 'foreman', 'mason', 'steel_fixer'],
    },
  };
  
  const requirements = baseRequirements[type] || baseRequirements.residential;
  
  // Adjust based on project size and complexity
  const sizeMultiplier = Math.sqrt(size / 100); // Assuming size in square meters
  const complexityMultiplier = complexity === 'high' ? 1.5 : complexity === 'medium' ? 1.2 : 1;
  
  const estimatedWorkers = Math.ceil(
    requirements.minWorkers * sizeMultiplier * complexityMultiplier
  );
  
  const finalWorkerCount = Math.min(
    Math.max(estimatedWorkers, requirements.minWorkers),
    requirements.maxWorkers
  );
  
  return {
    workerCount: finalWorkerCount,
    roles: requirements.roles,
    estimatedDuration: Math.ceil(size / (finalWorkerCount * 10)), // Simplified calculation
  };
};

/**
 * Calculate construction project budget
 * @param {Object} project - Project details
 * @param {Array} workers - Worker assignments
 * @returns {Object} Budget breakdown
 */
export const calculateProjectBudget = (project, workers = []) => {
  const { size, duration, type } = project;
  
  // Base cost per square meter (in cents)
  const baseCosts = {
    residential: 500000, // 5,000 ETB per m²
    commercial: 800000,  // 8,000 ETB per m²
    government: 1000000, // 10,000 ETB per m²
  };
  
  const baseCost = baseCosts[type] || baseCosts.residential;
  const materialCost = size * baseCost;
  
  // Labor cost
  const laborCost = workers.reduce((total, worker) => {
    const workerType = WORKER_TYPES[worker.type];
    const dailyRate = workerType?.dailyRate?.min || 50000; // Default 500 ETB
    return total + (dailyRate * duration);
  }, 0);
  
  // Additional costs (20% of base)
  const additionalCosts = materialCost * 0.2;
  
  const subtotal = materialCost + laborCost + additionalCosts;
  const contingency = subtotal * 0.1; // 10% contingency
  const total = subtotal + contingency;
  
  return {
    materialCost,
    laborCost,
    additionalCosts,
    contingency,
    total,
    breakdown: {
      materials: Math.round(materialCost),
      labor: Math.round(laborCost),
      additional: Math.round(additionalCosts),
      contingency: Math.round(contingency),
      total: Math.round(total),
    },
  };
};

/**
 * Calculate AI matching score for worker assignment
 * @param {Object} worker - Worker profile
 * @param {Object} requirement - Job requirement
 * @returns {number} Matching score (0-1)
 */
export const calculateWorkerMatchScore = (worker, requirement) => {
  const weights = CONSTRUCTION_CONSTANTS.AI_MATCHING;
  
  let score = 0;
  let totalWeight = 0;
  
  // Skill matching
  if (worker.skills && requirement.skills) {
    const skillMatch = worker.skills.filter(skill => 
      requirement.skills.includes(skill)
    ).length / requirement.skills.length;
    
    score += skillMatch * weights.SKILL_WEIGHT;
    totalWeight += weights.SKILL_WEIGHT;
  }
  
  // Location proximity
  if (worker.location && requirement.location) {
    const distance = calculateDistance(worker.location, requirement.location);
    const locationScore = Math.max(0, 1 - (distance / 100)); // 100km max range
    
    score += locationScore * weights.LOCATION_WEIGHT;
    totalWeight += weights.LOCATION_WEIGHT;
  }
  
  // Rating consideration
  if (worker.rating) {
    const ratingScore = worker.rating / 5; // Normalize to 0-1
    
    score += ratingScore * weights.RATING_WEIGHT;
    totalWeight += weights.RATING_WEIGHT;
  }
  
  // Availability check
  if (worker.availability) {
    const availabilityScore = worker.availability === 'available' ? 1 : 0.5;
    
    score += availabilityScore * weights.AVAILABILITY_WEIGHT;
    totalWeight += weights.AVAILABILITY_WEIGHT;
  }
  
  // Normalize score
  return totalWeight > 0 ? score / totalWeight : 0;
};

// ===== PAYMENT AND FINANCIAL HELPERS =====

/**
 * Calculate payment fees and total
 * @param {number} amount - Base amount in cents
 * @param {Object} options - Fee options
 * @returns {Object} Fee breakdown
 */
export const calculatePaymentFees = (amount, options = {}) => {
  const serviceFeeRate = options.serviceFeeRate || PAYMENT_CONSTANTS.FEES.SERVICE_FEE_PERCENTAGE;
  const taxRate = options.taxRate || PAYMENT_CONSTANTS.FEES.TAX_PERCENTAGE;
  const minServiceFee = options.minServiceFee || PAYMENT_CONSTANTS.FEES.MIN_SERVICE_FEE;
  
  const serviceFee = Math.max(
    Math.round(amount * (serviceFeeRate / 100)),
    minServiceFee
  );
  
  const taxAmount = Math.round((amount + serviceFee) * (taxRate / 100));
  const totalAmount = amount + serviceFee + taxAmount;
  
  return {
    baseAmount: amount,
    serviceFee,
    taxAmount,
    totalAmount,
    breakdown: {
      serviceFeeRate,
      taxRate,
      minServiceFee,
    },
  };
};

/**
 * Check if payment amount is within limits
 * @param {number} amount - Amount in cents
 * @param {string} type - Payment type
 * @returns {boolean} True if within limits
 */
export const isPaymentAmountValid = (amount, type = 'payment') => {
  const limits = PAYMENT_CONSTANTS.LIMITS;
  
  if (type === 'withdrawal') {
    return amount >= limits.MIN_WITHDRAWAL_AMOUNT && 
           amount <= limits.MAX_WITHDRAWAL_AMOUNT;
  }
  
  return amount >= limits.MIN_PAYMENT_AMOUNT && 
         amount <= limits.MAX_PAYMENT_AMOUNT;
};

/**
 * Calculate provider earnings after fees
 * @param {number} amount - Total payment amount in cents
 * @returns {number} Provider earnings in cents
 */
export const calculateProviderEarnings = (amount) => {
  const fees = calculatePaymentFees(amount);
  return amount - fees.serviceFee - fees.taxAmount;
};

// ===== LOCATION AND DISTANCE HELPERS =====

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - { latitude, longitude }
 * @param {Object} coord2 - { latitude, longitude }
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return Infinity;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * 
    Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if location is within service area
 * @param {Object} providerLocation - Provider's location
 * @param {Object} customerLocation - Customer's location
 * @param {number} maxDistance - Maximum distance in km
 * @returns {boolean} True if within service area
 */
export const isWithinServiceArea = (providerLocation, customerLocation, maxDistance = 50) => {
  const distance = calculateDistance(providerLocation, customerLocation);
  return distance <= maxDistance;
};

/**
 * Get Ethiopian city by coordinates
 * @param {Object} coordinates - { latitude, longitude }
 * @returns {Object} City object or null
 */
export const getCityByCoordinates = (coordinates) => {
  if (!coordinates) return null;
  
  const cities = Object.values(ETHIOPIAN_CONSTANTS.CITIES);
  
  return cities.find(city => {
    const distance = calculateDistance(coordinates, city.coordinates);
    return distance <= 50; // Within 50km of city center
  }) || null;
};

// ===== DATE AND TIME HELPERS =====

/**
 * Check if date is during Ethiopian business hours
 * @param {Date} date - Date to check
 * @returns {boolean} True if during business hours
 */
export const isDuringBusinessHours = (date) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  const totalMinutes = hour * 60 + minute;
  const businessStart = 8 * 60; // 8:00 AM
  const businessEnd = 18 * 60; // 6:00 PM
  
  return totalMinutes >= businessStart && totalMinutes <= businessEnd;
};

/**
 * Check if date is an Ethiopian holiday
 * @param {Date} date - Date to check
 * @returns {boolean} True if holiday
 */
export const isEthiopianHoliday = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  return Object.values(ETHIOPIAN_CONSTANTS.HOLIDAYS).includes(monthDay);
};

/**
 * Calculate working days between two dates (excluding weekends and holidays)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of working days
 */
export const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    
    if (!isWeekend && !isEthiopianHoliday(current)) {
      count++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// ===== STRING AND ARRAY HELPERS =====

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Deep clone object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Convert array to object by key
 * @param {Array} array - Array to convert
 * @param {string} key - Key to use as object key
 * @returns {Object} Converted object
 */
export const arrayToObject = (array, key) => {
  return array.reduce((obj, item) => {
    obj[item[key]] = item;
    return obj;
  }, {});
};

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

// ===== FILE AND IMAGE HELPERS =====

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid file type
 */
export const isValidFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} True if valid file size
 */
export const isValidFileSize = (file, maxSize = 5 * 1024 * 1024) => { // 5MB default
  return file.size <= maxSize;
};

/**
 * Generate file preview URL
 * @param {File} file - File to preview
 * @returns {Promise<string>} Preview URL
 */
export const generateFilePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

// ===== PERFORMANCE AND OPTIMIZATION HELPERS =====

/**
 * Memoize function results
 * @param {Function} func - Function to memoize
 * @returns {Function} Memoized function
 */
export const memoize = (func) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  };
};

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ===== EXPORT ALL HELPERS =====

export default {
  // Validation Helpers
  isValidEthiopianPhone,
  isValidEmail,
  validatePassword,
  isValidEthiopianID,
  
  // User and Role Helpers
  hasPermission,
  canAccessFeature,
  getUserDisplayName,
  isUserVerified,
  
  // Service and Booking Helpers
  calculateServiceTime,
  isProviderAvailable,
  calculateBookingTotal,
  canCancelBooking,
  
  // Construction Project Helpers
  calculateTeamRequirements,
  calculateProjectBudget,
  calculateWorkerMatchScore,
  
  // Payment and Financial Helpers
  calculatePaymentFees,
  isPaymentAmountValid,
  calculateProviderEarnings,
  
  // Location and Distance Helpers
  calculateDistance,
  isWithinServiceArea,
  getCityByCoordinates,
  
  // Date and Time Helpers
  isDuringBusinessHours,
  isEthiopianHoliday,
  calculateWorkingDays,
  
  // String and Array Helpers
  generateId,
  debounce,
  deepClone,
  arrayToObject,
  groupBy,
  
  // File and Image Helpers
  isValidFileType,
  isValidFileSize,
  generateFilePreview,
  
  // Performance Helpers
  memoize,
  throttle,
};

// ===== HELPER UTILITIES =====

/**
 * Create a chainable helper object
 * @param {any} value - Initial value
 * @returns {Object} Chainable helper
 */
export const createChainableHelper = (value) => {
  return {
    value,
    map(fn) {
      return createChainableHelper(fn(this.value));
    },
    tap(fn) {
      fn(this.value);
      return this;
    },
    result() {
      return this.value;
    },
  };
};

/**
 * Compose multiple helper functions
 * @param {...Function} functions - Helper functions
 * @returns {Function} Composed function
 */
export const composeHelpers = (...functions) => {
  return (value) => {
    return functions.reduceRight((result, fn) => fn(result), value);
  };
};

/**
 * Create a conditional helper
 * @param {Function} condition - Condition function
 * @param {Function} trueHelper - Helper for true condition
 * @param {Function} falseHelper - Helper for false condition
 * @returns {Function} Conditional helper
 */
export const conditionalHelper = (condition, trueHelper, falseHelper = (v) => v) => {
  return (value, ...args) => {
    return condition(value, ...args) 
      ? trueHelper(value, ...args)
      : falseHelper(value, ...args);
  };
};

// Pre-composed helper chains for common use cases
export const helperChains = {
  validateUser: composeHelpers(
    (user) => user && typeof user === 'object',
    (user) => isValidEmail(user.email),
    (user) => isValidEthiopianPhone(user.phone),
    isUserVerified
  ),
  
  calculateServiceCost: composeHelpers(
    (data) => calculateBookingTotal(data.service, data.quantity, data.options),
    (amount) => calculatePaymentFees(amount),
    (fees) => fees.totalAmount
  ),
  
  formatUserDisplay: composeHelpers(
    getUserDisplayName,
    (name) => name.trim(),
    (name) => name || 'Unknown User'
  ),
};