const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyToken, authorizeRoles } = require('../utils/authHelpers');
const { z } = require('zod');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiNotifications } = require('../services/yachiNotifications');
const { MediaService } = require('../services/mediaService');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const ProfileSchema = {
  update: z.object({
    profile: z.object({
      displayName: z.string().min(2).max(50).optional(),
      bio: z.string().max(500).optional(),
      location: z.object({
        address: z.string().optional(),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number()
        }).optional(),
        timezone: z.string().optional()
      }).optional(),
      socialLinks: z.object({
        website: z.string().url().optional(),
        twitter: z.string().url().optional(),
        linkedin: z.string().url().optional(),
        instagram: z.string().url().optional()
      }).optional(),
      skills: z.array(z.string()).max(20).optional(),
      languages: z.array(z.string()).max(10).optional(),
      availability: z.enum(['available', 'busy', 'away', 'unavailable']).optional()
    }).optional(),

    preferences: z.object({
      notifications: z.object({
        email: z.boolean().default(true),
        push: z.boolean().default(true),
        sms: z.boolean().default(false)
      }).optional(),
      privacy: z.object({
        profileVisibility: z.enum(['public', 'providers', 'connections', 'private']).default('public'),
        showOnlineStatus: z.boolean().default(true),
        showLastSeen: z.boolean().default(true),
        allowMessages: z.enum(['everyone', 'providers', 'connections', 'none']).default('everyone')
      }).optional(),
      communication: z.object({
        preferredMethod: z.enum(['chat', 'phone', 'video']).default('chat'),
        language: z.string().default('en'),
        workingHours: z.object({
          start: z.string(),
          end: z.string(),
          timezone: z.string()
        }).optional()
      }).optional()
    }).optional(),

    verification: z.object({
      documentType: z.enum(['id_card', 'passport', 'driving_license']).optional(),
      documentNumber: z.string().optional(),
      documentImages: z.array(z.string().url()).optional()
    }).optional()
  }),

  avatar: z.object({
    imageUrl: z.string().url(),
    cropData: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional()
  }),

  search: z.object({
    query: z.string().min(1).max(100).optional(),
    role: z.enum(['client', 'provider', 'graduate']).optional(),
    skills: z.array(z.string()).optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().default(50) // km
    }).optional(),
    minRating: z.number().min(1).max(5).optional(),
    verifiedOnly: z.boolean().default(false),
    premiumOnly: z.boolean().default(false),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `profile:user:${userId}`,
  USER_STATS: (userId) => `profile:stats:${userId}`,
  USER_REPUTATION: (userId) => `profile:reputation:${userId}`,
  USER_SEARCH: (params) => `profile:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`
};

// 🚀 GET COMPREHENSIVE USER PROFILE
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { include = 'basic' } = req.query;

    const cacheKey = CACHE_KEYS.USER_PROFILE(req.user.userId) + `:${include}`;
    const cachedProfile = await redis.get(cacheKey);

    if (cachedProfile) {
      return res.json({
        success: true,
        ...JSON.parse(cachedProfile),
        source: 'cache'
      });
    }

    const profile = await buildUserProfile(req.user.userId, include);

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(profile));

    res.json({
      success: true,
      ...profile,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      code: 'FETCH_PROFILE_FAILED'
    });
  }
});

// 🚀 UPDATE COMPREHENSIVE USER PROFILE
router.put('/me', verifyToken, async (req, res) => {
  try {
    const validatedData = ProfileSchema.update.parse(req.body);

    // 💼 Start transaction
    const transaction = await prisma.$transaction(async (prisma) => {
      // 📝 Update user profile
      if (validatedData.profile) {
        await prisma.userProfile.upsert({
          where: { userId: req.user.userId },
          update: validatedData.profile,
          create: {
            userId: req.user.userId,
            ...validatedData.profile
          }
        });
      }

      // ⚙️ Update user preferences
      if (validatedData.preferences) {
        await prisma.userPreferences.upsert({
          where: { userId: req.user.userId },
          update: validatedData.preferences,
          create: {
            userId: req.user.userId,
            ...validatedData.preferences
          }
        });
      }

      // 🏷️ Handle verification submission
      if (validatedData.verification) {
        await handleVerificationSubmission(req.user.userId, validatedData.verification, prisma);
      }

      return await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          profile: true,
          preferences: true
        }
      });
    });

    // 🎪 Award profile completion points
    await YachiGamification.awardProfileCompletion(req.user.userId);

    // 🗑️ Clear profile cache
    await redis.del(CACHE_KEYS.USER_PROFILE(req.user.userId));

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: await buildUserProfile(req.user.userId, 'full')
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_FAILED'
    });
  }
});

