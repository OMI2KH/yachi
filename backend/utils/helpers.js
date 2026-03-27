const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { format, formatDistance, formatRelative, subDays } = require('date-fns');
const { am } = require('date-fns/locale');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const {
  APP,
  ROLES,
  SERVICE_CATEGORIES,
  BOOKING_STATUS,
  PAYMENT_METHODS,
  CURRENCIES,
  ERROR_CODES,
  DEFAULTS
} = require('./constants');

// 🎯 STRING HELPERS
class StringHelpers {
  /**
   * Generate a random string of specified length
   */
  static generateRandomString(length = 10) {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Generate a unique identifier
   */
  static generateUniqueId(prefix = '') {
    return `${prefix}${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  }

  /**
   * Convert string to camelCase
   */
  static toCamelCase(str) {
    return str.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
  }

  /**
   * Convert string to snake_case
   */
  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert string to kebab-case
   */
  static toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Capitalize first letter of each word
   */
  static capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(str, length = 50) {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  }

  /**
   * Generate initials from name
   */
  static generateInitials(name) {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  /**
   * Mask sensitive information (emails, phone numbers)
   */
  static maskSensitiveInfo(str, type = 'email') {
    switch (type) {
      case 'email':
        const [local, domain] = str.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
      
      case 'phone':
        return str.slice(0, 4) + '***' + str.slice(-3);
      
      case 'fayda':
        return str.slice(0, 3) + '***' + str.slice(-3);
      
      default:
        return str.slice(0, 3) + '***' + str.slice(-3);
    }
  }

  /**
   * Generate a slug from string
   */
  static generateSlug(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Check if string contains Amharic characters
   */
  static containsAmharic(str) {
    return /[\u1200-\u137F]/.test(str);
  }

  /**
   * Normalize Ethiopian phone number
   */
  static normalizeEthiopianPhone(phone) {
    if (!phone) return null;
    
    // Remove any non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('0')) {
      return '+251' + cleaned.slice(1);
    } else if (cleaned.startsWith('251')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('+251')) {
      return cleaned;
    }
    
    return null;
  }
}

// 🎯 NUMBER HELPERS
class NumberHelpers {
  /**
   * Format currency for display
   */
  static formatCurrency(amount, currency = CURRENCIES.ETB) {
    const formatter = new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  }

  /**
   * Format number with commas
   */
  static formatNumber(number) {
    return new Intl.NumberFormat('en-ET').format(number);
  }

  /**
   * Calculate percentage
   */
  static calculatePercentage(value, total, decimals = 2) {
    if (total === 0) return 0;
    return Number(((value / total) * 100).toFixed(decimals));
  }

  /**
   * Round to specified decimal places
   */
  static roundToDecimal(number, decimals = 2) {
    return Number(Math.round(number + 'e' + decimals) + 'e-' + decimals);
  }

  /**
   * Generate random number in range
   */
  static randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * 
      Math.cos(this.degreesToRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate service price with commission
   */
  static calculateServicePrice(basePrice, commissionRate = 0.15) {
    const commission = basePrice * commissionRate;
    const total = basePrice + commission;
    
    return {
      basePrice: this.roundToDecimal(basePrice),
      commission: this.roundToDecimal(commission),
      total: this.roundToDecimal(total),
      commissionRate
    };
  }

  /**
   * Calculate average rating
   */
  static calculateAverageRating(ratings) {
    if (!ratings || ratings.length === 0) return 0;
    
    const sum = ratings.reduce((total, rating) => total + rating, 0);
    return this.roundToDecimal(sum / ratings.length, 1);
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 🎯 DATE AND TIME HELPERS
class DateHelpers {
  /**
   * Format date in Ethiopian locale
   */
  static formatDate(date, formatStr = 'PPP', locale = am) {
    return format(new Date(date), formatStr, { locale });
  }

  /**
   * Format relative time (e.g., "2 days ago")
   */
  static formatRelativeTime(date, baseDate = new Date(), locale = am) {
    return formatDistance(new Date(date), baseDate, { locale });
  }

  /**
   * Format date for database (ISO string)
   */
  static toDatabaseDate(date) {
    return new Date(date).toISOString();
  }

  /**
   * Get Ethiopian date (approximate)
   */
  static getEthiopianDate(date = new Date()) {
    const gregorianDate = new Date(date);
    const ethiopianYear = gregorianDate.getFullYear() - 8;
    
    // This is a simplified version - for production use a proper Ethiopian calendar library
    return {
      year: ethiopianYear,
      month: gregorianDate.getMonth() + 1, // Approximate
      day: gregorianDate.getDate(),
      dayOfWeek: gregorianDate.getDay()
    };
  }

  /**
   * Check if date is today
   */
  static isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    
    return today.toDateString() === checkDate.toDateString();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date) {
    return new Date(date) > new Date();
  }

  /**
   * Check if date is in the past
   */
  static isPast(date) {
    return new Date(date) < new Date();
  }

  /**
   * Add days to date
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Subtract days from date
   */
  static subtractDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /**
   * Calculate age from birth date
   */
  static calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Format business hours
   */
  static formatBusinessHours(hours) {
    if (!hours) return 'Not specified';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const formatted = days.map(day => {
      if (hours[day] && hours[day].open && hours[day].close) {
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours[day].open} - ${hours[day].close}`;
      }
      return null;
    }).filter(Boolean);
    
    return formatted.join(' | ');
  }

  /**
   * Generate time slots for booking
   */
  static generateTimeSlots(startTime = '08:00', endTime = '18:00', duration = 60) {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const time = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      slots.push(time);
      
      currentMinute += duration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }
    
    return slots;
  }
}

