const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Project = require('../models/Project');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all projects with filtering
router.get('/', [
  query('category').optional().isString(),
  query('status').optional().isIn(['draft', 'active', 'funded', 'completed', 'cancelled']),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['createdAt', 'targetAmount', 'deadline', 'backersCount']),
  query('order').optional().isIn(['asc', 'desc']).default('desc'),
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 100 }).default(20),
  validate
], async (req, res) => {
  try {
    const {
      category,
      status,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (minAmount || maxAmount) {
      where.targetAmount = {};
      if (minAmount) where.targetAmount.$gte = parseFloat(minAmount);
      if (maxAmount) where.targetAmount.$lte = parseFloat(maxAmount);
    }

    const { rows: projects, count } = await Project.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'profilePicture']
        }
      ],
      order: [[sortBy, order]],
      limit,
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single project
router.get('/:id', [
  param('id').isInt({ min: 1 }),
  validate
], async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'profilePicture', 'bio']
        },
        {
          model: Transaction,
          as: 'transactions',
          attributes: ['id', 'amount', 'status', 'createdAt'],
          include: [{
            model: User,
            as: 'backer',
            attributes: ['id', 'name', 'profilePicture']
          }],
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Calculate funding progress
    const totalRaised = await Transaction.sum('amount', {
      where: { projectId: project.id, status: 'success' }
    }) || 0;

    const progress = (totalRaised / project.targetAmount) * 100;

    res.json({
      success: true,
      data: {
        ...project.toJSON(),
        totalRaised,
        progress: Math.min(progress, 100),
        backersCount: await Transaction.count({
          where: { projectId: project.id, status: 'success' },
          distinct: true,
          col: 'userId'
        })
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new project
router.post('/', [
  auth,
  role(['creator', 'admin']),
  body('title').isString().trim().isLength({ min: 5, max: 200 }),
  body('description').isString().trim().isLength({ min: 50, max: 5000 }),
  body('shortDescription').isString().trim().isLength({ min: 20, max: 200 }),
  body('targetAmount').isFloat({ min: 1000 }).withMessage('Minimum target amount is 1000 ETB'),
  body('deadline').isISO8601().custom(value => {
    const deadline = new Date(value);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7); // Minimum 7 days from now
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6); // Maximum 6 months from now
    
    if (deadline < minDate) {
      throw new Error('Deadline must be at least 7 days from now');
    }
    if (deadline > maxDate) {
      throw new Error('Deadline cannot be more than 6 months from now');
    }
    return true;
  }),
  body('category').isIn([
    'technology', 'arts', 'food', 'fashion', 
    'health', 'education', 'environment', 'community'
  ]),
  body('images').optional().isArray(),
  body('risksAndChallenges').optional().isString(),
  body('rewards').optional().isArray(),
  validate
], async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      creatorId: req.user.id,
      currency: 'ETB', // Force ETB currency for Ethiopian platform
      status: 'draft'
    };

    const project = await Project.create(projectData);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update project
router.put('/:id', [
  auth,
  param('id').isInt({ min: 1 }),
  body('title').optional().isString().trim().isLength({ min: 5, max: 200 }),
  body('description').optional().isString().trim().isLength({ min: 50, max: 5000 }),
  body('targetAmount').optional().isFloat({ min: 1000 }),
  body('deadline').optional().isISO8601(),
  body('status').optional().isIn(['draft', 'active', 'cancelled']),
  validate
], async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check ownership or admin role
    if (project.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Prevent updates if project is funded or completed
    if (['funded', 'completed'].includes(project.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update a funded or completed project' 
      });
    }

    // If changing status to active, validate required fields
    if (req.body.status === 'active') {
      if (project.status === 'draft') {
        const requiredFields = ['title', 'description', 'targetAmount', 'deadline'];
        const missingFields = requiredFields.filter(field => !project[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missingFields.join(', ')}`
          });
        }
      }
    }

    await project.update(req.body);

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Back a project (make payment)
router.post('/:id/back', [
  auth,
  param('id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 50 }).withMessage('Minimum backing amount is 50 ETB'),
  body('paymentMethodId').optional().isInt({ min: 1 }),
  body('provider').isIn(['chapa', 'telebirr', 'cbe_birr']).withMessage('Invalid payment provider'),
  body('phoneNumber').optional().isString(),
  body('email').optional().isEmail(),
  validate
], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const project = await Project.findByPk(req.params.id, { transaction });

    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!['active', 'funded'].includes(project.status)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Project is not accepting backing' 
      });
    }

    if (project.creatorId === req.user.id) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot back your own project' 
      });
    }

    const { amount, provider, paymentMethodId, phoneNumber, email } = req.body;

    // Check if project deadline hasn't passed
    if (new Date() > new Date(project.deadline)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Project funding deadline has passed' 
      });
    }

    // Initialize payment with Ethiopian provider
    const paymentData = {
      amount,
      currency: 'ETB',
      provider,
      userId: req.user.id,
      projectId: project.id,
      phoneNumber: phoneNumber || req.user.phoneNumber,
      email: email || req.user.email,
      metadata: {
        projectTitle: project.title,
        backerName: req.user.name
      }
    };

    // Initiate payment
    const paymentResult = await paymentService.initializePayment(paymentData);

    // Create transaction record
    const dbTransaction = await Transaction.create({
      userId: req.user.id,
      projectId: project.id,
      amount,
      currency: 'ETB',
      provider,
      status: 'pending',
      paymentReference: paymentResult.reference,
      paymentUrl: paymentResult.paymentUrl,
      metadata: {
        providerResponse: paymentResult,
        phoneNumber,
        paymentMethodId
      }
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        transaction: dbTransaction,
        paymentUrl: paymentResult.paymentUrl,
        reference: paymentResult.reference
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Back project error:', error);
    
    if (error.message.includes('payment')) {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get project backers
router.get('/:id/backers', [
  param('id').isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 100 }).default(20),
  validate
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where: { 
        projectId: req.params.id,
        status: 'success'
      },
      include: [{
        model: User,
        as: 'backer',
        attributes: ['id', 'name', 'profilePicture']
      }],
      order: [['amount', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    // Aggregate total by backer
    const backersMap = new Map();
    transactions.forEach(txn => {
      const backerId = txn.backer.id;
      if (!backersMap.has(backerId)) {
        backersMap.set(backerId, {
          user: txn.backer,
          totalAmount: 0,
          transactionCount: 0,
          firstBackedAt: txn.createdAt,
          lastBackedAt: txn.createdAt
        });
      }
      
      const backer = backersMap.get(backerId);
      backer.totalAmount += txn.amount;
      backer.transactionCount += 1;
      if (txn.createdAt < backer.firstBackedAt) backer.firstBackedAt = txn.createdAt;
      if (txn.createdAt > backer.lastBackedAt) backer.lastBackedAt = txn.createdAt;
    });

    const backers = Array.from(backersMap.values());

    res.json({
      success: true,
      data: backers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get backers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update project status (admin/creator)
router.patch('/:id/status', [
  auth,
  role(['creator', 'admin']),
  param('id').isInt({ min: 1 }),
  body('status').isIn(['active', 'cancelled', 'completed']),
  body('reason').optional().isString(),
  validate
], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const project = await Project.findByPk(req.params.id, { transaction });

    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check authorization
    if (project.creatorId !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { status, reason } = req.body;

    // Validate status transitions
    const validTransitions = {
      draft: ['active', 'cancelled'],
      active: ['funded', 'cancelled', 'completed'],
      funded: ['completed'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[project.status]?.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${project.status} to ${status}` 
      });
    }

    // Check funding status if marking as completed
    if (status === 'completed') {
      const totalRaised = await Transaction.sum('amount', {
        where: { projectId: project.id, status: 'success' },
        transaction
      }) || 0;

      if (totalRaised < project.targetAmount) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot complete project that hasn\'t reached funding goal' 
        });
      }
    }

    await project.update({ status }, { transaction });

    // Log status change
    await project.createAuditLog({
      action: 'status_change',
      oldValue: project.status,
      newValue: status,
      reason,
      performedBy: req.user.id,
      metadata: req.body
    }, { transaction });

    // Notify backers if project is cancelled or completed
    if (['cancelled', 'completed'].includes(status)) {
      const backers = await Transaction.findAll({
        where: { 
          projectId: project.id,
          status: 'success'
        },
        include: [{ model: User, as: 'backer' }],
        transaction
      });

      for (const txn of backers) {
        await notificationService.sendProjectStatusUpdate({
          userId: txn.backer.id,
          projectId: project.id,
          projectTitle: project.title,
          oldStatus: project.status,
          newStatus: status,
          reason
        });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Project status updated to ${status}`,
      data: project
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get project statistics
router.get('/:id/stats', [
  param('id').isInt({ min: 1 }),
  validate
], async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const [
      totalRaised,
      backersCount,
      transactionCount,
      averagePledge,
      dailyFunding
    ] = await Promise.all([
      Transaction.sum('amount', {
        where: { projectId: project.id, status: 'success' }
      }) || 0,
      Transaction.count({
        where: { projectId: project.id, status: 'success' },
        distinct: true,
        col: 'userId'
      }),
      Transaction.count({
        where: { projectId: project.id, status: 'success' }
      }),
      Transaction.findOne({
        where: { projectId: project.id, status: 'success' },
        attributes: [[sequelize.fn('AVG', sequelize.col('amount')), 'average']],
        raw: true
      }),
      Transaction.findAll({
        where: { 
          projectId: project.id,
          status: 'success',
          createdAt: {
            [sequelize.Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true
      })
    ]);

    const daysRemaining = Math.max(0, Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24)));
    const fundingNeeded = Math.max(0, project.targetAmount - totalRaised);
    const progress = (totalRaised / project.targetAmount) * 100;

    res.json({
      success: true,
      data: {
        totalRaised,
        targetAmount: project.targetAmount,
        fundingNeeded,
        progress: Math.min(progress, 100),
        backersCount,
        transactionCount,
        averagePledge: parseFloat(averagePledge?.average || 0),
        daysRemaining,
        fundingRatePerDay: daysRemaining > 0 ? fundingNeeded / daysRemaining : 0,
        dailyFunding,
        currency: 'ETB'
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's projects
router.get('/user/:userId', [
  param('userId').isInt({ min: 1 }),
  query('status').optional().isString(),
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 50 }).default(10),
  validate
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = { creatorId: userId };
    if (status) where.status = status;

    const { rows: projects, count } = await Project.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    // Calculate funding stats for each project
    const projectsWithStats = await Promise.all(projects.map(async (project) => {
      const totalRaised = await Transaction.sum('amount', {
        where: { projectId: project.id, status: 'success' }
      }) || 0;

      return {
        ...project.toJSON(),
        totalRaised,
        progress: (totalRaised / project.targetAmount) * 100,
        backersCount: await Transaction.count({
          where: { projectId: project.id, status: 'success' },
          distinct: true,
          col: 'userId'
        })
      };
    }));

    res.json({
      success: true,
      data: projectsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;