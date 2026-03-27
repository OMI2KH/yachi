const express = require('express');
const router = express.Router();
const { ConstructionProject, ProjectPhase, ProjectDocument, ProjectPayment } = require('../models');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const { constructionSchema, projectPhaseSchema, projectPaymentSchema } = require('../validations/construction');
const paymentService = require('../services/paymentService');

// Apply authentication to all routes
router.use(authenticate);

// ========== CONSTRUCTION PROJECT ROUTES ==========

// Get all projects for the authenticated user (contractor or client)
router.get('/projects', async (req, res, next) => {
  try {
    const { role, userId } = req.user;
    const { status, page = 1, limit = 10 } = req.query;
    
    let whereClause = {};
    
    // Filter by user role
    if (role === 'contractor') {
      whereClause.contractorId = userId;
    } else if (role === 'client') {
      whereClause.clientId = userId;
    }
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }
    
    const offset = (page - 1) * limit;
    
    const projects = await ConstructionProject.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: require('../models').User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: require('../models').User,
          as: 'contractor',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: ProjectPhase,
          as: 'phases',
          attributes: ['id', 'name', 'status', 'completionPercentage']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: projects.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: projects.count,
        pages: Math.ceil(projects.count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single project by ID
router.get('/projects/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    
    const project = await ConstructionProject.findOne({
      where: { id },
      include: [
        {
          model: require('../models').User,
          as: 'client',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: require('../models').User,
          as: 'contractor',
          attributes: ['id', 'name', 'email', 'phone', 'companyName', 'licenseNumber']
        },
        {
          model: ProjectPhase,
          as: 'phases',
          include: [
            {
              model: ProjectPayment,
              as: 'payments',
              attributes: ['id', 'amount', 'status', 'paymentMethod', 'transactionId', 'createdAt']
            }
          ]
        },
        {
          model: ProjectDocument,
          as: 'documents',
          attributes: ['id', 'name', 'type', 'url', 'uploadedBy', 'createdAt']
        }
      ]
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Check authorization
    if (project.clientId !== userId && project.contractorId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this project'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// Create new construction project (client only)
router.post('/projects', authorize(['client']), validate(constructionSchema), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const projectData = {
      ...req.body,
      clientId: userId,
      status: 'pending' // Initial status
    };
    
    const project = await ConstructionProject.create(projectData);
    
    // Create initial phases if provided
    if (req.body.phases && req.body.phases.length > 0) {
      const phases = req.body.phases.map(phase => ({
        ...phase,
        projectId: project.id,
        status: 'pending'
      }));
      await ProjectPhase.bulkCreate(phases);
    }
    
    // Send notification to contractor
    const contractor = await require('../models').User.findByPk(req.body.contractorId);
    if (contractor) {
      await require('../services/notificationService').sendProjectInvitation({
        to: contractor.email,
        projectName: project.name,
        clientName: req.user.name,
        projectId: project.id
      });
    }
    
    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Update project (client or contractor based on status)
router.put('/projects/:id', validate(constructionSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    
    const project = await ConstructionProject.findByPk(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Authorization check
    if (role === 'client' && project.clientId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this project'
      });
    }
    
    if (role === 'contractor' && project.contractorId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this project'
      });
    }
    
    // Status transition validation
    if (req.body.status) {
      const validTransitions = {
        pending: ['accepted', 'rejected'],
        accepted: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'on_hold', 'cancelled'],
        on_hold: ['in_progress', 'cancelled']
      };
      
      if (!validTransitions[project.status]?.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${project.status} to ${req.body.status}`
        });
      }
      
      // If contractor accepts project
      if (req.body.status === 'accepted' && role === 'contractor') {
        // Create initial payment for advance if required
        if (req.body.advancePercentage && req.body.totalBudget) {
          const advanceAmount = (req.body.totalBudget * req.body.advancePercentage) / 100;
          await ProjectPayment.create({
            projectId: project.id,
            phaseId: null, // General project advance
            amount: advanceAmount,
            description: 'Project advance payment',
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          });
        }
      }
    }
    
    await project.update(req.body);
    
    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ========== PROJECT PHASE ROUTES ==========

// Get phases for a project
router.get('/projects/:projectId/phases', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.user;
    
    // Verify project access
    const project = await ConstructionProject.findByPk(projectId);
    if (!project || (project.clientId !== userId && project.contractorId !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access phases'
      });
    }
    
    const phases = await ProjectPhase.findAll({
      where: { projectId },
      include: [
        {
          model: ProjectPayment,
          as: 'payments',
          attributes: ['id', 'amount', 'status', 'paymentMethod', 'paidAt']
        }
      ],
      order: [['order', 'ASC']]
    });
    
    res.json({
      success: true,
      data: phases
    });
  } catch (error) {
    next(error);
  }
});

// Create new phase for a project (contractor only)
router.post('/projects/:projectId/phases', authorize(['contractor']), validate(projectPhaseSchema), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.user;
    
    // Verify project and authorization
    const project = await ConstructionProject.findByPk(projectId);
    if (!project || project.contractorId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add phases'
      });
    }
    
    const phase = await ProjectPhase.create({
      ...req.body,
      projectId,
      status: 'pending'
    });
    
    // Create associated payment if phase has budget
    if (req.body.budget) {
      await ProjectPayment.create({
        projectId,
        phaseId: phase.id,
        amount: req.body.budget,
        description: `Payment for phase: ${phase.name}`,
        status: 'pending',
        dueDate: req.body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
      });
    }
    
    res.status(201).json({
      success: true,
      data: phase,
      message: 'Phase created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Update phase
router.put('/phases/:id', validate(projectPhaseSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    
    const phase = await ProjectPhase.findByPk(id, {
      include: [{
        model: ConstructionProject,
        as: 'project'
      }]
    });
    
    if (!phase) {
      return res.status(404).json({
        success: false,
        error: 'Phase not found'
      });
    }
    
    // Authorization check
    const project = phase.project;
    if (role === 'client' && project.clientId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this phase'
      });
    }
    
    if (role === 'contractor' && project.contractorId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this phase'
      });
    }
    
    // Update completion percentage and trigger payments
    if (req.body.completionPercentage !== undefined) {
      const oldCompletion = phase.completionPercentage;
      
      // If phase reaches 100%, mark as completed
      if (req.body.completionPercentage >= 100 && oldCompletion < 100) {
        req.body.status = 'completed';
        
        // Trigger final payment
        const payment = await ProjectPayment.findOne({
          where: { phaseId: phase.id, status: 'pending' }
        });
        
        if (payment) {
          payment.status = 'due';
          await payment.save();
          
          // Send payment notification to client
          await require('../services/notificationService').sendPaymentDue({
            to: (await project.getClient()).email,
            phaseName: phase.name,
            amount: payment.amount,
            paymentId: payment.id
          });
        }
      }
    }
    
    await phase.update(req.body);
    
    res.json({
      success: true,
      data: phase,
      message: 'Phase updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ========== PAYMENT ROUTES ==========

// Get payments for a project
router.get('/projects/:projectId/payments', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.user;
    
    // Verify project access
    const project = await ConstructionProject.findByPk(projectId);
    if (!project || (project.clientId !== userId && project.contractorId !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access payments'
      });
    }
    
    const payments = await ProjectPayment.findAll({
      where: { projectId },
      include: [
        {
          model: ProjectPhase,
          as: 'phase',
          attributes: ['id', 'name']
        }
      ],
      order: [['dueDate', 'ASC']]
    });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

// Initiate payment for a specific payment record (client only)
router.post('/payments/:paymentId/initiate', authorize(['client']), async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { userId } = req.user;
    const { paymentMethodId, provider = 'chapa' } = req.body;
    
    // Get payment and verify authorization
    const payment = await ProjectPayment.findByPk(paymentId, {
      include: [{
        model: ConstructionProject,
        as: 'project',
        include: [
          { model: require('../models').User, as: 'client' },
          { model: require('../models').User, as: 'contractor' }
        ]
      }]
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    if (payment.project.clientId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to initiate this payment'
      });
    }
    
    if (payment.status !== 'due' && payment.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: `Payment cannot be initiated. Current status: ${payment.status}`
      });
    }
    
    // Get user's payment method
    let paymentMethod;
    if (paymentMethodId) {
      paymentMethod = await require('../models').PaymentMethod.findOne({
        where: { id: paymentMethodId, userId, isActive: true }
      });
      
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method'
        });
      }
    }
    
    // Generate unique transaction reference
    const txRef = `CONST-${paymentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare payment metadata
    const metadata = {
      paymentId,
      projectId: payment.projectId,
      phaseId: payment.phaseId,
      clientId: userId,
      contractorId: payment.project.contractorId,
      description: payment.description
    };
    
    // Initiate payment based on provider
    const paymentResult = await paymentService.initiatePayment({
      amount: payment.amount,
      currency: 'ETB',
      provider,
      txRef,
      customer: {
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone
      },
      metadata,
      returnUrl: `${process.env.FRONTEND_URL}/projects/${payment.projectId}/payments/callback`,
      paymentMethod: paymentMethod ? {
        type: paymentMethod.methodType,
        token: paymentMethod.token,
        provider: paymentMethod.provider
      } : null
    });
    
    // Update payment record
    await payment.update({
      status: 'processing',
      transactionId: txRef,
      paymentMethod: provider,
      paymentData: paymentResult
    });
    
    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        currency: 'ETB',
        provider,
        checkoutUrl: paymentResult.checkoutUrl,
        transactionId: txRef,
        expiresAt: paymentResult.expiresAt
      },
      message: 'Payment initiated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Payment webhook callback (for Ethiopian payment providers)
router.post('/payments/webhook/:provider', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const { provider } = req.params;
    const signature = req.headers['x-chapa-signature'] || 
                     req.headers['x-telebirr-signature'] || 
                     req.headers['x-cbe-signature'];
    
    // Verify webhook signature
    const isValid = await paymentService.verifyWebhookSignature(
      provider,
      req.body,
      signature
    );
    
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    
    const webhookData = JSON.parse(req.body.toString());
    const { tx_ref, status, amount, currency } = webhookData;
    
    // Extract paymentId from transaction reference
    const paymentId = tx_ref.split('-')[1];
    
    const payment = await ProjectPayment.findByPk(paymentId, {
      include: [{
        model: ConstructionProject,
        as: 'project'
      }]
    });
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    // Update payment status
    let paymentStatus;
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        paymentStatus = 'completed';
        payment.paidAt = new Date();
        break;
      case 'failed':
      case 'cancelled':
        paymentStatus = 'failed';
        break;
      default:
        paymentStatus = 'processing';
    }
    
    await payment.update({
      status: paymentStatus,
      transactionData: webhookData
    });
    
    // Send notifications
    if (paymentStatus === 'completed') {
      // Notify contractor
      await require('../services/notificationService').sendPaymentReceived({
        to: (await payment.project.getContractor()).email,
        amount: payment.amount,
        paymentId: payment.id,
        projectName: payment.project.name
      });
      
      // If this is a phase payment, update phase status
      if (payment.phaseId) {
        const phase = await ProjectPhase.findByPk(payment.phaseId);
        if (phase) {
          phase.status = 'paid';
          await phase.save();
        }
      }
    }
    
    res.json({ success: true, received: true });
  } catch (error) {
    next(error);
  }
});

// Check payment status
router.get('/payments/:paymentId/status', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { userId } = req.user;
    
    const payment = await ProjectPayment.findByPk(paymentId, {
      include: [{
        model: ConstructionProject,
        as: 'project'
      }]
    });
    
    if (!payment || (payment.project.clientId !== userId && payment.project.contractorId !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to check payment status'
      });
    }
    
    // If payment is processing, verify with payment service
    if (payment.status === 'processing' && payment.transactionId) {
      const status = await paymentService.verifyPayment(
        payment.transactionId,
        payment.paymentMethod
      );
      
      if (status !== payment.status) {
        await payment.update({ status });
      }
    }
    
    res.json({
      success: true,
      data: {
        id: payment.id,
        amount: payment.amount,
        currency: 'ETB',
        status: payment.status,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        paymentMethod: payment.paymentMethod
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========== DOCUMENT ROUTES ==========

// Upload project document
router.post('/projects/:projectId/documents', 
  require('../middlewares/upload').upload.single('document'),
  async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { userId, role } = req.user;
      
      // Verify project access
      const project = await ConstructionProject.findByPk(projectId);
      if (!project || (project.clientId !== userId && project.contractorId !== userId)) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to upload documents'
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      const document = await ProjectDocument.create({
        projectId,
        name: req.body.name || req.file.originalname,
        type: req.file.mimetype,
        url: req.file.path, // This should be the cloud storage URL
        size: req.file.size,
        uploadedBy: userId,
        metadata: {
          originalName: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype
        }
      });
      
      res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get project documents
router.get('/projects/:projectId/documents', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.user;
    
    // Verify project access
    const project = await ConstructionProject.findByPk(projectId);
    if (!project || (project.clientId !== userId && project.contractorId !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view documents'
      });
    }
    
    const documents = await ProjectDocument.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    next(error);
  }
});

// ========== DASHBOARD & ANALYTICS ==========

// Get construction dashboard statistics
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    
    let whereClause = {};
    if (role === 'contractor') {
      whereClause.contractorId = userId;
    } else if (role === 'client') {
      whereClause.clientId = userId;
    }
    
    // Get project counts by status
    const projectCounts = await ConstructionProject.findAll({
      where: whereClause,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status']
    });
    
    // Get total payments
    const payments = await ProjectPayment.findAll({
      include: [{
        model: ConstructionProject,
        as: 'project',
        where: whereClause,
        attributes: []
      }],
      attributes: [
        'status',
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      group: ['status']
    });
    
    // Get recent activities
    const recentProjects = await ConstructionProject.findAll({
      where: whereClause,
      limit: 5,
      order: [['updatedAt', 'DESC']],
      attributes: ['id', 'name', 'status', 'updatedAt']
    });
    
    res.json({
      success: true,
      data: {
        projectStats: projectCounts.reduce((acc, curr) => {
          acc[curr.status] = parseInt(curr.dataValues.count);
          return acc;
        }, {}),
        paymentStats: payments.reduce((acc, curr) => {
          acc[curr.status] = parseFloat(curr.dataValues.total) || 0;
          return acc;
        }, {}),
        recentProjects
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;