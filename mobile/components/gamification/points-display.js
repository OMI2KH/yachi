// components/gamification/points-display.js

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const SCREEN = Dimensions.get('window');

const POINTS_CONFIG = {
  TYPES: {
    POINTS: {
      label: 'Points',
      icon: 'star',
      color: '#FFD700',
      gradient: ['#FFD700', '#FFED4E'],
      symbol: '⭐',
    },
    COINS: {
      label: 'Coins',
      icon: 'monetization-on',
      color: '#FFA500',
      gradient: ['#FFA500', '#FFC04D'],
      symbol: '🪙',
    },
    GEMS: {
      label: 'Gems',
      icon: 'diamond',
      color: '#4CD964',
      gradient: ['#4CD964', '#76E890'],
      symbol: '💎',
    },
    EXPERIENCE: {
      label: 'XP',
      icon: 'auto-awesome',
      color: '#5856D6',
      gradient: ['#5856D6', '#7D7AFF'],
      symbol: '⚡',
    },
  },
  
  LEVELS: {
    1: { threshold: 0, reward: 'Starter' },
    2: { threshold: 100, reward: 'Explorer' },
    3: { threshold: 300, reward: 'Adventurer' },
    4: { threshold: 600, reward: 'Champion' },
    5: { threshold: 1000, reward: 'Master' },
    6: { threshold: 1500, reward: 'Legend' },
    7: { threshold: 2100, reward: 'Mythic' },
    8: { threshold: 2800, reward: 'Immortal' },
    9: { threshold: 3600, reward: 'Celestial' },
    10: { threshold: 4500, reward: 'Titan' },
  },
  
  SIZES: {
    SMALL: { container: 80, icon: 20, points: 18, label: 12, level: 10, padding: 8 },
    MEDIUM: { container: 120, icon: 32, points: 24, label: 14, level: 12, padding: 12 },
    LARGE: { container: 160, icon: 48, points: 32, label: 16, level: 14, padding: 16 },
    XLARGE: { container: 200, icon: 64, points: 40, label: 18, level: 16, padding: 20 },
  },
  
  ANIMATION: {
    DURATION: 1500,
    HAPTIC_IMPACT: Haptics.ImpactFeedbackStyle.Light,
    HAPTIC_SUCCESS: Haptics.NotificationFeedbackType.Success,
  }
};

