/**
 * AI Matching Algorithm for connecting job seekers with opportunities
 * Uses a hybrid approach combining multiple matching strategies
 */

const natural = require('natural');
const fs = require('fs');
const path = require('path');

// Initialize NLP tools
const { TfIdf } = natural;
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Configuration
const MATCHING_CONFIG = {
  weights: {
    skills: 0.35,
    experience: 0.25,
    location: 0.15,
    salary: 0.10,
    education: 0.10,
    preferences: 0.05
  },
  thresholds: {
    goodMatch: 0.75,
    averageMatch: 0.50,
    poorMatch: 0.30
  },
  locationRadius: {
    sameCity: 10, // km
    sameRegion: 50, // km
    sameCountry: 200 // km
  }
};

class AIMatchingAlgorithm {
  constructor() {
    this.tfidf = new TfIdf();
    this.skillSynonyms = this.loadSkillSynonyms();
    this.industryClassifications = this.loadIndustryClassifications();
  }

  /**
   * Main matching function
   * @param {Object} jobSeeker - Job seeker profile
   * @param {Object} job - Job listing
   * @param {Object} options - Matching options
   * @returns {Object} Match score and breakdown
   */
  async calculateMatch(jobSeeker, job, options = {}) {
    try {
      const weights = options.weights || MATCHING_CONFIG.weights;
      
      const scoreBreakdown = {
        skills: this.calculateSkillMatch(jobSeeker.skills, job.requiredSkills, job.preferredSkills),
        experience: this.calculateExperienceMatch(jobSeeker.experience, job.minExperience, job.experienceLevel),
        location: this.calculateLocationMatch(jobSeeker.location, job.location, job.isRemote),
        salary: this.calculateSalaryMatch(jobSeeker.expectedSalary, job.salaryRange, job.salaryType),
        education: this.calculateEducationMatch(jobSeeker.education, job.requiredEducation),
        preferences: this.calculatePreferenceMatch(jobSeeker.preferences, job.jobType, job.company)
      };

      // Calculate weighted total score
      let totalScore = 0;
      Object.keys(scoreBreakdown).forEach(key => {
        totalScore += scoreBreakdown[key] * weights[key];
      });

      // Apply bonus/malus factors
      const adjustments = this.applyAdjustments(jobSeeker, job, scoreBreakdown);
      totalScore = Math.min(1, Math.max(0, totalScore + adjustments));

      return {
        score: totalScore,
        breakdown: scoreBreakdown,
        matchLevel: this.getMatchLevel(totalScore),
        adjustments: adjustments,
        recommendations: this.generateRecommendations(scoreBreakdown)
      };
    } catch (error) {
      console.error('Error in calculateMatch:', error);
      throw new Error(`Matching calculation failed: ${error.message}`);
    }
  }

  /**
   * Skill matching using TF-IDF and semantic analysis
   */
  calculateSkillMatch(jobSeekerSkills = [], requiredSkills = [], preferredSkills = []) {
    if (!requiredSkills.length && !preferredSkills.length) return 1;
    
    const allJobSkills = [...requiredSkills, ...preferredSkills];
    const normalizedJobSkills = this.normalizeSkills(allJobSkills);
    const normalizedSeekerSkills = this.normalizeSkills(jobSeekerSkills);
    
    // Calculate exact matches
    const exactMatches = normalizedSeekerSkills.filter(skill => 
      normalizedJobSkills.includes(skill)
    ).length;
    
    // Calculate semantic matches using skill synonyms
    let semanticMatches = 0;
    normalizedSeekerSkills.forEach(seekerSkill => {
      const synonyms = this.skillSynonyms[seekerSkill] || [];
      const foundMatch = normalizedJobSkills.some(jobSkill => 
        jobSkill === seekerSkill || synonyms.includes(jobSkill)
      );
      if (foundMatch) semanticMatches++;
    });
    
    // Weighted score: required skills are more important
    let requiredScore = 0;
    let preferredScore = 0;
    
    if (requiredSkills.length > 0) {
      requiredScore = this.calculateSkillSubsetMatch(jobSeekerSkills, requiredSkills);
    }
    
    if (preferredSkills.length > 0) {
      preferredScore = this.calculateSkillSubsetMatch(jobSeekerSkills, preferredSkills) * 0.7;
    }
    
    const finalScore = requiredScore + (requiredSkills.length > 0 ? preferredScore * 0.3 : preferredScore);
    return Math.min(1, finalScore);
  }

