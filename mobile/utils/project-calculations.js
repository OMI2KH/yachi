// utils/project-calculations.js
/**
 * Enterprise Project Calculations for Yachi Platform
 * Advanced construction project calculations and AI-powered estimations
 * Version: 2.0.0
 */

import { 
  WORKER_TYPES, 
  CONSTRUCTION_CONSTANTS,
  ETHIOPIAN_CONSTANTS 
} from './constants';
import { calculateDistance, isDuringBusinessHours } from './helpers';

// ===== PROJECT ESTIMATION CONSTANTS =====
const PROJECT_ESTIMATION_CONSTANTS = {
  // Cost per square meter in ETB cents
  CONSTRUCTION_COSTS: {
    RESIDENTIAL: {
      basic: 500000,      // 5,000 ETB/m² - Basic finishing
      standard: 800000,   // 8,000 ETB/m² - Standard finishing
      premium: 1200000,   // 12,000 ETB/m² - Premium finishing
    },
    COMMERCIAL: {
      basic: 1000000,     // 10,000 ETB/m² - Basic commercial
      standard: 1500000,  // 15,000 ETB/m² - Standard commercial
      premium: 2500000,   // 25,000 ETB/m² - Premium commercial
    },
    GOVERNMENT: {
      basic: 1200000,     // 12,000 ETB/m² - Basic infrastructure
      standard: 2000000,  // 20,000 ETB/m² - Standard infrastructure
      premium: 3500000,   // 35,000 ETB/m² - Premium infrastructure
    },
  },

  // Productivity rates (m² per worker per day)
  PRODUCTIVITY_RATES: {
    MASON: 25,           // m² per day for masonry work
    CARPENTER: 15,       // m² per day for carpentry
    PAINTER: 50,         // m² per day for painting
    TILER: 20,          // m² per day for tiling
    STEEL_FIXER: 10,     // m² per day for steel work
    LABORER: 30,         // m² per day for general labor
  },

  // Material cost percentages (of total construction cost)
  MATERIAL_PERCENTAGES: {
    RESIDENTIAL: 0.55,   // 55% materials
    COMMERCIAL: 0.50,    // 50% materials
    GOVERNMENT: 0.45,    // 45% materials
  },

  // Project complexity multipliers
  COMPLEXITY_MULTIPLIERS: {
    low: 0.9,
    medium: 1.0,
    high: 1.3,
    very_high: 1.6,
  },

  // Location adjustment factors
  LOCATION_FACTORS: {
    ADDIS_ABABA: 1.2,
    DIRE_DAWA: 1.0,
    MEKELLE: 1.1,
    GONDAR: 1.0,
    BAHIR_DAR: 1.0,
    HAWASSA: 1.0,
    JIMMA: 0.9,
    ADDAMA: 1.0,
    RURAL: 0.8,
  },
};

// ===== PROJECT BUDGET CALCULATIONS =====

/**
 * Calculate comprehensive project budget
 * @param {Object} project - Project details
 * @returns {Object} Detailed budget breakdown
 */
