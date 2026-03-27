// utils/formatters.js
/**
 * Enterprise Formatters for Yachi Platform
 * Comprehensive formatting utilities for Ethiopian market
 * Version: 2.0.0
 */

import { ETHIOPIAN_CONSTANTS, PAYMENT_CONSTANTS, WORKER_TYPES, SERVICE_CATEGORIES } from './constants';

// ===== CURRENCY FORMATTERS =====

/**
 * Format Ethiopian Birr amount for display
 * @param {number} amount - Amount in cents
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    showSymbol = true,
    showDecimals = true,
    locale = 'en-ET',
    currency = 'ETB',
  } = options;

  // Handle invalid amounts
  if (typeof amount !== 'number' || isNaN(amount)) {
    return showSymbol ? 'Br 0.00' : '0.00';
  }

  // Convert cents to major units
  const majorUnits = amount / 100;

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
    currencyDisplay: 'symbol',
  });

  return formatter.format(majorUnits);
};

/**
 * Format currency with Ethiopian style (Br symbol first)
 * @param {number} amount - Amount in cents
 * @param {boolean} compact - Whether to use compact notation
 * @returns {string} Formatted currency
 */
export const formatEthiopianCurrency = (amount, compact = false) => {
  if (compact && amount >= 100000) {
    const majorUnits = amount / 100;
    if (majorUnits >= 1000000) {
      return `Br ${(majorUnits / 1000000).toFixed(1)}M`;
    }
    if (majorUnits >= 1000) {
      return `Br ${(majorUnits / 1000).toFixed(1)}K`;
    }
  }

  return formatCurrency(amount, { showSymbol: true, showDecimals: true });
};

/**
 * Format payment amount with fee breakdown
 * @param {number} baseAmount - Base amount in cents
 * @param {Object} fees - Fee configuration
 * @returns {Object} Formatted amounts breakdown
 */
export const formatPaymentBreakdown = (baseAmount, fees = {}) => {
  const serviceFeeRate = fees.serviceFeePercentage || PAYMENT_CONSTANTS.FEES.SERVICE_FEE_PERCENTAGE;
  const taxRate = fees.taxPercentage || PAYMENT_CONSTANTS.FEES.TAX_PERCENTAGE;
  const minServiceFee = fees.minServiceFee || PAYMENT_CONSTANTS.FEES.MIN_SERVICE_FEE;

  const serviceFee = Math.max(
    Math.round(baseAmount * (serviceFeeRate / 100)),
    minServiceFee
  );
  
  const taxAmount = Math.round((baseAmount + serviceFee) * (taxRate / 100));
  const totalAmount = baseAmount + serviceFee + taxAmount;

  return {
    baseAmount: {
      raw: baseAmount,
      formatted: formatCurrency(baseAmount),
    },
    serviceFee: {
      raw: serviceFee,
      formatted: formatCurrency(serviceFee),
      rate: serviceFeeRate,
    },
    taxAmount: {
      raw: taxAmount,
      formatted: formatCurrency(taxAmount),
      rate: taxRate,
    },
    totalAmount: {
      raw: totalAmount,
      formatted: formatCurrency(totalAmount),
    },
  };
};

// ===== DATE AND TIME FORMATTERS =====

/**
 * Format date in Ethiopian preferred format
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date
 */
export const formatDate = (date, options = {}) => {
  const {
    style = 'medium',
    includeTime = false,
    locale = 'en-ET',
    timeZone = 'Africa/Addis_Ababa',
  } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const dateStyles = {
    short: { day: 'numeric', month: 'short', year: '2-digit' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };

  const timeStyle = includeTime ? { hour: '2-digit', minute: '2-digit' } : {};

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone,
    ...dateStyles[style],
    ...timeStyle,
  });

  return formatter.format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffDays) > 7) {
    return formatDate(dateObj, { style: 'short' });
  } else if (Math.abs(diffDays) > 0) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffHours) > 0) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffMinutes) > 0) {
    return rtf.format(diffMinutes, 'minute');
  } else {
    return rtf.format(diffSeconds, 'second');
  }
};

/**
 * Format duration in hours and minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};

/**
 * Format business hours for display
 * @param {string} opens - Opening time (HH:MM)
 * @param {string} closes - Closing time (HH:MM)
 * @returns {string} Formatted business hours
 */
export const formatBusinessHours = (opens, closes) => {
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-ET', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return `${formatTime(opens)} - ${formatTime(closes)}`;
};

// ===== LOCATION FORMATTERS =====

