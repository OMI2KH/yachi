// constants/validation.js

/**
 * ENTERPRISE-LEVEL VALIDATION SYSTEM
 * Yachi Mobile App - Comprehensive Validation Rules & Patterns
 * Ethiopian Market Specific Validation with International Standards
 */

import { Platform } from 'react-native';

// =============================================================================
// VALIDATION PATTERNS SYSTEM
// =============================================================================

export const VALIDATION_PATTERNS = {
  // Email validation (international standard with Ethiopian domain support)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // Ethiopian phone number validation
  PHONE_ETHIOPIA: /^(?:(?:\+251|251|0)?9\d{8})$/,
  
  // International phone number (for future expansion)
  PHONE_INTERNATIONAL: /^\+(?:[0-9] ?){6,14}[0-9]$/,
  
  // Ethiopian ID number validation
  ETHIOPIAN_ID: /^[0-9]{10,15}$/,
  
  // TIN (Tax Identification Number) validation
  TIN_ETHIOPIA: /^[0-9]{10}$/,
  
  // Business license number validation
  BUSINESS_LICENSE: /^[A-Z0-9]{8,15}$/,
  
  // Password strength validation
  PASSWORD: {
    STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    MEDIUM: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]/,
    WEAK: /^.{6,}$/
  },
  
  // Name validation (supports Ethiopian names with special characters)
  NAME: /^[\p{L}\s.'-]+$/u,
  
  // Ethiopian address validation
  ADDRESS: /^[\p{L}0-9\s.,#'-/]+$/u,
  
  // Currency validation (Ethiopian Birr and international)
  CURRENCY: /^\d+(\.\d{1,2})?$/,
  
  // Construction project codes
  PROJECT_CODE: /^[A-Z]{2,4}-[0-9]{4,6}$/,
  
  // GPS coordinates validation
  COORDINATES: /^-?([1-8]?[0-9]\.\d{1,6}|90\.0{1,6}),\s*-?((1[0-7][0-9]|[1-9]?[0-9])\.\d{1,6}|180\.0{1,6})$/,
  
  // URL validation
  URL: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
  
  // Date validation (Ethiopian and Gregorian)
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  
  // Time validation
  TIME: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
};

// =============================================================================
// VALIDATION RULES SYSTEM
// =============================================================================

export const VALIDATION_RULES = {
  // User authentication rules
  AUTH: {
    EMAIL: {
      required: 'Email is required',
      pattern: {
        value: VALIDATION_PATTERNS.EMAIL,
        message: 'Please enter a valid email address'
      },
      maxLength: {
        value: 255,
        message: 'Email must be less than 255 characters'
      }
    },
    
    PHONE: {
      required: 'Phone number is required',
      pattern: {
        value: VALIDATION_PATTERNS.PHONE_ETHIOPIA,
        message: 'Please enter a valid Ethiopian phone number (e.g., 0912345678)'
      }
    },
    
    PASSWORD: {
      required: 'Password is required',
      minLength: {
        value: 8,
        message: 'Password must be at least 8 characters'
      },
      validate: (value) => {
        if (!VALIDATION_PATTERNS.PASSWORD.MEDIUM.test(value)) {
          return 'Password must contain at least one letter and one number';
        }
        return true;
      }
    },
    
    CONFIRM_PASSWORD: {
      required: 'Please confirm your password',
      validate: (value, allValues) => {
        return value === allValues.password || 'Passwords do not match';
      }
    },
    
    FULL_NAME: {
      required: 'Full name is required',
      minLength: {
        value: 2,
        message: 'Name must be at least 2 characters'
      },
      maxLength: {
        value: 100,
        message: 'Name must be less than 100 characters'
      },
      pattern: {
        value: VALIDATION_PATTERNS.NAME,
        message: 'Please enter a valid name'
      }
    },
  },

  // Profile validation rules
  PROFILE: {
    DISPLAY_NAME: {
      required: 'Display name is required',
      minLength: {
        value: 2,
        message: 'Display name must be at least 2 characters'
      },
      maxLength: {
        value: 50,
        message: 'Display name must be less than 50 characters'
      }
    },
    
    BIO: {
      maxLength: {
        value: 500,
        message: 'Bio must be less than 500 characters'
      }
    },
    
    ADDRESS: {
      required: 'Address is required',
      minLength: {
        value: 5,
        message: 'Address must be at least 5 characters'
      },
      maxLength: {
        value: 255,
        message: 'Address must be less than 255 characters'
      },
      pattern: {
        value: VALIDATION_PATTERNS.ADDRESS,
        message: 'Please enter a valid address'
      }
    },
    
    CITY: {
      required: 'City is required',
      minLength: {
        value: 2,
        message: 'City must be at least 2 characters'
      },
      maxLength: {
        value: 50,
        message: 'City must be less than 50 characters'
      }
    },
  },

  // Service validation rules
  SERVICE: {
    TITLE: {
      required: 'Service title is required',
      minLength: {
        value: 5,
        message: 'Service title must be at least 5 characters'
      },
      maxLength: {
        value: 100,
        message: 'Service title must be less than 100 characters'
      }
    },
    
    DESCRIPTION: {
      required: 'Service description is required',
      minLength: {
        value: 20,
        message: 'Service description must be at least 20 characters'
      },
      maxLength: {
        value: 1000,
        message: 'Service description must be less than 1000 characters'
      }
    },
    
    PRICE: {
      required: 'Price is required',
      min: {
        value: 0,
        message: 'Price cannot be negative'
      },
      max: {
        value: 1000000,
        message: 'Price cannot exceed 1,000,000 ETB'
      },
      pattern: {
        value: VALIDATION_PATTERNS.CURRENCY,
        message: 'Please enter a valid price'
      }
    },
    
    CATEGORY: {
      required: 'Category is required'
    },
    
    DURATION: {
      required: 'Duration is required',
      min: {
        value: 0.5,
        message: 'Duration must be at least 0.5 hours'
      },
      max: {
        value: 24,
        message: 'Duration cannot exceed 24 hours'
      }
    },
  },

  // Booking validation rules
  BOOKING: {
    DATE: {
      required: 'Booking date is required',
      validate: (value) => {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          return 'Booking date cannot be in the past';
        }
        return true;
      }
    },
    
    TIME: {
      required: 'Booking time is required',
      pattern: {
        value: VALIDATION_PATTERNS.TIME,
        message: 'Please enter a valid time (HH:MM)'
      }
    },
    
    NOTES: {
      maxLength: {
        value: 500,
        message: 'Notes must be less than 500 characters'
      }
    },
    
    ADDRESS: {
      required: 'Service address is required',
      minLength: {
        value: 10,
        message: 'Please provide a complete address'
      }
    },
  },

  // Construction project validation rules
  CONSTRUCTION: {
    PROJECT_NAME: {
      required: 'Project name is required',
      minLength: {
        value: 5,
        message: 'Project name must be at least 5 characters'
      },
      maxLength: {
        value: 200,
        message: 'Project name must be less than 200 characters'
      }
    },
    
    PROJECT_CODE: {
      required: 'Project code is required',
      pattern: {
        value: VALIDATION_PATTERNS.PROJECT_CODE,
        message: 'Project code must follow format: ABC-1234'
      }
    },
    
    BUDGET: {
      required: 'Budget is required',
      min: {
        value: 1000,
        message: 'Budget must be at least 1,000 ETB'
      },
      max: {
        value: 10000000,
        message: 'Budget cannot exceed 10,000,000 ETB'
      },
      pattern: {
        value: VALIDATION_PATTERNS.CURRENCY,
        message: 'Please enter a valid budget amount'
      }
    },
    
    SQUARE_METERS: {
      required: 'Area is required',
      min: {
        value: 1,
        message: 'Area must be at least 1 square meter'
      },
      max: {
        value: 10000,
        message: 'Area cannot exceed 10,000 square meters'
      }
    },
    
    FLOORS: {
      required: 'Number of floors is required',
      min: {
        value: 1,
        message: 'Must have at least 1 floor'
      },
      max: {
        value: 50,
        message: 'Cannot exceed 50 floors'
      }
    },
    
    TIMELINE: {
      required: 'Project timeline is required',
      min: {
        value: 1,
        message: 'Timeline must be at least 1 day'
      },
      max: {
        value: 365,
        message: 'Timeline cannot exceed 1 year'
      }
    },
  },

  // Payment validation rules
  PAYMENT: {
    AMOUNT: {
      required: 'Payment amount is required',
      min: {
        value: 1,
        message: 'Payment amount must be at least 1 ETB'
      },
      max: {
        value: 50000,
        message: 'Payment amount cannot exceed 50,000 ETB'
      },
      pattern: {
        value: VALIDATION_PATTERNS.CURRENCY,
        message: 'Please enter a valid amount'
      }
    },
    
    CARD_NUMBER: {
      required: 'Card number is required',
      pattern: {
        value: /^[0-9]{16}$/,
        message: 'Please enter a valid 16-digit card number'
      }
    },
    
    EXPIRY_DATE: {
      required: 'Expiry date is required',
      pattern: {
        value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
        message: 'Please enter a valid expiry date (MM/YY)'
      },
      validate: (value) => {
        const [month, year] = value.split('/');
        const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
        const today = new Date();
        
        if (expiry < today) {
          return 'Card has expired';
        }
        return true;
      }
    },
    
    CVV: {
      required: 'CVV is required',
      pattern: {
        value: /^[0-9]{3,4}$/,
        message: 'Please enter a valid CVV'
      }
    },
  },

  // Government portal validation rules
  GOVERNMENT: {
    DEPARTMENT: {
      required: 'Department is required'
    },
    
    PROJECT_TYPE: {
      required: 'Project type is required'
    },
    
    BUDGET_ALLOCATION: {
      required: 'Budget allocation is required',
      min: {
        value: 10000,
        message: 'Budget allocation must be at least 10,000 ETB'
      },
      max: {
        value: 100000000,
        message: 'Budget allocation cannot exceed 100,000,000 ETB'
      }
    },
    
    TIMELINE_MONTHS: {
      required: 'Project timeline is required',
      min: {
        value: 1,
        message: 'Timeline must be at least 1 month'
      },
      max: {
        value: 60,
        message: 'Timeline cannot exceed 5 years'
      }
    },
    
    LOCATION: {
      required: 'Project location is required'
    },
  },

  // Review and rating validation rules
  REVIEW: {
    RATING: {
      required: 'Rating is required',
      min: {
        value: 1,
        message: 'Rating must be at least 1 star'
      },
      max: {
        value: 5,
        message: 'Rating cannot exceed 5 stars'
      }
    },
    
    COMMENT: {
      required: 'Review comment is required',
      minLength: {
        value: 10,
        message: 'Review must be at least 10 characters'
      },
      maxLength: {
        value: 1000,
        message: 'Review must be less than 1000 characters'
      }
    },
  },

  // Document validation rules
  DOCUMENT: {
    ID_NUMBER: {
      required: 'ID number is required',
      pattern: {
        value: VALIDATION_PATTERNS.ETHIOPIAN_ID,
        message: 'Please enter a valid Ethiopian ID number'
      }
    },
    
    TIN: {
      required: 'TIN is required',
      pattern: {
        value: VALIDATION_PATTERNS.TIN_ETHIOPIA,
        message: 'Please enter a valid 10-digit TIN'
      }
    },
    
    BUSINESS_LICENSE: {
      required: 'Business license number is required',
      pattern: {
        value: VALIDATION_PATTERNS.BUSINESS_LICENSE,
        message: 'Please enter a valid business license number'
      }
    },
  },
};

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION_CONSTANTS = {
  // Length constraints
  MAX_EMAIL_LENGTH: 255,
  MAX_NAME_LENGTH: 100,
  MAX_DISPLAY_NAME_LENGTH: 50,
  MAX_PHONE_LENGTH: 15,
  MAX_ADDRESS_LENGTH: 255,
  MAX_CITY_LENGTH: 50,
  MAX_BIO_LENGTH: 500,
  MAX_SERVICE_TITLE_LENGTH: 100,
  MAX_SERVICE_DESCRIPTION_LENGTH: 1000,
  MAX_BOOKING_NOTES_LENGTH: 500,
  MAX_REVIEW_LENGTH: 1000,
  MAX_PROJECT_NAME_LENGTH: 200,
  
  // Numeric constraints
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_SERVICE_PRICE: 0,
  MAX_SERVICE_PRICE: 1000000,
  MIN_BOOKING_DURATION: 0.5,
  MAX_BOOKING_DURATION: 24,
  MIN_CONSTRUCTION_BUDGET: 1000,
  MAX_CONSTRUCTION_BUDGET: 10000000,
  MIN_GOVERNMENT_BUDGET: 10000,
  MAX_GOVERNMENT_BUDGET: 100000000,
  MIN_SQUARE_METERS: 1,
  MAX_SQUARE_METERS: 10000,
  MIN_FLOORS: 1,
  MAX_FLOORS: 50,
  MIN_TIMELINE_DAYS: 1,
  MAX_TIMELINE_DAYS: 365,
  MIN_TIMELINE_MONTHS: 1,
  MAX_TIMELINE_MONTHS: 60,
  
  // File constraints
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_IMAGES_PER_SERVICE: 10,
  MAX_IMAGES_PER_PORTFOLIO: 20,
  MAX_DOCUMENTS_PER_USER: 5,
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export const ValidationUtils = {
  // Password strength calculator
  calculatePasswordStrength: (password) => {
    if (!password) return { score: 0, strength: 'empty', message: 'No password' };
    
    let score = 0;
    const messages = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    else messages.push('At least 8 characters');
    
    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else messages.push('One lowercase letter');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else messages.push('One uppercase letter');
    
    // Number check
    if (/[0-9]/.test(password)) score += 1;
    else messages.push('One number');
    
    // Special character check
    if (/[@$!%*?&]/.test(password)) score += 1;
    else messages.push('One special character (@$!%*?&)');
    
    // Determine strength
    let strength, color;
    if (score >= 5) {
      strength = 'strong';
      color = '#10B981'; // green
    } else if (score >= 3) {
      strength = 'medium';
      color = '#F59E0B'; // yellow
    } else {
      strength = 'weak';
      color = '#EF4444'; // red
    }
    
    return {
      score,
      strength,
      color,
      message: messages.length > 0 ? `Needs: ${messages.join(', ')}` : 'Strong password',
      isAcceptable: score >= 3
    };
  },
  
  // Ethiopian phone number formatter
  formatEthiopianPhone: (phone) => {
    if (!phone) return '';
    
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length and prefix
    if (cleaned.startsWith('251') && cleaned.length === 12) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('9') && cleaned.length === 10) {
      return `+251${cleaned}`;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      return `+251${cleaned.slice(1)}`;
    } else if (cleaned.length === 9) {
      return `+251${cleaned}`;
    }
    
    return phone;
  },
  
  // Currency formatter for Ethiopian Birr
  formatCurrency: (amount, currency = 'ETB') => {
    if (typeof amount !== 'number') return '';
    
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },
  
  // Date validator for Ethiopian calendar compatibility
  validateEthiopianDate: (date) => {
    if (!date) return { isValid: false, message: 'Date is required' };
    
    const selectedDate = new Date(date);
    const today = new Date();
    
    if (isNaN(selectedDate.getTime())) {
      return { isValid: false, message: 'Invalid date format' };
    }
    
    if (selectedDate < today) {
      return { isValid: false, message: 'Date cannot be in the past' };
    }
    
    // Ethiopian specific date validation could be added here
    // For now, we use Gregorian calendar validation
    
    return { isValid: true, message: '' };
  },
  
  // File validation utility
  validateFile: (file, options = {}) => {
    const {
      maxSize = VALIDATION_CONSTANTS.MAX_FILE_SIZE,
      allowedTypes = VALIDATION_CONSTANTS.ALLOWED_IMAGE_TYPES,
      type = 'image'
    } = options;
    
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length > 0 ? errors.join(', ') : 'File is valid'
    };
  },
  
  // Construction project validator
  validateConstructionProject: (projectData) => {
    const errors = {};
    
    if (!projectData.name || projectData.name.length < 5) {
      errors.name = 'Project name must be at least 5 characters';
    }
    
    if (!projectData.budget || projectData.budget < 1000) {
      errors.budget = 'Budget must be at least 1,000 ETB';
    }
    
    if (!projectData.area || projectData.area < 1) {
      errors.area = 'Area must be at least 1 square meter';
    }
    
    if (!projectData.timeline || projectData.timeline < 1) {
      errors.timeline = 'Timeline must be at least 1 day';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      message: Object.keys(errors).length === 0 ? 'Project data is valid' : 'Please fix validation errors'
    };
  },
  
  // AI worker matching validation
  validateWorkerMatching: (projectRequirements) => {
    const errors = {};
    
    if (!projectRequirements.skills || projectRequirements.skills.length === 0) {
      errors.skills = 'At least one skill is required';
    }
    
    if (!projectRequirements.location) {
      errors.location = 'Project location is required';
    }
    
    if (!projectRequirements.budgetRange) {
      errors.budgetRange = 'Budget range is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      message: Object.keys(errors).length === 0 ? 'Worker matching criteria is valid' : 'Please fix validation errors'
    };
  },
};

