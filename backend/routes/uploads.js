const express = require('express');
const multer = require('multer');
const path = require('path');
const { z } = require('zod');
const auth = require('../middleware/auth');
const { MediaService } = require('../services/mediaService');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const UploadSchema = {
  profileImage: z.object({
    type: z.enum(['avatar', 'cover', 'profile']).default('avatar'),
    cropData: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional()
    }).optional()
  }),

  portfolioItem: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).max(10).optional(),
    isPublic: z.boolean().default(true)
  }),

  documentUpload: z.object({
    documentType: z.enum([
      'fayda_id', 
      'passport', 
      'driving_license', 
      'degree_certificate',
      'professional_certificate',
      'business_license',
      'portfolio_document'
    ]),
    issuingAuthority: z.string().max(100).optional(),
    issueDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional()
  }),

  serviceImage: z.object({
    serviceId: z.number().int().positive().optional(),
    isPrimary: z.boolean().default(false),
    caption: z.string().max(200).optional()
  }),

  bulkUpload: z.object({
    batchId: z.string().uuid().optional(),
    maxFiles: z.number().int().min(1).max(50).default(10),
    compressQuality: z.number().min(0.1).max(1).default(0.8)
  })
};

// 🎯 MULTER CONFIGURATION
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // 🛡️ Security check for file types
  const allowedMimes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/webp': true,
    'image/gif': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true
  };

  if (allowedMimes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, GIF, PDF, DOC, DOCX`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  }
});

// 🛡️ SECURITY MIDDLEWARE
const scanForMalware = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.file ? [req.file] : req.files;
    
    for (const file of files) {
      const scanResult = await YachiSecurity.scanFile(file.buffer, file.mimetype);
      
      if (!scanResult.isSafe) {
        return res.status(400).json({
          success: false,
          message: 'File security scan failed',
          code: 'MALWARE_DETECTED',
          details: scanResult.threats
        });
      }
    }

    next();
  } catch (error) {
    console.error('Malware scan error:', error);
    next(error);
  }
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_UPLOADS: (userId) => `uploads:user:${userId}`,
  PORTFOLIO_ITEMS: (userId) => `uploads:portfolio:${userId}`,
  DOCUMENTS: (userId) => `uploads:documents:${userId}`
};

// 🚀 UPLOAD PROFILE IMAGE WITH AI ENHANCEMENT
router.post('/profile-image', auth, upload.single('image'), scanForMalware, async (req, res) => {
  try {
    const validatedData = UploadSchema.profileImage.parse(req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
        code: 'IMAGE_REQUIRED'
      });
    }

    // 🖼️ Process profile image with AI enhancement
    const processedImage = await MediaService.processProfileImage({
      file: req.file,
      userId: req.user.userId,
      type: validatedData.type,
      cropData: validatedData.cropData
    });

    // 👤 Update user profile with new image
    const updateData = {};
    if (validatedData.type === 'avatar') {
      updateData.avatar = processedImage.url;
      updateData.avatarThumbnail = processedImage.thumbnailUrl;
    } else if (validatedData.type === 'cover') {
      updateData.coverImage = processedImage.url;
    }

    await User.update(updateData, {
      where: { id: req.user.userId }
    });

    // 📊 Track upload analytics
    await YachiAnalytics.trackUpload(req.user.userId, 'profile_image', {
      type: validatedData.type,
      fileSize: req.file.size,
      processingTime: processedImage.processingTime
    });

    // 🗑️ Clear user cache
    await redis.del(CACHE_KEYS.USER_UPLOADS(req.user.userId));

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        image: processedImage,
        type: validatedData.type
      },
      metadata: {
        originalSize: req.file.size,
        processedSize: processedImage.size,
        optimization: `${Math.round((1 - processedImage.size / req.file.size) * 100)}% reduction`
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

    console.error('Profile Image Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      code: 'PROFILE_IMAGE_UPLOAD_FAILED'
    });
  }
});

// 🚀 UPLOAD PORTFOLIO ITEMS WITH BATCH PROCESSING
router.post('/portfolio', auth, upload.array('images', 10), scanForMalware, async (req, res) => {
  try {
    const validatedData = UploadSchema.portfolioItem.parse(req.body);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required',
        code: 'PORTFOLIO_IMAGES_REQUIRED'
      });
    }

    // 🖼️ Process portfolio items in parallel
    const portfolioItems = await Promise.all(
      req.files.map(async (file, index) => {
        const processedItem = await MediaService.processPortfolioItem({
          file,
          userId: req.user.userId,
          title: validatedData.title || `Portfolio Item ${index + 1}`,
          description: validatedData.description,
          category: validatedData.category
        });

        // 📝 Create portfolio record
        return Portfolio.create({
          userId: req.user.userId,
          title: processedItem.metadata.title,
          description: validatedData.description,
          category: validatedData.category,
          imageUrl: processedItem.url,
          thumbnailUrl: processedItem.thumbnailUrl,
          tags: validatedData.tags,
          isPublic: validatedData.isPublic,
          metadata: {
            processing: processedItem.metadata,
            aiAnalysis: processedItem.aiAnalysis,
            qualityScore: processedItem.qualityScore
          }
        });
      })
    );

    // 📊 Track portfolio upload
    await YachiAnalytics.trackUpload(req.user.userId, 'portfolio_items', {
      count: portfolioItems.length,
      totalSize: req.files.reduce((acc, file) => acc + file.size, 0),
      categories: [...new Set(portfolioItems.map(item => item.category))]
    });

    // 🗑️ Clear portfolio cache
    await redis.del(CACHE_KEYS.PORTFOLIO_ITEMS(req.user.userId));

    res.json({
      success: true,
      message: `Successfully uploaded ${portfolioItems.length} portfolio items`,
      data: {
        portfolioItems,
        summary: {
          total: portfolioItems.length,
          categories: [...new Set(portfolioItems.map(item => item.category))],
          averageQualityScore: portfolioItems.reduce((acc, item) => 
            acc + (item.metadata.qualityScore || 0), 0) / portfolioItems.length
        }
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

    console.error('Portfolio Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload portfolio items',
      code: 'PORTFOLIO_UPLOAD_FAILED'
    });
  }
});

// 🚀 UPLOAD VERIFICATION DOCUMENTS WITH AI VALIDATION
router.post('/documents', auth, upload.array('documents', 5), scanForMalware, async (req, res) => {
  try {
    const validatedData = UploadSchema.documentUpload.parse(req.body);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one document is required',
        code: 'DOCUMENTS_REQUIRED'
      });
    }

    // 📄 Process documents with AI validation
    const documentResults = await Promise.all(
      req.files.map(async (file) => {
        const processedDocument = await MediaService.processVerificationDocument({
          file,
          userId: req.user.userId,
          documentType: validatedData.documentType
        });

        // 🎯 AI-Powered document validation
        const validationResult = await VerificationService.validateDocument({
          documentType: validatedData.documentType,
          documentImage: processedDocument.url,
          issuingAuthority: validatedData.issuingAuthority,
          userId: req.user.userId
        });

        // 📝 Create verification record
        return WorkerVerification.create({
          userId: req.user.userId,
          documentType: validatedData.documentType,
          documentNumber: validationResult.documentNumber,
          documentImage: processedDocument.url,
          status: validationResult.isValid ? 'verified' : 'pending_review',
          metadata: {
            validationResult,
            processedDocument,
            issuingAuthority: validatedData.issuingAuthority,
            issueDate: validatedData.issueDate,
            expiryDate: validatedData.expiryDate,
            securityScan: {
              scanned: true,
              threats: []
            }
          }
        });
      })
    );

    // 📊 Track document upload
    await YachiAnalytics.trackUpload(req.user.userId, 'verification_documents', {
      documentType: validatedData.documentType,
      count: documentResults.length,
      verifiedCount: documentResults.filter(doc => doc.status === 'verified').length
    });

    // 🗑️ Clear documents cache
    await redis.del(CACHE_KEYS.DOCUMENTS(req.user.userId));

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        documents: documentResults,
        validationSummary: {
          total: documentResults.length,
          verified: documentResults.filter(doc => doc.status === 'verified').length,
          pending: documentResults.filter(doc => doc.status === 'pending_review').length
        }
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

    console.error('Document Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      code: 'DOCUMENT_UPLOAD_FAILED'
    });
  }
});

// 🚀 UPLOAD SERVICE IMAGES
router.post('/service-images', auth, upload.array('images', 5), scanForMalware, async (req, res) => {
  try {
    const validatedData = UploadSchema.serviceImage.parse(req.body);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one service image is required',
        code: 'SERVICE_IMAGES_REQUIRED'
      });
    }

    // 🖼️ Process service images
    const serviceImages = await Promise.all(
      req.files.map(async (file, index) => {
        const processedImage = await MediaService.processServiceImage({
          file,
          userId: req.user.userId,
          serviceId: validatedData.serviceId,
          isPrimary: validatedData.isPrimary && index === 0, // First image as primary
          caption: validatedData.caption
        });

        return {
          url: processedImage.url,
          thumbnailUrl: processedImage.thumbnailUrl,
          isPrimary: validatedData.isPrimary && index === 0,
          caption: validatedData.caption,
          metadata: processedImage.metadata
        };
      })
    );

    // 💾 Update service with images if serviceId provided
    if (validatedData.serviceId) {
      const service = await Service.findByPk(validatedData.serviceId);
      if (service) {
        const existingImages = service.images || [];
        const updatedImages = [...existingImages, ...serviceImages];
        
        await service.update({
          images: updatedImages,
          primaryImage: validatedData.isPrimary ? serviceImages[0].url : service.primaryImage
        });
      }
    }

    res.json({
      success: true,
      message: 'Service images uploaded successfully',
      data: {
        images: serviceImages,
        serviceId: validatedData.serviceId
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

    console.error('Service Images Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload service images',
      code: 'SERVICE_IMAGES_UPLOAD_FAILED'
    });
  }
});

// 🚀 BULK UPLOAD WITH PROGRESS TRACKING
router.post('/bulk-upload', auth, upload.array('files', 50), scanForMalware, async (req, res) => {
  try {
    const validatedData = UploadSchema.bulkUpload.parse(req.body);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided for bulk upload',
        code: 'NO_FILES_PROVIDED'
      });
    }

    if (req.files.length > validatedData.maxFiles) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${validatedData.maxFiles} files allowed for bulk upload`,
        code: 'MAX_FILES_EXCEEDED'
      });
    }

    const batchId = validatedData.batchId || generateBatchId();
    let processedCount = 0;
    const results = [];

    // 🔄 Process files with progress tracking
    for (const file of req.files) {
      try {
        const processedFile = await MediaService.processBulkFile({
          file,
          userId: req.user.userId,
          batchId,
          compressQuality: validatedData.compressQuality
        });

        results.push({
          originalName: file.originalname,
          status: 'success',
          result: processedFile
        });

      } catch (error) {
        results.push({
          originalName: file.originalname,
          status: 'error',
          error: error.message
        });
      }

      processedCount++;
      
      // 📊 Update progress (could be sent via WebSocket in real implementation)
      const progress = Math.round((processedCount / req.files.length) * 100);
      console.log(`Bulk upload progress: ${progress}%`);
    }

    // 📊 Track bulk upload analytics
    await YachiAnalytics.trackUpload(req.user.userId, 'bulk_upload', {
      batchId,
      totalFiles: req.files.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      totalSize: req.files.reduce((acc, file) => acc + file.size, 0)
    });

    res.json({
      success: true,
      message: 'Bulk upload completed',
      data: {
        batchId,
        results,
        summary: {
          total: req.files.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length
        }
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

    console.error('Bulk Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      code: 'BULK_UPLOAD_FAILED'
    });
  }
});

