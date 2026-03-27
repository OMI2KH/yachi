const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiNotifications } = require('../services/yachiNotifications');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const GamificationSchema = {
  awardPoints: z.object({
    action: z.string().min(1).max(50),
    points: z.number().int().min(1).max(1000),
    metadata: z.object({}).optional(),
    category: z.enum(['engagement', 'completion', 'quality', 'social', 'verification']).optional()
  }),

  completeChallenge: z.object({
    challengeId: z.string().uuid(),
    evidence: z.any().optional(),
    metadata: z.object({}).optional()
  }),

  leaderboard: z.object({
    type: z.enum(['weekly', 'monthly', 'all_time', 'category']).default('weekly'),
    category: z.enum(['providers', 'clients', 'all']).default('all'),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0)
  }),

  redeemReward: z.object({
    rewardId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10).default(1)
  }),

  trackAction: z.object({
    action: z.string().min(1).max(50),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    metadata: z.object({}).optional()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `gamification:profile:${userId}`,
  LEADERBOARD: (type, category) => `gamification:leaderboard:${type}:${category}`,
  ACTIVE_CHALLENGES: (userId) => `gamification:challenges:active:${userId}`,
  AVAILABLE_REWARDS: (userId) => `gamification:rewards:available:${userId}`,
  USER_ACHIEVEMENTS: (userId) => `gamification:achievements:${userId}`
};

// 🚀 GET USER GAMIFICATION PROFILE
router.get('/profile', auth, async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.USER_PROFILE(req.user.userId);
    const cachedProfile = await redis.get(cacheKey);

    if (cachedProfile) {
      return res.json({
        success: true,
        ...JSON.parse(cachedProfile),
        source: 'cache'
      });
    }

    const profile = await YachiGamification.getUserProfile(req.user.userId);

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(profile));

    res.json({
      success: true,
      data: profile,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Gamification Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gamification profile',
      code: 'PROFILE_FETCH_FAILED'
    });
  }
});

// 🚀 GET LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const validatedData = GamificationSchema.leaderboard.parse(req.query);

    const cacheKey = CACHE_KEYS.LEADERBOARD(validatedData.type, validatedData.category);
    const cachedLeaderboard = await redis.get(cacheKey);

    if (cachedLeaderboard) {
      return res.json({
        success: true,
        ...JSON.parse(cachedLeaderboard),
        source: 'cache'
      });
    }

    const leaderboard = await YachiGamification.getLeaderboard({
      type: validatedData.type,
      category: validatedData.category,
      limit: validatedData.limit,
      offset: validatedData.offset
    });

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(leaderboard));

    res.json({
      success: true,
      data: leaderboard,
      source: 'database'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Get Leaderboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      code: 'LEADERBOARD_FETCH_FAILED'
    });
  }
});

