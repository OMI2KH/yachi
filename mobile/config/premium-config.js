// config/premium-config.js

/**
 * ENTERPRISE PREMIUM CONFIGURATION
 * Yachi Construction & Services Platform
 * AI-Powered Premium Feature System with Ethiopian Market Optimization
 */

import { Platform } from 'react-native';

// ==================== ENTERPRISE CONSTANTS ====================
export const PREMIUM_CONSTANTS = {
  CURRENCY: 'ETB',
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'am', 'om'],
  PAYMENT_GATEWAYS: ['chapa', 'telebirr', 'cbe_birr'],
  RENEWAL_TYPES: {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    ANNUAL: 'annual',
    ONE_TIME: 'one_time'
  },
  FEATURE_CATEGORIES: {
    VISIBILITY: 'visibility',
    CREDIBILITY: 'credibility',
    AI_CONSTRUCTION: 'ai_construction',
    ANALYTICS: 'analytics',
    SUPPORT: 'support',
    MONETIZATION: 'monetization'
  }
};

// ==================== ENTERPRISE TIER SYSTEM ====================
export const PREMIUM_TIERS = {
  FREE: {
    id: 'free',
    level: 0,
    name: { en: 'Free', am: 'ነፃ', om: 'Bilisaa' },
    price: 0,
    color: '#6B7280',
    icon: 'star-outline',
    
    features: {
      profile: {
        basic_profile: true,
        service_listings: 3,
        portfolio_items: 5,
        document_uploads: 3,
        skill_tags: 5
      },
      marketplace: {
        basic_search: true,
        category_browse: true,
        service_booking: true,
        messaging: true,
        reviews: true
      },
      construction: {
        view_projects: true,
        apply_projects: 2,
        basic_ai_matching: false
      },
      limitations: {
        search_priority: 'low',
        ai_matching: 'none',
        government_projects: false,
        featured_placement: false
      }
    }
  },

  PREMIUM: {
    id: 'premium',
    level: 1,
    name: { en: 'Premium', am: 'ፕሪሚየም', om: 'Premium' },
    price: 200,
    color: '#F59E0B',
    icon: 'star',
    
    features: {
      profile: {
        verified_badge: true,
        premium_profile: true,
        service_listings: 10,
        portfolio_items: 20,
        document_uploads: 10,
        skill_tags: 15,
        custom_profile_link: true
      },
      marketplace: {
        advanced_search: true,
        search_priority: 'high',
        featured_placement: true,
        booking_conversion_boost: true,
        messaging_priority: true
      },
      construction: {
        ai_worker_matching: true,
        project_applications: 10,
        government_project_access: true,
        project_invitations: true
      },
      analytics: {
        advanced_analytics: true,
        performance_insights: true,
        monthly_reports: true
      },
      support: {
        priority_support: true,
        phone_support: true
      }
    },

    performance_metrics: {
      booking_increase: { min: 30, max: 65, average: 45 },
      visibility_boost: { min: 200, max: 400, average: 300 },
      trust_factor: { min: 50, max: 80, average: 65 }
    }
  },

  PROFESSIONAL: {
    id: 'professional',
    level: 2,
    name: { en: 'Professional', am: 'ፕሮፌሽናል', om: 'Ogummaa' },
    price: 500,
    color: '#059669',
    icon: 'award',
    
    features: {
      profile: {
        professional_badge: true,
        unlimited_listings: true,
        unlimited_portfolio: true,
        profile_analytics: true,
        custom_profile_link: true
      },
      marketplace: {
        top_search_placement: true,
        category_featuring: true,
        homepage_spotlight: true,
        booking_guarantee: true
      },
      construction: {
        priority_ai_matching: true,
        unlimited_applications: true,
        government_project_priority: true,
        project_management_tools: true,
        team_management: true
      },
      analytics: {
        real_time_analytics: true,
        market_insights: true,
        customer_behavior_analysis: true,
        custom_reports: true
      },
      support: {
        vip_support: true,
        dedicated_account_manager: true,
        early_access: true
      }
    }
  },

  ENTERPRISE: {
    id: 'enterprise',
    level: 3,
    name: { en: 'Enterprise', am: 'ኢንተርፕራይዝ', om: 'Enterprise' },
    price: 1500,
    color: '#7C3AED',
    icon: 'rocket',
    
    features: {
      profile: {
        enterprise_badge: true,
        white_label_profile: true,
        team_profiles: true,
        multi_location_support: true
      },
      marketplace: {
        guaranteed_placement: true,
        exclusive_featuring: true,
        partnership_opportunities: true
      },
      construction: {
        enterprise_ai_matching: true,
        large_project_management: true,
        government_partnerships: true,
        infrastructure_projects: true,
        multi_team_coordination: true
      },
      analytics: {
        enterprise_analytics: true,
        predictive_analytics: true,
        competitor_intelligence: true,
        custom_dashboard: true
      },
      support: {
        enterprise_support: true,
        dedicated_success_manager: true,
        custom_integration: true,
        api_access: true
      }
    }
  }
};

