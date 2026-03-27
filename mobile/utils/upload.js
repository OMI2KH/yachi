// utils/upload.js
/**
 * Enterprise Upload Utilities for Yachi Platform
 * Comprehensive file upload management with validation, compression, and progress tracking
 * Version: 2.0.0
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { generateId, isValidFileType, isValidFileSize } from './helpers';

// ===== UPLOAD CONFIGURATION =====
export const UPLOAD_CONFIG = {
  // File size limits (in bytes)
  LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB for multiple files
    MAX_FILES: 10, // Maximum files per upload
  },

  // Allowed file types
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],

  // Image compression settings
  COMPRESSION: {
    QUALITY: 0.8,
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    FORMAT: 'JPEG',
  },

  // Upload settings
  UPLOAD: {
    CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    TIMEOUT: 30000, // 30 seconds
  },

  // Storage keys
  STORAGE_KEYS: {
    UPLOAD_QUEUE: 'upload_queue',
    UPLOAD_CACHE: 'upload_cache',
    UPLOAD_PREFERENCES: 'upload_preferences',
  },

  // Default preferences
  DEFAULT_PREFERENCES: {
    compressImages: true,
    uploadOverWifiOnly: false,
    autoRetryFailed: true,
    preserveOriginal: false,
  },
};

// ===== ERROR TYPES AND MESSAGES =====
export const UPLOAD_ERRORS = {
  PERMISSION_DENIED: {
    code: 'UPLOAD_PERMISSION_DENIED',
    message: 'Permission to access files was denied',
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'File size exceeds maximum limit',
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    message: 'File type is not supported',
  },
  UPLOAD_FAILED: {
    code: 'UPLOAD_FAILED',
    message: 'File upload failed',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed during upload',
  },
  STORAGE_ERROR: {
    code: 'STORAGE_ERROR',
    message: 'Failed to access device storage',
  },
};

// ===== FILE VALIDATION UTILITIES =====

/**
 * Validate file type against allowed types
 * @param {string} mimeType - File MIME type
 * @param {string} fileName - File name
 * @returns {Object} Validation result
 */
export const validateFileType = (mimeType, fileName = '') => {
  if (!mimeType || typeof mimeType !== 'string') {
    return {
      valid: false,
      error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
      reason: 'MIME type not provided',
    };
  }

  // Check against allowed types
  const isAllowed = UPLOAD_CONFIG.ALLOWED_TYPES.includes(mimeType);
  
  if (!isAllowed) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
      reason: `File type ${mimeType} is not allowed`,
      allowedTypes: UPLOAD_CONFIG.ALLOWED_TYPES,
    };
  }

  // Additional extension validation for extra security
  if (fileName) {
    const extension = fileName.toLowerCase().split('.').pop();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
    
    if (extension && !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
        reason: `File extension .${extension} is not allowed`,
      };
    }
  }

  return { valid: true };
};

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @param {string} fileType - File type for error message
 * @returns {Object} Validation result
 */
export const validateFileSize = (fileSize, fileType = 'file') => {
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.FILE_TOO_LARGE,
      reason: 'File size must be a positive number',
    };
  }

  const maxSize = UPLOAD_CONFIG.LIMITS.MAX_FILE_SIZE;
  
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.FILE_TOO_LARGE,
      reason: `${fileType} exceeds maximum size of ${formatFileSize(maxSize)}`,
      maxSize,
      currentSize: fileSize,
    };
  }

  return { valid: true };
};

/**
 * Validate multiple files
 * @param {Array} files - Array of file objects
 * @returns {Object} Validation result
 */
