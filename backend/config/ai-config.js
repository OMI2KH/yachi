/**
 * Yachi - Enterprise AI Configuration
 * AI-Powered Construction Management & Worker Matching System
 * @version 1.0.0
 */

const config = {
  // AI System Configuration
  ai: {
    // Core AI Settings
    enabled: process.env.AI_ENABLED === 'true',
    version: '2.1.0',
    provider: 'openai', // openai, anthropic, local
    model: 'gpt-4-construction-v2',
    fallbackModel: 'gpt-3.5-turbo',
    
    // Performance Settings
    maxConcurrentRequests: 50,
    requestTimeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000,
    
    // Cost Management
    maxMonthlyCost: 1000, // USD
    costTracking: true,
    budgetAlerts: true,
  },

  // Construction AI Configuration
  construction: {
    // Project Types
    projectTypes: {
      'new-building': {
        name: 'New Building Construction',
        complexity: 'high',
        teamSizeMultiplier: 1.2,
        durationMultiplier: 1.5,
        requiredSkills: ['masonry', 'carpentry', 'steel-work', 'electrical', 'plumbing']
      },
      'building-finishing': {
        name: 'Building Finishing Work',
        complexity: 'medium',
        teamSizeMultiplier: 1.0,
        durationMultiplier: 1.0,
        requiredSkills: ['plastering', 'painting', 'tiling', 'electrical-fixtures', 'plumbing-fixtures']
      },
      'government-infrastructure': {
        name: 'Government Infrastructure',
        complexity: 'very-high',
        teamSizeMultiplier: 2.0,
        durationMultiplier: 2.0,
        requiredSkills: ['civil-engineering', 'project-management', 'heavy-equipment', 'safety-compliance']
      },
      'renovation-remodeling': {
        name: 'Renovation & Remodeling',
        complexity: 'medium',
        teamSizeMultiplier: 0.8,
        durationMultiplier: 0.9,
        requiredSkills: ['demolition', 'carpentry', 'electrical', 'plumbing', 'finishing']
      }
    },

    // Worker Roles & Specializations
    workerRoles: {
      'mason': {
        name: 'Mason',
        skills: ['brick-laying', 'concrete-work', 'plastering'],
        experienceLevels: ['apprentice', 'journeyman', 'master'],
        dailyRate: { min: 300, max: 800 }, // ETB
        teamPriority: 1
      },
      'carpenter': {
        name: 'Carpenter',
        skills: ['wood-work', 'formwork', 'furniture'],
        experienceLevels: ['apprentice', 'journeyman', 'master'],
        dailyRate: { min: 350, max: 900 },
        teamPriority: 2
      },
      'electrician': {
        name: 'Electrician',
        skills: ['wiring', 'installation', 'maintenance'],
        experienceLevels: ['apprentice', 'licensed', 'master'],
        dailyRate: { min: 400, max: 1000 },
        teamPriority: 3
      },
      'plumber': {
        name: 'Plumber',
        skills: ['piping', 'installation', 'repair'],
        experienceLevels: ['apprentice', 'licensed', 'master'],
        dailyRate: { min: 350, max: 950 },
        teamPriority: 4
      },
      'steel-fixer': {
        name: 'Steel Fixer',
        skills: ['rebar-work', 'steel-structures'],
        experienceLevels: ['apprentice', 'journeyman', 'master'],
        dailyRate: { min: 320, max: 850 },
        teamPriority: 5
      },
      'heavy-equipment-operator': {
        name: 'Heavy Equipment Operator',
        skills: ['excavator', 'bulldozer', 'crane'],
        experienceLevels: ['trained', 'certified', 'expert'],
        dailyRate: { min: 600, max: 1500 },
        teamPriority: 6
      }
    },

    // AI Matching Algorithms
    matching: {
      // Weighting factors for worker matching (0-1)
      weights: {
        skillMatch: 0.35,
        locationProximity: 0.25,
        ratingScore: 0.20,
        availability: 0.10,
        costEfficiency: 0.10
      },

      // Matching thresholds
      thresholds: {
        minimumSkillMatch: 0.7,
        maximumDistance: 50, // kilometers
        minimumRating: 3.5,
        maximumDailyRate: 2000 // ETB
      },

      // Advanced matching options
      advanced: {
        considerWeather: true,
        considerTraffic: true,
        optimizeForCost: true,
        prioritizeVerified: true,
        balanceWorkload: true
      }
    },

    // Project Calculation Parameters
    calculations: {
      // Team size based on square meters
      teamSizeByArea: {
        small: { min: 0, max: 100, workers: 3 },
        medium: { min: 101, max: 500, workers: 8 },
        large: { min: 501, max: 2000, workers: 15 },
        xlarge: { min: 2001, max: 10000, workers: 30 }
      },

      // Duration estimation (days)
      durationFactors: {
        baseDaysPer100Sqm: 30,
        floorMultiplier: 1.1, // per floor
        complexityMultiplier: {
          'low': 0.8,
          'medium': 1.0,
          'high': 1.3,
          'very-high': 1.7
        },
        weatherFactor: 1.15 // Ethiopia weather consideration
      },

      // Budget calculations
      budget: {
        materialCostMultiplier: 2.5, // Labor cost vs material cost
        contingencyPercentage: 0.15, // 15% contingency
        equipmentRentalPercentage: 0.10, // 10% for equipment
        transportationPercentage: 0.05 // 5% for transportation
      }
    }
  },

  // Government Project AI Configuration
  government: {
    enabled: process.env.GOVERNMENT_AI_ENABLED === 'true',
    
    // Large-scale project parameters
    largeScale: {
      maxWorkersPerProject: 200,
      minWorkersPerRole: 3,
      projectPhases: ['planning', 'site-preparation', 'foundation', 'structure', 'finishing', 'commissioning'],
      
      // Regional distribution
      regionalAllocation: {
        'addis-ababa': { priority: 1, workerPool: 5000 },
        'oromia': { priority: 2, workerPool: 8000 },
        'amhara': { priority: 2, workerPool: 7000 },
        'snnpr': { priority: 3, workerPool: 6000 },
        'tigray': { priority: 3, workerPool: 4000 },
        'other': { priority: 4, workerPool: 10000 }
      }
    },

    // Compliance and regulations
    compliance: {
      safetyStandards: ['ethiopian-construction-standard', 'osha-guidelines'],
      environmentalRegulations: true,
      laborLaws: true,
      qualityAssurance: true
    }
  },

  // Worker Replacement AI Configuration
  replacement: {
    enabled: true,
    
    // Replacement triggers
    triggers: {
      noResponse: { hours: 24, autoReplace: true },
      declined: { immediate: true, autoReplace: true },
      emergency: { immediate: true, priorityReplacement: true },
      performance: { ratingThreshold: 2.5, autoReplace: false }
    },

    // Replacement strategies
    strategies: {
      'skill-based': { priority: 1, fallback: 'location-based' },
      'location-based': { priority: 2, fallback: 'rating-based' },
      'rating-based': { priority: 3, fallback: 'availability-based' },
      'availability-based': { priority: 4, fallback: 'random' }
    }
  },

  // AI Model Prompts & Templates
  prompts: {
    workerMatching: `
      You are Yachi AI Construction Manager. Analyze this construction project and match workers based on:
      
      PROJECT DETAILS:
      - Type: {projectType}
      - Area: {areaSqm} square meters
      - Floors: {floorCount}
      - Location: {location}
      - Budget: {budget} ETB
      - Timeline: {timelineDays} days
      
      WORKER REQUIREMENTS:
      - Required skills: {requiredSkills}
      - Team size: {teamSize}
      - Experience level: {experienceLevel}
      
      MATCHING CRITERIA:
      - Skill match (35%): Workers must have required skills
      - Location (25%): Prefer workers within 50km radius
      - Ratings (20%): Minimum 3.5-star rating
      - Availability (10%): Available for project duration
      - Cost efficiency (10%): Within budget constraints
      
      Return optimal worker matches with confidence scores.
    `,

    teamFormation: `
      Form a complete construction team for {projectType} project.
      
      PROJECT SPECIFICS:
      - Size: {areaSqm} sqm, {floorCount} floors
      - Complexity: {complexity}
      - Location: {location}
      
      TEAM COMPOSITION:
      - Total workers needed: {totalWorkers}
      - Role distribution based on project type
      - Experience level requirements
      - Specialization needs
      
      Consider:
      - Role compatibility
      - Experience balance
      - Cost optimization
      - Timeline constraints
      
      Return team structure with role assignments.
    `,

    budgetOptimization: `
      Optimize construction budget for {projectType} project.
      
      PROJECT PARAMETERS:
      - Total area: {areaSqm} sqm
      - Duration: {timelineDays} days
      - Location: {location}
      - Quality level: {quality}
      
      BUDGET COMPONENTS:
      - Labor costs (worker rates)
      - Material costs (local market prices)
      - Equipment rental
      - Transportation
      - Contingency (15%)
      
      OPTIMIZATION GOALS:
      - Stay within {budget} ETB total
      - Maximize quality within budget
      - Use local materials where possible
      - Optimize worker efficiency
      
      Return detailed budget breakdown.
    `,

    timelinePrediction: `
      Predict construction timeline for {projectType} project.
      
      PROJECT FACTORS:
      - Area: {areaSqm} sqm
      - Floors: {floorCount}
      - Complexity: {complexity}
      - Team size: {teamSize}
      - Location: {location}
      
      TIMELINE CONSIDERATIONS:
      - Base construction time
      - Weather conditions (Ethiopia)
      - Worker productivity
      - Material availability
      - Regulatory approvals
      
      Return realistic timeline with phase breakdown.
    `
  },

  // API Configuration
  api: {
    // OpenAI Configuration
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      baseURL: 'https://api.openai.com/v1',
      endpoints: {
        chat: '/chat/completions',
        embeddings: '/embeddings'
      }
    },

    // Local AI Configuration (Fallback)
    local: {
      enabled: process.env.LOCAL_AI_ENABLED === 'true',
      baseURL: process.env.LOCAL_AI_URL || 'http://localhost:8080',
      model: 'local-construction-model',
      timeout: 45000
    },

    // Monitoring & Analytics
    monitoring: {
      enabled: true,
      logRequests: process.env.NODE_ENV === 'development',
      performanceTracking: true,
      errorTracking: true,
      costTracking: true
    }
  },

  // Feature Flags
  features: {
    // AI Construction Features
    aiConstruction: process.env.FEATURE_AI_CONSTRUCTION === 'true',
    workerMatching: process.env.FEATURE_WORKER_MATCHING === 'true',
    teamFormation: process.env.FEATURE_TEAM_FORMATION === 'true',
    budgetOptimization: process.env.FEATURE_BUDGET_OPTIMIZATION === 'true',
    timelinePrediction: process.env.FEATURE_TIMELINE_PREDICTION === 'true',

    // Government Features
    governmentProjects: process.env.FEATURE_GOVERNMENT_PROJECTS === 'true',
    bulkAssignment: process.env.FEATURE_BULK_ASSIGNMENT === 'true',
    complianceMonitoring: process.env.FEATURE_COMPLIANCE_MONITORING === 'true',

    // Replacement Features
    autoReplacement: process.env.FEATURE_AUTO_REPLACEMENT === 'true',
    smartFallback: process.env.FEATURE_SMART_FALLBACK === 'true',
    performanceTracking: process.env.FEATURE_PERFORMANCE_TRACKING === 'true'
  },

  // Performance Optimization
  performance: {
    cache: {
      enabled: true,
      ttl: 3600, // 1 hour
      maxSize: 1000
    },

    batchProcessing: {
      enabled: true,
      batchSize: 50,
      delay: 100 // ms between batches
    },

    parallelProcessing: {
      enabled: true,
      maxConcurrent: 10
    }
  },

  // Ethiopian Market Specific Configuration
  ethiopia: {
    // Regional considerations
    regions: {
      'addis-ababa': {
        laborCostMultiplier: 1.2,
        materialCostMultiplier: 1.1,
        productivityFactor: 1.1
      },
      'oromia': {
        laborCostMultiplier: 1.0,
        materialCostMultiplier: 0.9,
        productivityFactor: 1.0
      },
      'amhara': {
        laborCostMultiplier: 1.0,
        materialCostMultiplier: 0.9,
        productivityFactor: 1.0
      },
      'other': {
        laborCostMultiplier: 0.9,
        materialCostMultiplier: 0.8,
        productivityFactor: 0.9
      }
    },

    // Ethiopian construction practices
    constructionPractices: {
      typicalWorkHours: 8,
      commonMaterials: ['local-sand', 'ethiopian-cement', 'local-stone'],
      weatherConsiderations: {
        rainySeason: ['June', 'July', 'August', 'September'],
        drySeason: ['October', 'November', 'December', 'January', 'February', 'March', 'April', 'May']
      }
    },

    // Local regulations
    regulations: {
      safety: 'ethiopian-construction-safety-standards',
      environment: 'ethiopian-environmental-protection',
      labor: 'ethiopian-labor-laws-2023'
    }
  }
};

