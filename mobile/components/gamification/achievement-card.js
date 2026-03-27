// components/gamification/achievement-card.js
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
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { analyticsService } from '../../services/analytics-service';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { format, parseISO, differenceInDays } from 'date-fns';

/**
 * Enhanced Achievement Card Component for Yachi Platform
 * 
 * Features aligned with platform specs:
 * - Ethiopian market integration with local achievement themes
 * - Premium user benefits and exclusive achievements
 * - Multi-language support for achievement texts
 * - Integration with points and rewards program
 * - Leaderboard and social sharing features
 * - Service provider specific achievements
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enhanced achievement types with Ethiopian market focus
const ACHIEVEMENT_TYPES = {
  badge: {
    label: 'Badge',
    icon: 'verified',
    gradient: ['#4CAF50', '#66BB6A'], // Ethiopian green
    shape: 'circle',
    category: 'general',
  },
  trophy: {
    label: 'Trophy',
    icon: 'emoji-events',
    gradient: ['#FFD700', '#FFED4E'], // Gold
    shape: 'hexagon',
    category: 'premium',
  },
  medal: {
    label: 'Medal',
    icon: 'military-tech',
    gradient: ['#FF6B6B', '#FF8E8E'], // Red
    shape: 'circle',
    category: 'service_provider',
  },
  milestone: {
    label: 'Milestone',
    icon: 'flag',
    gradient: ['#2196F3', '#42A5F5'], // Blue
    shape: 'square',
    category: 'progress',
  },
  collection: {
    label: 'Collection',
    icon: 'collections',
    gradient: ['#9C27B0', '#BA68C8'], // Purple
    shape: 'square',
    category: 'collector',
  },
  special: {
    label: 'Special',
    icon: 'stars',
    gradient: ['#FF9800', '#FFB74D'], // Orange
    shape: 'star',
    category: 'exclusive',
  },
  ethiopian: {
    label: 'Ethiopian',
    icon: 'public',
    gradient: ['#078930', '#FCDD09'], // Ethiopian flag colors
    shape: 'circle',
    category: 'local',
  },
  premium: {
    label: 'Premium',
    icon: 'workspace-premium',
    gradient: ['#9C27B0', '#E1BEE7'], // Premium purple
    shape: 'star',
    category: 'premium',
  },
};

// Enhanced rarity levels with Ethiopian cultural references
const ACHIEVEMENT_RARITY = {
  common: {
    label: 'Common',
    color: '#9E9E9E',
    glow: '#9E9E9E',
    percentage: '60%',
    points: 10,
  },
  rare: {
    label: 'Rare',
    color: '#2196F3',
    glow: '#2196F3',
    percentage: '25%',
    points: 25,
  },
  epic: {
    label: 'Epic',
    color: '#9C27B0',
    glow: '#9C27B0',
    percentage: '10%',
    points: 50,
  },
  legendary: {
    label: 'Legendary',
    color: '#FFD700',
    glow: '#FFD700',
    percentage: '4%',
    points: 100,
  },
  mythic: {
    label: 'Mythic',
    color: '#FF6B6B',
    glow: '#FF6B6B',
    percentage: '1%',
    points: 250,
  },
};

// Achievement categories aligned with platform features
const ACHIEVEMENT_CATEGORIES = {
  general: { label: 'General', icon: 'public' },
  service_provider: { label: 'Service Provider', icon: 'handyman' },
  client: { label: 'Client', icon: 'person' },
  government: { label: 'Government', icon: 'account-balance' },
  premium: { label: 'Premium', icon: 'workspace-premium' },
  local: { label: 'Ethiopian', icon: 'flag' },
  progress: { label: 'Progress', icon: 'trending-up' },
  collector: { label: 'Collector', icon: 'collections' },
  exclusive: { label: 'Exclusive', icon: 'star' },
};

const AchievementCard = ({
  achievement,
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  variant = 'default', // 'default', 'compact', 'premium', 'minimal'
  showProgress = true,
  showRarity = true,
  showDate = true,
  animated = true,
  interactive = true,
  onPress,
  onShare,
  onClaim,
  style,
  testID = 'achievement-card',
  // New props for platform integration
  userRole = 'client',
  language = 'en',
  showCategory = false,
  enableSocialSharing = true,
  enableHaptics = true,
  ...rest
}) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const unlockAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  // Enhanced achievement data with platform integration
  const achievementData = useMemo(() => ({
    id: achievement?.id || '',
    title: achievement?.title || 'Unknown Achievement',
    description: achievement?.description || '',
    type: achievement?.type || 'badge',
    rarity: achievement?.rarity || 'common',
    points: achievement?.points || 0,
    progress: achievement?.progress || 0,
    maxProgress: achievement?.maxProgress || 1,
    unlocked: achievement?.unlocked || false,
    unlockedAt: achievement?.unlockedAt,
    category: achievement?.category || 'general',
    secret: achievement?.secret || false,
    claimable: achievement?.claimable || false,
    claimed: achievement?.claimed || false,
    // Platform-specific fields
    requiresPremium: achievement?.requiresPremium || false,
    userRoleSpecific: achievement?.userRoleSpecific || false,
    locationSpecific: achievement?.locationSpecific || false,
    expirationDate: achievement?.expirationDate,
    // Multi-language support
    titleTranslations: achievement?.titleTranslations || {},
    descriptionTranslations: achievement?.descriptionTranslations || {},
    // Social features
    shareCount: achievement?.shareCount || 0,
    likeCount: achievement?.likeCount || 0,
    // Analytics
    unlockCount: achievement?.unlockCount || 0,
    ...achievement,
  }), [achievement]);

  // Get localized text
  const getLocalizedText = useCallback((baseText, translations) => {
    return translations[language] || baseText;
  }, [language]);

  // Achievement configuration with fallbacks
  const achievementConfig = useMemo(() => {
    return ACHIEVEMENT_TYPES[achievementData.type] || ACHIEVEMENT_TYPES.badge;
  }, [achievementData.type]);

  // Rarity configuration
  const rarityConfig = useMemo(() => {
    return ACHIEVEMENT_RARITY[achievementData.rarity] || ACHIEVEMENT_RARITY.common;
  }, [achievementData.rarity]);

  // Category configuration
  const categoryConfig = useMemo(() => {
    return ACHIEVEMENT_CATEGORIES[achievementData.category] || ACHIEVEMENT_CATEGORIES.general;
  }, [achievementData.category]);

  // Size configurations
  const sizeConfig = useMemo(() => {
    const sizes = {
      small: {
        container: 80,
        icon: 32,
        titleSize: 12,
        descriptionSize: 10,
        pointsSize: 10,
        padding: 8,
      },
      medium: {
        container: 120,
        icon: 48,
        titleSize: 14,
        descriptionSize: 12,
        pointsSize: 12,
        padding: 12,
      },
      large: {
        container: 160,
        icon: 64,
        titleSize: 16,
        descriptionSize: 14,
        pointsSize: 14,
        padding: 16,
      },
      xlarge: {
        container: 200,
        icon: 80,
        titleSize: 18,
        descriptionSize: 16,
        pointsSize: 16,
        padding: 20,
      },
    };
    return sizes[size] || sizes.medium;
  }, [size]);

  // Progress percentage
  const progressPercentage = useMemo(() => {
    return achievementData.maxProgress > 0 
      ? (achievementData.progress / achievementData.maxProgress) * 100
      : 0;
  }, [achievementData.progress, achievementData.maxProgress]);

  // Check if achievement is available for current user
  const isAvailableForUser = useMemo(() => {
    if (achievementData.requiresPremium && !user?.isPremium) return false;
    if (achievementData.userRoleSpecific && achievementData.userRoleSpecific !== userRole) return false;
    return true;
  }, [achievementData, user, userRole]);

  // Enhanced animations with platform integration
  useEffect(() => {
    if (animated && isAvailableForUser) {
      // Progress animation
      Animated.timing(progressAnim, {
        toValue: progressPercentage,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Unlock animation with enhanced effects
      if (achievementData.unlocked && !isUnlocking) {
        handleUnlockAnimation();
      }

      // Enhanced shine animation for unlocked achievements
      if (achievementData.unlocked) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shineAnim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(shineAnim, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [achievementData.unlocked, progressPercentage, animated, isAvailableForUser]);

  // Enhanced unlock animation with analytics
  const handleUnlockAnimation = useCallback(() => {
    if (!enableHaptics) return;
    
    setIsUnlocking(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Track achievement unlock
    analyticsService.trackEvent('achievement_unlocked', {
      achievementId: achievementData.id,
      achievementType: achievementData.type,
      rarity: achievementData.rarity,
      points: achievementData.points,
      userId: user?.id,
      userRole: userRole,
    });

    Animated.sequence([
      Animated.timing(unlockAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsUnlocking(false);
    });
  }, [achievementData, user, userRole, enableHaptics]);

  // Enhanced press handler
  const handlePress = useCallback(() => {
    if (!interactive || !isAvailableForUser) return;

    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Track achievement view
    analyticsService.trackEvent('achievement_viewed', {
      achievementId: achievementData.id,
      achievementType: achievementData.type,
      userId: user?.id,
    });

    if (onPress) {
      onPress(achievementData);
    } else {
      setShowDetails(true);
    }
  }, [interactive, isAvailableForUser, achievementData, user, onPress, enableHaptics]);

  // Enhanced claim handler with platform integration
  const handleClaim = useCallback(async () => {
    if (!achievementData.claimable || achievementData.claimed || !isAvailableForUser) return;

    setIsClaiming(true);
    
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (onClaim) {
        await onClaim(achievementData);
      }
      
      // Track claim event
      analyticsService.trackEvent('achievement_claimed', {
        achievementId: achievementData.id,
        points: achievementData.points,
        userId: user?.id,
        userRole: userRole,
      });

      if (enableHaptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Claim failed:', error);
      
      if (enableHaptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      // Track claim failure
      analyticsService.trackEvent('achievement_claim_failed', {
        achievementId: achievementData.id,
        error: error.message,
        userId: user?.id,
      });
    } finally {
      setIsClaiming(false);
    }
  }, [achievementData, isAvailableForUser, onClaim, user, userRole, enableHaptics]);

  // Enhanced share handler with platform integration
  const handleShare = useCallback(async () => {
    if (!enableSocialSharing) return;

    try {
      if (enableHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const localizedTitle = getLocalizedText(achievementData.title, achievementData.titleTranslations);
      const message = `I unlocked the "${localizedTitle}" achievement on Yachi! 🎉\n\nJoin me in finding the best services in Ethiopia!`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Achievement Unlocked!',
            text: message,
            url: 'https://yachi.app',
          });
        } else {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied', 'Achievement message copied to clipboard');
        }
      } else {
        await Share.share({
          message,
          title: 'Achievement Unlocked!',
        });
      }

      // Track share event
      analyticsService.trackEvent('achievement_shared', {
        achievementId: achievementData.id,
        platform: Platform.OS,
        userId: user?.id,
      });

      if (onShare) {
        onShare(achievementData);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [achievementData, user, onShare, enableSocialSharing, enableHaptics, getLocalizedText]);

  // Render premium indicator
  const renderPremiumIndicator = () => {
    if (!achievementData.requiresPremium) return null;

    return (
      <View style={[styles.premiumIndicator, { backgroundColor: theme.colors.warning }]}>
        <MaterialIcons name="workspace-premium" size={12} color="#FFFFFF" />
      </View>
    );
  };

  // Render category badge
  const renderCategoryBadge = () => {
    if (!showCategory || variant === 'minimal') return null;

    return (
      <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primary }]}>
        <MaterialIcons 
          name={categoryConfig.icon} 
          size={10} 
          color="#FFFFFF" 
        />
        <Text style={styles.categoryText}>
          {categoryConfig.label}
        </Text>
      </View>
    );
  };

  // Enhanced icon rendering with platform features
  const renderIcon = () => {
    const scale = unlockAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.3],
    });

    const rotate = shineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.8],
    });

    return (
      <View style={styles.iconContainer}>
        {/* Glow effect for unlocked achievements */}
        {achievementData.unlocked && (
          <Animated.View
            style={[
              styles.iconGlow,
              {
                backgroundColor: rarityConfig.glow,
                opacity: glowOpacity,
                width: sizeConfig.container * 0.8,
                height: sizeConfig.container * 0.8,
                borderRadius: sizeConfig.container * 0.4,
              },
            ]}
          />
        )}

        {/* Main icon container */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale }],
              width: sizeConfig.container * 0.7,
              height: sizeConfig.container * 0.7,
              borderRadius: getBorderRadius(achievementConfig.shape),
              opacity: isAvailableForUser ? 1 : 0.5,
            },
          ]}
        >
          <LinearGradient
            colors={achievementConfig.gradient}
            style={[
              styles.iconGradient,
              {
                borderRadius: getBorderRadius(achievementConfig.shape),
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Shine effect for unlocked achievements */}
            {achievementData.unlocked && (
              <Animated.View
                style={[
                  styles.iconShine,
                  {
                    transform: [{ rotate }],
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
                ]}
              />
            )}

            {/* Achievement icon */}
            <MaterialIcons
              name={achievementConfig.icon}
              size={sizeConfig.icon}
              color="#FFFFFF"
            />

            {/* Secret overlay for locked secret achievements */}
            {!achievementData.unlocked && achievementData.secret && (
              <View style={styles.secretOverlay}>
                <Ionicons name="help" size={sizeConfig.icon * 0.6} color="#FFFFFF" />
              </View>
            )}

            {/* Lock icon for locked achievements */}
            {!achievementData.unlocked && !achievementData.secret && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock" size={sizeConfig.icon * 0.5} color="#FFFFFF" />
              </View>
            )}

            {/* Premium indicator */}
            {renderPremiumIndicator()}
          </LinearGradient>
        </Animated.View>

        {/* Rarity badge */}
        {showRarity && variant !== 'minimal' && (
          <View
            style={[
              styles.rarityBadge,
              {
                backgroundColor: rarityConfig.color,
                top: -4,
                right: -4,
              },
            ]}
          >
            <Text style={styles.rarityText}>{rarityConfig.label.charAt(0)}</Text>
          </View>
        )}

        {/* Category badge */}
        {renderCategoryBadge()}
      </View>
    );
  };

  // Helper function for icon shape
  const getBorderRadius = (shape) => {
    switch (shape) {
      case 'circle':
        return sizeConfig.container * 0.35;
      case 'square':
        return 8;
      case 'hexagon':
        return 4;
      case 'star':
        return 2;
      default:
        return sizeConfig.container * 0.35;
    }
  };

  // Enhanced progress bar with platform styling
  const renderProgress = () => {
    if (!showProgress || achievementData.unlocked || variant === 'minimal' || !isAvailableForUser) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBackground, { backgroundColor: theme.colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: achievementConfig.gradient[0],
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.textSecondary, fontSize: sizeConfig.descriptionSize }]}>
          {achievementData.progress}/{achievementData.maxProgress}
        </Text>
      </View>
    );
  };

  // Enhanced points display with platform integration
  const renderPoints = () => {
    if (variant === 'minimal') return null;

    return (
      <View style={styles.pointsContainer}>
        <MaterialIcons name="star" size={sizeConfig.pointsSize} color="#FFD700" />
        <Text style={[styles.pointsText, { color: theme.colors.text, fontSize: sizeConfig.pointsSize }]}>
          +{achievementData.points}
        </Text>
      </View>
    );
  };

  // Enhanced claim button with platform styling
  const renderClaimButton = () => {
    if (!achievementData.claimable || achievementData.claimed || variant === 'minimal' || !isAvailableForUser) return null;

    return (
      <TouchableOpacity
        style={[styles.claimButton, { backgroundColor: achievementConfig.gradient[0] }]}
        onPress={handleClaim}
        disabled={isClaiming}
      >
        <Text style={styles.claimButtonText}>
          {isClaiming ? 'Claiming...' : 'Claim Reward'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Enhanced card content with platform features
  const renderCardContent = () => {
    const isCompact = variant === 'compact' || variant === 'minimal';
    const localizedTitle = getLocalizedText(achievementData.title, achievementData.titleTranslations);
    const localizedDescription = getLocalizedText(achievementData.description, achievementData.descriptionTranslations);

    return (
      <Animated.View
        style={[
          styles.card,
          {
            padding: sizeConfig.padding,
            backgroundColor: theme.colors.card,
            transform: [{ scale: scaleAnim }],
            opacity: isAvailableForUser ? 1 : 0.7,
          },
          isCompact && styles.compactCard,
          !isAvailableForUser && styles.unavailableCard,
        ]}
      >
        {renderIcon()}

        {!isCompact && (
          <>
            {/* Title and Description */}
            <View style={styles.textContainer}>
              <Text
                style={[styles.title, { color: theme.colors.text, fontSize: sizeConfig.titleSize }]}
                numberOfLines={2}
              >
                {achievementData.unlocked || !achievementData.secret 
                  ? localizedTitle
                  : 'Secret Achievement'
                }
              </Text>
              
              {(achievementData.unlocked || !achievementData.secret) && localizedDescription && (
                <Text
                  style={[styles.description, { color: theme.colors.textSecondary, fontSize: sizeConfig.descriptionSize }]}
                  numberOfLines={2}
                >
                  {localizedDescription}
                </Text>
              )}

              {/* Unlock date */}
              {showDate && achievementData.unlocked && achievementData.unlockedAt && (
                <Text style={[styles.dateText, { color: theme.colors.textTertiary, fontSize: sizeConfig.descriptionSize }]}>
                  Unlocked {format(parseISO(achievementData.unlockedAt), 'MMM dd, yyyy')}
                </Text>
              )}
            </View>

            {renderProgress()}
            {renderPoints()}
            {renderClaimButton()}
          </>
        )}
      </Animated.View>
    );
  };

  // Enhanced details modal with platform features
  const renderDetailsModal = () => (
    <Modal
      visible={showDetails}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetails(false)}
    >
      <BlurView intensity={80} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              {renderIcon()}
              <View style={styles.modalTitleText}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {getLocalizedText(achievementData.title, achievementData.titleTranslations)}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  {achievementConfig.label} • {rarityConfig.label} • {categoryConfig.label}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            {/* Description */}
            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
              {getLocalizedText(achievementData.description, achievementData.descriptionTranslations)}
            </Text>

            {/* Enhanced Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Points
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  +{achievementData.points}
                </Text>
              </View>
              
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Rarity
                </Text>
                <Text style={[styles.statValue, { color: rarityConfig.color }]}>
                  {rarityConfig.label} ({rarityConfig.percentage})
                </Text>
              </View>

              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Category
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {categoryConfig.label}
                </Text>
              </View>
              
              {achievementData.unlockedAt && (
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Unlocked
                  </Text>
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {format(parseISO(achievementData.unlockedAt), 'MMM dd, yyyy')}
                  </Text>
                </View>
              )}
            </View>

            {/* Progress for locked achievements */}
            {!achievementData.unlocked && (
              <View style={styles.progressSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Progress
                </Text>
                {renderProgress()}
                <Text style={[styles.progressHint, { color: theme.colors.textSecondary }]}>
                  Complete {achievementData.maxProgress - achievementData.progress} more to unlock
                </Text>
              </View>
            )}

            {/* Premium requirement notice */}
            {achievementData.requiresPremium && !user?.isPremium && (
              <View style={styles.premiumNotice}>
                <MaterialIcons name="workspace-premium" size={20} color="#FFD700" />
                <Text style={[styles.premiumNoticeText, { color: theme.colors.text }]}>
                  Premium achievement - upgrade to unlock
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.modalActions}>
              {achievementData.unlocked && enableSocialSharing && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.shareButton]}
                  onPress={handleShare}
                >
                  <Ionicons name="share" size={20} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>Share Achievement</Text>
                </TouchableOpacity>
              )}
              
              {renderClaimButton()}
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      onPressIn={() => {
        if (interactive && isAvailableForUser) {
          Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
        }
      }}
      onPressOut={() => {
        if (interactive && isAvailableForUser) {
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        }
      }}
      disabled={!interactive || !isAvailableForUser}
      activeOpacity={interactive && isAvailableForUser ? 0.7 : 1}
      testID={testID}
      accessibilityLabel={`${achievementData.unlocked ? 'Unlocked' : 'Locked'} achievement: ${achievementData.title}. ${achievementData.description}. ${achievementData.points} points. ${!isAvailableForUser ? 'Not available for your account.' : ''}`}
      accessibilityRole="button"
    >
      {renderCardContent()}
      {renderDetailsModal()}
    </TouchableOpacity>
  );
};

