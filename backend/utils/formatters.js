const { format, formatDistance, formatRelative, isToday, isYesterday, isThisWeek, isThisYear } = require('date-fns');
const { am, enUS } = require('date-fns/locale');
const { CURRENCIES, SERVICE_CATEGORIES, BOOKING_STATUS, PAYMENT_METHODS, ROLES } = require('./constants');

// 🎯 DATE AND TIME FORMATTERS
class DateFormatters {
  /**
   * Format date in Ethiopian preferred format
   */
  static formatEthiopianDate(date, options = {}) {
    const {
      includeTime = false,
      relative = false,
      locale = 'am'
    } = options;

    const dateObj = new Date(date);
    const selectedLocale = locale === 'am' ? am : enUS;

    if (relative) {
      return formatDistance(dateObj, new Date(), {
        addSuffix: true,
        locale: selectedLocale
      });
    }

    if (isToday(dateObj)) {
      return includeTime 
        ? `Today at ${format(dateObj, 'h:mm a', { locale: selectedLocale })}`
        : 'Today';
    }

    if (isYesterday(dateObj)) {
      return includeTime
        ? `Yesterday at ${format(dateObj, 'h:mm a', { locale: selectedLocale })}`
        : 'Yesterday';
    }

    if (isThisWeek(dateObj)) {
      return format(dateObj, 'EEEE', { locale: selectedLocale });
    }

    if (isThisYear(dateObj)) {
      return includeTime
        ? format(dateObj, 'MMM d, h:mm a', { locale: selectedLocale })
        : format(dateObj, 'MMM d', { locale: selectedLocale });
    }

    return includeTime
      ? format(dateObj, 'MMM d, yyyy, h:mm a', { locale: selectedLocale })
      : format(dateObj, 'MMM d, yyyy', { locale: selectedLocale });
  }

  /**
   * Format date for forms and inputs
   */
  static formatDateForInput(date) {
    if (!date) return '';
    return format(new Date(date), 'yyyy-MM-dd');
  }

  /**
   * Format time for forms and inputs
   */
  static formatTimeForInput(date) {
    if (!date) return '';
    return format(new Date(date), 'HH:mm');
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date, options = {}) {
    const {
      showSeconds = false,
      timezone = 'EAT',
      locale = 'am'
    } = options;

    const dateObj = new Date(date);
    const selectedLocale = locale === 'am' ? am : enUS;
    const timeFormat = showSeconds ? 'h:mm:ss a' : 'h:mm a';

    return format(dateObj, `EEE, MMM d, yyyy 'at' ${timeFormat} (${timezone})`, {
      locale: selectedLocale
    });
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  }

  /**
   * Format business hours for display
   */
  static formatBusinessHours(hours) {
    if (!hours) return 'Not specified';

    const days = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };

    const formattedHours = Object.entries(days)
      .map(([day, shortDay]) => {
        if (hours[day] && hours[day].open && hours[day].close) {
          return `${shortDay}: ${hours[day].open} - ${hours[day].close}`;
        }
        return `${shortDay}: Closed`;
      })
      .join(' | ');

