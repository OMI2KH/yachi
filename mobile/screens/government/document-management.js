import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGovernmentDocuments } from '../../contexts/construction-context';
import { useAuth } from '../../contexts/auth-context';
import { useNotifications } from '../../contexts/notification-context';
import {
  ThemedView,
  ThemedText,
} from '../../components/themed-view';
import {
  Card,
  Button,
  Input,
  Badge,
  Loading,
  ConfirmationModal,
  Avatar,
} from '../../components/ui';
import { DocumentFilter } from '../../components/construction/document-filter';
import { DocumentUploadModal } from '../../components/construction/document-upload-modal';
import { DocumentCard } from '../../components/construction/document-card';
import { DocumentViewer } from '../../components/construction/document-viewer';
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  GOVERNMENT_ROLES,
} from '../../constants/government';
import { formatDate, fileSizeFormatter } from '../../utils/formatters';
import { validateDocument } from '../../utils/validators';

/**
 * Enterprise Government Document Management Screen
 * Handles complete document lifecycle for government construction projects
 */
const GovernmentDocumentManagement = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectId = params.projectId;
  
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  
  const {
    documents,
    loading,
    uploading,
    filters,
    selectedDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
    setFilters,
    setSelectedDocument,
    refreshDocuments,
    downloadDocument,
    shareDocument,
  } = useGovernmentDocuments(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Check user permissions for document management
  const userPermissions = useMemo(() => {
    const role = user?.role;
    return {
      canUpload: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.ADMIN].includes(role),
      canDelete: [GOVERNMENT_ROLES.PROJECT_MANAGER, GOVERNMENT_ROLES.ADMIN].includes(role),
      canApprove: [GOVERNMENT_ROLES.APPROVER, GOVERNMENT_ROLES.ADMIN].includes(role),
      canViewAll: [GOVERNMENT_ROLES.ADMIN, GOVERNMENT_ROLES.AUDITOR].includes(role),
    };
  }, [user?.role]);

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filters.types.length === 0 || filters.types.includes(doc.type);
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(doc.status);
      
      const matchesDate = (!filters.startDate || new Date(doc.uploadedAt) >= new Date(filters.startDate)) &&
                         (!filters.endDate || new Date(doc.uploadedAt) <= new Date(filters.endDate));
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [documents, searchQuery, filters]);

  // Document statistics
  const documentStats = useMemo(() => {
    const total = documents.length;
    const approved = documents.filter(doc => doc.status === DOCUMENT_STATUS.APPROVED).length;
    const pending = documents.filter(doc => doc.status === DOCUMENT_STATUS.PENDING).length;
    const rejected = documents.filter(doc => doc.status === DOCUMENT_STATUS.REJECTED).length;
    
    return { total, approved, pending, rejected };
  }, [documents]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDocuments();
    setRefreshing(false);
  }, [refreshDocuments]);

  const handleDocumentUpload = useCallback(async (documentData) => {
    try {
      const validation = validateDocument(documentData);
      if (!validation.isValid) {
        showNotification('error', 'Validation Error', validation.errors.join(', '));
        return;
      }

      await uploadDocument({
        ...documentData,
        projectId,
        uploadedBy: user.id,
        governmentAgency: user.agency,
      });
      
      setShowUploadModal(false);
      showNotification('success', 'Document Uploaded', 'Document has been uploaded successfully');
    } catch (error) {
      showNotification('error', 'Upload Failed', error.message);
    }
  }, [uploadDocument, projectId, user, showNotification]);

  const handleDocumentView = useCallback((document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  }, [setSelectedDocument]);

  const handleDocumentDownload = useCallback(async (document) => {
    try {
      await downloadDocument(document.id);
      showNotification('success', 'Download Started', 'Document download has started');
    } catch (error) {
      showNotification('error', 'Download Failed', error.message);
    }
  }, [downloadDocument, showNotification]);

  const handleDocumentShare = useCallback(async (document) => {
    try {
      await shareDocument(document.id);
      showNotification('success', 'Document Shared', 'Document has been shared successfully');
    } catch (error) {
      showNotification('error', 'Share Failed', error.message);
    }
  }, [shareDocument, showNotification]);

  const handleDocumentApprove = useCallback(async (document) => {
    try {
      await updateDocument(document.id, {
        status: DOCUMENT_STATUS.APPROVED,
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
      });
      showNotification('success', 'Document Approved', 'Document has been approved');
    } catch (error) {
      showNotification('error', 'Approval Failed', error.message);
    }
  }, [updateDocument, user, showNotification]);

  const handleDocumentReject = useCallback(async (document) => {
    Alert.prompt(
      'Reject Document',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async (reason) => {
            try {
              await updateDocument(document.id, {
                status: DOCUMENT_STATUS.REJECTED,
                reviewedBy: user.id,
                reviewedAt: new Date().toISOString(),
                rejectionReason: reason,
              });
              showNotification('success', 'Document Rejected', 'Document has been rejected');
            } catch (error) {
              showNotification('error', 'Rejection Failed', error.message);
            }
          },
        },
      ],
      'plain-text'
    );
  }, [updateDocument, user, showNotification]);

  const handleDocumentDelete = useCallback((document) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      await deleteDocument(documentToDelete.id);
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      showNotification('success', 'Document Deleted', 'Document has been deleted successfully');
    } catch (error) {
      showNotification('error', 'Deletion Failed', error.message);
    }
  }, [deleteDocument, documentToDelete, showNotification]);

  const renderDocumentItem = useCallback(({ item: document }) => (
    <DocumentCard
      document={document}
      onView={() => handleDocumentView(document)}
      onDownload={() => handleDocumentDownload(document)}
      onShare={() => handleDocumentShare(document)}
      onApprove={userPermissions.canApprove ? () => handleDocumentApprove(document) : undefined}
      onReject={userPermissions.canApprove ? () => handleDocumentReject(document) : undefined}
      onDelete={userPermissions.canDelete ? () => handleDocumentDelete(document) : undefined}
      userPermissions={userPermissions}
    />
  ), [
    handleDocumentView,
    handleDocumentDownload,
    handleDocumentShare,
    handleDocumentApprove,
    handleDocumentReject,
    handleDocumentDelete,
    userPermissions,
  ]);

  const renderStatsCard = useCallback((title, count, color) => (
    <Card variant="elevated" style={{ flex: 1, margin: 4 }}>
      <ThemedText type="subtitle" style={{ textAlign: 'center' }}>{title}</ThemedText>
      <ThemedText type="title" style={{ textAlign: 'center', color }}>{count}</ThemedText>
    </Card>
  ), []);

  if (loading && documents.length === 0) {
    return <Loading message="Loading documents..." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header Section */}
      <View style={{ padding: 16 }}>
        <ThemedText type="title">Document Management</ThemedText>
        <ThemedText type="default">
          Project: {params.projectName || 'Construction Project'}
        </ThemedText>
        
        {/* Statistics Overview */}
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          {renderStatsCard('Total', documentStats.total, '#007AFF')}
          {renderStatsCard('Approved', documentStats.approved, '#34C759')}
          {renderStatsCard('Pending', documentStats.pending, '#FF9500')}
          {renderStatsCard('Rejected', documentStats.rejected, '#FF3B30')}
        </View>
      </View>

      {/* Search and Actions Bar */}
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon="search"
          style={{ flex: 1, marginRight: 12 }}
        />
        {userPermissions.canUpload && (
          <Button
            title="Upload"
            icon="cloud-upload"
            onPress={() => setShowUploadModal(true)}
            variant="primary"
          />
        )}
      </View>

      {/* Filter Section */}
      <DocumentFilter
        filters={filters}
        onFiltersChange={setFilters}
        documentTypes={DOCUMENT_TYPES}
        documentStatuses={DOCUMENT_STATUS}
      />

      {/* Documents List */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ThemedText type="default">No documents found</ThemedText>
            {userPermissions.canUpload && (
              <Button
                title="Upload First Document"
                onPress={() => setShowUploadModal(true)}
                variant="outline"
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
      />

      {/* Upload Modal */}
      <DocumentUploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleDocumentUpload}
        uploading={uploading}
        projectId={projectId}
        allowedTypes={Object.values(DOCUMENT_TYPES)}
      />

      {/* Document Viewer */}
      <DocumentViewer
        visible={showViewer}
        document={selectedDocument}
        onClose={() => setShowViewer(false)}
        onDownload={handleDocumentDownload}
        onShare={handleDocumentShare}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setDocumentToDelete(null);
        }}
        variant="destructive"
      />
    </ThemedView>
  );
};

export default GovernmentDocumentManagement;