// ==================== PREMIUM PRODUCT CATALOG ====================
export const PREMIUM_PRODUCTS = {
  PREMIUM_BADGE: {
    id: 'premium_badge',
    type: 'subscription',
    category: 'credibility',
    name: { 
      en: 'Premium Badge', 
      am: 'ፕሪሚየም ምልክት', 
      om: 'Mallattoo Premium' 
    },
    description: {
      en: 'Verified badge and enhanced credibility',
      am: 'የተረጋገጠ ምልክት እና የተሻለ አስተማማኝነት',
      om: 'Mallattoo mirkaneessaa fi amanamummaa fooyya\'e'
    },
    price: 200,
    duration: 'monthly',
    
    features: [
      {
        id: 'verified_badge',
        name: { en: 'Verified Badge', am: 'የተረጋገጠ ምልክት', om: 'Mallattoo Mirkaneessaa' },
        icon: 'shield-checkmark',
        impact: { bookings: 45, trust: 68, visibility: 120 }
      },
      {
        id: 'search_priority',
        name: { en: 'Search Priority', am: 'የፍለጋ ቅድሚያ', om: 'Durii Barbaadumsaa' },
        icon: 'trending-up',
        impact: { impressions: 200, clicks: 85, conversions: 35 }
      }
    ],

    eligibility: {
      min_rating: 4.0,
      min_completed_jobs: 5,
      verification_level: 'intermediate',
      profile_completion: 85
    }
  },

  FEATURED_LISTING: {
    id: 'featured_listing',
    type: 'one_time',
    category: 'visibility',
    name: { 
      en: 'Featured Listing', 
      am: 'የተለየ ዝርዝር', 
      om: 'Galmeessuu Addaa' 
    },
    description: {
      en: 'Top placement and highlighted visibility',
      am: 'ከፍተኛ ቦታ እና የተጎላሎ ታይነት',
      om: 'Bakka ol\'aanaa fi agarsiisa ibsamuu'
    },
    price: 399,
    duration: 30, // days
    
    placement: {
      search_results: 'top_3',
      category_pages: 'featured_section',
      homepage: 'rotating_spotlight'
    },

    performance: {
      visibility_boost: 300,
      click_through_rate: 45,
      conversion_rate: 35,
      average_roi: 250
    }
  },

  AI_CONSTRUCTION_PRIORITY: {
    id: 'ai_construction_priority',
    type: 'subscription',
    category: 'ai_construction',
    name: { 
      en: 'AI Construction Priority', 
      am: 'AI ግንባታ ቅድሚያ', 
      om: 'Durii Ijaarsaa AI' 
    },
    description: {
      en: 'Priority access to AI-matched construction projects',
      am: 'በAI የሚገጥሙ የግንባታ ፕሮጀክቶች ቅድሚያ መዳረሻ',
      om: 'Argamsa durii pirootii ijaarsaa AI waliin walitti qabamtee'
    },
    price: 300,
    duration: 'monthly',
    
    benefits: [
      'first_priority_ai_matching',
      'exclusive_government_projects',
      'larger_project_opportunities',
      'higher_budget_assignments'
    ],

    requirements: {
      construction_experience: 2, // years
      team_size: 5,
      equipment_availability: true,
      safety_certification: true
    },

    project_access: {
      government_projects: 85,
      large_projects: 70,
      high_budget_projects: 60
    }
  }
};

