import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Context & Hooks
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useProject } from '../../../contexts/construction-context';

// Services
import { uploadService } from '../../../services/upload-service';
import { projectService } from '../../../services/project-service';
import { documentService } from '../../../services/construction-service';

// Components
import { DocumentCard } from '../../../components/construction/document-card';
import { UploadModal } from '../../../components/ui/upload-modal';
import { DocumentViewer } from '../../../components/ui/document-viewer';
import { Loading } from '../../../components/ui/loading';
import { AccessDenied } from '../../../components/ui/access-denied';
import { EmptyState } from '../../../components/ui/empty-state';
import { SearchBar } from '../../../components/ui/search-bar';
import { FilterModal } from '../../../components/ui/filter-modal';
import { FloatingActionButton } from '../../../components/ui/button';

// Constants
import { DOCUMENT_TYPES, DOCUMENT_STATUS, USER_ROLES } from '../../../constants/construction';
import { NAVIGATION_ROUTES } from '../../../constants/navigation';

/**
 * Project Documents Screen - Comprehensive document management for construction projects
 * Supports upload, categorization, version control, and collaborative editing
 */
const ProjectDocumentsScreen = () => {
  const { projectId } = useLocalSearchParams();
  const router = useRouter();

  // Context hooks
  const { user, isAuthenticated, hasRole } = useAuth();
  const { theme, isDark } = useTheme();
  const { currentProject, refreshProject } = useProject();

  // State management
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    documentType: 'all',
    status: 'all',
    dateRange: 'all',
    uploadedBy: 'all'
  });

  // Refs
  const flatListRef = useRef(null);
  const uploadQueueRef = useRef([]);
  const abortControllerRef = useRef(new AbortController());

  const styles = createStyles(theme);
  const canManageDocuments = hasRole([USER_ROLES.GOVERNMENT, USER_ROLES.ADMIN]) || 
    currentProject?.projectManagerId === user.id;

  /**
   * Load project documents with error handling
   */
  const loadDocuments = useCallback(async (showRefresh = false) => {
    if (!projectId || !isAuthenticated) {
      setError('Authentication or project ID missing');
      setIsLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Validate project access
      const hasAccess = await projectService.validateProjectAccess(projectId, user.id);
      if (!hasAccess) {
        setError('access_denied');
        return;
      }

      // Fetch documents from multiple sources
      const [projectDocs, sharedDocs] = await Promise.all([
        documentService.getProjectDocuments(projectId),
        documentService.getSharedDocuments(projectId, user.id)
      ]);

      const allDocuments = [...projectDocs, ...sharedDocs]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      setDocuments(allDocuments);
      applyFiltersAndSearch(allDocuments, searchQuery, activeFilters);

    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, user?.id, isAuthenticated, searchQuery, activeFilters]);

  /**
   * Apply filters and search to documents
   */
  const applyFiltersAndSearch = useCallback((docs, query, filters) => {
    let filtered = docs;

    // Apply search query
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(lowercaseQuery) ||
        doc.description?.toLowerCase().includes(lowercaseQuery) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    }

    // Apply document type filter
    if (filters.documentType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filters.documentType);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(doc => doc.status === filters.status);
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter(doc => new Date(doc.updatedAt) >= startDate);
      }
    }

    // Apply uploaded by filter
    if (filters.uploadedBy !== 'all') {
      filtered = filtered.filter(doc => doc.uploadedBy === filters.uploadedBy);
    }

    setFilteredDocuments(filtered);
  }, []);

  /**
   * Handle document upload with progress tracking
   */
  const handleDocumentUpload = async (files, metadata = {}) => {
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const uploadResults = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (max 50MB for construction documents)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 50MB limit`);
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'image/jpeg', 
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} not supported`);
        }

        // Upload file with progress tracking
        const uploadResult = await uploadService.uploadFile(file, {
          folder: `projects/${projectId}/documents`,
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
          abortSignal: abortControllerRef.current.signal
        });

        // Create document record
        const documentData = {
          projectId,
          name: file.name,
          description: metadata.description || '',
          type: getDocumentType(file.type),
          fileUrl: uploadResult.url,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: user.id,
          status: DOCUMENT_STATUS.PENDING_REVIEW,
          version: '1.0',
          tags: metadata.tags || [],
          permissions: getDefaultPermissions(),
          metadata: {
            originalName: file.name,
            uploadDate: new Date().toISOString(),
            ...metadata
          }
        };

        const savedDocument = await documentService.createDocument(documentData);
        uploadResults.push(savedDocument);

        // Update progress for multiple files
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Add new documents to state
      setDocuments(prev => [...uploadResults, ...prev]);
      applyFiltersAndSearch([...uploadResults, ...documents], searchQuery, activeFilters);

      // Show success message
      Alert.alert(
        'Upload Successful', 
        `${files.length} document(s) uploaded successfully`,
        [{ text: 'OK' }]
      );

      setShowUploadModal(false);

    } catch (err) {
      console.error('Document upload failed:', err);
      
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to upload documents');
        Alert.alert('Upload Failed', err.message || 'Please try again');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Determine document type from MIME type
   */
  const getDocumentType = (mimeType) => {
    const typeMap = {
      'application/pdf': DOCUMENT_TYPES.PDF,
      'image/jpeg': DOCUMENT_TYPES.IMAGE,
      'image/png': DOCUMENT_TYPES.IMAGE,
      'application/msword': DOCUMENT_TYPES.WORD,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': DOCUMENT_TYPES.WORD,
      'application/vnd.ms-excel': DOCUMENT_TYPES.EXCEL,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': DOCUMENT_TYPES.EXCEL,
    };

    return typeMap[mimeType] || DOCUMENT_TYPES.OTHER;
  };

  /**
   * Get default permissions based on user role
   */
  const getDefaultPermissions = () => {
    const basePermissions = {
      view: true,
      download: true,
      edit: false
    };

    if (canManageDocuments) {
      return {
        ...basePermissions,
        edit: true,
        delete: true,
        share: true
      };
    }

    return basePermissions;
  };

  /**
   * Handle document actions (view, download, share, delete)
   */
  const handleDocumentAction = async (document, action) => {
    try {
      switch (action) {
        case 'view':
          setSelectedDocument(document);
          setShowDocumentViewer(true);
          break;

        case 'download':
          await handleDownloadDocument(document);
          break;

        case 'share':
          await handleShareDocument(document);
          break;

        case 'delete':
          await handleDeleteDocument(document);
          break;

        case 'edit':
          handleEditDocument(document);
          break;

        case 'version_history':
          handleViewVersionHistory(document);
          break;

        default:
          console.warn('Unknown document action:', action);
      }
    } catch (err) {
      console.error('Document action failed:', err);
      Alert.alert('Action Failed', err.message || 'Please try again');
    }
  };

  /**
   * Handle document download
   */
  const handleDownloadDocument = async (document) => {
    const hasPermission = document.permissions?.download;
    
    if (!hasPermission) {
      Alert.alert('Download Denied', 'You do not have permission to download this document');
      return;
    }

    try {
      await documentService.downloadDocument(document.id, document.fileUrl, document.name);
      Alert.alert('Download Started', 'Document download has started');
    } catch (err) {
      throw new Error('Failed to download document');
    }
  };

  /**
   * Handle document sharing
   */
  const handleShareDocument = async (document) => {
    const hasPermission = document.permissions?.share;
    
    if (!hasPermission) {
      Alert.alert('Share Denied', 'You do not have permission to share this document');
      return;
    }

    // Implement sharing logic (email, link, etc.)
    Alert.alert('Share Document', 'Sharing functionality to be implemented');
  };

  /**
   * Handle document deletion
   */
  const handleDeleteDocument = async (document) => {
    const hasPermission = document.permissions?.delete;
    
    if (!hasPermission) {
      Alert.alert('Delete Denied', 'You do not have permission to delete this document');
      return;
    }

    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await documentService.deleteDocument(document.id);
              
              // Remove from state
              setDocuments(prev => prev.filter(doc => doc.id !== document.id));
              applyFiltersAndSearch(
                documents.filter(doc => doc.id !== document.id), 
                searchQuery, 
                activeFilters
              );

              Alert.alert('Success', 'Document deleted successfully');
            } catch (err) {
              throw new Error('Failed to delete document');
            }
          }
        },
      ]
    );
  };

  /**
   * Handle document editing
   */
  const handleEditDocument = (document) => {
    router.push({
      pathname: NAVIGATION_ROUTES.EDIT_DOCUMENT,
      params: { documentId: document.id, projectId }
    });
  };

  /**
   * Handle version history view
   */
  const handleViewVersionHistory = (document) => {
    router.push({
      pathname: NAVIGATION_ROUTES.DOCUMENT_VERSIONS,
      params: { documentId: document.id, projectId }
    });
  };

  /**
   * Handle search with debouncing
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    applyFiltersAndSearch(documents, query, activeFilters);
  }, [documents, activeFilters, applyFiltersAndSearch]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
    applyFiltersAndSearch(documents, searchQuery, newFilters);
  }, [documents, searchQuery, applyFiltersAndSearch]);

  /**
   * Cancel ongoing uploads
   */
  const cancelUpload = () => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsUploading(false);
    setUploadProgress(0);
  };

  // Effects
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      abortControllerRef.current.abort();
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading project documents..." />
      </SafeAreaView>
    );
  }

  // Render access denied
  if (error === 'access_denied') {
    return (
      <SafeAreaView style={styles.container}>
        <AccessDenied 
          message="You don't have access to this project's documents"
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Search and Filter */}
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search documents..."
          style={styles.searchBar}
        />
        
        <FloatingActionButton
          icon="filter"
          onPress={() => setShowFilterModal(true)}
          variant="outlined"
          size="small"
        />
      </View>

      {/* Documents List */}
      <FlatList
        ref={flatListRef}
        data={filteredDocuments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onAction={handleDocumentAction}
            currentUserId={user.id}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDocuments(true)}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document"
            title="No Documents Found"
            message={searchQuery || activeFilters.documentType !== 'all' ? 
              "Try adjusting your search or filters" : 
              "Upload the first document to get started"
            }
            action={canManageDocuments ? {
              label: 'Upload Document',
              onPress: () => setShowUploadModal(true)
            } : null}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Upload FAB */}
      {canManageDocuments && (
        <FloatingActionButton
          icon="upload"
          onPress={() => setShowUploadModal(true)}
          style={styles.uploadFab}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleDocumentUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onCancel={cancelUpload}
        allowedFileTypes={[
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.*',
          'application/vnd.ms-excel'
        ]}
        maxFileSize={50 * 1024 * 1024}
        multiple={true}
        projectId={projectId}
      />

      {/* Document Viewer Modal */}
      <DocumentViewer
        visible={showDocumentViewer}
        document={selectedDocument}
        onClose={() => setShowDocumentViewer(false)}
        onAction={handleDocumentAction}
        theme={theme}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={activeFilters}
        onFilterChange={handleFilterChange}
        filterOptions={{
          documentType: Object.values(DOCUMENT_TYPES),
          status: Object.values(DOCUMENT_STATUS),
          dateRange: ['all', 'today', 'week', 'month'],
          uploadedBy: ['all', 'me', 'others']
        }}
        theme={theme}
      />
    </SafeAreaView>
  );
};

/**
 * Create dynamic styles based on theme
 */
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  uploadFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ProjectDocumentsScreen;