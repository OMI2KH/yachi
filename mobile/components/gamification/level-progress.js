// components/gamification/level-progress.js

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
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, G, Text as SvgText, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const SCREEN = Dimensions.get('window');

const GAMIFICATION_CONFIG = {
  LEVELS: {
    1: { xpThreshold: 0, reward: { type: 'badge', name: 'Rookie', color: '#9E9E9E', points: 100 } },
    2: { xpThreshold: 100, reward: { type: 'badge', name: 'Explorer', color: '#4CAF50', points: 200 } },
    3: { xpThreshold: 300, reward: { type: 'badge', name: 'Specialist', color: '#2196F3', points: 300 } },
    4: { xpThreshold: 600, reward: { type: 'badge', name: 'Expert', color: '#FF9800', points: 400 } },
    5: { xpThreshold: 1000, reward: { type: 'badge', name: 'Master', color: '#9C27B0', points: 500 } },
    6: { xpThreshold: 1500, reward: { type: 'badge', name: 'Grandmaster', color: '#F44336', points: 600 } },
    7: { xpThreshold: 2100, reward: { type: 'badge', name: 'Legend', color: '#00BCD4', points: 700 } },
    8: { xpThreshold: 2800, reward: { type: 'badge', name: 'Titan', color: '#FF5722', points: 800 } },
    9: { xpThreshold: 3600, reward: { type: 'badge', name: 'Supreme', color: '#673AB7', points: 900 } },
    10: { xpThreshold: 4500, reward: { type: 'badge', name: 'Immortal', color: '#FFD700', points: 1000 } },
  },
  PROGRESS_TYPES: {
    LINEAR: 'linear',
    CIRCULAR: 'circular',
    STEPPED: 'stepped',
    MINIMAL: 'minimal'
  },
  SIZES: {
    COMPACT: { height: 60, progress: 6, circle: 60, font: 12, level: 14, padding: 8 },
    STANDARD: { height: 80, progress: 10, circle: 100, font: 14, level: 18, padding: 12 },
    LARGE: { height: 100, progress: 14, circle: 140, font: 16, level: 24, padding: 16 },
    HERO: { height: 120, progress: 18, circle: 180, font: 18, level: 32, padding: 20 }
  },
  ANIMATION: {
    PROGRESS_DURATION: 1200,
    CELEBRATION_DURATION: 3000,
    HAPTIC_INTENSITY: Haptics.NotificationFeedbackType.Success
  }
};