export const calculateProjectBudget = (project) => {
  const {
    type = 'residential',
    size, // in square meters
    floors = 1,
    quality = 'standard',
    complexity = 'medium',
    location,
    duration, // optional: if provided, used for validation
  } = project;

  // Base construction cost
  const baseCostPerM2 = PROJECT_ESTIMATION_CONSTANTS.CONSTRUCTION_COSTS[type.toUpperCase()]?.[quality] || 
                       PROJECT_ESTIMATION_CONSTANTS.CONSTRUCTION_COSTS.RESIDENTIAL.standard;

  // Apply complexity multiplier
  const complexityMultiplier = PROJECT_ESTIMATION_CONSTANTS.COMPLEXITY_MULTIPLIERS[complexity] || 1.0;

  // Apply location factor
  const locationFactor = location ? 
    (PROJECT_ESTIMATION_CONSTANTS.LOCATION_FACTORS[location.toUpperCase()] || 1.0) : 1.0;

  // Floor multiplier (non-linear due to foundation and roof costs)
  const floorMultiplier = calculateFloorMultiplier(floors);

  // Total construction cost
  const constructionCost = Math.round(size * baseCostPerM2 * complexityMultiplier * locationFactor * floorMultiplier);

  // Material cost (percentage of construction cost)
  const materialPercentage = PROJECT_ESTIMATION_CONSTANTS.MATERIAL_PERCENTAGES[type.toUpperCase()] || 0.5;
  const materialCost = Math.round(constructionCost * materialPercentage);

  // Labor cost (remaining after materials)
  const laborCost = Math.round(constructionCost * (1 - materialPercentage));

  // Additional costs (permits, engineering, etc.)
  const additionalCosts = calculateAdditionalCosts(constructionCost, type, complexity);

  // Contingency (10-20% based on complexity)
  const contingencyPercentage = complexity === 'high' ? 0.2 : complexity === 'very_high' ? 0.25 : 0.1;
  const contingency = Math.round(constructionCost * contingencyPercentage);

  // Total project cost
  const totalCost = constructionCost + additionalCosts + contingency;

  return {
    baseCostPerM2,
    constructionCost,
    materialCost,
    laborCost,
    additionalCosts,
    contingency,
    totalCost,
    breakdown: {
      materials: Math.round(materialCost),
      labor: Math.round(laborCost),
      permits: Math.round(additionalCosts * 0.3),
      engineering: Math.round(additionalCosts * 0.4),
      equipment: Math.round(additionalCosts * 0.3),
      contingency: Math.round(contingency),
    },
    multipliers: {
      complexity: complexityMultiplier,
      location: locationFactor,
      floors: floorMultiplier,
    },
  };
};

/**
 * Calculate floor multiplier for multi-story buildings
 * @param {number} floors - Number of floors
 * @returns {number} Floor multiplier
 */
const calculateFloorMultiplier = (floors) => {
  if (floors <= 1) return 1.0;
  
  // Non-linear scaling due to foundation and structural requirements
  const baseMultiplier = 1.0;
  const additionalFloorMultiplier = 0.15; // 15% additional cost per extra floor
  
  return baseMultiplier + ((floors - 1) * additionalFloorMultiplier);
};

/**
 * Calculate additional project costs
 * @param {number} constructionCost - Base construction cost
 * @param {string} type - Project type
 * @param {string} complexity - Project complexity
 * @returns {number} Additional costs
 */
const calculateAdditionalCosts = (constructionCost, type, complexity) => {
  let additionalPercentage = 0.15; // Base 15%

  // Adjust based on project type
  if (type === 'government') additionalPercentage += 0.05; // More permits and compliance
  if (type === 'commercial') additionalPercentage += 0.03; // Commercial requirements

  // Adjust based on complexity
  if (complexity === 'high') additionalPercentage += 0.05;
  if (complexity === 'very_high') additionalPercentage += 0.10;

  return Math.round(constructionCost * additionalPercentage);
};

// ===== PROJECT DURATION CALCULATIONS =====

/**
 * Calculate project duration based on size and team composition
 * @param {Object} project - Project details
 * @param {Array} team - Team composition
 * @returns {Object} Duration breakdown
 */
export const calculateProjectDuration = (project, team = []) => {
  const {
    size,
    type,
    complexity = 'medium',
    location,
  } = project;

  // Base productivity rate (m² per worker per day)
  const baseProductivity = calculateBaseProductivity(type, complexity);

  // Calculate effective team size
  const effectiveTeamSize = calculateEffectiveTeamSize(team, type);

  // Adjust for project complexity
  const complexityFactor = PROJECT_ESTIMATION_CONSTANTS.COMPLEXITY_MULTIPLIERS[complexity] || 1.0;

  // Calculate base duration
  const baseDurationDays = Math.ceil((size * complexityFactor) / (baseProductivity * effectiveTeamSize));

  // Adjust for weather and holidays
  const adjustedDurationDays = adjustDurationForExternalFactors(baseDurationDays, location);

  // Calculate working days (excluding weekends and holidays)
  const workingDays = calculateWorkingDaysFromDuration(adjustedDurationDays);

  // Calculate calendar days (including weekends and holidays)
  const calendarDays = calculateCalendarDaysFromWorkingDays(workingDays);

  return {
    baseDurationDays,
    adjustedDurationDays,
    workingDays,
    calendarDays,
    teamProductivity: baseProductivity * effectiveTeamSize,
    factors: {
      complexity: complexityFactor,
      teamEfficiency: calculateTeamEfficiency(team),
      externalFactors: adjustedDurationDays / baseDurationDays,
    },
  };
};

