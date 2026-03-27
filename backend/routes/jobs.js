const express = require('express');
const { Sequelize, Op } = require('sequelize');
const { Job, User, Transaction, Proposal, Category, Skill, JobMatch, Escrow, Notification } = require('../models');
const auth = require('../middleware/auth');
const { z } = require('zod');
const { YachiAI } = require('../services/yachiAI');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { LocationService } = require('../services/locationService');
const { PricingEngine } = require('../services/pricingEngine');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const JobSchema = {
  create: z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(20).max(2000),
    categoryId: z.number().int().positive(),
    skills: z.array(z.string()).min(1).max(10),
    budget: z.object({
      type: z.enum(['fixed', 'hourly', 'range']),
      amount: z.number().positive().optional(),
      minAmount: z.number().positive().optional(),
      maxAmount: z.number().positive().optional(),
      hourlyRate: z.number().positive().optional(),
      estimatedHours: z.number().positive().optional(),
      currency: z.string().default('ETB')
    }),
    timeline: z.object({
      startDate: z.string().datetime().optional(),
      deadline: z.string().datetime(),
      estimatedDuration: z.number().positive(), // in days
      urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
    }),
    location: z.object({
      type: z.enum(['onsite', 'remote', 'hybrid']),
      address: z.string().optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }).optional(),
      radius: z.number().positive().default(50) // km
    }),
    requirements: z.object({
      experience: z.enum(['entry', 'intermediate', 'expert']).default('intermediate'),
      verification: z.object({
        faydaVerified: z.boolean().default(true),
        selfieVerified: z.boolean().default(true),
        documentVerified: z.boolean().default(true)
      }).optional(),
      portfolioRequired: z.boolean().default(false),
      minRating: z.number().min(1).max(5).default(4.0),
      minCompletedJobs: z.number().int().min(0).default(0)
    }).optional(),
    attachments: z.array(z.object({
      type: z.enum(['image', 'document', 'video']),
      url: z.string().url(),
      name: z.string(),
      size: z.number().positive().optional()
    })).optional(),
    visibility: z.enum(['public', 'invite_only', 'premium_only']).default('public'),
    automatedMatching: z.boolean().default(true)
  }),

  automated: z.object({
    projectType: z.enum(['construction', 'renovation', 'repair', 'maintenance', 'design']),
    specifications: z.object({
      landSize: z.number().positive(),
      floors: z.number().int().positive().default(1),
      rooms: z.number().int().positive().optional(),
      finishingType: z.enum(['basic', 'standard', 'premium', 'luxury']),
      materials: z.array(z.string()).optional(),
      specialRequirements: z.string().max(500).optional()
    }),
    location: z.object({
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }),
      address: z.string().optional(),
      accessibility: z.enum(['easy', 'moderate', 'difficult']).default('moderate')
    }),
    timeline: z.object({
      startDate: z.string().datetime(),
      deadline: z.string().datetime(),
      priority: z.enum(['flexible', 'standard', 'urgent']).default('standard')
    }),
    budgetPreference: z.enum(['economy', 'standard', 'premium']).default('standard')
  }),

  update: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(20).max(2000).optional(),
    status: z.enum(['draft', 'published', 'in_progress', 'completed', 'cancelled']).optional(),
    budget: z.object({}).passthrough().optional(),
    timeline: z.object({}).passthrough().optional()
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  JOB_DETAILS: (jobId) => `job:details:${jobId}`,
  JOB_MATCHES: (jobId) => `job:matches:${jobId}`,
  USER_JOBS: (userId, type) => `jobs:user:${userId}:${type}`,
  JOB_FEED: (providerId) => `jobs:feed:${providerId}`,
  CATEGORY_JOBS: (categoryId) => `jobs:category:${categoryId}`
};