// 🎯 ARRAY AND OBJECT HELPERS
class CollectionHelpers {
  /**
   * Group array by key
   */
  static groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  /**
   * Sort array by key
   */
  static sortBy(array, key, order = 'asc') {
    return array.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  /**
   * Remove duplicates from array
   */
  static removeDuplicates(array, key = null) {
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    }
    return [...new Set(array)];
  }

  /**
   * Flatten nested array
   */
  static flatten(array) {
    return array.reduce((flat, item) => 
      flat.concat(Array.isArray(item) ? this.flatten(item) : item), []);
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Pick specific keys from object
   */
  static pick(object, keys) {
    return keys.reduce((result, key) => {
      if (object && Object.prototype.hasOwnProperty.call(object, key)) {
        result[key] = object[key];
      }
      return result;
    }, {});
  }

  /**
   * Omit specific keys from object
   */
  static omit(object, keys) {
    const result = { ...object };
    keys.forEach(key => delete result[key]);
    return result;
  }

  /**
   * Deep clone object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Merge objects deeply
   */
  static deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Convert object to query string
   */
  static objectToQueryString(obj) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    }
    
    return params.toString();
  }

  /**
   * Convert array to options for dropdown
   */
  static arrayToOptions(array, valueKey = 'id', labelKey = 'name') {
    return array.map(item => ({
      value: item[valueKey],
      label: item[labelKey]
    }));
  }
}