// 🚀 UPDATE USER AVATAR
router.put('/me/avatar', verifyToken, async (req, res) => {
  try {
    const validatedData = ProfileSchema.avatar.parse(req.body);

    // 🖼️ Process and optimize avatar
    const processedAvatar = await MediaService.processUserAvatar(
      validatedData.imageUrl,
      req.user.userId,
      validatedData.cropData
    );

    // 💼 Update avatar in transaction
    await prisma.$transaction(async (prisma) => {
      await prisma.userProfile.upsert({
        where: { userId: req.user.userId },
        update: { avatar: processedAvatar.url },
        create: {
          userId: req.user.userId,
          avatar: processedAvatar.url
        }
      });

      // 🎪 Award avatar upload points
      await YachiGamification.awardAvatarUpload(req.user.userId);
    });

    // 🗑️ Clear profile cache
    await redis.del(CACHE_KEYS.USER_PROFILE(req.user.userId));

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: processedAvatar.url,
        optimized: processedAvatar.optimized
      },
      gamification: {
        pointsAwarded: 10,
        achievement: 'Profile Picture'
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

    console.error('Update Avatar Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update avatar',
      code: 'UPDATE_AVATAR_FAILED'
    });
  }
});

// 🚀 GET USER PUBLIC PROFILE
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { viewerId } = req.query; // Optional viewer ID for personalized data

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    const cacheKey = CACHE_KEYS.USER_PROFILE(userId) + ':public';
    const cachedProfile = await redis.get(cacheKey);

    if (cachedProfile) {
      return res.json({
        success: true,
        ...JSON.parse(cachedProfile),
        source: 'cache'
      });
    }

    // 🛡️ Check if user can view this profile
    const canView = await canUserViewProfile(viewerId ? parseInt(viewerId) : null, userId);
    if (!canView.allowed) {
      return res.status(403).json({
        success: false,
        message: canView.reason,
        code: 'PROFILE_ACCESS_DENIED'
      });
    }

    const profile = await buildPublicProfile(userId, viewerId);

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(profile));

    res.json({
      success: true,
      ...profile,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Public Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      code: 'FETCH_USER_PROFILE_FAILED'
    });
  }
});

// 🚀 SEARCH USERS WITH ADVANCED FILTERING
router.get('/search/users', verifyToken, async (req, res) => {
  try {
    const validatedParams = ProfileSchema.search.parse(req.query);

    const cacheKey = CACHE_KEYS.USER_SEARCH(validatedParams);
    const cachedResults = await redis.get(cacheKey);

    if (cachedResults) {
      return res.json({
        success: true,
        ...JSON.parse(cachedResults),
        source: 'cache'
      });
    }

    const searchResults = await searchUsers(validatedParams);

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(searchResults));

    res.json({
      success: true,
      ...searchResults,
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

    console.error('User Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      code: 'USER_SEARCH_FAILED'
    });
  }
});

// 🚀 GET USER STATISTICS
router.get('/:id/stats', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // 🛡️ Check authorization
    if (userId !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these statistics',
        code: 'STATS_ACCESS_DENIED'
      });
    }

    const cacheKey = CACHE_KEYS.USER_STATS(userId);
    const cachedStats = await redis.get(cacheKey);

    if (cachedStats) {
      return res.json({
        success: true,
        data: JSON.parse(cachedStats),
        source: 'cache'
      });
    }

    const stats = await buildUserStatistics(userId);

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(stats));

    res.json({
      success: true,
      data: stats,
      source: 'database'
    });

  } catch (error) {
    console.error('Get User Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      code: 'FETCH_STATS_FAILED'
    });
  }
});

// 🚀 GET USER REPUTATION SCORE
router.get('/:id/reputation', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const cacheKey = CACHE_KEYS.USER_REPUTATION(userId);
    const cachedReputation = await redis.get(cacheKey);

    if (cachedReputation) {
      return res.json({
        success: true,
        data: JSON.parse(cachedReputation),
        source: 'cache'
      });
    }

    const reputation = await calculateUserReputation(userId);

    // 💾 Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(reputation));

    res.json({
      success: true,
      data: reputation,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Reputation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate reputation',
      code: 'CALCULATE_REPUTATION_FAILED'
    });
  }
});