// Enhanced Achievement Card Grid Component with platform features
const AchievementCardGrid = ({
  achievements = [],
  columns = 3,
  spacing = 12,
  userRole = 'client',
  language = 'en',
  filterByCategory = null,
  sortBy = 'rarity',
  ...props
}) => {
  const { theme } = useTheme();

  // Filter and sort achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements;
    
    // Filter by category
    if (filterByCategory) {
      filtered = filtered.filter(achievement => achievement.category === filterByCategory);
    }
    
    // Sort achievements
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rarity':
          const rarityOrder = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
          return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        case 'points':
          return (b.points || 0) - (a.points || 0);
        case 'progress':
          return (b.progress / b.maxProgress) - (a.progress / a.maxProgress);
        case 'date':
          return new Date(b.unlockedAt || 0) - new Date(a.unlockedAt || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [achievements, filterByCategory, sortBy]);

  const gridStyle = useMemo(() => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing / 2,
  }), [spacing]);

  const cardStyle = useMemo(() => ({
    width: `${100 / columns}%`,
    padding: spacing / 2,
  }), [columns, spacing]);

  if (filteredAchievements.length === 0) {
    return (
      <View style={[styles.emptyGrid, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="trophy-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.colors.text }]}>
          No achievements yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          Complete tasks and challenges to earn achievements
        </Text>
        {filterByCategory && (
          <Text style={[styles.emptyFilterText, { color: theme.colors.textTertiary }]}>
            Filtered by: {filterByCategory}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={gridStyle}>
      {filteredAchievements.map((achievement, index) => (
        <View key={achievement.id || index} style={cardStyle}>
          <AchievementCard 
            achievement={achievement} 
            userRole={userRole}
            language={language}
            {...props} 
          />
        </View>
      ))}
    </View>
  );
};

// Add new styles for enhanced features
const enhancedStyles = StyleSheet.create({
  premiumIndicator: {
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
  categoryBadge: {
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
  categoryText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  unavailableCard: {
    opacity: 0.5,
  },
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  premiumNoticeText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  emptyFilterText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  // ... (keep all existing styles from previous version)
  ...enhancedStyles,
  // Add the rest of your existing styles here
  container: {
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
  },
  compactCard: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  iconGlow: {
    position: 'absolute',
    top: '10%',
    left: '10%',
  },
  iconWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconShine: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: '200%',
    height: '200%',
  },
  secretOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityBadge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rarityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  pointsText: {
    fontWeight: '700',
  },
  claimButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  claimButtonText: {
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitleText: {
    marginLeft: 12,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});

export default AchievementCard;
export { 
  AchievementCardGrid, 
  ACHIEVEMENT_TYPES, 
  ACHIEVEMENT_RARITY, 
  ACHIEVEMENT_CATEGORIES 
};