/**
 * @file Validation Utilities
 * @description Enterprise-level validation system with Ethiopian market optimization
 * @version 1.0.0
 * @module utils/validators
 */

import { Platform } from 'react-native';

/**
 * @typedef {Object} ValidationRule
 * @property {boolean} [required] - Whether field is required
 * @property {number} [min] - Minimum length/value
 * @property {number} [max] - Maximum length/value
 * @property {RegExp} [pattern] - Validation pattern
 * @property {string} message - Error message
 * @property {Function} [custom] - Custom validation function
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string} [message] - Validation message
 * @property {string} [suggestion] - Improvement suggestion
 * @property {number} [score] - Validation score (0-100)
 */

/**
 * @typedef {Object} ValidationScore
 * @property {number} overall - Overall validation score
 * @property {Object} categories - Scores per category
 * @property {Array} suggestions - Improvement suggestions
 */

// Yachi Validation Constants - Ethiopian Market Optimized
export const ValidationRules = {
  // Service Validation Rules
  SERVICE: {
    NAME: {
      required: true,
      min: 3,
      max: 100,
      pattern: /^[a-zA-Z0-9\s\-&.,()@�-፩]+$/,
      message: 'Service name must be 3-100 characters with letters, numbers, and basic punctuation'
    },
    DESCRIPTION: {
      required: true,
      min: 20,
      max: 1000,
      pattern: /^[a-zA-Z0-9\s\-&.,()!?@�-፩]+$/,
      message: 'Description must be 20-1000 characters describing your service in detail'
    },
    PRICE: {
      required: true,
      min: 50,
      max: 500000,
      pattern: /^\d+$/,
      message: 'Price must be between 50 ETB and 500,000 ETB'
    },
    DURATION: {
      required: true,
      min: 15,
      max: 480,
      pattern: /^\d+$/,
      message: 'Duration must be between 15 minutes and 8 hours'
    },
    CATEGORY: {
      required: true,
      message: 'Service category is required'
    }
  },

  // Provider Validation Rules
  PROVIDER: {
    NAME: {
      required: true,
      min: 2,
      max: 50,
      pattern: /^[a-zA-Z\s\-'@�-፩]+$/,
      message: 'Name must be 2-50 characters with only letters and spaces'
    },
    EMAIL: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    PHONE: {
      required: true,
      pattern: /^(09\d{8}|9\d{8})$/,
      message: 'Please enter a valid 10-digit Ethiopian phone number'
    },
    TIN_NUMBER: {
      pattern: /^\d{10}$/,
      message: 'TIN number must be 10 digits'
    },
    BUSINESS_LICENSE: {
      pattern: /^[A-Z0-9]{8,15}$/,
      message: 'Business license must be 8-15 characters (letters and numbers)'
    }
  },

  // User Validation Rules
  USER: {
    FULL_NAME: {
      required: true,
      min: 2,
      max: 50,
      pattern: /^[a-zA-Z\s\-'@�-፩]+$/,
      message: 'Full name must be 2-50 characters'
    },
    EMAIL: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    PHONE: {
      required: true,
      pattern: /^(09\d{8}|9\d{8})$/,
      message: 'Please enter a valid Ethiopian phone number'
    },
    PASSWORD: {
      required: true,
      min: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character'
    }
  },

  // Location Validation Rules
  LOCATION: {
    ADDRESS: {
      required: true,
      min: 10,
      max: 200,
      pattern: /^[a-zA-Z0-9\s\-.,()@�-፩]+$/,
      message: 'Address must be 10-200 characters'
    },
    CITY: {
      required: true,
      pattern: /^[a-zA-Z\s@�-፩]+$/,
      message: 'Please select a valid city'
    },
    SUB_CITY: {
      required: true,
      pattern: /^[a-zA-Z\s@�-፩]+$/,
      message: 'Please select a valid sub-city'
    },
    LANDMARK: {
      min: 5,
      max: 100,
      message: 'Landmark must be 5-100 characters'
    }
  },

  // Construction Project Validation Rules
  CONSTRUCTION: {
    PROJECT_NAME: {
      required: true,
      min: 5,
      max: 100,
      pattern: /^[a-zA-Z0-9\s\-&.,()@�-፩]+$/,
      message: 'Project name must be 5-100 characters'
    },
    SQUARE_AREA: {
      required: true,
      min: 10,
      max: 10000,
      pattern: /^\d+$/,
      message: 'Square area must be between 10 and 10,000 square meters'
    },
    FLOOR_COUNT: {
      required: true,
      min: 1,
      max: 50,
      pattern: /^\d+$/,
      message: 'Floor count must be between 1 and 50'
    },
    BUDGET: {
      required: true,
      min: 10000,
      max: 100000000,
      pattern: /^\d+$/,
      message: 'Budget must be between 10,000 ETB and 100,000,000 ETB'
    },
    TIMELINE: {
      required: true,
      min: 1,
      max: 3650,
      pattern: /^\d+$/,
      message: 'Timeline must be between 1 and 3650 days'
    }
  },

  // Government Project Validation Rules
  GOVERNMENT: {
    PROJECT_CODE: {
      required: true,
      pattern: /^[A-Z0-9]{6,12}$/,
      message: 'Project code must be 6-12 uppercase letters and numbers'
    },
    MINISTRY: {
      required: true,
      pattern: /^[a-zA-Z\s]+$/,
      message: 'Please select a valid ministry'
    },
    TENDER_NUMBER: {
      required: true,
      pattern: /^[A-Z0-9\/\-]{8,20}$/,
      message: 'Tender number must be 8-20 characters (letters, numbers, /, -)'
    },
    BUDGET_RANGE: {
      required: true,
      min: 100000,
      max: 1000000000,
      message: 'Budget range must be between 100,000 ETB and 1,000,000,000 ETB'
    }
  },

  // Payment Validation Rules
  PAYMENT: {
    AMOUNT: {
      required: true,
      min: 10,
      max: 500000,
      pattern: /^\d+$/,
      message: 'Amount must be between 10 ETB and 500,000 ETB'
    },
    CBE_BIRR: {
      ACCOUNT_NUMBER: {
        pattern: /^\d{13}$/,
        message: 'CBE Birr account number must be 13 digits'
      },
      PIN: {
        pattern: /^\d{4}$/,
        message: 'PIN must be 4 digits'
      }
    },
    TELEBIRR: {
      PHONE: {
        pattern: /^(09\d{8}|9\d{8})$/,
        message: 'Please enter a valid Telebirr phone number'
      },
      PIN: {
        pattern: /^\d{4}$/,
        message: 'PIN must be 4 digits'
      }
    },
    CHAPA: {
      PHONE: {
        pattern: /^(09\d{8}|9\d{8})$/,
        message: 'Please enter a valid phone number for Chapa'
      },
      EMAIL: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email for Chapa'
      }
    }
  }
};

// Yachi Validation Scoring System
export const ValidationScore = {
  WEAK: 0,
  BASIC: 1,
  GOOD: 2,
  STRONG: 3,
  EXCELLENT: 4,

  getScoreLabel: (score) => {
    const labels = {
      0: 'Weak',
      1: 'Basic',
      2: 'Good',
      3: 'Strong',
      4: 'Excellent'
    };
    return labels[score] || 'Unknown';
  }
};

/**
 * Yachi Service Validation with Gamification and AI Scoring
 * @param {Object} data - Service data to validate
 * @param {boolean} isEdit - Whether this is an edit operation
 * @returns {Object} Validation result with scores and suggestions
 */
export const validateServiceForm = (data, isEdit = false) => {
  const errors = {};
  const warnings = {};
  const score = {
    overall: 0,
    categories: {
      name: ValidationScore.WEAK,
      description: ValidationScore.WEAK,
      price: ValidationScore.WEAK,
      category: ValidationScore.WEAK,
      images: ValidationScore.WEAK,
      location: ValidationScore.WEAK
    }
  };

  // Name Validation
  if (!data.name?.trim()) {
    errors.name = 'Service name is required';
  } else {
    const nameValidation = validateField('name', data.name, ValidationRules.SERVICE.NAME);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.message;
      score.categories.name = ValidationScore.BASIC;
    } else {
      // Advanced name scoring
      let nameScore = ValidationScore.GOOD;
      const name = data.name.trim();
      
      // Check for Ethiopian language characters
      const hasAmharic = /[ሀ-፼]/.test(name);
      // Check for professional keywords
      const hasProfessionalTerms = /(professional|expert|quality|certified|licensed)/i.test(name);
      // Check length optimization
      const optimalLength = name.length >= 10 && name.length <= 60;
      
      if (hasAmharic) nameScore = ValidationScore.STRONG;
      if (hasProfessionalTerms && optimalLength) nameScore = ValidationScore.EXCELLENT;
      
      score.categories.name = nameScore;
    }
  }

  // Description Validation with Quality Scoring
  if (!data.description?.trim()) {
    errors.description = 'Service description is required';
    score.categories.description = ValidationScore.WEAK;
  } else {
    const descValidation = validateField('description', data.description, ValidationRules.SERVICE.DESCRIPTION);
    if (!descValidation.isValid) {
      errors.description = descValidation.message;
      score.categories.description = ValidationScore.BASIC;
    } else {
      // Calculate description quality score
      const desc = data.description.trim();
      let descScore = ValidationScore.BASIC;
      
      const wordCount = desc.split(/\s+/).length;
      const charCount = desc.length;
      const hasAmharic = /[ሀ-፼]/.test(desc);
      const hasBulletPoints = /[•\-*]\s/.test(desc);
      const hasKeywords = /(professional|quality|experienced|guarantee|warranty|clean|efficient|certified)/i.test(desc);
      const sentenceCount = desc.split(/[.!?]+/).length - 1;
      const paragraphCount = desc.split(/\n\s*\n/).length;

      // Scoring algorithm
      if (wordCount >= 30) descScore = ValidationScore.GOOD;
      if (wordCount >= 60 && hasKeywords) descScore = ValidationScore.STRONG;
      if (wordCount >= 100 && hasKeywords && hasBulletPoints && sentenceCount >= 4 && paragraphCount >= 2) {
        descScore = ValidationScore.EXCELLENT;
      }
      
      // Bonus for Amharic content
      if (hasAmharic) descScore = Math.min(descScore + 1, ValidationScore.EXCELLENT);

      score.categories.description = descScore;

      if (descScore <= ValidationScore.BASIC) {
        warnings.description = 'Add more details about your service to attract more clients';
      } else if (descScore <= ValidationScore.GOOD) {
        warnings.description = 'Consider adding bullet points and Amharic description for better reach';
      }
    }
  }

  // Price Validation with Ethiopian Market Intelligence
  if (!data.price || isNaN(parseFloat(data.price))) {
    errors.price = 'Valid price is required';
    score.categories.price = ValidationScore.WEAK;
  } else {
    const price = parseFloat(data.price);
    const priceValidation = validateField('price', price.toString(), ValidationRules.SERVICE.PRICE);
    
    if (!priceValidation.isValid) {
      errors.price = priceValidation.message;
      score.categories.price = ValidationScore.BASIC;
    } else {
      // Price competitiveness scoring for Ethiopian market
      let priceScore = ValidationScore.GOOD;
      
      // Check psychological pricing (ending with 99 or 90)
      const endsWithPsychological = /(99|90)$/.test(price.toString());
      // Check rounded pricing (multiples of 50 or 100)
      const isRounded = price % 50 === 0 || price % 100 === 0;
      
      if (endsWithPsychological || isRounded) {
        priceScore = ValidationScore.STRONG;
      }
      
      // Ethiopian market-specific price ranges
      const ethiopianPriceRanges = {
        plumbing: { min: 200, max: 15000, optimal: { min: 500, max: 5000 } },
        electrical: { min: 150, max: 20000, optimal: { min: 300, max: 8000 } },
        cleaning: { min: 300, max: 10000, optimal: { min: 500, max: 3000 } },
        carpentry: { min: 500, max: 50000, optimal: { min: 1000, max: 15000 } },
        construction: { min: 1000, max: 500000, optimal: { min: 5000, max: 100000 } },
        painting: { min: 400, max: 25000, optimal: { min: 800, max: 8000 } }
      };
      
      if (data.category && ethiopianPriceRanges[data.category]) {
        const range = ethiopianPriceRanges[data.category];
        const optimal = range.optimal;
        
        if (price >= optimal.min && price <= optimal.max) {
          priceScore = ValidationScore.EXCELLENT;
        } else if (price < range.min) {
          warnings.price = `Prices for ${data.category} typically start at ${range.min} ETB in Ethiopia`;
        } else if (price > range.max) {
          warnings.price = `Consider competitive pricing for ${data.category} services in the Ethiopian market`;
        } else if (price < optimal.min) {
          warnings.price = `You might be undervaluing your ${data.category} service`;
        } else if (price > optimal.max) {
          warnings.price = `Premium pricing detected for ${data.category} - ensure you have strong portfolio`;
        }
      }
      
      score.categories.price = priceScore;
    }
  }

  // Category Validation
  if (!data.category) {
    errors.category = 'Service category is required';
    score.categories.category = ValidationScore.WEAK;
  } else {
    score.categories.category = ValidationScore.EXCELLENT;
  }

  // Location Validation for Ethiopian Cities
  if (data.location) {
    const locationErrors = validateLocation(data.location);
    if (locationErrors.length > 0) {
      errors.location = locationErrors[0].message;
      score.categories.location = ValidationScore.BASIC;
    } else {
      score.categories.location = ValidationScore.EXCELLENT;
    }
  } else {
    errors.location = 'Service location is required';
    score.categories.location = ValidationScore.WEAK;
  }

  // Duration Validation
  if (data.duration) {
    const durationValidation = validateField('duration', data.duration.toString(), ValidationRules.SERVICE.DURATION);
    if (!durationValidation.isValid) {
      errors.duration = durationValidation.message;
    }
  }

  // Image/Portfolio Validation with Ethiopian Context
  if (data.images && Array.isArray(data.images)) {
    if (data.images.length === 0 && !isEdit) {
      warnings.images = 'Adding photos of your work can increase bookings by up to 50% in Ethiopia';
      score.categories.images = ValidationScore.WEAK;
    } else if (data.images.length >= 5) {
      score.categories.images = ValidationScore.EXCELLENT;
    } else if (data.images.length >= 3) {
      score.categories.images = ValidationScore.STRONG;
    } else if (data.images.length >= 1) {
      score.categories.images = ValidationScore.GOOD;
    }
  } else if (!isEdit) {
    warnings.images = 'Consider adding photos to build trust with Ethiopian clients';
    score.categories.images = ValidationScore.WEAK;
  }

  // Calculate Overall Score
  const categoryScores = Object.values(score.categories);
  if (categoryScores.length > 0) {
    score.overall = Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    score,
    suggestions: generateServiceSuggestions(score, data)
  };
};