// ==================== PREMIUM BUNDLES ====================
export const PREMIUM_BUNDLES = {
  CONSTRUCTION_PRO: {
    id: 'construction_pro_bundle',
    name: { 
      en: 'Construction Pro Bundle', 
      am: 'የግንባታ ባለሙያ ጥቅል', 
      om: 'Walitti Qabuu Ogummaa Ijaarsaa' 
    },
    price: 600,
    savings: 100,
    products: ['premium_badge', 'ai_construction_priority'],
    
    features: [
      'verified_premium_badge',
      'search_priority_boost',
      'ai_construction_matching',
      'government_project_access',
      'construction_analytics',
      'priority_support'
    ],

    target_audience: [
      'construction_workers',
      'civil_engineers',
      'project_managers',
      'construction_companies'
    ]
  },

  SERVICE_ELITE: {
    id: 'service_provider_elite',
    name: { 
      en: 'Service Provider Elite', 
      am: 'የአገልግሎት አቅራቢ ኤሊት', 
      om: 'Elite Kennataa Tajaajilaa' 
    },
    price: 450,
    savings: 149,
    products: ['premium_badge', 'featured_listing'],
    
    features: [
      'verified_premium_badge',
      'featured_listing_placement',
      'search_priority_boost',
      'enhanced_visibility',
      'booking_conversion_boost',
      'priority_messaging'
    ],

    target_audience: [
      'home_service_providers',
      'professional_service_providers',
      'skilled_workers',
      'small_business_owners'
    ]
  }
};

// ==================== ENTERPRISE PREMIUM SERVICE ====================
export class PremiumService {
  /**
   * Check user eligibility for premium feature
   */
  static checkEligibility(user, featureId) {
    const product = PREMIUM_PRODUCTS[featureId];
    if (!product) {
      return { eligible: false, reason: 'PRODUCT_NOT_FOUND' };
    }

    const requirements = product.eligibility || {};
    const checks = [];

    // Rating check
    if (requirements.min_rating && user.rating < requirements.min_rating) {
      checks.push({
        requirement: 'min_rating',
        passed: false,
        current: user.rating,
        required: requirements.min_rating
      });
    } else {
      checks.push({ requirement: 'min_rating', passed: true });
    }

    // Completed jobs check
    if (requirements.min_completed_jobs && user.completedJobs < requirements.min_completed_jobs) {
      checks.push({
        requirement: 'min_completed_jobs',
        passed: false,
        current: user.completedJobs,
        required: requirements.min_completed_jobs
      });
    } else {
      checks.push({ requirement: 'min_completed_jobs', passed: true });
    }

    const allPassed = checks.every(check => check.passed);
    
    return {
      eligible: allPassed,
      checks,
      reason: allPassed ? null : 'REQUIREMENTS_NOT_MET',
      product: product
    };
  }

