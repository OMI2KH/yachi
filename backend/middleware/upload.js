// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { fileUploadService } = require('../services/fileUploadService');
const { securityService } = require('./security');
const { rateLimit } = require('./rateLimit');
const logger = require('../utils/logger');

class UploadMiddleware {
  constructor() {
    this.uploadConfig = this.loadUploadConfig();
    this.initializeUploadDirectories();
  }

  /**
   * Load upload configuration
   */
  loadUploadConfig() {
    return {
      // File size limits
      limits: {
        profileImage: 5 * 1024 * 1024, // 5MB
        portfolioImage: 10 * 1024 * 1024, // 10MB
        document: 20 * 1024 * 1024, // 20MB
        serviceImage: 8 * 1024 * 1024, // 8MB
        chatFile: 15 * 1024 * 1024, // 15MB
        general: 10 * 1024 * 1024 // 10MB
      },

      // Allowed file types
      allowedTypes: {
        image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
        archive: ['application/zip', 'application/x-rar-compressed']
      },

      // Upload directories
      directories: {
        profiles: 'profiles',
        portfolios: 'portfolios',
        documents: 'documents',
        services: 'services',
        chats: 'chats',
        temp: 'temp'
      },

      // Security settings
      security: {
        scanForThreats: true,
        validateImages: true,
        removeMetadata: true,
        maxDimensions: {
          width: 4096,
          height: 4096
        }
      }
    };
  }

  /**
   * Initialize upload directories
   */
  async initializeUploadDirectories() {
    try {
      const baseDir = path.join(process.cwd(), 'uploads');
      
      for (const dir of Object.values(this.uploadConfig.directories)) {
        const dirPath = path.join(baseDir, dir);
        await fs.mkdir(dirPath, { recursive: true });
      }

      logger.info('Upload directories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize upload directories:', error);
      throw new Error('Upload system initialization failed');
    }
  }

  /**
   * Main upload middleware factory
   */
  createUploadMiddleware(type, options = {}) {
    const config = this.getUploadConfig(type, options);
    
    return [
      // Rate limiting
      rateLimit('upload'),
      
      // Security checks
      securityService.fileUploadSecurity(),
      
      // Multer upload
      this.multerMiddleware(config),
      
      // File processing
      this.fileProcessingMiddleware(type, options),
      
      // Error handling
      this.uploadErrorMiddleware()
    ];
  }

  /**
   * Get upload configuration for specific type
   */
  getUploadConfig(type, options) {
    const baseConfig = {
      storage: this.getStorage(type, options),
      fileFilter: this.getFileFilter(type, options),
      limits: this.getLimits(type, options)
    };

    return { ...baseConfig, ...options };
  }

  /**
   * Get storage configuration
   */
  getStorage(type, options) {
    const userBased = options.userBased !== false;
    
    return multer.diskStorage({
      destination: (req, file, cb) => {
        this.getDestination(req, file, type, userBased, cb);
      },
      filename: (req, file, cb) => {
        this.generateFilename(req, file, type, cb);
      }
    });
  }

  /**
   * Get upload destination
   */
  getDestination(req, file, type, userBased, cb) {
    try {
      let destination = path.join('uploads', this.uploadConfig.directories[type] || 'general');
      
      if (userBased && req.user) {
        destination = path.join(destination, req.user.userId.toString());
      }

      // Create directory if it doesn't exist
      fs.mkdir(destination, { recursive: true })
        .then(() => cb(null, destination))
        .catch(error => cb(error));
    } catch (error) {
      cb(error);
    }
  }

  /**
   * Generate secure filename
   */
  generateFilename(req, file, type, cb) {
    try {
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      
      // Sanitize filename
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
      
      // Generate unique identifier
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      
      // Create final filename
      const filename = `${type}_${sanitizedName}_${timestamp}_${uniqueId}${extension}`;
      
      cb(null, filename);
    } catch (error) {
      cb(error);
    }
  }

  /**
   * Get file filter
   */
  getFileFilter(type, options) {
    return (req, file, cb) => {
      try {
        // Check file type
        if (!this.isAllowedFileType(file, type)) {
          return cb(new Error(`File type not allowed for ${type} upload`));
        }

        // Check file extension
        if (!this.isAllowedExtension(file.originalname, type)) {
          return cb(new Error(`File extension not allowed for ${type} upload`));
        }

        // Security checks
        this.securityChecks(req, file, type)
          .then(() => cb(null, true))
          .catch(error => cb(error));

      } catch (error) {
        cb(error);
      }
    };
  }