/**
 * Yachi Provider Profile Validation with Ethiopian Business Requirements
 * @param {Object} data - Provider profile data
 * @returns {Object} Validation result with verification progress
 */
export const validateProviderProfile = (data) => {
  const errors = {};
  const verification = {
    level: 'basic',
    progress: 0,
    requirements: [],
    score: 0
  };

  // Name Validation
  if (!data.name?.trim()) {
    errors.name = 'Full name is required';
  } else {
    const nameValidation = validateField('name', data.name, ValidationRules.PROVIDER.NAME);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.message;
    } else {
      verification.progress += 15;
      verification.requirements.push('Name Verified');
    }
  }

  // Email Validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else {
    const emailValidation = validateField('email', data.email, ValidationRules.PROVIDER.EMAIL);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message;
    } else {
      verification.progress += 15;
      verification.requirements.push('Email Verified');
    }
  }

  // Phone Validation - Ethiopian Format
  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else {
    const phoneValidation = validateField('phone', data.phone, ValidationRules.PROVIDER.PHONE);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.message;
    } else {
      verification.progress += 15;
      verification.requirements.push('Phone Verified');
    }
  }

  // TIN Number Validation (Ethiopian Tax Identification)
  if (data.tinNumber) {
    const tinValidation = validateField('tinNumber', data.tinNumber, ValidationRules.PROVIDER.TIN_NUMBER);
    if (!tinValidation.isValid) {
      errors.tinNumber = tinValidation.message;
    } else {
      verification.progress += 20;
      verification.level = 'verified';
      verification.requirements.push('TIN Number Verified');
    }
  }

  // Business License Validation
  if (data.businessLicense) {
    const licenseValidation = validateField('businessLicense', data.businessLicense, ValidationRules.PROVIDER.BUSINESS_LICENSE);
    if (!licenseValidation.isValid) {
      errors.businessLicense = licenseValidation.message;
    } else {
      verification.progress += 20;
      verification.level = 'premium';
      verification.requirements.push('Business License Verified');
    }
  }

  // Skills Validation for Ethiopian Market
  if (!data.skills || data.skills.length === 0) {
    errors.skills = 'Please select at least one skill category';
  } else {
    verification.progress += 10;
    if (data.skills.length >= 3) {
      verification.requirements.push('Multiple Skills Listed');
    }
  }

  // Experience Validation
  if (data.experience) {
    if (data.experience < 0) {
      errors.experience = 'Experience cannot be negative';
    } else {
      verification.progress += 5;
      if (data.experience >= 3) {
        verification.requirements.push('3+ Years Experience');
      }
      if (data.experience >= 5) {
        verification.requirements.push('5+ Years Experience');
      }
    }
  }

  // Portfolio Validation
  if (data.portfolio && data.portfolio.length >= 3) {
    verification.progress += 10;
    verification.requirements.push('Portfolio with 3+ Projects');
    
    if (data.portfolio.length >= 10) {
      verification.requirements.push('Extensive Portfolio');
    }
  }

  // Calculate Verification Level
  if (verification.progress >= 90) {
    verification.level = 'premium';
  } else if (verification.progress >= 70) {
    verification.level = 'advanced';
  } else if (verification.progress >= 50) {
    verification.level = 'verified';
  }

  verification.score = verification.progress;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    verification
  };
};