// 🎯 VALIDATION AND SANITIZATION HELPERS
class ValidationHelpers {
  /**
   * Check if value is empty
   */
  static isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Validate Ethiopian phone number
   */
  static isValidEthiopianPhone(phone) {
    if (!phone) return false;
    const pattern = /^(?:\+251|0)(9\d{8})$/;
    return pattern.test(phone);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    if (!email) return false;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(user, requiredRole) {
    if (!user || !user.role) return false;
    return user.role === requiredRole;
  }

  /**
   * Check if user has any of the required roles
   */
  static hasAnyRole(user, requiredRoles) {
    if (!user || !user.role) return false;
    return requiredRoles.includes(user.role);
  }

  /**
   * Validate coordinates
   */
  static isValidCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Validate file type
   */
  static isValidFileType(file, allowedTypes) {
    if (!file || !file.mimetype) return false;
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Validate file size
   */
  static isValidFileSize(file, maxSize) {
    if (!file || !file.size) return false;
    return file.size <= maxSize;
  }
}

// 🎯 BUSINESS LOGIC HELPERS
class BusinessHelpers {
  /**
   * Calculate provider rating stats
   */
  static calculateRatingStats(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        percentage: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;

    reviews.forEach(review => {
      distribution[review.rating]++;
      total += review.rating;
    });

    const average = NumberHelpers.roundToDecimal(total / reviews.length, 1);
    
    const percentage = {};
    for (let i = 1; i <= 5; i++) {
      percentage[i] = NumberHelpers.calculatePercentage(distribution[i], reviews.length);
    }

    return {
      average,
      total: reviews.length,
      distribution,
      percentage
    };
  }

  /**
   * Calculate completion rate
   */
  static calculateCompletionRate(completed, total) {
    if (total === 0) return 0;
    return NumberHelpers.calculatePercentage(completed, total);
  }

  /**
   * Calculate response rate
   */
  static calculateResponseRate(responded, total) {
    if (total === 0) return 0;
    return NumberHelpers.calculatePercentage(responded, total);
  }

  /**
   * Generate service recommendations based on user behavior
   */
  static generateServiceRecommendations(user, services, limit = 10) {
    // Simple recommendation algorithm - can be enhanced with ML
    const recommendations = services.filter(service => {
      // Filter by location if available
      if (user.location && service.location) {
        const distance = NumberHelpers.calculateDistance(
          user.location.latitude,
          user.location.longitude,
          service.location.latitude,
          service.location.longitude
        );
        
        if (distance > 50) return false; // Within 50km
      }

      // Filter by user preferences
      if (user.preferences && user.preferences.categories) {
        if (!user.preferences.categories.includes(service.category)) {
          return false;
        }
      }

      return true;
    });

    // Sort by rating and proximity
    return CollectionHelpers.sortBy(recommendations, 'rating', 'desc')
      .slice(0, limit);
  }

  /**
   * Calculate booking availability
   */
  static calculateAvailability(schedule, bookings, date) {
    const availableSlots = [];
    const dayOfWeek = new Date(date).getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    
    if (!schedule[dayName] || !schedule[dayName].open) {
      return availableSlots;
    }

    const timeSlots = DateHelpers.generateTimeSlots(
      schedule[dayName].open,
      schedule[dayName].close,
      60
    );

    const bookedSlots = bookings
      .filter(booking => 
        new Date(booking.scheduledDate).toDateString() === new Date(date).toDateString()
      )
      .map(booking => {
        const bookingDate = new Date(booking.scheduledDate);
        return `${String(bookingDate.getHours()).padStart(2, '0')}:${String(bookingDate.getMinutes()).padStart(2, '0')}`;
      });

    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  }

  /**
   * Generate invoice number
   */
  static generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = StringHelpers.generateRandomString(4).toUpperCase();
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Calculate service provider earnings
   */
  static calculateEarnings(transactions, period = 'month') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = DateHelpers.subtractDays(now, 1);
        break;
      case 'week':
        startDate = DateHelpers.subtractDays(now, 7);
        break;
      case 'month':
        startDate = DateHelpers.subtractDays(now, 30);
        break;
      case 'year':
        startDate = DateHelpers.subtractDays(now, 365);
        break;
      default:
        startDate = DateHelpers.subtractDays(now, 30);
    }

    const periodTransactions = transactions.filter(t => 
      new Date(t.createdAt) >= startDate
    );

    const total = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
    const completed = periodTransactions.filter(t => t.status === 'completed').length;
    const average = completed > 0 ? total / completed : 0;

    return {
      total: NumberHelpers.roundToDecimal(total),
      completed,
      average: NumberHelpers.roundToDecimal(average),
      currency: CURRENCIES.ETB
    };
  }
}

// 🎯 SECURITY AND CRYPTO HELPERS
class SecurityHelpers {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate OTP code
   */
  static generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    
    return otp;
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(text, key = process.env.ENCRYPTION_KEY) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate API key
   */
  static generateApiKey() {
    const prefix = 'yachi';
    const random = crypto.randomBytes(20).toString('hex');
    return `${prefix}_${random}`;
  }

  /**
   * Sanitize user input for security
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#x60;');
  }
}

// 🎯 EXPORT ALL HELPERS
module.exports = {
  StringHelpers,
  NumberHelpers,
  DateHelpers,
  CollectionHelpers,
  ValidationHelpers,
  BusinessHelpers,
  SecurityHelpers
};

// Convenience named exports for tests and small callers
module.exports.generateRandomString = StringHelpers.generateRandomString;
module.exports.calculatePercentage = NumberHelpers.calculatePercentage;
module.exports.roundToDecimal = NumberHelpers.roundToDecimal;
module.exports.timeDifference = function(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diffHours = (e - s) / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100;
};