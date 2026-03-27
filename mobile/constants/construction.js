// constants/construction.js

/**
 * ENTERPRISE CONSTRUCTION CONSTANTS
 * Yachi Construction & Services Platform
 * AI-Powered Worker Matching & Ethiopian Market Specialization
 */

// ==================== ENTERPRISE WORKER SKILLS CATALOG ====================
export const WORKER_SKILLS = {
  // Foundation & Structural
  MASONRY: {
    id: 'masonry',
    name: { en: 'Masonry', am: 'የጡብ ሥራ', om: 'Hojii Saree' },
    category: 'structural',
    level: 'skilled',
    demand: 'high',
    averageRate: 450, // ETB per day
    trainingRequired: true,
    certificationRequired: false,
  },

  CARPENTRY: {
    id: 'carpentry',
    name: { en: 'Carpentry', am: 'የእንጨት ሥራ', om: 'Hojii Mukaa' },
    category: 'structural',
    level: 'skilled',
    demand: 'high',
    averageRate: 500,
    trainingRequired: true,
    certificationRequired: false,
  },

  REINFORCEMENT: {
    id: 'reinforcement',
    name: { en: 'Reinforcement Works', am: 'የብረት ማጠንከሪያ ሥራ', om: 'Hojii Ciminaa' },
    category: 'structural',
    level: 'skilled',
    demand: 'medium',
    averageRate: 550,
    trainingRequired: true,
    certificationRequired: true,
  },

  // Mechanical & Electrical
  PLUMBING: {
    id: 'plumbing',
    name: { en: 'Plumbing', am: 'የፕላምቢንግ ሥራ', om: 'Hojii Piipii' },
    category: 'mechanical',
    level: 'skilled',
    demand: 'high',
    averageRate: 600,
    trainingRequired: true,
    certificationRequired: true,
  },

  ELECTRICAL: {
    id: 'electrical',
    name: { en: 'Electrical', am: 'የኤሌክትሪክ ሥራ', om: 'Hojii Elektirikii' },
    category: 'electrical',
    level: 'skilled',
    demand: 'high',
    averageRate: 650,
    trainingRequired: true,
    certificationRequired: true,
  },

  PLUMBING_FIXTURES: {
    id: 'plumbing_fixtures',
    name: { en: 'Plumbing Fixtures', am: 'የፕላምቢንግ መሳርያዎች', om: 'Meerii Piipii' },
    category: 'mechanical',
    level: 'skilled',
    demand: 'medium',
    averageRate: 550,
    trainingRequired: true,
    certificationRequired: false,
  },

  ELECTRICAL_FIXTURES: {
    id: 'electrical_fixtures',
    name: { en: 'Electrical Fixtures', am: 'የኤሌክትሪክ መሳርያዎች', om: 'Meerii Elektirikii' },
    category: 'electrical',
    level: 'skilled',
    demand: 'medium',
    averageRate: 600,
    trainingRequired: true,
    certificationRequired: true,
  },

  // Finishing Works
  PAINTING: {
    id: 'painting',
    name: { en: 'Painting', am: 'የቀለም ሥራ', om: 'Hojii Lakkofsaa' },
    category: 'finishing',
    level: 'semi_skilled',
    demand: 'high',
    averageRate: 400,
    trainingRequired: false,
    certificationRequired: false,
  },

  TILING: {
    id: 'tiling',
    name: { en: 'Tiling', am: 'የጡብ ማስቀመጫ', om: 'Hojii Taayilii' },
    category: 'finishing',
    level: 'skilled',
    demand: 'high',
    averageRate: 500,
    trainingRequired: true,
    certificationRequired: false,
  },

  // Specialized Construction
  HEAVY_EQUIPMENT: {
    id: 'heavy_equipment',
    name: { en: 'Heavy Equipment Operation', am: 'ከባድ መሳሪያ አሰራር', om: 'Hojii Meeshaa Ulfaanaa' },
    category: 'specialized',
    level: 'expert',
    demand: 'medium',
    averageRate: 1200,
    trainingRequired: true,
    certificationRequired: true,
  },

  ROAD_WORKS: {
    id: 'road_works',
    name: { en: 'Road Works', am: 'የመንገድ ሥራ', om: 'Hojii Karaa' },
    category: 'infrastructure',
    level: 'skilled',
    demand: 'medium',
    averageRate: 500,
    trainingRequired: true,
    certificationRequired: true,
  },

  BRIDGE_WORKS: {
    id: 'bridge_works',
    name: { en: 'Bridge Works', am: 'የግንብ ሥራ', om: 'Hojii Rifeensa' },
    category: 'infrastructure',
    level: 'expert',
    demand: 'low',
    averageRate: 800,
    trainingRequired: true,
    certificationRequired: true,
  },

  DEMOLITION: {
    id: 'demolition',
    name: { en: 'Demolition', am: 'መፍረስ', om: 'Hojii Barsiisaa' },
    category: 'specialized',
    level: 'skilled',
    demand: 'medium',
    averageRate: 600,
    trainingRequired: true,
    certificationRequired: true,
  },

  // Additional Ethiopian Market Skills
  TRADITIONAL_CONSTRUCTION: {
    id: 'traditional_construction',
    name: { en: 'Traditional Construction', am: 'ባህላዊ ግንባታ', om: 'Ijaarsaa Aadaa' },
    category: 'traditional',
    level: 'skilled',
    demand: 'medium',
    averageRate: 450,
    trainingRequired: false,
    certificationRequired: false,
  },

  MUD_CONSTRUCTION: {
    id: 'mud_construction',
    name: { en: 'Mud Construction', am: 'የጭቃ ግንባታ', om: 'Ijaarsaa Dhoqqee' },
    category: 'traditional',
    level: 'semi_skilled',
    demand: 'low',
    averageRate: 350,
    trainingRequired: false,
    certificationRequired: false,
  },

  STEEL_FABRICATION: {
    id: 'steel_fabrication',
    name: { en: 'Steel Fabrication', am: 'የብረት አምራች', om: 'Hojii Sibiilaa' },
    category: 'structural',
    level: 'expert',
    demand: 'medium',
    averageRate: 700,
    trainingRequired: true,
    certificationRequired: true,
  },
};