// =============================================================================
// ENTERPRISE EXPORT SYSTEM
// =============================================================================

export default {
  // Core validation systems
  PATTERNS: VALIDATION_PATTERNS,
  RULES: VALIDATION_RULES,
  CONSTANTS: VALIDATION_CONSTANTS,
  UTILS: ValidationUtils,
  
  // Feature-specific validation groups
  GROUPS: {
    AUTH: VALIDATION_RULES.AUTH,
    PROFILE: VALIDATION_RULES.PROFILE,
    SERVICE: VALIDATION_RULES.SERVICE,
    BOOKING: VALIDATION_RULES.BOOKING,
    CONSTRUCTION: VALIDATION_RULES.CONSTRUCTION,
    PAYMENT: VALIDATION_RULES.PAYMENT,
    GOVERNMENT: VALIDATION_RULES.GOVERNMENT,
    REVIEW: VALIDATION_RULES.REVIEW,
    DOCUMENT: VALIDATION_RULES.DOCUMENT,
  },
  
  // Ethiopian market specific validation
  ETHIOPIAN: {
    PHONE_PATTERN: VALIDATION_PATTERNS.PHONE_ETHIOPIA,
    ID_PATTERN: VALIDATION_PATTERNS.ETHIOPIAN_ID,
    TIN_PATTERN: VALIDATION_PATTERNS.TIN_ETHIOPIA,
    formatPhone: ValidationUtils.formatEthiopianPhone,
    formatCurrency: ValidationUtils.formatCurrency,
  },
  
  // Construction AI feature validation
  CONSTRUCTION_AI: {
    validateProject: ValidationUtils.validateConstructionProject,
    validateWorkerMatching: ValidationUtils.validateWorkerMatching,
  },
};