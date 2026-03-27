/**
 * Ethiopian Calendar Utility Module
 * Provides conversion between Gregorian and Ethiopian calendars
 * 
 * Ethiopian Calendar Features:
 * - 13 months (12 months of 30 days + Pagume with 5 or 6 days)
 * - New Year starts on September 11/12 (Gregorian)
 * - 7-8 years behind the Gregorian calendar
 * 
 * Based on the algorithm from Ethiopian calendar calculations
 */

const ETHIOPIAN_MONTH_NAMES = [
  'መስከረም',    // Meskerem
  'ጥቅምት',     // Tikimt
  'ህዳር',       // Hidar
  'ታህሣሥ',     // Tahsas
  'ጥር',         // Tir
  'የካቲት',      // Yekatit
  'መጋቢት',     // Megabit
  'ሚያዝያ',     // Miyazya
  'ግንቦት',     // Ginbot
  'ሰኔ',        // Sene
  'ሐምሌ',       // Hamle
  'ነሐሴ',       // Nehase
  'ጳጉሜ'        // Pagume
];

const ETHIOPIAN_MONTH_NAMES_EN = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miyazya',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume'
];

const DAY_NAMES = [
  'እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'
];

const DAY_NAMES_EN = [
  'Ehud', 'Segno', 'Maksegno', 'Erob', 'Hamus', 'Arb', 'Kidame'
];

/**
 * Convert Gregorian date to Ethiopian date
 * @param {Date} gregorianDate - Gregorian date object
 * @returns {Object} Ethiopian date object
 */
function gregorianToEthiopian(gregorianDate) {
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1; // JavaScript months are 0-indexed
  const day = gregorianDate.getDate();

  // Calculate Ethiopian year
  let ethYear = year - 8;
  
  // Adjust for Ethiopian New Year (September 11/12)
  if (month < 9 || (month === 9 && day < 11)) {
    ethYear--;
  }
  
  // Calculate days since Ethiopian New Year
  const newYear = new Date(year, 8, 11); // September 11
  const diffTime = Math.abs(gregorianDate - newYear);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate Ethiopian month and day
  let ethMonth = Math.floor(diffDays / 30) + 1;
  let ethDay = (diffDays % 30) + 1;
  
  // Handle Pagume (13th month) - 5 or 6 days
  if (ethMonth === 13) {
    // Check if it's a leap year in the Ethiopian calendar
    const isLeapYear = (ethYear % 4) === 3;
    const pagumeDays = isLeapYear ? 6 : 5;
    
    if (ethDay > pagumeDays) {
      ethMonth = 1;
      ethDay = ethDay - pagumeDays;
      ethYear++;
    }
  }
  
  // Adjust for September 11/12 transition
  if (month === 9 && day === 11) {
    // Ethiopian New Year
    ethMonth = 1;
    ethDay = 1;
    ethYear++;
  } else if (month === 9 && day === 12 && isGregorianLeapYear(year - 1)) {
    // Adjust for Gregorian leap year
    ethMonth = 1;
    ethDay = 1;
    ethYear++;
  }
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = gregorianDate.getDay();
  
  return {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
    dayOfWeek: dayOfWeek,
    monthName: ETHIOPIAN_MONTH_NAMES[ethMonth - 1],
    monthNameEn: ETHIOPIAN_MONTH_NAMES_EN[ethMonth - 1],
    dayName: DAY_NAMES[dayOfWeek],
    dayNameEn: DAY_NAMES_EN[dayOfWeek],
    isLeapYear: (ethYear % 4) === 3,
    era: ethYear < 0 ? 'ዓ/ዓ' : 'ዓ/ም'
  };
}

/**
 * Convert Ethiopian date to Gregorian date
 * @param {number} year - Ethiopian year
 * @param {number} month - Ethiopian month (1-13)
 * @param {number} day - Ethiopian day
 * @returns {Date} Gregorian date object
 */