export const validateFiles = (files) => {
  if (!Array.isArray(files)) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
      reason: 'Invalid files array',
    };
  }

  // Check total file count
  if (files.length > UPLOAD_CONFIG.LIMITS.MAX_FILES) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.FILE_TOO_LARGE,
      reason: `Maximum ${UPLOAD_CONFIG.LIMITS.MAX_FILES} files allowed`,
      maxFiles: UPLOAD_CONFIG.LIMITS.MAX_FILES,
      currentCount: files.length,
    };
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  if (totalSize > UPLOAD_CONFIG.LIMITS.MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.FILE_TOO_LARGE,
      reason: `Total files size exceeds ${formatFileSize(UPLOAD_CONFIG.LIMITS.MAX_TOTAL_SIZE)}`,
      maxTotalSize: UPLOAD_CONFIG.LIMITS.MAX_TOTAL_SIZE,
      currentTotalSize: totalSize,
    };
  }

  // Validate each file
  const validationResults = files.map((file, index) => ({
    file,
    index,
    typeValidation: validateFileType(file.mimeType, file.name),
    sizeValidation: validateFileSize(file.size, file.name),
  }));

  const invalidFiles = validationResults.filter(
    result => !result.typeValidation.valid || !result.sizeValidation.valid
  );

  if (invalidFiles.length > 0) {
    return {
      valid: false,
      error: UPLOAD_ERRORS.INVALID_FILE_TYPE,
      reason: 'Invalid files found',
      invalidFiles,
      totalFiles: files.length,
      validFiles: files.length - invalidFiles.length,
    };
  }

  return {
    valid: true,
    totalFiles: files.length,
    totalSize,
  };
};

/**
 * Get file information
 * @param {string} fileUri - File URI
 * @param {string} mimeType - Optional MIME type
 * @returns {Promise<Object>} File information
 */
export const getFileInfo = async (fileUri, mimeType = null) => {
  if (!fileUri || typeof fileUri !== 'string') {
    throw new Error('Invalid file URI');
  }

  // Get file info from file system
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }

  // Extract file name from URI
  const fileName = fileUri.split('/').pop() || 'unknown';
  
  // Determine MIME type if not provided
  let detectedMimeType = mimeType;
  if (!detectedMimeType) {
    detectedMimeType = detectMimeType(fileName, fileUri);
  }

  const fileData = {
    uri: fileUri,
    name: fileName,
    size: fileInfo.size,
    mimeType: detectedMimeType,
    extension: fileName.split('.').pop()?.toLowerCase(),
    lastModified: fileInfo.modificationTime || Date.now(),
  };

  return fileData;
};

/**
 * Detect MIME type from file name or URI
 * @param {string} fileName - File name
 * @param {string} fileUri - File URI
 * @returns {string} MIME type
 */
export const detectMimeType = (fileName, fileUri) => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const mimeMap = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // Default
    'default': 'application/octet-stream',
  };

  return mimeMap[extension] || mimeMap.default;
};

// ===== FILE SELECTION UTILITIES =====

/**
 * Request media library permissions
 * @returns {Promise<Object>} Permission result
 */
export const requestMediaPermissions = async () => {
  try {
    if (Platform.OS === 'web') {
      return { granted: true, status: 'granted' };
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    return {
      granted: status === 'granted',
      status,
      canAskAgain: status === 'undetermined',
    };

  } catch (error) {
    console.error('Failed to request media permissions:', error);
    return {
      granted: false,
      status: 'error',
      canAskAgain: false,
    };
  }
};

/**
 * Select images from gallery
 * @param {Object} options - Selection options
 * @returns {Promise<Object>} Selection result
 */
export const selectImages = async (options = {}) => {
  try {
    const {
      allowsMultipleSelection = true,
      allowsEditing = false,
      quality = UPLOAD_CONFIG.COMPRESSION.QUALITY,
      maxFiles = UPLOAD_CONFIG.LIMITS.MAX_FILES,
      base64 = false,
    } = options;

    // Request permissions
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error(UPLOAD_ERRORS.PERMISSION_DENIED.message);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection,
      allowsEditing,
      quality,
      base64,
      exif: false, // Don't include EXIF data for privacy
    });

    if (result.canceled) {
      return {
        success: false,
        canceled: true,
        files: [],
      };
    }

    // Process selected images
    const selectedFiles = result.assets.map(asset => ({
      uri: asset.uri,
      name: `image_${Date.now()}.${asset.uri.split('.').pop()}`,
      type: asset.type || 'image',
      mimeType: `image/${asset.type === 'video' ? 'mp4' : 'jpeg'}`,
      width: asset.width,
      height: asset.height,
      size: asset.fileSize || 0,
      base64: asset.base64,
    }));

    // Validate selected files
    const validation = validateFiles(selectedFiles);
    if (!validation.valid) {
      throw new Error(validation.error.message);
    }

    return {
      success: true,
      canceled: false,
      files: selectedFiles,
      total: selectedFiles.length,
    };

  } catch (error) {
    console.error('Failed to select images:', error);
    throw error;
  }
};

