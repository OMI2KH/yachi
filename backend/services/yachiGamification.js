const { CacheService } = require('./cacheService');
const { YachiAnalytics } = require('./yachiAnalytics');
const { RealTimeService } = require('./realTimeService');

class YachiGamification {
  static achievements = new Map();
  static levels = new Map();
  static leaderboards = new Map();
  static activeQuests = new Map();

  // 🚀 INITIALIZATION
  static async initialize() {
    await this.loadAchievements();
    await this.loadLevels();
    await this.loadQuests();
    
    console.log('✅ Yachi Gamification Engine initialized');
    console.log(`🎯 Loaded: ${this.achievements.size} achievements, ${this.levels.size} levels, ${this.activeQuests.size} quests`);
  }

  // 🎯 ACHIEVEMENT SYSTEM
  static async loadAchievements() {
    // Define all achievements
    const achievementDefinitions = [
      // 🏆 WELCOME & ONBOARDING
      {
        id: 'welcome_hero',
        name: 'Welcome Hero',
        description: 'Join the Yachi platform',
        points: 100,
        category: 'onboarding',
        icon: '🎉',
        rarity: 'common'
      },
      {
        id: 'profile_completion',
        name: 'Profile Perfectionist',
        description: 'Complete 100% of your profile',
        points: 150,
        category: 'onboarding',
        icon: '📝',
        rarity: 'uncommon'
      },
      {
        id: 'verification_master',
        name: 'Verified Pro',
        description: 'Complete all verification steps',
        points: 200,
        category: 'onboarding',
        icon: '✅',
        rarity: 'rare'
      },

      // 💼 SERVICE ACHIEVEMENTS
      {
        id: 'first_service',
        name: 'Service Starter',
        description: 'Create your first service',
        points: 50,
        category: 'services',
        icon: '🛠️',
        rarity: 'common'
      },
      {
        id: 'service_expert',
        name: 'Service Expert',
        description: 'Create 10 services',
        points: 300,
        category: 'services',
        icon: '🌟',
        rarity: 'uncommon'
      },
      {
        id: 'service_master',
        name: 'Service Master',
        description: 'Create 50 services',
        points: 1000,
        category: 'services',
        icon: '🏆',
        rarity: 'epic'
      },

      // ⭐ REVIEW ACHIEVEMENTS
      {
        id: 'first_review',
        name: 'First Impression',
        description: 'Receive your first 5-star review',
        points: 100,
        category: 'reviews',
        icon: '⭐',
        rarity: 'common'
      },
      {
        id: 'rating_champion',
        name: 'Rating Champion',
        description: 'Maintain 4.8+ rating for 30 days',
        points: 500,
        category: 'reviews',
        icon: '💎',
        rarity: 'rare'
      },

      // 💰 EARNING ACHIEVEMENTS
      {
        id: 'first_earning',
        name: 'First Payment',
        description: 'Earn your first 1000',
        points: 150,
        category: 'earnings',
        icon: '💰',
        rarity: 'common'
      },
      {
        id: 'earning_pro',
        name: 'Earning Pro',
        description: 'Earn 10,000 total',
        points: 750,
        category: 'earnings',
        icon: '💸',
        rarity: 'uncommon'
      },

      // 📢 ADVERTISEMENT ACHIEVEMENTS
      {
        id: 'first_ad',
        name: 'Marketing Starter',
        description: 'Create your first advertisement',
        points: 75,
        category: 'advertising',
        icon: '📢',
        rarity: 'common'
      },
      {
        id: 'ad_expert',
        name: 'Ad Expert',
        description: 'Spend 5000 on advertisements',
        points: 400,
        category: 'advertising',
        icon: '🎯',
        rarity: 'uncommon'
      },
      {
        id: 'ad_master',
        name: 'Ad Master',
        description: 'Achieve 1000 ad conversions',
        points: 1200,
        category: 'advertising',
        icon: '🚀',
        rarity: 'epic'
      },

      // 🎪 SOCIAL ACHIEVEMENTS
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Message 50 different users',
        points: 250,
        category: 'social',
        icon: '🦋',
        rarity: 'uncommon'
      },
      {
        id: 'community_leader',
        name: 'Community Leader',
        description: 'Receive 100 positive reviews',
        points: 800,
        category: 'social',
        icon: '👑',
        rarity: 'rare'
      },

      // ⚡ STREAK ACHIEVEMENTS
      {
        id: 'weekly_streak',
        name: 'Weekly Warrior',
        description: '7-day activity streak',
        points: 200,
        category: 'streaks',
        icon: '🔥',
        rarity: 'common'
      },
      {
        id: 'monthly_streak',
        name: 'Monthly Master',
        description: '30-day activity streak',
        points: 600,
        category: 'streaks',
        icon: '⚡',
        rarity: 'rare'
      }
    ];