  /**
   * Calculate ROI for premium feature
   */
  static calculateROI(featureId, userMetrics) {
    const product = PREMIUM_PRODUCTS[featureId];
    if (!product) return null;

    const price = product.price;
    const performance = product.performance || product.features?.[0]?.impact;
    
    if (!performance) return null;

    const avgBookingValue = userMetrics.averageBookingValue || 1000;
    const monthlyBookings = userMetrics.monthlyBookings || 10;
    
    const bookingIncrease = performance.bookings || performance.conversion_rate || 0;
    const additionalBookings = (monthlyBookings * bookingIncrease) / 100;
    const additionalRevenue = additionalBookings * avgBookingValue;
    const roi = ((additionalRevenue - price) / price) * 100;

    return {
      roi: Math.round(roi),
      additionalBookings: Math.round(additionalBookings),
      additionalRevenue: Math.round(additionalRevenue),
      breakEvenDays: Math.ceil(price / (additionalRevenue / 30)),
      confidence: 0.85
    };
  }

  /**
   * Get personalized upgrade recommendations
   */
  static getRecommendations(user) {
    const recommendations = [];
    const userRole = user.role;
    const userMetrics = user.metrics || {};

    // Base recommendations for all users
    const badgeEligibility = this.checkEligibility(user, 'PREMIUM_BADGE');
    if (badgeEligibility.eligible) {
      recommendations.push({
        product: 'PREMIUM_BADGE',
        priority: 'high',
        reason: {
          en: 'Increase trust and booking conversions',
          am: 'አስተማማኝነት እና የቦኪንግ መለወጫዎችን ይጨምሩ',
          om: 'Amanamummaa fi jijjiirrama booking fooyya\'i'
        },
        expectedImpact: '45% more bookings',
        price: PREMIUM_PRODUCTS.PREMIUM_BADGE.price
      });
    }

    // Role-specific recommendations
    if (userRole === 'construction_worker' || userRole === 'construction_company') {
      const aiEligibility = this.checkEligibility(user, 'AI_CONSTRUCTION_PRIORITY');
      if (aiEligibility.eligible) {
        recommendations.push({
          product: 'AI_CONSTRUCTION_PRIORITY',
          priority: 'high',
          reason: {
            en: 'Access high-value government construction projects',
            am: 'የመንግስት ከፍተኛ ዋጋ ያላቸው የግንባታ ፕሮጀክቶች ይድረሱዎት',
            om: 'Argamsa pirootii ijaarsaa mootummaa gatii ol\'aanaa qaban'
          },
          expectedImpact: 'Access to 500K+ ETB projects',
          price: PREMIUM_PRODUCTS.AI_CONSTRUCTION_PRIORITY.price
        });
      }
    }

    // Performance-based recommendations
    if (userMetrics.serviceQuality >= 4.5 && userMetrics.responseRate >= 90) {
      const listingEligibility = this.checkEligibility(user, 'FEATURED_LISTING');
      if (listingEligibility.eligible) {
        recommendations.push({
          product: 'FEATURED_LISTING',
          priority: 'medium',
          reason: {
            en: 'Boost visibility for your high-quality services',
            am: 'ለከፍተኛ ጥራት ያላቸው አገልግሎቶችዎ ታይነት ይጨምሩ',
            om: 'Agarsiisa tajaajilaa gaggeessaa keessan fooyya\'i'
          },
          expectedImpact: '300% more visibility',
          price: PREMIUM_PRODUCTS.FEATURED_LISTING.price
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate regional pricing with Ethiopian market adjustments
   */
  static calculateRegionalPrice(basePrice, region, userType = 'individual') {
    const regionalMultipliers = {
      addis_ababa: 1.0,
      dire_dawa: 0.9,
      mekelle: 0.85,
      hawassa: 0.8,
      bahir_dar: 0.8,
      other: 0.75
    };

    const userTypeMultipliers = {
      individual: 1.0,
      small_business: 0.9,
      enterprise: 0.8,
      government: 0.7
    };

    const regionalMultiplier = regionalMultipliers[region] || 1.0;
    const userMultiplier = userTypeMultipliers[userType] || 1.0;

    return Math.round(basePrice * regionalMultiplier * userMultiplier);
  }

  /**
   * Format price for display with Ethiopian currency
   */
  static formatPrice(price, currency = 'ETB', duration = 'monthly', language = 'en') {
    const durationText = {
      monthly: { en: '/month', am: '/ወር', om: '/ji\'a' },
      one_time: { en: 'one-time', am: 'አንዴ', om: 'Yeroo tokko' },
      annual: { en: '/year', am: '/አመት', om: '/waggaa' }
    };

    const formattedDuration = durationText[duration]?.[language] || durationText[duration]?.en;

    return {
      amount: price,
      currency,
      duration: formattedDuration,
      display: `${currency} ${price}${formattedDuration ? ' ' + formattedDuration : ''}`,
      localized: this.localizePrice(price, currency, duration, language)
    };
  }

  /**
   * Localize price for Ethiopian languages
   */
  static localizePrice(price, currency, duration, language) {
    if (language === 'en') {
      return `${currency} ${price}${duration === 'monthly' ? '/month' : ''}`;
    }

    // Convert numbers to Amharic or Oromo
    const localizeNumber = (num) => {
      if (language === 'am') {
        const amharicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().split('').map(digit => amharicNumbers[parseInt(digit)]).join('');
      }
      return num; // Oromo uses same numerals
    };

    const localizedPrice = localizeNumber(price);
    
    if (language === 'am') {
      return `ብር ${localizedPrice}${duration === 'monthly' ? '/ወር' : ''}`;
    } else if (language === 'om') {
      return `Birr ${localizedPrice}${duration === 'monthly' ? '/ji\'a' : ''}`;
    }

    return `${currency} ${price}`;
  }

  /**
   * Get feature benefits for user role and language
   */
  static getFeatureBenefits(featureId, userRole, language = 'en') {
    const product = PREMIUM_PRODUCTS[featureId];
    if (!product) return [];

    let benefits = product.benefits || product.features?.map(f => f.id) || [];

    // Filter benefits based on user role
    if (userRole.includes('construction')) {
      benefits = benefits.filter(benefit => 
        benefit.includes('construction') || 
        benefit.includes('ai') || 
        benefit.includes('government')
      );
    } else if (userRole.includes('service')) {
      benefits = benefits.filter(benefit => 
        benefit.includes('visibility') || 
        benefit.includes('booking') ||
        benefit.includes('search')
      );
    }

    // Localize benefit descriptions
    return benefits.map(benefit => ({
      id: benefit,
      description: this.getLocalizedBenefit(benefit, language)
    }));
  }

  /**
   * Get localized benefit description
   */
  static getLocalizedBenefit(benefitId, language) {
    const benefitTranslations = {
      'verified_premium_badge': {
        en: 'Verified premium badge for increased trust',
        am: 'የተረጋገጠ ፕሪሚየም ምልክት ለከፈደ አስተማማኝነት',
        om: 'Mallattoo premium mirkaneessaa amanamummaa dabalataaf'
      },
      'ai_construction_matching': {
        en: 'AI-powered construction project matching',
        am: 'በAI የሚነድፍ የግንባታ ፕሮጀክት ማጣመር',
        om: 'Walisuu pirootii ijaarsaa AI waliin hojjetu'
      },
      'government_project_access': {
        en: 'Access to government infrastructure projects',
        am: 'ወደ የመንግስት መሠረተ ልማት ፕሮጀክቶች መዳረሻ',
        om: 'Argamsa pirootii infiraastiraakcharii mootummaa'
      }
      // Add more translations as needed
    };

    return benefitTranslations[benefitId]?.[language] || benefitTranslations[benefitId]?.en || benefitId;
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const PREMIUM_CONFIG = {
  constants: PREMIUM_CONSTANTS,
  tiers: PREMIUM_TIERS,
  products: PREMIUM_PRODUCTS,
  bundles: PREMIUM_BUNDLES,
  service: PremiumService
};

export default PREMIUM_CONFIG;