/**
 * Yachi - Enterprise Construction Configuration
 * Advanced Construction Project Management & Ethiopian Market Specialization
 * @version 1.0.0
 */

const config = {
  // Construction System Configuration
  system: {
    enabled: process.env.CONSTRUCTION_ENABLED === 'true',
    version: '3.2.0',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    
    // Performance Settings
    maxConcurrentProjects: 100,
    projectProcessingInterval: 30000, // 30 seconds
    workerAssignmentTimeout: 3600000, // 1 hour
    realTimeUpdates: true,
    
    // Safety & Compliance
    safetyProtocols: {
      enabled: true,
      mandatoryTraining: true,
      safetyEquipment: true,
      dailySafetyBriefings: true
    }
  },

  // Project Types & Classifications
  projectTypes: {
    'new-building-residential': {
      name: 'New Residential Building',
      category: 'residential',
      complexity: 'high',
      teamComposition: {
        masons: 0.35,
        carpenters: 0.20,
        electricians: 0.15,
        plumbers: 0.15,
        steelFixers: 0.10,
        others: 0.05
      },
      durationFactors: {
        baseDaysPer100Sqm: 45,
        floorMultiplier: 1.15,
        qualityMultiplier: {
          'economy': 0.8,
          'standard': 1.0,
          'premium': 1.3,
          'luxury': 1.6
        }
      },
      budgetAllocation: {
        labor: 0.35,
        materials: 0.45,
        equipment: 0.08,
        transportation: 0.05,
        contingency: 0.07
      },
      requiredPermits: ['building-permit', 'environmental-impact', 'safety-certificate']
    },

    'new-building-commercial': {
      name: 'New Commercial Building',
      category: 'commercial',
      complexity: 'very-high',
      teamComposition: {
        masons: 0.30,
        carpenters: 0.15,
        electricians: 0.20,
        plumbers: 0.15,
        steelFixers: 0.12,
        heavyEquipmentOperators: 0.05,
        others: 0.03
      },
      durationFactors: {
        baseDaysPer100Sqm: 60,
        floorMultiplier: 1.20,
        qualityMultiplier: {
          'economy': 0.9,
          'standard': 1.0,
          'premium': 1.4,
          'luxury': 1.8
        }
      },
      budgetAllocation: {
        labor: 0.30,
        materials: 0.48,
        equipment: 0.10,
        transportation: 0.04,
        contingency: 0.08
      },
      requiredPermits: ['commercial-permit', 'zoning-approval', 'fire-safety', 'environmental-impact']
    },

    'building-finishing': {
      name: 'Building Finishing Work',
      category: 'finishing',
      complexity: 'medium',
      teamComposition: {
        painters: 0.25,
        tilers: 0.20,
        carpenters: 0.25,
        electricians: 0.15,
        plumbers: 0.10,
        others: 0.05
      },
      durationFactors: {
        baseDaysPer100Sqm: 25,
        floorMultiplier: 1.05,
        qualityMultiplier: {
          'basic': 0.7,
          'standard': 1.0,
          'premium': 1.4
        }
      },
      budgetAllocation: {
        labor: 0.40,
        materials: 0.50,
        equipment: 0.04,
        transportation: 0.03,
        contingency: 0.03
      },
      requiredPermits: ['finishing-permit', 'quality-certificate']
    },

    'government-infrastructure': {
      name: 'Government Infrastructure',
      category: 'infrastructure',
      complexity: 'very-high',
      teamComposition: {
        civilEngineers: 0.10,
        masons: 0.25,
        steelFixers: 0.15,
        heavyEquipmentOperators: 0.20,
        electricians: 0.15,
        plumbers: 0.10,
        others: 0.05
      },
      durationFactors: {
        baseDaysPer100Sqm: 90,
        complexityMultiplier: 1.5,
        approvalMultiplier: 1.3
      },
      budgetAllocation: {
        labor: 0.25,
        materials: 0.40,
        equipment: 0.15,
        transportation: 0.08,
        contingency: 0.12
      },
      requiredPermits: ['government-approval', 'environmental-clearance', 'safety-audit', 'quality-assurance']
    },

    'renovation-remodeling': {
      name: 'Renovation & Remodeling',
      category: 'renovation',
      complexity: 'medium',
      teamComposition: {
        demolitionExperts: 0.15,
        masons: 0.25,
        carpenters: 0.20,
        electricians: 0.15,
        plumbers: 0.15,
        painters: 0.10
      },
      durationFactors: {
        baseDaysPer100Sqm: 35,
        complexityMultiplier: 1.2,
        existingConditionMultiplier: 1.1
      },
      budgetAllocation: {
        labor: 0.38,
        materials: 0.45,
        equipment: 0.06,
        transportation: 0.04,
        contingency: 0.07
      },
      requiredPermits: ['renovation-permit', 'structural-approval']
    }
  },

  // Worker Roles & Ethiopian Market Rates
  workerRoles: {
    'mason': {
      name: 'Mason',
      category: 'skilled',
      experienceLevels: {
        'apprentice': { rate: 300, efficiency: 0.6 },
        'journeyman': { rate: 550, efficiency: 0.85 },
        'master': { rate: 800, efficiency: 1.2 }
      },
      requiredCertifications: ['masonry-certificate'],
      skills: ['brick-laying', 'concrete-work', 'plastering', 'block-work'],
      tools: ['trowel', 'level', 'hammer', 'measuring-tape']
    },

    'carpenter': {
      name: 'Carpenter',
      category: 'skilled',
      experienceLevels: {
        'apprentice': { rate: 350, efficiency: 0.6 },
        'journeyman': { rate: 600, efficiency: 0.9 },
        'master': { rate: 900, efficiency: 1.3 }
      },
      requiredCertifications: ['carpentry-certificate'],
      skills: ['wood-work', 'formwork', 'furniture', 'roofing'],
      tools: ['saw', 'hammer', 'level', 'measuring-tape']
    },

    'electrician': {
      name: 'Electrician',
      category: 'technical',
      experienceLevels: {
        'apprentice': { rate: 400, efficiency: 0.5 },
        'licensed': { rate: 750, efficiency: 1.0 },
        'master': { rate: 1000, efficiency: 1.4 }
      },
      requiredCertifications: ['electrical-license', 'safety-certificate'],
      skills: ['wiring', 'installation', 'maintenance', 'troubleshooting'],
      tools: ['multimeter', 'wire-strippers', 'screwdrivers']
    },

    'plumber': {
      name: 'Plumber',
      category: 'technical',
      experienceLevels: {
        'apprentice': { rate: 350, efficiency: 0.5 },
        'licensed': { rate: 700, efficiency: 1.0 },
        'master': { rate: 950, efficiency: 1.3 }
      },
      requiredCertifications: ['plumbing-license'],
      skills: ['piping', 'installation', 'repair', 'drainage'],
      tools: ['pipe-wrench', 'cutter', 'threader']
    },

    'steel-fixer': {
      name: 'Steel Fixer',
      category: 'skilled',
      experienceLevels: {
        'apprentice': { rate: 320, efficiency: 0.6 },
        'journeyman': { rate: 580, efficiency: 0.9 },
        'master': { rate: 850, efficiency: 1.2 }
      },
      requiredCertifications: ['steel-work-certificate'],
      skills: ['rebar-work', 'steel-structures', 'welding'],
      tools: ['rebar-cutter', 'bender', 'welding-machine']
    },

    'heavy-equipment-operator': {
      name: 'Heavy Equipment Operator',
      category: 'specialized',
      experienceLevels: {
        'trained': { rate: 600, efficiency: 0.8 },
        'certified': { rate: 900, efficiency: 1.1 },
        'expert': { rate: 1500, efficiency: 1.5 }
      },
      requiredCertifications: ['equipment-license', 'safety-certificate'],
      skills: ['excavator', 'bulldozer', 'crane', 'loader'],
      tools: ['heavy-equipment']
    },

    'civil-engineer': {
      name: 'Civil Engineer',
      category: 'professional',
      experienceLevels: {
        'graduate': { rate: 1200, efficiency: 0.9 },
        'licensed': { rate: 2000, efficiency: 1.2 },
        'senior': { rate: 3000, efficiency: 1.5 }
      },
      requiredCertifications: ['engineering-license', 'professional-certificate'],
      skills: ['design', 'supervision', 'quality-control', 'project-management'],
      tools: ['cad-software', 'survey-equipment']
    }
  },

  // Ethiopian Regional Configuration
  regions: {
    'addis-ababa': {
      name: 'Addis Ababa',
      costMultiplier: 1.25,
      availabilityMultiplier: 1.1,
      productivityMultiplier: 1.15,
      materialCostMultiplier: 1.1,
      workerPool: {
        masons: 1500,
        carpenters: 1200,
        electricians: 800,
        plumbers: 700,
        steelFixers: 600,
        heavyEquipmentOperators: 200,
        civilEngineers: 300
      }
    },

    'oromia': {
      name: 'Oromia',
      costMultiplier: 1.0,
      availabilityMultiplier: 0.9,
      productivityMultiplier: 1.0,
      materialCostMultiplier: 0.9,
      workerPool: {
        masons: 2500,
        carpenters: 1800,
        electricians: 600,
        plumbers: 500,
        steelFixers: 400,
        heavyEquipmentOperators: 150,
        civilEngineers: 200
      }
    },

    'amhara': {
      name: 'Amhara',
      costMultiplier: 1.0,
      availabilityMultiplier: 0.9,
      productivityMultiplier: 1.0,
      materialCostMultiplier: 0.9,
      workerPool: {
        masons: 2200,
        carpenters: 1600,
        electricians: 550,
        plumbers: 450,
        steelFixers: 350,
        heavyEquipmentOperators: 120,
        civilEngineers: 180
      }
    },

    'snnpr': {
      name: 'SNNPR',
      costMultiplier: 0.9,
      availabilityMultiplier: 0.8,
      productivityMultiplier: 0.9,
      materialCostMultiplier: 0.85,
      workerPool: {
        masons: 1800,
        carpenters: 1400,
        electricians: 400,
        plumbers: 350,
        steelFixers: 300,
        heavyEquipmentOperators: 100,
        civilEngineers: 150
      }
    },

    'tigray': {
      name: 'Tigray',
      costMultiplier: 0.9,
      availabilityMultiplier: 0.8,
      productivityMultiplier: 0.9,
      materialCostMultiplier: 0.85,
      workerPool: {
        masons: 1200,
        carpenters: 900,
        electricians: 300,
        plumbers: 250,
        steelFixers: 200,
        heavyEquipmentOperators: 80,
        civilEngineers: 120
      }
    }
  },

  // Material Costs (ETB) - Ethiopian Market
  materials: {
    'cement': {
      name: 'Cement (50kg)',
      unit: 'bag',
      cost: 450,
      regionalVariation: 0.1,
      qualityGrades: {
        'standard': 450,
        'premium': 550
      }
    },

    'steel-rebar': {
      name: 'Steel Rebar',
      unit: 'kg',
      cost: 65,
      regionalVariation: 0.15,
      qualityGrades: {
        'standard': 65,
        'premium': 80
      }
    },

    'sand': {
      name: 'Sand',
      unit: 'cubic-meter',
      cost: 800,
      regionalVariation: 0.2,
      qualityGrades: {
        'river': 800,
        'quarry': 700
      }
    },

    'aggregate': {
      name: 'Aggregate',
      unit: 'cubic-meter',
      cost: 900,
      regionalVariation: 0.15,
      qualityGrades: {
        'standard': 900,
        'washed': 1100
      }
    },

    'bricks': {
      name: 'Bricks',
      unit: 'piece',
      cost: 4.5,
      regionalVariation: 0.25,
      qualityGrades: {
        'local': 4.5,
        'factory': 6.0
      }
    },

    'paint': {
      name: 'Paint',
      unit: 'liter',
      cost: 180,
      regionalVariation: 0.1,
      qualityGrades: {
        'economy': 150,
        'standard': 180,
        'premium': 250
      }
    }
  },

  // Equipment Rental Rates (ETB per day)
  equipment: {
    'excavator': {
      name: 'Excavator',
      dailyRate: 5000,
      operatorIncluded: false,
      fuelConsumption: 25, // liters per day
      maintenanceCost: 500
    },

    'concrete-mixer': {
      name: 'Concrete Mixer',
      dailyRate: 1200,
      operatorIncluded: true,
      fuelConsumption: 8,
      maintenanceCost: 150
    },

    'crane': {
      name: 'Crane',
      dailyRate: 8000,
      operatorIncluded: false,
      fuelConsumption: 30,
      maintenanceCost: 800
    },

    'bulldozer': {
      name: 'Bulldozer',
      dailyRate: 6000,
      operatorIncluded: false,
      fuelConsumption: 35,
      maintenanceCost: 600
    },

    'compactor': {
      name: 'Compactor',
      dailyRate: 1500,
      operatorIncluded: true,
      fuelConsumption: 10,
      maintenanceCost: 200
    }
  },

  // Project Phases & Milestones
  projectPhases: {
    'planning': {
      name: 'Planning Phase',
      durationPercentage: 0.05,
      activities: ['site-survey', 'design', 'permits', 'budget-finalization'],
      deliverables: ['approved-design', 'permits', 'project-plan']
    },

    'site-preparation': {
      name: 'Site Preparation',
      durationPercentage: 0.10,
      activities: ['clearing', 'excavation', 'leveling', 'utilities'],
      deliverables: ['prepared-site', 'utility-connections']
    },

    'foundation': {
      name: 'Foundation Work',
      durationPercentage: 0.15,
      activities: ['footings', 'slab', 'waterproofing', 'backfill'],
      deliverables: ['completed-foundation', 'waterproofing-certificate']
    },

    'structure': {
      name: 'Structural Work',
      durationPercentage: 0.35,
      activities: ['columns', 'beams', 'slabs', 'walls', 'roof'],
      deliverables: ['structural-completion', 'safety-inspection']
    },

    'finishing': {
      name: 'Finishing Work',
      durationPercentage: 0.25,
      activities: ['plastering', 'painting', 'flooring', 'electrical', 'plumbing'],
      deliverables: ['interior-completion', 'fixtures-installation']
    },

    'commissioning': {
      name: 'Commissioning',
      durationPercentage: 0.10,
      activities: ['final-inspection', 'testing', 'handover', 'documentation'],
      deliverables: ['project-completion', 'handover-documents']
    }
  },

  // Quality Standards & Compliance
  qualityStandards: {
    'ethiopian-building-code': {
      name: 'Ethiopian Building Code',
      version: '2023',
      requirements: ['structural-safety', 'fire-safety', 'accessibility', 'environmental']
    },

    'international-standards': {
      name: 'International Standards',
      standards: ['ISO-9001', 'ISO-14001', 'OSHA-standards']
    },

    'safety-regulations': {
      name: 'Safety Regulations',
      requirements: ['ppe-requirement', 'safety-training', 'emergency-procedures', 'site-safety']
    }
  },

  // AI Matching Configuration
  aiMatching: {
    enabled: true,
    algorithm: 'weighted-scoring',
    
    scoringWeights: {
      skillMatch: 0.30,
      locationProximity: 0.20,
      ratingScore: 0.15,
      availability: 0.15,
      costEfficiency: 0.10,
      experienceLevel: 0.10
    },

    thresholds: {
      minimumSkillMatch: 0.7,
      maximumDistance: 75, // kilometers
      minimumRating: 3.0,
      responseTime: 24 // hours
    },

    fallbackStrategies: {
      'skill-based': { priority: 1 },
      'location-based': { priority: 2 },
      'rating-based': { priority: 3 },
      'availability-based': { priority: 4 }
    }
  },

  // Government Project Configuration
  government: {
    enabled: process.env.GOVERNMENT_CONSTRUCTION_ENABLED === 'true',
    
    projectScaling: {
      maxWorkers: 500,
      minSupervisors: 0.05, // 5% of workforce
      qualityControlRatio: 0.03, // 3% QC staff
    },

    compliance: {
      mandatoryInsurance: true,
      safetyAudits: true,
      progressReporting: true,
      environmentalCompliance: true
    },

    approvalProcess: {
      stages: ['submission', 'technical-review', 'budget-approval', 'final-approval'],
      timeline: 30 // days
    }
  }
};