  calculateSkillSubsetMatch(seekerSkills, jobSkills) {
    const normalizedJobSkills = this.normalizeSkills(jobSkills);
    const normalizedSeekerSkills = this.normalizeSkills(seekerSkills);
    
    // Use TF-IDF for better matching
    this.tfidf.addDocument(normalizedJobSkills.join(' '));
    this.tfidf.addDocument(normalizedSeekerSkills.join(' '));
    
    const jobSkillsSet = new Set(normalizedJobSkills);
    const matches = normalizedSeekerSkills.filter(skill => jobSkillsSet.has(skill));
    
    const exactMatchScore = matches.length / normalizedJobSkills.length;
    
    // Calculate semantic similarity
    const semanticScore = this.calculateSemanticSimilarity(
      normalizedJobSkills.join(' '),
      normalizedSeekerSkills.join(' ')
    );
    
    // Combine scores
    return (exactMatchScore * 0.7) + (semanticScore * 0.3);
  }

  /**
   * Experience matching with level consideration
   */
  calculateExperienceMatch(seekerExperience, minExperience, experienceLevel) {
    if (!minExperience && !experienceLevel) return 1;
    
    const seekerYears = this.extractYearsFromExperience(seekerExperience);
    const requiredYears = minExperience || 0;
    
    let score = 0;
    
    if (seekerYears >= requiredYears) {
      // Perfect match or overqualified
      score = 1;
      if (seekerYears > requiredYears * 2) {
        // Might be overqualified
        score *= 0.9;
      }
    } else {
      // Underqualified
      const ratio = seekerYears / requiredYears;
      score = ratio >= 0.5 ? ratio * 0.8 : ratio * 0.5;
    }
    
    // Consider experience level (entry, mid, senior)
    if (experienceLevel) {
      const levelMatch = this.matchExperienceLevel(seekerExperience, experienceLevel);
      score = (score * 0.7) + (levelMatch * 0.3);
    }
    
    return Math.min(1, score);
  }

  extractYearsFromExperience(experience) {
    if (Array.isArray(experience)) {
      return experience.reduce((total, exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        return total + Math.max(0, years);
      }, 0);
    }
    return parseFloat(experience) || 0;
  }

  matchExperienceLevel(seekerExperience, requiredLevel) {
    const levels = {
      'entry': 1,
      'junior': 2,
      'mid': 3,
      'senior': 4,
      'lead': 5,
      'executive': 6
    };
    
    const seekerLevel = this.determineExperienceLevel(seekerExperience);
    const seekerValue = levels[seekerLevel] || 0;
    const requiredValue = levels[requiredLevel.toLowerCase()] || 0;
    
    if (seekerValue >= requiredValue) return 1;
    return seekerValue / requiredValue;
  }

  determineExperienceLevel(experience) {
    const years = this.extractYearsFromExperience(experience);
    
    if (years < 2) return 'entry';
    if (years < 5) return 'mid';
    if (years < 10) return 'senior';
    return 'lead';
  }