/**
 * Format address for display
 * @param {Object} address - Address object
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return 'Location not specified';

  const parts = [
    address.street,
    address.subcity || address.zone,
    address.city,
    address.region,
  ].filter(Boolean);

  return parts.join(', ') || 'Location not specified';
};

/**
 * Format distance for display
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance
 */
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  
  if (distance < 10) {
    return `${distance.toFixed(1)} km`;
  }
  
  return `${Math.round(distance)} km`;
};

/**
 * Format coordinates for display
 * @param {Object} coordinates - { latitude, longitude }
 * @returns {string} Formatted coordinates
 */
export const formatCoordinates = (coordinates) => {
  if (!coordinates) return 'No coordinates';
  
  const lat = coordinates.latitude.toFixed(6);
  const lng = coordinates.longitude.toFixed(6);
  return `${lat}, ${lng}`;
};

// ===== NAME AND CONTACT FORMATTERS =====

/**
 * Format Ethiopian phone number for display
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';

  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Ethiopian phone number formatting
  if (cleaned.startsWith('251')) {
    return `+251 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  } else if (cleaned.startsWith('0')) {
    return `+251 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  return phoneNumber;
};

/**
 * Format user name for display
 * @param {Object} user - User object
 * @returns {string} Formatted name
 */
export const formatUserName = (user) => {
  if (!user) return 'Unknown User';

  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  if (user.firstName) {
    return user.firstName;
  }

  if (user.businessName) {
    return user.businessName;
  }

  return user.email?.split('@')[0] || 'Unknown User';
};

/**
 * Format email for display (with privacy)
 * @param {string} email - Email address
 * @param {boolean} obfuscate - Whether to obfuscate for privacy
 * @returns {string} Formatted email
 */
export const formatEmail = (email, obfuscate = false) => {
  if (!email) return '';

  if (obfuscate) {
    const [local, domain] = email.split('@');
    const obfuscatedLocal = local.length > 2 
      ? `${local.substring(0, 2)}***` 
      : '***';
    return `${obfuscatedLocal}@${domain}`;
  }

  return email;
};

// ===== SERVICE AND WORKER FORMATTERS =====

/**
 * Format service category for display
 * @param {string} categoryId - Category ID
 * @returns {string} Formatted category name
 */
export const formatServiceCategory = (categoryId) => {
  for (const category of Object.values(SERVICE_CATEGORIES)) {
    if (category.id === categoryId) {
      return category.name;
    }
    // Check subcategories
    for (const subcategory of Object.values(category.subcategories || {})) {
      if (subcategory.id === categoryId) {
        return `${category.name} - ${subcategory.name}`;
      }
    }
  }
  return 'Unknown Category';
};

/**
 * Format worker type for display
 * @param {string} workerTypeId - Worker type ID
 * @returns {string} Formatted worker type
 */
export const formatWorkerType = (workerTypeId) => {
  const workerType = WORKER_TYPES[workerTypeId?.toUpperCase()];
  return workerType?.name || 'Unknown Worker';
};

/**
 * Format worker rate for display
 * @param {Object} worker - Worker object
 * @param {string} period - Rate period (daily, hourly, monthly)
 * @returns {string} Formatted rate
 */
export const formatWorkerRate = (worker, period = 'daily') => {
  const workerType = WORKER_TYPES[worker.type?.toUpperCase()];
  if (!workerType) return 'Rate not available';

  const rate = worker.customRate || workerType.dailyRate;
  
  switch (period) {
    case 'hourly':
      const hourlyRate = Math.round(rate.min / 8); // 8-hour work day
      return `${formatCurrency(hourlyRate)}/hour`;
    case 'monthly':
      const monthlyRate = rate.min * 22; // 22 working days per month
      return `${formatCurrency(monthlyRate)}/month`;
    default:
      return `${formatCurrency(rate.min)} - ${formatCurrency(rate.max)}/day`;
  }
};

/**
 * Format service rating for display
 * @param {number} rating - Rating value (0-5)
 * @param {number} reviewCount - Number of reviews
 * @returns {string} Formatted rating
 */
export const formatRating = (rating, reviewCount = 0) => {
  if (!rating || rating === 0) {
    return 'No ratings yet';
  }

  const formattedRating = rating.toFixed(1);
  
  if (reviewCount > 0) {
    return `${formattedRating} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`;
  }
  
  return formattedRating;
};

// ===== BOOKING AND STATUS FORMATTERS =====

/**
 * Format booking status for display
 * @param {string} status - Booking status
 * @returns {Object} { text: string, color: string, variant: string }
 */
