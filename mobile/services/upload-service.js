import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { 
  UPLOAD_CONFIG, 
  FILE_TYPES, 
  UPLOAD_STATUS,
  COMPRESSION_LEVELS 
} from '../config/upload';
import { 
  SECURITY_LEVELS,
  ENCRYPTION_LEVELS 
} from '../config/security';
import { 
  validateFileType,
  validateFileSize,
  scanForMalware,
  encryptFile,
  generateFileHash 
} from '../utils/security';
import { 
  formatFileSize,
  generateFileName,
  getFileExtension 
} from '../utils/formatters';
import { 
  compressImage,
  compressVideo,
  optimizeFile 
} from '../utils/compression';
import api from './api';
import analyticsService from './analytics-service';
import errorService from './error-service';
import notificationService from './notification-service';

class UploadService {
  constructor() {
    this.isInitialized = false;
    this.uploadQueue = new Map();
    this.activeUploads = new Map();
    this.uploadProgress = new Map();
    this.fileCache = new Map();
    this.retryCounts = new Map();
    this.maxConcurrentUploads = UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS;
  }

  // ==================== INITIALIZATION & PERMISSIONS ====================

  /**
   * Initialize upload service with permissions
   */
  async initialize(config = {}) {
    try {
      if (this.isInitialized) {
        console.warn('Upload service already initialized');
        return true;
      }

      // Request necessary permissions
      await this.requestPermissions();

      // Initialize upload directories
      await this.initializeDirectories();

      // Load cached uploads
      await this.loadCachedUploads();

      // Set up upload queue processor
      this.startQueueProcessor();

      this.isInitialized = true;

      await this.trackEvent('service_initialized', {
        service: 'upload_service',
        maxConcurrentUploads: this.maxConcurrentUploads
      });

      console.log('Upload service initialized successfully');
      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'upload_service_initialization',
        config
      });
      throw new Error('UPLOAD_SERVICE_INIT_FAILED');
    }
  }

  /**
   * Request necessary file access permissions
   */
  async requestPermissions() {
    try {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          throw new Error('FILE_PERMISSION_DENIED');
        }
      }

      console.log('File permissions granted');
      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'permission_request'
      });
      throw error;
    }
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    try {
      if (Platform.OS !== 'web') {
        // Create upload directory if it doesn't exist
        const uploadDir = `${FileSystem.documentDirectory}uploads/`;
        const dirInfo = await FileSystem.getInfoAsync(uploadDir);
        
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
        }

        // Create temp directory
        const tempDir = `${FileSystem.cacheDirectory}temp/`;
        const tempInfo = await FileSystem.getInfoAsync(tempDir);
        
        if (!tempInfo.exists) {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        }
      }
    } catch (error) {
      await errorService.captureError(error, {
        context: 'directory_initialization'
      });
      throw error;
    }
  }

  // ==================== FILE SELECTION & PREPARATION ====================

  /**
   * Select files from device with comprehensive options
   */
  async selectFiles(options = {}) {
    try {
      const {
        mediaTypes = ['images', 'videos'],
        allowsMultipleSelection = false,
        maxFiles = 10,
        maxSize = UPLOAD_CONFIG.MAX_FILE_SIZE,
        compression = COMPRESSION_LEVELS.MEDIUM
      } = options;

      // Configure image picker
      const pickerOptions = {
        mediaTypes: this.getMediaTypes(mediaTypes),
        allowsMultipleSelection,
        quality: this.mapCompressionToQuality(compression),
        exif: true,
        base64: false
      };

      // Launch file picker
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled) {
        return { files: [], canceled: true };
      }

      // Process selected files
      const files = await this.processSelectedFiles(
        result.assets || [result],
        { maxFiles, maxSize, compression }
      );

      await this.trackEvent('files_selected', {
        fileCount: files.length,
        mediaTypes,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      });

      return { files, canceled: false };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'file_selection',
        options
      });
      throw this.formatUploadError(error);
    }
  }

  /**
   * Capture photo/video from camera
   */
  async captureMedia(options = {}) {
    try {
      const {
        type = 'photo',
        compression = COMPRESSION_LEVELS.MEDIUM,
        maxDuration = 300, // 5 minutes for video
        maxSize = UPLOAD_CONFIG.MAX_FILE_SIZE
      } = options;

      const pickerOptions = {
        mediaTypes: type === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: this.mapCompressionToQuality(compression),
        videoMaxDuration: maxDuration,
        exif: true,
        base64: false
      };

      const result = await ImagePicker.launchCameraAsync(pickerOptions);

      if (result.canceled) {
        return { file: null, canceled: true };
      }

      const asset = result.assets ? result.assets[0] : result;
      const file = await this.prepareFileForUpload(asset, { compression, maxSize });

      await this.trackEvent('media_captured', {
        type,
        fileSize: file.size,
        duration: file.duration
      });

      return { file, canceled: false };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'media_capture',
        options
      });
      throw this.formatUploadError(error);
    }
  }

  // ==================== FILE PROCESSING & OPTIMIZATION ====================

  /**
   * Process selected files for upload
   */
  async processSelectedFiles(assets, options = {}) {
    const processedFiles = [];

    for (const asset of assets.slice(0, options.maxFiles)) {
      try {
        const file = await this.prepareFileForUpload(asset, options);
        processedFiles.push(file);
      } catch (error) {
        console.warn('Failed to process file:', error);
        // Continue with other files
      }
    }

    return processedFiles;
  }

  /**
   * Prepare file for upload with validation and optimization
   */
  async prepareFileForUpload(asset, options = {}) {
    try {
      // Get file info
      const fileInfo = await this.getFileInfo(asset);
      
      // Validate file
      const validation = await this.validateFile(fileInfo, options);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Optimize file based on type
      const optimizedFile = await this.optimizeFile(fileInfo, options);

      // Generate file metadata
      const metadata = await this.generateFileMetadata(optimizedFile);

      // Create upload-ready file object
      const file = {
        id: generateFileName(),
        uri: optimizedFile.uri,
        name: optimizedFile.name,
        type: optimizedFile.type,
        size: optimizedFile.size,
        ...metadata,
        uploadStatus: UPLOAD_STATUS.PENDING,
        createdAt: new Date().toISOString()
      };

      // Cache file info
      this.cacheFile(file.id, file);

      return file;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'file_preparation',
        assetUri: asset.uri,
        options
      });
      throw error;
    }
  }

  /**
   * Get comprehensive file information
   */
  async getFileInfo(asset) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      if (!fileInfo.exists) {
        throw new Error('FILE_NOT_FOUND');
      }

      return {
        uri: asset.uri,
        name: asset.fileName || this.generateFileName(asset.uri),
        type: asset.type || this.detectFileType(asset.uri),
        size: fileInfo.size,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        exif: asset.exif,
        originalUri: asset.uri
      };

    } catch (error) {
      await errorService.captureError(error, {
        context: 'file_info_retrieval',
        assetUri: asset.uri
      });
      throw error;
    }
  }

  /**
   * Optimize file based on type and options
   */
  async optimizeFile(fileInfo, options = {}) {
    try {
      let optimizedFile = { ...fileInfo };

      // Apply compression based on file type
      switch (fileInfo.type) {
        case FILE_TYPES.IMAGE:
          optimizedFile = await this.compressImageFile(fileInfo, options);
          break;
        
        case FILE_TYPES.VIDEO:
          optimizedFile = await this.compressVideoFile(fileInfo, options);
          break;
        
        case FILE_TYPES.DOCUMENT:
          optimizedFile = await this.optimizeDocument(fileInfo, options);
          break;
        
        default:
          // For other file types, just validate
          break;
      }

      // Generate hash for file integrity
      optimizedFile.hash = await generateFileHash(optimizedFile.uri);

      return optimizedFile;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'file_optimization',
        fileType: fileInfo.type,
        options
      });
      
      // Return original file if optimization fails
      return fileInfo;
    }
  }

  /**
   * Compress image file
   */
  async compressImageFile(fileInfo, options) {
    const compressedUri = await compressImage(fileInfo.uri, {
      quality: options.compression || COMPRESSION_LEVELS.MEDIUM,
      maxWidth: UPLOAD_CONFIG.IMAGE_MAX_WIDTH,
      maxHeight: UPLOAD_CONFIG.IMAGE_MAX_HEIGHT,
      format: 'JPEG'
    });

    const compressedInfo = await FileSystem.getInfoAsync(compressedUri);

    return {
      ...fileInfo,
      uri: compressedUri,
      size: compressedInfo.size,
      compressed: true,
      originalSize: fileInfo.size
    };
  }

  /**
   * Compress video file
   */
  async compressVideoFile(fileInfo, options) {
    const compressedUri = await compressVideo(fileInfo.uri, {
      quality: options.compression || COMPRESSION_LEVELS.MEDIUM,
      maxDuration: options.maxDuration,
      bitrate: UPLOAD_CONFIG.VIDEO_BITRATE
    });

    const compressedInfo = await FileSystem.getInfoAsync(compressedUri);

    return {
      ...fileInfo,
      uri: compressedUri,
      size: compressedInfo.size,
      compressed: true,
      originalSize: fileInfo.size
    };
  }

  // ==================== UPLOAD MANAGEMENT ====================

  /**
   * Upload file with progress tracking and retry logic
   */
  async uploadFile(file, options = {}) {
    try {
      const {
        category = 'general',
        encryption = ENCRYPTION_LEVELS.STANDARD,
        metadata = {},
        onProgress = null,
        onComplete = null,
        onError = null
      } = options;

      // Validate file before upload
      const validation = await this.validateFileForUpload(file);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Generate upload ID
      const uploadId = this.generateUploadId();

      // Create upload job
      const uploadJob = {
        id: uploadId,
        file,
        category,
        encryption,
        metadata,
        status: UPLOAD_STATUS.QUEUED,
        createdAt: new Date().toISOString(),
        callbacks: { onProgress, onComplete, onError }
      };

      // Add to upload queue
      this.uploadQueue.set(uploadId, uploadJob);
      this.uploadProgress.set(uploadId, 0);

      // Start queue processing if not already running
      this.processUploadQueue();

      return uploadId;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'upload_initiation',
        fileName: file.name,
        options
      });
      throw this.formatUploadError(error);
    }
  }

  /**
   * Upload multiple files in batch
   */
  async uploadFiles(files, options = {}) {
    try {
      const uploadIds = [];

      for (const file of files) {
        const uploadId = await this.uploadFile(file, options);
        uploadIds.push(uploadId);
      }

      await this.trackEvent('batch_upload_started', {
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        category: options.category
      });

      return uploadIds;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'batch_upload_initiation',
        fileCount: files.length,
        options
      });
      throw this.formatUploadError(error);
    }
  }

  /**
   * Process upload queue with concurrency control
   */
  async processUploadQueue() {
    // Check if already processing or queue empty
    if (this.activeUploads.size >= this.maxConcurrentUploads || this.uploadQueue.size === 0) {
      return;
    }

    // Get next uploads to process
    const queuedUploads = Array.from(this.uploadQueue.values())
      .filter(upload => upload.status === UPLOAD_STATUS.QUEUED)
      .slice(0, this.maxConcurrentUploads - this.activeUploads.size);

    for (const upload of queuedUploads) {
      this.processUpload(upload).catch(error => {
        console.error('Upload processing failed:', error);
      });
    }
  }

  /**
   * Process individual upload
   */
  async processUpload(upload) {
    try {
      // Update status
      upload.status = UPLOAD_STATUS.UPLOADING;
      this.uploadQueue.set(upload.id, upload);
      this.activeUploads.set(upload.id, upload);

      // Prepare upload data
      const formData = await this.prepareFormData(upload);

      // Execute upload
      const result = await this.executeUpload(upload, formData);

      // Handle successful upload
      await this.handleUploadSuccess(upload, result);

      // Call completion callback
      if (upload.callbacks.onComplete) {
        upload.callbacks.onComplete(result);
      }

      await this.trackEvent('upload_completed', {
        uploadId: upload.id,
        fileId: result.fileId,
        fileSize: upload.file.size,
        uploadTime: Date.now() - new Date(upload.createdAt).getTime()
      });

    } catch (error) {
      await this.handleUploadError(upload, error);
    } finally {
      // Clean up
      this.activeUploads.delete(upload.id);
      this.uploadQueue.delete(upload.id);
      
      // Process next in queue
      this.processUploadQueue();
    }
  }

  /**
   * Execute file upload to server
   */
  async executeUpload(upload, formData) {
    return new Promise(async (resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          this.uploadProgress.set(upload.id, progress);
          
          if (upload.callbacks.onProgress) {
            upload.callbacks.onProgress(progress);
          }
        }
      };

      // Handle completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.data);
          } catch (parseError) {
            reject(new Error('INVALID_RESPONSE_FORMAT'));
          }
        } else {
          reject(new Error(`UPLOAD_FAILED: ${xhr.status}`));
        }
      };

      // Handle errors
      xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
      xhr.ontimeout = () => reject(new Error('UPLOAD_TIMEOUT'));

      // Configure and send request
      xhr.open('POST', `${api.baseURL}/uploads`);
      xhr.setRequestHeader('Authorization', `Bearer ${await this.getAuthToken()}`);
      
      // Set timeout
      xhr.timeout = UPLOAD_CONFIG.UPLOAD_TIMEOUT;

      xhr.send(formData);
    });
  }

  // ==================== UPLOAD STATUS & MANAGEMENT ====================

  /**
   * Get upload progress
   */
  getUploadProgress(uploadId) {
    return this.uploadProgress.get(uploadId) || 0;
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId) {
    const upload = this.uploadQueue.get(uploadId) || this.activeUploads.get(uploadId);
    return upload ? upload.status : UPLOAD_STATUS.UNKNOWN;
  }

  /**
   * Cancel upload
   */
  async cancelUpload(uploadId) {
    try {
      const upload = this.uploadQueue.get(uploadId) || this.activeUploads.get(uploadId);
      
      if (!upload) {
        throw new Error('UPLOAD_NOT_FOUND');
      }

      // Update status
      upload.status = UPLOAD_STATUS.CANCELLED;
      
      // Remove from queues
      this.uploadQueue.delete(uploadId);
      this.activeUploads.delete(uploadId);
      this.uploadProgress.delete(uploadId);

      // Call error callback
      if (upload.callbacks.onError) {
        upload.callbacks.onError(new Error('UPLOAD_CANCELLED'));
      }

      await this.trackEvent('upload_cancelled', {
        uploadId,
        fileSize: upload.file.size,
        progress: this.getUploadProgress(uploadId)
      });

      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'upload_cancellation',
        uploadId
      });
      throw error;
    }
  }

  /**
   * Retry failed upload
   */
  async retryUpload(uploadId) {
    try {
      const upload = this.uploadQueue.get(uploadId);
      
      if (!upload) {
        throw new Error('UPLOAD_NOT_FOUND');
      }

      // Check retry limit
      const retryCount = this.retryCounts.get(uploadId) || 0;
      if (retryCount >= UPLOAD_CONFIG.MAX_RETRIES) {
        throw new Error('MAX_RETRIES_EXCEEDED');
      }

      // Update retry count
      this.retryCounts.set(uploadId, retryCount + 1);

      // Reset status and progress
      upload.status = UPLOAD_STATUS.QUEUED;
      this.uploadProgress.set(uploadId, 0);

      // Re-add to queue
      this.uploadQueue.set(uploadId, upload);

      // Process queue
      this.processUploadQueue();

      await this.trackEvent('upload_retried', {
        uploadId,
        retryCount: retryCount + 1
      });

      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'upload_retry',
        uploadId
      });
      throw error;
    }
  }

  // ==================== SECURITY & VALIDATION ====================

  /**
   * Validate file before upload
   */
  async validateFile(fileInfo, options = {}) {
    const errors = [];

    // Validate file type
    const typeValidation = validateFileType(fileInfo.type, fileInfo.name);
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors);
    }

    // Validate file size
    const sizeValidation = validateFileSize(fileInfo.size, fileInfo.type);
    if (!sizeValidation.isValid) {
      errors.push(...sizeValidation.errors);
    }

    // Check against max file size
    if (fileInfo.size > (options.maxSize || UPLOAD_CONFIG.MAX_FILE_SIZE)) {
      errors.push(`File size exceeds maximum limit of ${formatFileSize(options.maxSize)}`);
    }

    // Security scan for malicious files
    if (UPLOAD_CONFIG.ENABLE_MALWARE_SCAN) {
      const scanResult = await scanForMalware(fileInfo.uri);
      if (!scanResult.isSafe) {
        errors.push('File failed security scan');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file for upload
   */
  async validateFileForUpload(file) {
    const errors = [];

    if (!file.uri) {
      errors.push('File URI is required');
    }

    if (!file.name) {
      errors.push('File name is required');
    }

    if (!file.type) {
      errors.push('File type is required');
    }

    // Check if file exists
    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        errors.push('File not found');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ==================== FILE MANAGEMENT & CACHE ====================

  /**
   * Get file URL from file ID
   */
  async getFileUrl(fileId, options = {}) {
    try {
      const {
        width = null,
        height = null,
        quality = COMPRESSION_LEVELS.MEDIUM,
        format = 'auto'
      } = options;

      // Check cache first
      const cached = this.fileCache.get(fileId);
      if (cached && cached.url) {
        return this.applyImageTransformations(cached.url, { width, height, quality, format });
      }

      // Fetch from server
      const response = await api.get(`/files/${fileId}/url`, {
        width,
        height,
        quality,
        format
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get file URL');
      }

      const fileUrl = response.data.url;

      // Update cache
      if (cached) {
        cached.url = fileUrl;
        this.fileCache.set(fileId, cached);
      }

      return fileUrl;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'file_url_retrieval',
        fileId,
        options
      });
      throw error;
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileId) {
    try {
      const response = await api.delete(`/files/${fileId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete file');
      }

      // Remove from cache
      this.fileCache.delete(fileId);

      await this.trackEvent('file_deleted', { fileId });

      return true;

    } catch (error) {
      await errorService.captureError(error, {
        context: 'file_deletion',
        fileId
      });
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Prepare form data for upload
   */
  async prepareFormData(upload) {
    const formData = new FormData();

    // File data
    formData.append('file', {
      uri: upload.file.uri,
      type: upload.file.type,
      name: upload.file.name
    });

    // Metadata
    formData.append('category', upload.category);
    formData.append('encryption', upload.encryption);
    formData.append('metadata', JSON.stringify(upload.metadata));

    // File hash for integrity verification
    formData.append('fileHash', upload.file.hash);

    return formData;
  }

  /**
   * Generate file metadata
   */
  async generateFileMetadata(file) {
    return {
      originalName: file.name,
      fileSize: file.size,
      fileHash: file.hash,
      mimeType: file.type,
      dimensions: file.width && file.height ? {
        width: file.width,
        height: file.height
      } : null,
      duration: file.duration || null,
      deviceInfo: this.getDeviceInfo(),
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Handle upload success
   */
  async handleUploadSuccess(upload, result) {
    // Update file cache with server response
    this.cacheFile(upload.file.id, {
      ...upload.file,
      fileId: result.fileId,
      url: result.url,
      uploadStatus: UPLOAD_STATUS.COMPLETED,
      completedAt: new Date().toISOString()
    });

    // Send notification for large uploads
    if (upload.file.size > UPLOAD_CONFIG.LARGE_FILE_THRESHOLD) {
      await notificationService.sendUploadCompleteNotification(upload.file);
    }
  }

  /**
   * Handle upload error
   */
  async handleUploadError(upload, error) {
    // Update status
    upload.status = UPLOAD_STATUS.FAILED;
    upload.error = error.message;
    upload.failedAt = new Date().toISOString();

    // Call error callback
    if (upload.callbacks.onError) {
      upload.callbacks.onError(error);
    }

    await errorService.captureError(error, {
      context: 'upload_processing',
      uploadId: upload.id,
      fileName: upload.file.name,
      fileSize: upload.file.size
    });

    await this.trackEvent('upload_failed', {
      uploadId: upload.id,
      error: error.message,
      fileSize: upload.file.size
    });
  }

  /**
   * Format upload error for user display
   */
  formatUploadError(error) {
    const errorMap = {
      'FILE_TOO_LARGE': 'File size exceeds maximum limit',
      'INVALID_FILE_TYPE': 'File type not supported',
      'NETWORK_ERROR': 'Network error. Please check your connection',
      'UPLOAD_TIMEOUT': 'Upload timed out. Please try again',
      'FILE_PERMISSION_DENIED': 'File access permission denied',
      'MALWARE_DETECTED': 'File failed security scan'
    };

    const message = errorMap[error.message] || 
                   error.response?.data?.message || 
                   'Upload failed. Please try again.';

    return new Error(message);
  }

  /**
   * Generate upload ID
   */
  generateUploadId() {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model,
      brand: Platform.constants?.Brand
    };
  }

  // ==================== CLEANUP & MAINTENANCE ====================

  /**
   * Cleanup upload service
   */
  async cleanup() {
    try {
      // Cancel all active uploads
      for (const uploadId of this.activeUploads.keys()) {
        await this.cancelUpload(uploadId);
      }

      // Clear queues and caches
      this.uploadQueue.clear();
      this.activeUploads.clear();
      this.uploadProgress.clear();
      this.retryCounts.clear();

      // Clear temp files
      await this.clearTempFiles();

      this.isInitialized = false;

      await this.trackEvent('service_cleaned_up');

    } catch (error) {
      await errorService.captureError(error, {
        context: 'upload_service_cleanup'
      });
    }
  }

  /**
   * Clear temporary files
   */
  async clearTempFiles() {
    try {
      if (Platform.OS !== 'web') {
        const tempDir = `${FileSystem.cacheDirectory}temp/`;
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      }
    } catch (error) {
      console.warn('Failed to clear temp files:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      queueSize: this.uploadQueue.size,
      activeUploads: this.activeUploads.size,
      cachedFiles: this.fileCache.size,
      maxConcurrentUploads: this.maxConcurrentUploads
    };
  }
}

// Create singleton instance
const uploadService = new UploadService();

export default uploadService;