/**
 * Yachi Construction Project Validation
 * @param {Object} data - Construction project data
 * @returns {Object} Validation result
 */
export const validateConstructionProject = (data) => {
  const errors = {};
  const requirements = [];
  const complexity = {
    level: 'simple',
    teamSize: 1,
    estimatedDuration: 0
  };

  // Project Name Validation
  if (!data.projectName?.trim()) {
    errors.projectName = 'Project name is required';
  } else {
    const nameValidation = validateField('projectName', data.projectName, ValidationRules.CONSTRUCTION.PROJECT_NAME);
    if (!nameValidation.isValid) {
      errors.projectName = nameValidation.message;
    }
  }

  // Square Area Validation with Team Sizing
  if (!data.squareArea || isNaN(parseFloat(data.squareArea))) {
    errors.squareArea = 'Square area is required';
  } else {
    const area = parseFloat(data.squareArea);
    const areaValidation = validateField('squareArea', area.toString(), ValidationRules.CONSTRUCTION.SQUARE_AREA);
    if (!areaValidation.isValid) {
      errors.squareArea = areaValidation.message;
    } else {
      // Calculate team size based on area (Ethiopian construction standards)
      if (area <= 50) {
        complexity.teamSize = 2;
        complexity.level = 'small';
      } else if (area <= 200) {
        complexity.teamSize = 4;
        complexity.level = 'medium';
      } else if (area <= 500) {
        complexity.teamSize = 8;
        complexity.level = 'large';
      } else {
        complexity.teamSize = 12;
        complexity.level = 'commercial';
      }
    }
  }

  // Floor Count Validation
  if (!data.floorCount || isNaN(parseInt(data.floorCount))) {
    errors.floorCount = 'Floor count is required';
  } else {
    const floors = parseInt(data.floorCount);
    const floorValidation = validateField('floorCount', floors.toString(), ValidationRules.CONSTRUCTION.FLOOR_COUNT);
    if (!floorValidation.isValid) {
      errors.floorCount = floorValidation.message;
    } else {
      // Adjust complexity based on floors
      if (floors > 3) {
        complexity.level = 'high-rise';
        complexity.teamSize = Math.max(complexity.teamSize, 10);
      }
    }
  }

  // Budget Validation
  if (!data.budget || isNaN(parseFloat(data.budget))) {
    errors.budget = 'Budget is required';
  } else {
    const budget = parseFloat(data.budget);
    const budgetValidation = validateField('budget', budget.toString(), ValidationRules.CONSTRUCTION.BUDGET);
    if (!budgetValidation.isValid) {
      errors.budget = budgetValidation.message;
    }
  }

  // Timeline Validation with Duration Estimation
  if (data.timeline) {
    const timeline = parseInt(data.timeline);
    const timelineValidation = validateField('timeline', timeline.toString(), ValidationRules.CONSTRUCTION.TIMELINE);
    if (!timelineValidation.isValid) {
      errors.timeline = timelineValidation.message;
    } else {
      complexity.estimatedDuration = timeline;
    }
  }

  // Location Validation
  if (data.location) {
    const locationErrors = validateLocation(data.location);
    if (locationErrors.length > 0) {
      errors.location = locationErrors[0].message;
    }
  }

  // Special Requirements
  if (data.specialRequirements) {
    if (data.specialRequirements.length > 1000) {
      errors.specialRequirements = 'Special requirements must be less than 1000 characters';
    } else if (data.specialRequirements.length >= 100) {
      requirements.push('Detailed project requirements provided');
    }
  }

  // Ethiopian Construction Standards Check
  if (data.buildingType === 'residential' && data.floorCount > 4) {
    requirements.push('High-rise residential project - requires structural engineer');
  }

  if (data.budget > 1000000) {
    requirements.push('Large budget project - recommended to have project manager');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    requirements,
    complexity
  };
};