// Validation functions
const validateConfig = () => {
  const errors = [];

  if (!process.env.OPENAI_API_KEY && config.ai.provider === 'openai') {
    errors.push('OPENAI_API_KEY is required when using OpenAI provider');
  }

  if (config.ai.maxConcurrentRequests > 100) {
    errors.push('maxConcurrentRequests cannot exceed 100');
  }

  if (config.construction.matching.thresholds.maximumDistance > 100) {
    errors.push('maximumDistance cannot exceed 100km');
  }

  return errors;
};

// Helper functions
const configHelpers = {
  // Get project type configuration
  getProjectType: (type) => {
    return config.construction.projectTypes[type] || config.construction.projectTypes['new-building'];
  },

  // Get worker role configuration
  getWorkerRole: (role) => {
    return config.construction.workerRoles[role] || null;
  },

  // Calculate team size based on area
  calculateTeamSize: (areaSqm, projectType = 'new-building') => {
    const projectConfig = configHelpers.getProjectType(projectType);
    const areaConfig = config.construction.calculations.teamSizeByArea;
    
    let sizeCategory = 'small';
    if (areaSqm > areaConfig.large.min) sizeCategory = 'xlarge';
    else if (areaSqm > areaConfig.medium.min) sizeCategory = 'large';
    else if (areaSqm > areaConfig.small.min) sizeCategory = 'medium';
    
    const baseSize = areaConfig[sizeCategory].workers;
    return Math.ceil(baseSize * projectConfig.teamSizeMultiplier);
  },

  // Calculate project duration
  calculateDuration: (areaSqm, floorCount, complexity = 'medium', projectType = 'new-building') => {
    const projectConfig = configHelpers.getProjectType(projectType);
    const durationConfig = config.construction.calculations.durationFactors;
    
    const baseDays = (areaSqm / 100) * durationConfig.baseDaysPer100Sqm;
    const floorAdjusted = baseDays * Math.pow(durationConfig.floorMultiplier, floorCount - 1);
    const complexityAdjusted = floorAdjusted * durationConfig.complexityMultiplier[complexity];
    const weatherAdjusted = complexityAdjusted * durationConfig.weatherFactor;
    const projectTypeAdjusted = weatherAdjusted * projectConfig.durationMultiplier;
    
    return Math.ceil(projectTypeAdjusted);
  },

  // Validate if configuration is ready
  isReady: () => {
    const errors = validateConfig();
    return {
      ready: errors.length === 0,
      errors: errors
    };
  }
};

module.exports = {
  ...config,
  ...configHelpers,
  validateConfig
};