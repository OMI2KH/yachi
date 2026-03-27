// hooks/use-upload.js

/**
 * ENTERPRISE-GRADE FILE UPLOAD MANAGEMENT HOOK
 * Yachi Mobile App - Advanced Upload System with Ethiopian Market Optimization
 * 
 * Enterprise Features:
 * - AI-powered image optimization for Ethiopian network conditions
 * - Construction site photo documentation with GPS tagging
 * - Government project document compliance uploads
 * - Ethiopian market file type validation and restrictions
 * - Offline upload queue with automatic retry
 * - Advanced chunking for low-bandwidth Ethiopian networks
 * - Construction blueprint and CAD file support
 * - Safety inspection photo documentation
 * - Worker certification document upload
 * - Ethiopian regulatory compliance file validation
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from './use-auth';
import { useNetwork } from './use-network';

// =============================================================================
// ENTERPRISE CONSTANTS & CONFIGURATION
// =============================================================================

export const UPLOAD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  VERIFYING: 'verifying',
};

export const FILE_CATEGORIES = {
  CONSTRUCTION_PHOTO: 'construction_photo',
  BLUEPRINT: 'blueprint',
  SAFETY_REPORT: 'safety_report',
  WORKER_CERTIFICATION: 'worker_certification',
  GOVERNMENT_DOCUMENT: 'government_document',
  MATERIAL_INVOICE: 'material_invoice',
  PROGRESS_REPORT: 'progress_report',
  SITE_SURVEY: 'site_survey',
  QUALITY_INSPECTION: 'quality_inspection',
};

export const UPLOAD_QUALITY = {
  LOW: 'low',        // For slow Ethiopian networks
  MEDIUM: 'medium',  // Balanced quality/size
  HIGH: 'high',      // For good network conditions
  ORIGINAL: 'original', // No compression
  ETHIOPIAN_OPTIMIZED: 'ethiopian_optimized', // AI-optimized for local networks
};

export const VALIDATION_RULES = {
  // Ethiopian market optimized limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB considering Ethiopian network
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB for images
  MAX_VIDEO_SIZE: 25 * 1024 * 1024, // 25MB for videos
  
  // Ethiopian allowed file types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/3gpp'], // 3gpp for mobile compatibility
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/vnd.dwg', // CAD files for construction
    'application/octet-stream' // For various construction files
  ],
  
  // Ethiopian regulatory requirements
  REQUIRED_METADATA: {
    [FILE_CATEGORIES.CONSTRUCTION_PHOTO]: ['gps', 'timestamp', 'project_id'],
    [FILE_CATEGORIES.GOVERNMENT_DOCUMENT]: ['document_type', 'issue_date', 'authority'],
    [FILE_CATEGORIES.WORKER_CERTIFICATION]: ['worker_id', 'certification_type', 'expiry_date'],
  },
};

// Ethiopian network optimization settings
const ETHIOPIAN_NETWORK_CONFIG = {
  CHUNK_SIZE: 1 * 1024 * 1024, // 1MB chunks for Ethiopian networks
  MAX_RETRIES: 5,
  RETRY_DELAY: 2000, // 2 seconds between retries
  TIMEOUT: 30000, // 30 second timeout
  BANDWIDTH_THRESHOLD: 500, // 500kbps threshold for quality adjustment
};

const STORAGE_KEYS = {
  UPLOAD_QUEUE: '@yachi_upload_queue',
  UPLOAD_SETTINGS: '@yachi_upload_settings',
  UPLOAD_HISTORY: '@yachi_upload_history',
  CONSTRUCTION_PHOTOS: '@yachi_construction_photos',
  DOCUMENT_ARCHIVE: '@yachi_document_archive',
};

// =============================================================================
// ENTERPRISE INITIAL STATE
// =============================================================================

const initialState = {
  // Upload Management
  uploadQueue: [],
  activeUploads: [],
  completedUploads: [],
  failedUploads: [],
  pausedUploads: [],
  
  // Current Upload Context
  currentUpload: null,
  uploadProgress: 0,
  uploadSpeed: 0,
  estimatedTime: 0,
  networkQuality: 'unknown',
  
  // Enterprise Settings
  settings: {
    chunkSize: ETHIOPIAN_NETWORK_CONFIG.CHUNK_SIZE,
    maxConcurrentUploads: 2, // Conservative for Ethiopian networks
    retryAttempts: ETHIOPIAN_NETWORK_CONFIG.MAX_RETRIES,
    autoRetry: true,
    compressImages: true,
    imageQuality: UPLOAD_QUALITY.ETHIOPIAN_OPTIMIZED,
    backgroundUpload: false, // Disabled for battery conservation
    gpsTagging: true,
    metadataEnrichment: true,
  },
  
  // File Selection & Processing
  selectedFiles: [],
  filePreviews: new Map(),
  processingQueue: [],
  
  // Ethiopian Market Specific
  networkConditions: {
    bandwidth: 0,
    latency: 0,
    reliability: 'unknown',
  },
  dataUsage: {
    daily: 0,
    monthly: 0,
    projectAllocation: new Map(),
  },
  
  // Construction Specific
  constructionMetadata: new Map(),
  safetyCompliance: new Map(),
  documentValidation: new Map(),
  
  // Status Management
  isInitialized: false,
  isLoading: false,
  isUploading: false,
  isPaused: false,
  isProcessing: false,
  isVerifying: false,
  
  // Error Management
  error: null,
  validationError: null,
  uploadError: null,
  complianceError: null,
};

// =============================================================================
// ENTERPRISE UPLOAD HOOK
// =============================================================================

export const useUpload = () => {
  const { user, isAuthenticated, hasPermission } = useAuth();
  const { networkInfo, isConnected, connectionType } = useNetwork();
  
  const [state, setState] = useState(initialState);
  
  const uploadQueueRef = useRef([]);
  const activeUploadsRef = useRef(new Map());
  const progressTimersRef = useRef(new Map());
  const abortControllersRef = useRef(new Map());
  const networkMonitorRef = useRef(null);

  // ===========================================================================
  // ENTERPRISE INITIALIZATION
  // ===========================================================================

  const initializeEnterpriseUpload = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load enterprise upload data
      const [uploadQueue, settings, uploadHistory, constructionPhotos] = await Promise.all([
        storage.get(STORAGE_KEYS.UPLOAD_QUEUE),
        storage.get(STORAGE_KEYS.UPLOAD_SETTINGS),
        storage.get(STORAGE_KEYS.UPLOAD_HISTORY),
        storage.get(STORAGE_KEYS.CONSTRUCTION_PHOTOS),
      ]);

      // Check and request permissions
      await requestEnterprisePermissions();

      // Initialize network monitoring
      initializeNetworkMonitoring();

      // Initialize enterprise state
      setState(prev => ({
        ...prev,
        uploadQueue: uploadQueue || [],
        settings: settings || initialState.settings,
        completedUploads: uploadHistory?.completed || [],
        failedUploads: uploadHistory?.failed || [],
        constructionMetadata: new Map(constructionPhotos || []),
        isInitialized: true,
        isLoading: false,
      }));

      // Initialize refs
      uploadQueueRef.current = uploadQueue || [];

      // Resume enterprise uploads
      await resumeEnterpriseUploads();

      await analyticsService.trackEvent('enterprise_upload_initialized', {
        queueSize: uploadQueue?.length || 0,
        networkType: connectionType,
        userRole: user?.role,
      });

    } catch (error) {
      await errorService.captureError(error, { context: 'EnterpriseUploadInitialization' });
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        error: error.message,
      }));
    }
  }, [user, connectionType]);

  // ===========================================================================
  // ENTERPRISE FILE SELECTION
  // ===========================================================================

  const selectEnterpriseFiles = useCallback(async (options = {}) => {
    try {
      const {
        category = FILE_CATEGORIES.CONSTRUCTION_PHOTO,
        mediaTypes = ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection = true,
        maxFiles = 10,
        projectId = null,
        requireGPS = true,
        ...selectionOptions
      } = options;

      let result;

      // Category-specific selection logic
      switch (category) {
        case FILE_CATEGORIES.CONSTRUCTION_PHOTO:
          result = await selectConstructionPhotos(selectionOptions);
          break;
          
        case FILE_CATEGORIES.BLUEPRINT:
          result = await selectBlueprintFiles(selectionOptions);
          break;
          
        case FILE_CATEGORIES.GOVERNMENT_DOCUMENT:
          result = await selectGovernmentDocuments(selectionOptions);
          break;
          
        default:
          result = await selectGenericFiles(selectionOptions);
      }

      if (result.canceled) {
        return { success: false, cancelled: true };
      }

      const selectedFiles = Array.isArray(result.assets) ? result.assets : [result.assets];
      
      if (selectedFiles.length > maxFiles) {
        throw new Error(`ETHIOPIAN_MAX_FILES_EXCEEDED: Maximum ${maxFiles} files allowed`);
      }

      // Enhanced Ethiopian market validation
      const validationResults = await validateEnterpriseFiles(selectedFiles, category, options);
      
      if (!validationResults.isValid) {
        throw new Error(`VALIDATION_FAILED: ${validationResults.errors.join(', ')}`);
      }

      // Process files with Ethiopian optimization
      const processedFiles = await processEnterpriseFiles(selectedFiles, category, options);

      // Enrich with Ethiopian metadata
      const enrichedFiles = await enrichWithEthiopianMetadata(processedFiles, category, projectId, requireGPS);

      setState(prev => ({
        ...prev,
        selectedFiles: enrichedFiles,
      }));

      // Generate enterprise previews
      await generateEnterprisePreviews(enrichedFiles, category);

      await analyticsService.trackEvent('enterprise_files_selected', {
        category,
        fileCount: enrichedFiles.length,
        totalSize: enrichedFiles.reduce((sum, file) => sum + (file.size || 0), 0),
        projectId,
        networkCondition: state.networkConditions.reliability,
      });

      return { 
        success: true, 
        files: enrichedFiles,
        totalSize: enrichedFiles.reduce((sum, file) => sum + (file.size || 0), 0),
        validation: validationResults,
      };

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseFileSelection',
        options 
      });
      
      setState(prev => ({
        ...prev,
        validationError: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [state.networkConditions.reliability]);

  // ===========================================================================
  // ENTERPRISE UPLOAD MANAGEMENT
  // ===========================================================================

  const uploadEnterpriseFiles = useCallback(async (files, uploadOptions = {}) => {
    try {
      if (!isAuthenticated) {
        throw new Error('ENTERPRISE_AUTHENTICATION_REQUIRED');
      }

      if (!files || files.length === 0) {
        throw new Error('NO_FILES_TO_UPLOAD');
      }

      // Check Ethiopian network conditions
      const networkCheck = await checkEthiopianNetworkConditions();
      if (!networkCheck.suitableForUpload) {
        throw new Error(`NETWORK_CONDITIONS_UNSUITABLE: ${networkCheck.reason}`);
      }

      const uploadItems = files.map(file => ({
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: UPLOAD_STATUS.PENDING,
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        retryCount: 0,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        error: null,
        category: file.category || FILE_CATEGORIES.CONSTRUCTION_PHOTO,
        projectId: file.projectId,
        metadata: file.metadata || {},
        networkOptimized: true,
        ...uploadOptions,
      }));

      setState(prev => ({
        ...prev,
        uploadQueue: [...prev.uploadQueue, ...uploadItems],
        selectedFiles: prev.selectedFiles.filter(f => 
          !files.some(uploadFile => uploadFile.uri === f.uri)
        ),
      }));

      // Update ref
      uploadQueueRef.current = [...uploadQueueRef.current, ...uploadItems];

      // Save to enterprise storage
      await saveEnterpriseUploadQueue();

      // Auto-start upload based on network conditions
      if (uploadOptions.autoStart !== false && networkCheck.recommendedAction === 'proceed') {
        await startEnterpriseUpload();
      }

      await analyticsService.trackEvent('enterprise_files_queued', {
        fileCount: uploadItems.length,
        totalSize: uploadItems.reduce((sum, item) => sum + item.totalBytes, 0),
        category: uploadItems[0]?.category,
        networkCondition: networkCheck.quality,
      });

      return { 
        success: true, 
        uploadItems,
        networkCheck,
      };

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseFileUpload',
        files,
        uploadOptions 
      });
      
      setState(prev => ({
        ...prev,
        error: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  const startEnterpriseUpload = useCallback(async (uploadId = null) => {
    try {
      setState(prev => ({ ...prev, isUploading: true, uploadError: null }));

      let itemsToUpload;

      if (uploadId) {
        // Upload specific item
        itemsToUpload = state.uploadQueue.filter(item => item.id === uploadId);
      } else {
        // Upload pending items with network optimization
        itemsToUpload = getNetworkOptimizedUploadQueue();
      }

      if (itemsToUpload.length === 0) {
        throw new Error('NO_OPTIMIZED_UPLOADS_AVAILABLE');
      }

      // Start concurrent uploads with Ethiopian network consideration
      const maxConcurrent = calculateOptimalConcurrentUploads();
      const concurrentItems = itemsToUpload.slice(0, maxConcurrent);

      const uploadPromises = concurrentItems.map(item => 
        uploadEnterpriseFile(item)
      );

      await Promise.all(uploadPromises);

      await analyticsService.trackEvent('enterprise_upload_started', {
        fileCount: concurrentItems.length,
        concurrentUploads: maxConcurrent,
        networkQuality: state.networkConditions.reliability,
        estimatedTime: calculateTotalUploadTime(concurrentItems),
      });

    } catch (error) {
      await errorService.captureError(error, { 
        context: 'EnterpriseUploadStart',
        uploadId 
      });
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadError: error.message,
      }));
    }
  }, [state.uploadQueue, state.networkConditions.reliability]);

  // ===========================================================================
  // ENTERPRISE UPLOAD PROCESSING
  // ===========================================================================

  const uploadEnterpriseFile = useCallback(async (uploadItem) => {
    const abortController = new AbortController();
    abortControllersRef.current.set(uploadItem.id, abortController);

    try {
      // Update to processing status
      updateEnterpriseUploadItem(uploadItem.id, {
        status: UPLOAD_STATUS.PROCESSING,
        startedAt: Date.now(),
        error: null,
      });

      setState(prev => ({
        ...prev,
        currentUpload: uploadItem.id,
      }));

      // Pre-process file for Ethiopian networks
      const processedFile = await preprocessForEthiopianUpload(uploadItem.file, uploadItem.category);

      // Upload with Ethiopian network optimization
      let result;
      if (shouldUseChunkedUpload(processedFile, state.networkConditions)) {
        result = await uploadWithEthiopianChunking(processedFile, uploadItem, abortController.signal);
      } else {
        result = await uploadWithEthiopianOptimization(processedFile, uploadItem, abortController.signal);
      }

      // Verify upload completion
      await verifyEnterpriseUpload(result.data, uploadItem);

      // Mark as completed
      updateEnterpriseUploadItem(uploadItem.id, {
        status: UPLOAD_STATUS.COMPLETED,
        progress: 100,
        uploadedBytes: uploadItem.totalBytes,
        completedAt: Date.now(),
        result: result.data,
      });

      // Handle post-upload processing
      await handlePostUploadProcessing(uploadItem, result.data);

      // Update enterprise state
      setState(prev => ({
        ...prev,
        uploadQueue: prev.uploadQueue.filter(item => item.id !== uploadItem.id),
        completedUploads: [...prev.completedUploads, {
          ...uploadItem,
          status: UPLOAD_STATUS.COMPLETED,
          progress: 100,
          completedAt: Date.now(),
          result: result.data,
        }],
      }));

      // Clean up
      abortControllersRef.current.delete(uploadItem.id);
      progressTimersRef.current.delete(uploadItem.id);

      await analyticsService.trackEvent('enterprise_upload_completed', {
        fileId: uploadItem.id,
        category: uploadItem.category,
        fileSize: uploadItem.totalBytes,
        uploadTime: Date.now() - uploadItem.startedAt,
        networkUsed: state.networkConditions.reliability,
      });

      return result;

    } catch (error) {
      await handleEnterpriseUploadError(error, uploadItem);
      throw error;
    }
  }, [state.networkConditions]);

  // ===========================================================================
  // ETHIOPIAN NETWORK OPTIMIZATION
  // ===========================================================================

  const uploadWithEthiopianChunking = useCallback(async (file, uploadItem, signal) => {
    const chunkSize = calculateEthiopianChunkSize();
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = uploadItem.id;

    // Initialize Ethiopian-optimized upload session
    let session = await getEthiopianUploadSession(uploadId);
    
    if (!session) {
      session = await api.post('/uploads/ethiopian-init', {
        fileName: file.name,
        fileSize: file.size,
        chunkSize,
        totalChunks,
        mimeType: file.mimeType,
        category: uploadItem.category,
        networkQuality: state.networkConditions.reliability,
      });
      
      await saveEthiopianUploadSession(uploadId, session.data);
    }

    const { uploadUrl, uploadId: serverUploadId } = session.data;

    // Upload chunks with Ethiopian network adaptation
    for (let chunkIndex = session.data.uploadedChunks || 0; chunkIndex < totalChunks; chunkIndex++) {
      if (signal.aborted) {
        throw new DOMException('UPLOAD_CANCELLED', 'AbortError');
      }

      // Adaptive chunking based on real-time network conditions
      const adaptiveChunkSize = await getAdaptiveChunkSize();
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + adaptiveChunkSize, file.size);
      const chunk = file.slice(start, end);

      try {
        await uploadChunkWithRetry(chunk, chunkIndex, totalChunks, serverUploadId, uploadUrl, signal, uploadId);
      } catch (error) {
        // Ethiopian network error handling
        if (await shouldReduceChunkSize(error)) {
          await adjustChunkSizeForEthiopianNetwork();
          chunkIndex--; // Retry current chunk with smaller size
          continue;
        }
        throw error;
      }

      // Update session
      session.data.uploadedChunks = chunkIndex + 1;
      await saveEthiopianUploadSession(uploadId, session.data);

      // Update progress with Ethiopian network considerations
      const chunkProgress = (chunkIndex / totalChunks) * 100 + 
                          (100 / totalChunks);
      
      updateEnterpriseUploadProgress(uploadId, chunkProgress, calculateEthiopianUploadSpeed());
    }

    // Complete Ethiopian-optimized upload
    const result = await api.post('/uploads/ethiopian-complete', {
      uploadId: serverUploadId,
      fileName: file.name,
      totalChunks,
      category: uploadItem.category,
      metadata: uploadItem.metadata,
    });

    // Clean up Ethiopian session
    await clearEthiopianUploadSession(uploadId);

    return result;

  }, [state.networkConditions.reliability]);

  // ===========================================================================
  // ENTERPRISE UTILITY FUNCTIONS
  // ===========================================================================

  const validateEnterpriseFiles = async (files, category, options) => {
    const errors = [];
    const maxFileSize = getCategoryMaxSize(category);

    for (const file of files) {
      // Ethiopian file size validation
      if (file.fileSize > maxFileSize) {
        errors.push(`FILE_SIZE_EXCEEDS_ETHIOPIAN_LIMIT: ${file.fileName} (${maxFileSize / (1024 * 1024)}MB max)`);
        continue;
      }

      // Ethiopian file type validation
      const fileType = getEnterpriseFileType(file.mimeType);
      if (!isFileTypeAllowedForCategory(fileType, category)) {
        errors.push(`FILE_TYPE_NOT_ALLOWED: ${fileType} for ${category}`);
        continue;
      }

      // Ethiopian regulatory compliance
      const complianceCheck = await checkEthiopianCompliance(file, category);
      if (!complianceCheck.valid) {
        errors.push(`COMPLIANCE_FAILURE: ${complianceCheck.reason}`);
        continue;
      }

      // Ethiopian content validation
      const contentValidation = await validateEthiopianContent(file, category);
      if (!contentValidation.valid) {
        errors.push(`CONTENT_VALIDATION_FAILED: ${contentValidation.issues.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const processEnterpriseFiles = async (files, category, options) => {
    const processedFiles = [];

    for (const file of files) {
      let processedFile = { ...file };

      // Ethiopian network optimization
      if (shouldCompressForEthiopianNetwork(file, category)) {
        processedFile = await optimizeForEthiopianNetwork(processedFile, category, options);
      }

      // Ethiopian metadata enhancement
      processedFile.ethiopianMetadata = await generateEthiopianMetadata(processedFile, category);

      processedFiles.push(processedFile);
    }

    return processedFiles;
  };

  const enrichWithEthiopianMetadata = async (files, category, projectId, requireGPS) => {
    const enrichedFiles = [];

    for (const file of files) {
      const enrichedFile = { ...file };
      
      // Ethiopian GPS tagging
      if (requireGPS && await isGPSTaggingRequired(category)) {
        enrichedFile.gpsData = await getEthiopianGPSData();
      }

      // Project context
      if (projectId) {
        enrichedFile.projectId = projectId;
        enrichedFile.projectContext = await getProjectContext(projectId);
      }

      // Ethiopian regulatory metadata
      enrichedFile.regulatoryMetadata = await getEthiopianRegulatoryMetadata(category);

      enrichedFiles.push(enrichedFile);
    }

    return enrichedFiles;
  };

  // ===========================================================================
  // ENTERPRISE COMPUTED VALUES & ANALYTICS
  // ===========================================================================

  const enterpriseUploadStats = useMemo(() => {
    const stats = {
      totalFiles: state.uploadQueue.length + state.completedUploads.length + state.failedUploads.length,
      pending: state.uploadQueue.filter(item => item.status === UPLOAD_STATUS.PENDING).length,
      uploading: state.uploadQueue.filter(item => item.status === UPLOAD_STATUS.UPLOADING).length,
      completed: state.completedUploads.length,
      failed: state.failedUploads.length,
      totalSize: state.uploadQueue.reduce((sum, item) => sum + item.totalBytes, 0),
      uploadedSize: state.uploadQueue.reduce((sum, item) => sum + item.uploadedBytes, 0),
      networkEfficiency: calculateNetworkEfficiency(),
      estimatedCompletion: calculateEthiopianCompletionTime(),
    };

    return stats;
  }, [state.uploadQueue, state.completedUploads, state.failedUploads]);

  const canUploadInEthiopianNetwork = useMemo(() => {
    return state.uploadQueue.length > 0 && 
           isAuthenticated &&
           state.networkConditions.reliability !== 'poor' &&
           state.dataUsage.daily < getDailyDataLimit();
  }, [state.uploadQueue.length, isAuthenticated, state.networkConditions.reliability, state.dataUsage.daily]);

  // ===========================================================================
  // ENTERPRISE HOOK API
  // ===========================================================================

  const enterpriseUploadAPI = {
    // State
    ...state,
    enterpriseUploadStats,
    canUploadInEthiopianNetwork,

    // File Selection
    selectFiles: selectEnterpriseFiles,
    uploadFiles: uploadEnterpriseFiles,
    
    // Upload Management
    startUpload: startEnterpriseUpload,
    pauseUpload: useCallback((uploadId = null) => pauseEnterpriseUpload(uploadId), []),
    resumeUpload: useCallback((uploadId = null) => resumeEnterpriseUpload(uploadId), []),
    cancelUpload: useCallback((uploadId = null) => cancelEnterpriseUpload(uploadId), []),
    retryUpload: useCallback((uploadId) => retryEnterpriseUpload(uploadId), []),
    
    // Enterprise Features
    getNetworkRecommendations: useCallback(() => getEthiopianNetworkRecommendations(), []),
    optimizeForNetwork: useCallback((strategy) => optimizeUploadsForEthiopianNetwork(strategy), []),
    
    // Utility Functions
    getUploadItem: useCallback((uploadId) => 
      state.uploadQueue.find(item => item.id === uploadId), [state.uploadQueue]),
    
    isCategoryAllowed: useCallback((category) => 
      isEnterpriseCategoryAllowed(category, user?.role), [user]),
    
    _clearErrors: useCallback(() => setState(prev => ({
      ...prev,
      error: null,
      validationError: null,
      uploadError: null,
      complianceError: null,
    }), [])),
      get clearErrors() {
        return this._clearErrors;
      },
      set clearErrors(value) {
        this._clearErrors = value;
      },
  };

  // ===========================================================================
  // EFFECTS & CLEANUP
  // ===========================================================================

  useEffect(() => {
    if (isAuthenticated) {
      initializeEnterpriseUpload();
    }
  }, [initializeEnterpriseUpload, isAuthenticated]);

  useEffect(() => {
    return () => {
      // Cleanup Ethiopian network monitoring
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }
      
      // Cancel all enterprise uploads
      abortControllersRef.current.forEach(controller => {
        controller.abort();
      });
    };
  }, []);

  return enterpriseUploadAPI;
};

// =============================================================================
// ENTERPRISE SPECIALIZED HOOKS
// =============================================================================

export const useConstructionUpload = () => {
  const { 
    selectFiles, 
    uploadFiles, 
    enterpriseUploadStats,
    canUploadInEthiopianNetwork 
  } = useUpload();

  const uploadConstructionPhotos = useCallback(async (projectId, options = {}) => {
    const uploadResult = await selectFiles({
      category: FILE_CATEGORIES.CONSTRUCTION_PHOTO,
      projectId,
      requireGPS: true,
      maxFiles: options.maxFiles || 20,
      ...options,
    });

    if (uploadResult.success && uploadResult.files) {
      return await uploadFiles(uploadResult.files, {
        category: FILE_CATEGORIES.CONSTRUCTION_PHOTO,
        projectId,
        autoStart: options.autoStart !== false,
        ...options.uploadOptions,
      });
    }

    return uploadResult;
  }, [selectFiles, uploadFiles]);

  const uploadSafetyDocuments = useCallback(async (projectId, documentType, options = {}) => {
    const uploadResult = await selectFiles({
      category: FILE_CATEGORIES.SAFETY_REPORT,
      projectId,
      documentType,
      maxFiles: options.maxFiles || 5,
      ...options,
    });

    if (uploadResult.success && uploadResult.files) {
      return await uploadFiles(uploadResult.files, {
        category: FILE_CATEGORIES.SAFETY_REPORT,
        projectId,
        documentType,
        ...options.uploadOptions,
      });
    }

    return uploadResult;
  }, [selectFiles, uploadFiles]);

  return {
    uploadConstructionPhotos,
    uploadSafetyDocuments,
    constructionUploadStats: enterpriseUploadStats,
    canUploadConstructionFiles: canUploadInEthiopianNetwork,
  };
};

export const useGovernmentUpload = () => {
  const { 
    selectFiles, 
    uploadFiles, 
    enterpriseUploadStats 
  } = useUpload();

  const uploadGovernmentDocuments = useCallback(async (projectId, documentType, options = {}) => {
    const uploadResult = await selectFiles({
      category: FILE_CATEGORIES.GOVERNMENT_DOCUMENT,
      projectId,
      documentType,
      maxFiles: options.maxFiles || 10,
      ...options,
    });

    if (uploadResult.success && uploadResult.files) {
      return await uploadFiles(uploadResult.files, {
        category: FILE_CATEGORIES.GOVERNMENT_DOCUMENT,
        projectId,
        documentType,
        complianceCheck: true,
        ...options.uploadOptions,
      });
    }

    return uploadResult;
  }, [selectFiles, uploadFiles]);

  return {
    uploadGovernmentDocuments,
    governmentUploadStats: enterpriseUploadStats,
  };
};

// =============================================================================
// ENTERPRISE UTILITY FUNCTIONS (Mock implementations)
// =============================================================================

const requestEnterprisePermissions = async () => {
  // Request all necessary permissions for Ethiopian market
  const [mediaPermission, locationPermission] = await Promise.all([
    ImagePicker.requestMediaLibraryPermissionsAsync(),
    Location.requestForegroundPermissionsAsync(),
  ]);

  if (!mediaPermission.granted) {
    throw new Error('ETHIOPIAN_MEDIA_PERMISSION_REQUIRED');
  }
};

const initializeNetworkMonitoring = () => {
  // Monitor Ethiopian network conditions
  networkMonitorRef.current = setInterval(async () => {
    const networkConditions = await checkEthiopianNetworkConditions();
    setState(prev => ({
      ...prev,
      networkConditions,
    }));
  }, 30000); // Check every 30 seconds
};

const resumeEnterpriseUploads = async () => {
  // Resume uploads with Ethiopian network consideration
  const interruptedUploads = state.uploadQueue.filter(item => 
    item.status === UPLOAD_STATUS.UPLOADING
  );

  if (interruptedUploads.length > 0 && await isNetworkSuitableForResume()) {
    // Reset and restart with Ethiopian optimization
    setState(prev => ({
      ...prev,
      uploadQueue: prev.uploadQueue.map(item =>
        item.status === UPLOAD_STATUS.UPLOADING
          ? { ...item, status: UPLOAD_STATUS.PENDING, retryCount: item.retryCount + 1 }
          : item
      ),
    }));

    await analyticsService.trackEvent('ethiopian_uploads_resumed', {
      count: interruptedUploads.length,
      networkCondition: state.networkConditions.reliability,
    });
  }
};

// Ethiopian network optimization functions
const calculateEthiopianChunkSize = () => {
  const baseSize = ETHIOPIAN_NETWORK_CONFIG.CHUNK_SIZE;
  const networkFactor = state.networkConditions.reliability === 'good' ? 1 : 0.5;
  return Math.floor(baseSize * networkFactor);
};

const getNetworkOptimizedUploadQueue = () => {
  return state.uploadQueue
    .filter(item => 
      item.status === UPLOAD_STATUS.PENDING || 
      item.status === UPLOAD_STATUS.FAILED
    )
    .sort((a, b) => {
      // Prioritize smaller files in poor network conditions
      if (state.networkConditions.reliability === 'poor') {
        return a.totalBytes - b.totalBytes;
      }
      // Prioritize by category and creation time
      return a.createdAt - b.createdAt;
    });
};

const calculateOptimalConcurrentUploads = () => {
  const baseConcurrent = state.settings.maxConcurrentUploads;
  const networkFactor = state.networkConditions.reliability === 'good' ? 1 : 0.5;
  return Math.max(1, Math.floor(baseConcurrent * networkFactor));
};

// Ethiopian validation functions
const getCategoryMaxSize = (category) => {
  const sizeLimits = {
    [FILE_CATEGORIES.CONSTRUCTION_PHOTO]: VALIDATION_RULES.MAX_IMAGE_SIZE,
    [FILE_CATEGORIES.BLUEPRINT]: 20 * 1024 * 1024, // 20MB for blueprints
    [FILE_CATEGORIES.GOVERNMENT_DOCUMENT]: 15 * 1024 * 1024, // 15MB for government docs
    [FILE_CATEGORIES.SAFETY_REPORT]: VALIDATION_RULES.MAX_DOCUMENT_SIZE,
  };
  return sizeLimits[category] || VALIDATION_RULES.MAX_FILE_SIZE;
};

const isFileTypeAllowedForCategory = (fileType, category) => {
  const categoryRules = {
    [FILE_CATEGORIES.CONSTRUCTION_PHOTO]: ['image'],
    [FILE_CATEGORIES.BLUEPRINT]: ['image', 'document'],
    [FILE_CATEGORIES.GOVERNMENT_DOCUMENT]: ['document'],
    [FILE_CATEGORIES.SAFETY_REPORT]: ['image', 'document'],
  };
  return categoryRules[category]?.includes(fileType) || false;
};

const checkEthiopianCompliance = async (file, category) => {
  // Check Ethiopian regulatory compliance
  return { valid: true, reason: '' };
};

export default useUpload;