/**
 * Calculate base productivity rate for project type
 * @param {string} type - Project type
 * @param {string} complexity - Project complexity
 * @returns {number} Productivity rate (m² per worker per day)
 */
const calculateBaseProductivity = (type, complexity) => {
  const baseRates = {
    residential: 25,
    commercial: 20,
    government: 18,
  };

  const complexityAdjustments = {
    low: 1.1,
    medium: 1.0,
    high: 0.9,
    very_high: 0.8,
  };

  const baseRate = baseRates[type] || baseRates.residential;
  const adjustment = complexityAdjustments[complexity] || 1.0;

  return baseRate * adjustment;
};

/**
 * Calculate effective team size considering worker roles
 * @param {Array} team - Team composition
 * @param {string} type - Project type
 * @returns {number} Effective team size
 */
const calculateEffectiveTeamSize = (team, type) => {
  if (!team.length) {
    // Return default team size based on project type
    const defaultSizes = {
      residential: 5,
      commercial: 8,
      government: 12,
    };
    return defaultSizes[type] || defaultSizes.residential;
  }

  return team.reduce((total, worker) => {
    const workerType = WORKER_TYPES[worker.type];
    const efficiency = workerType ? calculateWorkerEfficiency(workerType, worker.experience) : 1.0;
    return total + efficiency;
  }, 0);
};

/**
 * Calculate individual worker efficiency
 * @param {Object} workerType - Worker type definition
 * @param {number} experience - Years of experience
 * @returns {number} Efficiency multiplier
 */
const calculateWorkerEfficiency = (workerType, experience = 1) => {
  let baseEfficiency = 1.0;

  // Adjust based on worker category
  if (workerType.category === 'professional') baseEfficiency = 1.2;
  if (workerType.category === 'skilled') baseEfficiency = 1.0;
  if (workerType.category === 'labor') baseEfficiency = 0.8;

  // Adjust based on experience
  const experienceMultiplier = Math.min(1.0 + (experience * 0.05), 1.5); // Max 50% boost

  return baseEfficiency * experienceMultiplier;
};

/**
 * Adjust duration for external factors (weather, holidays, etc.)
 * @param {number} baseDuration - Base duration in days
 * @param {string} location - Project location
 * @returns {number} Adjusted duration
 */
const adjustDurationForExternalFactors = (baseDuration, location) => {
  let adjustmentFactor = 1.0;

  // Rainy season adjustment (June-September)
  const currentMonth = new Date().getMonth() + 1;
  if (currentMonth >= 6 && currentMonth <= 9) {
    adjustmentFactor += 0.2; // 20% longer during rainy season
  }

  // Location-specific adjustments
  if (location === 'ADDIS_ABABA') {
    adjustmentFactor += 0.1; // Traffic and urban challenges
  }

  return Math.ceil(baseDuration * adjustmentFactor);
};

/**
 * Calculate working days from duration
 * @param {number} durationDays - Total duration in calendar days
 * @returns {number} Working days
 */
const calculateWorkingDaysFromDuration = (durationDays) => {
  // Assume 5 working days per week (Monday-Friday)
  const weeks = Math.floor(durationDays / 7);
  const remainingDays = durationDays % 7;

  const workingDays = (weeks * 5) + Math.min(remainingDays, 5);
  return workingDays;
};

/**
 * Calculate calendar days from working days
 * @param {number} workingDays - Number of working days
 * @returns {number} Calendar days
 */
const calculateCalendarDaysFromWorkingDays = (workingDays) => {
  const weeks = Math.floor(workingDays / 5);
  const remainingDays = workingDays % 5;

  return (weeks * 7) + remainingDays;
};

// ===== TEAM OPTIMIZATION CALCULATIONS =====

/**
 * Optimize team composition for project
 * @param {Object} project - Project details
 * @param {Array} availableWorkers - Available workers pool
 * @returns {Object} Optimized team composition
 */
