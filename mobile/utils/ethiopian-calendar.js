/**
 * @file Ethiopian Calendar Utilities
 * @description Enterprise-level Ethiopian calendar and date handling utilities
 * @version 1.0.0
 * @module utils/ethiopian-calendar
 */

/**
 * @typedef {Object} EthiopianDate
 * @property {number} year - Ethiopian year
 * @property {number} month - Ethiopian month (1-13)
 * @property {number} day - Ethiopian day (1-30)
 * @property {number} [weekday] - Weekday number (1-7, 1=Ehud)
 * @property {string} [monthName] - Amharic month name
 * @property {string} [weekdayName] - Amharic weekday name
 * @property {boolean} [isLeapYear] - Whether it's a leap year
 */

/**
 * @typedef {Object} GregorianDate
 * @property {number} year - Gregorian year
 * @property {number} month - Gregorian month (1-12)
 * @property {number} day - Gregorian day (1-31)
 */

/**
 * @typedef {Object} EthiopianHoliday
 * @property {string} id - Holiday identifier
 * @property {string} name - Holiday name in English
 * @property {string} nameAmharic - Holiday name in Amharic
 * @property {EthiopianDate} ethiopianDate - Fixed Ethiopian date
 * @property {string} type - Holiday type (religious, national, cultural)
 * @property {boolean} isPublicHoliday - Whether it's a public holiday
 * @property {string} [description] - Holiday description
 * @property {string} [region] - Specific region if applicable
 */

/**
 * @typedef {Object} BusinessHours
 * @property {string} day - Day of week (monday, tuesday, etc.)
 * @property {string} dayAmharic - Day in Amharic
 * @property {string} openingTime - Opening time (HH:MM)
 * @property {string} closingTime - Closing time (HH:MM)
 * @property {boolean} isOpen - Whether business is open this day
 * @property {string} [breakStart] - Break start time
 * @property {string} [breakEnd] - Break end time
 */

class EthiopianCalendar {
  constructor() {
    this.ETHIOPIAN_YEAR_OFFSET = 8;
    this.ETHIOPIAN_LEAP_YEAR_OFFSET = 26;
    this.MILLENNIUM_START = 2000;
    
    // Amharic month names
    this.MONTH_NAMES = {
      1: 'መስከረም',
      2: 'ጥቅምት',
      3: 'ኅዳር',
      4: 'ታኅሣሥ',
      5: 'ጥር',
      6: 'የካቲት',
      7: 'መጋቢት',
      8: 'ሚያዝያ',
      9: 'ግንቦት',
      10: 'ሰኔ',
      11: 'ሐምሌ',
      12: 'ነሐሴ',
      13: 'ጳጉሜ'
    };

    // Amharic weekday names
    this.WEEKDAY_NAMES = {
      1: 'እሑድ',
      2: 'ሰኞ',
      3: 'ማክሰኞ',
      4: 'ረቡዕ',
      5: 'ሐሙስ',
      6: 'ዓርብ',
      7: 'ቅዳሜ'
    };

    // English weekday names
    this.WEEKDAY_NAMES_EN = {
      1: 'Sunday',
      2: 'Monday',
      3: 'Tuesday',
      4: 'Wednesday',
      5: 'Thursday',
      6: 'Friday',
      7: 'Saturday'
    };

    // Fixed Ethiopian holidays
    this.FIXED_HOLIDAYS = [
      {
        id: 'enkutatash',
        name: 'Ethiopian New Year',
        nameAmharic: 'እንቁጣጣሽ',
        month: 1,
        day: 1,
        type: 'national',
        isPublicHoliday: true,
        description: 'Ethiopian New Year celebration'
      },
      {
        id: 'meskel',
        name: 'Finding of the True Cross',
        nameAmharic: 'መስቀል',
        month: 1,
        day: 17,
        type: 'religious',
        isPublicHoliday: true,
        description: 'Meskel celebration finding of the true cross'
      },
      {
        id: 'kullubi',
        name: 'St. Gabriel Day',
        nameAmharic: 'ኩሉ ቅዳሜ',
        month: 4,
        day: 19,
        type: 'religious',
        isPublicHoliday: false,
        description: 'St. Gabriel celebration in Kulubi'
      },
      {
        id: 'gena',
        name: 'Christmas',
        nameAmharic: 'ገና',
        month: 4,
        day: 29,
        type: 'religious',
        isPublicHoliday: true,
        description: 'Ethiopian Christmas celebration'
      },
      {
        id: 'timket',
        name: 'Epiphany',
        nameAmharic: 'ጥምቀት',
        month: 5,
        day: 11,
        type: 'religious',
        isPublicHoliday: true,
        description: 'Timket Epiphany celebration'
      },
      {
        id: 'adwa',
        name: 'Victory of Adwa',
        nameAmharic: 'የአድዋ ድል',
        month: 6,
        day: 23,
        type: 'national',
        isPublicHoliday: true,
        description: 'Commemoration of the Battle of Adwa victory'
      },
      {
        id: 'labour',
        name: 'International Workers Day',
        nameAmharic: 'የሠራተኞች ቀን',
        month: 8,
        day: 23,
        type: 'international',
        isPublicHoliday: true,
        description: 'International Workers Day'
      },
      {
        id: 'downfall',
        name: 'Downfall of Derg',
        nameAmharic: 'ደርግ የወደቀበት ቀን',
        month: 11,
        day: 20,
        type: 'national',
        isPublicHoliday: true,
        description: 'Anniversary of the downfall of the Derg regime'
      },
      {
        id: 'eid_al_fitr',
        name: 'Eid al-Fitr',
        nameAmharic: 'ኢድ አልፈጥር',
        type: 'religious',
        isPublicHoliday: true,
        description: 'Islamic holiday marking the end of Ramadan',
        isCalculated: true // Calculated based on Islamic calendar
      },
      {
        id: 'eid_al_adha',
        name: 'Eid al-Adha',
        nameAmharic: 'ኢድ አልአድሐ',
        type: 'religious',
        isPublicHoliday: true,
        description: 'Feast of the Sacrifice',
        isCalculated: true // Calculated based on Islamic calendar
      }
    ];
  }

