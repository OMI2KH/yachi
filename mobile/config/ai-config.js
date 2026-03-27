// config/ai-config.js

/**
 * ENTERPRISE-GRADE AI CONFIGURATION
 * Yachi Construction & Services Platform
 * Advanced AI-Powered Construction Management
 * Ethiopian Market Optimized AI Models
 */

import { Platform } from 'react-native';
import Config from './app';
import { storage } from '../utils/storage';
import { analyticsService } from '../services/analytics-service';

// AI Service Providers Configuration
const AI_PROVIDERS = {
  OPEN_AI: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: {
      GPT4: 'gpt-4',
      GPT4_TURBO: 'gpt-4-turbo-preview',
      GPT3_TURBO: 'gpt-3.5-turbo',
      EMBEDDINGS: 'text-embedding-ada-002',
    },
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 30000,
  },
  AZURE_OPENAI: {
    name: 'Azure OpenAI',
    baseURL: process.env.EXPO_PUBLIC_AZURE_OPENAI_ENDPOINT,
    models: {
      GPT4: 'gpt-4',
      GPT4_TURBO: 'gpt-4-turbo',
      GPT3_TURBO: 'gpt-35-turbo',
    },
    apiVersion: '2024-02-01',
    timeout: 35000,
  },
  GOOGLE_AI: {
    name: 'Google AI',
    baseURL: 'https://generativelanguage.googleapis.com/v1',
    models: {
      GEMINI_PRO: 'gemini-pro',
      GEMINI_VISION: 'gemini-pro-vision',
      EMBEDDINGS: 'embedding-001',
    },
    timeout: 25000,
  },
  LOCAL_AI: {
    name: 'Local AI',
    baseURL: process.env.EXPO_PUBLIC_LOCAL_AI_ENDPOINT || 'http://localhost:8080',
    models: {
      CONSTRUCTION_SPECIALIZED: 'construction-specialist',
      WORKER_MATCHING: 'worker-matcher',
      BUDGET_OPTIMIZER: 'budget-optimizer',
    },
    timeout: 45000,
  },
};