// 🚀 AWARD POINTS TO USER
router.post('/award-points', auth, async (req, res) => {
  try {
    const validatedData = GamificationSchema.awardPoints.parse(req.body);

    // 🎯 Award points to user
    const result = await YachiGamification.awardPoints({
      userId: req.user.userId,
      action: validatedData.action,
      points: validatedData.points,
      category: validatedData.category,
      metadata: validatedData.metadata
    });

    // 📊 Track points awarding
    await YachiAnalytics.trackPointsAwarded({
      userId: req.user.userId,
      action: validatedData.action,
      points: validatedData.points,
      category: validatedData.category,
      newLevel: result.levelChanged ? result.newLevel : null
    });

    // 📧 Send notification for significant milestones
    if (result.levelChanged) {
      await YachiNotifications.sendLevelUpNotification(
        req.user.userId,
        result.newLevel,
        result.pointsAwarded
      );
    }

    // 🗑️ Clear relevant caches
    await clearGamificationCaches(req.user.userId);

    res.json({
      success: true,
      message: `🎉 ${validatedData.points} points awarded for ${validatedData.action}`,
      data: result,
      metadata: {
        levelChanged: result.levelChanged,
        achievementsUnlocked: result.achievementsUnlocked || []
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Award Points Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award points',
      code: 'POINTS_AWARD_FAILED'
    });
  }
});

// 🚀 COMPLETE CHALLENGE
router.post('/challenges/complete', auth, async (req, res) => {
  try {
    const validatedData = GamificationSchema.completeChallenge.parse(req.body);

    // 🎯 Complete challenge
    const result = await YachiGamification.completeChallenge({
      userId: req.user.userId,
      challengeId: validatedData.challengeId,
      evidence: validatedData.evidence,
      metadata: validatedData.metadata
    });

    // 📊 Track challenge completion
    await YachiAnalytics.trackChallengeCompletion({
      userId: req.user.userId,
      challengeId: validatedData.challengeId,
      pointsEarned: result.pointsEarned,
      duration: result.completionTime
    });

    // 📧 Send challenge completion notification
    await YachiNotifications.sendChallengeCompleteNotification(
      req.user.userId,
      result.challengeName,
      result.pointsEarned
    );

    // 🗑️ Clear relevant caches
    await clearGamificationCaches(req.user.userId);

    res.json({
      success: true,
      message: `🏆 Challenge "${result.challengeName}" completed!`,
      data: result,
      gamification: {
        pointsEarned: result.pointsEarned,
        achievementsUnlocked: result.achievementsUnlocked || [],
        nextChallenge: result.nextChallenge
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Complete Challenge Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete challenge',
      code: 'CHALLENGE_COMPLETE_FAILED'
    });
  }
});

// 🚀 GET ACTIVE CHALLENGES
router.get('/challenges/active', auth, async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.ACTIVE_CHALLENGES(req.user.userId);
    const cachedChallenges = await redis.get(cacheKey);

    if (cachedChallenges) {
      return res.json({
        success: true,
        ...JSON.parse(cachedChallenges),
        source: 'cache'
      });
    }

    const challenges = await YachiGamification.getActiveChallenges(req.user.userId);

    // 💾 Cache for 3 minutes
    await redis.setex(cacheKey, 180, JSON.stringify(challenges));

    res.json({
      success: true,
      data: challenges,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Active Challenges Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active challenges',
      code: 'CHALLENGES_FETCH_FAILED'
    });
  }
});

// 🚀 GET AVAILABLE REWARDS
router.get('/rewards/available', auth, async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.AVAILABLE_REWARDS(req.user.userId);
    const cachedRewards = await redis.get(cacheKey);

    if (cachedRewards) {
      return res.json({
        success: true,
        ...JSON.parse(cachedRewards),
        source: 'cache'
      });
    }

    const rewards = await YachiGamification.getAvailableRewards(req.user.userId);

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(rewards));

    res.json({
      success: true,
      data: rewards,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Available Rewards Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available rewards',
      code: 'REWARDS_FETCH_FAILED'
    });
  }
});

// 🚀 REDEEM REWARD
router.post('/rewards/redeem', auth, async (req, res) => {
  try {
    const validatedData = GamificationSchema.redeemReward.parse(req.body);

    // 🎯 Redeem reward
    const result = await YachiGamification.redeemReward({
      userId: req.user.userId,
      rewardId: validatedData.rewardId,
      quantity: validatedData.quantity
    });

    // 📊 Track reward redemption
    await YachiAnalytics.trackRewardRedemption({
      userId: req.user.userId,
      rewardId: validatedData.rewardId,
      pointsSpent: result.pointsSpent,
      rewardValue: result.rewardValue
    });

    // 📧 Send reward redemption notification
    await YachiNotifications.sendRewardRedeemedNotification(
      req.user.userId,
      result.rewardName,
      result.pointsSpent
    );

    // 🗑️ Clear relevant caches
    await clearGamificationCaches(req.user.userId);

    res.json({
      success: true,
      message: `🎁 Successfully redeemed ${result.rewardName}`,
      data: result,
      metadata: {
        pointsBalance: result.newPointsBalance,
        deliveryEstimate: result.deliveryEstimate,
        redemptionCode: result.redemptionCode
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Redeem Reward Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to redeem reward',
      code: 'REWARD_REDEEM_FAILED'
    });
  }
});

// 🚀 GET USER ACHIEVEMENTS
router.get('/achievements', auth, async (req, res) => {
  try {
    const cacheKey = CACHE_KEYS.USER_ACHIEVEMENTS(req.user.userId);
    const cachedAchievements = await redis.get(cacheKey);

    if (cachedAchievements) {
      return res.json({
        success: true,
        ...JSON.parse(cachedAchievements),
        source: 'cache'
      });
    }

    const achievements = await YachiGamification.getUserAchievements(req.user.userId);

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(achievements));

    res.json({
      success: true,
      data: achievements,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Achievements Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements',
      code: 'ACHIEVEMENTS_FETCH_FAILED'
    });
  }
});