const LevelProgress = ({
  currentXp = 0,
  currentLevel = 1,
  progressVariant = GAMIFICATION_CONFIG.PROGRESS_TYPES.LINEAR,
  displaySize = 'standard',
  showMilestones = true,
  showRewards = true,
  displayRank = false,
  enableAnimations = true,
  isCompact = false,
  onLevelUp,
  onRewardClaim,
  onMilestoneSelect,
  userRanking,
  containerStyle,
  testIdentifier = 'level-progress-component',
  accessibilityConfig = {}
}) => {
  const { theme, colorScheme } = useTheme();
  
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isAnimationActive, setIsAnimationActive] = useState(false);
  const [previousLevelState, setPreviousLevelState] = useState(currentLevel);
  const [previousXpState, setPreviousXpState] = useState(currentXp);
  const [isCelebrating, setIsCelebrating] = useState(false);
  
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const levelUpAnimation = useRef(new Animated.Value(0)).current;

  const levelMetrics = useMemo(() => {
    const currentLevelData = GAMIFICATION_CONFIG.LEVELS[currentLevel];
    const nextLevel = Math.min(currentLevel + 1, Object.keys(GAMIFICATION_CONFIG.LEVELS).length);
    const nextLevelData = GAMIFICATION_CONFIG.LEVELS[nextLevel];
    
    const currentLevelXp = currentXp - currentLevelData.xpThreshold;
    const nextLevelXpRequired = nextLevelData.xpThreshold - currentLevelData.xpThreshold;
    const progressPercentage = nextLevelXpRequired > 0 ? 
      Math.min(Math.max(currentLevelXp / nextLevelXpRequired, 0), 1) : 1;
    
    const xpRemaining = nextLevelData.xpThreshold - currentXp;
    const upcomingMilestones = Object.keys(GAMIFICATION_CONFIG.LEVELS)
      .filter(level => level > currentLevel && GAMIFICATION_CONFIG.LEVELS[level].reward)
      .slice(0, 4);
    
    return {
      currentLevel,
      nextLevel,
      currentLevelData,
      nextLevelData,
      progress: progressPercentage,
      currentLevelXp,
      nextLevelXpRequired,
      xpRemaining,
      upcomingMilestones,
      isMaximumLevel: currentLevel >= Object.keys(GAMIFICATION_CONFIG.LEVELS).length,
    };
  }, [currentXp, currentLevel]);

  const sizeMetrics = useMemo(() => {
    return GAMIFICATION_CONFIG.SIZES[displaySize] || GAMIFICATION_CONFIG.SIZES.STANDARD;
  }, [displaySize]);

  useEffect(() => {
    if (enableAnimations) {
      setIsAnimationActive(true);
      
      Animated.timing(progressAnimation, {
        toValue: levelMetrics.progress,
        duration: GAMIFICATION_CONFIG.ANIMATION.PROGRESS_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => setIsAnimationActive(false));
      
      if (currentLevel > previousLevelState) {
        triggerLevelUpCelebration();
      }
      
      setPreviousLevelState(currentLevel);
      setPreviousXpState(currentXp);
    }
  }, [currentXp, currentLevel, levelMetrics.progress, enableAnimations]);

  const triggerLevelUpCelebration = useCallback(() => {
    setIsCelebrating(true);
    Haptics.notificationAsync(GAMIFICATION_CONFIG.ANIMATION.HAPTIC_INTENSITY);
    
    Animated.sequence([
      Animated.timing(levelUpAnimation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(levelUpAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    ).start();
    
    onLevelUp?.(currentLevel, levelMetrics.currentLevelData.reward);
    
    setTimeout(() => setIsCelebrating(false), GAMIFICATION_CONFIG.ANIMATION.CELEBRATION_DURATION);
  }, [currentLevel, levelMetrics, onLevelUp]);

  const formatExperiencePoints = useCallback((xp) => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  }, []);

  const milestonePoints = useMemo(() => {
    if (!showMilestones) return [];
    
    return levelMetrics.upcomingMilestones.map(level => {
      const levelConfig = GAMIFICATION_CONFIG.LEVELS[level];
      const progress = (levelConfig.xpThreshold - levelMetrics.currentLevelData.xpThreshold) / 
                      (levelMetrics.nextLevelData.xpThreshold - levelMetrics.currentLevelData.xpThreshold);
      return {
        level: parseInt(level),
        progress: Math.min(Math.max(progress, 0), 1),
        reward: levelConfig.reward,
      };
    });
  }, [levelMetrics, showMilestones]);

  const renderLinearProgress = () => {
    const glowOpacity = glowAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.6],
    });

    return (
      <View style={componentStyles.linearProgressContainer}>
        <View style={componentStyles.levelDisplay}>
          <Text style={[
            componentStyles.levelLabel, 
            { color: theme.colors.text, fontSize: sizeMetrics.level }
          ]}>
            Level {levelMetrics.currentLevel}
          </Text>
          <Text style={[
            componentStyles.xpLabel, 
            { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
          ]}>
            {formatExperiencePoints(levelMetrics.currentLevelXp)} / {formatExperiencePoints(levelMetrics.nextLevelXpRequired)} XP
          </Text>
        </View>

        <View style={[
          componentStyles.progressTrack, 
          { height: sizeMetrics.progress }
        ]}>
          <View style={[
            componentStyles.progressBackground, 
            { backgroundColor: theme.colors.border }
          ]} />
          
          <Animated.View
            style={[
              componentStyles.progressFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: isCelebrating ? '#FFD700' : theme.colors.primary,
                height: sizeMetrics.progress,
              },
            ]}
          />
          
          {isCelebrating && (
            <Animated.View
              style={[
                componentStyles.progressGlow,
                {
                  opacity: glowOpacity,
                  backgroundColor: '#FFD700',
                  height: sizeMetrics.progress,
                },
              ]}
            />
          )}
          
          {showMilestones && milestonePoints.map((milestone, index) => (
            <TouchableOpacity
              key={milestone.level}
              style={[
                componentStyles.milestoneIndicator,
                {
                  left: `${milestone.progress * 100}%`,
                  backgroundColor: milestone.reward.color,
                },
              ]}
              onPress={() => onMilestoneSelect?.(milestone.level, milestone.reward)}
            >
              <Text style={componentStyles.milestoneText}>{milestone.level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!levelMetrics.isMaximumLevel && (
          <View style={componentStyles.nextLevelDisplay}>
            <Text style={[
              componentStyles.nextLevelLabel, 
              { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
            ]}>
              {formatExperiencePoints(levelMetrics.xpRemaining)} XP to Level {levelMetrics.nextLevel}
            </Text>
            {showRewards && (
              <View style={componentStyles.rewardIndicator}>
                <MaterialIcons
                  name="emoji-events"
                  size={sizeMetrics.font}
                  color={levelMetrics.nextLevelData.reward.color}
                />
                <Text style={[
                  componentStyles.rewardLabel, 
                  { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
                ]}>
                  {levelMetrics.nextLevelData.reward.name}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderCircularProgress = () => {
    const circleDimensions = sizeMetrics.circle;
    const circleRadius = circleDimensions / 2 - 8;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const strokeOffset = circleCircumference * (1 - levelMetrics.progress);

    const scaleTransform = levelUpAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.2],
    });

    return (
      <View style={componentStyles.circularProgressContainer}>
        <Animated.View style={{ transform: [{ scale: scaleTransform }] }}>
          <Svg width={circleDimensions} height={circleDimensions}>
            <Circle
              cx={circleDimensions / 2}
              cy={circleDimensions / 2}
              r={circleRadius}
              stroke={theme.colors.border}
              strokeWidth="6"
              fill="transparent"
            />
            
            <Circle
              cx={circleDimensions / 2}
              cy={circleDimensions / 2}
              r={circleRadius}
              stroke={isCelebrating ? '#FFD700' : theme.colors.primary}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${circleDimensions / 2}, ${circleDimensions / 2}`}
            />
            
            <G>
              <SvgText
                x={circleDimensions / 2}
                y={circleDimensions / 2 - 8}
                textAnchor="middle"
                fontSize={sizeMetrics.level}
                fontWeight="bold"
                fill={theme.colors.text}
              >
                {levelMetrics.currentLevel}
              </SvgText>
              <SvgText
                x={circleDimensions / 2}
                y={circleDimensions / 2 + 8}
                textAnchor="middle"
                fontSize={sizeMetrics.font}
                fill={theme.colors.textSecondary}
              >
                Level
              </SvgText>
            </G>
          </Svg>
        </Animated.View>

        <View style={componentStyles.circularInfo}>
          <Text style={[
            componentStyles.xpLabel, 
            { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
          ]}>
            {formatExperiencePoints(currentXp)} XP
          </Text>
          {!levelMetrics.isMaximumLevel && (
            <Text style={[
              componentStyles.nextLevelLabel, 
              { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
            ]}>
              {formatExperiencePoints(levelMetrics.xpRemaining)} to go
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderSteppedProgress = () => {
    const progressSteps = levelMetrics.upcomingMilestones.slice(0, 5);
    
    return (
      <View style={componentStyles.steppedProgressContainer}>
        <View style={componentStyles.stepsContainer}>
          {progressSteps.map((step, index) => {
            const isStepCompleted = step.level <= levelMetrics.currentLevel;
            const isCurrentStep = step.level === levelMetrics.currentLevel;
            const isNextStep = step.level === levelMetrics.nextLevel;
            
            return (
              <TouchableOpacity
                key={step.level}
                style={componentStyles.stepWrapper}
                onPress={() => onMilestoneSelect?.(step.level, step.reward)}
              >
                <View style={componentStyles.stepConnector}>
                  {index > 0 && (
                    <View
                      style={[
                        componentStyles.connectorLine,
                        {
                          backgroundColor: isStepCompleted ? step.reward.color : theme.colors.border,
                        },
                      ]}
                    />
                  )}
                </View>
                
                <View style={componentStyles.stepContent}>
                  <View
                    style={[
                      componentStyles.stepIndicator,
                      {
                        backgroundColor: isStepCompleted ? step.reward.color : theme.colors.background,
                        borderColor: isCurrentStep ? step.reward.color : theme.colors.border,
                        width: isCurrentStep ? 22 : 16,
                        height: isCurrentStep ? 22 : 16,
                      },
                    ]}
                  >
                    {isStepCompleted && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  
                  <Text
                    style={[
                      componentStyles.stepLevel,
                      {
                        color: isStepCompleted ? step.reward.color : theme.colors.textSecondary,
                        fontSize: sizeMetrics.font,
                      },
                    ]}
                  >
                    {step.level}
                  </Text>
                  
                  {showRewards && (
                    <Text
                      style={[
                        componentStyles.stepReward,
                        {
                          color: theme.colors.textTertiary,
                          fontSize: sizeMetrics.font - 2,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {step.reward.name}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={componentStyles.steppedInfo}>
          <Text style={[
            componentStyles.levelLabel, 
            { color: theme.colors.text, fontSize: sizeMetrics.level }
          ]}>
            Level {levelMetrics.currentLevel}
          </Text>
          <Text style={[
            componentStyles.xpLabel, 
            { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
          ]}>
            {formatExperiencePoints(levelMetrics.currentLevelXp)} / {formatExperiencePoints(levelMetrics.nextLevelXpRequired)} XP
          </Text>
        </View>
      </View>
    );
  };

  const renderProgressComponent = () => {
    switch (progressVariant) {
      case GAMIFICATION_CONFIG.PROGRESS_TYPES.CIRCULAR:
        return renderCircularProgress();
      case GAMIFICATION_CONFIG.PROGRESS_TYPES.STEPPED:
        return renderSteppedProgress();
      case GAMIFICATION_CONFIG.PROGRESS_TYPES.MINIMAL:
        return renderLinearProgress();
      default:
        return renderLinearProgress();
    }
  };

  const renderRankDisplay = () => {
    if (!displayRank || !userRanking) return null;

    return (
      <View style={componentStyles.rankContainer}>
        <MaterialIcons name="leaderboard" size={16} color={theme.colors.textSecondary} />
        <Text style={[
          componentStyles.rankLabel, 
          { color: theme.colors.textSecondary, fontSize: sizeMetrics.font }
        ]}>
          Rank #{userRanking.position} • Top {userRanking.percentile}%
        </Text>
      </View>
    );
  };

  const renderDetailModal = () => (
    <Modal
      visible={isDetailModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsDetailModalVisible(false)}
    >
      <BlurView intensity={80} style={componentStyles.modalOverlay}>
        <View style={[
          componentStyles.modalContainer, 
          { backgroundColor: theme.colors.card }
        ]}>
          <View style={componentStyles.modalHeader}>
            <Text style={[
              componentStyles.modalTitle, 
              { color: theme.colors.text }
            ]}>
              Level Progression Details
            </Text>
            <TouchableOpacity
              onPress={() => setIsDetailModalVisible(false)}
              style={componentStyles.modalClose}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={componentStyles.modalContent}>
            <View style={[
              componentStyles.levelCard, 
              { backgroundColor: theme.colors.background }
            ]}>
              <Text style={[
                componentStyles.levelCardTitle, 
                { color: theme.colors.text }
              ]}>
                Current Level
              </Text>
              <Text style={[
                componentStyles.levelCardValue, 
                { color: theme.colors.primary }
              ]}>
                {levelMetrics.currentLevel}
              </Text>
              <Text style={[
                componentStyles.levelCardReward, 
                { color: theme.colors.textSecondary }
              ]}>
                {levelMetrics.currentLevelData.reward.name}
              </Text>
              <View style={componentStyles.xpData}>
                <Text style={[
                  componentStyles.xpStat, 
                  { color: theme.colors.text }
                ]}>
                  Total XP: {formatExperiencePoints(currentXp)}
                </Text>
                <Text style={[
                  componentStyles.xpStat, 
                  { color: theme.colors.text }
                ]}>
                  Progress: {Math.round(levelMetrics.progress * 100)}%
                </Text>
              </View>
            </View>

            <Text style={[
              componentStyles.sectionTitle, 
              { color: theme.colors.text }
            ]}>
              Upcoming Levels
            </Text>
            {levelMetrics.upcomingMilestones.map((level, index) => (
              <View key={level} style={componentStyles.upcomingLevel}>
                <View style={componentStyles.upcomingLevelHeader}>
                  <Text style={[
                    componentStyles.upcomingLevelNumber, 
                    { color: theme.colors.text }
                  ]}>
                    Level {level}
                  </Text>
                  <Text style={[
                    componentStyles.upcomingLevelXp, 
                    { color: theme.colors.textSecondary }
                  ]}>
                    {formatExperiencePoints(GAMIFICATION_CONFIG.LEVELS[level].xpThreshold)} XP
                  </Text>
                </View>
                <Text style={[
                  componentStyles.upcomingLevelReward, 
                  { color: GAMIFICATION_CONFIG.LEVELS[level].reward.color }
                ]}>
                  {GAMIFICATION_CONFIG.LEVELS[level].reward.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <TouchableOpacity
      style={[
        componentStyles.container,
        {
          height: sizeMetrics.height,
          padding: sizeMetrics.padding,
        },
        isCompact && componentStyles.compactContainer,
        containerStyle,
      ]}
      onPress={() => setIsDetailModalVisible(true)}
      activeOpacity={0.7}
      testID={testIdentifier}
      accessibilityLabel={`Level ${levelMetrics.currentLevel}. ${Math.round(levelMetrics.progress * 100)}% progress. ${levelMetrics.xpRemaining} XP to next level.`}
      accessibilityRole="button"
    >
      {renderProgressComponent()}
      {renderRankDisplay()}
      {renderDetailModal()}
    </TouchableOpacity>
  );
};

const LevelProgressGroup = ({
  progressItems = [],
  layout = 'vertical',
  ...componentProps
}) => {
  const { theme } = useTheme();

  if (progressItems.length === 0) {
    return (
      <View style={[
        componentStyles.emptyState, 
        { backgroundColor: theme.colors.background }
      ]}>
        <Ionicons name="trending-up" size={48} color={theme.colors.textTertiary} />
        <Text style={[
          componentStyles.emptyText, 
          { color: theme.colors.textSecondary }
        ]}>
          No progression data available
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      componentStyles.groupContainer,
      layout === 'horizontal' && componentStyles.horizontalLayout,
    ]}>
      {progressItems.map((item, index) => (
        <LevelProgress
          key={item.id || index}
          currentXp={item.xp}
          currentLevel={item.level}
          progressVariant={item.type}
          displaySize={item.size}
          {...componentProps}
        />
      ))}
    </View>
  );
};

const componentStyles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  compactContainer: {
    padding: 4,
  },
  linearProgressContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  levelDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontWeight: '700',
  },
  xpLabel: {
    fontWeight: '500',
  },
  progressTrack: {
    position: 'relative',
    marginVertical: 8,
  },
  progressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: 6,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 6,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  milestoneIndicator: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  milestoneText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  nextLevelDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  nextLevelLabel: {
    fontWeight: '500',
  },
  rewardIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardLabel: {
    fontWeight: '500',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  steppedProgressContainer: {
    flex: 1,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  stepConnector: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    position: 'absolute',
    height: 2,
    left: -50,
    right: -50,
  },
  stepContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  stepIndicator: {
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepLevel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  stepReward: {
    fontWeight: '500',
    textAlign: 'center',
  },
  steppedInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  rankLabel: {
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
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
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  levelCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  levelCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  levelCardValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  levelCardReward: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  xpData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpStat: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  upcomingLevel: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  upcomingLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  upcomingLevelNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  upcomingLevelXp: {
    fontSize: 14,
    fontWeight: '500',
  },
  upcomingLevelReward: {
    fontSize: 14,
    fontWeight: '500',
  },
  groupContainer: {
    gap: 16,
  },
  horizontalLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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

export default LevelProgress;
export { LevelProgressGroup, GAMIFICATION_CONFIG };