// Utility Functions
const constructionUtils = {
  // Calculate project team composition
  calculateTeamComposition: (projectType, areaSqm, complexity = 'standard') => {
    const typeConfig = config.projectTypes[projectType];
    if (!typeConfig) throw new Error(`Unknown project type: ${projectType}`);

    const baseTeamSize = Math.ceil(areaSqm / 50); // Base calculation
    const composition = {};

    for (const [role, percentage] of Object.entries(typeConfig.teamComposition)) {
      composition[role] = Math.max(1, Math.ceil(baseTeamSize * percentage));
    }

    return composition;
  },

  // Calculate project budget
  calculateProjectBudget: (projectType, areaSqm, quality = 'standard', region = 'addis-ababa') => {
    const typeConfig = config.projectTypes[projectType];
    const regionConfig = config.regions[region];
    
    if (!typeConfig || !regionConfig) {
      throw new Error('Invalid project type or region');
    }

    // Base cost per square meter (ETB)
    const baseCostPerSqm = 15000; // Average base cost
    const qualityMultiplier = typeConfig.durationFactors.qualityMultiplier[quality] || 1.0;
    const regionalMultiplier = regionConfig.costMultiplier;

    const totalBaseCost = areaSqm * baseCostPerSqm * qualityMultiplier * regionalMultiplier;

    // Apply budget allocation
    const budget = {};
    for (const [category, percentage] of Object.entries(typeConfig.budgetAllocation)) {
      budget[category] = Math.round(totalBaseCost * percentage);
    }

    return {
      total: Math.round(totalBaseCost),
      breakdown: budget,
      costPerSqm: Math.round(totalBaseCost / areaSqm)
    };
  },

  // Calculate project duration
  calculateProjectDuration: (projectType, areaSqm, floorCount = 1, complexity = 'medium') => {
    const typeConfig = config.projectTypes[projectType];
    if (!typeConfig) throw new Error(`Unknown project type: ${projectType}`);

    const baseDuration = typeConfig.durationFactors.baseDaysPer100Sqm * (areaSqm / 100);
    const floorAdjusted = baseDuration * Math.pow(typeConfig.durationFactors.floorMultiplier || 1, floorCount - 1);
    
    return Math.ceil(floorAdjusted);
  },

  // Get regional worker availability
  getRegionalAvailability: (region, role) => {
    const regionConfig = config.regions[region];
    if (!regionConfig) return 0;

    return regionConfig.workerPool[role] || 0;
  },

  // Validate project feasibility
  validateProjectFeasibility: (projectType, areaSqm, budget, timeline, region) => {
    const calculatedBudget = constructionUtils.calculateProjectBudget(projectType, areaSqm, 'standard', region);
    const calculatedTimeline = constructionUtils.calculateProjectDuration(projectType, areaSqm);

    const issues = [];

    if (budget < calculatedBudget.total * 0.8) {
      issues.push(`Budget may be insufficient. Recommended: ${calculatedBudget.total} ETB`);
    }

    if (timeline < calculatedTimeline * 0.7) {
      issues.push(`Timeline may be too aggressive. Recommended: ${calculatedTimeline} days`);
    }

    return {
      feasible: issues.length === 0,
      issues: issues,
      recommendations: {
        budget: calculatedBudget.total,
        timeline: calculatedTimeline
      }
    };
  }
};

// Export configuration
module.exports = {
  ...config,
  ...constructionUtils,
  
  // Configuration validation
  validateConfig: () => {
    const errors = [];

    if (!process.env.CONSTRUCTION_ENABLED) {
      errors.push('CONSTRUCTION_ENABLED environment variable is required');
    }

    if (config.system.maxConcurrentProjects > 500) {
      errors.push('maxConcurrentProjects cannot exceed 500');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
};