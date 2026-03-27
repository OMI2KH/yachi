// services/fileUploadService.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { YachiAI } = require('./yachiAI');
const { YachiSecurity } = require('./yachiSecurity');
const { YachiAnalytics } = require('./yachiAnalytics');
const logger = require('../utils/logger');

class FileUploadService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.tempDir = path.join(this.uploadDir, 'temp');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedMimeTypes = {
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };
    
    this.initializeDirectories();
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'profiles'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'portfolios'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'documents'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'services'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'chats'), { recursive: true });
      
      logger.info('Upload directories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize upload directories:', error);
      throw new Error('File system initialization failed');
    }
  }

  /**
   * Configure multer storage for different upload types
   */
  getStorageConfig(fileType = 'general') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const userDir = this.getUserUploadDir(req.user?.userId, fileType);
        cb(null, userDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = this.generateFileName(file.originalname, fileType);
        cb(null, uniqueName);
      }
    });

    return storage;
  }

  /**
   * Get user-specific upload directory
   */
  getUserUploadDir(userId, fileType) {
    const baseDirs = {
      profile: 'profiles',
      portfolio: 'portfolios',
      document: 'documents',
      service: 'services',
      chat: 'chats',
      general: 'general'
    };

    const baseDir = baseDirs[fileType] || 'general';
    return path.join(this.uploadDir, baseDir, userId?.toString() || 'anonymous');
  }

  /**
   * Generate secure filename
   */
  generateFileName(originalName, fileType) {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = Date.now();
    const uniqueId = uuidv4().slice(0, 8);

    return `${fileType}_${sanitizedName}_${timestamp}_${uniqueId}${extension}`;
  }

  /**
   * File filter for security validation
   */
  fileFilter(allowedTypes = ['image']) {
    return (req, file, cb) => {
      try {
        // Check MIME type
        const isValidMime = this.validateMimeType(file.mimetype, allowedTypes);
        if (!isValidMime) {
          return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`));
        }

        // Check file extension
        const isValidExtension = this.validateFileExtension(file.originalname, allowedTypes);
        if (!isValidExtension) {
          return cb(new Error('File extension does not match MIME type'));
        }

        // Security scan
        this.securityScan(file).then(isSafe => {
          if (!isSafe) {
            return cb(new Error('File failed security check'));
          }
          cb(null, true);
        }).catch(error => {
          cb(new Error('Security scan failed'));
        });

      } catch (error) {
        cb(error);
      }
    };
  }

  /**
   * Validate MIME type
   */
  validateMimeType(mimeType, allowedTypes) {
    for (const type of allowedTypes) {
      if (this.allowedMimeTypes[type]?.includes(mimeType)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate file extension
   */
  validateFileExtension(filename, allowedTypes) {
    const extension = path.extname(filename).toLowerCase();
    const allowedExtensions = this.getAllowedExtensions(allowedTypes);
    return allowedExtensions.includes(extension);
  }

  /**
   * Get allowed extensions for file types
   */
  getAllowedExtensions(allowedTypes) {
    const extensions = {
      image: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      document: ['.pdf', '.doc', '.docx'],
      video: ['.mp4', '.mpeg', '.mov'],
      audio: ['.mp3', '.wav', '.ogg']
    };

    return allowedTypes.flatMap(type => extensions[type] || []);
  }

  /**
   * Security scan for uploaded files
   */
  async securityScan(file) {
    try {
      // Check file size
      if (file.size > this.maxFileSize) {
        throw new Error(`File size too large: ${file.size} bytes`);
      }

      // Check for malicious patterns
      const isMalicious = await YachiSecurity.scanFileForThreats(file);
      if (isMalicious) {
        throw new Error('File contains potential security threats');
      }

      // Validate image integrity (for images)
      if (file.mimetype.startsWith('image/')) {
        await this.validateImageIntegrity(file);
      }

      return true;
    } catch (error) {
      logger.error('Security scan failed:', error);
      return false;
    }
  }

  /**
   * Validate image integrity and remove metadata
   */
  async validateImageIntegrity(file) {
    try {
      const image = sharp(file.path);
      const metadata = await image.metadata();

      // Check for reasonable dimensions
      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error('Image dimensions too large');
      }

      // Remove EXIF and other metadata for privacy
      await image
        .rotate() // Auto-rotate based on EXIF
        .withMetadata({}) // Remove all metadata
        .toFile(`${file.path}_cleaned`);

      // Replace original with cleaned version
      await fs.rename(`${file.path}_cleaned`, file.path);

      return true;
    } catch (error) {
      logger.error('Image validation failed:', error);
      throw new Error('Image validation failed');
    }
  }

  /**
   * Process profile image with AI enhancement
   */
  async processProfileImage(file, userId) {
    const cacheKey = `profile_image:${userId}`;
    
    try {
      const processedImage = await sharp(file.path)
        .resize(400, 400, { 
          fit: 'cover', 
          position: 'center',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85, 
          progressive: true,
          optimizeScans: true 
        })
        .toBuffer();

      // Generate thumbnail
      const thumbnail = await sharp(file.path)
        .resize(100, 100, { 
          fit: 'cover', 
          position: 'center' 
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // AI-powered image quality assessment
      const qualityAssessment = await YachiAI.assessImageQuality(processedImage, {
        type: 'profile',
        userId
      });

      // Save processed images
      const profileDir = this.getUserUploadDir(userId, 'profile');
      await fs.mkdir(profileDir, { recursive: true });

      const profileFilename = `profile_${userId}_${Date.now()}.jpg`;
      const thumbnailFilename = `thumbnail_${userId}_${Date.now()}.jpg`;

      const profilePath = path.join(profileDir, profileFilename);
      const thumbnailPath = path.join(profileDir, thumbnailFilename);

      await fs.writeFile(profilePath, processedImage);
      await fs.writeFile(thumbnailPath, thumbnail);

      // Clean up original file
      await fs.unlink(file.path);

      const result = {
        url: `/uploads/profiles/${userId}/${profileFilename}`,
        thumbnailUrl: `/uploads/profiles/${userId}/${thumbnailFilename}`,
        dimensions: { width: 400, height: 400 },
        size: processedImage.length,
        qualityScore: qualityAssessment.score,
        metadata: {
          processed: true,
          aiEnhanced: qualityAssessment.enhanced,
          format: 'JPEG',
          mimeType: 'image/jpeg'
        }
      };

      // Cache the result
      await redis.setex(cacheKey, 3600, JSON.stringify(result));

      // Track analytics
      await YachiAnalytics.trackFileUpload({
        userId,
        fileType: 'profile_image',
        fileSize: result.size,
        qualityScore: result.qualityScore
      });

      return result;

    } catch (error) {
      logger.error('Profile image processing failed:', error);
      throw new Error('Failed to process profile image');
    }
  }

  /**
   * Process portfolio item with multiple sizes
   */
  async processPortfolioItem(file, userId, metadata = {}) {
    try {
      const portfolioDir = this.getUserUploadDir(userId, 'portfolio');
      await fs.mkdir(portfolioDir, { recursive: true });

      const originalImage = sharp(file.path);
      const originalMetadata = await originalImage.metadata();

      // Create multiple sizes for responsive design
      const sizes = {
        original: { width: originalMetadata.width, height: originalMetadata.height },
        large: { width: 1200, height: Math.round(1200 * originalMetadata.height / originalMetadata.width) },
        medium: { width: 800, height: Math.round(800 * originalMetadata.height / originalMetadata.width) },
        small: { width: 400, height: Math.round(400 * originalMetadata.height / originalMetadata.width) },
        thumbnail: { width: 200, height: Math.round(200 * originalMetadata.height / originalMetadata.width) }
      };

      const processedImages = {};

      for (const [sizeName, dimensions] of Object.entries(sizes)) {
        let imageProcessor = originalImage.clone();

        if (sizeName !== 'original') {
          imageProcessor = imageProcessor.resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }

        const processedBuffer = await imageProcessor
          .webp({ 
            quality: sizeName === 'original' ? 90 : 80,
            effort: 6 
          })
          .toBuffer();

        const filename = `portfolio_${userId}_${Date.now()}_${sizeName}.webp`;
        const filePath = path.join(portfolioDir, filename);

        await fs.writeFile(filePath, processedBuffer);

        processedImages[sizeName] = {
          url: `/uploads/portfolios/${userId}/${filename}`,
          width: dimensions.width,
          height: dimensions.height,
          size: processedBuffer.length
        };
      }

      // AI-powered portfolio analysis
      const aiAnalysis = await YachiAI.analyzePortfolioImage(
        await originalImage.jpeg().toBuffer(),
        {
          title: metadata.title,
          description: metadata.description,
          category: metadata.category
        }
      );

      // Clean up original file
      await fs.unlink(file.path);

      const result = {
        ...processedImages,
        analysis: aiAnalysis,
        metadata: {
          originalName: file.originalname,
          originalSize: file.size,
          format: 'WEBP',
          mimeType: 'image/webp',
          uploadedAt: new Date().toISOString(),
          aiTags: aiAnalysis.tags,
          qualityScore: aiAnalysis.qualityScore
        }
      };

      // Track analytics
      await YachiAnalytics.trackFileUpload({
        userId,
        fileType: 'portfolio_item',
        fileSize: file.size,
        category: metadata.category,
        qualityScore: aiAnalysis.qualityScore
      });

      return result;

    } catch (error) {
      logger.error('Portfolio item processing failed:', error);
      throw new Error('Failed to process portfolio item');
    }
  }

  /**
   * Process verification document with OCR
   */
  async processVerificationDocument(file, userId, documentType) {
    try {
      const documentDir = this.getUserUploadDir(userId, 'document');
      await fs.mkdir(documentDir, { recursive: true });

      const filename = `document_${documentType}_${userId}_${Date.now()}${path.extname(file.originalname)}`;
      const filePath = path.join(documentDir, filename);

      // For PDF documents, extract first page as preview
      if (file.mimetype === 'application/pdf') {
        // In production, use a PDF processing library like pdf-lib or pdf2image
        // This is a simplified implementation
        await fs.copyFile(file.path, filePath);
      } else {
        // For images, create optimized version
        const processedImage = await sharp(file.path)
          .resize(1200, 1600, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 90,
            progressive: true 
          })
          .toBuffer();

        await fs.writeFile(filePath, processedImage);
      }

      // AI-powered document analysis
      const documentAnalysis = await YachiAI.analyzeDocument(
        await fs.readFile(filePath),
        {
          documentType,
          userId,
          originalName: file.originalname
        }
      );

      // Clean up original file
      await fs.unlink(file.path);

      const result = {
        url: `/uploads/documents/${userId}/${filename}`,
        documentType,
        analysis: documentAnalysis,
        metadata: {
          originalName: file.originalname,
          originalSize: file.size,
          processedSize: (await fs.stat(filePath)).size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          confidenceScore: documentAnalysis.confidenceScore
        }
      };

      // Track analytics
      await YachiAnalytics.trackFileUpload({
        userId,
        fileType: 'verification_document',
        documentType,
        fileSize: file.size,
        confidenceScore: documentAnalysis.confidenceScore
      });

      return result;

    } catch (error) {
      logger.error('Verification document processing failed:', error);
      throw new Error('Failed to process verification document');
    }
  }

  /**
   * Process selfie image with liveness detection
   */
  async processSelfieImage(file, userId) {
    try {
      const selfieDir = this.getUserUploadDir(userId, 'profile');
      await fs.mkdir(selfieDir, { recursive: true });

      const processedImage = await sharp(file.path)
        .resize(600, 600, { 
          fit: 'cover', 
          position: 'face',
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 90,
          progressive: true 
        })
        .toBuffer();

      const filename = `selfie_${userId}_${Date.now()}.jpg`;
      const filePath = path.join(selfieDir, filename);

      await fs.writeFile(filePath, processedImage);

      // AI-powered liveness detection
      const livenessCheck = await YachiAI.detectLiveness(processedImage, {
        userId,
        timestamp: new Date().toISOString()
      });

      // Clean up original file
      await fs.unlink(file.path);

      const result = {
        url: `/uploads/profiles/${userId}/${filename}`,
        liveness: livenessCheck,
        metadata: {
          processed: true,
          livenessScore: livenessCheck.confidence,
          isLive: livenessCheck.isLive,
          faceCount: livenessCheck.faceCount,
          uploadedAt: new Date().toISOString()
        }
      };

      // Track analytics
      await YachiAnalytics.trackFileUpload({
        userId,
        fileType: 'selfie_verification',
        fileSize: processedImage.length,
        livenessScore: livenessCheck.confidence,
        isLive: livenessCheck.isLive
      });

      return result;

    } catch (error) {
      logger.error('Selfie image processing failed:', error);
      throw new Error('Failed to process selfie image');
    }
  }

  /**
   * Process service image with category optimization
   */
  async processServiceImage(file, userId, serviceCategory) {
    try {
      const serviceDir = this.getUserUploadDir(userId, 'service');
      await fs.mkdir(serviceDir, { recursive: true });

      // Category-specific optimizations
      const optimizations = {
        plumbing: { quality: 85, format: 'jpeg' },
        electrical: { quality: 90, format: 'jpeg' },
        cleaning: { quality: 80, format: 'webp' },
        tutoring: { quality: 95, format: 'jpeg' },
        default: { quality: 85, format: 'webp' }
      };

      const optimization = optimizations[serviceCategory] || optimizations.default;

      const processedImage = await sharp(file.path)
        .resize(800, 600, { 
          fit: 'cover', 
          position: 'center',
          withoutEnlargement: true 
        })
        [optimization.format]({ 
          quality: optimization.quality 
        })
        .toBuffer();

      const filename = `service_${userId}_${Date.now()}.${optimization.format}`;
      const filePath = path.join(serviceDir, filename);

      await fs.writeFile(filePath, processedImage);

      // AI-powered service image analysis
      const imageAnalysis = await YachiAI.analyzeServiceImage(processedImage, {
        category: serviceCategory,
        userId
      });

      // Clean up original file
      await fs.unlink(file.path);

      const result = {
        url: `/uploads/services/${userId}/${filename}`,
        analysis: imageAnalysis,
        metadata: {
          category: serviceCategory,
          optimized: true,
          format: optimization.format.toUpperCase(),
          quality: optimization.quality,
          relevanceScore: imageAnalysis.relevanceScore,
          uploadedAt: new Date().toISOString()
        }
      };

      return result;

    } catch (error) {
      logger.error('Service image processing failed:', error);
      throw new Error('Failed to process service image');
    }
  }

  /**
   * Compress and optimize any image
   */
  async compressImage(file, options = {}) {
    const defaultOptions = {
      quality: 80,
      format: 'webp',
      maxWidth: 1920,
      maxHeight: 1080
    };

    const config = { ...defaultOptions, ...options };

    try {
      let processor = sharp(file.path);

      // Resize if needed
      const metadata = await processor.metadata();
      if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
        processor = processor.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to desired format
      const outputBuffer = await processor
        [config.format]({ quality: config.quality })
        .toBuffer();

      return {
        buffer: outputBuffer,
        format: config.format,
        quality: config.quality,
        originalSize: file.size,
        compressedSize: outputBuffer.length,
        compressionRatio: (1 - (outputBuffer.length / file.size)) * 100
      };

    } catch (error) {
      logger.error('Image compression failed:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl) {
    try {
      if (!fileUrl) return;

      // Extract file path from URL
      const filePath = path.join(process.cwd(), fileUrl);
      
      if (await this.fileExists(filePath)) {
        await fs.unlink(filePath);
        logger.info(`File deleted: ${filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('File deletion failed:', error);
      throw new Error('Failed to delete file');
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
   * Get file information
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      logger.error('File info retrieval failed:', error);
      throw new Error('Failed to get file information');
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(maxAgeHours = 24) {
    try {
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      const files = await fs.readdir(this.tempDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} temporary files`);
      return deletedCount;
    } catch (error) {
      logger.error('Temp file cleanup failed:', error);
      throw new Error('Failed to clean up temporary files');
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const directories = [
        'profiles', 'portfolios', 'documents', 'services', 'chats', 'general'
      ];

      let totalSize = 0;
      let fileCount = 0;
      const statsByType = {};

      for (const dir of directories) {
        const dirPath = path.join(this.uploadDir, dir);
        
        try {
          const { size, count } = await this.calculateDirectorySize(dirPath);
          statsByType[dir] = { size, count };
          totalSize += size;
          fileCount += count;
        } catch (error) {
          // Directory might not exist yet
          statsByType[dir] = { size: 0, count: 0 };
        }
      }

      return {
        totalSize,
        fileCount,
        statsByType,
        humanReadable: {
          totalSize: this.bytesToHumanReadable(totalSize),
          breakdown: Object.fromEntries(
            Object.entries(statsByType).map(([type, data]) => [
              type,
              {
                size: this.bytesToHumanReadable(data.size),
                count: data.count
              }
            ])
          )
        }
      };
    } catch (error) {
      logger.error('Storage stats calculation failed:', error);
      throw new Error('Failed to calculate storage statistics');
    }
  }

  /**
   * Calculate directory size recursively
   */
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;

    async function processDirectory(currentPath) {
      const items = await fs.readdir(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await processDirectory(itemPath);
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    }

    await processDirectory(dirPath);
    return { size: totalSize, count: fileCount };
  }

  /**
   * Convert bytes to human readable format
   */
  bytesToHumanReadable(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Create multer instance for specific upload type
   */
  createUploadMiddleware(fileType, allowedTypes = ['image'], maxCount = 1) {
    const storage = this.getStorageConfig(fileType);
    
    const upload = multer({
      storage,
      fileFilter: this.fileFilter(allowedTypes),
      limits: {
        fileSize: this.maxFileSize,
        files: maxCount
      }
    });

    return upload;
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService();

// Export middleware for easy use in routes
const uploadMiddleware = {
  // Single file uploads
  profileImage: fileUploadService.createUploadMiddleware('profile', ['image'], 1),
  portfolioItem: fileUploadService.createUploadMiddleware('portfolio', ['image'], 10),
  verificationDocument: fileUploadService.createUploadMiddleware('document', ['image', 'document'], 5),
  serviceImage: fileUploadService.createUploadMiddleware('service', ['image'], 5),
  chatFile: fileUploadService.createUploadMiddleware('chat', ['image', 'document', 'audio'], 1),

  // Multiple file uploads
  multiplePortfolio: fileUploadService.createUploadMiddleware('portfolio', ['image'], 10),
  multipleDocuments: fileUploadService.createUploadMiddleware('document', ['image', 'document'], 10)
};

module.exports = { fileUploadService, uploadMiddleware };