export const formatBookingStatus = (status) => {
  const statusConfig = {
    pending: {
      text: 'Pending Confirmation',
      color: '#F59E0B',
      variant: 'warning',
    },
    confirmed: {
      text: 'Confirmed',
      color: '#10B981',
      variant: 'success',
    },
    in_progress: {
      text: 'In Progress',
      color: '#3B82F6',
      variant: 'info',
    },
    completed: {
      text: 'Completed',
      color: '#10B981',
      variant: 'success',
    },
    cancelled: {
      text: 'Cancelled',
      color: '#EF4444',
      variant: 'error',
    },
    no_show: {
      text: 'No Show',
      color: '#6B7280',
      variant: 'neutral',
    },
  };

  return statusConfig[status] || {
    text: 'Unknown Status',
    color: '#6B7280',
    variant: 'neutral',
  };
};

/**
 * Format project status for display
 * @param {string} status - Project status
 * @returns {Object} { text: string, color: string, variant: string }
 */
export const formatProjectStatus = (status) => {
  const statusConfig = {
    planning: {
      text: 'Planning',
      color: '#8B5CF6',
      variant: 'info',
    },
    design: {
      text: 'Design Phase',
      color: '#06B6D4',
      variant: 'info',
    },
    approval: {
      text: 'Awaiting Approval',
      color: '#F59E0B',
      variant: 'warning',
    },
    active: {
      text: 'Active',
      color: '#10B981',
      variant: 'success',
    },
    on_hold: {
      text: 'On Hold',
      color: '#F59E0B',
      variant: 'warning',
    },
    completed: {
      text: 'Completed',
      color: '#10B981',
      variant: 'success',
    },
    cancelled: {
      text: 'Cancelled',
      color: '#EF4444',
      variant: 'error',
    },
  };

  return statusConfig[status] || {
    text: 'Unknown Status',
    color: '#6B7280',
    variant: 'neutral',
  };
};

// ===== PAYMENT AND FINANCIAL FORMATTERS =====

/**
 * Format payment method for display
 * @param {string} method - Payment method
 * @returns {string} Formatted payment method
 */
export const formatPaymentMethod = (method) => {
  const methodNames = {
    chapa: 'Chapa',
    telebirr: 'Telebirr',
    cbe_birr: 'CBE Birr',
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
    cash: 'Cash',
  };

  return methodNames[method] || method;
};

/**
 * Format transaction status for display
 * @param {string} status - Transaction status
 * @returns {Object} { text: string, color: string, variant: string }
 */
export const formatTransactionStatus = (status) => {
  const statusConfig = {
    pending: {
      text: 'Pending',
      color: '#F59E0B',
      variant: 'warning',
    },
    processing: {
      text: 'Processing',
      color: '#3B82F6',
      variant: 'info',
    },
    completed: {
      text: 'Completed',
      color: '#10B981',
      variant: 'success',
    },
    failed: {
      text: 'Failed',
      color: '#EF4444',
      variant: 'error',
    },
    cancelled: {
      text: 'Cancelled',
      color: '#6B7280',
      variant: 'neutral',
    },
    refunded: {
      text: 'Refunded',
      color: '#8B5CF6',
      variant: 'info',
    },
  };

  return statusConfig[status] || {
    text: 'Unknown Status',
    color: '#6B7280',
    variant: 'neutral',
  };
};

/**
 * Format account balance for display
 * @param {number} balance - Balance in cents
 * @param {boolean} includeLabel - Whether to include "Balance" label
 * @returns {string} Formatted balance
 */
export const formatBalance = (balance, includeLabel = true) => {
  const formattedAmount = formatCurrency(balance);
  return includeLabel ? `Balance: ${formattedAmount}` : formattedAmount;
};

// ===== FILE AND DATA SIZE FORMATTERS =====

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format number with Ethiopian number grouping
 * @param {number} number - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
export const formatNumber = (number, options = {}) => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    locale = 'en-ET',
  } = options;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(number);
};

// ===== TEXT AND CONTENT FORMATTERS =====

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Format text with title case
 * @param {string} text - Text to format
 * @returns {string} Title-cased text
 */
