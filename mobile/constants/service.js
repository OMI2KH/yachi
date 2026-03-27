// constants/service.js

/**
 * ENTERPRISE SERVICE CONSTANTS
 * Yachi Construction & Services Platform
 * Ethiopian Market Service Catalog with AI-Powered Matching
 */

// ==================== ENTERPRISE SERVICE CATEGORIES ====================
export const SERVICE_CATEGORIES = {
  CONSTRUCTION: {
    id: 'construction',
    name: { 
      en: 'Construction', 
      am: 'ግንባታ', 
      om: 'Ijaarsaa' 
    },
    icon: '🏗️',
    color: '#F59E0B',
    priority: 1,
    popularity: 95,
    average_rate: 500, // ETB per day
    growth_rate: 0.15, // 15% monthly growth
    
    subcategories: {
      NEW_CONSTRUCTION: {
        id: 'new_construction',
        name: { 
          en: 'New Building Construction', 
          am: 'አዲስ ሕንፃ ግንባታ', 
          om: 'Ijaarsaa Mannaa Haaraa' 
        },
        skills: ['masonry', 'carpentry', 'reinforcement', 'steel_fabrication'],
        equipment: ['concrete_mixer', 'scaffolding', 'power_tools'],
        complexity: 'high',
        duration: 'long_term',
      },
      FINISHING_WORK: {
        id: 'finishing_work',
        name: { 
          en: 'Finishing Work', 
          am: 'የማጠናቀቂያ ሥራ', 
          om: 'Hojii Xumuraa' 
        },
        skills: ['painting', 'tiling', 'plumbing_fixtures', 'electrical_fixtures'],
        equipment: ['painting_tools', 'tiling_tools'],
        complexity: 'medium',
        duration: 'medium_term',
      },
      RENOVATION: {
        id: 'renovation',
        name: { 
          en: 'Renovation', 
          am: 'ጥገና', 
          om: 'Fuula Duraa' 
        },
        skills: ['demolition', 'carpentry', 'painting', 'tiling'],
        equipment: ['demolition_tools', 'basic_construction_tools'],
        complexity: 'medium',
        duration: 'medium_term',
      },
      INFRASTRUCTURE: {
        id: 'infrastructure',
        name: { 
          en: 'Infrastructure', 
          am: 'መሠረተ ልማት', 
          om: 'Infiraastiraakcharii' 
        },
        skills: ['road_works', 'bridge_works', 'heavy_equipment'],
        equipment: ['heavy_machinery', 'survey_equipment'],
        complexity: 'very_high',
        duration: 'long_term',
      },
      TRADITIONAL_CONSTRUCTION: {
        id: 'traditional_construction',
        name: { 
          en: 'Traditional Construction', 
          am: 'ባህላዊ ግንባታ', 
          om: 'Ijaarsaa Aadaa' 
        },
        skills: ['mud_construction', 'traditional_carpentry'],
        equipment: ['traditional_tools'],
        complexity: 'low',
        duration: 'medium_term',
      },
    },

    // Ethiopian market specific features
    ethiopian_features: {
      regional_demand: {
        addis_ababa: 'very_high',
        oromia: 'high',
        amhara: 'high',
        tigray: 'medium',
        southern: 'medium',
      },
      seasonal_variation: {
        dry_season: 'peak',
        rainy_season: 'low',
      },
      government_projects: true,
      requires_certification: true,
    },
  },

  HOME_SERVICES: {
    id: 'home_services',
    name: { 
      en: 'Home Services', 
      am: 'የቤት አገልግሎቶች', 
      om: 'Tajaajilaa Manaa' 
    },
    icon: '🏠',
    color: '#10B981',
    priority: 2,
    popularity: 85,
    average_rate: 300,
    growth_rate: 0.12,
    
    subcategories: {
      PLUMBING: {
        id: 'plumbing',
        name: { 
          en: 'Plumbing', 
          am: 'ፕላምቢንግ', 
          om: 'Piipii' 
        },
        skills: ['pipe_installation', 'leak_repair', 'fixture_installation'],
        equipment: ['pipe_tools', 'wrenches'],
        complexity: 'medium',
        duration: 'short_term',
      },
      ELECTRICAL: {
        id: 'electrical',
        name: { 
          en: 'Electrical', 
          am: 'ኤሌክትሪክ', 
          om: 'Elektirikii' 
        },
        skills: ['wiring', 'outlet_installation', 'circuit_repair'],
        equipment: ['electrical_tools', 'multimeter'],
        complexity: 'medium',
        duration: 'short_term',
      },
      CLEANING: {
        id: 'cleaning',
        name: { 
          en: 'Cleaning', 
          am: 'ንፅፅር', 
          om: 'Qulqullina' 
        },
        skills: ['deep_cleaning', 'organization'],
        equipment: ['cleaning_supplies'],
        complexity: 'low',
        duration: 'very_short_term',
      },
      CARPENTRY: {
        id: 'carpentry',
        name: { 
          en: 'Carpentry', 
          am: 'እንጨት ሥራ', 
          om: 'Hojii Mukaa' 
        },
        skills: ['woodworking', 'furniture_repair', 'cabinet_making'],
        equipment: ['woodworking_tools'],
        complexity: 'medium',
        duration: 'medium_term',
      },
      PAINTING: {
        id: 'painting',
        name: { 
          en: 'Painting', 
          am: 'ቀለም ሥራ', 
          om: 'Hojii Lakkofsaa' 
        },
        skills: ['surface_preparation', 'painting_techniques'],
        equipment: ['painting_tools'],
        complexity: 'low',
        duration: 'short_term',
      },
      MASONRY: {
        id: 'masonry',
        name: { 
          en: 'Masonry', 
          am: 'ጡብ ሥራ', 
          om: 'Hojii Saree' 
        },
        skills: ['brick_laying', 'concrete_work'],
        equipment: ['masonry_tools'],
        complexity: 'medium',
        duration: 'medium_term',
      },
    },
  },

  AUTOMOTIVE: {
    id: 'automotive',
    name: { 
      en: 'Automotive', 
      am: 'ሞተር', 
      om: 'Mootorsii' 
    },
    icon: '🚗',
    color: '#EF4444',
    priority: 3,
    popularity: 70,
    average_rate: 400,
    growth_rate: 0.08,
    
    subcategories: {
      CAR_REPAIR: {
        id: 'car_repair',
        name: { 
          en: 'Car Repair', 
          am: 'የመኪና ጥገና', 
          om: 'Hojii Makiinaa' 
        },
        skills: ['engine_repair', 'brake_service', 'suspension_work'],
        equipment: ['mechanic_tools', 'diagnostic_equipment'],
        complexity: 'high',
        duration: 'short_term',
      },
      CAR_WASH: {
        id: 'car_wash',
        name: { 
          en: 'Car Wash', 
          am: 'መኪና ማጠብ', 
          om: 'Makiinaa Miicuu' 
        },
        skills: ['detailing', 'cleaning_techniques'],
        equipment: ['cleaning_supplies', 'pressure_washer'],
        complexity: 'low',
        duration: 'very_short_term',
      },
      TIRE_SERVICE: {
        id: 'tire_service',
        name: { 
          en: 'Tire Service', 
          am: 'የጎማ አገልግሎት', 
          om: 'Tajaajilaa Goodaa' 
        },
        skills: ['tire_changing', 'wheel_balancing'],
        equipment: ['tire_tools', 'balancing_machine'],
        complexity: 'low',
        duration: 'very_short_term',
      },
    },
  },

  TECHNOLOGY: {
    id: 'technology',
    name: { 
      en: 'Technology', 
      am: 'ቴክኖሎጂ', 
      om: 'Teknooloojii' 
    },
    icon: '💻',
    color: '#3B82F6',
    priority: 4,
    popularity: 65,
    average_rate: 600,
    growth_rate: 0.20,
    
    subcategories: {
      TECH_SUPPORT: {
        id: 'tech_support',
        name: { 
          en: 'Tech Support', 
          am: 'የቴክ እገዛ', 
          om: 'Gargaarsaa Tekii' 
        },
        skills: ['troubleshooting', 'software_installation'],
        equipment: ['diagnostic_software'],
        complexity: 'medium',
        duration: 'short_term',
      },
      SOFTWARE_DEVELOPMENT: {
        id: 'software_development',
        name: { 
          en: 'Software Development', 
          am: 'ሶፍትዌር ልማት', 
          om: 'Ijaarsaa Sooftiweerii' 
        },
        skills: ['programming', 'system_design'],
        equipment: ['development_tools'],
        complexity: 'high',
        duration: 'long_term',
      },
      WEB_DESIGN: {
        id: 'web_design',
        name: { 
          en: 'Web Design', 
          am: 'ድር ጣቢያ ንድፍ', 
          om: 'Qopheessaa Weebsaayitii' 
        },
        skills: ['ui_design', 'frontend_development'],
        equipment: ['design_software'],
        complexity: 'medium',
        duration: 'medium_term',
      },
    },
  },

  EDUCATION: {
    id: 'education',
    name: { 
      en: 'Education', 
      am: 'ትምህርት', 
      om: 'Barsiisaa' 
    },
    icon: '📚',
    color: '#8B5CF6',
    priority: 5,
    popularity: 60,
    average_rate: 250,
    growth_rate: 0.10,
    
    subcategories: {
      TUTORING: {
        id: 'tutoring',
        name: { 
          en: 'Tutoring', 
          am: 'አስተማሪ', 
          om: 'Barsiisaa' 
        },
        skills: ['subject_knowledge', 'teaching_methods'],
        equipment: ['teaching_materials'],
        complexity: 'medium',
        duration: 'ongoing',
      },
      MUSIC_LESSONS: {
        id: 'music_lessons',
        name: { 
          en: 'Music Lessons', 
          am: 'የሙዚቃ ትምህርት', 
          om: 'Barsiisaa Muuziqaa' 
        },
        skills: ['instrument_proficiency', 'music_theory'],
        equipment: ['musical_instruments'],
        complexity: 'medium',
        duration: 'ongoing',
      },
      LANGUAGE_TEACHING: {
        id: 'language_teaching',
        name: { 
          en: 'Language Teaching', 
          am: 'የቋንቋ ትምህርት', 
          om: 'Barsiisaa Afaanii' 
        },
        skills: ['language_proficiency', 'teaching_methods'],
        equipment: ['language_materials'],
        complexity: 'medium',
        duration: 'ongoing',
      },
    },
  },

  HEALTH_FITNESS: {
    id: 'health_fitness',
    name: { 
      en: 'Health & Fitness', 
      am: 'ጤና እና የአካል ብቃት', 
      om: 'Fayyaa fi Fiiziksii' 
    },
    icon: '💪',
    color: '#EC4899',
    priority: 6,
    popularity: 55,
    average_rate: 350,
    growth_rate: 0.15,
    
    subcategories: {
      PERSONAL_TRAINING: {
        id: 'personal_training',
        name: { 
          en: 'Personal Training', 
          am: 'የግል ስልጠና', 
          om: 'Qo\'annoo Dhuunfaa' 
        },
        skills: ['fitness_knowledge', 'training_techniques'],
        equipment: ['fitness_equipment'],
        complexity: 'medium',
        duration: 'ongoing',
      },
      YOGA_INSTRUCTION: {
        id: 'yoga_instruction',
        name: { 
          en: 'Yoga Instruction', 
          am: 'የዮጋ ትምህርት', 
          om: 'Barsiisaa Yoogaa' 
        },
        skills: ['yoga_practice', 'teaching_methods'],
        equipment: ['yoga_mats'],
        complexity: 'medium',
        duration: 'ongoing',
      },
      MASSAGE_THERAPY: {
        id: 'massage_therapy',
        name: { 
          en: 'Massage Therapy', 
          am: 'የማሳስ ሕክምና', 
          om: 'Tajaajilaa Massaajii' 
        },
        skills: ['massage_techniques', 'anatomy_knowledge'],
        equipment: ['massage_table'],
        complexity: 'medium',
        duration: 'short_term',
      },
    },
  },
};