  /**
   * Check if file type is allowed
   */
  isAllowedFileType(file, type) {
    const allowedTypes = this.getAllowedTypes(type);
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Check if file extension is allowed
   */
  isAllowedExtension(filename, type) {
    const extension = path.extname(filename).toLowerCase();
    const allowedExtensions = this.getAllowedExtensions(type);
    return allowedExtensions.includes(extension);
  }

  /**
   * Get allowed file types for upload type
   */
  getAllowedTypes(type) {
    const typeMap = {
      profileImage: this.uploadConfig.allowedTypes.image,
      portfolioImage: this.uploadConfig.allowedTypes.image,
      serviceImage: this.uploadConfig.allowedTypes.image,
      document: [...this.uploadConfig.allowedTypes.document, ...this.uploadConfig.allowedTypes.image],
      chatFile: [...this.uploadConfig.allowedTypes.image, ...this.uploadConfig.allowedTypes.document, ...this.uploadConfig.allowedTypes.video, ...this.uploadConfig.allowedTypes.audio],
      general: [...this.uploadConfig.allowedTypes.image, ...this.uploadConfig.allowedTypes.document]
    };

    return typeMap[type] || typeMap.general;
  }

  /**
   * Get allowed file extensions
   */
  getAllowedExtensions(type) {
    const extensionMap = {
      image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      document: ['.pdf', '.doc', '.docx'],
      video: ['.mp4', '.mpeg', '.mov'],
      audio: ['.mp3', '.wav', '.ogg'],
      archive: ['.zip', '.rar']
    };

    const typeMap = {
      profileImage: extensionMap.image,
      portfolioImage: extensionMap.image,
      serviceImage: extensionMap.image,
      document: [...extensionMap.document, ...extensionMap.image],
      chatFile: [...extensionMap.image, ...extensionMap.document, ...extensionMap.video, ...extensionMap.audio],
      general: [...extensionMap.image, ...extensionMap.document]
    };

    return typeMap[type] || typeMap.general;
  }

  /**
   * Get file size limits
   */
  getLimits(type, options) {
    const baseLimit = this.uploadConfig.limits[type] || this.uploadConfig.limits.general;
    return {
      fileSize: options.fileSize || baseLimit,
      files: options.maxFiles || 1
    };
  }

  /**
   * Security checks for uploaded files
   */
  async securityChecks(req, file, type) {
    // Check file size
    if (file.size > this.getLimits(type).fileSize) {
      throw new Error(`File size exceeds limit for ${type} upload`);
    }

    // Check for suspicious file names
    if (this.isSuspiciousFilename(file.originalname)) {
      throw new Error('Suspicious filename detected');
    }

    // Check for double extensions
    if (this.hasDoubleExtension(file.originalname)) {
      throw new Error('File with double extension not allowed');
    }

    // Additional security checks based on file type
    if (file.mimetype.startsWith('image/')) {
      await this.validateImageSecurity(file);
    } else if (file.mimetype.startsWith('application/')) {
      await this.validateDocumentSecurity(file);
    }
  }

  /**
   * Check for suspicious filename patterns
   */
  isSuspiciousFilename(filename) {
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /\.php$/i,
      /\.exe$/i,
      /\.bat$/i,
      /\.sh$/i,
      /\.cmd$/i,
      /^\.htaccess$/i,
      /\.config$/i,
      /\.env$/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Check for double extensions
   */
  hasDoubleExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 2 && parts[parts.length - 2].length <= 4;
  }

  /**
   * Validate image security
   */
  async validateImageSecurity(file) {
    // Check image dimensions if possible
    // This would require actually reading the image file
    // For now, we'll rely on the file processing middleware
    
    // Check for potential image-based attacks
    if (file.size > 0 && file.size < 100) {
      throw new Error('Suspicious image file detected');
    }
  }

  /**
   * Validate document security
   */
  async validateDocumentSecurity(file) {
    // Check for potentially dangerous document types
    const dangerousTypes = [
      'application/x-msdownload',
      'application/x-ms-installer',
      'application/x-dosexec'
    ];

    if (dangerousTypes.includes(file.mimetype)) {
      throw new Error('Potentially dangerous file type detected');
    }
  }

  /**
   * Multer middleware
   */
  multerMiddleware(config) {
    return multer(config).any();
  }

  /**
   * File processing middleware
   */
  fileProcessingMiddleware(type, options) {
    return async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return next();
        }

        const processedFiles = [];

        for (const file of req.files) {
          const processedFile = await this.processFile(file, type, req, options);
          processedFiles.push(processedFile);
        }

        req.processedFiles = processedFiles;
        
        // Clean up original files if processing was successful
        await this.cleanupOriginalFiles(req.files);

        next();
      } catch (error) {
        // Clean up any uploaded files on error
        await this.cleanupUploadedFiles(req.files);
        next(error);
      }
    };
  }

  /**
   * Process uploaded file based on type
   */
  async processFile(file, type, req, options) {
    const processingMap = {
      profileImage: () => fileUploadService.processProfileImage(file, req.user?.userId),
      portfolioImage: () => fileUploadService.processPortfolioItem(file, req.user?.userId, options.metadata),
      serviceImage: () => fileUploadService.processServiceImage(file, req.user?.userId, options.serviceCategory),
      document: () => fileUploadService.processVerificationDocument(file, req.user?.userId, options.documentType),
      chatFile: () => this.processChatFile(file, req.user?.userId),
      general: () => this.processGeneralFile(file, req.user?.userId)
    };

    const processor = processingMap[type] || processingMap.general;
    return await processor();
  }

  /**
   * Process chat file
   */
  async processChatFile(file, userId) {
    // For chat files, we might want different processing
    const processedFile = await fileUploadService.compressImage(file, {
      quality: 80,
      format: 'webp',
      maxWidth: 1024,
      maxHeight: 1024
    });

    return {
      url: `/uploads/chats/${userId}/${file.filename}`,
      thumbnailUrl: `/uploads/chats/${userId}/thumb_${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      processedSize: processedFile.compressedSize,
      mimeType: file.mimetype,
      metadata: {
        processed: true,
        compressionRatio: processedFile.compressionRatio
      }
    };
  }

  /**
   * Process general file
   */
  async processGeneralFile(file, userId) {
    return {
      url: `/uploads/general/${userId}/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Clean up original files after processing
   */
  async cleanupOriginalFiles(files) {
    for (const file of files) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        logger.warn('Failed to cleanup original file:', error.message);
      }
    }
  }

  /**
   * Clean up uploaded files on error
   */
  async cleanupUploadedFiles(files) {
    for (const file of files) {
      try {
        if (await this.fileExists(file.path)) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        logger.warn('Failed to cleanup uploaded file on error:', error.message);
      }
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Upload error handling middleware
   */
  uploadErrorMiddleware() {
    return (error, req, res, next) => {
      if (error) {
        // Clean up any uploaded files on error
        if (req.files) {
          this.cleanupUploadedFiles(req.files).catch(cleanupError => {
            logger.error('File cleanup error:', cleanupError);
          });
        }

        logger.error('Upload error:', {
          error: error.message,
          userId: req.user?.userId,
          ip: securityService.getClientIP(req),
          userAgent: req.headers['user-agent']
        });

        // Handle specific Multer errors
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                message: 'File too large',
                code: 'FILE_TOO_LARGE',
                maxSize: this.getMaxFileSize(req.path)
              });
              
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                message: 'Too many files',
                code: 'TOO_MANY_FILES'
              });
              
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                success: false,
                message: 'Unexpected file field',
                code: 'UNEXPECTED_FILE_FIELD'
              });
              
            default:
              return res.status(400).json({
                success: false,
                message: 'Upload failed',
                code: 'UPLOAD_ERROR'
              });
          }
        }

        // Handle custom errors
        if (error.message.includes('not allowed')) {
          return res.status(400).json({
            success: false,
            message: error.message,
            code: 'FILE_TYPE_NOT_ALLOWED'
          });
        }

        if (error.message.includes('suspicious') || error.message.includes('security')) {
          securityService.trackSuspiciousActivity(req, 'FILE_UPLOAD_SECURITY_VIOLATION', {
            filename: req.file?.originalname,
            error: error.message
          });

          return res.status(400).json({
            success: false,
            message: 'File security check failed',
            code: 'FILE_SECURITY_CHECK_FAILED'
          });
        }

        // Generic error
        return res.status(500).json({
          success: false,
          message: 'File upload failed',
          code: 'UPLOAD_FAILED'
        });
      }

      next();
    };
  }

  /**
   * Get maximum file size for endpoint
   */
  getMaxFileSize(endpoint) {
    const sizeMap = {
      '/api/upload/profile': this.uploadConfig.limits.profileImage,
      '/api/upload/portfolio': this.uploadConfig.limits.portfolioImage,
      '/api/upload/document': this.uploadConfig.limits.document,
      '/api/upload/service': this.uploadConfig.limits.serviceImage,
      '/api/upload/chat': this.uploadConfig.limits.chatFile
    };

    return sizeMap[endpoint] || this.uploadConfig.limits.general;
  }

  /**
   * Pre-upload validation middleware
   */
  preUploadValidation(type) {
    return (req, res, next) => {
      try {
        // Check if user has permission to upload
        if (!this.hasUploadPermission(req.user, type)) {
          return res.status(403).json({
            success: false,
            message: 'Upload permission denied',
            code: 'UPLOAD_PERMISSION_DENIED'
          });
        }

        // Check user's upload quota
        this.checkUploadQuota(req.user, type)
          .then(canUpload => {
            if (!canUpload) {
              return res.status(403).json({
                success: false,
                message: 'Upload quota exceeded',
                code: 'UPLOAD_QUOTA_EXCEEDED'
              });
            }
            next();
          })
          .catch(error => next(error));

      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user has upload permission
   */
  hasUploadPermission(user, type) {
    if (!user) return false;

    const permissionMap = {
      profileImage: true, // All users can upload profile images
      portfolioImage: user.role === 'provider' || user.role === 'graduate',
      document: user.role === 'provider' || user.role === 'graduate',
      serviceImage: user.role === 'provider' || user.role === 'graduate',
      chatFile: true // All users can upload chat files
    };

    return permissionMap[type] !== false;
  }

  /**
   * Check user's upload quota
   */
  async checkUploadQuota(user, type) {
    if (!user) return false;

    // Get user's current upload usage
    const usage = await this.getUserUploadUsage(user.userId);
    const quota = this.getUserUploadQuota(user, type);

    return usage < quota;
  }

  /**
   * Get user's upload usage
   */
  async getUserUploadUsage(userId) {
    // This would typically query the database for user's upload history
    // For now, return a mock value
    return 0;
  }

  /**
   * Get user's upload quota
   */
  getUserUploadQuota(user, type) {
    const baseQuota = 100 * 1024 * 1024; // 100MB base quota

    // Premium users get more quota
    if (user.isPremium) {
      return baseQuota * 5; // 500MB for premium
    }

    // Verified workers get more quota
    if ((user.role === 'provider' || user.role === 'graduate') && user.faydaVerified) {
      return baseQuota * 2; // 200MB for verified workers
    }

    return baseQuota;
  }

  /**
   * File deletion middleware
   */
  fileDeletionMiddleware() {
    return async (req, res, next) => {
      try {
        const { fileUrl } = req.body;
        
        if (!fileUrl) {
          return res.status(400).json({
            success: false,
            message: 'File URL is required',
            code: 'FILE_URL_REQUIRED'
          });
        }

        // Verify user owns the file
        if (!this.userOwnsFile(req.user, fileUrl)) {
          return res.status(403).json({
            success: false,
            message: 'Cannot delete file',
            code: 'FILE_DELETION_DENIED'
          });
        }

        // Delete the file
        const deleted = await fileUploadService.deleteFile(fileUrl);
        
        if (!deleted) {
          return res.status(404).json({
            success: false,
            message: 'File not found',
            code: 'FILE_NOT_FOUND'
          });
        }

        logger.info('File deleted successfully', {
          fileUrl,
          userId: req.user.userId,
          ip: securityService.getClientIP(req)
        });

        res.json({
          success: true,
          message: 'File deleted successfully'
        });

      } catch (error) {
        logger.error('File deletion error:', error);
        res.status(500).json({
          success: false,
          message: 'File deletion failed',
          code: 'FILE_DELETION_FAILED'
        });
      }
    };
  }

  /**
   * Check if user owns the file
   */
  userOwnsFile(user, fileUrl) {
    if (!user) return false;
    
    // Check if file URL contains user's ID
    return fileUrl.includes(`/${user.userId}/`);
  }
}

// Create singleton instance
const uploadMiddleware = new UploadMiddleware();

// Export middleware functions
module.exports = {
  // Profile image upload
  profileUpload: () => uploadMiddleware.createUploadMiddleware('profileImage', {
    maxFiles: 1,
    userBased: true
  }),

  // Portfolio image upload
  portfolioUpload: () => uploadMiddleware.createUploadMiddleware('portfolioImage', {
    maxFiles: 10,
    userBased: true
  }),

  // Document upload
  documentUpload: () => uploadMiddleware.createUploadMiddleware('document', {
    maxFiles: 5,
    userBased: true
  }),

  // Service image upload
  serviceUpload: () => uploadMiddleware.createUploadMiddleware('serviceImage', {
    maxFiles: 5,
    userBased: true
  }),

  // Chat file upload
  chatUpload: () => uploadMiddleware.createUploadMiddleware('chatFile', {
    maxFiles: 1,
    userBased: true
  }),

  // General file upload
  generalUpload: (options = {}) => uploadMiddleware.createUploadMiddleware('general', options),

  // Pre-upload validation
  validateUpload: (type) => uploadMiddleware.preUploadValidation(type),

  // File deletion
  deleteFile: () => uploadMiddleware.fileDeletionMiddleware(),

  // Utility functions
  getUploadConfig: (type) => uploadMiddleware.getUploadConfig(type),
  getAllowedTypes: (type) => uploadMiddleware.getAllowedTypes(type),

  // Middleware instance for advanced usage
  uploadMiddleware
};