    return formattedHours;
  }

  /**
   * Format relative time for notifications
   */
  static formatRelativeTime(date, locale = 'am') {
    const dateObj = new Date(date);
    const now = new Date();
    const diffInMinutes = Math.floor((now - dateObj) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hr ago`;
    }

    return this.formatEthiopianDate(date, { locale });
  }
}

// 🎯 CURRENCY AND NUMBER FORMATTERS
class CurrencyFormatters {
  /**
   * Format currency for Ethiopian market
   */
  static formatCurrency(amount, currency = CURRENCIES.ETB, options = {}) {
    const {
      showSymbol = true,
      compact = false,
      decimals = 2,
      locale = 'en-ET'
    } = options;

    if (amount === null || amount === undefined) {
      return '—';
    }

    const numericAmount = Number(amount);

    if (compact && numericAmount >= 1000) {
      return this.formatCompactCurrency(numericAmount, currency, options);
    }

    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      currencyDisplay: 'symbol'
    });

    return formatter.format(numericAmount);
  }

  /**
   * Format currency in compact form (K, M, B)
   */
  static formatCompactCurrency(amount, currency = CURRENCIES.ETB, options = {}) {
    const { decimals = 1, locale = 'en-ET' } = options;
    
    const numericAmount = Number(amount);
    const ranges = [
      { divider: 1e9, suffix: 'B' },
      { divider: 1e6, suffix: 'M' },
      { divider: 1e3, suffix: 'K' }
    ];

    const range = ranges.find(r => numericAmount >= r.divider);
    
    if (range) {
      const formatted = (numericAmount / range.divider).toFixed(decimals);
      return `${formatted}${range.suffix} ${currency}`;
    }

    return this.formatCurrency(numericAmount, currency, { ...options, showSymbol: false }) + ` ${currency}`;
  }

  /**
   * Format percentage
   */
  static formatPercentage(value, total = 100, options = {}) {
    const { decimals = 1, showSymbol = true } = options;
    
    if (total === 0) return '0%';
    
    const percentage = (value / total) * 100;
    const formatted = percentage.toFixed(decimals);
    
    return showSymbol ? `${formatted}%` : formatted;
  }

  /**
   * Format number with Ethiopian formatting
   */
  static formatNumber(number, options = {}) {
    const { decimals = 0, compact = false, locale = 'en-ET' } = options;

    if (number === null || number === undefined) {
      return '—';
    }

    const numericValue = Number(number);

    if (compact && numericValue >= 1000) {
      return this.formatCompactNumber(numericValue, options);
    }

    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return formatter.format(numericValue);
  }

  /**
   * Format number in compact form
   */
  static formatCompactNumber(number, options = {}) {
    const { decimals = 1, locale = 'en-ET' } = options;
    
    const numericValue = Number(number);
    const ranges = [
      { divider: 1e9, suffix: 'B' },
      { divider: 1e6, suffix: 'M' },
      { divider: 1e3, suffix: 'K' }
    ];

    const range = ranges.find(r => numericValue >= r.divider);
    
    if (range) {
      const formatted = (numericValue / range.divider).toFixed(decimals);
      return formatted + range.suffix;
    }

    return this.formatNumber(numericValue, options);
  }

  /**
   * Format price range for services
   */
  static formatPriceRange(minPrice, maxPrice, currency = CURRENCIES.ETB) {
    if (!minPrice && !maxPrice) return 'Price varies';
    
    if (!maxPrice) {
      return `From ${this.formatCurrency(minPrice, currency)}`;
    }

    if (!minPrice) {
      return `Up to ${this.formatCurrency(maxPrice, currency)}`;
    }

    if (minPrice === maxPrice) {
      return this.formatCurrency(minPrice, currency);
    }

    return `${this.formatCurrency(minPrice, currency)} - ${this.formatCurrency(maxPrice, currency)}`;
  }

  /**
   * Format salary or hourly rate
   */
  static formatRate(amount, period = 'hour', currency = CURRENCIES.ETB) {
    const formattedAmount = this.formatCurrency(amount, currency);
    
    const periodMap = {
      hour: '/hr',
      day: '/day',
      week: '/week',
      month: '/month',
      project: 'fixed price'
    };

    return `${formattedAmount} ${periodMap[period] || '/unit'}`;
  }
}

// 🎯 TEXT AND CONTENT FORMATTERS
class TextFormatters {
  /**
   * Format user name for display
   */
  static formatUserName(user, options = {}) {
    const { format = 'full', fallback = 'User' } = options;
    
    if (!user) return fallback;

    const { firstName, lastName, username, email } = user;

    if (format === 'full' && firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    if (format === 'first' && firstName) {
      return firstName;
    }

    if (format === 'initial' && firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    if (username) {
      return username;
    }

    if (email) {
      return email.split('@')[0];
    }

    return fallback;
  }

  /**
   * Format service title with category
   */
  static formatServiceTitle(service, options = {}) {
    const { includeCategory = true, maxLength = 60 } = options;
    
    let title = service.title || 'Untitled Service';
    
    if (includeCategory && service.category) {
      const categoryInfo = SERVICE_CATEGORIES[service.category];
      if (categoryInfo) {
        title += ` · ${categoryInfo.name}`;
      }
    }

    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }

    return title;
  }

  /**
   * Format address for display
   */
  static formatAddress(address, options = {}) {
    if (!address) return 'Location not specified';

    const {
      includeCountry = false,
      singleLine = false,
      includeCoordinates = false
    } = options;

    const parts = [];

    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (includeCountry && address.country) parts.push(address.country);
    if (address.postalCode) parts.push(address.postalCode);

    let formatted = singleLine ? parts.join(', ') : parts.join('\n');

    if (includeCoordinates && address.coordinates) {
      const coords = `(${address.coordinates.latitude.toFixed(4)}, ${address.coordinates.longitude.toFixed(4)})`;
      formatted = singleLine 
        ? `${formatted} ${coords}`
        : `${formatted}\n${coords}`;
    }

    return formatted;
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phone, options = {}) {
    if (!phone) return '—';

    const { format = 'international', mask = false } = options;
    // Normalize phone number (remove non-digits except leading +)
    let normalized = String(phone).trim().replace(/[^\d+]/g, '');

    // Convert common local Kenyan format starting with 0 to E.164 +254
    if (!normalized.startsWith('+') && normalized.startsWith('0')) {
      // e.g. 0712345678 -> +254712345678
      normalized = '+254' + normalized.slice(1);
    }

    // If number looks like missing leading zero (9 digits), assume local and prefix +254
    const digitsOnly = normalized.replace(/[^\d]/g, '');
    if (!normalized.startsWith('+') && digitsOnly.length === 9) {
      normalized = '+254' + digitsOnly;
    }

    // If already a local variant without plus but with country code like 2547..., add +
    if (!normalized.startsWith('+') && normalized.startsWith('254')) {
      normalized = '+' + normalized;
    }

    if (mask) {
      return normalized.slice(0, 4) + '******' + normalized.slice(-3);
    }

    // Default: return E.164-style number without spacing
    return normalized;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes, options = {}) {
    if (bytes === 0) return '0 Bytes';

    const { decimals = 2 } = options;
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  /**
   * Format description with proper line breaks and truncation
   */
  static formatDescription(text, options = {}) {
    const { 
      maxLength = 500, 
      preserveLineBreaks = true,
      allowHtml = false 
    } = options;

    if (!text) return '';

    let formatted = text;

    // Remove HTML tags if not allowed
    if (!allowHtml) {
      formatted = formatted.replace(/<[^>]*>/g, '');
    }

    // Preserve line breaks
    if (preserveLineBreaks) {
      formatted = formatted.replace(/\n/g, '<br>');
    }

    // Truncate if needed
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 3) + '...';
    }

    return formatted;
  }

  /**
   * Format tags for display
   */
  static formatTags(tags, options = {}) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return '';
    }

    const { 
      maxDisplay = 5, 
      separator = ', ',
      showCount = false 
    } = options;

    const displayTags = tags.slice(0, maxDisplay);
    let formatted = displayTags.map(tag => `#${tag}`).join(separator);

    if (showCount && tags.length > maxDisplay) {
      formatted += ` +${tags.length - maxDisplay} more`;
    }

    return formatted;
  }
}