// ==================== ENTERPRISE DELIVERY OPTIONS ====================
export const DELIVERY_OPTIONS = {
  IMMEDIATE: {
    id: 'immediate',
    name: { 
      en: 'Immediate', 
      am: 'ወዲያውኑ', 
      om: 'Achumaan' 
    },
    duration: { min: 0, max: 2 }, // hours
    priority: 'urgent',
    premium_multiplier: 1.5,
    availability: 'limited',
  },

  SAME_DAY: {
    id: 'same_day',
    name: { 
      en: 'Same Day', 
      am: 'በተመሳሳይ ቀን', 
      om: 'Guyyaa Tokko' 
    },
    duration: { min: 2, max: 8 }, // hours
    priority: 'high',
    premium_multiplier: 1.3,
    availability: 'high',
  },

  ONE_TWO_DAYS: {
    id: '1_2_days',
    name: { 
      en: '1-2 Days', 
      am: '1-2 ቀናት', 
      om: 'Guyyaa 1-2' 
    },
    duration: { min: 24, max: 48 }, // hours
    priority: 'medium',
    premium_multiplier: 1.1,
    availability: 'very_high',
  },

  THREE_FIVE_DAYS: {
    id: '3_5_days',
    name: { 
      en: '3-5 Days', 
      am: '3-5 ቀናት', 
      om: 'Guyyaa 3-5' 
    },
    duration: { min: 72, max: 120 }, // hours
    priority: 'low',
    premium_multiplier: 1.0,
    availability: 'very_high',
  },

  ONE_WEEK: {
    id: '1_week',
    name: { 
      en: '1 Week', 
      am: '1 ሳምንት', 
      om: 'Torban 1' 
    },
    duration: { min: 168, max: 168 }, // hours
    priority: 'low',
    premium_multiplier: 1.0,
    availability: 'very_high',
  },

  FLEXIBLE: {
    id: 'flexible',
    name: { 
      en: 'Flexible', 
      am: 'ተግዳሮት', 
      om: 'Gulaaluu' 
    },
    duration: { min: 0, max: 720 }, // hours (30 days)
    priority: 'very_low',
    premium_multiplier: 0.9,
    availability: 'very_high',
  },
};