export const optimizeTeamComposition = (project, availableWorkers = []) => {
  const {
    type,
    size,
    complexity,
    budget,
    location,
  } = project;

  // Calculate required team size
  const requiredTeam = calculateRequiredTeam(type, size, complexity);

  // Filter and rank available workers
  const rankedWorkers = rankWorkersForProject(availableWorkers, project, requiredTeam);

  // Optimize team within budget constraints
  const optimizedTeam = optimizeTeamWithinBudget(rankedWorkers, budget, requiredTeam);

  // Calculate team metrics
  const teamMetrics = calculateTeamMetrics(optimizedTeam, project);

  return {
    team: optimizedTeam,
    metrics: teamMetrics,
    requirements: requiredTeam,
    coverage: calculateRequirementCoverage(optimizedTeam, requiredTeam),
  };
};

/**
 * Calculate required team composition based on project parameters
 * @param {string} type - Project type
 * @param {number} size - Project size in m²
 * @param {string} complexity - Project complexity
 * @returns {Object} Required team composition
 */
const calculateRequiredTeam = (type, size, complexity) => {
  const baseRequirements = {
    residential: {
      project_manager: 1,
      foreman: 1,
      mason: Math.ceil(size / 200),
      carpenter: Math.ceil(size / 300),
      electrician: 1,
      plumber: 1,
      laborer: Math.ceil(size / 150),
    },
    commercial: {
      project_manager: 1,
      engineer: 1,
      architect: 1,
      foreman: 1,
      mason: Math.ceil(size / 150),
      steel_fixer: Math.ceil(size / 100),
      carpenter: Math.ceil(size / 250),
      electrician: Math.ceil(size / 500),
      plumber: Math.ceil(size / 500),
      laborer: Math.ceil(size / 100),
    },
    government: {
      project_manager: 1,
      engineer: 2,
      architect: 1,
      foreman: 2,
      mason: Math.ceil(size / 100),
      steel_fixer: Math.ceil(size / 80),
      carpenter: Math.ceil(size / 200),
      electrician: Math.ceil(size / 400),
      plumber: Math.ceil(size / 400),
      laborer: Math.ceil(size / 80),
    },
  };

  const requirements = baseRequirements[type] || baseRequirements.residential;

  // Adjust for complexity
  const complexityMultipliers = {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
    very_high: 1.6,
  };

  const multiplier = complexityMultipliers[complexity] || 1.0;

  const adjustedRequirements = {};
  for (const [role, count] of Object.entries(requirements)) {
    adjustedRequirements[role] = Math.ceil(count * multiplier);
  }

  return adjustedRequirements;
};

/**
 * Rank workers for project based on multiple factors
 * @param {Array} workers - Available workers
 * @param {Object} project - Project details
 * @param {Object} requirements - Team requirements
 * @returns {Array} Ranked workers
 */
const rankWorkersForProject = (workers, project, requirements) => {
  return workers
    .map(worker => {
      const score = calculateWorkerProjectScore(worker, project, requirements);
      return { ...worker, projectScore: score };
    })
    .sort((a, b) => b.projectScore - a.projectScore);
};

/**
 * Calculate worker score for specific project
 * @param {Object} worker - Worker object
 * @param {Object} project - Project details
 * @param {Object} requirements - Team requirements
 * @returns {number} Worker score (0-100)
 */
const calculateWorkerProjectScore = (worker, project, requirements) => {
  let score = 0;

  // Role relevance (40%)
  const roleRelevance = requirements[worker.type] ? 40 : 0;
  score += roleRelevance;

  // Experience match (20%)
  const requiredExperience = project.complexity === 'high' ? 5 : 
                           project.complexity === 'very_high' ? 8 : 2;
  const experienceScore = Math.min((worker.experience / requiredExperience) * 20, 20);
  score += experienceScore;

  // Location proximity (15%)
  if (worker.location && project.location) {
    const distance = calculateDistance(worker.location, project.location);
    const locationScore = Math.max(0, 15 - (distance / 10)); // 1 point per 10km
    score += locationScore;
  }

  // Rating and reliability (15%)
  const ratingScore = (worker.rating / 5) * 15;
  score += ratingScore;

  // Availability and response time (10%)
  const availabilityScore = worker.availability === 'available' ? 10 : 5;
  score += availabilityScore;

  return Math.min(score, 100);
};

