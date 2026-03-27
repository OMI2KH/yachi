import { useState, useEffect, useCallback } from 'react';
import { WorkerService } from '../services/worker-service';
import { AIService } from '../services/ai-assignment-service';
import { useAuth } from '../contexts/auth-context';
import { useLocation } from '../contexts/location-context';
import { useNotifications } from '../contexts/notification-context';
import { debounce } from '../utils/helpers';

/**
 * Enterprise-level hook for AI-powered worker matching
 * Handles construction project team formation with intelligent matching
 */
export const useWorkerMatching = () => {
  const { user } = useAuth();
  const { currentLocation } = useLocation();
  const { showNotification } = useNotifications();

  const [matchingWorkers, setMatchingWorkers] = useState([]);
  const [assignedTeam, setAssignedTeam] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [matchingCriteria, setMatchingCriteria] = useState(null);
  const [replacementQueue, setReplacementQueue] = useState([]);

  // AI matching algorithm for construction projects
  const findMatchingWorkers = useCallback(
    debounce(async (projectData, options = {}) => {
      const {
        projectType,
        skillsRequired,
        budgetRange,
        timeline,
        squareArea,
        floorCount,
        location,
        teamSize,
        excludedWorkers = []
      } = projectData;

      setIsLoading(true);
      setMatchingProgress(0);
      setMatchingCriteria({
        projectType,
        skillsRequired,
        budgetRange,
        location: location || currentLocation
      });

      try {
        setMatchingProgress(20);

        // Get AI-recommended worker matches
        const aiRecommendations = await AIService.getWorkerRecommendations({
          projectType,
          requiredSkills: skillsRequired,
          budgetConstraints: budgetRange,
          timeline,
          squareArea,
          floorCount,
          location: location || currentLocation,
          preferredTeamSize: teamSize,
          excludedWorkerIds: excludedWorkers
        });

        setMatchingProgress(60);

        // Filter available workers based on AI recommendations
        const availableWorkers = await WorkerService.getAvailableWorkers({
          workerIds: aiRecommendations.workerIds,
          location: location || currentLocation,
          skills: skillsRequired,
          availabilityDate: timeline?.startDate
        });

        setMatchingProgress(80);

        // Score and rank workers based on multiple factors
        const scoredWorkers = scoreWorkers(availableWorkers, {
          projectType,
          skillsRequired,
          location: location || currentLocation,
          budgetRange,
          userRatingWeight: 0.3,
          distanceWeight: 0.25,
          experienceWeight: 0.2,
          priceWeight: 0.15,
          availabilityWeight: 0.1
        });

        setMatchingWorkers(scoredWorkers);
        setMatchingProgress(100);

        // Log matching activity for AI improvement
        await AIService.logMatchingActivity({
          projectData,
          matchedWorkers: scoredWorkers,
          matchingCriteria,
          userId: user?.id
        });

        return scoredWorkers;
      } catch (error) {
        console.error('Worker matching failed:', error);
        showNotification({
          type: 'error',
          title: 'Matching Failed',
          message: 'Unable to find suitable workers. Please try again.'
        });
        return [];
      } finally {
        setIsLoading(false);
        setMatchingProgress(0);
      }
    }, 500),
    [currentLocation, user?.id]
  );

  // Form complete construction team based on project requirements
  const formProjectTeam = useCallback(async (projectRequirements) => {
    const {
      projectType,
      squareArea,
      floorCount,
      budget,
      timeline,
      requiredRoles,
      location
    } = projectRequirements;

    setIsLoading(true);

    try {
      // Calculate optimal team size based on project parameters
      const optimalTeamSize = calculateOptimalTeamSize({
        squareArea,
        floorCount,
        projectType,
        budget
      });

      // Get role-specific requirements
      const roleRequirements = getRoleRequirements(projectType, requiredRoles);

      // Find workers for each role
      const teamFormation = await formTeamByRoles(
        roleRequirements,
        optimalTeamSize,
        location || currentLocation,
        budget,
        timeline
      );

      setAssignedTeam(teamFormation);

      // Send team assignment notifications
      await sendTeamAssignmentNotifications(teamFormation, projectRequirements);

      return teamFormation;
    } catch (error) {
      console.error('Team formation failed:', error);
      showNotification({
        type: 'error',
        title: 'Team Formation Failed',
        message: 'Unable to form project team. Please adjust requirements.'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation]);

  // Smart worker replacement system
  const replaceWorker = useCallback(async (workerId, reason, projectContext) => {
    try {
      // Add to replacement queue
      setReplacementQueue(prev => [...prev, { workerId, reason, timestamp: Date.now() }]);

      // Find replacement with similar or better qualifications
      const replacement = await findReplacementWorker(
        workerId,
        projectContext,
        matchingWorkers
      );

      if (replacement) {
        // Update assigned team
        setAssignedTeam(prev => 
          prev.map(worker => 
            worker.id === workerId ? replacement : worker
          )
        );

        // Notify about replacement
        showNotification({
          type: 'success',
          title: 'Worker Replaced',
          message: `${replacement.name} has been assigned as replacement`
        });

        return replacement;
      }

      return null;
    } catch (error) {
      console.error('Worker replacement failed:', error);
      return null;
    }
  }, [matchingWorkers]);

  // Bulk worker assignment for government projects
  const assignBulkWorkers = useCallback(async (projectBatch, assignmentStrategy = 'optimized') => {
    setIsLoading(true);

    try {
      const batchResults = [];

      for (const project of projectBatch) {
        const team = await formProjectTeam({
          ...project,
          assignmentStrategy
        });

        batchResults.push({
          projectId: project.id,
          assignedTeam: team,
          assignmentDate: new Date().toISOString()
        });
      }

      // Send bulk assignment report
      await sendBulkAssignmentReport(batchResults);

      return batchResults;
    } catch (error) {
      console.error('Bulk assignment failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [formProjectTeam]);

  // Worker scoring algorithm
  const scoreWorkers = (workers, criteria) => {
    return workers.map(worker => {
      let score = 0;
      const factors = [];

      // Rating factor (0-30 points)
      const ratingScore = (worker.rating / 5) * 30;
      factors.push({ name: 'rating', score: ratingScore });
      score += ratingScore;

      // Distance factor (0-25 points)
      const distanceScore = calculateDistanceScore(worker.location, criteria.location);
      factors.push({ name: 'distance', score: distanceScore });
      score += distanceScore;

      // Experience factor (0-20 points)
      const experienceScore = calculateExperienceScore(worker.experience, criteria.projectType);
      factors.push({ name: 'experience', score: experienceScore });
      score += experienceScore;

      // Price factor (0-15 points)
      const priceScore = calculatePriceScore(worker.hourlyRate, criteria.budgetRange);
      factors.push({ name: 'price', score: priceScore });
      score += priceScore;

      // Availability factor (0-10 points)
      const availabilityScore = worker.immediateAvailability ? 10 : 5;
      factors.push({ name: 'availability', score: availabilityScore });
      score += availabilityScore;

      return {
        ...worker,
        matchingScore: Math.round(score),
        scoreFactors: factors,
        suitability: getSuitabilityLevel(score)
      };
    }).sort((a, b) => b.matchingScore - a.matchingScore);
  };

  // Calculate optimal team size based on project parameters
  const calculateOptimalTeamSize = (projectParams) => {
    const { squareArea, floorCount, projectType, budget } = projectParams;
    
    let baseSize = 0;

    switch (projectType) {
      case 'new_construction':
        baseSize = Math.ceil(squareArea / 100) + (floorCount * 2);
        break;
      case 'finishing_work':
        baseSize = Math.ceil(squareArea / 150) + floorCount;
        break;
      case 'renovation':
        baseSize = Math.ceil(squareArea / 120) + (floorCount * 1.5);
        break;
      case 'government_infrastructure':
        baseSize = Math.ceil(squareArea / 200) + 5; // Minimum team for infrastructure
        break;
      default:
        baseSize = Math.ceil(squareArea / 100);
    }

    // Adjust based on budget constraints
    const budgetAdjustedSize = Math.min(
      baseSize,
      Math.floor(budget / 50000) // Assuming 50,000 ETB per worker
    );

    return Math.max(3, budgetAdjustedSize); // Minimum 3 workers per project
  };

  // Clear matching state
  const clearMatching = useCallback(() => {
    setMatchingWorkers([]);
    setAssignedTeam([]);
    setMatchingCriteria(null);
    setReplacementQueue([]);
  }, []);

  return {
    // State
    matchingWorkers,
    assignedTeam,
    isLoading,
    matchingProgress,
    matchingCriteria,
    replacementQueue,

    // Actions
    findMatchingWorkers,
    formProjectTeam,
    replaceWorker,
    assignBulkWorkers,
    clearMatching,

    // Utilities
    calculateOptimalTeamSize
  };
};

// Helper functions
const calculateDistanceScore = (workerLocation, projectLocation) => {
  if (!workerLocation || !projectLocation) return 15; // Default mid score
  
  const distance = calculateDistance(workerLocation, projectLocation);
  
  if (distance < 5) return 25;    // Within 5km - excellent
  if (distance < 15) return 20;   // Within 15km - very good
  if (distance < 30) return 15;   // Within 30km - good
  if (distance < 50) return 10;   // Within 50km - acceptable
  return 5;                       // Beyond 50km - poor
};

const calculateExperienceScore = (experience, projectType) => {
  const years = experience || 0;
  let multiplier = 1;

  switch (projectType) {
    case 'new_construction':
      multiplier = 1.2;
      break;
    case 'government_infrastructure':
      multiplier = 1.5;
      break;
    case 'finishing_work':
      multiplier = 1.1;
      break;
    default:
      multiplier = 1;
  }

  return Math.min(20, years * multiplier * 4);
};

const calculatePriceScore = (hourlyRate, budgetRange) => {
  if (!budgetRange) return 10;

  const { min, max } = budgetRange;
  const averageBudget = (min + max) / 2;

  if (hourlyRate <= averageBudget * 0.8) return 15;  // Excellent price
  if (hourlyRate <= averageBudget) return 12;        // Good price
  if (hourlyRate <= averageBudget * 1.2) return 8;   // Acceptable price
  return 5;                                          // High price
};

const getSuitabilityLevel = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'very-good';
  if (score >= 60) return 'good';
  if (score >= 50) return 'acceptable';
  return 'poor';
};

const formTeamByRoles = async (roleRequirements, teamSize, location, budget, timeline) => {
  // Implementation for forming balanced team with required roles
  const team = [];
  
  for (const role of roleRequirements) {
    const workers = await WorkerService.getWorkersByRole({
      role: role.type,
      location,
      limit: Math.ceil(teamSize / roleRequirements.length)
    });
    
    team.push(...workers.slice(0, role.requiredCount));
  }

  return team;
};

const findReplacementWorker = async (workerId, projectContext, availableWorkers) => {
  // Find best replacement from available workers
  const originalWorker = availableWorkers.find(w => w.id === workerId);
  if (!originalWorker) return null;

  const replacements = availableWorkers.filter(worker => 
    worker.id !== workerId &&
    worker.skills.some(skill => originalWorker.skills.includes(skill)) &&
    worker.rating >= originalWorker.rating - 1
  );

  return replacements[0] || null;
};

const sendTeamAssignmentNotifications = async (team, project) => {
  // Send notifications to all assigned workers
  for (const worker of team) {
    await WorkerService.sendAssignmentNotification(worker.id, {
      projectId: project.id,
      projectType: project.projectType,
      location: project.location,
      startDate: project.timeline?.startDate,
      budget: project.budget
    });
  }
};

const sendBulkAssignmentReport = async (batchResults) => {
  // Send comprehensive report for bulk assignments
  await AIService.logBulkAssignment(batchResults);
};

// Distance calculation helper (simplified)
const calculateDistance = (loc1, loc2) => {
  // Simplified distance calculation - in real app, use Haversine formula
  return Math.sqrt(
    Math.pow(loc1.lat - loc2.lat, 2) + 
    Math.pow(loc1.lng - loc2.lng, 2)
  ) * 111; // Convert to kilometers
};

const getRoleRequirements = (projectType, customRoles = []) => {
  const baseRoles = {
    new_construction: [
      { type: 'foreman', requiredCount: 1 },
      { type: 'mason', requiredCount: 2 },
      { type: 'carpenter', requiredCount: 1 },
      { type: 'laborer', requiredCount: 3 }
    ],
    finishing_work: [
      { type: 'finishing_foreman', requiredCount: 1 },
      { type: 'painter', requiredCount: 2 },
      { type: 'tiler', requiredCount: 1 },
      { type: 'electrician', requiredCount: 1 },
      { type: 'plumber', requiredCount: 1 }
    ],
    government_infrastructure: [
      { type: 'project_manager', requiredCount: 1 },
      { type: 'civil_engineer', requiredCount: 1 },
      { type: 'heavy_equipment_operator', requiredCount: 2 },
      { type: 'skilled_laborer', requiredCount: 5 }
    ]
  };

  return customRoles.length > 0 ? customRoles : (baseRoles[projectType] || baseRoles.new_construction);
};