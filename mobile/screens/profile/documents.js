import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { TabView } from '../../components/ui/tabview';
import { Avatar } from '../../components/ui/avatar';
import { ImageViewer } from '../../components/ui/image-viewer';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useUpload } from '../../hooks/use-upload';
import { userService } from '../../services/user-service';
import { documentService } from '../../services/document-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { userConstants } from '../../constants/user';

/**
 * Documents Management Screen
 * 
 * Comprehensive document management system for user verification,
 * portfolio items, certifications, and compliance documentation
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const DocumentsScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();
  const { uploadDocument, deleteDocument, compressDocument } = useUpload();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('verification');
  const [documents, setDocuments] = useState({});
  const [storageUsage, setStorageUsage] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Document categories configuration
  const documentCategories = {
    verification: {
      title: 'Verification Documents',
      description: 'Required documents for account verification and trust',
      icon: 'shield-check',
      required: true,
      maxFiles: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      maxSize: 10 * 1024 * 1024, // 10MB
    },
    portfolio: {
      title: 'Portfolio Documents',
      description: 'Showcase your work and previous projects',
      icon: 'briefcase',
      required: false,
      maxFiles: 20,
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'],
      maxSize: 50 * 1024 * 1024, // 50MB
    },
    certifications: {
      title: 'Certifications & Licenses',
      description: 'Professional certifications and licenses',
      icon: 'award',
      required: false,
      maxFiles: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      maxSize: 15 * 1024 * 1024, // 15MB
    },
    contracts: {
      title: 'Contracts & Agreements',
      description: 'Service contracts and legal agreements',
      icon: 'file-text',
      required: false,
      maxFiles: 15,
      allowedTypes: ['application/pdf', 'application/msword'],
      maxSize: 25 * 1024 * 1024, // 25MB
    },
    compliance: {
      title: 'Compliance Documents',
      description: 'Regulatory and compliance documentation',
      icon: 'clipboard',
      required: user.role === 'government',
      maxFiles: 20,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      maxSize: 30 * 1024 * 1024, // 30MB
    },
  };

  /**
   * Fetch user documents
   */
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      const [userDocuments, storageData] = await Promise.all([
        documentService.getUserDocuments(user.id),
        documentService.getStorageUsage(user.id),
      ]);

      setDocuments(userDocuments || {});
      setStorageUsage(storageData);

      // Track documents view
      analyticsService.trackScreenView('documents', user.id);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      Alert.alert('Error', 'Unable to load documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments();
  }, [fetchDocuments]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /**
   * Handle document upload
   */
  const handleDocumentUpload = async (file, category, metadata = {}) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const categoryConfig = documentCategories[category];
      
      // Validate file type
      if (!categoryConfig.allowedTypes.includes(file.type)) {
        throw new Error(`File type not allowed. Allowed types: ${categoryConfig.allowedTypes.join(', ')}`);
      }

      // Validate file size
      if (file.size > categoryConfig.maxSize) {
        throw new Error(`File too large. Maximum size: ${formatters.formatFileSize(categoryConfig.maxSize)}`);
      }

      // Check storage limits
      if (storageUsage && storageUsage.used + file.size > storageUsage.limit) {
        throw new Error('Storage limit exceeded. Please delete some files or upgrade your storage.');
      }

      // Compress document if it's an image
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await compressDocument(file, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.8,
        });
      }

      // Upload document
      const uploadResult = await uploadDocument(
        processedFile,
        `documents/${category}`,
        user.id,
        (progress) => setUploadProgress(progress)
      );

      if (uploadResult.success) {
        // Create document record
        const documentData = {
          id: uploadResult.id,
          name: file.name,
          url: uploadResult.url,
          type: file.type,
          size: file.size,
          category: category,
          uploadedAt: new Date().toISOString(),
          metadata: {
            ...metadata,
            compressed: file.type.startsWith('image/'),
            originalSize: file.size,
            compressedSize: processedFile.size,
          },
        };

        const saveResult = await documentService.saveDocument(user.id, documentData);

        if (saveResult.success) {
          // Update local state
          setDocuments(prev => ({
            ...prev,
            [category]: [...(prev[category] || []), documentData],
          }));

          // Update storage usage
          setStorageUsage(prev => prev ? {
            ...prev,
            used: prev.used + file.size,
            fileCount: prev.fileCount + 1,
          } : null);

          setShowUploadModal(false);
          setUploadProgress(0);

          Alert.alert('Success', 'Document uploaded successfully.');

          // Track document upload
          analyticsService.trackDocumentUpload(category, file.type, file.size, user.id);
        } else {
          throw new Error('Failed to save document record');
        }
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Document upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Unable to upload document.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle document deletion
   */
  const handleDocumentDelete = async (documentId, category) => {
    try {
      const deleteResult = await deleteDocument(documentId, user.id);

      if (deleteResult.success) {
        // Update local state
        setDocuments(prev => ({
          ...prev,
          [category]: prev[category].filter(doc => doc.id !== documentId),
        }));

        // Update storage usage
        const document = documents[category]?.find(doc => doc.id === documentId);
        if (document && storageUsage) {
          setStorageUsage(prev => ({
            ...prev,
            used: prev.used - document.size,
            fileCount: prev.fileCount - 1,
          }));
        }

        setShowDeleteModal(false);
        setSelectedDocument(null);

        Alert.alert('Success', 'Document deleted successfully.');

        // Track document deletion
        analyticsService.trackDocumentDeletion(category, user.id);
      } else {
        throw new Error(deleteResult.message);
      }
    } catch (error) {
      console.error('Document deletion failed:', error);
      Alert.alert('Deletion Failed', error.message || 'Unable to delete document.');
    }
  };

  /**
   * Handle document download
   */
  const handleDocumentDownload = async (document) => {
    try {
      const downloadResult = await documentService.downloadDocument(document.id, user.id);

      if (downloadResult.success) {
        Alert.alert('Success', 'Document downloaded successfully.');
        
        // Track document download
        analyticsService.trackDocumentDownload(document.category, document.type, user.id);
      } else {
        throw new Error(downloadResult.message);
      }
    } catch (error) {
      console.error('Document download failed:', error);
      Alert.alert('Download Failed', error.message || 'Unable to download document.');
    }
  };

  /**
   * Handle document sharing
   */
  const handleDocumentShare = async (document) => {
    try {
      const shareResult = await documentService.generateShareLink(document.id, user.id);

      if (shareResult.success) {
        // Implement sharing functionality
        Alert.alert('Share', 'Share link generated successfully.');
        
        // Track document share
        analyticsService.trackDocumentShare(document.category, user.id);
      } else {
        throw new Error(shareResult.message);
      }
    } catch (error) {
      console.error('Document share failed:', error);
      Alert.alert('Share Failed', error.message || 'Unable to share document.');
    }
  };

  /**
   * Get document status badge
   */
  const getDocumentStatus = (document) => {
    if (document.verificationStatus) {
      const statusColors = {
        verified: colors.success,
        pending: colors.warning,
        rejected: colors.error,
        expired: colors.error,
      };
      
      return {
        text: document.verificationStatus.toUpperCase(),
        color: statusColors[document.verificationStatus] || colors.default,
      };
    }

    return null;
  };

  /**
   * Get storage usage percentage
   */
  const getStorageUsagePercentage = () => {
    if (!storageUsage) return 0;
    return (storageUsage.used / storageUsage.limit) * 100;
  };

  /**
   * Filter documents by search query
   */
  const getFilteredDocuments = (category) => {
    const categoryDocuments = documents[category] || [];
    
    if (!searchQuery) return categoryDocuments;

    return categoryDocuments.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  /**
   * Render storage usage card
   */
  const renderStorageCard = () => (
    <Card style={styles.storageCard}>
      <View style={styles.storageHeader}>
        <ThemedText type="subtitle" style={styles.storageTitle}>
          Storage Usage
        </ThemedText>
        <ThemedText type="default" style={styles.storageSubtitle}>
          {storageUsage ? 
            `${formatters.formatFileSize(storageUsage.used)} of ${formatters.formatFileSize(storageUsage.limit)} used` :
            'Loading storage information...'
          }
        </ThemedText>
      </View>

      {storageUsage && (
        <View style={styles.storageProgress}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${getStorageUsagePercentage()}%`,
                  backgroundColor: getStorageUsagePercentage() > 90 ? colors.error : 
                                 getStorageUsagePercentage() > 75 ? colors.warning : colors.primary,
                }
              ]} 
            />
          </View>
          <View style={styles.storageStats}>
            <ThemedText type="default" style={styles.storageStat}>
              {storageUsage.fileCount} files
            </ThemedText>
            <ThemedText type="default" style={styles.storageStat}>
              {Math.round(getStorageUsagePercentage())}% used
            </ThemedText>
          </View>
        </View>
      )}

      {storageUsage && getStorageUsagePercentage() > 80 && (
        <View style={styles.storageWarning}>
          <ThemedText type="default" style={styles.warningText}>
            ⚠️ Storage space running low
          </ThemedText>
          <Button
            title="Manage Storage"
            onPress={() => navigation.navigate('StorageManagement')}
            variant="outline"
            size="small"
          />
        </View>
      )}
    </Card>
  );

  /**
   * Render document category section
   */
  const renderDocumentCategory = (categoryKey) => {
    const category = documentCategories[categoryKey];
    const categoryDocuments = getFilteredDocuments(categoryKey);
    const hasDocuments = categoryDocuments.length > 0;

    return (
      <Card key={categoryKey} style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <ThemedText type="subtitle" style={styles.categoryTitle}>
              {category.title}
            </ThemedText>
            <ThemedText type="default" style={styles.categoryDescription}>
              {category.description}
            </ThemedText>
          </View>
          
          <View style={styles.categoryStats}>
            <ThemedText type="default" style={styles.documentCount}>
              {categoryDocuments.length} / {category.maxFiles}
            </ThemedText>
            {category.required && (
              <Badge text="REQUIRED" color={colors.warning} size="small" />
            )}
          </View>
        </View>

        {hasDocuments ? (
          <View style={styles.documentsList}>
            {categoryDocuments.map(document => (
              <Card key={document.id} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.documentName}>
                      {document.name}
                    </ThemedText>
                    <ThemedText type="default" style={styles.documentMeta}>
                      {formatters.formatFileSize(document.size)} • {formatters.formatDate(document.uploadedAt)}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.documentActions}>
                    {getDocumentStatus(document) && (
                      <Badge
                        text={getDocumentStatus(document).text}
                        color={getDocumentStatus(document).color}
                        size="small"
                      />
                    )}
                  </View>
                </View>

                {document.metadata?.description && (
                  <ThemedText type="default" style={styles.documentDescription}>
                    {document.metadata.description}
                  </ThemedText>
                )}

                <View style={styles.documentControls}>
                  <Button
                    title="View"
                    onPress={() => {
                      setSelectedDocument(document);
                      setShowViewerModal(true);
                    }}
                    variant="outline"
                    size="small"
                    icon="eye"
                  />
                  
                  <Button
                    title="Download"
                    onPress={() => handleDocumentDownload(document)}
                    variant="outline"
                    size="small"
                    icon="download"
                  />
                  
                  <Button
                    title="Share"
                    onPress={() => handleDocumentShare(document)}
                    variant="outline"
                    size="small"
                    icon="share"
                  />
                  
                  <Button
                    title="Delete"
                    onPress={() => {
                      setSelectedDocument(document);
                      setShowDeleteModal(true);
                    }}
                    variant="outline"
                    size="small"
                    icon="trash"
                    style={styles.deleteButton}
                  />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCategory}>
            <ThemedText type="default" style={styles.emptyText}>
              No documents in this category
            </ThemedText>
          </View>
        )}

        {categoryDocuments.length < category.maxFiles && (
          <Button
            title={`Add ${category.title}`}
            onPress={() => {
              setSelectedDocument({ category: categoryKey });
              setShowUploadModal(true);
            }}
            variant={category.required && !hasDocuments ? 'primary' : 'outline'}
            size="small"
            icon="upload"
            style={styles.addButton}
          />
        )}
      </Card>
    );
  };

  /**
   * Render upload modal
   */
  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      title={`Upload ${documentCategories[selectedDocument?.category]?.title}`}
      size="medium"
    >
      <View style={styles.uploadModal}>
        {/* File picker and upload form would be implemented here */}
        <ThemedText>Document Upload Form</ThemedText>
        
        {uploading && (
          <View style={styles.uploadProgress}>
            <ThemedText type="default">Uploading... {uploadProgress}%</ThemedText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${uploadProgress}%`, backgroundColor: colors.primary }
                ]} 
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading documents..." />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Documents
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Manage your verification, portfolio, and compliance documents
          </ThemedText>
        </View>

        {/* Storage Usage */}
        {renderStorageCard()}

        {/* Search Bar */}
        <Card style={styles.searchCard}>
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon="search"
            clearButtonMode="while-editing"
          />
        </Card>

        {/* Document Categories */}
        <View style={styles.categoriesContainer}>
          {Object.keys(documentCategories).map(renderDocumentCategory)}
        </View>

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          
          <View style={styles.quickActions}>
            <Button
              title="Bulk Upload"
              onPress={() => navigation.navigate('BulkUpload')}
              variant="outline"
              size="medium"
              icon="upload"
            />
            
            <Button
              title="Export All"
              onPress={() => navigation.navigate('ExportDocuments')}
              variant="outline"
              size="medium"
              icon="download"
            />
            
            <Button
              title="Storage Settings"
              onPress={() => navigation.navigate('StorageSettings')}
              variant="outline"
              size="medium"
              icon="hard-drive"
            />
          </View>
        </Card>
      </ScrollView>

      {/* Upload Modal */}
      {renderUploadModal()}

      {/* Document Viewer Modal */}
      <ImageViewer
        visible={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        image={selectedDocument}
        title={selectedDocument?.name}
        showControls={true}
        onDownload={() => handleDocumentDownload(selectedDocument)}
        onShare={() => handleDocumentShare(selectedDocument)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        onConfirm={() => handleDocumentDelete(selectedDocument?.id, selectedDocument?.category)}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedDocument(null);
        }}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 20,
  },
  storageCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  storageHeader: {
    gap: 4,
  },
  storageTitle: {
    fontSize: 18,
  },
  storageSubtitle: {
    opacity: 0.7,
  },
  storageProgress: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e1e1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  storageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageStat: {
    fontSize: 12,
    opacity: 0.7,
  },
  storageWarning: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fef3f2',
    borderRadius: 6,
  },
  warningText: {
    color: '#dc2626',
    fontSize: 14,
  },
  searchCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  categoriesContainer: {
    padding: 16,
    gap: 16,
  },
  categoryCard: {
    gap: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryTitle: {
    fontSize: 18,
  },
  categoryDescription: {
    opacity: 0.7,
    lineHeight: 18,
  },
  categoryStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  documentCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    gap: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flex: 1,
    gap: 2,
  },
  documentName: {
    fontSize: 16,
  },
  documentMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  documentActions: {
    gap: 4,
  },
  documentDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  documentControls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  emptyCategory: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
  addButton: {
    alignSelf: 'center',
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  uploadModal: {
    gap: 16,
    padding: 16,
  },
  uploadProgress: {
    gap: 8,
  },
});

export default DocumentsScreen;