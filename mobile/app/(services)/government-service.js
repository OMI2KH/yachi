import apiClient from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

const GOVERNMENT_API_BASE = '/api/government';

export const GovernmentService = {
  // ==================== COLLIDOR CITY CONSTRUCTION ====================
  
  // Get all active construction projects
  getAllProjects: async (params = {}) => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/construction/projects`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  // Get project details by ID
  getProjectById: async (projectId) => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/construction/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project details:', error);
      throw error;
    }
  },

  // Apply for a construction project
  applyForProject: async (projectId, applicationData) => {
    try {
      const response = await apiClient.post(
        `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/apply`,
        applicationData
      );
      return response.data;
    } catch (error) {
      console.error('Error applying for project:', error);
      throw error;
    }
  },

  // Get user's project applications
  getMyApplications: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/construction/my-applications`);
      return response.data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  },

  // ==================== AI WORKER MATCHING ====================
  
  // Get AI-recommended projects based on user profile
  getAIMatchedProjects: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/ai/matching/projects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching AI-matched projects:', error);
      throw error;
    }
  },

  // Update worker profile for better AI matching
  updateWorkerProfile: async (profileData) => {
    try {
      const response = await apiClient.put(
        `${GOVERNMENT_API_BASE}/ai/worker-profile`,
        profileData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating worker profile:', error);
      throw error;
    }
  },

  // Get worker profile completeness score
  getProfileScore: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/ai/profile-score`);
      return response.data;
    } catch (error) {
      console.error('Error fetching profile score:', error);
      throw error;
    }
  },

  // Get match explanation (why AI recommended specific projects)
  getMatchExplanation: async (projectId) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/ai/matching/explanation/${projectId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching match explanation:', error);
      throw error;
    }
  },

  // ==================== SKILLS & CERTIFICATIONS ====================
  
  // Get all available construction skills
  getAllSkills: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/skills`);
      return response.data;
    } catch (error) {
      console.error('Error fetching skills:', error);
      throw error;
    }
  },

  // Add skills to worker profile
  addSkills: async (skills) => {
    try {
      const response = await apiClient.post(`${GOVERNMENT_API_BASE}/skills`, { skills });
      return response.data;
    } catch (error) {
      console.error('Error adding skills:', error);
      throw error;
    }
  },

  // Get certifications list
  getCertifications: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/certifications`);
      return response.data;
    } catch (error) {
      console.error('Error fetching certifications:', error);
      throw error;
    }
  },

  // Upload certification document
  uploadCertification: async (certificationData, document) => {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(certificationData));
      formData.append('document', document);
      
      const response = await apiClient.post(
        `${GOVERNMENT_API_BASE}/certifications/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading certification:', error);
      throw error;
    }
  },

  // ==================== PROJECT MANAGEMENT ====================
  
  // Get project timeline and milestones
  getProjectTimeline: async (projectId) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/timeline`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching project timeline:', error);
      throw error;
    }
  },

  // Submit daily work report
  submitWorkReport: async (projectId, reportData) => {
    try {
      const response = await apiClient.post(
        `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/report`,
        reportData
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting work report:', error);
      throw error;
    }
  },

  // Get project attendance
  getAttendance: async (projectId, params = {}) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/attendance`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  },

  // ==================== PAYMENTS & EARNINGS ====================
  
  // Get project payments and earnings
  getProjectEarnings: async (projectId) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/earnings`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching project earnings:', error);
      throw error;
    }
  },

  // Get all earnings history
  getEarningsHistory: async (params = {}) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/earnings/history`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching earnings history:', error);
      throw error;
    }
  },

  // Request payment withdrawal
  requestWithdrawal: async (withdrawalData) => {
    try {
      const response = await apiClient.post(
        `${GOVERNMENT_API_BASE}/earnings/withdraw`,
        withdrawalData
      );
      return response.data;
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      throw error;
    }
  },

  // ==================== RATINGS & REVIEWS ====================
  
  // Rate a project/contractor
  rateProject: async (projectId, ratingData) => {
    try {
      const response = await apiClient.post(
        `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/rate`,
        ratingData
      );
      return response.data;
    } catch (error) {
      console.error('Error rating project:', error);
      throw error;
    }
  },

  // Get worker ratings
  getWorkerRatings: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/ratings/worker`);
      return response.data;
    } catch (error) {
      console.error('Error fetching worker ratings:', error);
      throw error;
    }
  },

  // ==================== NOTIFICATIONS & ALERTS ====================
  
  // Get project notifications
  getProjectNotifications: async (projectId) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/notifications/project/${projectId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching project notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  markNotificationRead: async (notificationId) => {
    try {
      const response = await apiClient.put(
        `${GOVERNMENT_API_BASE}/notifications/${notificationId}/read`
      );
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // ==================== AI MATCHING CONFIGURATION ====================
  
  // Update matching preferences
  updateMatchingPreferences: async (preferences) => {
    try {
      const response = await apiClient.put(
        `${GOVERNMENT_API_BASE}/ai/matching/preferences`,
        preferences
      );
      return response.data;
    } catch (error) {
      console.error('Error updating matching preferences:', error);
      throw error;
    }
  },

  // Get AI matching statistics
  getMatchingStats: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/ai/matching/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching matching stats:', error);
      throw error;
    }
  },

  // ==================== ANALYTICS & INSIGHTS ====================
  
  // Get worker performance analytics
  getPerformanceAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get(
        `${GOVERNMENT_API_BASE}/analytics/performance`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      throw error;
    }
  },

  // Get market insights (demand for skills, etc.)
  getMarketInsights: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/analytics/market-insights`);
      return response.data;
    } catch (error) {
      console.error('Error fetching market insights:', error);
      throw error;
    }
  },

  // ==================== SUPPORT & HELP ====================
  
  // Report project issue
  reportIssue: async (projectId, issueData) => {
    try {
      const response = await apiClient.post(
        `${GOVERNMENT_API_BASE}/support/project/${projectId}/issue`,
        issueData
      );
      return response.data;
    } catch (error) {
      console.error('Error reporting issue:', error);
      throw error;
    }
  },

  // Get FAQ for construction projects
  getConstructionFAQ: async () => {
    try {
      const response = await apiClient.get(`${GOVERNMENT_API_BASE}/support/faq/construction`);
      return response.data;
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      throw error;
    }
  }
};

// React Hook for using the government service
export const useGovernmentService = () => {
  const { user } = useAuth();
  
  const serviceWithAuth = {
    ...GovernmentService,
    
    // Override methods that need authentication context
    getAIMatchedProjects: async () => {
      if (!user) throw new Error('Authentication required');
      return GovernmentService.getAIMatchedProjects();
    },
    
    // Helper method to check if user is eligible for a project
    checkEligibility: async (projectId) => {
      try {
        const response = await apiClient.get(
          `${GOVERNMENT_API_BASE}/construction/projects/${projectId}/eligibility`
        );
        return response.data;
      } catch (error) {
        console.error('Error checking eligibility:', error);
        throw error;
      }
    },
    
    // Quick apply with AI-suggested application
    quickApplyWithAI: async (projectId) => {
      try {
        const response = await apiClient.post(
          `${GOVERNMENT_API_BASE}/ai/matching/quick-apply/${projectId}`
        );
        return response.data;
      } catch (error) {
        console.error('Error with quick apply:', error);
        throw error;
      }
    }
  };
  
  return serviceWithAuth;
};

export default GovernmentService;