function ethiopianToGregorian(year, month, day) {
  // Validate inputs
  if (month < 1 || month > 13) {
    throw new Error('Ethiopian month must be between 1 and 13');
  }
  
  if (day < 1 || day > 30) {
    throw new Error('Ethiopian day must be between 1 and 30');
  }
  
  // Handle Pagume days
  if (month === 13) {
    const isLeapYear = (year % 4) === 3;
    const maxDays = isLeapYear ? 6 : 5;
    if (day > maxDays) {
      throw new Error(`Pagume can only have ${maxDays} days in year ${year}`);
    }
  }
  
  // Calculate Gregorian year
  let gregYear = year + 8;
  
  // Calculate days from Ethiopian New Year (Meskerem 1)
  let totalDays = (month - 1) * 30 + (day - 1);
  
  // Adjust for September 11/12
  let newYearDay = 11; // September 11
  
  // Check if previous Gregorian year was leap year
  if (isGregorianLeapYear(gregYear - 1)) {
    newYearDay = 12; // September 12 for leap years
  }
  
  // Create base date (Ethiopian New Year in Gregorian calendar)
  const baseDate = new Date(gregYear, 8, newYearDay); // September
    
  // Add the calculated days
  const resultDate = new Date(baseDate);
  resultDate.setDate(baseDate.getDate() + totalDays);
  
  // Adjust year if we crossed Gregorian year boundary
  if (resultDate.getFullYear() !== gregYear) {
    gregYear = resultDate.getFullYear();
  }
  
  return resultDate;
}

/**
 * Check if a Gregorian year is a leap year
 * @param {number} year - Gregorian year
 * @returns {boolean}
 */
function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Check if an Ethiopian year is a leap year
 * @param {number} year - Ethiopian year
 * @returns {boolean}
 */
function isEthiopianLeapYear(year) {
  return (year % 4) === 3;
}

/**
 * Get current Ethiopian date
 * @returns {Object} Current Ethiopian date
 */
function getCurrentEthiopianDate() {
  return gregorianToEthiopian(new Date());
}

/**
 * Format Ethiopian date as string
 * @param {Object} ethDate - Ethiopian date object
 * @param {string} format - Format string
 * @returns {string} Formatted date string
 */
function formatEthiopianDate(ethDate, format = 'DD/MM/YYYY') {
  const { year, month, day, monthName, dayName, era } = ethDate;
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month.toString().padStart(2, '0'))
    .replace('DD', day.toString().padStart(2, '0'))
    .replace('MMMM', monthName)
    .replace('dddd', dayName)
    .replace('ERA', era);
}

/**
 * Format Ethiopian date in English
 * @param {Object} ethDate - Ethiopian date object
 * @returns {string} Formatted English date string
 */
function formatEthiopianDateEn(ethDate) {
  const { day, monthNameEn, year, dayNameEn } = ethDate;
  return `${dayNameEn}, ${day} ${monthNameEn} ${year}`;
}

/**
 * Format Ethiopian date in Amharic
 * @param {Object} ethDate - Ethiopian date object
 * @returns {string} Formatted Amharic date string
 */
function formatEthiopianDateAm(ethDate) {
  const { day, monthName, year, dayName, era } = ethDate;
  return `${dayName}፣ ${day} ${monthName} ${year} ${era}`;
}

/**
 * Get Ethiopian holidays for a specific year
 * @param {number} year - Ethiopian year
 * @returns {Array} Array of holiday objects
 */
function getEthiopianHolidays(year) {
  const holidays = [
    {
      name: 'አዲስ አመት',
      nameEn: 'New Year',
      date: { year, month: 1, day: 1 },
      type: 'national'
    },
    {
      name: 'መስቀል',
      nameEn: 'Meskel',
      date: { year, month: 1, day: 17 },
      type: 'religious'
    },
    {
      name: 'ገና',
      nameEn: 'Christmas',
      date: { year, month: 4, day: 29 },
      type: 'religious'
    },
    {
      name: 'ጥምቀት',
      nameEn: 'Epiphany',
      date: { year, month: 5, day: 11 },
      type: 'religious'
    },
    {
      name: 'ዓደወ',
      nameEn: "Adwa Victory Day",
      date: { year, month: 6, day: 23 },
      type: 'national'
    },
    {
      name: 'ፋሲካ',
      nameEn: 'Easter',
      // Easter calculation is complex - this is a simplified version
      date: calculateEaster(year),
      type: 'religious'
    },
    {
      name: 'ሚያዝያ 5',
      nameEn: 'Patriots Victory Day',
      date: { year, month: 8, day: 5 },
      type: 'national'
    },
    {
      name: 'የሰራተኞች ቀን',
      nameEn: 'Labour Day',
      date: { year, month: 8, day: 23 },
      type: 'national'
    },
    {
      name: 'የወረራዎች ቀን',
      nameEn: 'Downfall of Derg',
      date: { year, month: 9, day: 20 },
      type: 'national'
    },
    {
      name: 'ኢድ አል ፈጥር',
      nameEn: 'Eid al-Fitr',
      // Islamic holiday - date varies each year
      type: 'religious'
    },
    {
      name: 'ኢድ አል አደሃ',
      nameEn: 'Eid al-Adha',
      // Islamic holiday - date varies each year
      type: 'religious'
    }
  ];
  
  return holidays;
}