// 🚀 FOLLOW/UNFOLLOW USER
router.post('/:id/follow', verifyToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);

    if (targetUserId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself',
        code: 'SELF_FOLLOW_NOT_ALLOWED'
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.userId,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      // ❌ Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: req.user.userId,
            followingId: targetUserId
          }
        }
      });

      res.json({
        success: true,
        message: 'Unfollowed user successfully',
        data: { following: false }
      });
    } else {
      // ✅ Follow
      await prisma.follow.create({
        data: {
          followerId: req.user.userId,
          followingId: targetUserId
        }
      });

      // 📧 Send follow notification
      await YachiNotifications.sendFollowNotification(targetUserId, req.user.userId);

      // 🎪 Award social points
      await YachiGamification.awardSocialAction(req.user.userId, 'follow');

      res.json({
        success: true,
        message: 'Followed user successfully',
        data: { following: true },
        gamification: {
          pointsAwarded: 5,
          achievement: 'Social Butterfly'
        }
      });
    }

    // 🗑️ Clear relevant caches
    await redis.del(CACHE_KEYS.USER_STATS(req.user.userId));
    await redis.del(CACHE_KEYS.USER_STATS(targetUserId));

  } catch (error) {
    console.error('Follow/Unfollow Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update follow status',
      code: 'FOLLOW_UPDATE_FAILED'
    });
  }
});