  /**
   * Convert Gregorian date to Ethiopian date
   * @param {Date|string|number} date - Gregorian date
   * @returns {EthiopianDate} Ethiopian date object
   */
  toEthiopian(date) {
    const gregorianDate = new Date(date);
    const gregorianYear = gregorianDate.getFullYear();
    const gregorianMonth = gregorianDate.getMonth() + 1;
    const gregorianDay = gregorianDate.getDate();

    // Calculate Ethiopian date
    const ethiopianYear = gregorianYear - this.ETHIOPIAN_YEAR_OFFSET;
    
    // Adjust for Ethiopian New Year (September 11/12)
    let ethiopianMonth, ethiopianDay;
    
    if (gregorianMonth < 9 || (gregorianMonth === 9 && gregorianDay < 11)) {
      ethiopianMonth = (gregorianMonth + 3) % 13 || 13;
      ethiopianDay = this.calculateEthiopianDay(gregorianMonth, gregorianDay, false);
    } else {
      ethiopianMonth = (gregorianMonth + 4) % 13 || 13;
      ethiopianDay = this.calculateEthiopianDay(gregorianMonth, gregorianDay, true);
    }

    const weekday = this.getEthiopianWeekday(gregorianDate);
    const isLeapYear = this.isEthiopianLeapYear(ethiopianYear);

    return {
      year: ethiopianYear,
      month: ethiopianMonth,
      day: ethiopianDay,
      weekday,
      monthName: this.MONTH_NAMES[ethiopianMonth],
      weekdayName: this.WEEKDAY_NAMES[weekday],
      isLeapYear
    };
  }