/**
 * Optimize team selection within budget constraints
 * @param {Array} rankedWorkers - Ranked workers
 * @param {number} budget - Project budget in cents
 * @param {Object} requirements - Team requirements
 * @returns {Array} Optimized team
 */
const optimizeTeamWithinBudget = (rankedWorkers, budget, requirements) => {
  const selectedTeam = [];
  let remainingBudget = budget * 0.6; // Allocate 60% of budget to labor
  const roleCounts = {};

  for (const worker of rankedWorkers) {
    const workerType = WORKER_TYPES[worker.type];
    if (!workerType) continue;

    const dailyRate = worker.customRate || workerType.dailyRate.min;
    const projectDuration = 90; // Assume 90-day project
    const totalCost = dailyRate * projectDuration;

    // Check if we need this role and have budget
    const currentCount = roleCounts[worker.type] || 0;
    const requiredCount = requirements[worker.type] || 0;

    if (currentCount < requiredCount && totalCost <= remainingBudget) {
      selectedTeam.push({
        ...worker,
        assignedRole: worker.type,
        dailyRate,
        totalCost,
        projectDuration,
      });

      roleCounts[worker.type] = currentCount + 1;
      remainingBudget -= totalCost;
    }

    // Stop if budget is exhausted or requirements are met
    if (remainingBudget <= 0) break;
  }

  return selectedTeam;
};

/**
 * Calculate team performance metrics
 * @param {Array} team - Selected team
 * @param {Object} project - Project details
 * @returns {Object} Team metrics
 */
const calculateTeamMetrics = (team, project) => {
  const totalDailyCost = team.reduce((sum, worker) => sum + worker.dailyRate, 0);
  const totalProjectCost = team.reduce((sum, worker) => sum + worker.totalCost, 0);
  
  const averageExperience = team.length ? 
    team.reduce((sum, worker) => sum + (worker.experience || 1), 0) / team.length : 0;
  
  const averageRating = team.length ? 
    team.reduce((sum, worker) => sum + (worker.rating || 3), 0) / team.length : 0;

  const skillCoverage = calculateSkillCoverage(team, project);
  const estimatedEfficiency = calculateTeamEfficiency(team);

  return {
    teamSize: team.length,
    totalDailyCost,
    totalProjectCost,
    averageExperience: Math.round(averageExperience * 10) / 10,
    averageRating: Math.round(averageRating * 10) / 10,
    skillCoverage: Math.round(skillCoverage * 100),
    estimatedEfficiency: Math.round(estimatedEfficiency * 100),
    costPerSquareMeter: project.size ? Math.round(totalProjectCost / project.size) : 0,
  };
};

/**
 * Calculate team skill coverage for project requirements
 * @param {Array} team - Selected team
 * @param {Object} project - Project details
 * @returns {number} Coverage percentage (0-1)
 */
const calculateSkillCoverage = (team, project) => {
  const requirements = calculateRequiredTeam(project.type, project.size, project.complexity);
  const totalRequired = Object.values(requirements).reduce((sum, count) => sum + count, 0);
  
  if (totalRequired === 0) return 1;

  const roleCounts = {};
  team.forEach(worker => {
    roleCounts[worker.type] = (roleCounts[worker.type] || 0) + 1;
  });

  let covered = 0;
  for (const [role, required] of Object.entries(requirements)) {
    const actual = roleCounts[role] || 0;
    covered += Math.min(actual, required);
  }

  return covered / totalRequired;
};

/**
 * Calculate overall team efficiency
 * @param {Array} team - Team members
 * @returns {number} Efficiency score (0-1)
 */
const calculateTeamEfficiency = (team) => {
  if (!team.length) return 0;

  const individualEfficiencies = team.map(worker => 
    calculateWorkerEfficiency(WORKER_TYPES[worker.type], worker.experience)
  );

  const averageEfficiency = individualEfficiencies.reduce((sum, eff) => sum + eff, 0) / team.length;
  
  // Team synergy factor (larger teams are slightly less efficient per person)
  const synergyFactor = Math.max(0.7, 1 - (team.length * 0.02));
  
  return averageEfficiency * synergyFactor;
};