// AI Model Configuration for Construction
const CONSTRUCTION_MODELS = {
  WORKER_MATCHING: {
    name: 'Worker Matching AI',
    provider: 'OPEN_AI',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: `You are an expert construction project manager specializing in Ethiopian construction projects. 
    Your task is to match construction workers with projects based on skills, location, experience, and project requirements.
    
    Ethiopian Construction Context:
    - Consider regional expertise (Addis Ababa, Dire Dawa, Mekelle, etc.)
    - Understand local construction techniques and materials
    - Factor in language preferences (Amharic, Oromo, English)
    - Consider cultural and religious work schedules
    - Account for local wage expectations and market rates
    
    Always prioritize:
    1. Safety certifications and training
    2. Proven experience with similar projects
    3. Location proximity to reduce travel time
    4. Worker ratings and reliability scores
    5. Specialized skills for project requirements`,
    
    responseFormat: {
      type: 'json',
      schema: {
        matchedWorkers: [
          {
            workerId: 'string',
            matchScore: 'number (0-100)',
            confidence: 'number (0-1)',
            skillsMatch: 'array of strings',
            locationScore: 'number (0-100)',
            experienceScore: 'number (0-100)',
            availabilityScore: 'number (0-100)',
            recommendedRole: 'string',
            estimatedProductivity: 'number (0-1)',
            wageRecommendation: 'number (ETB)',
          }
        ],
        alternativeMatches: 'array',
        reasoning: 'string',
        improvementSuggestions: 'array of strings',
      }
    }
  },

  PROJECT_SCOPING: {
    name: 'Project Scoping AI',
    provider: 'OPEN_AI',
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are an expert construction estimator and project planner for Ethiopian construction projects.
    Analyze project requirements and provide detailed scoping, timeline, and resource estimates.
    
    Ethiopian Construction Factors:
    - Local material costs and availability
    - Seasonal weather patterns (rainy season impacts)
    - Local labor productivity rates
    - Ethiopian building codes and regulations
    - Cultural and religious holiday schedules
    - Transportation logistics in Ethiopian cities
    
    Provide comprehensive project analysis including:
    - Detailed cost breakdown in ETB
    - Realistic timeline with milestones
    - Resource allocation recommendations
    - Risk assessment and mitigation strategies
    - Local supplier recommendations`,
  },

  BUDGET_OPTIMIZATION: {
    name: 'Budget Optimization AI',
    provider: 'AZURE_OPENAI',
    model: 'gpt-4',
    temperature: 0.1,
    maxTokens: 3072,
    systemPrompt: `You are a construction budget optimization specialist for Ethiopian projects.
    Optimize construction budgets while maintaining quality and compliance with local standards.
    
    Ethiopian Budget Considerations:
    - Current market rates for materials in different regions
    - Labor costs across Ethiopian cities
    - Equipment rental and transportation costs
    - Government taxes and fees
    - Currency exchange considerations
    - Seasonal price fluctuations
    
    Optimization Strategies:
    - Local material alternatives
    - Efficient labor allocation
    - Bulk purchasing opportunities
    - Waste reduction techniques
    - Energy efficiency improvements`,
  },

  SAFETY_ANALYSIS: {
    name: 'Safety Analysis AI',
    provider: 'GOOGLE_AI',
    model: 'gemini-pro',
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: `You are a construction safety expert specializing in Ethiopian construction sites.
    Analyze project plans and identify potential safety hazards and compliance issues.
    
    Ethiopian Safety Standards:
    - Ethiopian Construction Safety Regulations
    - Local environmental considerations
    - Common safety issues in Ethiopian construction
    - Emergency response protocols in Ethiopia
    - Local health and safety training requirements`,
  },

  PROGRESS_PREDICTION: {
    name: 'Progress Prediction AI',
    provider: 'LOCAL_AI',
    model: 'construction-specialist',
    temperature: 0.2,
    maxTokens: 1024,
    systemPrompt: `Predict construction project progress and identify potential delays based on:
    - Current progress metrics
    - Weather patterns in Ethiopia
    - Material delivery schedules
    - Workforce productivity
    - Historical project data from Ethiopian context`,
  },
};

// AI Worker Matching Algorithm Configuration
const WORKER_MATCHING_CONFIG = {
  // Scoring Weights
  weights: {
    skills: 0.35,
    location: 0.25,
    experience: 0.20,
    ratings: 0.15,
    availability: 0.05,
  },

  // Location Scoring
  locationScoring: {
    maxDistance: 100, // km
    preferredDistance: 20, // km
    distanceDecay: 'exponential',
    regionalBonus: {
      'addis_ababa': 1.1,
      'dire_dawa': 1.05,
      'mekelle': 1.05,
      'bahir_dar': 1.03,
      'hawassa': 1.03,
      'other': 1.0,
    },
  },

  // Skill Matching
  skillMatching: {
    requiredSkillsWeight: 2.0,
    preferredSkillsWeight: 1.5,
    bonusSkillsWeight: 1.2,
    skillLevelMultiplier: {
      'beginner': 0.6,
      'intermediate': 0.8,
      'advanced': 1.0,
      'expert': 1.2,
    },
  },

  // Experience Scoring
  experienceScoring: {
    yearsMultiplier: 0.1, // per year
    maxYears: 10,
    projectTypeBonus: {
      'residential': 1.1,
      'commercial': 1.2,
      'government': 1.3,
      'infrastructure': 1.4,
    },
  },

  // Availability Scoring
  availabilityScoring: {
    immediateAvailability: 1.0,
    withinWeek: 0.8,
    withinMonth: 0.6,
    beyondMonth: 0.3,
  },
};

// AI Construction Project Types
const CONSTRUCTION_PROJECT_TYPES = {
  RESIDENTIAL: {
    name: 'Residential Building',
    complexity: 'medium',
    teamSize: {
      min: 3,
      max: 15,
      optimal: 8,
    },
    duration: {
      min: 30, // days
      max: 180,
      average: 90,
    },
    requiredSkills: ['masonry', 'carpentry', 'electrical', 'plumbing'],
    specializedSkills: ['finishing', 'painting', 'tiling'],
  },

  COMMERCIAL: {
    name: 'Commercial Building',
    complexity: 'high',
    teamSize: {
      min: 8,
      max: 50,
      optimal: 25,
    },
    duration: {
      min: 90,
      max: 365,
      average: 180,
    },
    requiredSkills: ['structural_engineering', 'project_management', 'advanced_electrical'],
    specializedSkills: ['hvac', 'elevator_installation', 'security_systems'],
  },

  GOVERNMENT: {
    name: 'Government Infrastructure',
    complexity: 'very_high',
    teamSize: {
      min: 15,
      max: 200,
      optimal: 75,
    },
    duration: {
      min: 180,
      max: 730,
      average: 365,
    },
    requiredSkills: ['civil_engineering', 'safety_management', 'quality_control'],
    specializedSkills: ['road_construction', 'bridge_work', 'public_works'],
  },

  RENOVATION: {
    name: 'Building Renovation',
    complexity: 'variable',
    teamSize: {
      min: 2,
      max: 10,
      optimal: 5,
    },
    duration: {
      min: 14,
      max: 90,
      average: 45,
    },
    requiredSkills: ['demolition', 'repair_work', 'modernization'],
    specializedSkills: ['heritage_preservation', 'energy_upgrades'],
  },
};

// AI Feature Flags
const AI_FEATURE_FLAGS = {
  ENABLE_AI_MATCHING: true,
  ENABLE_PROJECT_SCOPING: true,
  ENABLE_BUDGET_OPTIMIZATION: true,
  ENABLE_SAFETY_ANALYSIS: true,
  ENABLE_PROGRESS_PREDICTION: true,
  ENABLE_CHAT_ASSISTANT: true,
  ENABLE_DOCUMENT_ANALYSIS: true,
  ENABLE_IMAGE_RECOGNITION: false, // Coming soon
  ENABLE_VOICE_ASSISTANT: false, // Coming soon
};

// AI Performance Configuration
const AI_PERFORMANCE_CONFIG = {
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  maxConcurrentRequests: 3,
  retryAttempts: 2,
  timeout: 45000,
  fallbackEnabled: true,
  offlineMode: true,
  qualityThreshold: 0.7, // Minimum confidence score
};

// AI Cost Optimization
const AI_COST_CONFIG = {
  maxMonthlyCost: 1000, // USD
  costPerRequest: {
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01,
    'gpt-3.5-turbo': 0.002,
    'gemini-pro': 0.0015,
    'construction-specialist': 0.0005,
  },
  budgetAllocation: {
    worker_matching: 0.35,
    project_scoping: 0.25,
    budget_optimization: 0.20,
    safety_analysis: 0.10,
    progress_prediction: 0.10,
  },
};

// Ethiopian Construction AI Context
const ETHIOPIAN_CONTEXT = {
  regions: {
    ADDIS_ABABA: {
      laborRates: {
        skilled: 450, // ETB per day
        unskilled: 200, // ETB per day
        specialized: 800, // ETB per day
      },
      materialCosts: {
        cement: 550, // ETB per bag
        steel: 18000, // ETB per ton
        sand: 1200, // ETB per cubic meter
      },
      productivity: 1.0, // Base productivity
    },
    DIRE_DAWA: {
      laborRates: {
        skilled: 400,
        unskilled: 180,
        specialized: 700,
      },
      materialCosts: {
        cement: 600,
        steel: 19000,
        sand: 1300,
      },
      productivity: 0.95,
    },
    MEKELLE: {
      laborRates: {
        skilled: 420,
        unskilled: 190,
        specialized: 750,
      },
      materialCosts: {
        cement: 580,
        steel: 18500,
        sand: 1250,
      },
      productivity: 0.92,
    },
  },

  seasonalFactors: {
    RAINY_SEASON: {
      months: [6, 7, 8, 9], // June to September
      productivityImpact: 0.7, // 30% reduction
      costMultiplier: 1.15, // 15% cost increase
    },
    DRY_SEASON: {
      months: [10, 11, 12, 1, 2, 3, 4, 5],
      productivityImpact: 1.0,
      costMultiplier: 1.0,
    },
  },

  culturalConsiderations: {
    holidays: [
      ' Ethiopian Christmas',
      ' Ethiopian Epiphany',
      ' Victory of Adwa',
      ' International Workers Day',
      ' Ethiopian Good Friday',
      ' Ethiopian Easter',
      ' Eid al-Fitr',
      ' Eid al-Adha',
      ' Ethiopian New Year',
      ' Finding of True Cross',
    ],
    workWeek: [0, 1, 2, 3, 4], // Sunday to Thursday
    prayerTimes: true, // Consider prayer times in scheduling
  },
};

class EnterpriseAIConfig {
  constructor() {
    this.environment = Config.environment || 'development';
    this.providers = AI_PROVIDERS;
    this.models = CONSTRUCTION_MODELS;
    this.featureFlags = AI_FEATURE_FLAGS;
    this.performance = AI_PERFORMANCE_CONFIG;
    this.costConfig = AI_COST_CONFIG;
    this.ethiopianContext = ETHIOPIAN_CONTEXT;
    this.workerMatching = WORKER_MATCHING_CONFIG;
    this.projectTypes = CONSTRUCTION_PROJECT_TYPES;

    this.currentProvider = this.getOptimalProvider();
    this.usageMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      lastReset: Date.now(),
    };

    this.initialize();
  }

  /**
   * Initialize AI Configuration
   */
  initialize = async () => {
    await this.loadAISettings();
    await this.initializeProviders();
    this.setupAnalytics();

    if (Config.environment === 'development') {
      console.log('🤖 Enterprise AI Config initialized');
      console.log(`Provider: ${this.currentProvider.name}`);
      console.log(`Active Features: ${Object.keys(this.featureFlags).filter(k => this.featureFlags[k]).length}`);
    }
  };

  /**
   * Get Optimal AI Provider based on environment and requirements
   */
  getOptimalProvider = () => {
    if (this.environment === 'production') {
      return this.providers.AZURE_OPENAI;
    } else if (this.environment === 'staging') {
      return this.providers.OPEN_AI;
    } else {
      // Development - prefer local AI if available
      return this.providers.LOCAL_AI.baseURL ? 
        this.providers.LOCAL_AI : this.providers.OPEN_AI;
    }
  };

  /**
   * Load AI Settings from Storage
   */
  loadAISettings = async () => {
    try {
      const savedSettings = await storage.getItem('ai_settings');
      if (savedSettings) {
        this.featureFlags = { ...this.featureFlags, ...savedSettings.featureFlags };
        this.currentProvider = savedSettings.currentProvider || this.currentProvider;
      }

      // Load usage metrics
      const savedMetrics = await storage.getItem('ai_usage_metrics');
      if (savedMetrics) {
        this.usageMetrics = { ...this.usageMetrics, ...savedMetrics };
      }
    } catch (error) {
      console.warn('Failed to load AI settings:', error);
    }
  };

  /**
   * Initialize AI Providers
   */
  initializeProviders = async () => {
    const providers = Object.values(this.providers);
    
    for (const provider of providers) {
      try {
        await this.validateProvider(provider);
        
        if (this.environment === 'development') {
          console.log(`✅ ${provider.name} provider validated`);
        }
      } catch (error) {
        console.warn(`❌ ${provider.name} provider validation failed:`, error);
      }
    }
  };

  /**
   * Validate AI Provider Configuration
   */
  validateProvider = async (provider) => {
    // Check if provider has required configuration
    if (!provider.baseURL && provider.name !== 'Local AI') {
      throw new Error(`Missing baseURL for ${provider.name}`);
    }

    // Validate API keys for external providers
    if (provider.name !== 'Local AI') {
      const apiKey = await this.getProviderAPIKey(provider.name);
      if (!apiKey) {
        throw new Error(`Missing API key for ${provider.name}`);
      }
    }

    return true;
  };

  /**
   * Get Provider API Key
   */
  getProviderAPIKey = async (providerName) => {
    const keyName = `AI_${providerName.toUpperCase()}_API_KEY`;
    return process.env[`EXPO_PUBLIC_${keyName}`] || await storage.getItem(keyName.toLowerCase());
  };

  /**
   * Setup AI Analytics
   */
  setupAnalytics = () => {
    // Track AI feature usage
    analyticsService.trackEvent('ai_config_initialized', {
      provider: this.currentProvider.name,
      activeFeatures: Object.keys(this.featureFlags).filter(k => this.featureFlags[k]),
      environment: this.environment,
    });
  };

  /**
   * Get Model Configuration
   */
  getModelConfig = (modelType) => {
    const modelConfig = this.models[modelType];
    if (!modelConfig) {
      throw new Error(`Model configuration not found: ${modelType}`);
    }

    const provider = this.providers[modelConfig.provider];
    return {
      ...modelConfig,
      provider: provider,
      fullConfig: {
        ...modelConfig,
        providerConfig: provider,
      },
    };
  };

  /**
   * Update Feature Flags
   */
  updateFeatureFlags = async (updates) => {
    this.featureFlags = { ...this.featureFlags, ...updates };
    
    // Persist to storage
    await storage.setItem('ai_settings', {
      featureFlags: this.featureFlags,
      currentProvider: this.currentProvider,
    });

    // Track changes
    analyticsService.trackEvent('ai_feature_flags_updated', {
      updates: Object.keys(updates),
      newFlags: this.featureFlags,
    });
  };

  /**
   * Track AI Usage
   */
  trackUsage = (modelType, cost, success = true) => {
    this.usageMetrics.totalRequests++;
    
    if (success) {
      this.usageMetrics.successfulRequests++;
    } else {
      this.usageMetrics.failedRequests++;
    }

    this.usageMetrics.totalCost += cost;

    // Reset monthly if needed
    if (Date.now() - this.usageMetrics.lastReset > 30 * 24 * 60 * 60 * 1000) {
      this.resetUsageMetrics();
    }

    // Persist metrics
    this.saveUsageMetrics();

    // Analytics
    analyticsService.trackEvent('ai_usage', {
      modelType,
      cost,
      success,
      totalRequests: this.usageMetrics.totalRequests,
      monthlyCost: this.usageMetrics.totalCost,
    });
  };

  /**
   * Reset Usage Metrics
   */
  resetUsageMetrics = () => {
    this.usageMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      lastReset: Date.now(),
    };
  };

  /**
   * Save Usage Metrics to Storage
   */
  saveUsageMetrics = async () => {
    try {
      await storage.setItem('ai_usage_metrics', this.usageMetrics);
    } catch (error) {
      console.warn('Failed to save AI usage metrics:', error);
    }
  };

  /**
   * Get Cost Estimate for Request
   */
  getCostEstimate = (modelType, inputTokens, outputTokens) => {
    const modelConfig = this.getModelConfig(modelType);
    const costPerToken = this.costConfig.costPerRequest[modelConfig.model];
    
    if (!costPerToken) {
      return 0; // Free or unknown cost
    }

    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * costPerToken; // Cost is typically per 1K tokens
  };

  /**
   * Check if AI Feature is Available
   */
  isFeatureAvailable = (feature) => {
    return this.featureFlags[feature] && this.currentProvider;
  };

  /**
   * Get Ethiopian Regional Context
   */
  getRegionalContext = (region) => {
    return this.ethiopianContext.regions[region] || this.ethiopianContext.regions.ADDIS_ABABA;
  };

  /**
   * Get Seasonal Multipliers
   */
  getSeasonalMultipliers = () => {
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed
    const isRainySeason = this.ethiopianContext.seasonalFactors.RAINY_SEASON.months.includes(currentMonth);
    
    return isRainySeason ? 
      this.ethiopianContext.seasonalFactors.RAINY_SEASON :
      this.ethiopianContext.seasonalFactors.DRY_SEASON;
  };

  /**
   * Get Project Type Configuration
   */
  getProjectTypeConfig = (projectType) => {
    return this.projectTypes[projectType] || this.projectTypes.RESIDENTIAL;
  };

  /**
   * Get Worker Matching Configuration
   */
  getWorkerMatchingConfig = () => {
    return this.workerMatching;
  };

  /**
   * Get Complete AI Configuration
   */
  getConfig = () => ({
    environment: this.environment,
    currentProvider: this.currentProvider,
    featureFlags: this.featureFlags,
    performance: this.performance,
    costConfig: this.costConfig,
    usageMetrics: this.usageMetrics,
    ethiopianContext: this.ethiopianContext,
    availableModels: Object.keys(this.models),
    availableProjectTypes: Object.keys(this.projectTypes),
  });
}

// Create and export singleton instance
export const aiConfig = new EnterpriseAIConfig();

// Export constants and utilities
export {
  AI_PROVIDERS,
  CONSTRUCTION_MODELS,
  AI_FEATURE_FLAGS,
  AI_PERFORMANCE_CONFIG,
  AI_COST_CONFIG,
  ETHIOPIAN_CONTEXT,
  WORKER_MATCHING_CONFIG,
  CONSTRUCTION_PROJECT_TYPES,
};

export default aiConfig;