/**
 * Capture image from camera
 * @param {Object} options - Capture options
 * @returns {Promise<Object>} Capture result
 */
export const captureImage = async (options = {}) => {
  try {
    const {
      allowsEditing = false,
      quality = UPLOAD_CONFIG.COMPRESSION.QUALITY,
      base64 = false,
    } = options;

    // Request camera permissions
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error(UPLOAD_ERRORS.PERMISSION_DENIED.message);
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing,
      quality,
      base64,
      exif: false,
    });

    if (result.canceled) {
      return {
        success: false,
        canceled: true,
        file: null,
      };
    }

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: `photo_${Date.now()}.${asset.uri.split('.').pop()}`,
      type: 'image',
      mimeType: `image/jpeg`,
      width: asset.width,
      height: asset.height,
      size: asset.fileSize || 0,
      base64: asset.base64,
    };

    // Validate file
    const typeValidation = validateFileType(file.mimeType, file.name);
    const sizeValidation = validateFileSize(file.size, file.name);

    if (!typeValidation.valid || !sizeValidation.valid) {
      throw new Error(typeValidation.error?.message || sizeValidation.error?.message);
    }

    return {
      success: true,
      canceled: false,
      file,
    };

  } catch (error) {
    console.error('Failed to capture image:', error);
    throw error;
  }
};

/**
 * Select documents/files
 * @param {Object} options - Document selection options
 * @returns {Promise<Object>} Selection result
 */
export const selectDocuments = async (options = {}) => {
  try {
    const {
      multiple = true,
      type = '*/*',
    } = options;

    const result = await DocumentPicker.getDocumentAsync({
      type,
      multiple,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return {
        success: false,
        canceled: true,
        files: [],
      };
    }

    const selectedFiles = result.assets.map(asset => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size || 0,
      type: 'document',
    }));

    // Validate files
    const validation = validateFiles(selectedFiles);
    if (!validation.valid) {
      throw new Error(validation.error.message);
    }

    return {
      success: true,
      canceled: false,
      files: selectedFiles,
      total: selectedFiles.length,
    };

  } catch (error) {
    console.error('Failed to select documents:', error);
    throw error;
  }
};

// ===== IMAGE PROCESSING UTILITIES =====

/**
 * Compress and optimize image
 * @param {string} imageUri - Image URI
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} Compression result
 */
export const compressImage = async (imageUri, options = {}) => {
  try {
    const {
      quality = UPLOAD_CONFIG.COMPRESSION.QUALITY,
      maxWidth = UPLOAD_CONFIG.COMPRESSION.MAX_WIDTH,
      maxHeight = UPLOAD_CONFIG.COMPRESSION.MAX_HEIGHT,
      format = UPLOAD_CONFIG.COMPRESSION.FORMAT,
    } = options;

    // Get original image info
    const originalInfo = await FileSystem.getInfoAsync(imageUri);
    if (!originalInfo.exists) {
      throw new Error('Original image does not exist');
    }

    // For Expo, we use ImageManipulator through expo-image-manipulator
    // This is a simplified version - you'd integrate with actual compression library
    
    const compressedUri = await simulateCompression(imageUri, {
      quality,
      maxWidth,
      maxHeight,
    });

    const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
    
    return {
      originalUri: imageUri,
      compressedUri,
      originalSize: originalInfo.size,
      compressedSize: compressedInfo.size,
      reduction: ((originalInfo.size - compressedInfo.size) / originalInfo.size) * 100,
      quality,
    };

  } catch (error) {
    console.error('Failed to compress image:', error);
    throw error;
  }
};

/**
 * Simulate image compression (replace with actual implementation)
 * @param {string} imageUri - Image URI
 * @param {Object} options - Compression options
 * @returns {Promise<string>} Compressed image URI
 */