// 🚀 GET UPLOAD HISTORY
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const cacheKey = `upload_history:${req.user.userId}:${page}:${limit}:${type}`;
    const cachedHistory = await redis.get(cacheKey);

    if (cachedHistory) {
      return res.json({
        success: true,
        ...JSON.parse(cachedHistory),
        source: 'cache'
      });
    }

    const where = { userId: req.user.userId };
    if (type) {
      where.type = type;
    }

    const [uploads, total] = await Promise.all([
      Upload.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      }),
      Upload.count({ where })
    ]);

    const result = {
      uploads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Upload History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload history',
      code: 'UPLOAD_HISTORY_FETCH_FAILED'
    });
  }
});

// 🚀 DELETE UPLOADED FILE
router.delete('/:uploadId', auth, async (req, res) => {
  try {
    const uploadId = parseInt(req.params.uploadId);

    const upload = await Upload.findOne({
      where: {
        id: uploadId,
        userId: req.user.userId
      }
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found or access denied',
        code: 'UPLOAD_NOT_FOUND'
      });
    }

    // 🗑️ Delete physical file from storage
    await MediaService.deleteFile(upload.filePath);

    // 🗑️ Delete database record
    await upload.destroy();

    // 🗑️ Clear relevant caches
    await Promise.all([
      redis.del(CACHE_KEYS.USER_UPLOADS(req.user.userId)),
      redis.del(CACHE_KEYS.PORTFOLIO_ITEMS(req.user.userId)),
      redis.del(CACHE_KEYS.DOCUMENTS(req.user.userId))
    ]);

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: {
        deletedUpload: upload
      }
    });

  } catch (error) {
    console.error('Delete Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      code: 'FILE_DELETE_FAILED'
    });
  }
});

// 🚀 GET UPLOAD STATISTICS
router.get('/stats', auth, async (req, res) => {
  try {
    const cacheKey = `upload_stats:${req.user.userId}`;
    const cachedStats = await redis.get(cacheKey);

    if (cachedStats) {
      return res.json({
        success: true,
        ...JSON.parse(cachedStats),
        source: 'cache'
      });
    }

    const stats = await YachiAnalytics.getUploadStats(req.user.userId);

    // 💾 Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(stats));

    res.json({
      success: true,
      data: stats,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Upload Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload statistics',
      code: 'UPLOAD_STATS_FETCH_FAILED'
    });
  }
});

// 🎯 UTILITY FUNCTIONS

function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 🛑 ERROR HANDLING MIDDLEWARE
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files per upload.',
        code: 'TOO_MANY_FILES'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        code: 'UNEXPECTED_FILE_FIELD'
      });
    }
  }

  console.error('Upload Route Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

module.exports = router;