// 🎯 STATUS AND BADGE FORMATTERS
class StatusFormatters {
  /**
   * Format booking status with colors and icons
   */
  static formatBookingStatus(status, options = {}) {
    const { format = 'text', includeIcon = false } = options;

    const statusConfig = {
      [BOOKING_STATUS.PENDING]: {
        text: 'Pending',
        color: 'orange',
        icon: '⏳',
        badge: 'warning'
      },
      [BOOKING_STATUS.CONFIRMED]: {
        text: 'Confirmed',
        color: 'blue',
        icon: '✅',
        badge: 'info'
      },
      [BOOKING_STATUS.IN_PROGRESS]: {
        text: 'In Progress',
        color: 'purple',
        icon: '🛠️',
        badge: 'primary'
      },
      [BOOKING_STATUS.COMPLETED]: {
        text: 'Completed',
        color: 'green',
        icon: '🎉',
        badge: 'success'
      },
      [BOOKING_STATUS.CANCELLED]: {
        text: 'Cancelled',
        color: 'red',
        icon: '❌',
        badge: 'error'
      },
      [BOOKING_STATUS.EXPIRED]: {
        text: 'Expired',
        color: 'gray',
        icon: '⏰',
        badge: 'default'
      },
      [BOOKING_STATUS.DISPUTED]: {
        text: 'Disputed',
        color: 'red',
        icon: '⚖️',
        badge: 'error'
      }
    };

    const config = statusConfig[status] || {
      text: 'Unknown',
      color: 'gray',
      icon: '❓',
      badge: 'default'
    };

    switch (format) {
      case 'badge':
        return {
          text: config.text,
          variant: config.badge,
          icon: includeIcon ? config.icon : null
        };
      
      case 'full':
        return includeIcon ? `${config.icon} ${config.text}` : config.text;
      
      case 'text':
      default:
        return config.text;
    }
  }

