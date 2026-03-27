const { Sequelize, Op } = require('sequelize');
const { User, Achievement, UserAchievement, PointsHistory, Leaderboard, Badge, UserBadge, Quest, UserQuest } = require('../models');
const { YachiLogger } = require('../utils/logger');
const { redisManager, redisUtils } = require('../config/redis');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiNotifications } = require('../services/yachiNotifications');

/**
 * 🎮 Gamification Controller
 * Comprehensive gamification system for the Yachi platform
 * Handles points, achievements, leaderboards, badges, and quests
 */

class GamificationController {
  constructor() {
    this.pointValues = {
      // User Actions
      REGISTRATION: 50,
      PROFILE_COMPLETION: 100,
      PROFILE_PICTURE: 10,
      EMAIL_VERIFICATION: 25,
      PHONE_VERIFICATION: 25,
      
      // Service Actions
      SERVICE_CREATION: 30,
      SERVICE_BOOKING: 20,
      SERVICE_COMPLETION: 25,
      
      // Social Actions
      REVIEW_GIVEN: 15,
      REVIEW_RECEIVED: 10,
      REFERRAL: 25,
      SOCIAL_SHARE: 5,
      
      // Verification Actions
      FAYDA_VERIFICATION: 50,
      SELFIE_VERIFICATION: 25,
      DOCUMENT_VERIFICATION: 10,
      
      // Payment Actions
      PAYMENT_COMPLETION: 10,
      FIRST_PAYMENT: 20,
      
      // Quality Actions
      ON_TIME_COMPLETION: 15,
      FIVE_STAR_RATING: 20,
      REPEAT_CLIENT: 15,
      
      // Platform Engagement
      DAILY_LOGIN: 5,
      WEEKLY_ACTIVITY: 25,
      MONTHLY_ACTIVITY: 100
    };

    this.setupDailyReset();
    this.setupWeeklyReset();
    this.setupMonthlyReset();
  }

  /**
   * 🕛 Setup daily reset for daily quests and points
   */
  setupDailyReset() {
    // Reset daily at midnight Ethiopia time (UTC+3)
    const now = new Date();
    const ethiopiaTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
    const nextReset = new Date(ethiopiaTime);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);
    
    const timeUntilReset = nextReset.getTime() - ethiopiaTime.getTime();
    