/**
 * Yachi Government Project Validation
 * @param {Object} data - Government project data
 * @returns {Object} Validation result
 */
export const validateGovernmentProject = (data) => {
  const errors = {};
  const compliance = {
    met: [],
    missing: [],
    level: 'basic'
  };

  // Project Code Validation
  if (!data.projectCode) {
    errors.projectCode = 'Government project code is required';
  } else {
    const codeValidation = validateField('projectCode', data.projectCode, ValidationRules.GOVERNMENT.PROJECT_CODE);
    if (!codeValidation.isValid) {
      errors.projectCode = codeValidation.message;
    } else {
      compliance.met.push('Valid Project Code');
    }
  }

  // Ministry Validation
  if (!data.ministry) {
    errors.ministry = 'Ministry is required';
  } else {
    const ministryValidation = validateField('ministry', data.ministry, ValidationRules.GOVERNMENT.MINISTRY);
    if (!ministryValidation.isValid) {
      errors.ministry = ministryValidation.message;
    } else {
      compliance.met.push('Ministry Assigned');
    }
  }

  // Tender Number Validation
  if (!data.tenderNumber) {
    errors.tenderNumber = 'Tender number is required';
  } else {
    const tenderValidation = validateField('tenderNumber', data.tenderNumber, ValidationRules.GOVERNMENT.TENDER_NUMBER);
    if (!tenderValidation.isValid) {
      errors.tenderNumber = tenderValidation.message;
    } else {
      compliance.met.push('Valid Tender Number');
    }
  }

  // Budget Validation for Government Projects
  if (!data.budget || isNaN(parseFloat(data.budget))) {
    errors.budget = 'Budget is required';
  } else {
    const budget = parseFloat(data.budget);
    const budgetValidation = validateField('budget', budget.toString(), ValidationRules.GOVERNMENT.BUDGET_RANGE);
    if (!budgetValidation.isValid) {
      errors.budget = budgetValidation.message;
    } else {
      compliance.met.push('Budget Within Range');
      
      // Set compliance level based on budget
      if (budget > 10000000) {
        compliance.level = 'high-value';
        compliance.missing.push('Environmental Impact Assessment');
        compliance.missing.push('Public Consultation Report');
      } else if (budget > 1000000) {
        compliance.level = 'medium-value';
        compliance.missing.push('Detailed Project Report');
      }
    }
  }

  // Timeline Validation
  if (!data.timeline) {
    errors.timeline = 'Project timeline is required';
  }

  // Location Validation
  if (!data.location) {
    errors.location = 'Project location is required';
  } else {
    const locationErrors = validateLocation(data.location);
    if (locationErrors.length > 0) {
      errors.location = locationErrors[0].message;
    }
  }

  // Compliance Requirements Check
  if (!data.environmentalAssessment && compliance.level === 'high-value') {
    compliance.missing.push('Environmental Impact Assessment');
  }

  if (!data.communityApproval && data.location?.region !== 'Addis Ababa') {
    compliance.missing.push('Community Approval Document');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    compliance
  };
};