  /**
   * Format payment status
   */
  static formatPaymentStatus(status, options = {}) {
    const { format = 'text', includeIcon = false } = options;

    const statusConfig = {
      pending: { text: 'Pending', color: 'orange', icon: '⏳', badge: 'warning' },
      processing: { text: 'Processing', color: 'blue', icon: '🔄', badge: 'info' },
      completed: { text: 'Completed', color: 'green', icon: '✅', badge: 'success' },
      failed: { text: 'Failed', color: 'red', icon: '❌', badge: 'error' },
      refunded: { text: 'Refunded', color: 'purple', icon: '💸', badge: 'info' },
      cancelled: { text: 'Cancelled', color: 'gray', icon: '🚫', badge: 'default' }
    };

    const config = statusConfig[status] || {
      text: 'Unknown',
      color: 'gray',
      icon: '❓',
      badge: 'default'
    };

    switch (format) {
      case 'badge':
        return {
          text: config.text,
          variant: config.badge,
          icon: includeIcon ? config.icon : null
        };
      
      case 'full':
        return includeIcon ? `${config.icon} ${config.text}` : config.text;
      
      default:
        return config.text;
    }
  }

  /**
   * Format user role
   */
  static formatUserRole(role, options = {}) {
    const { format = 'text', includeIcon = false } = options;

    const roleConfig = {
      [ROLES.CLIENT]: { text: 'Client', color: 'blue', icon: '👤', badge: 'info' },
      [ROLES.PROVIDER]: { text: 'Service Provider', color: 'green', icon: '🛠️', badge: 'success' },
      [ROLES.GRADUATE]: { text: 'Graduate', color: 'purple', icon: '🎓', badge: 'primary' },
      [ROLES.ADMIN]: { text: 'Admin', color: 'red', icon: '⚡', badge: 'error' },
      [ROLES.SUPER_ADMIN]: { text: 'Super Admin', color: 'red', icon: '👑', badge: 'error' },
      [ROLES.MODERATOR]: { text: 'Moderator', color: 'orange', icon: '🛡️', badge: 'warning' }
    };

    const config = roleConfig[role] || {
      text: 'Unknown',
      color: 'gray',
      icon: '❓',
      badge: 'default'
    };

    switch (format) {
      case 'badge':
        return {
          text: config.text,
          variant: config.badge,
          icon: includeIcon ? config.icon : null
        };
      
      case 'full':
        return includeIcon ? `${config.icon} ${config.text}` : config.text;
      
      default:
        return config.text;
    }
  }

  /**
   * Format verification status
   */
  static formatVerificationStatus(status, options = {}) {
    const { format = 'text', includeIcon = false } = options;

    const statusConfig = {
      pending: { text: 'Pending Review', color: 'orange', icon: '⏳', badge: 'warning' },
      in_review: { text: 'In Review', color: 'blue', icon: '🔍', badge: 'info' },
      verified: { text: 'Verified', color: 'green', icon: '✅', badge: 'success' },
      rejected: { text: 'Rejected', color: 'red', icon: '❌', badge: 'error' },
      expired: { text: 'Expired', color: 'gray', icon: '⏰', badge: 'default' }
    };

    const config = statusConfig[status] || {
      text: 'Unknown',
      color: 'gray',
      icon: '❓',
      badge: 'default'
    };

    switch (format) {
      case 'badge':
        return {
          text: config.text,
          variant: config.badge,
          icon: includeIcon ? config.icon : null
        };
      
      case 'full':
        return includeIcon ? `${config.icon} ${config.text}` : config.text;
      
      default:
        return config.text;
    }
  }

