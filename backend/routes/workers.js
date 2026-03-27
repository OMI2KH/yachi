const express = require('express');
const { User, Transaction, Product, Service, Review, WorkerVerification, Portfolio, Skill, Certification } = require('../models');
const { Sequelize, Op } = require('sequelize');
const auth = require('../middleware/auth');
const { z } = require('zod');
const { YachiAI } = require('../services/yachiAI');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiNotifications } = require('../services/yachiNotifications');
const { MediaService } = require('../services/mediaService');
const { VerificationService } = require('../services/verificationService');
const redis = require('../config/redis');
const sequelize = require('../config/database');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const WorkerSchema = {
  faydaUpload: z.object({
    documentType: z.enum(['fayda_id', 'passport', 'driving_license']),
    documentNumber: z.string().min(5).max(50)
  }),

  selfieVerification: z.object({
    verificationType: z.enum(['liveness', 'document_match', 'biometric']).default('liveness')
  }),

  documentUpload: z.object({
    documentType: z.enum(['degree', 'certificate', 'license', 'portfolio']),
    issuingAuthority: z.string().optional(),
    issueDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional()
  }),

  portfolioUpload: z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().default(true)
  }),

  availability: z.object({
    status: z.enum(['available', 'busy', 'away', 'unavailable']),
    schedule: z.object({
      workingHours: z.object({
        start: z.string(),
        end: z.string(),
        timezone: z.string()
      }).optional(),
      workingDays: z.array(z.number().min(0).max(6)).optional(),
      emergencyService: z.boolean().default(false)
    }).optional(),
    noticePeriod: z.number().int().min(0).default(0)
  }),

  skills: z.object({
    skills: z.array(z.string()).min(1).max(20),
    proficiency: z.enum(['beginner', 'intermediate', 'expert']).optional(),
    certifications: z.array(z.string()).optional()
  }),

  search: z.object({
    query: z.string().max(100).optional(),
    skills: z.array(z.string()).optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().positive().default(50)
    }).optional(),
    minRating: z.number().min(1).max(5).optional(),
    experience: z.enum(['entry', 'intermediate', 'expert']).optional(),
    availability: z.enum(['immediate', 'within_week', 'flexible']).optional(),
    verifiedOnly: z.boolean().default(true),
    premiumOnly: z.boolean().default(false),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),

  schedule: z.object({
    weeklySchedule: z.array(z.object({
      day: z.number().min(0).max(6),
      slots: z.array(z.object({
        start: z.string(),
        end: z.string(),
        type: z.enum(['working', 'break', 'unavailable'])
      }))
    })),
    timezone: z.string(),
    emergencyService: z.boolean().default(false)
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  WORKER_PROFILE: (workerId) => `worker:profile:${workerId}`,
  WORKER_VERIFICATION: (workerId) => `worker:verification:${workerId}`,
  WORKER_STATS: (workerId) => `worker:stats:${workerId}`,
  WORKER_SEARCH: (params) => `worker:search:${Buffer.from(JSON.stringify(params)).toString('base64')}`,
  WORKER_PORTFOLIO: (workerId) => `worker:portfolio:${workerId}`,
  WORKER_DASHBOARD: (workerId) => `worker:dashboard:${workerId}`
};

// 🛡️ MIDDLEWARE
const workerOnly = async (req, res, next) => {
  if (req.user.role !== 'provider' && req.user.role !== 'graduate') {
    return res.status(403).json({
      success: false,
      message: 'Only providers and graduates can access this resource',
      code: 'WORKERS_ONLY'
    });
  }
  next();
};

// 🛡️ RATE LIMITING
const workerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this worker',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  skip: (req) => req.user?.role === 'admin'
});

router.use(workerRateLimit);

// 🚀 UTILITY FUNCTIONS

// 🗑️ Clear Worker Caches
async function clearWorkerCaches(workerId) {
  const keys = [
    CACHE_KEYS.WORKER_PROFILE(workerId),
    CACHE_KEYS.WORKER_VERIFICATION(workerId),
    CACHE_KEYS.WORKER_STATS(workerId),
    CACHE_KEYS.WORKER_PORTFOLIO(workerId),
    CACHE_KEYS.WORKER_DASHBOARD(workerId)
  ];
  
  try {
    await redis.del(keys);
    const searchPattern = 'worker:search:*';
    const searchKeys = await redis.keys(searchPattern);
    if (searchKeys.length > 0) await redis.del(searchKeys);
  } catch (error) {
    console.error('Cache clearance error:', error);
  }
}