// 🚀 CREATE INTELLIGENT JOB
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can create jobs',
        code: 'CLIENTS_ONLY'
      });
    }

    const validatedData = JobSchema.create.parse(req.body);

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 🎯 Generate intelligent job details
      const jobDetails = await YachiAI.enhanceJobDescription({
        title: validatedData.title,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        skills: validatedData.skills
      });

      // 💰 Calculate smart budget if not provided
      let finalBudget = validatedData.budget;
      if (validatedData.budget.type === 'range' && (!validatedData.budget.minAmount || !validatedData.budget.maxAmount)) {
        const suggestedBudget = await PricingEngine.suggestJobBudget({
          categoryId: validatedData.categoryId,
          skills: validatedData.skills,
          timeline: validatedData.timeline,
          location: validatedData.location,
          requirements: validatedData.requirements
        });
        
        finalBudget = { ...validatedData.budget, ...suggestedBudget };
      }

      // 📝 Create job with enhanced details
      const job = await Job.create({
        clientId: req.user.userId,
        title: jobDetails.optimizedTitle || validatedData.title,
        description: jobDetails.enhancedDescription || validatedData.description,
        categoryId: validatedData.categoryId,
        skills: validatedData.skills,
        budget: finalBudget,
        timeline: validatedData.timeline,
        location: Sequelize.literal(
          `ST_SetSRID(ST_MakePoint(${validatedData.location.coordinates.longitude}, ${validatedData.location.coordinates.latitude}), 4326)`
        ),
        locationMetadata: {
          type: validatedData.location.type,
          address: validatedData.location.address,
          radius: validatedData.location.radius
        },
        requirements: validatedData.requirements,
        attachments: validatedData.attachments,
        status: 'published',
        visibility: validatedData.visibility,
        metadata: {
          aiEnhanced: !!jobDetails.optimizedTitle,
          complexity: jobDetails.complexity,
          estimatedValue: jobDetails.estimatedValue,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      }, { transaction });

      // 🎪 Initialize job gamification
      await YachiGamification.initializeJobGamification(job.id, req.user.userId);

      // 🤖 Automated provider matching
      if (validatedData.automatedMatching) {
        const matches = await YachiAI.findProviderMatches(job.id);
        
        for (const match of matches) {
          await JobMatch.create({
            jobId: job.id,
            providerId: match.providerId,
            matchScore: match.score,
            reason: match.reason,
            status: 'pending'
          }, { transaction });

          // 📧 Send match notification
          await YachiNotifications.sendJobMatchNotification(match.providerId, job.id, match.score);
        }
      }

      // 📊 Track job creation analytics
      await YachiAnalytics.trackJobEvent('created', job);

      await transaction.commit();

      // 📡 Real-time broadcast
      req.io.emit('jobPosted', {
        jobId: job.id,
        title: job.title,
        category: job.categoryId,
        location: validatedData.location.coordinates,
        budget: job.budget,
        skills: job.skills
      });

      // 🗑️ Clear relevant caches
      await clearJobCaches(req.user.userId);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: {
          job,
          matches: validatedData.automatedMatching ? await getJobMatches(job.id) : [],
          nextSteps: ['awaiting_proposals', 'review_matches']
        },
        gamification: {
          pointsAwarded: 50,
          achievement: 'First Job Posted'
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Create Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      code: 'JOB_CREATION_FAILED'
    });
  }
});

// 🚀 CREATE AI-POWERED AUTOMATED JOB
router.post('/automated', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can create jobs',
        code: 'CLIENTS_ONLY'
      });
    }

    const validatedData = JobSchema.automated.parse(req.body);

    // 🎯 AI-Powered Job Generation
    const aiJob = await YachiAI.generateAutomatedJob(validatedData);

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 📝 Create automated job
      const job = await Job.create({
        clientId: req.user.userId,
        title: aiJob.title,
        description: aiJob.description,
        categoryId: aiJob.categoryId,
        skills: aiJob.skills,
        budget: aiJob.budget,
        timeline: aiJob.timeline,
        location: Sequelize.literal(
          `ST_SetSRID(ST_MakePoint(${validatedData.location.coordinates.longitude}, ${validatedData.location.coordinates.latitude}), 4326)`
        ),
        locationMetadata: {
          type: 'onsite',
          address: validatedData.location.address,
          accessibility: validatedData.location.accessibility
        },
        requirements: aiJob.requirements,
        status: 'published',
        visibility: 'public',
        metadata: {
          automated: true,
          projectType: validatedData.projectType,
          specifications: validatedData.specifications,
          aiConfidence: aiJob.confidence,
          generatedAt: new Date().toISOString()
        }
      }, { transaction });

      // 🎯 Find optimal provider matches
      const optimalMatches = await YachiAI.findOptimalProviders(job.id, {
        location: validatedData.location.coordinates,
        skills: aiJob.skills,
        budget: aiJob.budget,
        timeline: aiJob.timeline
      });

      // 👥 Create job matches and send invitations
      for (const match of optimalMatches.providers) {
        await JobMatch.create({
          jobId: job.id,
          providerId: match.id,
          matchScore: match.score,
          reason: match.reason,
          status: 'invited',
          metadata: {
            skillsMatch: match.skillsMatch,
            locationProximity: match.locationProximity,
            budgetAlignment: match.budgetAlignment
          }
        }, { transaction });

        // 📧 Send personalized invitation
        await YachiNotifications.sendJobInvitation(match.id, job.id, match.score);
      }

      // 🎪 Award automated job creation points
      await YachiGamification.awardAutomatedJobCreation(req.user.userId, job);

      await transaction.commit();

      // 📡 Real-time broadcast
      req.io.emit('automatedJobPosted', {
        jobId: job.id,
        title: job.title,
        category: job.categoryId,
        budget: job.budget,
        invitedProviders: optimalMatches.providers.map(p => p.id)
      });

      res.status(201).json({
        success: true,
        message: 'Automated job created with optimal provider matches',
        data: {
          job,
          suggestedProviders: optimalMatches.providers,
          aiInsights: optimalMatches.insights,
          estimatedTimeline: aiJob.timeline,
          budgetBreakdown: aiJob.budgetBreakdown
        },
        gamification: {
          pointsAwarded: 75,
          achievement: 'AI Job Creation'
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Automated Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create automated job',
      code: 'AUTOMATED_JOB_FAILED'
    });
  }
});