  /**
   * Format rating with stars
   */
  static formatRating(rating, options = {}) {
    const { 
      showNumber = true, 
      maxStars = 5,
      showEmpty = false 
    } = options;

    const numericRating = Number(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '½';
    if (showEmpty) stars += '☆'.repeat(emptyStars);

    if (showNumber) {
      return `${stars} (${numericRating.toFixed(1)})`;
    }

    return stars;
  }
}

// 🎯 DATA TRANSFORMATION FORMATTERS
class DataFormatters {
  /**
   * Format service data for cards
   */
  static formatServiceForCard(service, options = {}) {
    const {
      includeProvider = true,
      includeStats = true,
      truncateDescription = true
    } = options;

    const formatted = {
      id: service.id,
      title: TextFormatters.formatServiceTitle(service, { includeCategory: false }),
      description: truncateDescription 
        ? TextFormatters.formatDescription(service.description, { maxLength: 120 })
        : service.description,
      price: CurrencyFormatters.formatCurrency(service.price, service.currency),
      category: service.category,
      categoryName: SERVICE_CATEGORIES[service.category]?.name || service.category,
      image: service.images?.[0] || '/images/service-placeholder.jpg',
      tags: TextFormatters.formatTags(service.tags, { maxDisplay: 3 }),
      location: service.location ? TextFormatters.formatAddress(service.location, { singleLine: true }) : null
    };

    if (includeProvider && service.provider) {
      formatted.provider = {
        id: service.provider.id,
        name: TextFormatters.formatUserName(service.provider),
        avatar: service.provider.avatar,
        rating: service.provider.rating,
        verified: service.provider.verified
      };
    }

    if (includeStats) {
      formatted.stats = {
        rating: service.rating || 0,
        reviewCount: service.reviewCount || 0,
        completedBookings: service.completedBookings || 0,
        responseRate: service.responseRate || 0
      };
    }

    return formatted;
  }