  /**
   * Location matching with geolocation support
   */
  calculateLocationMatch(seekerLocation, jobLocation, isRemote = false) {
    if (isRemote) return 1;
    
    if (!seekerLocation || !jobLocation) return 0.5;
    
    // If locations are identical
    if (seekerLocation.city === jobLocation.city && 
        seekerLocation.region === jobLocation.region) {
      return 1;
    }
    
    // Calculate distance if coordinates available
    if (seekerLocation.lat && seekerLocation.lng && 
        jobLocation.lat && jobLocation.lng) {
      const distance = this.calculateDistance(
        seekerLocation.lat, seekerLocation.lng,
        jobLocation.lat, jobLocation.lng
      );
      
      if (distance <= MATCHING_CONFIG.locationRadius.sameCity) return 0.9;
      if (distance <= MATCHING_CONFIG.locationRadius.sameRegion) return 0.7;
      if (distance <= MATCHING_CONFIG.locationRadius.sameCountry) return 0.5;
      return 0.2;
    }
    
    // Fallback to region/country matching
    if (seekerLocation.region === jobLocation.region) return 0.8;
    if (seekerLocation.country === jobLocation.country) return 0.6;
    return 0.3;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Salary expectation matching
   */
  calculateSalaryMatch(expectedSalary, salaryRange, salaryType) {
    if (!expectedSalary || !salaryRange) return 0.5;
    
    const seekerMin = expectedSalary.min || expectedSalary;
    const seekerMax = expectedSalary.max || expectedSalary;
    const jobMin = salaryRange.min;
    const jobMax = salaryRange.max;
    
    // Handle different salary types (hourly, monthly, annual)
    const seekerAdjusted = this.normalizeSalary(seekerMin, salaryType);
    const jobAdjustedMin = this.normalizeSalary(jobMin, salaryType);
    const jobAdjustedMax = this.normalizeSalary(jobMax, salaryType);
    
    if (seekerAdjusted <= jobAdjustedMax && seekerAdjusted >= jobAdjustedMin) {
      // Within range
      return 1;
    } else if (seekerAdjusted < jobAdjustedMin) {
      // Below range - might be acceptable
      const ratio = seekerAdjusted / jobAdjustedMin;
      return Math.min(0.9, ratio);
    } else {
      // Above range
      const ratio = jobAdjustedMax / seekerAdjusted;
      return Math.min(0.8, ratio);
    }
  }

  normalizeSalary(amount, type) {
    // Convert to annual equivalent for comparison
    switch (type) {
      case 'hourly':
        return amount * 2080; // 40 hours/week * 52 weeks
      case 'monthly':
        return amount * 12;
      case 'annual':
      default:
        return amount;
    }
  }

  /**
   * Education level matching
   */
  calculateEducationMatch(seekerEducation, requiredEducation) {
    if (!requiredEducation) return 1;
    
    const educationLevels = {
      'none': 0,
      'high_school': 1,
      'certificate': 2,
      'diploma': 3,
      'associate': 4,
      'bachelor': 5,
      'master': 6,
      'phd': 7,
      'postdoc': 8
    };
    
    const seekerHighest = this.getHighestEducationLevel(seekerEducation);
    const seekerLevel = educationLevels[seekerHighest] || 0;
    const requiredLevel = educationLevels[requiredEducation] || 0;
    
    if (seekerLevel >= requiredLevel) return 1;
    return seekerLevel / requiredLevel;
  }

  getHighestEducationLevel(education) {
    if (!Array.isArray(education) || education.length === 0) return 'none';
    
    const levels = education.map(edu => edu.level || 'none');
    const educationLevels = {
      'none': 0,
      'high_school': 1,
      'certificate': 2,
      'diploma': 3,
      'associate': 4,
      'bachelor': 5,
      'master': 6,
      'phd': 7,
      'postdoc': 8
    };
    
    return levels.reduce((highest, current) => {
      return educationLevels[current] > educationLevels[highest] ? current : highest;
    }, 'none');
  }

  /**
   * Job preference matching
   */
  calculatePreferenceMatch(seekerPreferences, jobType, company) {
    if (!seekerPreferences) return 0.5;
    
    let score = 0.5;
    let factors = 0;
    
    // Job type preference
    if (seekerPreferences.jobTypes && jobType) {
      const match = seekerPreferences.jobTypes.includes(jobType);
      score += match ? 0.2 : -0.1;
      factors++;
    }
    
    // Company size preference
    if (seekerPreferences.companySize && company && company.size) {
      const preferred = seekerPreferences.companySize;
      const actual = company.size;
      const sizeMatch = this.matchCompanySize(preferred, actual);
      score += sizeMatch;
      factors++;
    }
    
    // Work arrangement preference
    if (seekerPreferences.workArrangement) {
      const preferred = seekerPreferences.workArrangement;
      const actual = company?.workArrangement || 'on-site';
      const arrangementMatch = preferred === actual ? 0.15 : -0.05;
      score += arrangementMatch;
      factors++;
    }
    
    return factors > 0 ? Math.max(0, Math.min(1, score)) : 0.5;
  }

  matchCompanySize(preferred, actual) {
    const sizes = {
      'startup': 1,
      'small': 2,
      'medium': 3,
      'large': 4,
      'enterprise': 5
    };
    
    const preferredNum = sizes[preferred] || 3;
    const actualNum = sizes[actual] || 3;
    
    const diff = Math.abs(preferredNum - actualNum);
    if (diff === 0) return 0.2;
    if (diff === 1) return 0.1;
    return -0.1;
  }

  /**
   * Apply additional adjustments
   */
  applyAdjustments(jobSeeker, job, breakdown) {
    let adjustments = 0;
    
    // Language proficiency adjustment
    if (job.requiredLanguages && jobSeeker.languages) {
      const langMatch = this.matchLanguages(jobSeeker.languages, job.requiredLanguages);
      adjustments += langMatch * 0.05;
    }
    
    // Industry experience adjustment
    if (job.industry && jobSeeker.industries) {
      const industryMatch = this.matchIndustries(jobSeeker.industries, job.industry);
      adjustments += industryMatch * 0.03;
    }
    
    // Certification adjustment
    if (job.requiredCertifications && jobSeeker.certifications) {
      const certMatch = this.matchCertifications(jobSeeker.certifications, job.requiredCertifications);
      adjustments += certMatch * 0.02;
    }
    
    // Portfolio/Projects adjustment
    if (jobSeeker.projects && jobSeeker.projects.length > 0) {
      adjustments += 0.02;
    }
    
    // Response time adjustment (for employers)
    if (jobSeeker.responseTime && job.responseTimePreference) {
      const responseMatch = this.matchResponseTime(jobSeeker.responseTime, job.responseTimePreference);
      adjustments += responseMatch * 0.02;
    }
    
    return adjustments;
  }

  matchLanguages(seekerLanguages, requiredLanguages) {
    const seekerMap = new Map(seekerLanguages.map(lang => [lang.language, lang.proficiency]));
    let matchScore = 0;
    
    requiredLanguages.forEach(reqLang => {
      const proficiency = seekerMap.get(reqLang.language);
      if (proficiency) {
        const proficiencies = {
          'basic': 1,
          'intermediate': 2,
          'advanced': 3,
          'native': 4
        };
        
        const seekerLevel = proficiencies[proficiency] || 0;
        const requiredLevel = proficiencies[reqLang.proficiency] || 0;
        
        if (seekerLevel >= requiredLevel) {
          matchScore += 1;
        } else {
          matchScore += seekerLevel / requiredLevel;
        }
      }
    });
    
    return matchScore / requiredLanguages.length;
  }

  matchIndustries(seekerIndustries, jobIndustry) {
    const normalizedJobIndustry = jobIndustry.toLowerCase();
    const hasDirectExperience = seekerIndustries.some(industry => 
      industry.toLowerCase() === normalizedJobIndustry
    );
    
    if (hasDirectExperience) return 1;
    
    // Check for related industries
    const relatedIndustries = this.industryClassifications[normalizedJobIndustry] || [];
    const hasRelatedExperience = seekerIndustries.some(industry => 
      relatedIndustries.includes(industry.toLowerCase())
    );
    
    return hasRelatedExperience ? 0.7 : 0.3;
  }

  matchCertifications(seekerCerts, requiredCerts) {
    const seekerCertSet = new Set(seekerCerts.map(cert => cert.name.toLowerCase()));
    const matches = requiredCerts.filter(reqCert => 
      seekerCertSet.has(reqCert.toLowerCase())
    ).length;
    
    return matches / requiredCerts.length;
  }

  matchResponseTime(seekerResponse, preference) {
    const responseTimes = {
      'immediate': 1,
      'within_hours': 2,
      'within_days': 3,
      'within_week': 4
    };
    
    const seekerTime = responseTimes[seekerResponse] || 3;
    const preferredTime = responseTimes[preference] || 3;
    
    return seekerTime <= preferredTime ? 0.02 : -0.01;
  }

  /**
   * Get match level based on score
   */
  getMatchLevel(score) {
    if (score >= MATCHING_CONFIG.thresholds.goodMatch) return 'excellent';
    if (score >= MATCHING_CONFIG.thresholds.averageMatch) return 'good';
    if (score >= MATCHING_CONFIG.thresholds.poorMatch) return 'fair';
    return 'poor';
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(breakdown) {
    const recommendations = [];
    
    if (breakdown.skills < 0.7) {
      recommendations.push({
        category: 'skills',
        message: 'Consider acquiring more skills relevant to this role',
        priority: 'high'
      });
    }
    
    if (breakdown.experience < 0.6) {
      recommendations.push({
        category: 'experience',
        message: 'Gain more experience in this field or consider related roles',
        priority: 'medium'
      });
    }
    
    if (breakdown.location < 0.5) {
      recommendations.push({
        category: 'location',
        message: 'Consider remote opportunities or relocation',
        priority: 'medium'
      });
    }
    
    if (breakdown.salary < 0.4) {
      recommendations.push({
        category: 'salary',
        message: 'Salary expectations may need adjustment for this role',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Normalize skills for comparison
   */
  normalizeSkills(skills) {
    return skills.map(skill => {
      const normalized = skill.toLowerCase().trim();
      // Remove common variations
      return normalized
        .replace(/\.js$/, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w]/g, '');
    });
  }

  /**
   * Calculate semantic similarity between two text strings
   */
  calculateSemanticSimilarity(text1, text2) {
    // Simple cosine similarity using TF-IDF
    const vec1 = this.getTermFrequency(text1);
    const vec2 = this.getTermFrequency(text2);
    
    const intersection = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    intersection.forEach(term => {
      const v1 = vec1[term] || 0;
      const v2 = vec2[term] || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    });
    
    return norm1 && norm2 ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) : 0;
  }

  getTermFrequency(text) {
    const tokens = tokenizer.tokenize(text);
    const freq = {};
    
    tokens.forEach(token => {
      const stemmed = stemmer.stem(token);
      freq[stemmed] = (freq[stemmed] || 0) + 1;
    });
    
    return freq;
  }

  /**
   * Load skill synonyms from file or database
   */
  loadSkillSynonyms() {
    try {
      const synonymsPath = path.join(__dirname, '../data/skill-synonyms.json');
      if (fs.existsSync(synonymsPath)) {
        return JSON.parse(fs.readFileSync(synonymsPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load skill synonyms:', error.message);
    }
    
    // Return default synonyms
    return {
      'javascript': ['js', 'ecmascript', 'vanilla_js'],
      'react': ['react_js', 'reactjs'],
      'node': ['node_js', 'nodejs'],
      'python': ['py'],
      'sql': ['mysql', 'postgresql', 'sql_server'],
      'aws': ['amazon_web_services', 'amazon_aws'],
      // Add more synonyms as needed
    };
  }

  loadIndustryClassifications() {
    // This would typically come from a database or file
    return {
      'technology': ['software', 'it', 'computer', 'internet'],
      'finance': ['banking', 'insurance', 'investment'],
      'healthcare': ['medical', 'pharmaceutical', 'hospital'],
      'education': ['teaching', 'academic', 'training'],
      'retail': ['ecommerce', 'sales', 'merchandising']
    };
  }

  /**
   * Batch matching for multiple job seekers and jobs
   */
  async batchMatch(jobSeekers, jobs, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 10;
    
    for (let i = 0; i < jobSeekers.length; i += batchSize) {
      const seekerBatch = jobSeekers.slice(i, i + batchSize);
      
      for (const seeker of seekerBatch) {
        for (const job of jobs) {
          try {
            const matchResult = await this.calculateMatch(seeker, job, options);
            results.push({
              jobSeekerId: seeker.id,
              jobId: job.id,
              ...matchResult
            });
          } catch (error) {
            console.error(`Error matching seeker ${seeker.id} with job ${job.id}:`, error);
          }
        }
      }
    }
    
    // Sort by match score
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Train the model with historical data
   */
  async trainModel(trainingData) {
    // This would implement machine learning training
    // For now, it's a placeholder for future ML integration
    console.log('Training placeholder - ML integration coming soon');
    return { success: true, message: 'Training completed' };
  }

  /**
   * Predict match success probability
   */
  async predictSuccess(jobSeeker, job, historicalData = null) {
    const matchResult = await this.calculateMatch(jobSeeker, job);
    
    // Simple prediction based on match score and additional factors
    let successProbability = matchResult.score;
    
    // Adjust based on historical data if available
    if (historicalData) {
      const similarMatches = historicalData.filter(data => 
        data.score >= matchResult.score - 0.1 && 
        data.score <= matchResult.score + 0.1
      );
      
      if (similarMatches.length > 0) {
        const avgSuccess = similarMatches.reduce((sum, match) => sum + (match.success ? 1 : 0), 0) / similarMatches.length;
        successProbability = (successProbability * 0.7) + (avgSuccess * 0.3);
      }
    }
    
    return {
      probability: successProbability,
      confidence: this.calculateConfidence(matchResult),
      factors: this.getSuccessFactors(matchResult)
    };
  }

  calculateConfidence(matchResult) {
    // Confidence based on completeness of data
    const factors = Object.values(matchResult.breakdown);
    const completeness = factors.filter(score => score > 0).length / factors.length;
    const variance = this.calculateVariance(factors);
    
    return Math.min(1, completeness * (1 - variance));
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    return variance;
  }

  getSuccessFactors(matchResult) {
    const factors = [];
    
    if (matchResult.breakdown.skills > 0.8) {
      factors.push('strong_skill_match');
    }
    
    if (matchResult.breakdown.experience > 0.7) {
      factors.push('relevant_experience');
    }
    
    if (matchResult.breakdown.location > 0.9) {
      factors.push('ideal_location');
    }
    
    return factors;
  }
}

module.exports = new AIMatchingAlgorithm();