    achievementDefinitions.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  // 🎯 LEVEL SYSTEM
  static async loadLevels() {
    const levelDefinitions = [
      { level: 1, name: 'Beginner', pointsRequired: 0, rewards: { badge: '🥉' } },
      { level: 2, name: 'Active Member', pointsRequired: 500, rewards: { badge: '🥈' } },
      { level: 3, name: 'Trusted Pro', pointsRequired: 1500, rewards: { badge: '🥇' } },
      { level: 4, name: 'Expert Provider', pointsRequired: 3500, rewards: { badge: '💎' } },
      { level: 5, name: 'Elite Master', pointsRequired: 7500, rewards: { badge: '👑' } },
      { level: 6, name: 'Legend', pointsRequired: 15000, rewards: { badge: '🌟' } },
      { level: 7, name: 'Yachi Champion', pointsRequired: 30000, rewards: { badge: '🏆' } }
    ];

    levelDefinitions.forEach(level => {
      this.levels.set(level.level, level);
    });
  }

  // 🎯 QUEST SYSTEM
  static async loadQuests() {
    const questDefinitions = [
      {
        id: 'weekly_service_quest',
        name: 'Weekly Service Challenge',
        description: 'Complete 5 services this week',
        type: 'weekly',
        reward: { points: 300, badge: '⚡' },
        requirements: { completedServices: 5 },
        expiresAt: this.getNextWeekEnd()
      },
      {
        id: 'rating_quest',
        name: 'Quality Excellence',
        description: 'Maintain 5-star rating for 10 consecutive services',
        type: 'progressive',
        reward: { points: 500, badge: '💎' },
        requirements: { consecutiveFiveStars: 10 }
      },
      {
        id: 'new_client_quest',
        name: 'Client Magnet',
        description: 'Serve 10 new clients this month',
        type: 'monthly',
        reward: { points: 400, badge: '🧲' },
        requirements: { newClients: 10 },
        expiresAt: this.getNextMonthEnd()
      }
    ];

    questDefinitions.forEach(quest => {
      this.activeQuests.set(quest.id, quest);
    });
  }

  // 🚀 POINTS AWARDING SYSTEM
  static async awardWelcomePoints(userId) {
    return await this.awardPoints(userId, 100, 'welcome_bonus', 'Welcome to Yachi!');
  }

  static async awardServiceCreation(userId) {
    return await this.awardPoints(userId, 50, 'service_creation', 'Created a new service');
  }

  static async awardServiceCompletion(userId, serviceData) {
    const basePoints = 25;
    const ratingBonus = serviceData.rating === 5 ? 50 : 0;
    const durationBonus = serviceData.completedQuickly ? 25 : 0;
    
    const totalPoints = basePoints + ratingBonus + durationBonus;
    
    return await this.awardPoints(userId, totalPoints, 'service_completion', 
      `Completed service: ${serviceData.title}`);
  }

  static async awardVerification(userId, verificationType) {
    const pointsMap = {
      'fayda_id': 100,
      'selfie': 75,
      'document': 50
    };
    
    const points = pointsMap[verificationType] || 50;
    return await this.awardPoints(userId, points, 'verification', 
      `Completed ${verificationType} verification`);
  }