// 🚀 TRACK USER ACTION
router.post('/track-action', auth, async (req, res) => {
  try {
    const validatedData = GamificationSchema.trackAction.parse(req.body);

    // 🎯 Track user action for gamification
    const result = await YachiGamification.trackUserAction({
      userId: req.user.userId,
      action: validatedData.action,
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      metadata: validatedData.metadata
    });

    // 📊 Track action analytics
    await YachiAnalytics.trackUserAction({
      userId: req.user.userId,
      action: validatedData.action,
      pointsEarned: result.pointsEarned,
      streakMaintained: result.streakMaintained
    });

    res.json({
      success: true,
      message: `Action "${validatedData.action}" tracked successfully`,
      data: result,
      gamification: {
        pointsEarned: result.pointsEarned,
        streakUpdated: result.streakMaintained,
        levelProgress: result.levelProgress
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Track Action Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track user action',
      code: 'ACTION_TRACK_FAILED'
    });
  }
});

// 🚀 GET USER STREAK
router.get('/streak', auth, async (req, res) => {
  try {
    const streak = await YachiGamification.getUserStreak(req.user.userId);

    res.json({
      success: true,
      data: streak,
      metadata: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakBonus: streak.streakBonus,
        nextMilestone: streak.nextMilestone
      }
    });

  } catch (error) {
    console.error('Get User Streak Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user streak',
      code: 'STREAK_FETCH_FAILED'
    });
  }
});

// 🚀 GET LEVEL PROGRESSION
router.get('/level-progression', auth, async (req, res) => {
  try {
    const progression = await YachiGamification.getLevelProgression(req.user.userId);

    res.json({
      success: true,
      data: progression,
      metadata: {
        currentLevel: progression.currentLevel,
        nextLevel: progression.nextLevel,
        progressPercentage: progression.progressPercentage,
        pointsToNextLevel: progression.pointsToNextLevel
      }
    });

  } catch (error) {
    console.error('Get Level Progression Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch level progression',
      code: 'LEVEL_PROGRESSION_FETCH_FAILED'
    });
  }
});

// 🚀 GET BADGES AND TROPHIES
router.get('/badges', auth, async (req, res) => {
  try {
    const badges = await YachiGamification.getUserBadges(req.user.userId);

    res.json({
      success: true,
      data: badges,
      summary: {
        totalBadges: badges.length,
        rareBadges: badges.filter(b => b.rarity === 'rare').length,
        epicBadges: badges.filter(b => b.rarity === 'epic').length,
        legendaryBadges: badges.filter(b => b.rarity === 'legendary').length
      }
    });

  } catch (error) {
    console.error('Get Badges Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badges',
      code: 'BADGES_FETCH_FAILED'
    });
  }
});

// 🚀 GET GAMIFICATION STATISTICS
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await YachiGamification.getUserStats(req.user.userId);

    res.json({
      success: true,
      data: stats,
      highlights: {
        totalPoints: stats.totalPoints,
        rank: stats.rank,
        completionRate: stats.challengeCompletionRate,
        favoriteCategory: stats.mostPointsCategory
      }
    });

  } catch (Error) {
    console.error('Get Gamification Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gamification statistics',
      code: 'STATS_FETCH_FAILED'
    });
  }
});

