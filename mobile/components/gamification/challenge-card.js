// components/gamification/challenge-card.js

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Share,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { analyticsService } from '../../services/analytics-service';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns';

const SCREEN = Dimensions.get('window');

const GAMIFICATION_CONFIG = {
  CHALLENGE_TYPES: {
    DAILY: {
      label: 'Daily Challenge',
      icon: 'today',
      color: '#4CAF50',
      gradient: ['#4CAF50', '#66BB6A'],
      duration: '1 day',
      category: 'general',
    },
    WEEKLY: {
      label: 'Weekly Challenge',
      icon: 'date-range',
      color: '#2196F3',
      gradient: ['#2196F3', '#42A5F5'],
      duration: '7 days',
      category: 'general',
    },
    MILESTONE: {
      label: 'Milestone',
      icon: 'flag',
      color: '#FF9800',
      gradient: ['#FF9800', '#FFB74D'],
      duration: 'ongoing',
      category: 'progress',
    },
    COMMUNITY: {
      label: 'Community',
      icon: 'people',
      color: '#9C27B0',
      gradient: ['#9C27B0', '#BA68C8'],
      duration: 'varies',
      category: 'social',
    },
    SPECIAL_EVENT: {
      label: 'Special Event',
      icon: 'festival',
      color: '#FF6B6B',
      gradient: ['#FF6B6B', '#FF8E8E'],
      duration: 'limited',
      category: 'event',
    },
    STREAK: {
      label: 'Streak',
      icon: 'local-fire-department',
      color: '#FF5722',
      gradient: ['#FF5722', '#FF8A65'],
      duration: 'ongoing',
      category: 'engagement',
    },
    CONSTRUCTION: {
      label: 'Construction',
      icon: 'construction',
      color: '#795548',
      gradient: ['#795548', '#A1887F'],
      duration: 'project-based',
      category: 'service_provider',
    },
    SERVICE: {
      label: 'Service',
      icon: 'handyman',
      color: '#607D8B',
      gradient: ['#607D8B', '#90A4AE'],
      duration: 'ongoing',
      category: 'service_provider',
    },
    PREMIUM: {
      label: 'Premium',
      icon: 'workspace-premium',
      color: '#9C27B0',
      gradient: ['#9C27B0', '#E1BEE7'],
      duration: 'premium',
      category: 'premium',
    },
    ETHIOPIAN: {
      label: 'Ethiopian',
      icon: 'public',
      color: '#078930',
      gradient: ['#078930', '#FCDD09'],
      duration: 'local',
      category: 'local',
    },
  },
  
  DIFFICULTY_LEVELS: {
    EASY: {
      label: 'Easy',
      color: '#4CAF50',
      icon: 'trending-up',
      xpMultiplier: 1,
      points: 10,
    },
    MEDIUM: {
      label: 'Medium',
      color: '#FF9800',
      icon: 'trending-up',
      xpMultiplier: 1.5,
      points: 25,
    },
    HARD: {
      label: 'Hard',
      color: '#F44336',
      icon: 'whatshot',
      xpMultiplier: 2,
      points: 50,
    },
    EXPERT: {
      label: 'Expert',
      color: '#9C27B0',
      icon: 'stars',
      xpMultiplier: 3,
      points: 100,
    },
  },
  
  CATEGORIES: {
    GENERAL: { label: 'General', icon: 'public' },
    SERVICE_PROVIDER: { label: 'Service Provider', icon: 'handyman' },
    CLIENT: { label: 'Client', icon: 'person' },
    GOVERNMENT: { label: 'Government', icon: 'account-balance' },
    PREMIUM: { label: 'Premium', icon: 'workspace-premium' },
    LOCAL: { label: 'Ethiopian', icon: 'flag' },
    PROGRESS: { label: 'Progress', icon: 'trending-up' },
    SOCIAL: { label: 'Social', icon: 'people' },
    EVENT: { label: 'Event', icon: 'festival' },
    ENGAGEMENT: { label: 'Engagement', icon: 'local-fire-department' },
    CONSTRUCTION: { label: 'Construction', icon: 'construction' },
  },
  
  CARD_SIZES: {
    SMALL: { height: 120, padding: 12, icon: 24, title: 14, description: 12, points: 12, progress: 6 },
    MEDIUM: { height: 160, padding: 16, icon: 32, title: 16, description: 14, points: 14, progress: 8 },
    LARGE: { height: 200, padding: 20, icon: 40, title: 18, description: 16, points: 16, progress: 10 },
    XLARGE: { height: 240, padding: 24, icon: 48, title: 20, description: 18, points: 18, progress: 12 },
  },
  
  ANIMATION: {
    PROGRESS_DURATION: 1200,
    CELEBRATION_DURATION: 3000,
    HAPTIC_IMPACT: Haptics.ImpactFeedbackStyle.Light,
    HAPTIC_SUCCESS: Haptics.NotificationFeedbackType.Success,
  }
};