// 🚀 GET JOB DETAILS WITH INTELLIGENT DATA
router.get('/:id', auth, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const { include = 'basic' } = req.query;

    const cacheKey = CACHE_KEYS.JOB_DETAILS(jobId) + `:${include}`;
    const cachedJob = await redis.get(cacheKey);

    if (cachedJob) {
      return res.json({
        success: true,
        data: JSON.parse(cachedJob),
        source: 'cache'
      });
    }

    const job = await Job.findByPk(jobId, {
      include: buildJobIncludes(include),
      attributes: include === 'basic' ? [
        'id', 'title', 'description', 'budget', 'timeline', 'status',
        'createdAt', 'skills', 'categoryId'
      ] : undefined
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
        code: 'JOB_NOT_FOUND'
      });
    }

    // 🛡️ Check authorization
    if (!(await canUserViewJob(req.user, job))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this job',
        code: 'JOB_ACCESS_DENIED'
      });
    }

    // 🎯 Enhance job data
    const enhancedJob = await enhanceJobData(job, include);

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(enhancedJob));

    res.json({
      success: true,
      data: enhancedJob,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Job Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job details',
      code: 'FETCH_JOB_FAILED'
    });
  }
});

// 🚀 COMPLETE JOB WITH INTELLIGENT WORKFLOW
router.put('/:id/complete', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can complete jobs',
        code: 'CLIENTS_ONLY'
      });
    }

    const jobId = parseInt(req.params.id);
    const { rating, review, releaseEscrow = true } = req.body;

    // 💼 Start transaction
    const transaction = await sequelize.transaction();

    try {
      const job = await Job.findByPk(jobId, {
        include: [{
          model: User,
          as: 'provider',
          attributes: ['id', 'name']
        }]
      });

      if (!job) {
        throw new Error('JOB_NOT_FOUND');
      }

      if (job.clientId !== req.user.userId) {
        throw new Error('UNAUTHORIZED');
      }

      if (job.status !== 'in_progress') {
        throw new Error('INVALID_JOB_STATUS');
      }

      // ✅ Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      await job.save({ transaction });

      // 💰 Handle escrow release
      if (releaseEscrow && job.paymentStatus === 'paid') {
        const escrow = await Escrow.findOne({
          where: { jobId }
        });

        if (escrow && escrow.status === 'held') {
          await EscrowService.releaseEscrow(escrow.id, req.user.userId);
        }
      }

      // ⭐ Handle rating and review
      if (rating && job.provider) {
        await Rating.create({
          jobId: job.id,
          reviewerId: req.user.userId,
          revieweeId: job.provider.id,
          rating: rating,
          comment: review,
          type: 'client_to_provider'
        }, { transaction });

        // 🎪 Award review points
        await YachiGamification.awardJobCompletion(req.user.userId, job.provider.id, job);
      }

      // 📊 Track completion analytics
      await YachiAnalytics.trackJobEvent('completed', job);

      await transaction.commit();

      // 📡 Real-time notifications
      req.io.emit('jobCompleted', {
        jobId: job.id,
        clientId: job.clientId,
        providerId: job.provider?.id,
        completedAt: job.completedAt
      });

      // 📧 Send completion notifications
      if (job.provider) {
        await YachiNotifications.sendJobCompletionNotification(job.provider.id, job.id);
      }

      // 🗑️ Clear caches
      await clearJobCaches(job.clientId, job.provider?.id);

      res.json({
        success: true,
        message: 'Job completed successfully',
        data: {
          job,
          escrowReleased: releaseEscrow,
          rated: !!rating
        },
        gamification: {
          pointsAwarded: 100,
          achievement: 'Job Completion'
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Complete Job Error:', error);

    const errorMap = {
      'JOB_NOT_FOUND': { message: 'Job not found', status: 404 },
      'UNAUTHORIZED': { message: 'Not authorized to complete this job', status: 403 },
      'INVALID_JOB_STATUS': { message: 'Job is not in progress', status: 400 }
    };

    const errorConfig = errorMap[error.message] || {
      message: 'Failed to complete job',
      status: 500
    };

    res.status(errorConfig.status).json({
      success: false,
      message: errorConfig.message,
      code: error.message
    });
  }
});

// 🚀 GET INTELLIGENT JOB FEED FOR PROVIDERS
router.get('/feed/for-provider', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can access job feed',
        code: 'PROVIDERS_ONLY'
      });
    }

    const { page = 1, limit = 20, category, radius = 50 } = req.query;

    const cacheKey = CACHE_KEYS.JOB_FEED(req.user.userId) + `:${page}:${limit}:${category}:${radius}`;
    const cachedFeed = await redis.get(cacheKey);

    if (cachedFeed) {
      return res.json({
        success: true,
        ...JSON.parse(cachedFeed),
        source: 'cache'
      });
    }

    // 🎯 Get provider profile for personalized matching
    const provider = await User.findByPk(req.user.userId, {
      include: [{
        model: UserProfile,
        attributes: ['skills', 'preferences', 'location']
      }]
    });

    // 🎯 Build personalized job feed
    const feed = await buildPersonalizedJobFeed(provider, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      radius: parseInt(radius)
    });

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(feed));

    res.json({
      success: true,
      ...feed,
      source: 'database'
    });

  } catch (error) {
    console.error('Job Feed Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job feed',
      code: 'FETCH_FEED_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 🎯 Build Job Includes
function buildJobIncludes(include) {
  const baseInclude = [{
    model: User,
    as: 'client',
    attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'rating']
  }];

  switch (include) {
    case 'full':
      return [
        ...baseInclude,
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'rating']
        },
        {
          model: Proposal,
          as: 'proposals',
          include: [{
            model: User,
            as: 'provider',
            attributes: ['id', 'name', 'avatar', 'rating']
          }]
        },
        {
          model: JobMatch,
          as: 'matches',
          include: [{
            model: User,
            as: 'provider',
            attributes: ['id', 'name', 'avatar', 'rating']
          }]
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'icon']
        }
      ];
    case 'with_proposals':
      return [
        ...baseInclude,
        {
          model: Proposal,
          as: 'proposals',
          include: [{
            model: User,
            as: 'provider',
            attributes: ['id', 'name', 'avatar', 'rating']
          }]
        }
      ];
    default:
      return baseInclude;
  }
}