// ==================== ENTERPRISE AVAILABILITY OPTIONS ====================
export const AVAILABILITY_OPTIONS = {
  IMMEDIATE: {
    id: 'immediate',
    name: { 
      en: 'Immediate', 
      am: 'ወዲያውኑ', 
      om: 'Achumaan' 
    },
    response_time: { min: 0, max: 1 }, // hours
    commitment_level: 'high',
    premium_eligible: true,
  },

  WITHIN_24_HOURS: {
    id: '24_hours',
    name: { 
      en: 'Within 24 Hours', 
      am: 'በ24 ሰዓት ውስጥ', 
      om: 'Sa\'aatii 24 Keessaa' 
    },
    response_time: { min: 1, max: 24 }, // hours
    commitment_level: 'high',
    premium_eligible: true,
  },

  WITHIN_3_DAYS: {
    id: '3_days',
    name: { 
      en: 'Within 3 Days', 
      am: 'በ3 ቀናት ውስጥ', 
      om: 'Guyyaa 3 Keessaa' 
    },
    response_time: { min: 24, max: 72 }, // hours
    commitment_level: 'medium',
    premium_eligible: false,
  },

  WITHIN_1_WEEK: {
    id: '1_week',
    name: { 
      en: 'Within 1 Week', 
      am: 'በ1 ሳምንት ውስጥ', 
      om: 'Torban 1 Keessaa' 
    },
    response_time: { min: 72, max: 168 }, // hours
    commitment_level: 'low',
    premium_eligible: false,
  },

  FLEXIBLE: {
    id: 'flexible',
    name: { 
      en: 'Flexible', 
      am: 'ተግዳሮት', 
      om: 'Gulaaluu' 
    },
    response_time: { min: 0, max: 720 }, // hours
    commitment_level: 'very_low',
    premium_eligible: false,
  },

  BY_APPOINTMENT: {
    id: 'appointment',
    name: { 
      en: 'By Appointment', 
      am: 'በቀጠሮ', 
      om: 'Beellamaan' 
    },
    response_time: { min: null, max: null }, // varies
    commitment_level: 'medium',
    premium_eligible: true,
  },
};