  /**
   * Convert Ethiopian date to Gregorian date
   * @param {EthiopianDate|number} ethiopianDate - Ethiopian date or year
   * @param {number} [month] - Ethiopian month (if first param is year)
   * @param {number} [day] - Ethiopian day (if first param is year)
   * @returns {Date} Gregorian date object
   */
  toGregorian(ethiopianDate, month, day) {
    let year, ethMonth, ethDay;

    if (typeof ethiopianDate === 'object') {
      year = ethiopianDate.year;
      ethMonth = ethiopianDate.month;
      ethDay = ethiopianDate.day;
    } else {
      year = ethiopianDate;
      ethMonth = month;
      ethDay = day;
    }

    const gregorianYear = year + this.ETHIOPIAN_YEAR_OFFSET;
    let gregorianMonth, gregorianDay;

    // Calculate Gregorian month and day
    if (ethMonth <= 4) {
      gregorianMonth = ethMonth + 8;
      gregorianDay = this.calculateGregorianDay(ethMonth, ethDay, false);
    } else {
      gregorianMonth = ethMonth - 4;
      gregorianDay = this.calculateGregorianDay(ethMonth, ethDay, true);
    }

    // Adjust for leap year in Gregorian calendar
    const isGregorianLeap = this.isGregorianLeapYear(gregorianYear);
    if (isGregorianLeap && gregorianMonth === 2 && gregorianDay > 29) {
      gregorianDay = 29;
    }

    return new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
  }

  /**
   * Calculate Ethiopian day based on Gregorian date
   * @param {number} gregorianMonth 
   * @param {number} gregorianDay 
   * @param {boolean} isAfterNewYear 
   * @returns {number}
   */
  calculateEthiopianDay(gregorianMonth, gregorianDay, isAfterNewYear) {
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOffset = 0;

    if (isAfterNewYear) {
      // After Ethiopian New Year (Sept 11/12)
      for (let i = 0; i < gregorianMonth - 1; i++) {
        dayOffset += monthDays[i];
      }
      return (dayOffset + gregorianDay - 10) % 30 || 30;
    } else {
      // Before Ethiopian New Year
      for (let i = gregorianMonth; i < 12; i++) {
        dayOffset += monthDays[i];
      }
      return (dayOffset + gregorianDay + 20) % 30 || 30;
    }
  }

  /**
   * Calculate Gregorian day based on Ethiopian date
   * @param {number} ethiopianMonth 
   * @param {number} ethiopianDay 
   * @param {boolean} isAfterNewYear 
   * @returns {number}
   */
  calculateGregorianDay(ethiopianMonth, ethiopianDay, isAfterNewYear) {
    if (isAfterNewYear) {
      // Months 5-13 (January - August)
      const monthOffsets = { 5: 0, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31, 13: 31 };
      return ethiopianDay + (monthOffsets[ethiopianMonth] || 0);
    } else {
      // Months 1-4 (September - December)
      const monthOffsets = { 1: 0, 2: 30, 3: 30, 4: 31 };
      return ethiopianDay + (monthOffsets[ethiopianMonth] || 0) + 10;
    }
  }

  /**
   * Get Ethiopian weekday from Gregorian date
   * @param {Date} date - Gregorian date
   * @returns {number} Ethiopian weekday (1-7)
   */
  getEthiopianWeekday(date) {
    const gregorianWeekday = date.getDay(); // 0-6 (Sunday-Saturday)
    return gregorianWeekday === 0 ? 7 : gregorianWeekday; // Convert to 1-7 (Sunday-Saturday)
  }

  /**
   * Check if Ethiopian year is leap year
   * @param {number} year - Ethiopian year
   * @returns {boolean}
   */
  isEthiopianLeapYear(year) {
    return (year % 4 === 3) && ((year % 100 !== 99) || (year % 400 === 399));
  }

  /**
   * Check if Gregorian year is leap year
   * @param {number} year - Gregorian year
   * @returns {boolean}
   */
  isGregorianLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Get current Ethiopian date
   * @returns {EthiopianDate}
   */
  getCurrentEthiopianDate() {
    return this.toEthiopian(new Date());
  }