// 🎯 Enhance Job Data
async function enhanceJobData(job, include) {
  const enhanced = job.toJSON();

  // 🎯 Add AI-powered insights
  if (include === 'full') {
    enhanced.insights = await YachiAI.getJobInsights(job.id);
    enhanced.competition = await getJobCompetition(job.id);
    enhanced.trends = await getJobMarketTrends(job.categoryId);
  }

  // 💰 Add budget analysis
  enhanced.budgetAnalysis = await PricingEngine.analyzeJobBudget(job.budget, job.categoryId);

  // 📍 Add location insights
  enhanced.locationInsights = await LocationService.getLocationInsights(
    job.location,
    job.categoryId
  );

  return enhanced;
}

// 🛡️ Check Job View Authorization
async function canUserViewJob(user, job) {
  if (user.roles.includes('admin')) return true;
  if (job.clientId === user.userId) return true;
  if (job.providerId === user.userId) return true;

  // Providers can view public jobs or jobs they're invited to
  if (user.role === 'provider') {
    if (job.visibility === 'public') return true;
    
    const match = await JobMatch.findOne({
      where: {
        jobId: job.id,
        providerId: user.userId,
        status: ['invited', 'accepted']
      }
    });
    
    return !!match;
  }

  return false;
}

// 🎯 Build Personalized Job Feed
async function buildPersonalizedJobFeed(provider, options) {
  const where = {
    status: 'published',
    visibility: { [Op.in]: ['public', 'premium_only'] }
  };

  // 🎯 Category filter
  if (options.category) {
    where.categoryId = options.category;
  }

  // 📍 Location-based filtering
  if (provider.UserProfile?.location) {
    where.location = Sequelize.literal(
      `ST_DWithin(location, ST_SetSRID(ST_MakePoint(${provider.UserProfile.location.coordinates.longitude}, ${provider.UserProfile.location.coordinates.latitude}), 4326), ${options.radius * 1000})`
    );
  }

  // 🔧 Skill-based matching
  if (provider.UserProfile?.skills?.length > 0) {
    where.skills = {
      [Op.overlap]: provider.UserProfile.skills
    };
  }

  const [jobs, total] = await Promise.all([
    Job.findAll({
      where,
      include: [{
        model: User,
        as: 'client',
        attributes: ['id', 'name', 'avatar', 'verifiedBadge', 'rating']
      }],
      order: [
        ['createdAt', 'DESC'],
        [Sequelize.literal(`(SELECT COUNT(*) FROM proposals WHERE proposals.jobId = Job.id)`), 'ASC'] // Less competition first
      ],
      limit: options.limit,
      offset: (options.page - 1) * options.limit
    }),
    Job.count({ where })
  ]);

  // 🎯 Calculate match scores
  const jobsWithScores = await Promise.all(
    jobs.map(async (job) => {
      const matchScore = await YachiAI.calculateJobMatchScore(job.id, provider.id);
      return {
        ...job.toJSON(),
        matchScore: matchScore.score,
        matchReasons: matchScore.reasons
      };
    })
  );

  // 📊 Sort by match score
  jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

  return {
    jobs: jobsWithScores,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages: Math.ceil(total / options.limit)
    },
    personalization: {
      basedOnSkills: provider.UserProfile?.skills || [],
      locationRadius: options.radius,
      totalMatches: jobsWithScores.filter(j => j.matchScore > 0.7).length
    }
  };
}