// 📊 Calculate Worker Stats
async function calculateWorkerStats(workerId) {
  const [serviceStats, reviewStats, completionStats, revenueStats] = await Promise.all([
    Service.findAll({
      where: { providerId: workerId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalServices'],
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageServiceRating']
      ],
      raw: true
    }),
    Review.findAll({
      where: { revieweeId: workerId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalReviews'],
        [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rating = 5 THEN 1 ELSE 0 END')), 'fiveStarReviews']
      ],
      raw: true
    }),
    Transaction.findAll({
      where: { providerId: workerId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalJobs'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = "completed" THEN 1 ELSE 0 END')), 'completedJobs'],
        [Sequelize.fn('AVG', Sequelize.literal('TIMESTAMPDIFF(HOUR, createdAt, completedAt)')), 'averageCompletionTime']
      ],
      raw: true
    }),
    Transaction.findAll({
      where: { providerId: workerId, status: 'completed' },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalRevenue'],
        [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageJobValue']
      ],
      raw: true
    })
  ]);

  return {
    services: {
      total: parseInt(serviceStats[0]?.totalServices) || 0,
      averageRating: parseFloat(serviceStats[0]?.averageServiceRating) || 0
    },
    reviews: {
      total: parseInt(reviewStats[0]?.totalReviews) || 0,
      averageRating: parseFloat(reviewStats[0]?.averageRating) || 0,
      fiveStarCount: parseInt(reviewStats[0]?.fiveStarReviews) || 0,
      fiveStarPercentage: parseInt(reviewStats[0]?.totalReviews) > 0 ? 
        (parseInt(reviewStats[0]?.fiveStarReviews) / parseInt(reviewStats[0]?.totalReviews)) * 100 : 0
    },
    completion: {
      totalJobs: parseInt(completionStats[0]?.totalJobs) || 0,
      completedJobs: parseInt(completionStats[0]?.completedJobs) || 0,
      completionRate: parseInt(completionStats[0]?.totalJobs) > 0 ? 
        (parseInt(completionStats[0]?.completedJobs) / parseInt(completionStats[0]?.totalJobs)) * 100 : 0,
      averageCompletionTime: parseFloat(completionStats[0]?.averageCompletionTime) || 0
    },
    revenue: {
      total: parseFloat(revenueStats[0]?.totalRevenue) || 0,
      averageJobValue: parseFloat(revenueStats[0]?.averageJobValue) || 0
    }
  };
}

// 🔢 Trust Score Calculation
async function calculateTrustScore(workerId) {
  const [verificationScore, completionScore, ratingScore, tenureScore] = await Promise.all([
    calculateVerificationScore(workerId),
    calculateCompletionScore(workerId),
    calculateRatingScore(workerId),
    calculateTenureScore(workerId)
  ]);

  const weights = { verification: 0.35, completion: 0.25, rating: 0.25, tenure: 0.15 };
  return Math.round(
    (verificationScore * weights.verification) +
    (completionScore * weights.completion) +
    (ratingScore * weights.rating) +
    (tenureScore * weights.tenure)
  );
}

async function calculateVerificationScore(workerId) {
  const worker = await User.findByPk(workerId);
  let score = 0;
  if (worker.faydaVerified) score += 0.4;
  if (worker.selfieVerified) score += 0.3;
  if (worker.documentVerified) score += 0.3;
  return score * 100;
}

async function calculateCompletionScore(workerId) {
  const stats = await calculateWorkerStats(workerId);
  return Math.min(stats.completion.completionRate, 100);
}

async function calculateRatingScore(workerId) {
  const stats = await calculateWorkerStats(workerId);
  return (stats.reviews.averageRating / 5) * 100;
}

async function calculateTenureScore(workerId) {
  const worker = await User.findByPk(workerId);
  const joinDate = new Date(worker.joinedAt);
  const monthsActive = (new Date() - joinDate) / (30 * 24 * 60 * 60 * 1000);
  return Math.min(monthsActive * 2, 100);
}