// ==================== ENTERPRISE WORKER LEVELS & CLASSIFICATION ====================
export const WORKER_LEVELS = {
  TRAINEE: {
    id: 'trainee',
    name: { en: 'Trainee', am: 'ሰልጣኝ', om: 'Barataa' },
    level: 1,
    experience: { min: 0, max: 1 }, // years
    supervisionRequired: true,
    maxTeamSize: 0,
    rateMultiplier: 0.7,
    skills: ['basic_training'],
  },

  SEMI_SKILLED: {
    id: 'semi_skilled',
    name: { en: 'Semi-Skilled', am: 'ከፊል ብቃት ያለው', om: 'Qophii Qaba' },
    level: 2,
    experience: { min: 1, max: 3 },
    supervisionRequired: true,
    maxTeamSize: 2,
    rateMultiplier: 0.85,
    skills: ['basic_skills', 'tool_operation'],
  },

  SKILLED: {
    id: 'skilled',
    name: { en: 'Skilled', am: 'ብቃት ያለው', om: 'Qophaa\'e' },
    level: 3,
    experience: { min: 3, max: 7 },
    supervisionRequired: false,
    maxTeamSize: 5,
    rateMultiplier: 1.0,
    skills: ['advanced_skills', 'quality_control', 'basic_supervision'],
  },

  EXPERT: {
    id: 'expert',
    name: { en: 'Expert', am: 'ባለሙያ', om: 'Ogummaa Qaba' },
    level: 4,
    experience: { min: 7, max: 15 },
    supervisionRequired: false,
    maxTeamSize: 10,
    rateMultiplier: 1.3,
    skills: ['specialized_skills', 'training', 'complex_problem_solving'],
  },

  SUPERVISOR: {
    id: 'supervisor',
    name: { en: 'Supervisor', am: 'አስተዳደር', om: 'Hordoftaa' },
    level: 5,
    experience: { min: 5, max: 20 },
    supervisionRequired: false,
    maxTeamSize: 20,
    rateMultiplier: 1.5,
    skills: ['team_management', 'project_planning', 'quality_assurance', 'safety_management'],
  },

  FOREMAN: {
    id: 'foreman',
    name: { en: 'Foreman', am: 'ፎርማን', om: 'Foreman' },
    level: 6,
    experience: { min: 10, max: 25 },
    supervisionRequired: false,
    maxTeamSize: 50,
    rateMultiplier: 1.8,
    skills: ['large_team_management', 'budget_control', 'client_relations', 'strategic_planning'],
  },
};

