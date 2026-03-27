import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useUser } from '../../../contexts/user-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { 
  ThemedView, 
  ThemedText 
} from '../../../components/themed-view';
import { 
  Button 
} from '../../../components/ui/button';
import { 
  Card 
} from '../../../components/ui/card';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  Avatar 
} from '../../../components/ui/avatar';
import { 
  Badge 
} from '../../../components/ui/badge';
import { 
  Rating 
} from '../../../components/ui/rating';
import { 
  WorkerProfile 
} from '../../../components/profile/worker-profile';
import { 
  ProfileHeader 
} from '../../../components/profile/profile-header';
import { 
  SkillTags 
} from '../../../components/profile/skill-tags';
import { 
  PortfolioGrid 
} from '../../../components/profile/portfolio-grid';
import { 
  VerificationBadge 
} from '../../../components/profile/verification-badge';
import { 
  LevelProgress 
} from '../../../components/gamification/level-progress';
import { 
  PointsDisplay 
} from '../../../components/gamification/points-display';
import { 
  AchievementCard 
} from '../../../components/gamification/achievement-card';
import { 
  PremiumBadge 
} from '../../../components/premium/premium-badge';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  userService 
} from '../../../services/user-service';
import { 
  workerService 
} from '../../../services/worker-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Worker Profile Screen
 * Features: Portfolio management, skill verification, performance metrics, AI matching readiness
 */