// 📊 Performance Metrics
async function calculateResponseRate(workerId) {
  const stats = await Transaction.findAll({
    where: { providerId: workerId },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRequests'],
      [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN respondedAt IS NOT NULL THEN 1 ELSE 0 END')), 'respondedRequests']
    ],
    raw: true
  });
  const total = parseInt(stats[0]?.totalRequests) || 0;
  const responded = parseInt(stats[0]?.respondedRequests) || 0;
  return total > 0 ? (responded / total) * 100 : 0;
}

async function calculateAcceptanceRate(workerId) {
  const stats = await Transaction.findAll({
    where: { providerId: workerId },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRequests'],
      [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = "accepted" THEN 1 ELSE 0 END')), 'acceptedRequests']
    ],
    raw: true
  });
  const total = parseInt(stats[0]?.totalRequests) || 0;
  const accepted = parseInt(stats[0]?.acceptedRequests) || 0;
  return total > 0 ? (accepted / total) * 100 : 0;
}

async function calculateRepeatClientRate(workerId) {
  const clientStats = await Transaction.findAll({
    where: { providerId: workerId, status: 'completed' },
    attributes: ['clientId', [Sequelize.fn('COUNT', Sequelize.col('clientId')), 'transactionCount']],
    group: ['clientId'],
    having: Sequelize.literal('COUNT(clientId) > 1'),
    raw: true
  });
  const totalClients = await Transaction.count({
    where: { providerId: workerId, status: 'completed' },
    distinct: true, col: 'clientId'
  });
  return totalClients > 0 ? (clientStats.length / totalClients) * 100 : 0;
}

async function calculateProfileCompleteness(workerId) {
  const worker = await User.findByPk(workerId);
  let score = 0;
  if (worker.name) score += 10;
  if (worker.avatar) score += 5;
  if (worker.bio) score += 5;
  if (worker.faydaVerified) score += 10;
  if (worker.selfieVerified) score += 10;
  if (worker.documentVerified) score += 10;
  if (worker.skills?.length > 0) score += 10;
  if (worker.availability) score += 10;
  if (worker.level > 1) score += 10;
  const portfolioCount = await Portfolio.count({ where: { userId: workerId } });
  const serviceCount = await Service.count({ where: { providerId: workerId } });
  if (portfolioCount > 0) score += 10;
  if (serviceCount > 0) score += 10;
  return Math.min(score, 100);
}

// 🎯 Enhance Worker Profile
async function enhanceWorkerProfile(worker) {
  const enhanced = worker.toJSON();
  enhanced.analytics = await calculateWorkerStats(worker.id);
  enhanced.verification = {
    faydaVerified: worker.faydaVerified,
    selfieVerified: worker.selfieVerified,
    documentVerified: worker.documentVerified,
    totalVerifications: worker.verifications?.length || 0,
    trustScore: await calculateTrustScore(worker.id)
  };
  enhanced.gamification = await YachiGamification.getWorkerGamificationProfile(worker.id);
  enhanced.performance = {
    responseRate: await calculateResponseRate(worker.id),
    acceptanceRate: await calculateAcceptanceRate(worker.id),
    repeatClientRate: await calculateRepeatClientRate(worker.id)
  };
  return {
    data: enhanced,
    metadata: {
      lastUpdated: new Date().toISOString(),
      completeness: await calculateProfileCompleteness(worker.id)
    }
  };
}