// ==================== AI ASSIGNMENT & PROJECT STATUS ====================
export const ASSIGNMENT_STATUS = {
  PENDING: {
    id: 'pending',
    name: { en: 'Pending', am: 'በጥበቃ', om: 'Eegama' },
    color: '#F59E0B',
    canEdit: true,
    canCancel: true,
    actions: ['assign', 'cancel'],
  },

  INVITED: {
    id: 'invited',
    name: { en: 'Invited', am: 'ተጋብዟል', om: 'Waamama' },
    color: '#3B82F6',
    canEdit: false,
    canCancel: true,
    actions: ['accept', 'decline', 'cancel'],
  },

  ASSIGNED: {
    id: 'assigned',
    name: { en: 'Assigned', am: 'ተመድቧል', om: 'Qoodama' },
    color: '#8B5CF6',
    canEdit: true,
    canCancel: true,
    actions: ['start_work', 'replace', 'cancel'],
  },

  ACTIVE: {
    id: 'active',
    name: { en: 'Active', am: 'በሥራ ላይ', om: 'Hojii Irra' },
    color: '#10B981',
    canEdit: true,
    canCancel: false,
    actions: ['update_progress', 'pause', 'complete'],
  },

  PAUSED: {
    id: 'paused',
    name: { en: 'Paused', am: 'ተወስኗል', om: 'Dhaabama' },
    color: '#6B7280',
    canEdit: true,
    canCancel: true,
    actions: ['resume', 'cancel'],
  },

  COMPLETED: {
    id: 'completed',
    name: { en: 'Completed', am: 'ተጠናቋል', om: 'Xumurama' },
    color: '#059669',
    canEdit: false,
    canCancel: false,
    actions: ['review', 'rate'],
  },

  CANCELLED: {
    id: 'cancelled',
    name: { en: 'Cancelled', am: 'ተሰርዟል', om: 'Dhiifama' },
    color: '#EF4444',
    canEdit: false,
    canCancel: false,
    actions: ['reassign'],
  },

  REPLACEMENT_NEEDED: {
    id: 'replacement_needed',
    name: { en: 'Replacement Needed', am: 'መተካት ያስፈልጋል', om: 'Bakka Buusu Barbaachisaa' },
    color: '#DC2626',
    canEdit: true,
    canCancel: false,
    actions: ['find_replacement', 'cancel'],
  },
};

// ==================== CONSTRUCTION PROJECT TYPES ====================
export const PROJECT_TYPES = {
  RESIDENTIAL: {
    id: 'residential',
    name: { en: 'Residential', am: 'ማሰሪያ', om: 'Mana Jireenyaa' },
    complexity: 'medium',
    duration: { min: 3, max: 24 }, // months
    teamSize: { min: 5, max: 20 },
    skills: ['masonry', 'carpentry', 'electrical', 'plumbing', 'painting'],
  },

  COMMERCIAL: {
    id: 'commercial',
    name: { en: 'Commercial', am: 'ንግድ', om: 'Daldalaa' },
    complexity: 'high',
    duration: { min: 6, max: 36 },
    teamSize: { min: 15, max: 50 },
    skills: ['steel_fabrication', 'heavy_equipment', 'electrical', 'plumbing'],
  },

  GOVERNMENT_INFRASTRUCTURE: {
    id: 'government_infrastructure',
    name: { en: 'Government Infrastructure', am: 'የመንግስት መሠረተ ልማት', om: 'Infiraastiraakcharii Mootummaa' },
    complexity: 'very_high',
    duration: { min: 12, max: 60 },
    teamSize: { min: 50, max: 200 },
    skills: ['road_works', 'bridge_works', 'heavy_equipment', 'steel_fabrication'],
  },

  RENOVATION: {
    id: 'renovation',
    name: { en: 'Renovation', am: 'ጥገና', om: 'Fuula Duraa' },
    complexity: 'low',
    duration: { min: 1, max: 6 },
    teamSize: { min: 3, max: 10 },
    skills: ['painting', 'tiling', 'plumbing_fixtures', 'electrical_fixtures'],
  },

  NEW_CONSTRUCTION: {
    id: 'new_construction',
    name: { en: 'New Construction', am: 'አዲስ ግንባታ', om: 'Ijaarsaa Haaraa' },
    complexity: 'high',
    duration: { min: 6, max: 24 },
    teamSize: { min: 10, max: 30 },
    skills: ['masonry', 'carpentry', 'reinforcement', 'electrical', 'plumbing'],
  },

  FINISHING_WORKS: {
    id: 'finishing_works',
    name: { en: 'Finishing Works', am: 'የማጠናቀቂያ ሥራ', om: 'Hojii Xumuraa' },
    complexity: 'medium',
    duration: { min: 2, max: 8 },
    teamSize: { min: 5, max: 15 },
    skills: ['painting', 'tiling', 'plumbing_fixtures', 'electrical_fixtures'],
  },
};