/**
 * Simplified Easter calculation (for Ethiopian calendar)
 * @param {number} year - Ethiopian year
 * @returns {Object} Easter date
 */
function calculateEaster(year) {
  // This is a simplified approximation
  // Actual calculation requires complex ecclesiastical formulas
  const baseDate = { year, month: 7, day: 15 }; // Approximate
  return baseDate;
}

/**
 * Get Ethiopian month information
 * @param {number} month - Ethiopian month (1-13)
 * @returns {Object} Month information
 */
function getMonthInfo(month) {
  if (month < 1 || month > 13) {
    throw new Error('Month must be between 1 and 13');
  }
  
  const info = {
    number: month,
    name: ETHIOPIAN_MONTH_NAMES[month - 1],
    nameEn: ETHIOPIAN_MONTH_NAMES_EN[month - 1],
    days: month === 13 ? '5/6 (leap year)' : 30,
    season: getSeason(month)
  };
  
  return info;
}

/**
 * Get season for Ethiopian month
 * @param {number} month - Ethiopian month
 * @returns {string} Season
 */
function getSeason(month) {
  if (month <= 2) {
    return 'ክረምት'; // Winter
  } else if (month <= 4) {
    return 'ጸደይ'; // Spring
  } else if (month <= 8) {
    return 'አበባ'; // Summer
  } else if (month <= 12) {
    return 'ከመድ'; // Autumn
  } else {
    return 'ጳጉሜ'; // Pagume
  }
}

/**
 * Calculate Ethiopian fiscal year
 * @param {Object} ethDate - Ethiopian date object
 * @returns {Object} Fiscal year info
 */
function getFiscalYear(ethDate) {
  // Ethiopian fiscal year starts on Hamle 1 (July 8 Gregorian)
  let fiscalYear = ethDate.year;
  let fiscalQuarter = Math.ceil(ethDate.month / 3);
  
  if (ethDate.month >= 11) { // Hamle (11) and later
    fiscalYear = ethDate.year + 1;
  }
  
  return {
    year: fiscalYear,
    quarter: fiscalQuarter,
    start: { year: fiscalYear - 1, month: 11, day: 1 },
    end: { year: fiscalYear, month: 10, day: 30 }
  };
}

/**
 * Validate Ethiopian date
 * @param {number} year - Ethiopian year
 * @param {number} month - Ethiopian month
 * @param {number} day - Ethiopian day
 * @returns {boolean} True if valid
 */
function isValidEthiopianDate(year, month, day) {
  try {
    if (month < 1 || month > 13) return false;
    
    if (month === 13) {
      const isLeap = isEthiopianLeapYear(year);
      return day >= 1 && day <= (isLeap ? 6 : 5);
    }
    
    return day >= 1 && day <= 30;
  } catch (error) {
    return false;
  }
}

module.exports = {
  gregorianToEthiopian,
  ethiopianToGregorian,
  getCurrentEthiopianDate,
  formatEthiopianDate,
  formatEthiopianDateEn,
  formatEthiopianDateAm,
  getEthiopianHolidays,
  getMonthInfo,
  getFiscalYear,
  isValidEthiopianDate,
  isGregorianLeapYear,
  isEthiopianLeapYear,
  
  // Constants for external use
  ETHIOPIAN_MONTH_NAMES,
  ETHIOPIAN_MONTH_NAMES_EN,
  DAY_NAMES,
  DAY_NAMES_EN
};