  static async awardAdvertisementPoints(userId, budget) {
    const points = Math.floor(budget / 10); // 1 point per 10 currency units
    return await this.awardPoints(userId, points, 'advertisement_creation', 
      `Created advertisement with budget ${budget}`);
  }

  static async awardSelfieVerification(userId) {
    return await this.awardPoints(userId, 25, 'selfie_verification', 'Selfie verification completed');
  }

  static async awardDocumentUpload(userId, documentCount) {
    const points = documentCount * 10;
    return await this.awardPoints(userId, points, 'document_upload', 
      `Uploaded ${documentCount} documents`);
  }

  static async awardPortfolioUpload(userId, itemCount) {
    const points = itemCount * 15;
    return await this.awardPoints(userId, points, 'portfolio_upload', 
      `Uploaded ${itemCount} portfolio items`);
  }

  static async awardSkillUpdate(userId, skillCount) {
    const points = skillCount * 5;
    return await this.awardPoints(userId, points, 'skills_update', 
      `Updated ${skillCount} skills`);
  }

  static async awardScheduleOptimization(userId) {
    return await this.awardPoints(userId, 30, 'schedule_optimization', 'Optimized availability schedule');
  }

  static async awardLevelUp(userId, newLevel) {
    const levelBonus = newLevel * 100;
    return await this.awardPoints(userId, levelBonus, 'level_up', 
      `Reached level ${newLevel}`);
  }

  static async awardAdEngagement(userId, engagementType) {
    const pointsMap = {
      'click': 5,
      'conversion': 25,
      'share': 10
    };
    
    const points = pointsMap[engagementType] || 5;
    return await this.awardPoints(userId, points, 'ad_engagement', 
      `Engaged with advertisement (${engagementType})`);
  }