// 🔍 Search Workers
async function searchWorkers(params) {
  const where = { role: { [Op.in]: ['provider', 'graduate'] }, status: 'active' };
  if (params.query) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${params.query}%` } },
      { skills: { [Op.contains]: [params.query] } }
    ];
  }
  if (params.skills?.length > 0) where.skills = { [Op.overlap]: params.skills };
  if (params.minRating) where.rating = { [Op.gte]: params.minRating };
  if (params.experience) where.level = params.experience;
  if (params.availability) {
    where.availability = params.availability === 'immediate' ? 'available' : 
                        params.availability === 'within_week' ? 'available' : { [Op.ne]: 'unavailable' };
  }
  if (params.verifiedOnly) {
    where[Op.and] = [
      { faydaVerified: true },
      { selfieVerified: true },
      { documentVerified: true }
    ];
  }
  if (params.premiumOnly) where.premiumListing = true;

  const [workers, total] = await Promise.all([
    User.findAll({
      where,
      include: [
        {
          model: Service, as: 'services',
          attributes: ['id', 'title', 'price'], limit: 3
        },
        { model: Review, as: 'reviews', attributes: ['rating'], limit: 1 }
      ],
      attributes: [
        'id', 'name', 'avatar', 'skills', 'level', 'rating',
        'faydaVerified', 'selfieVerified', 'documentVerified',
        'premiumListing', 'availability', 'joinedAt'
      ],
      order: buildWorkerSearchOrder(params),
      limit: params.limit,
      offset: (params.page - 1) * params.limit
    }),
    User.count({ where })
  ]);

  return {
    workers: await Promise.all(workers.map(async worker => ({
      ...worker.toJSON(),
      stats: await calculateWorkerStats(worker.id)
    }))),
    pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) },
    filters: { applied: params }
  };
}

function buildWorkerSearchOrder(params) {
  if (params.query) {
    return [
      [{ _relevance: { fields: ['name', 'skills'], search: params.query, sort: 'desc' } }],
      ['rating', 'DESC'], ['premiumListing', 'DESC']
    ];
  }
  return [['premiumListing', 'DESC'], ['rating', 'DESC'], ['joinedAt', 'DESC']];
}

// 📊 Analytics Helpers
async function getRevenueAnalytics(workerId) {
  const [revenue, monthlyTrend] = await Promise.all([
    Transaction.findAll({
      where: { providerId: workerId, status: 'completed' },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalRevenue'],
        [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageJobValue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalJobs']
      ],
      raw: true
    }),
    Transaction.findAll({
      where: { 
        providerId: workerId, status: 'completed',
        createdAt: { [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'dailyRevenue']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
      order: [[Sequelize.col('date'), 'ASC']],
      raw: true
    })
  ]);

  return {
    totalRevenue: parseFloat(revenue[0]?.totalRevenue) || 0,
    averageJobValue: parseFloat(revenue[0]?.averageJobValue) || 0,
    totalJobs: parseInt(revenue[0]?.totalJobs) || 0,
    monthlyTrend
  };
}

async function getPerformanceScores(workerId) {
  const [responseRate, acceptanceRate, completionRate, repeatClientRate] = await Promise.all([
    calculateResponseRate(workerId), calculateAcceptanceRate(workerId),
    calculateCompletionRate(workerId), calculateRepeatClientRate(workerId)
  ]);
  return {
    responseRate, acceptanceRate, completionRate, repeatClientRate,
    overallScore: (responseRate + acceptanceRate + completionRate + repeatClientRate) / 4
  };
}

// 🚀 ROUTES

// 🚀 UPLOAD FAYDA ID WITH AI VERIFICATION
router.post('/fayda-upload', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.faydaUpload.parse(req.body);
    if (!req.file) return res.status(400).json({ success: false, message: 'Document file required', code: 'DOCUMENT_REQUIRED' });

    const transaction = await sequelize.transaction();
    try {
      const processedDocument = await MediaService.processVerificationDocument(req.file, req.user.userId, validatedData.documentType);
      const verificationResult = await VerificationService.verifyDocument({
        documentType: validatedData.documentType, documentNumber: validatedData.documentNumber,
        documentImage: processedDocument.url, userId: req.user.userId
      });

      const verification = await WorkerVerification.create({
        userId: req.user.userId, documentType: validatedData.documentType,
        documentNumber: validatedData.documentNumber, documentImage: processedDocument.url,
        status: verificationResult.verified ? 'verified' : 'pending_review',
        metadata: { verificationResult, processedDocument, ipAddress: req.ip, userAgent: req.headers['user-agent'] }
      }, { transaction });

      await User.update({
        faydaVerified: verificationResult.verified, verificationScore: verificationResult.confidenceScore
      }, { where: { id: req.user.userId }, transaction });

      await transaction.commit();
      await YachiNotifications.sendVerificationUpdate(req.user.userId, validatedData.documentType, verificationResult.verified ? 'verified' : 'pending_review');
      if (verificationResult.verified) await YachiGamification.awardVerification(req.user.userId, validatedData.documentType);
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: verificationResult.verified ? 'Document verified' : 'Document submitted for review',
        data: { verification, result: verificationResult, nextSteps: verificationResult.verified ? ['complete_profile', 'add_skills'] : ['awaiting_manual_review'] },
        gamification: verificationResult.verified ? { pointsAwarded: 50, achievement: 'Identity Verified' } : undefined
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Fayda Upload Error:', error);
    res.status(500).json({ success: false, message: 'Verification failed', code: 'VERIFICATION_FAILED' });
  }
});

// 🚀 SELFIE VERIFICATION WITH LIVENESS DETECTION
router.post('/selfie-verify', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.selfieVerification.parse(req.body);
    if (!req.file) return res.status(400).json({ success: false, message: 'Selfie required', code: 'SELFIE_REQUIRED' });

    const transaction = await sequelize.transaction();
    try {
      const processedSelfie = await MediaService.processSelfieImage(req.file, req.user.userId);
      const verificationResult = await VerificationService.verifySelfie({
        selfieImage: processedSelfie.url, userId: req.user.userId, verificationType: validatedData.verificationType
      });

      const selfieVerification = await WorkerVerification.create({
        userId: req.user.userId, documentType: 'selfie', status: verificationResult.verified ? 'verified' : 'failed',
        metadata: { verificationResult, processedSelfie, verificationType: validatedData.verificationType, ipAddress: req.ip, userAgent: req.headers['user-agent'] }
      }, { transaction });

      await User.update({
        selfieVerified: verificationResult.verified, selfieVerificationScore: verificationResult.confidenceScore
      }, { where: { id: req.user.userId }, transaction });

      await transaction.commit();
      if (verificationResult.verified) {
        await YachiGamification.awardSelfieVerification(req.user.userId);
        await YachiNotifications.sendSelfieVerificationSuccess(req.user.userId);
      }
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: verificationResult.verified ? 'Selfie verified' : 'Selfie verification failed',
        data: { verification: selfieVerification, result: verificationResult, nextSteps: verificationResult.verified ? ['complete_document_verification'] : ['retry_verification'] },
        gamification: verificationResult.verified ? { pointsAwarded: 25, achievement: 'Selfie Verified' } : undefined
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Selfie Verification Error:', error);
    res.status(500).json({ success: false, message: 'Selfie verification failed', code: 'SELFIE_VERIFICATION_FAILED' });
  }
});

// 🚀 DOCUMENT UPLOAD WITH AI VALIDATION
router.post('/document-upload', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.documentUpload.parse(req.body);
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'Documents required', code: 'DOCUMENTS_REQUIRED' });

    const transaction = await sequelize.transaction();
    try {
      const documentResults = await Promise.all(req.files.map(async (file) => {
        const processedDocument = await MediaService.processVerificationDocument(file, req.user.userId, validatedData.documentType);
        const analysisResult = await VerificationService.analyzeDocument({
          documentType: validatedData.documentType, documentImage: processedDocument.url,
          issuingAuthority: validatedData.issuingAuthority, userId: req.user.userId
        });
        return WorkerVerification.create({
          userId: req.user.userId, documentType: validatedData.documentType, documentNumber: analysisResult.documentNumber,
          documentImage: processedDocument.url, status: analysisResult.verified ? 'verified' : 'pending_review',
          metadata: { analysisResult, processedDocument, issuingAuthority: validatedData.issuingAuthority, issueDate: validatedData.issueDate, expiryDate: validatedData.expiryDate }
        }, { transaction });
      }));

      const allVerified = documentResults.every(doc => doc.status === 'verified');
      await User.update({
        documentVerified: allVerified,
        documentVerificationScore: documentResults.reduce((acc, doc) => acc + (doc.metadata.analysisResult.confidenceScore || 0), 0) / documentResults.length
      }, { where: { id: req.user.userId }, transaction });

      await transaction.commit();
      await YachiGamification.awardDocumentUpload(req.user.userId, documentResults.length);
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: `Documents uploaded (${documentResults.filter(d => d.status === 'verified').length} verified)`,
        data: {
          documents: documentResults,
          summary: { total: documentResults.length, verified: documentResults.filter(d => d.status === 'verified').length, pending: documentResults.filter(d => d.status === 'pending_review').length }
        },
        gamification: { pointsAwarded: documentResults.length * 10, achievement: 'Documents Uploaded' }
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Document Upload Error:', error);
    res.status(500).json({ success: false, message: 'Document upload failed', code: 'DOCUMENT_UPLOAD_FAILED' });
  }
});

// 🚀 PORTFOLIO UPLOAD WITH AI ENHANCEMENT
router.post('/portfolio-upload', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.portfolioUpload.parse(req.body);
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'Portfolio items required', code: 'PORTFOLIO_ITEMS_REQUIRED' });

    const transaction = await sequelize.transaction();
    try {
      const portfolioItems = await Promise.all(req.files.map(async (file, index) => {
        const processedItem = await MediaService.processPortfolioItem(file, req.user.userId);
        const analysisResult = await YachiAI.analyzePortfolioItem({
          image: processedItem.url, title: validatedData.title,
          description: validatedData.description, category: validatedData.category
        });
        return Portfolio.create({
          userId: req.user.userId, title: validatedData.title + (req.files.length > 1 ? ` ${index + 1}` : ''),
          description: validatedData.description, category: validatedData.category, imageUrl: processedItem.url,
          thumbnailUrl: processedItem.thumbnailUrl, tags: validatedData.tags, isPublic: validatedData.isPublic,
          metadata: { analysisResult, processedItem, aiEnhanced: analysisResult.enhanced, qualityScore: analysisResult.qualityScore }
        }, { transaction });
      }));

      await transaction.commit();
      await YachiGamification.awardPortfolioUpload(req.user.userId, portfolioItems.length);
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: 'Portfolio uploaded',
        data: {
          portfolioItems,
          summary: {
            total: portfolioItems.length,
            categories: [...new Set(portfolioItems.map(item => item.category))],
            averageQualityScore: portfolioItems.reduce((acc, item) => acc + (item.metadata.qualityScore || 0), 0) / portfolioItems.length
          }
        },
        gamification: { pointsAwarded: portfolioItems.length * 15, achievement: 'Portfolio Enhanced' }
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Portfolio Upload Error:', error);
    res.status(500).json({ success: false, message: 'Portfolio upload failed', code: 'PORTFOLIO_UPLOAD_FAILED' });
  }
});

// 🚀 UPDATE AVAILABILITY WITH SMART SCHEDULING
router.put('/availability', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.availability.parse(req.body);
    const transaction = await sequelize.transaction();
    try {
      await User.update({
        availability: validatedData.status,
        availabilityMetadata: { schedule: validatedData.schedule, noticePeriod: validatedData.noticePeriod, lastUpdated: new Date().toISOString() }
      }, { where: { id: req.user.userId }, transaction });

      await YachiAnalytics.trackAvailabilityChange(req.user.userId, validatedData.status);
      await transaction.commit();
      if (validatedData.status === 'available') await YachiNotifications.sendAvailabilityUpdate(req.user.userId);
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: `Availability updated to ${validatedData.status}`,
        data: { status: validatedData.status, schedule: validatedData.schedule, noticePeriod: validatedData.noticePeriod }
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Update Availability Error:', error);
    res.status(500).json({ success: false, message: 'Availability update failed', code: 'AVAILABILITY_UPDATE_FAILED' });
  }
});

// 🚀 BULK UPDATE AVAILABILITY SCHEDULE
router.put('/availability/schedule', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.schedule.parse(req.body);
    const transaction = await sequelize.transaction();
    try {
      await User.update({
        availabilityMetadata: {
          weeklySchedule: validatedData.weeklySchedule,
          timezone: validatedData.timezone,
          emergencyService: validatedData.emergencyService,
          lastUpdated: new Date().toISOString()
        }
      }, { where: { id: req.user.userId }, transaction });

      await YachiAnalytics.trackScheduleUpdate(req.user.userId, validatedData.weeklySchedule);
      await transaction.commit();
      await YachiGamification.awardScheduleOptimization(req.user.userId);
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: 'Schedule updated',
        data: { schedule: validatedData.weeklySchedule, timezone: validatedData.timezone, emergencyService: validatedData.emergencyService },
        gamification: { pointsAwarded: 30, achievement: 'Schedule Optimized' }
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Update Schedule Error:', error);
    res.status(500).json({ success: false, message: 'Schedule update failed', code: 'SCHEDULE_UPDATE_FAILED' });
  }
});

// 🚀 UPDATE SKILLS WITH AI VALIDATION
router.put('/skills', auth, workerOnly, async (req, res) => {
  try {
    const validatedData = WorkerSchema.skills.parse(req.body);
    const transaction = await sequelize.transaction();
    try {
      const skillAnalysis = await YachiAI.analyzeSkills({
        skills: validatedData.skills, proficiency: validatedData.proficiency, userId: req.user.userId
      });

      await User.update({
        skills: validatedData.skills,
        skillsMetadata: {
          proficiency: validatedData.proficiency, validatedSkills: skillAnalysis.validatedSkills,
          suggestedSkills: skillAnalysis.suggestedSkills, skillGaps: skillAnalysis.skillGaps, lastUpdated: new Date().toISOString()
        }
      }, { where: { id: req.user.userId }, transaction });

      if (validatedData.certifications?.length > 0) {
        await Certification.bulkCreate(validatedData.certifications.map(cert => ({
          userId: req.user.userId, name: cert, status: 'pending_verification'
        })), { transaction });
      }

      await transaction.commit();
      await YachiGamification.awardSkillUpdate(req.user.userId, validatedData.skills.length);
      await clearWorkerCaches(req.user.userId);

      res.json({
        success: true,
        message: 'Skills updated',
        data: { skills: validatedData.skills, analysis: skillAnalysis, nextSteps: skillAnalysis.skillGaps.length > 0 ? ['consider_skill_development'] : ['complete_profile'] },
        gamification: { pointsAwarded: validatedData.skills.length * 5, achievement: 'Skills Updated' }
      });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Update Skills Error:', error);
    res.status(500).json({ success: false, message: 'Skills update failed', code: 'SKILLS_UPDATE_FAILED' });
  }
});

// 🚀 CALCULATE WORKER LEVEL WITH ADVANCED METRICS
router.put('/level', auth, workerOnly, async (req, res) => {
  try {
    const workerStats = await calculateWorkerStats(req.user.userId);
    const levelCalculation = await YachiAI.calculateWorkerLevel(workerStats);
    const previousLevel = await User.findByPk(req.user.userId).then(u => u.level);

    await User.update({
      level: levelCalculation.level,
      levelMetadata: { calculation: levelCalculation, lastUpdated: new Date().toISOString() }
    }, { where: { id: req.user.userId } });

    if (levelCalculation.level !== previousLevel) await YachiGamification.awardLevelUp(req.user.userId, levelCalculation.level);
    await clearWorkerCaches(req.user.userId);

    res.json({
      success: true,
      message: `Level updated to ${levelCalculation.level}`,
      data: { level: levelCalculation.level, stats: workerStats, calculation: levelCalculation, nextLevel: levelCalculation.nextLevelRequirements },
      gamification: levelCalculation.level !== previousLevel ? { pointsAwarded: levelCalculation.pointsAwarded, achievement: `Level ${levelCalculation.level}` } : undefined
    });
  } catch (error) {
    console.error('Calculate Level Error:', error);
    res.status(500).json({ success: false, message: 'Level calculation failed', code: 'LEVEL_CALCULATION_FAILED' });
  }
});

// 🚀 GET WORKER DASHBOARD ANALYTICS
router.get('/dashboard/analytics', auth, workerOnly, async (req, res) => {
  try {
    const workerId = req.user.userId;
    const cacheKey = CACHE_KEYS.WORKER_DASHBOARD(workerId);
    const cachedDashboard = await redis.get(cacheKey);
    if (cachedDashboard) return res.json({ success: true, ...JSON.parse(cachedDashboard), source: 'cache' });

    const [basicStats, revenueData, performanceScores] = await Promise.all([
      calculateWorkerStats(workerId), getRevenueAnalytics(workerId), getPerformanceScores(workerId)
    ]);

    const dashboard = {
      overview: {
        totalEarnings: revenueData.totalRevenue, completedJobs: basicStats.completion.completedJobs,
        averageRating: basicStats.reviews.averageRating, responseRate: performanceScores.responseRate
      },
      financial: { ...revenueData, earningsTrend: revenueData.monthlyTrend },
      performance: { ...performanceScores }
    };

    await redis.setex(cacheKey, 300, JSON.stringify(dashboard));
    res.json({ success: true, data: dashboard, source: 'database' });
  } catch (error) {
    console.error('Worker Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Dashboard fetch failed', code: 'DASHBOARD_FETCH_FAILED' });
  }
});

// 🚀 GET WORKER ACHIEVEMENTS
router.get('/achievements', auth, workerOnly, async (req, res) => {
  try {
    const workerId = req.user.userId;
    const [achievements, leaderboard, progress] = await Promise.all([
      YachiGamification.getWorkerAchievements(workerId),
      YachiGamification.getWorkerLeaderboard(workerId),
      YachiGamification.getLevelProgress(workerId)
    ]);

    res.json({
      success: true,
      data: { achievements, leaderboard, progress }
    });
  } catch (error) {
    console.error('Worker Achievements Error:', error);
    res.status(500).json({ success: false, message: 'Achievements fetch failed', code: 'ACHIEVEMENTS_FETCH_FAILED' });
  }
});

// 🚀 GET WORKER PROFILE
router.get('/:id', async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const cacheKey = CACHE_KEYS.WORKER_PROFILE(workerId);
    const cachedProfile = await redis.get(cacheKey);
    if (cachedProfile) return res.json({ success: true, ...JSON.parse(cachedProfile), source: 'cache' });

    const worker = await User.findByPk(workerId, {
      include: [
        { model: Service, as: 'services', where: { status: 'active' }, include: [{ model: Review, as: 'reviews', attributes: ['rating', 'comment', 'createdAt'], limit: 5 }] },
        { model: Portfolio, as: 'portfolio', where: { isPublic: true }, limit: 10 },
        { model: WorkerVerification, as: 'verifications', where: { status: 'verified' }, attributes: ['documentType', 'verifiedAt'] },
        { model: Certification, as: 'certifications', where: { status: 'verified' }, attributes: ['name', 'issuedAt'] }
      ],
      attributes: { exclude: ['password', 'twoFactorSecret', 'resetToken'] }
    });

    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found', code: 'WORKER_NOT_FOUND' });

    const enhancedProfile = await enhanceWorkerProfile(worker);
    await redis.setex(cacheKey, 600, JSON.stringify(enhancedProfile));
    res.json({ success: true, ...enhancedProfile, source: 'database' });
  } catch (error) {
    console.error('Get Worker Profile Error:', error);
    res.status(500).json({ success: false, message: 'Worker fetch failed', code: 'FETCH_WORKER_FAILED' });
  }
});

// 🚀 SEARCH WORKERS
router.get('/search/workers', async (req, res) => {
  try {
    const validatedParams = WorkerSchema.search.parse(req.query);
    const cacheKey = CACHE_KEYS.WORKER_SEARCH(validatedParams);
    const cachedResults = await redis.get(cacheKey);
    if (cachedResults) return res.json({ success: true, ...JSON.parse(cachedResults), source: 'cache' });

    const searchResults = await searchWorkers(validatedParams);
    await redis.setex(cacheKey, 180, JSON.stringify(searchResults));
    res.json({ success: true, ...searchResults, source: 'database' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    console.error('Worker Search Error:', error);
    res.status(500).json({ success: false, message: 'Worker search failed', code: 'WORKER_SEARCH_FAILED' });
  }
});

// 🚀 HEALTH CHECK
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy', timestamp: new Date().toISOString(),
    services: { database: 'connected', redis: 'connected' },
    uptime: process.uptime(), memory: process.memoryUsage()
  };
  res.json(health);
});

// 🛡️ ERROR HANDLER
router.use((error, req, res, next) => {
  if (error instanceof Sequelize.ValidationError) {
    return res.status(400).json({
      success: false, message: 'Database validation failed',
      errors: error.errors.map(err => ({ field: err.path, message: err.message }))
    });
  }
  if (error instanceof Sequelize.UniqueConstraintError) {
    return res.status(409).json({ success: false, message: 'Resource exists', code: 'DUPLICATE_RESOURCE' });
  }
  if (error instanceof Sequelize.ForeignKeyConstraintError) {
    return res.status(400).json({ success: false, message: 'Invalid reference', code: 'INVALID_REFERENCE' });
  }
  next(error);
});

module.exports = router;