const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { sequelize } = require('../models');
const { Op } = require('sequelize');

// Models
const { User, Transaction, PaymentMethod, TaxRecord, Business } = require('../models');

// Services
const taxService = require('../services/taxService');
const reportingService = require('../services/reportingService');
const auditService = require('../services/auditService');

/**
 * @route   GET /api/government/dashboard
 * @desc    Get government dashboard statistics
 * @access  Private (Government Admin only)
 */
router.get(
  '/dashboard',
  auth,
  role(['government_admin', 'super_admin']),
  async (req, res) => {
    try {
      const {
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate = new Date(),
        region,
        city
      } = req.query;

      // Get dashboard statistics
      const stats = await reportingService.getGovernmentDashboardStats({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        region,
        city
      });

      // Get recent high-value transactions
      const recentTransactions = await Transaction.findAll({
        where: {
          status: 'completed',
          amount: {
            [Op.gte]: 100000 // Transactions over 100,000 ETB
          },
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'tin', 'businessName'],
            include: [
              {
                model: Business,
                as: 'business',
                attributes: ['id', 'name', 'sector', 'registrationNumber']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Get tax compliance rate
      const complianceRate = await taxService.calculateTaxComplianceRate({
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      res.json({
        success: true,
        data: {
          ...stats,
          recentTransactions,
          complianceRate,
          dateRange: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      console.error('Government dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/government/tax-records
 * @desc    Get tax records with filtering
 * @access  Private (Government Admin only)
 */
router.get(
  '/tax-records',
  auth,
  role(['government_admin', 'super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['paid', 'pending', 'overdue', 'exempt']),
    query('tin').optional().isString().trim(),
    query('businessName').optional().isString().trim(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('region').optional().isString().trim(),
    query('minAmount').optional().isFloat({ min: 0 }).toFloat(),
    query('maxAmount').optional().isFloat({ min: 0 }).toFloat()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        tin,
        businessName,
        startDate,
        endDate,
        region,
        minAmount,
        maxAmount
      } = req.query;

      const offset = (page - 1) * limit;

      // Build filter conditions
      const where = {};
      
      if (status) where.status = status;
      if (tin) where.tin = { [Op.iLike]: `%${tin}%` };
      if (businessName) where.businessName = { [Op.iLike]: `%${businessName}%` };
      if (region) where.region = region;
      
      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Amount range filter
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount[Op.gte] = minAmount;
        if (maxAmount) where.amount[Op.lte] = maxAmount;
      }

      const { rows: taxRecords, count } = await TaxRecord.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'taxpayer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'businessName']
          },
          {
            model: Transaction,
            as: 'payment',
            attributes: ['id', 'amount', 'currency', 'status', 'createdAt'],
            required: false
          }
        ],
        order: [['dueDate', 'ASC']],
        limit,
        offset,
        distinct: true
      });

      res.json({
        success: true,
        data: {
          taxRecords,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            totalRecords: count
          }
        }
      });
    } catch (error) {
      console.error('Tax records fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/government/tax-records
 * @desc    Create or update tax records in bulk (e.g., from ERP system)
 * @access  Private (Government Admin only)
 */
router.post(
  '/tax-records/bulk',
  auth,
  role(['government_admin', 'super_admin']),
  [
    body('records').isArray().withMessage('Records must be an array'),
    body('records.*.tin').isString().notEmpty().withMessage('TIN is required'),
    body('records.*.taxYear').isInt({ min: 2020, max: 2100 }).withMessage('Valid tax year required'),
    body('records.*.taxType').isIn(['income', 'vat', 'payroll', 'withholding', 'excise']).withMessage('Valid tax type required'),
    body('records.*.amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('records.*.dueDate').isISO8601().toDate().withMessage('Valid due date required'),
    body('records.*.period').isString().notEmpty().withMessage('Tax period is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { records } = req.body;
      const transaction = await sequelize.transaction();

      try {
        const createdRecords = [];
        const updatedRecords = [];

        for (const recordData of records) {
          const { tin, taxYear, taxType, period, ...rest } = recordData;
          
          // Find or create tax record
          const [taxRecord, created] = await TaxRecord.findOrCreate({
            where: {
              tin,
              taxYear,
              taxType,
              period
            },
            defaults: {
              ...rest,
              tin,
              taxYear,
              taxType,
              period,
              createdBy: req.user.id
            },
            transaction
          });

          if (!created) {
            // Update existing record
            await taxRecord.update({
              ...rest,
              updatedBy: req.user.id
            }, { transaction });
            updatedRecords.push(taxRecord);
          } else {
            createdRecords.push(taxRecord);
          }
        }

        await transaction.commit();

        // Log audit trail
        await auditService.logAction({
          userId: req.user.id,
          action: 'BULK_TAX_RECORD_UPDATE',
          entityType: 'TaxRecord',
          description: `Bulk update: ${createdRecords.length} created, ${updatedRecords.length} updated`,
          metadata: {
            createdCount: createdRecords.length,
            updatedCount: updatedRecords.length,
            totalRecords: records.length
          }
        });

        res.json({
          success: true,
          data: {
            created: createdRecords,
            updated: updatedRecords,
            summary: {
              totalProcessed: records.length,
              created: createdRecords.length,
              updated: updatedRecords.length
            }
          }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Bulk tax record error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process tax records',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/government/transactions
 * @desc    Get all transactions with detailed filtering
 * @access  Private (Government Admin only)
 */
router.get(
  '/transactions',
  auth,
  role(['government_admin', 'super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded']),
    query('provider').optional().isIn(['chapa', 'telebirr', 'cbe_birr']),
    query('minAmount').optional().isFloat({ min: 0 }).toFloat(),
    query('maxAmount').optional().isFloat({ min: 0 }).toFloat(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('reference').optional().isString().trim(),
    query('tin').optional().isString().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        provider,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        reference,
        tin
      } = req.query;

      const offset = (page - 1) * limit;

      // Build filter conditions
      const where = {};
      const userWhere = {};
      
      if (status) where.status = status;
      if (provider) where.provider = provider;
      if (reference) where.reference = { [Op.iLike]: `%${reference}%` };
      if (tin) userWhere.tin = { [Op.iLike]: `%${tin}%` };
      
      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Amount range filter
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount[Op.gte] = minAmount;
        if (maxAmount) where.amount[Op.lte] = maxAmount;
      }

      const { rows: transactions, count } = await Transaction.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'tin', 'businessName', 'email', 'phone'],
            where: userWhere
          },
          {
            model: PaymentMethod,
            as: 'paymentMethod',
            attributes: ['id', 'provider', 'methodType', 'lastFour']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      // Calculate totals
      const totalQuery = await Transaction.sum('amount', {
        where,
        include: [
          {
            model: User,
            as: 'user',
            where: userWhere
          }
        ]
      });

      const completedQuery = await Transaction.sum('amount', {
        where: { ...where, status: 'completed' },
        include: [
          {
            model: User,
            as: 'user',
            where: userWhere
          }
        ]
      });

      res.json({
        success: true,
        data: {
          transactions,
          summary: {
            totalAmount: totalQuery || 0,
            completedAmount: completedQuery || 0,
            transactionCount: count
          },
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            totalRecords: count
          }
        }
      });
    } catch (error) {
      console.error('Transactions fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/government/analytics/revenue
 * @desc    Get revenue analytics data
 * @access  Private (Government Admin only)
 */
router.get(
  '/analytics/revenue',
  auth,
  role(['government_admin', 'super_admin']),
  [
    query('groupBy').optional().isIn(['daily', 'weekly', 'monthly', 'yearly', 'provider', 'taxType', 'region']),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { 
        groupBy = 'monthly', 
        startDate = new Date(new Date().getFullYear(), 0, 1), // Start of current year
        endDate = new Date() 
      } = req.query;

      const analytics = await reportingService.getRevenueAnalytics({
        groupBy,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Revenue analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate revenue analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/government/taxpayers
 * @desc    Get taxpayer directory with search and filtering
 * @access  Private (Government Admin only)
 */
router.get(
  '/taxpayers',
  auth,
  role(['government_admin', 'super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('taxpayerType').optional().isIn(['individual', 'business', 'government']),
    query('sector').optional().isString().trim(),
    query('region').optional().isString().trim(),
    query('complianceStatus').optional().isIn(['compliant', 'non_compliant', 'at_risk'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        page = 1,
        limit = 20,
        search,
        taxpayerType,
        sector,
        region,
        complianceStatus
      } = req.query;

      const offset = (page - 1) * limit;

      // Build filter conditions
      const where = {};
      const include = [];
      
      if (taxpayerType) where.taxpayerType = taxpayerType;
      if (sector) where.sector = sector;
      if (region) where.region = region;
      
      // Search across multiple fields
      if (search) {
        where[Op.or] = [
          { tin: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { businessName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { rows: taxpayers, count } = await User.findAndCountAll({
        where,
        include: [
          {
            model: Business,
            as: 'business',
            attributes: ['id', 'name', 'registrationDate', 'sector', 'employeeCount']
          },
          {
            model: TaxRecord,
            as: 'taxRecords',
            attributes: ['id', 'taxType', 'amount', 'status', 'dueDate'],
            required: false
          }
        ],
        attributes: [
          'id', 'tin', 'firstName', 'lastName', 'businessName', 
          'email', 'phone', 'taxpayerType', 'sector', 'region',
          'createdAt', 'lastTaxPaymentDate', 'taxComplianceScore'
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      // Calculate compliance status for each taxpayer
      const taxpayersWithCompliance = taxpayers.map(taxpayer => {
        const taxRecords = taxpayer.taxRecords || [];
        const overdueRecords = taxRecords.filter(record => 
          record.status === 'overdue'
        );
        const totalTaxAmount = taxRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
        
        let compliance = 'compliant';
        if (overdueRecords.length > 0) {
          compliance = 'non_compliant';
        } else if (taxRecords.length === 0) {
          compliance = 'unknown';
        }

        return {
          ...taxpayer.toJSON(),
          complianceStatus: compliance,
          totalTaxAmount,
          overdueCount: overdueRecords.length,
          totalRecords: taxRecords.length
        };
      });

      // Filter by compliance status if specified
      let filteredTaxpayers = taxpayersWithCompliance;
      if (complianceStatus) {
        filteredTaxpayers = taxpayersWithCompliance.filter(
          taxpayer => taxpayer.complianceStatus === complianceStatus
        );
      }

      res.json({
        success: true,
        data: {
          taxpayers: filteredTaxpayers,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            totalRecords: count
          }
        }
      });
    } catch (error) {
      console.error('Taxpayers fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/government/taxpayers/:tin
 * @desc    Get detailed taxpayer profile
 * @access  Private (Government Admin only)
 */
router.get(
  '/taxpayers/:tin',
  auth,
  role(['government_admin', 'super_admin']),
  [
    param('tin').isString().notEmpty().withMessage('TIN is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { tin } = req.params;

      const taxpayer = await User.findOne({
        where: { tin },
        include: [
          {
            model: Business,
            as: 'business',
            attributes: [
              'id', 'name', 'registrationNumber', 'registrationDate',
              'sector', 'subSector', 'employeeCount', 'annualRevenue',
              'address', 'city', 'region', 'website', 'contactPerson'
            ]
          },
          {
            model: TaxRecord,
            as: 'taxRecords',
            attributes: [
              'id', 'taxType', 'taxYear', 'period', 'amount', 
              'status', 'dueDate', 'paidDate', 'penaltyAmount',
              'interestAmount', 'createdAt'
            ],
            order: [['taxYear', 'DESC'], ['period', 'DESC']],
            limit: 12
          },
          {
            model: Transaction,
            as: 'transactions',
            attributes: [
              'id', 'amount', 'currency', 'status', 'provider',
              'reference', 'description', 'createdAt'
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
          },
          {
            model: PaymentMethod,
            as: 'paymentMethods',
            attributes: ['id', 'provider', 'methodType', 'isDefault', 'lastFour', 'createdAt']
          }
        ]
      });

      if (!taxpayer) {
        return res.status(404).json({
          success: false,
          message: 'Taxpayer not found'
        });
      }

      // Calculate compliance metrics
      const taxRecords = taxpayer.taxRecords || [];
      const currentYear = new Date().getFullYear();
      
      const currentYearRecords = taxRecords.filter(record => record.taxYear === currentYear);
      const overdueRecords = taxRecords.filter(record => record.status === 'overdue');
      const paidRecords = taxRecords.filter(record => record.status === 'paid');
      
      const totalTaxLiability = taxRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
      const totalTaxPaid = paidRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
      const totalPenalties = taxRecords.reduce((sum, record) => sum + (record.penaltyAmount || 0), 0);
      const totalInterest = taxRecords.reduce((sum, record) => sum + (record.interestAmount || 0), 0);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'VIEW_TAXPAYER_PROFILE',
        entityType: 'User',
        entityId: taxpayer.id,
        description: `Viewed taxpayer profile for TIN: ${tin}`,
        metadata: {
          tin,
          taxpayerName: taxpayer.businessName || `${taxpayer.firstName} ${taxpayer.lastName}`
        }
      });

      res.json({
        success: true,
        data: {
          taxpayer,
          complianceMetrics: {
            currentYearRecords: currentYearRecords.length,
            overdueRecords: overdueRecords.length,
            paidRecords: paidRecords.length,
            totalRecords: taxRecords.length,
            totalTaxLiability,
            totalTaxPaid,
            totalPenalties,
            totalInterest,
            complianceRate: taxRecords.length > 0 ? (paidRecords.length / taxRecords.length) * 100 : 0
          }
        }
      });
    } catch (error) {
      console.error('Taxpayer profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/government/notifications
 * @desc    Send notifications to taxpayers (e.g., tax due reminders)
 * @access  Private (Government Admin only)
 */
router.post(
  '/notifications',
  auth,
  role(['government_admin', 'super_admin']),
  [
    body('type').isIn(['tax_due_reminder', 'compliance_alert', 'system_update', 'announcement']),
    body('message').isString().notEmpty().trim(),
    body('recipients').optional().isIn(['all', 'overdue', 'specific']),
    body('recipientTins').optional().isArray(),
    body('recipientTins.*').optional().isString().trim(),
    body('scheduleAt').optional().isISO8601().toDate(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        type,
        message,
        recipients = 'all',
        recipientTins = [],
        scheduleAt,
        priority = 'medium'
      } = req.body;

      // Build recipient query
      let where = {};
      
      if (recipients === 'overdue') {
        // Get taxpayers with overdue tax records
        const overdueTaxpayers = await TaxRecord.findAll({
          where: { status: 'overdue' },
          attributes: ['tin'],
          group: ['tin']
        });
        
        const tins = overdueTaxpayers.map(record => record.tin);
        where.tin = { [Op.in]: tins };
        
      } else if (recipients === 'specific' && recipientTins.length > 0) {
        where.tin = { [Op.in]: recipientTins };
      }

      const taxpayerUsers = await User.findAll({
        where,
        attributes: ['id', 'tin', 'email', 'phone', 'firstName', 'lastName', 'businessName']
      });

      // Create notification records (you'd need a Notification model)
      const notifications = taxpayerUsers.map(user => ({
        userId: user.id,
        type,
        message,
        priority,
        scheduledAt: scheduleAt || new Date(),
        status: 'pending',
        metadata: {
          tin: user.tin,
          recipientName: user.businessName || `${user.firstName} ${user.lastName}`,
          sentBy: req.user.id
        }
      }));

      // Save notifications (implement this based on your Notification model)
      // await Notification.bulkCreate(notifications);

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'SEND_BULK_NOTIFICATION',
        entityType: 'Notification',
        description: `Sent ${type} notification to ${taxpayerUsers.length} taxpayers`,
        metadata: {
          type,
          recipientCount: taxpayerUsers.length,
          recipientsType: recipients,
          priority,
          scheduled: !!scheduleAt
        }
      });

      res.json({
        success: true,
        data: {
          notificationCount: taxpayerUsers.length,
          scheduled: !!scheduleAt,
          scheduleAt: scheduleAt || new Date(),
          recipients: taxpayerUsers.map(user => ({
            tin: user.tin,
            name: user.businessName || `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone
          }))
        }
      });
    } catch (error) {
      console.error('Notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   GET /api/government/audit-log
 * @desc    Get system audit logs
 * @access  Private (Government Admin only)
 */
router.get(
  '/audit-log',
  auth,
  role(['government_admin', 'super_admin']),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('action').optional().isString().trim(),
    query('userId').optional().isInt().toInt(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('entityType').optional().isString().trim(),
    query('entityId').optional().isInt().toInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        page = 1,
        limit = 20,
        action,
        userId,
        startDate,
        endDate,
        entityType,
        entityId
      } = req.query;

      const offset = (page - 1) * limit;

      // Build filter conditions
      const where = {};
      
      if (action) where.action = action;
      if (userId) where.userId = userId;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      
      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      // Assuming you have an AuditLog model
      // const { rows: auditLogs, count } = await AuditLog.findAndCountAll({
      //   where,
      //   include: [
      //     {
      //       model: User,
      //       as: 'user',
      //       attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      //     }
      //   ],
      //   order: [['createdAt', 'DESC']],
      //   limit,
      //   offset,
      //   distinct: true
      // });

      // For now, return mock data or use auditService
      const auditLogs = await auditService.getAuditLogs({
        where,
        limit,
        offset
      });

      res.json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(auditLogs.length / limit),
            totalRecords: auditLogs.length
          }
        }
      });
    } catch (error) {
      console.error('Audit log error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/government/reports/generate
 * @desc    Generate and download government reports
 * @access  Private (Government Admin only)
 */
router.post(
  '/reports/generate',
  auth,
  role(['government_admin', 'super_admin']),
  [
    body('reportType').isIn([
      'tax_collection_summary',
      'compliance_report',
      'revenue_analysis',
      'taxpayer_directory',
      'audit_trail',
      'custom'
    ]),
    body('format').optional().isIn(['pdf', 'excel', 'csv', 'json']).default('pdf'),
    body('parameters').optional().isObject(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate(),
    body('filters').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        reportType,
        format = 'pdf',
        parameters = {},
        startDate,
        endDate,
        filters = {}
      } = req.body;

      // Generate report using reporting service
      const report = await reportingService.generateReport({
        reportType,
        format,
        parameters: {
          ...parameters,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          filters
        },
        requestedBy: req.user.id
      });

      // Log audit trail
      await auditService.logAction({
        userId: req.user.id,
        action: 'GENERATE_REPORT',
        entityType: 'Report',
        description: `Generated ${reportType} report in ${format} format`,
        metadata: {
          reportType,
          format,
          parameters,
          startDate,
          endDate,
          filters
        }
      });

      // Return report data or download link
      if (format === 'json') {
        res.json({
          success: true,
          data: report
        });
      } else {
        // For file formats, send as download
        const filename = `government_report_${reportType}_${Date.now()}.${format}`;
        
        if (format === 'pdf') {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(report);
        } else if (format === 'excel') {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(report);
        } else if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(report);
        }
      }
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;