  // 🎯 CORE POINTS MANAGEMENT
  static async awardPoints(userId, points, reason, description) {
    try {
      // Update user's points in database
      await this.updateUserPoints(userId, points);
      
      // Log the transaction
      await this.logPointsTransaction(userId, points, reason, description);
      
      // Check for achievements
      await this.checkForAchievements(userId, reason, points);
      
      // Check for level up
      const leveledUp = await this.checkForLevelUp(userId);
      
      // Check for quest progress
      await this.updateQuestProgress(userId, reason);
      
      // Real-time notification
      RealTimeService.emitToUser(userId, 'pointsEarned', {
        points,
        reason,
        description,
        totalPoints: await this.getUserPoints(userId),
        leveledUp
      });

      // Analytics tracking
      YachiAnalytics.trackPointsEarned(userId, {
        points,
        source: reason,
        activity: description
      });

      console.log(`🎯 Awarded ${points} points to user ${userId} for: ${reason}`);
      
      return { success: true, points, leveledUp };

    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, error: error.message };
    }
  }

  static async logPointsTransaction(userId, points, reason, description) {
    const transaction = {
      userId,
      points,
      reason,
      description,
      timestamp: new Date().toISOString(),
      transactionId: `pts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Store in database
    await this.storePointsTransaction(transaction);
    
    // Cache recent transactions
    await CacheService.set(
      `points_transaction:${transaction.transactionId}`, 
      transaction, 
      3600 // 1 hour cache
    );

    return transaction;
  }

  // 🏆 ACHIEVEMENT MANAGEMENT
  static async checkForAchievements(userId, activityType, pointsEarned) {
    const userAchievements = await this.getUserAchievements(userId);
    const userStats = await this.getUserStats(userId);
    
    for (const [achievementId, achievement] of this.achievements) {
      // Skip if user already has this achievement
      if (userAchievements.includes(achievementId)) continue;
      
      // Check if achievement conditions are met
      if (await this.checkAchievementConditions(achievement, userStats, activityType)) {
        await this.unlockAchievement(userId, achievement);
      }
    }
  }

  static async unlockAchievement(userId, achievement) {
    // Add achievement to user's profile
    await this.addUserAchievement(userId, achievement.id);
    
    // Award achievement points
    await this.awardPoints(userId, achievement.points, 'achievement_unlock', 
      `Unlocked achievement: ${achievement.name}`);
    
    // Real-time notification
    RealTimeService.emitToUser(userId, 'achievementUnlocked', {
      achievementId: achievement.id,
      achievementName: achievement.name,
      points: achievement.points,
      description: achievement.description,
      icon: achievement.icon,
      rarity: achievement.rarity
    });

    // Analytics tracking
    YachiAnalytics.trackAchievementUnlock(userId, {
      achievementId: achievement.id,
      achievementName: achievement.name,
      points: achievement.points,
      category: achievement.category
    });

    console.log(`🏆 User ${userId} unlocked achievement: ${achievement.name}`);
  }

  // 📈 LEVEL MANAGEMENT
  static async checkForLevelUp(userId) {
    const userPoints = await this.getUserPoints(userId);
    const currentLevel = await this.getUserLevel(userId);
    
    for (const [level, levelData] of this.levels) {
      if (level > currentLevel && userPoints >= levelData.pointsRequired) {
        await this.levelUpUser(userId, level, levelData);
        return true;
      }
    }
    
    return false;
  }

  static async levelUpUser(userId, newLevel, levelData) {
    // Update user's level
    await this.updateUserLevel(userId, newLevel);
    
    // Award level up points
    await this.awardPoints(userId, newLevel * 50, 'level_up_bonus', 
      `Reached level ${newLevel}: ${levelData.name}`);
    
    // Real-time notification
    RealTimeService.emitToUser(userId, 'levelUp', {
      level: newLevel,
      levelName: levelData.name,
      rewards: levelData.rewards,
      pointsRequired: levelData.pointsRequired
    });

    console.log(`📈 User ${userId} leveled up to ${newLevel}: ${levelData.name}`);
  }

  // 🎯 QUEST MANAGEMENT
  static async updateQuestProgress(userId, activityType) {
    for (const [questId, quest] of this.activeQuests) {
      if (await this.isQuestActive(quest)) {
        const progress = await this.getQuestProgress(userId, questId);
        const updatedProgress = await this.updateQuestProgressForActivity(progress, activityType, quest);
        
        if (await this.isQuestComplete(updatedProgress, quest)) {
          await this.completeQuest(userId, quest, updatedProgress);
        }
      }
    }
  }

  static async completeQuest(userId, quest, progress) {
    // Award quest rewards
    await this.awardPoints(userId, quest.reward.points, 'quest_completion', 
      `Completed quest: ${quest.name}`);
    
    // Mark quest as completed
    await this.markQuestCompleted(userId, quest.id);
    
    // Real-time notification
    RealTimeService.emitToUser(userId, 'questCompleted', {
      questId: quest.id,
      questName: quest.name,
      reward: quest.reward,
      progress
    });

    console.log(`🎯 User ${userId} completed quest: ${quest.name}`);
  }

  // 🏆 LEADERBOARD SYSTEM
  static async updateLeaderboard(userId, category = 'overall') {
    const userPoints = await this.getUserPoints(userId);
    const key = `leaderboard:${category}`;
    
    await CacheService.zAdd(key, { score: userPoints, value: userId.toString() });
    
    // Keep only top 1000 users in leaderboard
    await CacheService.zRemRangeByRank(key, 0, -1001);
  }

  static async getLeaderboard(category = 'overall', limit = 100) {
    const key = `leaderboard:${category}`;
    const leaderboard = await CacheService.zRangeWithScores(key, 0, limit - 1, { REV: true });
    
    return leaderboard.map(async (entry, index) => ({
      rank: index + 1,
      userId: entry.value,
      points: entry.score,
      userData: await this.getUserBasicInfo(entry.value)
    }));
  }

  // 📊 USER PROFILE & STATS
  static async getWorkerGamificationProfile(workerId) {
    const points = await this.getUserPoints(workerId);
    const level = await this.getUserLevel(workerId);
    const achievements = await this.getUserAchievements(workerId);
    const recentTransactions = await this.getRecentTransactions(workerId, 10);
    const leaderboardRank = await this.getUserLeaderboardRank(workerId);
    const activeQuests = await this.getUserActiveQuests(workerId);

    return {
      points,
      level,
      levelData: this.levels.get(level),
      achievements: achievements.map(id => this.achievements.get(id)),
      recentTransactions,
      leaderboardRank,
      activeQuests,
      nextLevel: this.levels.get(level + 1),
      pointsToNextLevel: this.levels.get(level + 1) ? 
        this.levels.get(level + 1).pointsRequired - points : null
    };
  }

  static async getUserLeaderboardRank(userId, category = 'overall') {
    const key = `leaderboard:${category}`;
    return await CacheService.zRevRank(key, userId.toString());
  }

  // 🛠️ UTILITY METHODS
  static getNextWeekEnd() {
    const date = new Date();
    date.setDate(date.getDate() + (7 - date.getDay()));
    date.setHours(23, 59, 59, 999);
    return date;
  }

  static getNextMonthEnd() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // 📈 STATUS & MONITORING
  static getStatus() {
    return {
      achievementsCount: this.achievements.size,
      levelsCount: this.levels.size,
      activeQuestsCount: this.activeQuests.size,
      timestamp: new Date().toISOString()
    };
  }

  // 🎯 PLACEHOLDER METHODS FOR DATABASE OPERATIONS
  static async updateUserPoints(userId, points) {
    // Implementation would update user points in database
    const key = `user_points:${userId}`;
    const currentPoints = await CacheService.get(key) || 0;
    await CacheService.set(key, parseInt(currentPoints) + points, 86400); // 24 hours
  }

  static async getUserPoints(userId) {
    const key = `user_points:${userId}`;
    return await CacheService.get(key) || 0;
  }

  static async getUserLevel(userId) {
    const key = `user_level:${userId}`;
    return await CacheService.get(key) || 1;
  }

  static async updateUserLevel(userId, level) {
    const key = `user_level:${userId}`;
    await CacheService.set(key, level, 86400); // 24 hours
  }

  static async getUserAchievements(userId) {
    const key = `user_achievements:${userId}`;
    return await CacheService.get(key) || [];
  }

  static async addUserAchievement(userId, achievementId) {
    const key = `user_achievements:${userId}`;
    const achievements = await this.getUserAchievements(userId);
    achievements.push(achievementId);
    await CacheService.set(key, achievements, 86400); // 24 hours
  }

  static async getUserStats(userId) {
    // Implementation would fetch user statistics from database
    return {
      completedServices: 0,
      totalEarnings: 0,
      averageRating: 0,
      verificationStatus: {}
    };
  }

  static async storePointsTransaction(transaction) {
    // Implementation would store in database
    const key = `points_log:${transaction.userId}:${transaction.transactionId}`;
    await CacheService.set(key, transaction, 604800); // 7 days
  }

  static async getRecentTransactions(userId, limit = 10) {
    // Implementation would fetch from database
    return [];
  }

  static async getUserBasicInfo(userId) {
    // Implementation would fetch from database
    return { id: userId, name: `User ${userId}` };
  }

  static async checkAchievementConditions(achievement, userStats, activityType) {
    // Implementation would check specific conditions
    return false;
  }

  static async getQuestProgress(userId, questId) {
    return {};
  }

  static async updateQuestProgressForActivity(progress, activityType, quest) {
    return progress;
  }

  static async isQuestComplete(progress, quest) {
    return false;
  }

  static async markQuestCompleted(userId, questId) {
    // Implementation would mark quest as completed
  }

  static async isQuestActive(quest) {
    return !quest.expiresAt || new Date() < new Date(quest.expiresAt);
  }

  static async getUserActiveQuests(userId) {
    return Array.from(this.activeQuests.values());
  }
}

module.exports = { YachiGamification };