  /**
   * Format Ethiopian date as string
   * @param {EthiopianDate} ethDate - Ethiopian date
   * @param {string} [format='full'] - Format type (short, medium, full, numeric)
   * @param {string} [language='am'] - Language (am, en)
   * @returns {string} Formatted date string
   */
  formatEthiopianDate(ethDate, format = 'full', language = 'am') {
    const { day, month, year, weekday } = ethDate;

    switch (format) {
      case 'short':
        return language === 'am' 
          ? `${day}/${month}/${year}`
          : `${day}/${month}/${year}`;

      case 'medium':
        const monthName = language === 'am' 
          ? this.MONTH_NAMES[month]
          : this.getEnglishMonthName(month);
        return language === 'am'
          ? `${day} ${monthName} ${year}`
          : `${day} ${monthName} ${year}`;

      case 'full':
        const weekdayName = language === 'am'
          ? this.WEEKDAY_NAMES[weekday]
          : this.WEEKDAY_NAMES_EN[weekday];
        const monthNameFull = language === 'am'
          ? this.MONTH_NAMES[month]
          : this.getEnglishMonthName(month);
        return language === 'am'
          ? `${weekdayName}፣ ${day} ${monthNameFull} ${year}`
          : `${weekdayName}, ${day} ${monthNameFull} ${year}`;

      case 'numeric':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      default:
        return `${day}/${month}/${year}`;
    }
  }

  /**
   * Get English month name
   * @param {number} month - Ethiopian month (1-13)
   * @returns {string}
   */
  getEnglishMonthName(month) {
    const englishMonths = {
      1: 'Meskerem', 2: 'Tikimit', 3: 'Hidar', 4: 'Tahsas',
      5: 'Tir', 6: 'Yekatit', 7: 'Megabit', 8: 'Miazia',
      9: 'Genbot', 10: 'Sene', 11: 'Hamle', 12: 'Nehase',
      13: 'Pagume'
    };
    return englishMonths[month] || '';
  }

  /**
   * Get holidays for a specific Ethiopian year
   * @param {number} year - Ethiopian year
   * @returns {EthiopianHoliday[]}
   */
  getHolidaysForYear(year) {
    const holidays = this.FIXED_HOLIDAYS
      .filter(holiday => !holiday.isCalculated)
      .map(holiday => ({
        ...holiday,
        ethiopianDate: {
          year,
          month: holiday.month,
          day: holiday.day,
          monthName: this.MONTH_NAMES[holiday.month]
        }
      }));

    // Add calculated holidays (Eid al-Fitr, Eid al-Adha)
    const calculatedHolidays = this.calculateIslamicHolidays(year);
    return [...holidays, ...calculatedHolidays];
  }

  /**
   * Calculate Islamic holidays for Ethiopian year
   * @param {number} ethiopianYear 
   * @returns {EthiopianHoliday[]}
   */
  calculateIslamicHolidays(ethiopianYear) {
    // Simplified calculation - in production, use proper Islamic calendar calculations
    const gregorianYear = ethiopianYear + this.ETHIOPIAN_YEAR_OFFSET;
    
    // Approximate calculations for demonstration
    const eidAlFitr = {
      id: 'eid_al_fitr',
      name: 'Eid al-Fitr',
      nameAmharic: 'ኢድ አልፈጥር',
      ethiopianDate: {
        year: ethiopianYear,
        month: 10, // Approximate month
        day: 1,    // Approximate day
        monthName: this.MONTH_NAMES[10]
      },
      type: 'religious',
      isPublicHoliday: true,
      description: 'Islamic holiday marking the end of Ramadan'
    };

    const eidAlAdha = {
      id: 'eid_al_adha',
      name: 'Eid al-Adha',
      nameAmharic: 'ኢድ አልአድሐ',
      ethiopianDate: {
        year: ethiopianYear,
        month: 12, // Approximate month
        day: 10,   // Approximate day
        monthName: this.MONTH_NAMES[12]
      },
      type: 'religious',
      isPublicHoliday: true,
      description: 'Feast of the Sacrifice'
    };

    return [eidAlFitr, eidAlAdha];
  }

  /**
   * Check if a date is a holiday
   * @param {EthiopianDate|Date} date - Ethiopian or Gregorian date
   * @returns {boolean}
   */
  isHoliday(date) {
    const ethiopianDate = date instanceof Date ? this.toEthiopian(date) : date;
    const holidays = this.getHolidaysForYear(ethiopianDate.year);
    
    return holidays.some(holiday => 
      holiday.ethiopianDate.month === ethiopianDate.month &&
      holiday.ethiopianDate.day === ethiopianDate.day
    );
  }