const simulateCompression = async (imageUri, options) => {
  // In a real implementation, you would use:
  // - expo-image-manipulator for basic operations
  // - react-native-compressor for advanced compression
  // - Custom native modules for specific needs
  
  // For now, return the original URI (no compression)
  return imageUri;
};

/**
 * Generate thumbnail for image
 * @param {string} imageUri - Image URI
 * @param {Object} size - Thumbnail size
 * @returns {Promise<string>} Thumbnail URI
 */
export const generateThumbnail = async (imageUri, size = { width: 200, height: 200 }) => {
  try {
    // This would use actual image processing
    // For now, return the original URI
    return imageUri;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw error;
  }
};

/**
 * Convert image to base64
 * @param {string} imageUri - Image URI
 * @returns {Promise<string>} Base64 encoded image
 */
export const imageToBase64 = async (imageUri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw error;
  }
};

// ===== UPLOAD MANAGEMENT =====

/**
 * Upload single file with progress tracking
 * @param {Object} file - File object
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadFile = async (file, options = {}) => {
  try {
    const {
      endpoint = '/upload/single',
      onProgress = null,
      onComplete = null,
      onError = null,
      headers = {},
      retryCount = 0,
    } = options;

    // Validate file
    const fileInfo = await getFileInfo(file.uri, file.mimeType);
    const typeValidation = validateFileType(fileInfo.mimeType, fileInfo.name);
    const sizeValidation = validateFileSize(fileInfo.size, fileInfo.name);

    if (!typeValidation.valid || !sizeValidation.valid) {
      throw new Error(typeValidation.error?.message || sizeValidation.error?.message);
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: fileInfo.mimeType,
      name: fileInfo.name,
    });

    // Additional metadata
    formData.append('metadata', JSON.stringify({
      originalName: fileInfo.name,
      size: fileInfo.size,
      mimeType: fileInfo.mimeType,
      uploadedAt: new Date().toISOString(),
    }));

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress({
            loaded: event.loaded,
            total: event.total,
            progress,
            file: fileInfo,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          
          if (onComplete) {
            onComplete(response, fileInfo);
          }
          
          resolve(response);
        } else {
          const error = new Error(`Upload failed with status ${xhr.status}`);
          if (onError) {
            onError(error, fileInfo, retryCount);
          }
          reject(error);
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Upload failed');
        if (onError) {
          onError(error, fileInfo, retryCount);
        }
        reject(error);
      });

      xhr.addEventListener('timeout', () => {
        const error = new Error('Upload timeout');
        if (onError) {
          onError(error, fileInfo, retryCount);
        }
        reject(error);
      });

      xhr.timeout = UPLOAD_CONFIG.UPLOAD.TIMEOUT;
      xhr.open('POST', endpoint);
      
      // Set headers
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.send(formData);
    });

  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};

/**
 * Upload multiple files with concurrency control
 * @param {Array} files - Array of file objects
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload results
 */
export const uploadMultipleFiles = async (files, options = {}) => {
  try {
    const {
      endpoint = '/upload/multiple',
      onProgress = null,
      onComplete = null,
      onError = null,
      concurrency = 3,
      headers = {},
    } = options;

    // Validate all files first
    const validation = validateFiles(files);
    if (!validation.valid) {
      throw new Error(validation.error.message);
    }

    const results = {
      successful: [],
      failed: [],
      total: files.length,
      completed: 0,
    };

    // Upload files with concurrency control
    const uploadQueue = [...files];
    const activeUploads = new Set();

    const processNext = async () => {
      if (uploadQueue.length === 0 && activeUploads.size === 0) {
        // All uploads completed
        if (onComplete) {
          onComplete(results);
        }
        return;
      }

      if (uploadQueue.length === 0 || activeUploads.size >= concurrency) {
        return;
      }

      const file = uploadQueue.shift();
      const uploadId = `${file.name}_${Date.now()}`;
      activeUploads.add(uploadId);

      try {
        const result = await uploadFile(file, {
          endpoint,
          headers,
          onProgress: (progress) => {
            if (onProgress) {
              onProgress({
                ...progress,
                file,
                overallProgress: ((results.completed + (progress.progress / 100)) / results.total) * 100,
              });
            }
          },
        });

        results.successful.push({
          file,
          result,
          uploadId,
        });

      } catch (error) {
        results.failed.push({
          file,
          error,
          uploadId,
        });
      } finally {
        results.completed++;
        activeUploads.delete(uploadId);
        await processNext(); // Process next file
      }
    };

    // Start initial uploads
    const initialUploads = Math.min(concurrency, files.length);
    const uploadPromises = [];
    
    for (let i = 0; i < initialUploads; i++) {
      uploadPromises.push(processNext());
    }

    await Promise.all(uploadPromises);

    return results;

  } catch (error) {
    console.error('Multiple files upload failed:', error);
    throw error;
  }
};