// ==================== SERVICE COMPLEXITY LEVELS ====================
export const SERVICE_COMPLEXITY = {
  VERY_LOW: {
    id: 'very_low',
    name: { 
      en: 'Very Low', 
      am: 'በጣም ዝቅተኛ', 
      om: 'Gadi Fagoo' 
    },
    skill_requirement: 'basic',
    training_required: 'none',
    certification_required: false,
    rate_multiplier: 0.7,
  },

  LOW: {
    id: 'low',
    name: { 
      en: 'Low', 
      am: 'ዝቅተኛ', 
      om: 'Gadi aanaa' 
    },
    skill_requirement: 'basic',
    training_required: 'minimal',
    certification_required: false,
    rate_multiplier: 0.85,
  },

  MEDIUM: {
    id: 'medium',
    name: { 
      en: 'Medium', 
      am: 'መካከለኛ', 
      om: 'Giddu galeessaa' 
    },
    skill_requirement: 'intermediate',
    training_required: 'moderate',
    certification_required: false,
    rate_multiplier: 1.0,
  },

  HIGH: {
    id: 'high',
    name: { 
      en: 'High', 
      am: 'ከፍተኛ', 
      om: 'Ol\'aanaa' 
    },
    skill_requirement: 'advanced',
    training_required: 'extensive',
    certification_required: true,
    rate_multiplier: 1.3,
  },

  VERY_HIGH: {
    id: 'very_high',
    name: { 
      en: 'Very High', 
      am: 'በጣም ከፍተኛ', 
      om: 'Ol\'aanaa Sana' 
    },
    skill_requirement: 'expert',
    training_required: 'professional',
    certification_required: true,
    rate_multiplier: 1.7,
  },
};