  /**
   * Get business hours considering Ethiopian holidays and customs
   * @param {string} [region='addis_ababa'] - Ethiopian region
   * @returns {BusinessHours[]}
   */
  getStandardBusinessHours(region = 'addis_ababa') {
    const baseHours = [
      { day: 'monday', dayAmharic: 'ሰኞ', openingTime: '08:00', closingTime: '17:00', isOpen: true, breakStart: '12:00', breakEnd: '13:00' },
      { day: 'tuesday', dayAmharic: 'ማክሰኞ', openingTime: '08:00', closingTime: '17:00', isOpen: true, breakStart: '12:00', breakEnd: '13:00' },
      { day: 'wednesday', dayAmharic: 'ረቡዕ', openingTime: '08:00', closingTime: '17:00', isOpen: true, breakStart: '12:00', breakEnd: '13:00' },
      { day: 'thursday', dayAmharic: 'ሐሙስ', openingTime: '08:00', closingTime: '17:00', isOpen: true, breakStart: '12:00', breakEnd: '13:00' },
      { day: 'friday', dayAmharic: 'ዓርብ', openingTime: '08:00', closingTime: '17:00', isOpen: true, breakStart: '12:00', breakEnd: '13:00' },
      { day: 'saturday', dayAmharic: 'ቅዳሜ', openingTime: '08:00', closingTime: '12:00', isOpen: true, breakStart: null, breakEnd: null },
      { day: 'sunday', dayAmharic: 'እሑድ', openingTime: '00:00', closingTime: '00:00', isOpen: false, breakStart: null, breakEnd: null }
    ];

    // Adjust for regional differences
    if (region === 'dire_dawa' || region === 'harar') {
      // Earlier closing on Friday for prayer time
      const fridayIndex = baseHours.findIndex(h => h.day === 'friday');
      baseHours[fridayIndex].closingTime = '16:00';
    }

    return baseHours;
  }

  /**
   * Calculate Ethiopian age from birth date
   * @param {Date|EthiopianDate} birthDate - Birth date
   * @param {Date|EthiopianDate} [referenceDate] - Reference date (default: current)
   * @returns {number} Age in Ethiopian years
   */
  calculateEthiopianAge(birthDate, referenceDate = new Date()) {
    const ethBirthDate = birthDate instanceof Date ? this.toEthiopian(birthDate) : birthDate;
    const ethReferenceDate = referenceDate instanceof Date ? this.toEthiopian(referenceDate) : referenceDate;

    let age = ethReferenceDate.year - ethBirthDate.year;

    // Adjust age if birthday hasn't occurred yet this year
    if (ethReferenceDate.month < ethBirthDate.month || 
        (ethReferenceDate.month === ethBirthDate.month && ethReferenceDate.day < ethBirthDate.day)) {
      age--;
    }

    return age;
  }

  /**
   * Get Ethiopian months with days
   * @param {number} year - Ethiopian year
   * @returns {Array} Months with day counts
   */
  getEthiopianMonths(year) {
    const months = [];
    
    for (let month = 1; month <= 13; month++) {
      const days = month === 13 ? (this.isEthiopianLeapYear(year) ? 6 : 5) : 30;
      months.push({
        month,
        monthName: this.MONTH_NAMES[month],
        days,
        year
      });
    }

    return months;
  }

  /**
   * Validate Ethiopian date
   * @param {EthiopianDate} ethDate - Ethiopian date to validate
   * @returns {boolean}
   */
  isValidEthiopianDate(ethDate) {
    const { year, month, day } = ethDate;

    if (month < 1 || month > 13) return false;
    if (day < 1 || day > 30) return false;
    if (month === 13) {
      const maxDays = this.isEthiopianLeapYear(year) ? 6 : 5;
      if (day > maxDays) return false;
    }

    return true;
  }