// ==================== AI MATCHING CONFIGURATION ====================
export const AI_MATCHING_CONFIG = {
  // Matching weights (0-1)
  WEIGHTS: {
    SKILL_MATCH: 0.35,
    LOCATION_PROXIMITY: 0.25,
    RATING_SCORE: 0.15,
    EXPERIENCE_LEVEL: 0.10,
    AVAILABILITY: 0.10,
    COST_EFFECTIVENESS: 0.05,
  },

  // Distance thresholds (km)
  DISTANCE_THRESHOLDS: {
    OPTIMAL: 10,
    ACCEPTABLE: 25,
    MAXIMUM: 50,
  },

  // Rating thresholds
  RATING_THRESHOLDS: {
    MINIMUM: 3.0,
    PREFERRED: 4.0,
    EXCELLENT: 4.5,
  },

  // Response time (hours)
  RESPONSE_TIMEOUTS: {
    INITIAL_INVITATION: 24,
    REPLACEMENT_SEARCH: 12,
    URGENT_PROJECTS: 6,
  },

  // Team composition rules
  TEAM_COMPOSITION: {
    SUPERVISOR_RATIO: 0.1,      // 1 supervisor per 10 workers
    EXPERT_RATIO: 0.2,          // 1 expert per 5 workers
    SKILLED_MIN_RATIO: 0.6,     // Minimum 60% skilled workers
    TRAINEE_MAX_RATIO: 0.2,     // Maximum 20% trainees
  },
};

// ==================== ETHIOPIAN CONSTRUCTION STANDARDS ====================
export const ETHIOPIAN_CONSTRUCTION_STANDARDS = {
  WORKING_HOURS: {
    STANDARD: { start: '08:00', end: '17:00' },
    OVERTIME_RATE: 1.5,
    MAX_OVERTIME_HOURS: 4,
    BREAK_DURATION: 60, // minutes
  },

  SAFETY_REQUIREMENTS: {
    PPE_REQUIRED: ['helmet', 'safety_boots', 'vest'],
    TRAINING_REQUIRED: ['basic_safety', 'first_aid'],
    CERTIFICATION_REQUIRED: ['heavy_equipment', 'electrical_work'],
  },

  WAGE_STANDARDS: {
    MINIMUM_DAILY_RATE: 120, // ETB
    AVERAGE_SKILLED_RATE: 500, // ETB
    EXPERT_RATE_RANGE: { min: 700, max: 1500 }, // ETB
  },

  WEATHER_CONSIDERATIONS: {
    RAINY_SEASON: ['June', 'July', 'August', 'September'],
    HIGH_ALTITUDE_ADJUSTMENTS: ['oxygen_supply', 'reduced_hours'],
  },
};

// ==================== ENTERPRISE CONSTRUCTION SERVICE ====================
export class ConstructionConstantsService {
  /**
   * Get skill by ID
   */
  static getSkill(skillId) {
    return WORKER_SKILLS[skillId] || null;
  }

  /**
   * Get worker level by ID
   */
  static getWorkerLevel(levelId) {
    return WORKER_LEVELS[levelId] || WORKER_LEVELS.TRAINEE;
  }

  /**
   * Get assignment status by ID
   */
  static getAssignmentStatus(statusId) {
    return ASSIGNMENT_STATUS[statusId] || ASSIGNMENT_STATUS.PENDING;
  }

  /**
   * Calculate daily rate based on skill and level
   */
  static calculateDailyRate(skillId, levelId, experienceYears = 0) {
    const skill = this.getSkill(skillId);
    const level = this.getWorkerLevel(levelId);
    
    if (!skill) return 0;

    let baseRate = skill.averageRate;
    let levelMultiplier = level.rateMultiplier;
    
    // Experience bonus (2% per year beyond minimum)
    const expBonus = Math.max(0, experienceYears - level.experience.min) * 0.02;
    
    return Math.round(baseRate * levelMultiplier * (1 + expBonus));
  }

  /**
   * Get skills by category
   */
  static getSkillsByCategory(category) {
    return Object.values(WORKER_SKILLS).filter(skill => skill.category === category);
  }