/**
 * Upload file with retry logic
 * @param {Object} file - File object
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadWithRetry = async (file, options = {}) => {
  const {
    maxRetries = UPLOAD_CONFIG.UPLOAD.MAX_RETRIES,
    retryDelay = UPLOAD_CONFIG.UPLOAD.RETRY_DELAY,
    onRetry = null,
    ...uploadOptions
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFile(file, {
        ...uploadOptions,
        retryCount: attempt - 1,
      });
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (onRetry) {
        onRetry(error, attempt, maxRetries);
      }

      if (attempt === maxRetries) break;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError;
};

/**
 * Clean up temporary files
 * @param {Array} fileUris - Array of file URIs to clean up
 * @returns {Promise<boolean>} Cleanup result
 */
export const cleanupTempFiles = async (fileUris = []) => {
  try {
    const deletePromises = fileUris.map(async (uri) => {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete temp file:', uri, error);
      }
    });

    await Promise.all(deletePromises);
    console.log('Temporary files cleaned up');
    return true;

  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
    return false;
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get upload preferences
 * @returns {Promise<Object>} Upload preferences
 */
export const getUploadPreferences = async () => {
  try {
    // This would typically load from secure storage
    return UPLOAD_CONFIG.DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Failed to get upload preferences:', error);
    return UPLOAD_CONFIG.DEFAULT_PREFERENCES;
  }
};

/**
 * Update upload preferences
 * @param {Object} updates - Preference updates
 * @returns {Promise<Object>} Updated preferences
 */
export const updateUploadPreferences = async (updates) => {
  try {
    const current = await getUploadPreferences();
    const newPreferences = { ...current, ...updates };
    
    // This would typically save to secure storage
    console.log('Upload preferences updated:', newPreferences);
    
    return newPreferences;
  } catch (error) {
    console.error('Failed to update upload preferences:', error);
    throw error;
  }
};

// ===== MAIN UPLOAD SERVICE =====

/**
 * Main upload service object
 */
export const uploadService = {
  // Configuration
  config: UPLOAD_CONFIG,
  errors: UPLOAD_ERRORS,

  // File validation
  validateFileType,
  validateFileSize,
  validateFiles,
  getFileInfo,

  // File selection
  requestMediaPermissions,
  selectImages,
  captureImage,
  selectDocuments,

  // Image processing
  compressImage,
  generateThumbnail,
  imageToBase64,

  // Upload management
  uploadFile,
  uploadMultipleFiles,
  uploadWithRetry,
  cleanupTempFiles,

  // Utilities
  formatFileSize,
  getUploadPreferences,
  updateUploadPreferences,

  /**
   * Initialize upload service
   * @returns {Promise<boolean>} Initialization result
   */
  initialize: async () => {
    try {
      console.log('Initializing upload service...');
      
      // Ensure upload directory exists
      const uploadDir = `${FileSystem.documentDirectory}uploads/`;
      const dirInfo = await FileSystem.getInfoAsync(uploadDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
      }

      console.log('Upload service initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize upload service:', error);
      throw error;
    }
  },

  /**
   * Cleanup upload service
   * @returns {Promise<boolean>} Cleanup result
   */
  cleanup: async () => {
    try {
      // Cleanup temporary files
      const uploadDir = `${FileSystem.documentDirectory}uploads/`;
      await FileSystem.deleteAsync(uploadDir, { idempotent: true });
      
      console.log('Upload service cleaned up');
      return true;
    } catch (error) {
      console.error('Failed to cleanup upload service:', error);
      return false;
    }
  },
};

// ===== EXPORT DEFAULT =====

export default uploadService;