const ChallengeCard = ({
  challenge,
  cardSize = 'medium',
  displayVariant = 'default',
  showProgressBar = true,
  showTimeRemaining = true,
  showParticipantCount = true,
  enableAnimations = true,
  isInteractive = true,
  onCardPress,
  onChallengeJoin,
  onRewardClaim,
  onSocialShare,
  userProgressData,
  containerStyle,
  testIdentifier = 'challenge-card-component',
  userRole = 'client',
  languagePreference = 'en',
  enableHapticFeedback = true,
  enableSharing = true,
  showCategoryBadge = false,
  ...additionalProps
}) => {
  const { theme, colorScheme } = useTheme();
  const { user } = useAuth();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isJoiningChallenge, setIsJoiningChallenge] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  const challengeDetails = useMemo(() => ({
    id: challenge?.id || '',
    title: challenge?.title || 'Challenge',
    description: challenge?.description || '',
    type: challenge?.type || 'daily',
    difficulty: challenge?.difficulty || 'medium',
    category: challenge?.category || 'general',
    points: challenge?.points || 0,
    experiencePoints: challenge?.xp || 0,
    progress: challenge?.progress || 0,
    maxProgress: challenge?.maxProgress || 1,
    isJoined: challenge?.joined || false,
    isCompleted: challenge?.completed || false,
    isClaimed: challenge?.claimed || false,
    startTime: challenge?.startTime,
    endTime: challenge?.endTime,
    participantCount: challenge?.participants || 0,
    maxParticipants: challenge?.maxParticipants,
    rewards: challenge?.rewards || [],
    requirements: challenge?.requirements || [],
    streakCount: challenge?.streak || 0,
    requiresPremiumAccess: challenge?.requiresPremium || false,
    isRoleSpecific: challenge?.userRoleSpecific || false,
    isLocationSpecific: challenge?.locationSpecific || false,
    requiredSkills: challenge?.skillRequirements || [],
    isConstructionRelated: challenge?.constructionRelated || false,
    titleTranslations: challenge?.titleTranslations || {},
    descriptionTranslations: challenge?.descriptionTranslations || {},
    completionRate: challenge?.completionRate || 0,
    averageCompletionTime: challenge?.averageTime || 0,
    ...challenge,
  }), [challenge]);

  const challengeTypeConfig = useMemo(() => {
    return GAMIFICATION_CONFIG.CHALLENGE_TYPES[challengeDetails.type.toUpperCase()] || 
           GAMIFICATION_CONFIG.CHALLENGE_TYPES.DAILY;
  }, [challengeDetails.type]);

  const difficultyConfig = useMemo(() => {
    return GAMIFICATION_CONFIG.DIFFICULTY_LEVELS[challengeDetails.difficulty.toUpperCase()] || 
           GAMIFICATION_CONFIG.DIFFICULTY_LEVELS.MEDIUM;
  }, [challengeDetails.difficulty]);

  const categoryConfig = useMemo(() => {
    return GAMIFICATION_CONFIG.CATEGORIES[challengeDetails.category.toUpperCase()] || 
           GAMIFICATION_CONFIG.CATEGORIES.GENERAL;
  }, [challengeDetails.category]);

  const sizeConfig = useMemo(() => {
    return GAMIFICATION_CONFIG.CARD_SIZES[cardSize.toUpperCase()] || 
           GAMIFICATION_CONFIG.CARD_SIZES.MEDIUM;
  }, [cardSize]);

  const progressPercentage = useMemo(() => {
    return challengeDetails.maxProgress > 0 
      ? (challengeDetails.progress / challengeDetails.maxProgress) * 100
      : 0;
  }, [challengeDetails.progress, challengeDetails.maxProgress]);

  const remainingTime = useMemo(() => {
    if (!challengeDetails.endTime) return null;
    
    const endDate = parseISO(challengeDetails.endTime);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(endDate, currentDate);
    const hoursRemaining = differenceInHours(endDate, currentDate) % 24;
    
    if (daysRemaining > 0) {
      return `${daysRemaining}d ${hoursRemaining}h`;
    } else if (hoursRemaining > 0) {
      return `${hoursRemaining}h`;
    } else {
      return 'Ending soon';
    }
  }, [challengeDetails.endTime]);

  const isUserEligible = useMemo(() => {
    if (challengeDetails.requiresPremiumAccess && !user?.isPremium) return false;
    if (challengeDetails.isRoleSpecific && challengeDetails.isRoleSpecific !== userRole) return false;
    return true;
  }, [challengeDetails, user, userRole]);

  const getLocalizedContent = useCallback((baseContent, translations) => {
    return translations[languagePreference] || baseContent;
  }, [languagePreference]);

  useEffect(() => {
    if (enableAnimations && isUserEligible) {
      Animated.timing(progressAnimation, {
        toValue: progressPercentage,
        duration: GAMIFICATION_CONFIG.ANIMATION.PROGRESS_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      if (challengeDetails.isJoined && !challengeDetails.isCompleted) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1.02,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      if (challengeDetails.isCompleted && !challengeDetails.isClaimed) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnimation, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnimation, {
              toValue: 0.5,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [challengeDetails.isJoined, challengeDetails.isCompleted, progressPercentage, enableAnimations, isUserEligible]);

  const handleCardPress = useCallback(() => {
    if (!isInteractive || !isUserEligible) return;

    if (enableHapticFeedback) {
      Haptics.impactAsync(GAMIFICATION_CONFIG.ANIMATION.HAPTIC_IMPACT);
    }

    analyticsService.trackEvent('challenge_viewed', {
      challengeId: challengeDetails.id,
      challengeType: challengeDetails.type,
      userId: user?.id,
      userRole: userRole,
    });

    if (onCardPress) {
      onCardPress(challengeDetails);
    } else {
      setIsModalVisible(true);
    }
  }, [isInteractive, isUserEligible, challengeDetails, user, userRole, onCardPress, enableHapticFeedback]);

  const handleJoinChallenge = useCallback(async () => {
    if (challengeDetails.isJoined || challengeDetails.isCompleted || !isUserEligible) return;

    setIsJoiningChallenge(true);
    
    if (enableHapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (onChallengeJoin) {
        await onChallengeJoin(challengeDetails);
      }
      
      analyticsService.trackEvent('challenge_joined', {
        challengeId: challengeDetails.id,
        challengeType: challengeDetails.type,
        difficulty: challengeDetails.difficulty,
        userId: user?.id,
        userRole: userRole,
      });

      if (enableHapticFeedback) {
        Haptics.notificationAsync(GAMIFICATION_CONFIG.ANIMATION.HAPTIC_SUCCESS);
      }
    } catch (error) {
      console.error('Challenge join failed:', error);
      
      if (enableHapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      analyticsService.trackEvent('challenge_join_failed', {
        challengeId: challengeDetails.id,
        error: error.message,
        userId: user?.id,
      });
    } finally {
      setIsJoiningChallenge(false);
    }
  }, [challengeDetails, isUserEligible, onChallengeJoin, user, userRole, enableHapticFeedback]);

  const handleClaimReward = useCallback(async () => {
    if (!challengeDetails.isCompleted || challengeDetails.isClaimed || !isUserEligible) return;

    setIsClaimingReward(true);
    
    if (enableHapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (onRewardClaim) {
        await onRewardClaim(challengeDetails);
      }
      
      analyticsService.trackEvent('challenge_claimed', {
        challengeId: challengeDetails.id,
        points: challengeDetails.points,
        xp: challengeDetails.experiencePoints,
        userId: user?.id,
        userRole: userRole,
      });

      if (enableHapticFeedback) {
        Haptics.notificationAsync(GAMIFICATION_CONFIG.ANIMATION.HAPTIC_SUCCESS);
      }
    } catch (error) {
      console.error('Reward claim failed:', error);
      
      if (enableHapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      analyticsService.trackEvent('challenge_claim_failed', {
        challengeId: challengeDetails.id,
        error: error.message,
        userId: user?.id,
      });
    } finally {
      setIsClaimingReward(false);
    }
  }, [challengeDetails, isUserEligible, onRewardClaim, user, userRole, enableHapticFeedback]);

  const handleShareChallenge = useCallback(async () => {
    if (!enableSharing) return;

    try {
      if (enableHapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const localizedTitle = getLocalizedContent(challengeDetails.title, challengeDetails.titleTranslations);
      const shareMessage = `Join me in the "${localizedTitle}" challenge on Yachi! 🏆\n\nLet's discover amazing services together in Ethiopia!`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Challenge Invitation',
            text: shareMessage,
            url: 'https://yachi.app',
          });
        } else {
          await navigator.clipboard.writeText(shareMessage);
          Alert.alert('Copied', 'Challenge invitation copied to clipboard');
        }
      } else {
        await Share.share({
          message: shareMessage,
          title: 'Challenge Invitation',
        });
      }

      analyticsService.trackEvent('challenge_shared', {
        challengeId: challengeDetails.id,
        platform: Platform.OS,
        userId: user?.id,
      });

      if (onSocialShare) {
        onSocialShare(challengeDetails);
      }
    } catch (error) {
      console.error('Challenge share failed:', error);
    }
  }, [challengeDetails, user, onSocialShare, enableSharing, enableHapticFeedback, getLocalizedContent]);

  const renderPremiumBadge = () => {
    if (!challengeDetails.requiresPremiumAccess) return null;

    return (
      <View style={[styles.premiumBadge, { backgroundColor: theme.colors.warning }]}>
        <MaterialIcons name="workspace-premium" size={12} color="#FFFFFF" />
      </View>
    );
  };

  const renderCategoryIndicator = () => {
    if (!showCategoryBadge || displayVariant === 'minimal') return null;

    return (
      <View style={[styles.categoryIndicator, { backgroundColor: theme.colors.primary }]}>
        <MaterialIcons 
          name={categoryConfig.icon} 
          size={10} 
          color="#FFFFFF" 
        />
        <Text style={styles.categoryLabel}>
          {categoryConfig.label}
        </Text>
      </View>
    );
  };

  const renderCardHeader = () => {
    const glowOpacity = glowAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.6],
    });

    return (
      <View style={styles.headerSection}>
        <View style={styles.typeSection}>
          <LinearGradient
            colors={challengeTypeConfig.gradient}
            style={[
              styles.typeIcon,
              {
                width: sizeConfig.icon * 1.5,
                height: sizeConfig.icon * 1.5,
                borderRadius: sizeConfig.icon * 0.75,
                opacity: isUserEligible ? 1 : 0.5,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons
              name={challengeTypeConfig.icon}
              size={sizeConfig.icon}
              color="#FFFFFF"
            />
            {renderPremiumBadge()}
          </LinearGradient>

          <View style={styles.typeInfo}>
            <Text style={[styles.typeName, { color: theme.colors.text, fontSize: sizeConfig.title }]}>
              {challengeTypeConfig.label}
            </Text>
            <Text style={[styles.difficultyLevel, { color: difficultyConfig.color, fontSize: sizeConfig.description }]}>
              {difficultyConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.rewardSection}>
          <View style={styles.pointsDisplay}>
            <MaterialIcons name="star" size={sizeConfig.points} color="#FFD700" />
            <Text style={[styles.pointsValue, { color: theme.colors.text, fontSize: sizeConfig.points }]}>
              {challengeDetails.points}
            </Text>
          </View>

          <View style={styles.xpDisplay}>
            <MaterialIcons name="bolt" size={sizeConfig.points} color="#4CD964" />
            <Text style={[styles.xpValue, { color: theme.colors.text, fontSize: sizeConfig.points }]}>
              {challengeDetails.experiencePoints}
            </Text>
          </View>
        </View>

        {renderCategoryIndicator()}

        {challengeDetails.isCompleted && !challengeDetails.isClaimed && (
          <Animated.View
            style={[
              styles.completionGlow,
              {
                opacity: glowOpacity,
                backgroundColor: challengeTypeConfig.color,
              },
            ]}
          />
        )}
      </View>
    );
  };

  const renderProgressIndicator = () => {
    if (!showProgressBar || displayVariant === 'minimal' || !isUserEligible) return null;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.colors.textSecondary, fontSize: sizeConfig.description }]}>
            Progress
          </Text>
          <Text style={[styles.progressValue, { color: theme.colors.text, fontSize: sizeConfig.description }]}>
            {challengeDetails.progress}/{challengeDetails.maxProgress}
          </Text>
        </View>

        <View style={[styles.progressBar, { height: sizeConfig.progress }]}>
          <View style={[styles.progressBackground, { backgroundColor: theme.colors.border }]} />
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: challengeTypeConfig.color,
                height: sizeConfig.progress,
              },
            ]}
          />
        </View>

        {challengeDetails.type === 'streak' && challengeDetails.streakCount > 0 && (
          <View style={styles.streakDisplay}>
            <Ionicons name="flame" size={14} color="#FF5722" />
            <Text style={[styles.streakText, { color: theme.colors.textSecondary, fontSize: sizeConfig.description }]}>
              {challengeDetails.streakCount} day streak
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTimeDisplay = () => {
    if (!showTimeRemaining || !remainingTime || displayVariant === 'minimal') return null;

    return (
      <View style={styles.timeContainer}>
        <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.timeText, { color: theme.colors.textSecondary, fontSize: sizeConfig.description }]}>
          {remainingTime}
        </Text>
      </View>
    );
  };

  const renderParticipantDisplay = () => {
    if (!showParticipantCount || displayVariant === 'minimal') return null;

    return (
      <View style={styles.participantContainer}>
        <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.participantText, { color: theme.colors.textSecondary, fontSize: sizeConfig.description }]}>
          {challengeDetails.participantCount.toLocaleString()}
          {challengeDetails.maxParticipants && ` / ${challengeDetails.maxParticipants.toLocaleString()}`}
        </Text>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (displayVariant === 'minimal') return null;

    return (
      <View style={styles.actionContainer}>
        {!challengeDetails.isJoined && !challengeDetails.isCompleted && isUserEligible && (
          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={handleJoinChallenge}
            disabled={isJoiningChallenge}
          >
            <Text style={styles.buttonText}>
              {isJoiningChallenge ? 'Joining...' : 'Join Challenge'}
            </Text>
          </TouchableOpacity>
        )}

        {challengeDetails.isCompleted && !challengeDetails.isClaimed && isUserEligible && (
          <TouchableOpacity
            style={[styles.actionButton, styles.claimButton]}
            onPress={handleClaimReward}
            disabled={isClaimingReward}
          >
            <Text style={styles.buttonText}>
              {isClaimingReward ? 'Claiming...' : 'Claim Reward'}
            </Text>
          </TouchableOpacity>
        )}

        {(challengeDetails.isJoined || challengeDetails.isCompleted) && enableSharing && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShareChallenge}
          >
            <Ionicons name="share" size={16} color={theme.colors.text} />
          </TouchableOpacity>
        )}

        {challengeDetails.isClaimed && (
          <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.statusText}>Claimed</Text>
          </View>
        )}

        {challengeDetails.requiresPremiumAccess && !user?.isPremium && (
          <View style={[styles.premiumLock, { backgroundColor: theme.colors.warning }]}>
            <MaterialIcons name="lock" size={14} color="#FFFFFF" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCardContent = () => {
    const localizedTitle = getLocalizedContent(challengeDetails.title, challengeDetails.titleTranslations);
    const localizedDescription = getLocalizedContent(challengeDetails.description, challengeDetails.descriptionTranslations);

    return (
      <Animated.View
        style={[
          styles.card,
          {
            padding: sizeConfig.padding,
            backgroundColor: theme.colors.card,
            transform: [
              { scale: scaleAnimation },
              { scale: pulseAnimation },
            ],
            opacity: isUserEligible ? 1 : 0.7,
          },
          !isUserEligible && styles.ineligibleCard,
        ]}
      >
        {renderCardHeader()}

        <View style={styles.contentSection}>
          <Text
            style={[styles.title, { color: theme.colors.text, fontSize: sizeConfig.title }]}
            numberOfLines={2}
          >
            {localizedTitle}
          </Text>
          
          {displayVariant !== 'compact' && localizedDescription && (
            <Text
              style={[styles.description, { color: theme.colors.textSecondary, fontSize: sizeConfig.description }]}
              numberOfLines={3}
            >
              {localizedDescription}
            </Text>
          )}
        </View>

        {renderProgressIndicator()}

        <View style={styles.footerSection}>
          {renderTimeDisplay()}
          {renderParticipantDisplay()}
        </View>

        {renderActionButtons()}
      </Animated.View>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <BlurView intensity={80} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleSection}>
              <LinearGradient
                colors={challengeTypeConfig.gradient}
                style={styles.modalIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons
                  name={challengeTypeConfig.icon}
                  size={32}
                  color="#FFFFFF"
                />
                {renderPremiumBadge()}
              </LinearGradient>
              <View style={styles.modalTextSection}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {getLocalizedContent(challengeDetails.title, challengeDetails.titleTranslations)}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  {challengeTypeConfig.label} • {difficultyConfig.label} • {categoryConfig.label}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
              {getLocalizedContent(challengeDetails.description, challengeDetails.descriptionTranslations)}
            </Text>

            <View style={styles.modalProgressSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Your Progress
              </Text>
              {renderProgressIndicator()}
            </View>

            {challengeDetails.requirements.length > 0 && (
              <View style={styles.requirementSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Requirements
                </Text>
                {challengeDetails.requirements.map((requirement, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={challengeDetails.progress >= requirement.value ? '#4CAF50' : theme.colors.textTertiary}
                    />
                    <Text style={[styles.requirementText, { color: theme.colors.text }]}>
                      {requirement.description}
                    </Text>
                    <Text style={[styles.requirementValue, { color: theme.colors.textSecondary }]}>
                      {requirement.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {challengeDetails.requiredSkills.length > 0 && (
              <View style={styles.skillSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Required Skills
                </Text>
                <View style={styles.skillList}>
                  {challengeDetails.requiredSkills.map((skill, index) => (
                    <View key={index} style={[styles.skillItem, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.skillText, { color: theme.colors.primary }]}>
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {challengeDetails.rewards.length > 0 && (
              <View style={styles.rewardSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Rewards
                </Text>
                <View style={styles.rewardList}>
                  {challengeDetails.rewards.map((reward, index) => (
                    <View key={index} style={[styles.rewardItem, { backgroundColor: theme.colors.background }]}>
                      <MaterialIcons
                        name={reward.icon || 'card-giftcard'}
                        size={20}
                        color={reward.color || challengeTypeConfig.color}
                      />
                      <Text style={[styles.rewardText, { color: theme.colors.text }]}>
                        {reward.name}
                      </Text>
                      <Text style={[styles.rewardValue, { color: reward.color || challengeTypeConfig.color }]}>
                        {reward.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {challengeDetails.requiresPremiumAccess && !user?.isPremium && (
              <View style={styles.premiumNotice}>
                <MaterialIcons name="workspace-premium" size={24} color="#FFD700" />
                <Text style={[styles.premiumNoticeText, { color: theme.colors.text }]}>
                  Premium challenge - upgrade to participate
                </Text>
                <Text style={[styles.premiumNoticeSubtext, { color: theme.colors.textSecondary }]}>
                  Unlock exclusive challenges and rewards with Yachi Premium
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            {renderActionButtons()}
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <TouchableOpacity
      style={[styles.container, containerStyle]}
      onPress={handleCardPress}
      onPressIn={() => {
        if (isInteractive && isUserEligible) {
          Animated.spring(scaleAnimation, { toValue: 0.98, useNativeDriver: true }).start();
        }
      }}
      onPressOut={() => {
        if (isInteractive && isUserEligible) {
          Animated.spring(scaleAnimation, { toValue: 1, useNativeDriver: true }).start();
        }
      }}
      disabled={!isInteractive || !isUserEligible}
      activeOpacity={isInteractive && isUserEligible ? 0.7 : 1}
      testID={testIdentifier}
      accessibilityLabel={`${challengeTypeConfig.label}: ${challengeDetails.title}. ${difficultyConfig.label} difficulty. ${challengeDetails.progress}/${challengeDetails.maxProgress} progress. ${!isUserEligible ? 'Not available for your account.' : ''}`}
      accessibilityRole="button"
      {...additionalProps}
    >
      {renderCardContent()}
      {renderDetailModal()}
    </TouchableOpacity>
  );
};

const ChallengeCardGrid = ({
  challenges = [],
  gridColumns = 2,
  columnSpacing = 12,
  userRole = 'client',
  languagePreference = 'en',
  categoryFilter = null,
  typeFilter = null,
  sortCriteria = 'difficulty',
  ...gridProps
}) => {
  const { theme } = useTheme();

  const filteredChallenges = useMemo(() => {
    let filtered = challenges;
    
    if (categoryFilter) {
      filtered = filtered.filter(challenge => challenge.category === categoryFilter);
    }
    
    if (typeFilter) {
      filtered = filtered.filter(challenge => challenge.type === typeFilter);
    }
    
    filtered.sort((a, b) => {
      switch (sortCriteria) {
        case 'difficulty':
          const difficultyOrder = { expert: 4, hard: 3, medium: 2, easy: 1 };
          return (difficultyOrder[b.difficulty] || 0) - (difficultyOrder[a.difficulty] || 0);
        case 'points':
          return (b.points || 0) - (a.points || 0);
        case 'progress':
          return (b.progress / b.maxProgress) - (a.progress / a.maxProgress);
        case 'time':
          return new Date(a.endTime || 0) - new Date(b.endTime || 0);
        case 'participants':
          return (b.participants || 0) - (a.participants || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [challenges, categoryFilter, typeFilter, sortCriteria]);

  const gridStyle = useMemo(() => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -columnSpacing / 2,
  }), [columnSpacing]);

  const cardContainerStyle = useMemo(() => ({
    width: `${100 / gridColumns}%`,
    padding: columnSpacing / 2,
  }), [gridColumns, columnSpacing]);

  if (filteredChallenges.length === 0) {
    return (
      <View style={[styles.emptyGrid, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="flag-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.colors.text }]}>
          No challenges available
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          {categoryFilter || typeFilter ? 'Try changing your filters' : 'New challenges are coming soon!'}
        </Text>
        {(categoryFilter || typeFilter) && (
          <Text style={[styles.filterText, { color: theme.colors.textTertiary }]}>
            Filtered by: {categoryFilter || typeFilter}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={gridStyle}>
      {filteredChallenges.map((challenge, index) => (
        <View key={challenge.id || index} style={cardContainerStyle}>
          <ChallengeCard 
            challenge={challenge} 
            userRole={userRole}
            languagePreference={languagePreference}
            {...gridProps} 
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  ineligibleCard: {
    opacity: 0.5,
  },
  completionGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
  },
  typeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  difficultyLevel: {
    fontWeight: '500',
  },
  rewardSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pointsValue: {
    fontWeight: '700',
  },
  xpDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  xpValue: {
    fontWeight: '700',
  },
  premiumBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  categoryIndicator: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  categoryLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  contentSection: {
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontWeight: '400',
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontWeight: '500',
  },
  progressValue: {
    fontWeight: '600',
  },
  progressBar: {
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 4,
  },
  streakDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  streakText: {
    fontWeight: '500',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontWeight: '500',
  },
  participantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantText: {
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
  },
  claimButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    flex: 0,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  premiumLock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  modalTextSection: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalProgressSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementSection: {
    marginBottom: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
  },
  requirementValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  skillSection: {
    marginBottom: 20,
  },
  skillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rewardSection: {
    marginBottom: 20,
  },
  rewardList: {
    gap: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  rewardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  premiumNotice: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  premiumNoticeText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  premiumNoticeSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  emptyGrid: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  filterText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ChallengeCard;
export { 
  ChallengeCardGrid, 
  GAMIFICATION_CONFIG 
};