export const toTitleCase = (text) => {
  if (!text) return '';
  
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Format text as slug (URL-friendly)
 * @param {string} text - Text to format
 * @returns {string} Slugified text
 */
export const slugify = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// ===== SPECIALIZED BUSINESS FORMATTERS =====

/**
 * Format construction project details for display
 * @param {Object} project - Project object
 * @returns {Object} Formatted project details
 */
export const formatConstructionProject = (project) => {
  if (!project) return {};

  return {
    title: project.title || 'Untitled Project',
    type: toTitleCase(project.type?.replace('_', ' ') || ''),
    status: formatProjectStatus(project.status),
    budget: formatCurrency(project.budget),
    duration: project.duration ? `${project.duration} days` : 'Not specified',
    location: formatAddress(project.location),
    startDate: project.startDate ? formatDate(project.startDate) : 'Not scheduled',
    workers: project.teamSize ? `${project.teamSize} workers` : 'Team size not specified',
  };
};

/**
 * Format service provider profile for display
 * @param {Object} provider - Provider object
 * @returns {Object} Formatted provider details
 */
export const formatServiceProvider = (provider) => {
  if (!provider) return {};

  return {
    name: formatUserName(provider),
    businessName: provider.businessName || 'Independent Professional',
    rating: formatRating(provider.rating, provider.reviewCount),
    experience: provider.experience ? `${provider.experience} years experience` : 'Experience not specified',
    location: formatAddress(provider.location),
    responseTime: provider.responseTime ? `Responds in ${provider.responseTime}` : 'Response time not specified',
    completionRate: provider.completionRate ? `${Math.round(provider.completionRate * 100)}% completion rate` : '',
  };
};

/**
 * Format AI matching score for display
 * @param {number} score - Matching score (0-1)
 * @returns {Object} Formatted score details
 */
export const formatMatchingScore = (score) => {
  const percentage = Math.round(score * 100);
  
  let level, color;
  if (percentage >= 90) {
    level = 'Excellent';
    color = '#10B981';
  } else if (percentage >= 75) {
    level = 'Very Good';
    color = '#3B82F6';
  } else if (percentage >= 60) {
    level = 'Good';
    color = '#F59E0B';
  } else if (percentage >= 50) {
    level = 'Fair';
    color = '#F59E0B';
  } else {
    level = 'Poor';
    color = '#EF4444';
  }

  return {
    percentage,
    level,
    color,
    display: `${percentage}% Match (${level})`,
  };
};

// ===== EXPORT ALL FORMATTERS =====

export default {
  // Currency Formatters
  formatCurrency,
  formatEthiopianCurrency,
  formatPaymentBreakdown,
  
  // Date and Time Formatters
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatBusinessHours,
  
  // Location Formatters
  formatAddress,
  formatDistance,
  formatCoordinates,
  
  // Name and Contact Formatters
  formatPhoneNumber,
  formatUserName,
  formatEmail,
  
  // Service and Worker Formatters
  formatServiceCategory,
  formatWorkerType,
  formatWorkerRate,
  formatRating,
  
  // Booking and Status Formatters
  formatBookingStatus,
  formatProjectStatus,
  
  // Payment and Financial Formatters
  formatPaymentMethod,
  formatTransactionStatus,
  formatBalance,
  
  // File and Data Formatters
  formatFileSize,
  formatNumber,
  
  // Text and Content Formatters
  truncateText,
  toTitleCase,
  slugify,
  
  // Specialized Business Formatters
  formatConstructionProject,
  formatServiceProvider,
  formatMatchingScore,
};

// ===== FORMATTER UTILITIES =====

/**
 * Create a memoized formatter function
 * @param {Function} formatter - Formatter function
 * @returns {Function} Memoized formatter
 */
export const memoizeFormatter = (formatter) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = formatter(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Chain multiple formatters together
 * @param {Function[]} formatters - Array of formatter functions
 * @returns {Function} Chained formatter
 */
export const chainFormatters = (...formatters) => {
  return (value) => {
    return formatters.reduce((result, formatter) => {
      return formatter(result);
    }, value);
  };
};

/**
 * Create a conditional formatter
 * @param {Function} condition - Condition function
 * @param {Function} trueFormatter - Formatter for true condition
 * @param {Function} falseFormatter - Formatter for false condition
 * @returns {Function} Conditional formatter
 */
export const conditionalFormatter = (condition, trueFormatter, falseFormatter = (v) => v) => {
  return (value, ...args) => {
    return condition(value, ...args) 
      ? trueFormatter(value, ...args)
      : falseFormatter(value, ...args);
  };
};

// Pre-memoized commonly used formatters for performance
export const memoizedFormatters = {
  formatCurrency: memoizeFormatter(formatCurrency),
  formatDate: memoizeFormatter(formatDate),
  formatPhoneNumber: memoizeFormatter(formatPhoneNumber),
  formatUserName: memoizeFormatter(formatUserName),
};