// 🚀 GET USER ACTIVITY TIMELINE
router.get('/:id/activity', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, limit = 20, types = [] } = req.query;

    // 🛡️ Check authorization
    if (userId !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this activity',
        code: 'ACTIVITY_ACCESS_DENIED'
      });
    }

    const activity = await getUserActivityTimeline(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      types: types.length > 0 ? types : undefined
    });

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error('Get Activity Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      code: 'FETCH_ACTIVITY_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 🎯 Build Comprehensive User Profile
async function buildUserProfile(userId, include = 'basic') {
  const baseInclude = {
    profile: true,
    preferences: true
  };

  // 🎯 Dynamic includes based on request
  const includes = { ...baseInclude };

  if (include === 'full' || include.includes('services')) {
    includes.services = {
      include: {
        category: true,
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    };
  }

  if (include === 'full' || include.includes('bookings')) {
    includes.bookings = {
      include: {
        service: {
          include: {
            category: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    };
  }

  if (include === 'full' || include.includes('social')) {
    includes.following = {
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatar: true,
            profile: true
          }
        }
      },
      take: 10
    };
    
    includes.followers = {
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatar: true,
            profile: true
          }
        }
      },
      take: 10
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: includes
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const profile = {
    ...user,
    stats: await buildUserStatistics(userId),
    reputation: await calculateUserReputation(userId),
    gamification: await YachiGamification.getUserGamificationProfile(userId)
  };

  // 🛡️ Remove sensitive data
  delete profile.password;
  delete profile.twoFactorSecret;

  return {
    data: profile,
    metadata: {
      includes: include,
      lastUpdated: new Date().toISOString()
    }
  };
}

// 🎯 Build Public Profile
async function buildPublicProfile(userId, viewerId = null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      services: {
        where: { status: 'active' },
        include: {
          category: true,
          reviews: {
            take: 3,
            orderBy: { createdAt: 'desc' }
          }
        },
        take: 6
      },
      _count: {
        select: {
          services: true,
          followers: true,
          following: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const publicProfile = {
    id: user.id,
    name: user.name,
    avatar: user.profile?.avatar,
    bio: user.profile?.bio,
    location: user.profile?.location,
    skills: user.profile?.skills,
    languages: user.profile?.languages,
    joinedAt: user.createdAt,
    verifiedBadge: user.verifiedBadge,
    premiumListing: user.premiumListing,
    rating: user.rating,
    services: user.services,
    stats: {
      serviceCount: user._count.services,
      followerCount: user._count.followers,
      followingCount: user._count.following
    },
    reputation: await calculateUserReputation(userId),
    isFollowing: viewerId ? await isUserFollowing(viewerId, userId) : false
  };

  return {
    data: publicProfile,
    privacy: await getUserPrivacySettings(userId)
  };
}

// 📊 Build User Statistics
async function buildUserStatistics(userId) {
  const [
    serviceStats,
    bookingStats,
    reviewStats,
    financialStats
  ] = await Promise.all([
    // 📊 Service Statistics
    prisma.service.aggregate({
      where: { ownerId: userId },
      _count: { id: true },
      _avg: { rating: true },
      _sum: { price: true }
    }),

    // 📅 Booking Statistics
    prisma.booking.aggregate({
      where: { 
        OR: [
          { clientId: userId },
          { providerId: userId }
        ]
      },
      _count: { id: true },
      _sum: { totalAmount: true }
    }),

    // ⭐ Review Statistics
    prisma.review.aggregate({
      where: { 
        OR: [
          { reviewerId: userId },
          { revieweeId: userId }
        ]
      },
      _count: { id: true },
      _avg: { rating: true }
    }),

    // 💰 Financial Statistics
    prisma.transaction.aggregate({
      where: { userId: userId },
      _count: { id: true },
      _sum: { amount: true }
    })
  ]);

  return {
    services: {
      total: serviceStats._count.id,
      averageRating: serviceStats._avg.rating,
      totalValue: serviceStats._sum.price
    },
    bookings: {
      total: bookingStats._count.id,
      totalAmount: bookingStats._sum.totalAmount
    },
    reviews: {
      given: await prisma.review.count({ where: { reviewerId: userId } }),
      received: await prisma.review.count({ where: { revieweeId: userId } }),
      averageRating: reviewStats._avg.rating
    },
    financial: {
      totalTransactions: financialStats._count.id,
      totalAmount: financialStats._sum.amount
    },
    social: {
      followers: await prisma.follow.count({ where: { followingId: userId } }),
      following: await prisma.follow.count({ where: { followerId: userId } })
    }
  };
}

// 🏆 Calculate User Reputation
async function calculateUserReputation(userId) {
  const [
    verificationScore,
    activityScore,
    qualityScore,
    socialScore
  ] = await Promise.all([
    calculateVerificationScore(userId),
    calculateActivityScore(userId),
    calculateQualityScore(userId),
    calculateSocialScore(userId)
  ]);

  const weights = {
    verification: 0.25,
    activity: 0.30,
    quality: 0.30,
    social: 0.15
  };

  const totalScore = 
    (verificationScore * weights.verification) +
    (activityScore * weights.activity) +
    (qualityScore * weights.quality) +
    (socialScore * weights.social);

  return {
    score: Math.round(totalScore * 100),
    level: getReputationLevel(totalScore),
    breakdown: {
      verification: Math.round(verificationScore * 100),
      activity: Math.round(activityScore * 100),
      quality: Math.round(qualityScore * 100),
      social: Math.round(socialScore * 100)
    },
    badge: getReputationBadge(totalScore)
  };
}

// 🔍 Search Users
async function searchUsers(params) {
  const where = {};

  // 🔍 Text search
  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: 'insensitive' } },
      { profile: { bio: { contains: params.query, mode: 'insensitive' } } },
      { profile: { skills: { has: params.query } } }
    ];
  }

  // 🎯 Role filter
  if (params.role) {
    where.role = params.role;
  }

  // 🔧 Skills filter
  if (params.skills && params.skills.length > 0) {
    where.profile = {
      ...where.profile,
      skills: { hasSome: params.skills }
    };
  }

  // ⭐ Rating filter
  if (params.minRating) {
    where.rating = { gte: params.minRating };
  }

  // ✅ Verification filter
  if (params.verifiedOnly) {
    where.verifiedBadge = true;
  }

  // 💎 Premium filter
  if (params.premiumOnly) {
    where.premiumListing = true;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        profile: true,
        _count: {
          select: {
            services: true,
            followers: true
          }
        }
      },
      orderBy: buildUserSearchOrder(params),
      take: params.limit,
      skip: (params.page - 1) * params.limit
    }),
    prisma.user.count({ where })
  ]);

  return {
    users: users.map(user => ({
      ...user,
      stats: {
        serviceCount: user._count.services,
        followerCount: user._count.followers
      }
    })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      pages: Math.ceil(total / params.limit)
    },
    filters: {
      applied: params
    }
  };
}

// 🛡️ Check Profile View Permissions
async function canUserViewProfile(viewerId, profileUserId) {
  if (!viewerId) {
    // Public access check
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: profileUserId }
    });
    
    return {
      allowed: preferences?.privacy?.profileVisibility !== 'private',
      reason: preferences?.privacy?.profileVisibility === 'private' ? 
        'Profile is private' : 'Public access granted'
    };
  }

  if (viewerId === profileUserId) {
    return { allowed: true, reason: 'Own profile' };
  }

  const viewerPreferences = await prisma.userPreferences.findUnique({
    where: { userId: profileUserId }
  });

  const privacySettings = viewerPreferences?.privacy;

  if (!privacySettings) {
    return { allowed: true, reason: 'Default public access' };
  }

  switch (privacySettings.profileVisibility) {
    case 'public':
      return { allowed: true, reason: 'Public profile' };
    case 'providers':
      const viewer = await prisma.user.findUnique({ where: { id: viewerId } });
      return { 
        allowed: viewer.role === 'provider', 
        reason: viewer.role === 'provider' ? 'Provider access' : 'Profile restricted to providers only' 
      };
    case 'connections':
      const isConnected = await isUserConnected(viewerId, profileUserId);
      return { 
        allowed: isConnected, 
        reason: isConnected ? 'Connected user' : 'Profile restricted to connections only' 
      };
    case 'private':
      return { allowed: false, reason: 'Profile is private' };
    default:
      return { allowed: true, reason: 'Default public access' };
  }
}