    setTimeout(() => {
      this.resetDailyQuests();
      setInterval(() => this.resetDailyQuests(), 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilReset);
  }

  /**
   * 📅 Setup weekly reset for weekly leaderboards
   */
  setupWeeklyReset() {
    // Reset weekly on Monday 00:00 Ethiopia time
    const now = new Date();
    const ethiopiaTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const dayOfWeek = ethiopiaTime.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    
    const nextReset = new Date(ethiopiaTime);
    nextReset.setDate(ethiopiaTime.getDate() + daysUntilMonday);
    nextReset.setHours(0, 0, 0, 0);
    
    const timeUntilReset = nextReset.getTime() - ethiopiaTime.getTime();
    
    setTimeout(() => {
      this.resetWeeklyLeaderboards();
      setInterval(() => this.resetWeeklyLeaderboards(), 7 * 24 * 60 * 60 * 1000); // 7 days
    }, timeUntilReset);
  }

  /**
   * 🗓️ Setup monthly reset for monthly achievements
   */
  setupMonthlyReset() {
    // Reset monthly on 1st 00:00 Ethiopia time
    const now = new Date();
    const ethiopiaTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const nextReset = new Date(ethiopiaTime.getFullYear(), ethiopiaTime.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);
    
    const timeUntilReset = nextReset.getTime() - ethiopiaTime.getTime();
    
    setTimeout(() => {
      this.resetMonthlyAchievements();
      setInterval(() => this.resetMonthlyAchievements(), 30 * 24 * 60 * 60 * 1000); // ~30 days
    }, timeUntilReset);
  }

  /**
   * 🏆 Get User Gamification Profile
   */
  getUserProfile = async (req, res) => {
    try {
      const userId = req.user.userId;

      const cacheKey = `user:${userId}:gamification:profile`;
      const cachedProfile = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedProfile) {
        return res.json({
          success: true,
          data: cachedProfile,
          source: 'cache'
        });
      }

      const profile = await this.calculateUserGamificationProfile(userId);

      // 💾 Cache profile for 10 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        profile,
        { ttl: 600 }
      );

      res.json({
        success: true,
        data: profile,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get gamification profile error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch gamification profile',
        code: 'GAMIFICATION_PROFILE_FETCH_FAILED'
      });
    }
  };

  /**
   * ⭐ Award Points to User
   */
  awardPoints = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { userId, action, amount, metadata = {} } = req.body;
      const awardedBy = req.user?.userId || 'system';

      // 🛡️ Validate point award
      const validation = this.validatePointAward({
        userId,
        action,
        amount,
        awardedBy
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Point award validation failed',
          errors: validation.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      const finalAmount = amount || this.pointValues[action] || 0;

      if (finalAmount <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid point amount',
          code: 'INVALID_POINT_AMOUNT'
        });
      }

      // 🔍 Get current user points
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const currentPoints = user.points || 0;
      const newPoints = currentPoints + finalAmount;

      // 👤 Update user points
      await User.update({
        points: newPoints,
        totalPoints: (user.totalPoints || 0) + finalAmount,
        lastActivityAt: new Date()
      }, {
        where: { id: userId },
        transaction
      });

      // 📝 Create points history record
      const pointsHistory = await PointsHistory.create({
        userId,
        action,
        points: finalAmount,
        awardedBy,
        balanceAfter: newPoints,
        metadata: {
          previousBalance: currentPoints,
          actionMetadata: metadata,
          awardedAt: new Date().toISOString()
        }
      }, { transaction });

      // 🎯 Check for level up
      const levelUpResult = await this.checkLevelUp(userId, newPoints, transaction);

      // 🏅 Check for achievement unlocks
      const achievementResults = await this.checkAchievementUnlocks(userId, action, transaction);

      // 🎪 Check for badge awards
      const badgeResults = await this.checkBadgeAwards(userId, action, transaction);

      // 📋 Check for quest progress
      const questResults = await this.checkQuestProgress(userId, action, transaction);

      // 📊 Track points award analytics
      await YachiAnalytics.trackEvent('points_awarded', {
        userId,
        action,
        points: finalAmount,
        newBalance: newPoints,
        levelUp: levelUpResult.leveledUp
      });

      await transaction.commit();

      // 🗑️ Clear relevant caches
      await this.clearUserGamificationCache(userId);

      const response = {
        success: true,
        message: `Awarded ${finalAmount} points for ${action}`,
        data: {
          pointsAwarded: finalAmount,
          newBalance: newPoints,
          pointsHistory: this.sanitizePointsHistory(pointsHistory),
          levelUp: levelUpResult.leveledUp ? {
            oldLevel: levelUpResult.oldLevel,
            newLevel: levelUpResult.newLevel
          } : null,
          achievementsUnlocked: achievementResults.unlocked,
          badgesAwarded: badgeResults.awarded,
          questsUpdated: questResults.updated
        }
      };

      // 🔔 Send notifications for significant events
      if (levelUpResult.leveledUp) {
        await YachiNotifications.sendLevelUpNotification(userId, {
          oldLevel: levelUpResult.oldLevel,
          newLevel: levelUpResult.newLevel
        });
      }

      if (achievementResults.unlocked.length > 0) {
        await YachiNotifications.sendAchievementUnlockedNotification(userId, {
          achievements: achievementResults.unlocked
        });
      }

      res.json(response);

    } catch (error) {
      await transaction.rollback();
      
      YachiLogger.error('Award points error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to award points',
        code: 'POINTS_AWARD_FAILED'
      });
    }
  };

  /**
   * 🏅 Get User Achievements
   */
  getUserAchievements = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { category, status = 'all' } = req.query;

      const cacheKey = `user:${userId}:achievements:${category}:${status}`;
      const cachedAchievements = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedAchievements) {
        return res.json({
          success: true,
          data: cachedAchievements,
          source: 'cache'
        });
      }

      const whereClause = {};
      if (category) {
        whereClause.category = category;
      }

      const [achievements, userAchievements] = await Promise.all([
        // Get all available achievements
        Achievement.findAll({
          where: whereClause,
          order: [['pointsRequired', 'ASC']]
        }),
        // Get user's achievement progress
        UserAchievement.findAll({
          where: { userId },
          include: [{
            model: Achievement,
            as: 'achievement'
          }]
        })
      ]);

      // Combine achievements with user progress
      const achievementsWithProgress = achievements.map(achievement => {
        const userAchievement = userAchievements.find(
          ua => ua.achievementId === achievement.id
        );

        return {
          ...achievement.toJSON(),
          unlocked: !!userAchievement,
          unlockedAt: userAchievement?.unlockedAt,
          progress: userAchievement?.progress || 0,
          completed: userAchievement?.completed || false
        };
      });

      // Filter by status if specified
      let filteredAchievements = achievementsWithProgress;
      if (status === 'unlocked') {
        filteredAchievements = achievementsWithProgress.filter(a => a.unlocked);
      } else if (status === 'locked') {
        filteredAchievements = achievementsWithProgress.filter(a => !a.unlocked);
      }

      const result = {
        achievements: filteredAchievements,
        summary: {
          total: achievementsWithProgress.length,
          unlocked: achievementsWithProgress.filter(a => a.unlocked).length,
          locked: achievementsWithProgress.filter(a => !a.unlocked).length,
          completionPercentage: achievementsWithProgress.length > 0 ? 
            (achievementsWithProgress.filter(a => a.unlocked).length / achievementsWithProgress.length) * 100 : 0
        }
      };

      // 💾 Cache achievements for 15 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 900 }
      );

      res.json({
        success: true,
        data: result,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get user achievements error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch achievements',
        code: 'ACHIEVEMENTS_FETCH_FAILED'
      });
    }
  };

  /**
   * 🥇 Get Leaderboards
   */
  getLeaderboards = async (req, res) => {
    try {
      const { type = 'weekly', limit = 100 } = req.query;
      const userId = req.user.userId;

      const cacheKey = `leaderboard:${type}:${limit}`;
      const cachedLeaderboard = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedLeaderboard) {
        return res.json({
          success: true,
          data: cachedLeaderboard,
          source: 'cache'
        });
      }

      const leaderboard = await this.calculateLeaderboard(type, parseInt(limit), userId);

      // 💾 Cache leaderboard for 5 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        leaderboard,
        { ttl: 300 }
      );

      res.json({
        success: true,
        data: leaderboard,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get leaderboards error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboards',
        code: 'LEADERBOARDS_FETCH_FAILED'
      });
    }
  };

  /**
   * 🎖️ Get User Badges
   */
  getUserBadges = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { category } = req.query;

      const cacheKey = `user:${userId}:badges:${category || 'all'}`;
      const cachedBadges = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedBadges) {
        return res.json({
          success: true,
          data: cachedBadges,
          source: 'cache'
        });
      }

      const whereClause = { userId };
      const badgeWhereClause = {};
      
      if (category) {
        badgeWhereClause.category = category;
      }

      const userBadges = await UserBadge.findAll({
        where: whereClause,
        include: [{
          model: Badge,
          as: 'badge',
          where: badgeWhereClause
        }],
        order: [['awardedAt', 'DESC']]
      });

      const allBadges = await Badge.findAll({
        where: badgeWhereClause,
        order: [['rarity', 'ASC'], ['pointsRequired', 'ASC']]
      });

      // Combine with all available badges to show progress
      const badgesWithProgress = allBadges.map(badge => {
        const userBadge = userBadges.find(ub => ub.badgeId === badge.id);
        
        return {
          ...badge.toJSON(),
          awarded: !!userBadge,
          awardedAt: userBadge?.awardedAt,
          progress: this.calculateBadgeProgress(userId, badge)
        };
      });

      const result = {
        badges: badgesWithProgress,
        summary: {
          total: allBadges.length,
          awarded: userBadges.length,
          completionPercentage: allBadges.length > 0 ? 
            (userBadges.length / allBadges.length) * 100 : 0,
          byRarity: this.groupBadgesByRarity(badgesWithProgress)
        }
      };

      // 💾 Cache badges for 30 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 1800 }
      );

      res.json({
        success: true,
        data: result,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get user badges error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch badges',
        code: 'BADGES_FETCH_FAILED'
      });
    }
  };

  /**
   * 🎯 Get User Quests
   */
  getUserQuests = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { type = 'all', status = 'active' } = req.query;

      const cacheKey = `user:${userId}:quests:${type}:${status}`;
      const cachedQuests = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedQuests) {
        return res.json({
          success: true,
          data: cachedQuests,
          source: 'cache'
        });
      }

      const whereClause = {};
      if (type !== 'all') {
        whereClause.type = type;
      }

      const [quests, userQuests] = await Promise.all([
        // Get available quests
        Quest.findAll({
          where: whereClause,
          order: [['expiresAt', 'ASC']]
        }),
        // Get user's quest progress
        UserQuest.findAll({
          where: { userId },
          include: [{
            model: Quest,
            as: 'quest'
          }]
        })
      ]);

      // Combine quests with user progress
      const now = new Date();
      const questsWithProgress = quests.map(quest => {
        const userQuest = userQuests.find(uq => uq.questId === quest.id);
        const isExpired = quest.expiresAt && new Date(quest.expiresAt) < now;
        const isCompleted = userQuest?.completed || false;
        
        let questStatus = 'available';
        if (isCompleted) questStatus = 'completed';
        else if (userQuest) questStatus = 'in_progress';
        else if (isExpired) questStatus = 'expired';

        return {
          ...quest.toJSON(),
          status: questStatus,
          progress: userQuest?.progress || 0,
          completedAt: userQuest?.completedAt,
          startedAt: userQuest?.createdAt
        };
      });

      // Filter by status
      let filteredQuests = questsWithProgress;
      if (status !== 'all') {
        filteredQuests = questsWithProgress.filter(q => q.status === status);
      }

      const result = {
        quests: filteredQuests,
        summary: {
          total: questsWithProgress.length,
          available: questsWithProgress.filter(q => q.status === 'available').length,
          inProgress: questsWithProgress.filter(q => q.status === 'in_progress').length,
          completed: questsWithProgress.filter(q => q.status === 'completed').length,
          expired: questsWithProgress.filter(q => q.status === 'expired').length
        }
      };

      // 💾 Cache quests for 10 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 600 }
      );

      res.json({
        success: true,
        data: result,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get user quests error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quests',
        code: 'QUESTS_FETCH_FAILED'
      });
    }
  };

  /**
   * 📈 Get Points History
   */
  getPointsHistory = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { 
        action, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const cacheKey = `user:${userId}:points_history:${action}:${startDate}:${endDate}:${page}:${limit}`;
      const cachedHistory = await redisUtils.getWithFallback(
        await redisManager.getClient('cache'),
        cacheKey
      );

      if (cachedHistory) {
        return res.json({
          success: true,
          ...cachedHistory,
          source: 'cache'
        });
      }

      const whereClause = { userId };

      // Filter by action
      if (action) {
        whereClause.action = action;
      }

      // Filter by date range
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      const pointsHistory = await PointsHistory.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      const result = {
        history: pointsHistory.rows.map(record => this.sanitizePointsHistory(record)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: pointsHistory.count,
          pages: Math.ceil(pointsHistory.count / parseInt(limit))
        },
        summary: await this.calculatePointsSummary(userId, startDate, endDate)
      };

      // 💾 Cache history for 5 minutes
      await redisUtils.setWithRetry(
        await redisManager.getClient('cache'),
        cacheKey,
        result,
        { ttl: 300 }
      );

      res.json({
        success: true,
        ...result,
        source: 'database'
      });

    } catch (error) {
      YachiLogger.error('Get points history error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch points history',
        code: 'POINTS_HISTORY_FETCH_FAILED'
      });
    }
  };

  /**
   * 🛠️ Utility Methods
   */

  /**
   * Calculate user gamification profile
   */
  async calculateUserGamificationProfile(userId) {
    const [
      user,
      achievements,
      badges,
      pointsHistory,
      leaderboardPosition
    ] = await Promise.all([
      User.findByPk(userId, {
        attributes: ['id', 'name', 'points', 'totalPoints', 'level', 'lastActivityAt']
      }),
      UserAchievement.count({ where: { userId } }),
      UserBadge.count({ where: { userId } }),
      PointsHistory.findAll({
        where: { userId },
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPointsEarned'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalActions']
        ],
        raw: true
      }),
      this.getUserLeaderboardPosition(userId, 'weekly')
    ]);

    const pointsStats = pointsHistory[0] || { totalPointsEarned: 0, totalActions: 0 };

    return {
      user: {
        id: user.id,
        name: user.name,
        points: user.points,
        totalPoints: user.totalPoints,
        level: user.level,
        lastActivity: user.lastActivityAt
      },
      stats: {
        achievements: {
          unlocked: achievements,
          total: await Achievement.count(),
          completion: await Achievement.count() > 0 ? (achievements / await Achievement.count()) * 100 : 0
        },
        badges: {
          awarded: badges,
          total: await Badge.count(),
          completion: await Badge.count() > 0 ? (badges / await Badge.count()) * 100 : 0
        },
        points: {
          totalEarned: parseInt(pointsStats.totalPointsEarned) || 0,
          totalActions: parseInt(pointsStats.totalActions) || 0,
          averagePerAction: parseInt(pointsStats.totalActions) > 0 ? 
            parseInt(pointsStats.totalPointsEarned) / parseInt(pointsStats.totalActions) : 0
        }
      },
      leaderboard: {
        weeklyPosition: leaderboardPosition,
        totalUsers: await User.count()
      },
      nextLevel: await this.calculateNextLevelRequirements(user.level, user.points)
    };
  }

  /**
   * Validate point award
   */
  validatePointAward(data) {
    const errors = [];

    if (!data.userId) {
      errors.push('User ID is required');
    }

    if (!data.action) {
      errors.push('Action is required');
    }

    if (data.amount && data.amount < 0) {
      errors.push('Point amount cannot be negative');
    }

    // Check if action is valid
    if (data.action && !this.pointValues[data.action] && !data.amount) {
      errors.push('Invalid action or amount required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for level up
   */
  async checkLevelUp(userId, newPoints, transaction) {
    const user = await User.findByPk(userId, { transaction });
    const currentLevel = user.level || 1;
    
    const nextLevel = currentLevel + 1;
    const pointsRequired = this.calculatePointsForLevel(nextLevel);

    if (newPoints >= pointsRequired) {
      // Level up!
      await User.update({
        level: nextLevel,
        levelUpAt: new Date()
      }, {
        where: { id: userId },
        transaction
      });

      // 📊 Track level up analytics
      await YachiAnalytics.trackEvent('level_up', {
        userId,
        oldLevel: currentLevel,
        newLevel: nextLevel,
        points: newPoints
      });

      return {
        leveledUp: true,
        oldLevel: currentLevel,
        newLevel: nextLevel
      };
    }

    return { leveledUp: false };
  }

  /**
   * Check achievement unlocks
   */
  async checkAchievementUnlocks(userId, action, transaction) {
    const unlocked = [];

    // Get achievements that can be unlocked by this action
    const relevantAchievements = await Achievement.findAll({
      where: {
        triggerAction: action,
        isActive: true
      },
      transaction
    });

    for (const achievement of relevantAchievements) {
      const shouldUnlock = await this.shouldUnlockAchievement(userId, achievement, transaction);
      
      if (shouldUnlock) {
        // Unlock achievement
        await UserAchievement.create({
          userId,
          achievementId: achievement.id,
          unlockedAt: new Date(),
          progress: 100,
          completed: true
        }, { transaction });

        unlocked.push(achievement);

        // 📊 Track achievement unlock analytics
        await YachiAnalytics.trackEvent('achievement_unlocked', {
          userId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          points: achievement.pointsReward
        });
      }
    }

    return { unlocked };
  }

  /**
   * Check badge awards
   */
  async checkBadgeAwards(userId, action, transaction) {
    const awarded = [];

    // Get badges that can be awarded by this action
    const relevantBadges = await Badge.findAll({
      where: {
        triggerAction: action,
        isActive: true
      },
      transaction
    });

    for (const badge of relevantBadges) {
      const shouldAward = await this.shouldAwardBadge(userId, badge, transaction);
      
      if (shouldAward) {
        // Award badge
        await UserBadge.create({
          userId,
          badgeId: badge.id,
          awardedAt: new Date()
        }, { transaction });

        awarded.push(badge);

        // 📊 Track badge award analytics
        await YachiAnalytics.trackEvent('badge_awarded', {
          userId,
          badgeId: badge.id,
          badgeName: badge.name,
          rarity: badge.rarity
        });
      }
    }

    return { awarded };
  }

  /**
   * Check quest progress
   */
  async checkQuestProgress(userId, action, transaction) {
    const updated = [];

    // Get active quests for user
    const userQuests = await UserQuest.findAll({
      where: {
        userId,
        completed: false
      },
      include: [{
        model: Quest,
        as: 'quest',
        where: {
          isActive: true,
          expiresAt: { [Op.gt]: new Date() }
        }
      }],
      transaction
    });

    for (const userQuest of userQuests) {
      const quest = userQuest.quest;
      
      if (quest.triggerAction === action) {
        const newProgress = userQuest.progress + 1;
        const isCompleted = newProgress >= quest.targetCount;

        await UserQuest.update({
          progress: newProgress,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null
        }, {
          where: { id: userQuest.id },
          transaction
        });

        updated.push({
          questId: quest.id,
          questName: quest.name,
          progress: newProgress,
          completed: isCompleted
        });

        if (isCompleted) {
          // Award quest rewards
          await this.awardQuestRewards(userId, quest, transaction);
        }
      }
    }

    return { updated };
  }

  /**
   * Calculate leaderboard
   */
  async calculateLeaderboard(type, limit, currentUserId = null) {
    const now = new Date();
    let startDate;

    switch (type) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'alltime':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get top users by points earned in the period
    const topUsers = await User.findAll({
      attributes: [
        'id', 'name', 'avatar', 'points', 'level', 
        [Sequelize.literal('(SELECT COUNT(*) FROM user_achievements WHERE user_achievements.userId = User.id)'), 'achievementsCount'],
        [Sequelize.literal('(SELECT COUNT(*) FROM user_badges WHERE user_badges.userId = User.id)'), 'badgesCount']
      ],
      order: [['points', 'DESC']],
      limit: limit
    });

    let currentUserPosition = null;
    if (currentUserId) {
      const currentUser = await User.findByPk(currentUserId);
      if (currentUser) {
        const usersWithMorePoints = await User.count({
          where: {
            points: { [Op.gt]: currentUser.points }
          }
        });
        currentUserPosition = usersWithMorePoints + 1;
      }
    }

    return {
      type,
      period: {
        start: startDate,
        end: now
      },
      leaders: topUsers.map((user, index) => ({
        rank: index + 1,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          points: user.points,
          level: user.level,
          achievementsCount: user.get('achievementsCount'),
          badgesCount: user.get('badgesCount')
        }
      })),
      currentUserPosition,
      totalUsers: await User.count()
    };
  }

  /**
   * Calculate points for level
   */
  calculatePointsForLevel(level) {
    // Exponential level progression
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  /**
   * Calculate next level requirements
   */
  async calculateNextLevelRequirements(currentLevel, currentPoints) {
    const nextLevel = currentLevel + 1;
    const pointsRequired = this.calculatePointsForLevel(nextLevel);
    const pointsNeeded = pointsRequired - currentPoints;

    return {
      nextLevel,
      pointsRequired,
      pointsNeeded,
      progress: (currentPoints / pointsRequired) * 100
    };
  }

  /**
   * Reset daily quests
   */
  async resetDailyQuests() {
    try {
      YachiLogger.info('Resetting daily quests...');
      
      // Archive completed daily quests
      await UserQuest.update({
        status: 'archived'
      }, {
        where: {
          completed: true,
          questId: {
            [Op.in]: Sequelize.literal(`(SELECT id FROM quests WHERE type = 'daily')`)
          }
        }
      });

      YachiLogger.info('Daily quests reset completed');
    } catch (error) {
      YachiLogger.error('Daily quests reset error:', error);
    }
  }

  /**
   * Reset weekly leaderboards
   */
  async resetWeeklyLeaderboards() {
    try {
      YachiLogger.info('Resetting weekly leaderboards...');
      
      // Archive current weekly leaderboard
      await Leaderboard.create({
        type: 'weekly',
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
        periodEnd: new Date(),
        data: await this.calculateLeaderboard('weekly', 100),
        metadata: {
          resetAt: new Date().toISOString()
        }
      });

      YachiLogger.info('Weekly leaderboards reset completed');
    } catch (error) {
      YachiLogger.error('Weekly leaderboards reset error:', error);
    }
  }

  /**
   * Reset monthly achievements
   */
  async resetMonthlyAchievements() {
    try {
      YachiLogger.info('Resetting monthly achievements...');
      
      // Reset monthly progress for achievements
      await UserAchievement.update({
        progress: 0,
        completed: false
      }, {
        where: {
          achievementId: {
            [Op.in]: Sequelize.literal(`(SELECT id FROM achievements WHERE resetPeriod = 'monthly')`)
          }
        }
      });

      YachiLogger.info('Monthly achievements reset completed');
    } catch (error) {
      YachiLogger.error('Monthly achievements reset error:', error);
    }
  }

  /**
   * Clear user gamification cache
   */
  async clearUserGamificationCache(userId) {
    const patterns = [
      `user:${userId}:gamification:*`,
      `user:${userId}:achievements:*`,
      `user:${userId}:badges:*`,
      `user:${userId}:quests:*`,
      `user:${userId}:points_history:*`,
      'leaderboard:*'
    ];

    for (const pattern of patterns) {
      await redisUtils.deletePattern(
        await redisManager.getClient('cache'),
        pattern
      );
    }
  }

  /**
   * Sanitize points history
   */
  sanitizePointsHistory(history) {
    const sanitized = { ...history.toJSON ? history.toJSON() : history };
    return sanitized;
  }

  // Additional helper methods would be implemented here...
  async shouldUnlockAchievement(userId, achievement, transaction) { return false; }
  async shouldAwardBadge(userId, badge, transaction) { return false; }
  async awardQuestRewards(userId, quest, transaction) { }
  async getUserLeaderboardPosition(userId, type) { return null; }
  calculateBadgeProgress(userId, badge) { return 0; }
  groupBadgesByRarity(badges) { return {}; }
  async calculatePointsSummary(userId, startDate, endDate) { return {}; }
}

// 🚀 Create and export controller instance
const gamificationController = new GamificationController();

module.exports = gamificationController;