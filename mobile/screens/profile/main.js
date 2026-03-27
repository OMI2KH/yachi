import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useUser } from '../../../contexts/user-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { useTheme } from '../../../contexts/theme-context';
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
  Avatar 
} from '../../../components/ui/avatar';
import { 
  Badge 
} from '../../../components/ui/badge';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  VerificationBadge 
} from '../../../components/profile/verification-badge';
import { 
  ProfileHeader 
} from '../../../components/profile/profile-header';
import { 
  LevelProgress 
} from '../../../components/gamification/level-progress';
import { 
  PointsDisplay 
} from '../../../components/gamification/points-display';
import { 
  PremiumBadge 
} from '../../../components/premium/premium-badge';
import { 
  AchievementCard 
} from '../../../components/gamification/achievement-card';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  userService 
} from '../../../services/user-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Profile Main Screen
 * Features: Multi-role support, premium features, gamification, verification system
 */
const ProfileMainScreen = () => {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { 
    user, 
    profile, 
    refreshUser, 
    isLoading, 
    updateProfile 
  } = useUser();
  const { hasUnreadNotifications } = useNotifications();
  const { theme, isDark } = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState({
    completedBookings: 0,
    activeProjects: 0,
    totalEarnings: 0,
    averageRating: 0,
  });

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ProfileMain');
    }, [])
  );

  // Load user data and statistics
  const loadUserData = useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshUser();
      
      // Load quick statistics based on user role
      const stats = await userService.getUserQuickStats(user?.id);
      setQuickStats(stats);
      
      // Track profile view
      analyticsService.trackEvent('profile_view', {
        userId: user?.id,
        userRole: user?.role,
        isPremium: user?.isPremium,
        verificationLevel: user?.verificationLevel,
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
      notificationService.showError('Failed to load profile data');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, user?.role, refreshUser]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  // Handle profile action navigation
  const handleNavigation = (screen, params = {}) => {
    analyticsService.trackEvent('profile_navigation', {
      destination: screen,
      userId: user?.id,
    });
    router.push({ pathname: screen, params });
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await analyticsService.trackEvent('user_logout', { userId: user?.id });
            await logout();
          }
        },
      ]
    );
  };

  // Handle premium upgrade
  const handlePremiumUpgrade = () => {
    analyticsService.trackEvent('premium_upgrade_click', { userId: user?.id });
    handleNavigation('/(premium)/index');
  };

  // Handle verification
  const handleVerification = () => {
    analyticsService.trackEvent('verification_start', { userId: user?.id });
    handleNavigation('/(profile)/verification');
  };

  // Render quick actions based on user role
  const renderQuickActions = () => {
    const baseActions = [
      {
        icon: 'edit',
        label: 'Edit Profile',
        onPress: () => handleNavigation('/(profile)/edit'),
        color: theme.colors.primary,
      },
      {
        icon: 'portfolio',
        label: 'Portfolio',
        onPress: () => handleNavigation('/(profile)/portfolio'),
        color: theme.colors.secondary,
      },
      {
        icon: 'settings',
        label: 'Settings',
        onPress: () => handleNavigation('/profile/settings'),
        color: theme.colors.text,
      },
    ];

    if (user?.role === 'service_provider' || user?.role === 'worker') {
      baseActions.push(
        {
          icon: 'badge',
          label: 'Get Verified',
          onPress: handleVerification,
          color: theme.colors.warning,
        },
        {
          icon: 'premium',
          label: user?.isPremium ? 'Premium Active' : 'Go Premium',
          onPress: handlePremiumUpgrade,
          color: user?.isPremium ? theme.colors.success : theme.colors.premium,
        }
      );
    }

    if (user?.role === 'government') {
      baseActions.push(
        {
          icon: 'projects',
          label: 'Manage Projects',
          onPress: () => handleNavigation('/(government)/projects'),
          color: theme.colors.government,
        }
      );
    }

    return baseActions;
  };

  // Render statistics cards based on user role
  const renderStatistics = () => {
    if (user?.role === 'client') {
      return (
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {quickStats.completedBookings}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Completed Bookings
            </ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {quickStats.activeProjects}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Active Projects
            </ThemedText>
          </Card>
        </View>
      );
    }

    if (user?.role === 'service_provider' || user?.role === 'worker') {
      return (
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {quickStats.completedBookings}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Jobs Completed
            </ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {quickStats.averageRating}/5
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Average Rating
            </ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <ThemedText style={styles.statValue}>
              {quickStats.totalEarnings} ETB
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Total Earnings
            </ThemedText>
          </Card>
        </View>
      );
    }

    return null;
  };

  if (isLoading && !user) {
    return <Loading message="Loading your profile..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadUserData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Section */}
        <ProfileHeader
          user={user}
          profile={profile}
          onEditPress={() => handleNavigation('/(profile)/edit')}
          onSettingsPress={() => handleNavigation('/profile/settings')}
          hasNotifications={hasUnreadNotifications}
        />

        {/* Verification & Premium Status */}
        <View style={styles.statusContainer}>
          <VerificationBadge 
            level={user?.verificationLevel} 
            onPress={handleVerification}
          />
          <PremiumBadge 
            isActive={user?.isPremium} 
            onPress={handlePremiumUpgrade}
          />
        </View>

        {/* Gamification Section */}
        {(user?.role === 'service_provider' || user?.role === 'worker') && (
          <View style={styles.gamificationContainer}>
            <LevelProgress 
              currentLevel={user?.level || 1}
              progress={user?.levelProgress || 0}
              pointsToNextLevel={user?.pointsToNextLevel || 100}
            />
            <PointsDisplay points={user?.points || 0} />
          </View>
        )}

        {/* Quick Statistics */}
        {renderStatistics()}

        {/* Quick Actions Grid */}
        <View style={styles.actionsGrid}>
          {renderQuickActions().map((action, index) => (
            <Button
              key={index}
              variant="outlined"
              style={styles.actionButton}
              onPress={action.onPress}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          ))}
        </View>

        {/* Recent Achievements */}
        {(user?.role === 'service_provider' || user?.role === 'worker') && (
          <View style={styles.achievementsSection}>
            <ThemedText style={styles.sectionTitle}>
              Recent Achievements
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {user?.recentAchievements?.map((achievement, index) => (
                <AchievementCard
                  key={index}
                  achievement={achievement}
                  style={styles.achievementCard}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Support & Legal Section */}
        <Card style={styles.supportSection}>
          <ThemedText style={styles.sectionTitle}>
            Support & Information
          </ThemedText>
          <Button
            variant="ghost"
            onPress={() => handleNavigation('/profile/help-support')}
            leftIcon="help"
          >
            Help & Support
          </Button>
          <Button
            variant="ghost"
            onPress={() => handleNavigation('/profile/about')}
            leftIcon="info"
          >
            About Yachi
          </Button>
          <Button
            variant="ghost"
            onPress={() => handleNavigation('/profile/security')}
            leftIcon="security"
          >
            Privacy & Security
          </Button>
        </Card>

        {/* Logout Button */}
        <Button
          variant="destructive"
          onPress={handleLogout}
          style={styles.logoutButton}
          leftIcon="logout"
        >
          Logout
        </Button>
      </ScrollView>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  statusContainer: {
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
  achievementsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  achievementCard: {
    marginLeft: 16,
    width: 140,
  },
  supportSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
};

export default ProfileMainScreen;