// 🏷️ Handle Verification Submission
async function handleVerificationSubmission(userId, verificationData, prisma) {
  await prisma.verificationRequest.create({
    data: {
      userId: userId,
      documentType: verificationData.documentType,
      documentNumber: verificationData.documentNumber,
      documentImages: verificationData.documentImages,
      status: 'pending',
      submittedAt: new Date()
    }
  });

  // 📧 Send verification submission notification
  await YachiNotifications.sendVerificationSubmittedNotification(userId);
}

// 🔢 Reputation Calculation Helpers
async function calculateVerificationScore(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifiedBadge: true, emailVerified: true }
  });

  let score = 0;
  if (user.emailVerified) score += 0.3;
  if (user.verifiedBadge) score += 0.7;

  return score;
}

async function calculateActivityScore(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recentActivity = await prisma.userActivity.count({
    where: {
      userId: userId,
      createdAt: { gte: thirtyDaysAgo }
    }
  });

  return Math.min(recentActivity / 50, 1); // Normalize to 0-1
}

async function calculateQualityScore(userId) {
  const reviews = await prisma.review.aggregate({
    where: { revieweeId: userId },
    _avg: { rating: true },
    _count: { id: true }
  });

  const avgRating = reviews._avg.rating || 0;
  const reviewCount = reviews._count.id;

  // Combine rating and review count
  const ratingScore = avgRating / 5;
  const countScore = Math.min(reviewCount / 20, 1);

  return (ratingScore * 0.7) + (countScore * 0.3);
}

async function calculateSocialScore(userId) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } })
  ]);

  const followerScore = Math.min(followers / 100, 1);
  const followingScore = Math.min(following / 50, 1);

  return (followerScore * 0.7) + (followingScore * 0.3);
}

// 🎯 Get Reputation Level
function getReputationLevel(score) {
  if (score >= 0.9) return 'elite';
  if (score >= 0.8) return 'expert';
  if (score >= 0.7) return 'professional';
  if (score >= 0.6) return 'experienced';
  if (score >= 0.5) return 'active';
  return 'beginner';
}

// 🏅 Get Reputation Badge
function getReputationBadge(score) {
  const levels = {
    elite: { name: 'Elite', color: '#FFD700', icon: '👑' },
    expert: { name: 'Expert', color: '#C0C0C0', icon: '⭐' },
    professional: { name: 'Professional', color: '#CD7F32', icon: '💼' },
    experienced: { name: 'Experienced', color: '#4CAF50', icon: '🌱' },
    active: { name: 'Active', color: '#2196F3', icon: '🔵' },
    beginner: { name: 'Beginner', color: '#9E9E9E', icon: '🟢' }
  };

  return levels[getReputationLevel(score)];
}

// 🎯 Build User Search Order
function buildUserSearchOrder(params) {
  if (params.query) {
    return [{ _relevance: { fields: ['name', 'profile.bio'], search: params.query, sort: 'desc' } }];
  }

  return [{ rating: 'desc' }, { createdAt: 'desc' }];
}

// 🔗 Check if Users Are Connected
async function isUserConnected(userId1, userId2) {
  const connection = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId1,
        followingId: userId2
      }
    }
  });

  return !!connection;
}

// ❤️ Check if User is Following
async function isUserFollowing(followerId, followingId) {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: followerId,
        followingId: followingId
      }
    }
  });

  return !!follow;
}

// 📊 Get User Activity Timeline
async function getUserActivityTimeline(userId, options) {
  const where = { userId: userId };

  if (options.types && options.types.length > 0) {
    where.type = { in: options.types };
  }

  const [activities, total] = await Promise.all([
    prisma.userActivity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: (options.page - 1) * options.limit
    }),
    prisma.userActivity.count({ where })
  ]);

  return {
    activities,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages: Math.ceil(total / options.limit)
    }
  };
}

// 🔒 Get User Privacy Settings
async function getUserPrivacySettings(userId) {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId: userId }
  });

  return preferences?.privacy || {
    profileVisibility: 'public',
    showOnlineStatus: true,
    showLastSeen: true,
    allowMessages: 'everyone'
  };
}

module.exports = router;