// ==================== ETHIOPIAN SERVICE MARKET CONFIG ====================
export const ETHIOPIAN_SERVICE_CONFIG = {
  REGIONAL_DEMAND: {
    ADDIS_ABABA: {
      top_categories: ['construction', 'home_services', 'technology'],
      peak_hours: { morning: '08:00-10:00', evening: '16:00-18:00' },
      average_rates: { construction: 600, home_services: 350, technology: 700 },
    },
    OROMIA: {
      top_categories: ['construction', 'home_services', 'automotive'],
      peak_hours: { morning: '07:00-09:00', evening: '15:00-17:00' },
      average_rates: { construction: 450, home_services: 250, automotive: 350 },
    },
    AMHARA: {
      top_categories: ['construction', 'home_services', 'education'],
      peak_hours: { morning: '08:00-10:00', evening: '16:00-18:00' },
      average_rates: { construction: 500, home_services: 300, education: 200 },
    },
  },

  SEASONAL_VARIATIONS: {
    DRY_SEASON: {
      months: ['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'],
      high_demand: ['construction', 'automotive', 'home_services'],
      rate_increase: 0.15,
    },
    RAINY_SEASON: {
      months: ['June', 'July', 'August', 'September'],
      high_demand: ['technology', 'education', 'health_fitness'],
      rate_increase: 0.0,
    },
  },

  CULTURAL_CONSIDERATIONS: {
    holiday_impact: {
      ethiopian_christmas: 'low_demand',
      ethiopian_easter: 'low_demand',
      eid_al_fitr: 'medium_demand',
      new_year: 'high_demand',
    },
    working_hours: {
      standard: '08:00-17:00',
      break_time: '12:00-13:00',
      friday_closure: '12:00-14:00',
    },
  },
};

// ==================== ENTERPRISE SERVICE SERVICE ====================
export class ServiceConstantsService {
  /**
   * Get category by ID
   */
  static getCategory(categoryId) {
    return SERVICE_CATEGORIES[categoryId?.toUpperCase()] || null;
  }

  /**
   * Get subcategory by ID
   */
  static getSubcategory(categoryId, subcategoryId) {
    const category = this.getCategory(categoryId);
    return category?.subcategories[subcategoryId?.toUpperCase()] || null;
  }

  /**
   * Get delivery option by ID
   */
  static getDeliveryOption(optionId) {
    return DELIVERY_OPTIONS[optionId?.toUpperCase()] || DELIVERY_OPTIONS.FLEXIBLE;
  }

  /**
   * Get availability option by ID
   */
  static getAvailabilityOption(optionId) {
    return AVAILABILITY_OPTIONS[optionId?.toUpperCase()] || AVAILABILITY_OPTIONS.FLEXIBLE;
  }

  /**
   * Get complexity level by ID
   */
  static getComplexity(complexityId) {
    return SERVICE_COMPLEXITY[complexityId?.toUpperCase()] || SERVICE_COMPLEXITY.MEDIUM;
  }

  /**
   * Calculate service rate based on multiple factors
   */
  static calculateServiceRate(baseRate, complexity, deliveryOption, location, experience) {
    const complexityConfig = this.getComplexity(complexity);
    const deliveryConfig = this.getDeliveryOption(deliveryOption);
    
    let rate = baseRate;
    
    // Apply complexity multiplier
    rate *= complexityConfig.rate_multiplier;
    
    // Apply delivery premium
    rate *= deliveryConfig.premium_multiplier;
    
    // Apply location adjustment
    const regionalRate = ETHIOPIAN_SERVICE_CONFIG.REGIONAL_DEMAND[location]?.average_rates || {};
    const categoryRate = Object.values(regionalRate)[0] || baseRate;
    rate = (rate + categoryRate) / 2;
    
    // Apply experience bonus (5% per year beyond 2 years)
    const experienceBonus = Math.max(0, (experience - 2) * 0.05);
    rate *= (1 + experienceBonus);
    
    return Math.round(rate);
  }