// 🚀 RESET USER PROGRESS (ADMIN ONLY)
router.delete('/reset-progress', auth, async (req, res) => {
  try {
    // 🛡️ Only allow admins or the user themselves to reset progress
    if (req.user.role !== 'admin' && req.user.userId !== req.body.userId) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to reset gamification progress',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const userId = req.body.userId || req.user.userId;

    // 🎯 Reset user gamification progress
    await YachiGamification.resetUserProgress(userId);

    // 📊 Track reset action
    await YachiAnalytics.trackProgressReset({
      userId: userId,
      resetBy: req.user.userId,
      reason: req.body.reason
    });

    // 🗑️ Clear all gamification caches for user
    await clearGamificationCaches(userId);

    res.json({
      success: true,
      message: 'Gamification progress reset successfully',
      data: {
        userId: userId,
        resetAt: new Date().toISOString(),
        resetBy: req.user.userId
      }
    });

  } catch (error) {
    console.error('Reset Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset gamification progress',
      code: 'RESET_PROGRESS_FAILED'
    });
  }
});

// 🚀 MIGRATE USER POINTS (ADMIN ONLY)
router.post('/migrate-points', auth, async (req, res) => {
  try {
    // 🛡️ Only allow admins
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for points migration',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const { fromUserId, toUserId, points, reason } = req.body;

    // 🎯 Migrate points between users
    const result = await YachiGamification.migratePoints({
      fromUserId,
      toUserId,
      points,
      reason
    });

    // 📊 Track migration
    await YachiAnalytics.trackPointsMigration({
      fromUserId,
      toUserId,
      points,
      migratedBy: req.user.userId,
      reason
    });

    // 🗑️ Clear caches for both users
    await Promise.all([
      clearGamificationCaches(fromUserId),
      clearGamificationCaches(toUserId)
    ]);

    res.json({
      success: true,
      message: `Successfully migrated ${points} points`,
      data: result
    });

  } catch (error) {
    console.error('Migrate Points Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate points',
      code: 'POINTS_MIGRATION_FAILED'
    });
  }
});

// 🎯 UTILITY FUNCTIONS

async function clearGamificationCaches(userId) {
  const keysToDelete = [
    CACHE_KEYS.USER_PROFILE(userId),
    CACHE_KEYS.ACTIVE_CHALLENGES(userId),
    CACHE_KEYS.AVAILABLE_REWARDS(userId),
    CACHE_KEYS.USER_ACHIEVEMENTS(userId),
    CACHE_KEYS.LEADERBOARD('weekly', 'all'),
    CACHE_KEYS.LEADERBOARD('monthly', 'all'),
    CACHE_KEYS.LEADERBOARD('all_time', 'all')
  ];

  try {
    await Promise.all(keysToDelete.map(key => redis.del(key)));
  } catch (error) {
    console.error('Error clearing gamification caches:', error);
  }
}

// 🛑 ERROR HANDLING MIDDLEWARE
router.use((error, req, res, next) => {
  console.error('Gamification Route Error:', error);

  if (error.code === 'INSUFFICIENT_POINTS') {
    return res.status(400).json({
      success: false,
      message: 'Insufficient points for this action',
      code: 'INSUFFICIENT_POINTS'
    });
  }

  if (error.code === 'REWARD_UNAVAILABLE') {
    return res.status(400).json({
      success: false,
      message: 'Reward is no longer available',
      code: 'REWARD_UNAVAILABLE'
    });
  }

  if (error.code === 'CHALLENGE_ALREADY_COMPLETED') {
    return res.status(400).json({
      success: false,
      message: 'Challenge has already been completed',
      code: 'CHALLENGE_ALREADY_COMPLETED'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal gamification system error',
    code: 'GAMIFICATION_SYSTEM_ERROR'
  });
});

module.exports = router;