const PointsDisplay = ({
  points = 0,
  currencyType = 'points',
  currentLevel = 1,
  showLevelIndicator = true,
  showProgressBar = true,
  showDetailedView = false,
  displaySize = 'medium',
  displayVariant = 'default',
  enableAnimations = true,
  onDisplayPress,
  onRewardRedeem,
  onLevelProgress,
  recentTransactions = [],
  userAchievements = [],
  containerStyle,
  testIdentifier = 'points-display-component',
}) => {
  const { theme, colorScheme } = useTheme();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAnimationActive, setIsAnimationActive] = useState(false);
  const [previousPointsValue, setPreviousPointsValue] = useState(points);
  const [confettiElements, setConfettiElements] = useState([]);
  
  const pointsAnimation = useRef(new Animated.Value(previousPointsValue)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  const currencyConfig = useMemo(() => {
    return POINTS_CONFIG.TYPES[currencyType.toUpperCase()] || POINTS_CONFIG.TYPES.POINTS;
  }, [currencyType]);

  const levelProgress = useMemo(() => {
    const level = Math.min(currentLevel, Object.keys(POINTS_CONFIG.LEVELS).length);
    const nextLevel = Math.min(level + 1, Object.keys(POINTS_CONFIG.LEVELS).length);
    
    const currentLevelData = POINTS_CONFIG.LEVELS[level];
    const nextLevelData = POINTS_CONFIG.LEVELS[nextLevel];
    
    const currentLevelPoints = points - currentLevelData.threshold;
    const nextLevelPointsRequired = nextLevelData.threshold - currentLevelData.threshold;
    const progressPercentage = nextLevelPointsRequired > 0 ? 
      Math.min(Math.max(currentLevelPoints / nextLevelPointsRequired, 0), 1) : 1;
    
    return {
      currentLevel: level,
      nextLevel,
      currentLevelData,
      nextLevelData,
      progress: progressPercentage,
      pointsToNextLevel: nextLevelData.threshold - points,
    };
  }, [points, currentLevel]);

  const sizeConfiguration = useMemo(() => {
    return POINTS_CONFIG.SIZES[displaySize.toUpperCase()] || POINTS_CONFIG.SIZES.MEDIUM;
  }, [displaySize]);

  const animatedPointsValue = pointsAnimation.interpolate({
    inputRange: [previousPointsValue, points],
    outputRange: [previousPointsValue, points],
  });

  useEffect(() => {
    if (points !== previousPointsValue && enableAnimations) {
      setIsAnimationActive(true);
      
      if (points > previousPointsValue) {
        Haptics.impactAsync(POINTS_CONFIG.ANIMATION.HAPTIC_IMPACT);
      }
      
      Animated.timing(pointsAnimation, {
        toValue: points,
        duration: POINTS_CONFIG.ANIMATION.DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setIsAnimationActive(false);
        setPreviousPointsValue(points);
      });
      
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.2,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
      
      if (points - previousPointsValue >= 50) {
        generateConfetti();
      }
      
      if (levelProgress.progress === 1 && onLevelProgress) {
        setTimeout(() => {
          onLevelProgress(levelProgress.nextLevel);
          Haptics.notificationAsync(POINTS_CONFIG.ANIMATION.HAPTIC_SUCCESS);
        }, 1000);
      }
    }
  }, [points, previousPointsValue, enableAnimations]);

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: levelProgress.progress,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [levelProgress.progress]);

  const generateConfetti = useCallback(() => {
    const particles = Array.from({ length: 20 }, (_, index) => ({
      id: index,
      x: Math.random() * SCREEN.width,
      y: -20,
      velocityX: (Math.random() - 0.5) * 8,
      velocityY: Math.random() * 5 + 5,
      size: Math.random() * 10 + 5,
      color: currencyConfig.gradient[Math.floor(Math.random() * currencyConfig.gradient.length)],
      rotation: Math.random() * 360,
    }));
    
    setConfettiElements(particles);
    
    particles.forEach((particle, index) => {
      setTimeout(() => {
        setConfettiElements(previous => 
          previous.map(p => 
            p.id === particle.id 
              ? { 
                  ...p, 
                  y: p.y + p.velocityY, 
                  x: p.x + p.velocityX, 
                  rotation: p.rotation + 10 
                }
              : p
          )
        );
      }, index * 50);
    });
    
    setTimeout(() => setConfettiElements([]), 2000);
  }, [currencyConfig]);

  const handleDisplayPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onDisplayPress) {
      onDisplayPress(currencyType, points);
    } else {
      setIsModalVisible(true);
    }
  }, [onDisplayPress, currencyType, points]);

  const formatPointsValue = useCallback((value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }, []);

  const renderConfettiAnimation = () => {
    if (confettiElements.length === 0) return null;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confettiElements.map(particle => (
          <View
            key={particle.id}
            style={[
              styles.confetti,
              {
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                transform: [{ rotate: `${particle.rotation}deg` }],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderProgressIndicator = () => {
    if (!showProgressBar || displayVariant === 'minimal') return null;

    return (
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <Animated.View 
            style={[
              styles.progressBar,
              { 
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: currencyConfig.color,
              },
            ]} 
          />
        </View>
        {displayVariant !== 'compact' && (
          <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>
            {Math.round(levelProgress.progress * 100)}% to Level {levelProgress.nextLevel}
          </Text>
        )}
      </View>
    );
  };

  const renderLevelIndicator = () => {
    if (!showLevelIndicator || displayVariant === 'minimal') return null;

    return (
      <View style={styles.levelSection}>
        <Text style={[styles.levelText, { color: currencyConfig.color, fontSize: sizeConfiguration.level }]}>
          Lvl {levelProgress.currentLevel}
        </Text>
        {displayVariant === 'premium' && (
          <Text style={[styles.levelTitle, { color: theme.colors.textSecondary }]}>
            {levelProgress.currentLevelData.reward}
          </Text>
        )}
      </View>
    );
  };

  const renderPointsComponent = () => {
    const isCompactView = displayVariant === 'compact' || displayVariant === 'minimal';

    return (
      <Animated.View
        style={[
          styles.pointsComponent,
          {
            transform: [
              { scale: scaleAnimation },
              { scale: pulseAnimation },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={currencyConfig.gradient}
          style={[
            styles.iconWrapper,
            {
              width: sizeConfiguration.container * 0.6,
              height: sizeConfiguration.container * 0.6,
              borderRadius: sizeConfiguration.container * 0.3,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons
            name={currencyConfig.icon}
            size={sizeConfiguration.icon}
            color="#FFFFFF"
          />
        </LinearGradient>

        <View style={styles.pointsValueSection}>
          {enableAnimations ? (
            <Animated.Text
              style={[
                styles.pointsValue,
                {
                  color: theme.colors.text,
                  fontSize: sizeConfiguration.points,
                },
                isAnimationActive && styles.animatedText,
              ]}
            >
              {animatedPointsValue.interpolate({
                inputRange: [previousPointsValue, points],
                outputRange: [
                  formatPointsValue(previousPointsValue),
                  formatPointsValue(points),
                ],
              })}
            </Animated.Text>
          ) : (
            <Text
              style={[
                styles.pointsValue,
                {
                  color: theme.colors.text,
                  fontSize: sizeConfiguration.points,
                },
              ]}
            >
              {formatPointsValue(points)}
            </Text>
          )}

          {!isCompactView && (
            <Text
              style={[
                styles.currencyLabel,
                {
                  color: theme.colors.textSecondary,
                  fontSize: sizeConfiguration.label,
                },
              ]}
            >
              {currencyConfig.label}
            </Text>
          )}
        </View>

        {renderLevelIndicator()}
      </Animated.View>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <BlurView intensity={80} style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleSection}>
              {renderPointsComponent()}
              <View style={styles.modalTextSection}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {currencyConfig.label} Overview
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Level {levelProgress.currentLevel} {levelProgress.currentLevelData.reward}
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

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Level Progress
            </Text>
            {renderProgressIndicator()}
            <View style={styles.progressData}>
              <Text style={[styles.progressDataText, { color: theme.colors.textSecondary }]}>
                {points} / {levelProgress.nextLevelData.threshold} {currencyConfig.label}
              </Text>
              <Text style={[styles.progressDataText, { color: theme.colors.textSecondary }]}>
                {levelProgress.pointsToNextLevel} to next level
              </Text>
            </View>
          </View>

          {recentTransactions.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Recent Activity
              </Text>
              <ScrollView style={styles.activitySection}>
                {recentTransactions.slice(0, 5).map((transaction, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <MaterialIcons
                        name={transaction.isPositive ? 'add' : 'remove'}
                        size={16}
                        color={transaction.isPositive ? '#4CAF50' : '#F44336'}
                      />
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                        {transaction.title}
                      </Text>
                      <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                        {transaction.time}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.activityAmount,
                        { color: transaction.isPositive ? '#4CAF50' : '#F44336' },
                      ]}
                    >
                      {transaction.isPositive ? '+' : ''}{transaction.points}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {userAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Recent Achievements
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userAchievements.slice(0, 3).map((achievement, index) => (
                  <View
                    key={index}
                    style={[styles.achievementCard, { backgroundColor: theme.colors.background }]}
                  >
                    <MaterialIcons
                      name="emoji-events"
                      size={24}
                      color={currencyConfig.color}
                    />
                    <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                      {achievement.title}
                    </Text>
                    <Text style={[styles.achievementPoints, { color: currencyConfig.color }]}>
                      +{achievement.points}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.modalActions}>
            {onRewardRedeem && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: currencyConfig.color }]}
                onPress={() => {
                  setIsModalVisible(false);
                  onRewardRedeem(currencyType);
                }}
              >
                <Text style={styles.actionButtonText}>Redeem Rewards</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <TouchableOpacity
      style={[styles.container, containerStyle]}
      onPress={handleDisplayPress}
      activeOpacity={0.8}
      testID={testIdentifier}
      accessibilityLabel={`${currencyConfig.label}: ${points}. Level ${currentLevel}. Tap for details.`}
      accessibilityRole="button"
    >
      {renderPointsComponent()}
      {renderProgressIndicator()}
      {renderConfettiAnimation()}
      {renderDetailModal()}
    </TouchableOpacity>
  );
};

const PointsDisplayGroup = ({
  pointsCollection = [],
  layoutType = 'horizontal',
  ...groupProps
}) => {
  const { theme } = useTheme();

  if (pointsCollection.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="trophy-outline" size={48} color={theme.colors.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No points data available
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.groupContainer,
      layoutType === 'vertical' && styles.verticalLayout,
      layoutType === 'grid' && styles.gridLayout,
    ]}>
      {pointsCollection.map((data, index) => (
        <PointsDisplay
          key={data.type}
          points={data.points}
          currencyType={data.type}
          currentLevel={data.level}
          displayVariant={data.variant || 'compact'}
          {...groupProps}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pointsComponent: {
    alignItems: 'center',
    padding: 8,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 8,
  },
  pointsValueSection: {
    alignItems: 'center',
  },
  pointsValue: {
    fontWeight: '700',
    textAlign: 'center',
  },
  animatedText: {
    fontWeight: '800',
  },
  currencyLabel: {
    fontWeight: '500',
    marginTop: 2,
  },
  levelSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  levelText: {
    fontWeight: '700',
  },
  levelTitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  progressSection: {
    width: '100%',
    marginTop: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  progressData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressDataText: {
    fontSize: 12,
    fontWeight: '500',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
  modalContainer: {
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
  modalTextSection: {
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  activitySection: {
    maxHeight: 200,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementCard: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 100,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  achievementPoints: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modalActions: {
    padding: 20,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  verticalLayout: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  gridLayout: {
    justifyContent: 'space-between',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default PointsDisplay;
export { PointsDisplayGroup, POINTS_CONFIG };