  /**
   * Get recommended team composition for project type
   */
  static getRecommendedTeam(projectType, projectSize) {
    const project = PROJECT_TYPES[projectType];
    if (!project) return null;

    const baseTeamSize = project.teamSize;
    const actualSize = Math.max(baseTeamSize.min, Math.min(projectSize, baseTeamSize.max));
    
    return {
      supervisors: Math.ceil(actualSize * AI_MATCHING_CONFIG.TEAM_COMPOSITION.SUPERVISOR_RATIO),
      experts: Math.ceil(actualSize * AI_MATCHING_CONFIG.TEAM_COMPOSITION.EXPERT_RATIO),
      skilled: Math.ceil(actualSize * AI_MATCHING_CONFIG.TEAM_COMPOSITION.SKILLED_MIN_RATIO),
      semiSkilled: Math.floor(actualSize * 0.3),
      trainees: Math.floor(actualSize * AI_MATCHING_CONFIG.TEAM_COMPOSITION.TRAINEE_MAX_RATIO),
      total: actualSize,
    };
  }

  /**
   * Validate worker assignment
   */
  static validateAssignment(worker, project, requiredSkill) {
    const validation = {
      isValid: true,
      issues: [],
      score: 0,
    };

    // Skill validation
    if (requiredSkill && !worker.skills.includes(requiredSkill)) {
      validation.isValid = false;
      validation.issues.push('missing_required_skill');
    }

    // Experience validation
    const workerLevel = this.getWorkerLevel(worker.level);
    if (worker.experienceYears < workerLevel.experience.min) {
      validation.issues.push('insufficient_experience');
      validation.score -= 20;
    }

    // Location validation
    const distance = this.calculateDistance(worker.location, project.location);
    if (distance > AI_MATCHING_CONFIG.DISTANCE_THRESHOLDS.MAXIMUM) {
      validation.issues.push('too_far');
      validation.score -= 30;
    } else if (distance <= AI_MATCHING_CONFIG.DISTANCE_THRESHOLDS.OPTIMAL) {
      validation.score += 15;
    }

    // Rating validation
    if (worker.rating < AI_MATCHING_CONFIG.RATING_THRESHOLDS.MINIMUM) {
      validation.issues.push('low_rating');
      validation.score -= 25;
    } else if (worker.rating >= AI_MATCHING_CONFIG.RATING_THRESHOLDS.EXCELLENT) {
      validation.score += 20;
    }

    return validation;
  }

  /**
   * Calculate distance between two points (simplified)
   */
  static calculateDistance(location1, location2) {
    // Simplified distance calculation - in real app, use Haversine formula
    const latDiff = Math.abs(location1.latitude - location2.latitude);
    const lngDiff = Math.abs(location1.longitude - location2.longitude);
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Approximate km
  }

  /**
   * Get available actions for assignment status
   */
  static getAvailableActions(statusId, userRole) {
    const status = this.getAssignmentStatus(statusId);
    let actions = [...status.actions];

    // Role-based action filtering
    if (userRole === 'worker') {
      actions = actions.filter(action => 
        ['accept', 'decline', 'start_work', 'update_progress', 'complete'].includes(action)
      );
    } else if (userRole === 'contractor') {
      actions = actions.filter(action => 
        ['assign', 'cancel', 'replace', 'find_replacement', 'review', 'rate'].includes(action)
      );
    }

    return actions;
  }

  /**
   * Get localized name for any entity
   */
  static getLocalizedName(entity, language = 'en') {
    if (entity.name && typeof entity.name === 'object') {
      return entity.name[language] || entity.name.en;
    }
    return entity.name || entity.id;
  }

  /**
   * Check if worker meets project requirements
   */
  static meetsProjectRequirements(worker, project) {
    const projectType = PROJECT_TYPES[project.type];
    if (!projectType) return false;

    return projectType.skills.some(skill => worker.skills.includes(skill));
  }
}

// ==================== EXPORT CONFIGURATION ====================
export const CONSTRUCTION_CONSTANTS = {
  skills: WORKER_SKILLS,
  levels: WORKER_LEVELS,
  assignmentStatus: ASSIGNMENT_STATUS,
  projectTypes: PROJECT_TYPES,
  aiMatching: AI_MATCHING_CONFIG,
  ethiopianStandards: ETHIOPIAN_CONSTRUCTION_STANDARDS,
  service: ConstructionConstantsService,
};

export default CONSTRUCTION_CONSTANTS;