/**
 * Yachi Payment Validation for Ethiopian Payment Methods
 * @param {Object} data - Payment data
 * @param {string} paymentMethod - Payment method (cbe_birr, telebirr, chapa)
 * @returns {Object} Validation result
 */
export const validatePayment = (data, paymentMethod) => {
  const errors = {};

  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Valid payment amount is required';
  } else {
    const amountValidation = validateField('amount', data.amount.toString(), ValidationRules.PAYMENT.AMOUNT);
    if (!amountValidation.isValid) {
      errors.amount = amountValidation.message;
    }
  }

  // Ethiopian Payment Method Specific Validation
  switch (paymentMethod) {
    case 'cbe_birr':
      if (!data.accountNumber) {
        errors.accountNumber = 'CBE Birr account number is required';
      } else {
        const accountValidation = validateField('accountNumber', data.accountNumber, ValidationRules.PAYMENT.CBE_BIRR.ACCOUNT_NUMBER);
        if (!accountValidation.isValid) {
          errors.accountNumber = accountValidation.message;
        }
      }
      
      if (!data.pin) {
        errors.pin = 'PIN is required';
      } else {
        const pinValidation = validateField('pin', data.pin, ValidationRules.PAYMENT.CBE_BIRR.PIN);
        if (!pinValidation.isValid) {
          errors.pin = pinValidation.message;
        }
      }
      break;
    
    case 'telebirr':
      if (!data.phone) {
        errors.phone = 'Phone number is required';
      } else {
        const phoneValidation = validateField('phone', data.phone, ValidationRules.PAYMENT.TELEBIRR.PHONE);
        if (!phoneValidation.isValid) {
          errors.phone = phoneValidation.message;
        }
      }
      
      if (!data.pin) {
        errors.pin = 'PIN is required';
      } else {
        const pinValidation = validateField('pin', data.pin, ValidationRules.PAYMENT.TELEBIRR.PIN);
        if (!pinValidation.isValid) {
          errors.pin = pinValidation.message;
        }
      }
      break;
    
    case 'chapa':
      if (!data.phone) {
        errors.phone = 'Phone number is required';
      } else {
        const phoneValidation = validateField('phone', data.phone, ValidationRules.PAYMENT.CHAPA.PHONE);
        if (!phoneValidation.isValid) {
          errors.phone = phoneValidation.message;
        }
      }
      
      if (!data.email) {
        errors.email = 'Email is required for Chapa';
      } else {
        const emailValidation = validateField('email', data.email, ValidationRules.PAYMENT.CHAPA.EMAIL);
        if (!emailValidation.isValid) {
          errors.email = emailValidation.message;
        }
      }
      break;
    
    default:
      errors.paymentMethod = 'Please select a valid payment method';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Yachi Location Validation for Ethiopian Addresses
 * @param {Object} location - Location data
 * @returns {Array} Validation errors
 */
export const validateLocation = (location) => {
  const errors = [];

  if (!location.address) {
    errors.push({ field: 'address', message: 'Address is required' });
  } else {
    const addressValidation = validateField('address', location.address, ValidationRules.LOCATION.ADDRESS);
    if (!addressValidation.isValid) {
      errors.push({ field: 'address', message: addressValidation.message });
    }
  }

  if (!location.city) {
    errors.push({ field: 'city', message: 'City is required' });
  } else {
    const cityValidation = validateField('city', location.city, ValidationRules.LOCATION.CITY);
    if (!cityValidation.isValid) {
      errors.push({ field: 'city', message: cityValidation.message });
    }
  }

  if (!location.subCity) {
    errors.push({ field: 'subCity', message: 'Sub-city is required' });
  } else {
    const subCityValidation = validateField('subCity', location.subCity, ValidationRules.LOCATION.SUB_CITY);
    if (!subCityValidation.isValid) {
      errors.push({ field: 'subCity', message: subCityValidation.message });
    }
  }

  if (location.landmark) {
    const landmarkValidation = validateField('landmark', location.landmark, ValidationRules.LOCATION.LANDMARK);
    if (!landmarkValidation.isValid) {
      errors.push({ field: 'landmark', message: landmarkValidation.message });
    }
  }

  return errors;
};

// Helper Functions
const generateServiceSuggestions = (score, data) => {
  const suggestions = [];

  if (score.categories.name <= ValidationScore.BASIC) {
    suggestions.push({
      type: 'name',
      message: 'Make your service name more descriptive and include Amharic for better reach',
      priority: 'high',
      action: 'Add Amharic translation to service name'
    });
  }

  if (score.categories.description <= ValidationScore.BASIC) {
    suggestions.push({
      type: 'description',
      message: 'Add detailed description in both English and Amharic to attract more clients',
      priority: 'high',
      action: 'Expand service description with bullet points'
    });
  }

  if (score.categories.price <= ValidationScore.BASIC) {
    suggestions.push({
      type: 'price',
      message: 'Research competitive pricing for Ethiopian market',
      priority: 'medium',
      action: 'Adjust price to match local market rates'
    });
  }

  if (score.categories.images <= ValidationScore.BASIC) {
    suggestions.push({
      type: 'images',
      message: 'Add photos of your work to build trust with Ethiopian clients',
      priority: 'medium',
      action: 'Upload portfolio images'
    });
  }

  if (!data.amharicDescription) {
    suggestions.push({
      type: 'localization',
      message: 'Add Amharic description to reach more local clients',
      priority: 'medium',
      action: 'Translate description to Amharic'
    });
  }

  return suggestions;
};

/**
 * Real-time field validation utility
 * @param {string} field - Field name
 * @param {string} value - Field value
 * @param {ValidationRule} rules - Validation rules
 * @returns {ValidationResult} Validation result
 */
export const validateField = (field, value, rules) => {
  if (!value && rules.required) {
    return { isValid: false, message: `${field} is required` };
  }

  if (value) {
    if (rules.min && value.length < rules.min) {
      return { isValid: false, message: `Minimum ${rules.min} characters required` };
    }

    if (rules.max && value.length > rules.max) {
      return { isValid: false, message: `Maximum ${rules.max} characters allowed` };
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return { isValid: false, message: rules.message || 'Invalid format' };
    }

    if (rules.custom) {
      const customResult = rules.custom(value);
      if (!customResult.isValid) {
        return customResult;
      }
    }
  }

  return { isValid: true, message: '' };
};

/**
 * Yachi Validation Utilities
 */
export const ValidationUtils = {
  /**
   * Sanitize input data for security
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .substring(0, 5000); // Increased limit for descriptions
  },

  /**
   * Format validation errors for display
   * @param {Object} errors - Validation errors
   * @returns {Array} Formatted errors
   */
  formatErrors: (errors) => {
    return Object.entries(errors).map(([field, message]) => ({
      field,
      message,
      type: 'error',
      timestamp: Date.now()
    }));
  },

  /**
   * Calculate form completion percentage
   * @param {Object} data - Form data
   * @param {Array} requiredFields - Required field names
   * @returns {number} Completion percentage
   */
  calculateCompletion: (data, requiredFields) => {
    const filledFields = requiredFields.filter(field => {
      const value = data[field];
      return value !== undefined && 
             value !== null && 
             value !== '' && 
             (!Array.isArray(value) || value.length > 0);
    }).length;

    return Math.round((filledFields / requiredFields.length) * 100);
  },

  /**
   * Validate Ethiopian phone number
   * @param {string} phone - Phone number
   * @returns {boolean} Whether valid
   */
  isValidEthiopianPhone: (phone) => {
    return ValidationRules.PROVIDER.PHONE.pattern.test(phone.replace(/\D/g, ''));
  },

  /**
   * Validate Ethiopian TIN number
   * @param {string} tin - TIN number
   * @returns {boolean} Whether valid
   */
  isValidTIN: (tin) => {
    return ValidationRules.PROVIDER.TIN_NUMBER.pattern.test(tin);
  },

  /**
   * Validate amount for Ethiopian market
   * @param {number} amount - Amount in ETB
   * @returns {boolean} Whether valid
   */
  isValidAmount: (amount) => {
    return amount >= 1 && amount <= 100000000; // 1 ETB to 100 million ETB
  }
};

// Export all validators
const validators = {
  validateServiceForm,
  validateProviderProfile,
  validateConstructionProject,
  validateGovernmentProject,
  validatePayment,
  validateLocation,
  validateField,
  ValidationRules,
  ValidationScore,
  ValidationUtils
};

export default validators;