  /**
   * Get recommended delivery options for service type
   */
  static getRecommendedDeliveryOptions(categoryId, subcategoryId) {
    const subcategory = this.getSubcategory(categoryId, subcategoryId);
    if (!subcategory) return Object.values(DELIVERY_OPTIONS);

    const complexity = this.getComplexity(subcategory.complexity);
    
    switch (complexity.id) {
      case 'very_low':
      case 'low':
        return [DELIVERY_OPTIONS.IMMEDIATE, DELIVERY_OPTIONS.SAME_DAY, DELIVERY_OPTIONS.ONE_TWO_DAYS];
      case 'medium':
        return [DELIVERY_OPTIONS.SAME_DAY, DELIVERY_OPTIONS.ONE_TWO_DAYS, DELIVERY_OPTIONS.THREE_FIVE_DAYS];
      case 'high':
      case 'very_high':
        return [DELIVERY_OPTIONS.ONE_TWO_DAYS, DELIVERY_OPTIONS.THREE_FIVE_DAYS, DELIVERY_OPTIONS.ONE_WEEK];
      default:
        return Object.values(DELIVERY_OPTIONS);
    }
  }

  /**
   * Get popular categories for region
   */
  static getPopularCategories(region) {
    const regionalConfig = ETHIOPIAN_SERVICE_CONFIG.REGIONAL_DEMAND[region];
    if (!regionalConfig) return Object.values(SERVICE_CATEGORIES);

    return regionalConfig.top_categories
      .map(categoryId => this.getCategory(categoryId))
      .filter(Boolean)
      .sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Validate service parameters
   */
  static validateService(serviceData) {
    const errors = [];
    
    if (!serviceData.category) {
      errors.push('CATEGORY_REQUIRED');
    }
    
    if (!serviceData.subcategory) {
      errors.push('SUBCATEGORY_REQUIRED');
    }
    
    if (!serviceData.delivery_option) {
      errors.push('DELIVERY_OPTION_REQUIRED');
    }
    
    if (!serviceData.availability) {
      errors.push('AVAILABILITY_REQUIRED');
    }
    
    const category = this.getCategory(serviceData.category);
    const subcategory = this.getSubcategory(serviceData.category, serviceData.subcategory);
    
    if (category && subcategory) {
      const recommendedDelivery = this.getRecommendedDeliveryOptions(serviceData.category, serviceData.subcategory);
      if (!recommendedDelivery.some(opt => opt.id === serviceData.delivery_option)) {
        errors.push('DELIVERY_OPTION_INCOMPATIBLE');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get localized category name
   */
  static getLocalizedCategoryName(categoryId, language = 'en') {
    const category = this.getCategory(categoryId);
    return category?.name[language] || category?.name.en || categoryId;
  }

  /**
   * Get localized subcategory name
   */
  static getLocalizedSubcategoryName(categoryId, subcategoryId, language = 'en') {
    const subcategory = this.getSubcategory(categoryId, subcategoryId);
    return subcategory?.name[language] || subcategory?.name.en || subcategoryId;
  }

  /**
   * Check if service is seasonal
   */
  static isSeasonalService(categoryId, currentMonth = new Date().getMonth() + 1) {
    const seasonalConfig = ETHIOPIAN_SERVICE_CONFIG.SEASONAL_VARIATIONS;
    const currentSeason = Object.keys(seasonalConfig).find(season => 
      seasonalConfig[season].months.includes(currentMonth)
    );
    
    if (!currentSeason) return false;
    
    return seasonalConfig[currentSeason].high_demand.includes(categoryId);
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const SERVICE_CONSTANTS = {
  categories: SERVICE_CATEGORIES,
  deliveryOptions: DELIVERY_OPTIONS,
  availabilityOptions: AVAILABILITY_OPTIONS,
  complexityLevels: SERVICE_COMPLEXITY,
  ethiopianConfig: ETHIOPIAN_SERVICE_CONFIG,
  service: ServiceConstantsService,
};

export default SERVICE_CONSTANTS;