  /**
   * Get days difference between two Ethiopian dates
   * @param {EthiopianDate} date1 
   * @param {EthiopianDate} date2 
   * @returns {number} Difference in days
   */
  getDaysDifference(date1, date2) {
    if (!this.isValidEthiopianDate(date1) || !this.isValidEthiopianDate(date2)) {
      throw new Error('Invalid Ethiopian date');
    }

    // Convert to Gregorian for accurate calculation
    const greg1 = this.toGregorian(date1);
    const greg2 = this.toGregorian(date2);
    
    const timeDiff = Math.abs(greg2.getTime() - greg1.getTime());
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Add days to Ethiopian date
   * @param {EthiopianDate} startDate 
   * @param {number} daysToAdd 
   * @returns {EthiopianDate}
   */
  addDays(startDate, daysToAdd) {
    const gregorianDate = this.toGregorian(startDate);
    gregorianDate.setDate(gregorianDate.getDate() + daysToAdd);
    return this.toEthiopian(gregorianDate);
  }

  /**
   * Get Ethiopian fiscal year quarters
   * @param {number} [year] - Ethiopian year (default: current)
   * @returns {Object} Fiscal quarters
   */
  getFiscalYearQuarters(year = this.getCurrentEthiopianDate().year) {
    return {
      q1: { start: { month: 1, day: 1 }, end: { month: 3, day: 30 } },
      q2: { start: { month: 4, day: 1 }, end: { month: 6, day: 30 } },
      q3: { start: { month: 7, day: 1 }, end: { month: 9, day: 30 } },
      q4: { start: { month: 10, day: 1 }, end: { month: 12, day: 30 } }
    };
  }
}

// Create and export singleton instance
const ethiopianCalendar = new EthiopianCalendar();
export default ethiopianCalendar;

// Export individual utility functions
export const EthiopianCalendarUtils = {
  // Core conversion functions
  toEthiopian: (date) => ethiopianCalendar.toEthiopian(date),
  toGregorian: (ethDate, month, day) => ethiopianCalendar.toGregorian(ethDate, month, day),
  
  // Date utilities
  getCurrent: () => ethiopianCalendar.getCurrentEthiopianDate(),
  formatDate: (ethDate, format, language) => ethiopianCalendar.formatEthiopianDate(ethDate, format, language),
  isValid: (ethDate) => ethiopianCalendar.isValidEthiopianDate(ethDate),
  
  // Holiday utilities
  getHolidays: (year) => ethiopianCalendar.getHolidaysForYear(year),
  isHoliday: (date) => ethiopianCalendar.isHoliday(date),
  
  // Business utilities
  getBusinessHours: (region) => ethiopianCalendar.getStandardBusinessHours(region),
  calculateAge: (birthDate, referenceDate) => ethiopianCalendar.calculateEthiopianAge(birthDate, referenceDate),
  
  // Calendar utilities
  getMonths: (year) => ethiopianCalendar.getEthiopianMonths(year),
  getQuarters: (year) => ethiopianCalendar.getFiscalYearQuarters(year),
  addDays: (startDate, days) => ethiopianCalendar.addDays(startDate, days),
  getDaysDifference: (date1, date2) => ethiopianCalendar.getDaysDifference(date1, date2),
  
  // Validation
  isLeapYear: (year) => ethiopianCalendar.isEthiopianLeapYear(year),
  
  // Constants
  MONTH_NAMES: ethiopianCalendar.MONTH_NAMES,
  WEEKDAY_NAMES: ethiopianCalendar.WEEKDAY_NAMES,
  FIXED_HOLIDAYS: ethiopianCalendar.FIXED_HOLIDAYS
};

// React Hook for Ethiopian Calendar
export const useEthiopianCalendar = () => {
  return {
    currentDate: ethiopianCalendar.getCurrentEthiopianDate(),
    toEthiopian: ethiopianCalendar.toEthiopian,
    toGregorian: ethiopianCalendar.toGregorian,
    formatDate: ethiopianCalendar.formatEthiopianDate,
    isHoliday: ethiopianCalendar.isHoliday,
    getHolidays: ethiopianCalendar.getHolidaysForYear
  };
};