const WorkerProfileScreen = () => {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user, profile, refreshUser } = useUser();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [workerStats, setWorkerStats] = useState({
    completedJobs: 0,
    activeProjects: 0,
    totalEarnings: 0,
    averageRating: 0,
    responseRate: 0,
    completionRate: 0,
    repeatClients: 0,
  });
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [skills, setSkills] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [availability, setAvailability] = useState({
    status: 'available', // available, busy, away, offline
    nextAvailable: null,
    workRadius: 10, // km
    acceptedJobTypes: [],
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('WorkerProfile');
    }, [])
  );

  // Load worker data
  const loadWorkerData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Load worker-specific data
      const [
        stats,
        portfolio,
        workerSkills,
        workerAchievements,
        availabilityData
      ] = await Promise.all([
        workerService.getWorkerStats(user?.id),
        workerService.getPortfolio(user?.id),
        workerService.getSkills(user?.id),
        workerService.getAchievements(user?.id),
        workerService.getAvailability(user?.id),
      ]);
      
      setWorkerStats(stats);
      setPortfolioItems(portfolio);
      setSkills(workerSkills);
      setAchievements(workerAchievements);
      setAvailability(availabilityData);
      
      analyticsService.trackEvent('worker_profile_loaded', {
        userId: user?.id,
        verificationLevel: user?.verificationLevel,
        isPremium: user?.isPremium,
        completedJobs: stats.completedJobs,
        averageRating: stats.averageRating,
      });
    } catch (error) {
      console.error('Error loading worker data:', error);
      showError('Failed to load profile data');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, user?.verificationLevel, user?.isPremium]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadWorkerData();
    }, [loadWorkerData])
  );

  // Handle navigation
  const handleNavigation = (screen, params = {}) => {
    analyticsService.trackEvent('worker_profile_navigation', {
      destination: screen,
      userId: user?.id,
    });
    router.push({ pathname: screen, params });
  };

  // Handle portfolio item press
  const handlePortfolioPress = (item) => {
    analyticsService.trackEvent('portfolio_item_viewed', {
      userId: user?.id,
      itemId: item.id,
      itemType: item.type,
    });
    // Navigate to portfolio detail or show modal
    handleNavigation('/(profile)/portfolio', { itemId: item.id });
  };

  // Handle skill edit
  const handleEditSkills = () => {
    analyticsService.trackEvent('skills_edit_initiated', { userId: user?.id });
    handleNavigation('/(profile)/edit', { section: 'skills' });
  };

  // Handle availability toggle
  const handleToggleAvailability = async () => {
    try {
      const newStatus = availability.status === 'available' ? 'busy' : 'available';
      
      await workerService.updateAvailability(user?.id, {
        status: newStatus
      });
      
      setAvailability(prev => ({ ...prev, status: newStatus }));
      
      analyticsService.trackEvent('availability_updated', {
        userId: user?.id,
        newStatus: newStatus,
        previousStatus: availability.status,
      });
      
      showSuccess(`Marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      showError('Failed to update availability');
    }
  };

  // Handle work radius update
  const handleWorkRadiusUpdate = async (radius) => {
    try {
      await workerService.updateAvailability(user?.id, {
        workRadius: radius
      });
      
      setAvailability(prev => ({ ...prev, workRadius: radius }));
      
      analyticsService.trackEvent('work_radius_updated', {
        userId: user?.id,
        radius: radius,
      });
      
      showSuccess(`Work radius updated to ${radius}km`);
    } catch (error) {
      console.error('Error updating work radius:', error);
      showError('Failed to update work radius');
    }
  };

  // Handle portfolio upload
  const handlePortfolioUpload = () => {
    analyticsService.trackEvent('portfolio_upload_initiated', { userId: user?.id });
    handleNavigation('/(profile)/portfolio', { action: 'upload' });
  };

  // Handle verification upgrade
  const handleVerificationUpgrade = () => {
    analyticsService.trackEvent('verification_upgrade_initiated', { 
      userId: user?.id,
      currentLevel: user?.verificationLevel,
    });
    handleNavigation('/(profile)/verification');
  };

  // Handle premium upgrade
  const handlePremiumUpgrade = () => {
    analyticsService.trackEvent('premium_upgrade_worker_initiated', { 
      userId: user?.id,
      currentPlan: user?.isPremium ? 'premium' : 'free',
    });
    handleNavigation('/(premium)/index');
  };

  // Handle AI matching optimization
  const handleAIMatchingOptimize = () => {
    analyticsService.trackEvent('ai_matching_optimize_initiated', { userId: user?.id });
    
    Alert.alert(
      'AI Matching Optimization',
      'Improve your profile to get better job matches through our AI system:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Optimize Now', 
          onPress: () => handleNavigation('/(services)/ai-matching-service')
        },
      ]
    );
  };

  // Render stats overview
  const renderStatsOverview = () => (
    <Card style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {workerStats.completedJobs}
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Jobs Done
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {workerStats.averageRating}/5
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Rating
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {workerStats.repeatClients}
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Repeat Clients
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {workerStats.completionRate}%
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            Completion
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.earningsSection}>
        <ThemedText style={styles.earningsLabel}>
          Total Earnings
        </ThemedText>
        <ThemedText style={styles.earningsValue}>
          {workerStats.totalEarnings.toLocaleString()} ETB
        </ThemedText>
      </View>
    </Card>
  );

  // Render availability section
  const renderAvailabilitySection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Availability
        </ThemedText>
        <Badge 
          variant={
            availability.status === 'available' ? 'success' :
            availability.status === 'busy' ? 'warning' : 'secondary'
          }
        >
          {availability.status.toUpperCase()}
        </Badge>
      </View>
      
      <View style={styles.availabilityControls}>
        <Button
          variant={availability.status === 'available' ? 'outlined' : 'primary'}
          onPress={handleToggleAvailability}
          size="small"
          style={styles.availabilityButton}
        >
          {availability.status === 'available' ? 'Mark as Busy' : 'Mark as Available'}
        </Button>
        
        <Button
          variant="ghost"
          onPress={() => handleNavigation('/profile/availability')}
          size="small"
          style={styles.availabilityButton}
        >
          Set Schedule
        </Button>
      </View>
      
      <View style={styles.workRadiusSection}>
        <ThemedText style={styles.workRadiusLabel}>
          Work Radius: {availability.workRadius} km
        </ThemedText>
        <View style={styles.workRadiusOptions}>
          {[5, 10, 15, 20, 30].map((radius) => (
            <Button
              key={radius}
              variant={availability.workRadius === radius ? 'primary' : 'outlined'}
              size="small"
              onPress={() => handleWorkRadiusUpdate(radius)}
              style={styles.radiusButton}
            >
              {radius}km
            </Button>
          ))}
        </View>
      </View>
    </Card>
  );

  // Render skills section
  const renderSkillsSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Skills & Specializations
        </ThemedText>
        <Button
          variant="ghost"
          onPress={handleEditSkills}
          size="small"
        >
          Edit
        </Button>
      </View>
      
      <SkillTags 
        skills={skills}
        onSkillPress={(skill) => {
          analyticsService.trackEvent('skill_viewed', {
            userId: user?.id,
            skill: skill.name,
          });
        }}
        style={styles.skillsContainer}
      />
      
      <ThemedText style={styles.skillsDescription}>
        These skills help our AI match you with relevant construction projects
      </ThemedText>
    </Card>
  );

  // Render portfolio section
  const renderPortfolioSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Portfolio ({portfolioItems.length})
        </ThemedText>
        <Button
          variant="primary"
          onPress={handlePortfolioUpload}
          size="small"
          leftIcon="add"
        >
          Add Work
        </Button>
      </View>
      
      {portfolioItems.length > 0 ? (
        <PortfolioGrid
          items={portfolioItems.slice(0, 6)}
          onItemPress={handlePortfolioPress}
          style={styles.portfolioGrid}
        />
      ) : (
        <View style={styles.emptyPortfolio}>
          <ThemedText style={styles.emptyPortfolioTitle}>
            No Portfolio Items Yet
          </ThemedText>
          <ThemedText style={styles.emptyPortfolioText}>
            Showcase your best work to attract more clients
          </ThemedText>
          <Button onPress={handlePortfolioUpload}>
            Add Your First Project
          </Button>
        </View>
      )}
      
      {portfolioItems.length > 6 && (
        <Button
          variant="ghost"
          onPress={() => handleNavigation('/(profile)/portfolio')}
          style={styles.viewAllButton}
        >
          View All Projects ({portfolioItems.length})
        </Button>
      )}
    </Card>
  );

  // Render AI matching section
  const renderAIMatchingSection = () => (
    <Card style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>
        AI Project Matching
      </ThemedText>
      
      <View style={styles.aiMatchingStats}>
        <View style={styles.aiStat}>
          <ThemedText style={styles.aiStatValue}>
            {workerStats.responseRate}%
          </ThemedText>
          <ThemedText style={styles.aiStatLabel}>
            Response Rate
          </ThemedText>
        </View>
        
        <View style={styles.aiStat}>
          <ThemedText style={styles.aiStatValue}>
            {Math.round(workerStats.averageRating * 20)}%
          </ThemedText>
          <ThemedText style={styles.aiStatLabel}>
            Profile Score
          </ThemedText>
        </View>
        
        <View style={styles.aiStat}>
          <ThemedText style={styles.aiStatValue}>
            {skills.filter(s => s.verified).length}
          </ThemedText>
          <ThemedText style={styles.aiStatLabel}>
            Verified Skills
          </ThemedText>
        </View>
      </View>
      
      <Button
        variant="outlined"
        onPress={handleAIMatchingOptimize}
        leftIcon="ai"
        style={styles.aiButton}
      >
        Optimize for AI Matching
      </Button>
      
      <ThemedText style={styles.aiDescription}>
        Improve your profile to get matched with higher-paying construction projects
      </ThemedText>
    </Card>
  );

  // Render achievements section
  const renderAchievementsSection = () => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          Achievements
        </ThemedText>
        <Button
          variant="ghost"
          onPress={() => handleNavigation('/profile/achievements')}
          size="small"
        >
          View All
        </Button>
      </View>
      
      {achievements.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {achievements.slice(0, 5).map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              style={styles.achievementCard}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyAchievements}>
          <ThemedText style={styles.emptyAchievementsText}>
            Complete jobs to unlock achievements
          </ThemedText>
        </View>
      )}
    </Card>
  );

  // Render upgrade section
  const renderUpgradeSection = () => (
    <Card style={styles.upgradeCard}>
      <View style={styles.upgradeHeader}>
        <ThemedText style={styles.upgradeTitle}>
          Boost Your Profile
        </ThemedText>
        <ThemedText style={styles.upgradeDescription}>
          Get more visibility and better project matches
        </ThemedText>
      </View>
      
      <View style={styles.upgradeOptions}>
        <Button
          variant={user?.isPremium ? 'success' : 'primary'}
          onPress={handlePremiumUpgrade}
          leftIcon="premium"
          style={styles.upgradeButton}
        >
          {user?.isPremium ? 'Premium Active' : 'Go Premium - 200 ETB/m'}
        </Button>
        
        <Button
          variant="outlined"
          onPress={handleVerificationUpgrade}
          leftIcon="verified"
          style={styles.upgradeButton}
        >
          Get Verified
        </Button>
      </View>
    </Card>
  );

  if (isLoading && !user) {
    return <Loading message="Loading your worker profile..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadWorkerData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <ProfileHeader
          user={user}
          profile={profile}
          showStats={false}
          onEditPress={() => handleNavigation('/(profile)/edit')}
        />

        {/* Status Badges */}
        <View style={styles.badgesContainer}>
          <VerificationBadge 
            level={user?.verificationLevel} 
            onPress={handleVerificationUpgrade}
          />
          <PremiumBadge 
            isActive={user?.isPremium} 
            onPress={handlePremiumUpgrade}
          />
        </View>

        {/* Gamification Progress */}
        <View style={styles.gamificationContainer}>
          <LevelProgress 
            currentLevel={user?.level || 1}
            progress={user?.levelProgress || 0}
            pointsToNextLevel={user?.pointsToNextLevel || 100}
          />
          <PointsDisplay points={user?.points || 0} />
        </View>

        {/* Stats Overview */}
        {renderStatsOverview()}

        {/* Availability Section */}
        {renderAvailabilitySection()}

        {/* Skills Section */}
        {renderSkillsSection()}

        {/* Portfolio Section */}
        {renderPortfolioSection()}

        {/* AI Matching Section */}
        {renderAIMatchingSection()}

        {/* Achievements Section */}
        {renderAchievementsSection()}

        {/* Upgrade Section */}
        {renderUpgradeSection()}

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <ThemedText style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.quickActionsGrid}>
            <Button
              variant="outlined"
              onPress={() => handleNavigation('/(bookings)/history')}
              leftIcon="history"
              style={styles.quickActionButton}
            >
              Job History
            </Button>
            
            <Button
              variant="outlined"
              onPress={() => handleNavigation('/(payment)/history')}
              leftIcon="payment"
              style={styles.quickActionButton}
            >
              Earnings
            </Button>
            
            <Button
              variant="outlined"
              onPress={() => handleNavigation('/profile/documents')}
              leftIcon="document"
              style={styles.quickActionButton}
            >
              Documents
            </Button>
            
            <Button
              variant="outlined"
              onPress={() => handleNavigation('/profile/training')}
              leftIcon="training"
              style={styles.quickActionButton}
            >
              Training
            </Button>
          </View>
        </Card>
      </ScrollView>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gamificationContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  earningsSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  earningsLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  availabilityControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  availabilityButton: {
    flex: 1,
  },
  workRadiusSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  workRadiusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  workRadiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusButton: {
    flex: 1,
    minWidth: '18%',
  },
  skillsContainer: {
    marginBottom: 12,
  },
  skillsDescription: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  portfolioGrid: {
    marginBottom: 16,
  },
  emptyPortfolio: {
    alignItems: 'center',
    padding: 32,
  },
  emptyPortfolioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyPortfolioText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  viewAllButton: {
    marginTop: 8,
  },
  aiMatchingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiStat: {
    alignItems: 'center',
    flex: 1,
  },
  aiStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiStatLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  aiButton: {
    marginBottom: 12,
  },
  aiDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  achievementCard: {
    marginRight: 12,
    width: 140,
  },
  emptyAchievements: {
    alignItems: 'center',
    padding: 20,
  },
  emptyAchievementsText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  upgradeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeOptions: {
    gap: 12,
  },
  upgradeButton: {
    width: '100%',
  },
  quickActionsCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
};

export default WorkerProfileScreen;