  /**
   * Format user data for profiles
   */
  static formatUserForProfile(user, options = {}) {
    const {
      includeStats = true,
      includeServices = false,
      includeReviews = false,
      publicProfile = false
    } = options;

    const formatted = {
      id: user.id,
      name: TextFormatters.formatUserName(user, { format: 'full' }),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: publicProfile ? TextFormatters.formatPhoneNumber(user.email, { mask: true }) : user.email,
      phone: publicProfile ? TextFormatters.formatPhoneNumber(user.phone, { mask: true }) : user.phone,
      avatar: user.avatar,
      coverImage: user.coverImage,
      bio: user.bio,
      role: StatusFormatters.formatUserRole(user.role),
      joinedDate: DateFormatters.formatEthiopianDate(user.createdAt),
      location: user.location ? TextFormatters.formatAddress(user.location, { singleLine: true }) : null,
      verification: {
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        faydaVerified: user.faydaVerified,
        documentVerified: user.documentVerified,
        overallStatus: user.verificationStatus
      }
    };

    if (includeStats) {
      formatted.stats = {
        totalServices: user.serviceCount || 0,
        totalBookings: user.bookingCount || 0,
        completedBookings: user.completedBookings || 0,
        rating: user.rating || 0,
        responseRate: user.responseRate || 0,
        memberSince: DateFormatters.formatRelativeTime(user.createdAt)
      };
    }

    if (includeServices && user.services) {
      formatted.services = user.services.map(service =>
        this.formatServiceForCard(service, { includeProvider: false, includeStats: false })
      );
    }

    if (includeReviews && user.reviews) {
      formatted.reviews = user.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        author: TextFormatters.formatUserName(review.author),
        date: DateFormatters.formatEthiopianDate(review.createdAt),
        service: review.service ? TextFormatters.formatServiceTitle(review.service) : null
      }));
    }

    return formatted;
  }

  /**
   * Format booking data for display
   */
  static formatBookingForDisplay(booking, options = {}) {
    const {
      includeService = true,
      includeClient = true,
      includeProvider = true,
      includeTimeline = true
    } = options;

    const formatted = {
      id: booking.id,
      status: StatusFormatters.formatBookingStatus(booking.status, { format: 'full', includeIcon: true }),
      statusBadge: StatusFormatters.formatBookingStatus(booking.status, { format: 'badge', includeIcon: true }),
      amount: CurrencyFormatters.formatCurrency(booking.amount, booking.currency),
      scheduledDate: DateFormatters.formatDateTime(booking.scheduledDate),
      duration: DateFormatters.formatDuration(booking.duration),
      location: booking.location ? TextFormatters.formatAddress(booking.location, { singleLine: true }) : null,
      specialRequests: booking.specialRequests,
      createdAt: DateFormatters.formatRelativeTime(booking.createdAt)
    };

    if (includeService && booking.service) {
      formatted.service = {
        id: booking.service.id,
        title: TextFormatters.formatServiceTitle(booking.service),
        category: booking.service.category,
        image: booking.service.images?.[0]
      };
    }

    if (includeClient && booking.client) {
      formatted.client = {
        id: booking.client.id,
        name: TextFormatters.formatUserName(booking.client),
        phone: TextFormatters.formatPhoneNumber(booking.client.phone),
        avatar: booking.client.avatar
      };
    }

    if (includeProvider && booking.provider) {
      formatted.provider = {
        id: booking.provider.id,
        name: TextFormatters.formatUserName(booking.provider),
        phone: TextFormatters.formatPhoneNumber(booking.provider.phone),
        avatar: booking.provider.avatar,
        rating: booking.provider.rating
      };
    }

    if (includeTimeline && booking.timeline) {
      formatted.timeline = booking.timeline.map(event => ({
        status: event.status,
        description: StatusFormatters.formatBookingStatus(event.status, { format: 'full' }),
        date: DateFormatters.formatDateTime(event.timestamp),
        relativeTime: DateFormatters.formatRelativeTime(event.timestamp)
      }));
    }

    return formatted;
  }

  /**
   * Format analytics data for charts
   */
  static formatAnalyticsData(data, type = 'line', options = {}) {
    const { 
      dateFormat = 'MMM dd',
      currency = CURRENCIES.ETB,
      compact = false 
    } = options;

    switch (type) {
      case 'line':
      case 'bar':
        return data.map(item => ({
          label: DateFormatters.formatEthiopianDate(item.date, { includeTime: false }),
          value: item.value,
          formattedValue: compact 
            ? CurrencyFormatters.formatCompactCurrency(item.value, currency)
            : CurrencyFormatters.formatCurrency(item.value, currency, { showSymbol: false })
        }));

      case 'pie':
      case 'doughnut':
        return data.map(item => ({
          label: item.label,
          value: item.value,
          formattedValue: CurrencyFormatters.formatCurrency(item.value, currency),
          percentage: CurrencyFormatters.formatPercentage(item.value, data.reduce((sum, d) => sum + d.value, 0))
        }));

      default:
        return data;
    }
  }
}

// 🎯 EXPORT ALL FORMATTERS
module.exports = {
  DateFormatters,
  CurrencyFormatters,
  TextFormatters,
  StatusFormatters,
  DataFormatters
};

// Convenience named exports used by tests
module.exports.formatPhoneNumber = TextFormatters.formatPhoneNumber;
module.exports.slugify = function(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[\W_]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
};
module.exports.formatDate = DateFormatters.formatDateForInput;
module.exports.formatCurrency = function(amount) {
  if (amount === null || amount === undefined) return '—';
  const numeric = Number(amount);
  const hasDecimals = Math.floor(numeric) !== numeric;
  const opts = hasDecimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {};
  const formatted = new Intl.NumberFormat('en-KE', opts).format(numeric);
  return `KSh ${formatted}`;
};

// Improve slugify to remove punctuation like dots and ampersands
module.exports.slugify = function(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[.&]+/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
};