/**
 * Calculate requirement coverage percentage
 * @param {Array} team - Selected team
 * @param {Object} requirements - Required team composition
 * @returns {Object} Coverage breakdown
 */
const calculateRequirementCoverage = (team, requirements) => {
  const roleCounts = {};
  team.forEach(worker => {
    roleCounts[worker.type] = (roleCounts[worker.type] || 0) + 1;
  });

  const coverage = {};
  let totalCovered = 0;
  let totalRequired = 0;

  for (const [role, required] of Object.entries(requirements)) {
    const actual = roleCounts[role] || 0;
    const roleCoverage = Math.min(actual / required, 1);
    
    coverage[role] = {
      required,
      actual,
      coverage: Math.round(roleCoverage * 100),
      status: roleCoverage >= 1 ? 'fulfilled' : roleCoverage >= 0.5 ? 'partial' : 'insufficient',
    };

    totalCovered += Math.min(actual, required);
    totalRequired += required;
  }

  const overallCoverage = totalRequired > 0 ? totalCovered / totalRequired : 1;

  return {
    overall: Math.round(overallCoverage * 100),
    byRole: coverage,
    status: overallCoverage >= 0.9 ? 'excellent' : 
            overallCoverage >= 0.7 ? 'good' : 
            overallCoverage >= 0.5 ? 'fair' : 'poor',
  };
};

// ===== AI-POWERED PROJECT OPTIMIZATION =====

/**
 * AI-powered project optimization with multiple scenarios
 * @param {Object} project - Project details
 * @param {Array} availableWorkers - Available workers
 * @param {Object} constraints - Budget and time constraints
 * @returns {Object} Optimization results with scenarios
 */
export const optimizeProjectWithAI = (project, availableWorkers, constraints = {}) => {
  const scenarios = {
    budgetOptimized: optimizeForBudget(project, availableWorkers, constraints),
    timeOptimized: optimizeForTime(project, availableWorkers, constraints),
    balanced: optimizeForBalance(project, availableWorkers, constraints),
  };

  // Calculate scores for each scenario
  Object.keys(scenarios).forEach(scenario => {
    scenarios[scenario].score = calculateScenarioScore(scenarios[scenario], constraints);
  });

  // Recommend best scenario
  const bestScenario = Object.keys(scenarios).reduce((best, current) => {
    return scenarios[current].score > scenarios[best].score ? current : best;
  }, 'balanced');

  return {
    scenarios,
    recommendation: bestScenario,
    bestScenario: scenarios[bestScenario],
    comparison: compareScenarios(scenarios),
  };
};

/**
 * Optimize project for budget constraints
 * @param {Object} project - Project details
 * @param {Array} availableWorkers - Available workers
 * @param {Object} constraints - Constraints
 * @returns {Object} Budget-optimized solution
 */
const optimizeForBudget = (project, availableWorkers, constraints) => {
  const budget = constraints.budget || project.budget;
  
  // Filter workers within budget and optimize for cost
  const affordableWorkers = availableWorkers.filter(worker => {
    const workerType = WORKER_TYPES[worker.type];
    return workerType && workerType.dailyRate.min <= (budget * 0.0001); // Simple affordability check
  });

  return optimizeTeamComposition(project, affordableWorkers);
};

/**
 * Optimize project for time constraints
 * @param {Object} project - Project details
 * @param {Array} availableWorkers - Available workers
 * @param {Object} constraints - Constraints
 * @returns {Object} Time-optimized solution
 */
const optimizeForTime = (project, availableWorkers, constraints) => {
  // Prioritize highly efficient and available workers
  const efficientWorkers = availableWorkers
    .filter(worker => worker.rating >= 4.0 && worker.availability === 'available')
    .sort((a, b) => b.rating - a.rating);

  return optimizeTeamComposition(project, efficientWorkers);
};

/**
 * Optimize project for balanced approach
 * @param {Object} project - Project details
 * @param {Array} availableWorkers - Available workers
 * @param {Object} constraints - Constraints
 * @returns {Object} Balanced solution
 */