// 🗑️ Clear Job Caches
async function clearJobCaches(clientId, providerId = null) {
  const patterns = [
    CACHE_KEYS.USER_JOBS(clientId, '*'),
    CACHE_KEYS.JOB_FEED('*'),
    ...(providerId ? [CACHE_KEYS.USER_JOBS(providerId, '*')] : [])
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 🔍 Get Job Competition
async function getJobCompetition(jobId) {
  const proposalCount = await Proposal.count({
    where: { jobId }
  });

  const viewCount = await JobView.count({
    where: { jobId }
  });

  return {
    proposals: proposalCount,
    views: viewCount,
    competitionLevel: proposalCount < 5 ? 'low' : proposalCount < 15 ? 'medium' : 'high'
  };
}

// 📈 Get Job Market Trends
async function getJobMarketTrends(categoryId) {
  const trends = await Job.findAll({
    where: {
      categoryId,
      status: 'completed',
      createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    },
    attributes: [
      [Sequelize.fn('AVG', Sequelize.col('budget.amount')), 'averageBudget'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'jobCount'],
      [Sequelize.fn('AVG', Sequelize.literal("EXTRACT(EPOCH FROM (completedAt - createdAt)) / 86400")), 'averageDuration']
    ],
    raw: true
  });

  return {
    averageBudget: parseFloat(trends[0]?.averageBudget) || 0,
    jobCount: parseInt(trends[0]?.jobCount) || 0,
    averageDuration: parseFloat(trends[0]?.averageDuration) || 0
  };
}

// 👥 Get Job Matches
async function getJobMatches(jobId) {
  return await JobMatch.findAll({
    where: { jobId },
    include: [{
      model: User,
      as: 'provider',
      attributes: ['id', 'name', 'avatar', 'rating', 'verifiedBadge']
    }],
    order: [['matchScore', 'DESC']]
  });
}

module.exports = router;