const optimizeForBalance = (project, availableWorkers, constraints) => {
  // Use the standard optimization with balanced parameters
  return optimizeTeamComposition(project, availableWorkers);
};

/**
 * Calculate scenario score based on constraints
 * @param {Object} scenario - Optimization scenario
 * @param {Object} constraints - Project constraints
 * @returns {number} Scenario score (0-100)
 */
const calculateScenarioScore = (scenario, constraints) => {
  let score = 0;

  // Budget adherence (40%)
  if (constraints.budget) {
    const budgetUtilization = scenario.metrics.totalProjectCost / constraints.budget;
    const budgetScore = Math.max(0, 40 - (budgetUtilization * 20)); // Penalize over-budget
    score += budgetScore;
  }

  // Team quality (30%)
  score += scenario.metrics.averageRating * 6; // 5*6 = 30

  // Skill coverage (20%)
  score += scenario.coverage.overall * 0.2;

  // Efficiency (10%)
  score += scenario.metrics.estimatedEfficiency * 0.1;

  return Math.min(score, 100);
};

/**
 * Compare multiple optimization scenarios
 * @param {Object} scenarios - Different optimization scenarios
 * @returns {Object} Comparison results
 */
const compareScenarios = (scenarios) => {
  const comparison = {};

  Object.keys(scenarios).forEach(scenario => {
    const data = scenarios[scenario];
    comparison[scenario] = {
      cost: data.metrics.totalProjectCost,
      duration: data.metrics.estimatedEfficiency,
      teamSize: data.metrics.teamSize,
      coverage: data.coverage.overall,
      rating: data.metrics.averageRating,
      score: data.score,
    };
  });

  return comparison;
};

// ===== EXPORT ALL CALCULATIONS =====

export default {
  // Project Budget Calculations
  calculateProjectBudget,
  
  // Project Duration Calculations
  calculateProjectDuration,
  
  // Team Optimization
  optimizeTeamComposition,
  
  // AI-Powered Optimization
  optimizeProjectWithAI,
  
  // Utility Calculations
  calculateRequiredTeam,
  calculateTeamMetrics,
  calculateRequirementCoverage,
};

// ===== CALCULATION UTILITIES =====

/**
 * Create a project calculation chain
 * @param {Object} project - Project details
 * @returns {Object} Calculation chain
 */
export const createProjectCalculationChain = (project) => {
  const calculations = {
    project,
    
    budget() {
      this.budgetResult = calculateProjectBudget(this.project);
      return this;
    },
    
    duration(team = []) {
      this.durationResult = calculateProjectDuration(this.project, team);
      return this;
    },
    
    team(availableWorkers = []) {
      this.teamResult = optimizeTeamComposition(this.project, availableWorkers);
      return this;
    },
    
    optimize(constraints = {}) {
      this.optimizationResult = optimizeProjectWithAI(
        this.project, 
        this.teamResult?.team || [], 
        constraints
      );
      return this;
    },
    
    getResults() {
      return {
        budget: this.budgetResult,
        duration: this.durationResult,
        team: this.teamResult,
        optimization: this.optimizationResult,
        summary: this.generateSummary(),
      };
    },
    
    generateSummary() {
      return {
        totalCost: this.budgetResult?.totalCost || 0,
        duration: this.durationResult?.calendarDays || 0,
        teamSize: this.teamResult?.team?.length || 0,
        coverage: this.teamResult?.coverage?.overall || 0,
        recommendation: this.optimizationResult?.recommendation,
      };
    },
  };

  return calculations;
};

/**
 * Validate project parameters before calculations
 * @param {Object} project - Project details
 * @returns {Object} Validation result
 */
export const validateProjectParameters = (project) => {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!project.type) errors.push('Project type is required');
  if (!project.size || project.size <= 0) errors.push('Valid project size is required');
  if (!project.location) warnings.push('Location not specified - using default calculations');

  // Budget validation
  if (project.budget && project.budget < 1000000) { // 10,000 ETB
    warnings.push('Budget seems low for construction project');
  }

  // Size validation
  if (project.size > 10000) warnings.push('Very large project - consider phased approach');
  if (project.size < 50) warnings.push('Very small project - minimum charges may apply');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};