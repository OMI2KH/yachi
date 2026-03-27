import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Loading } from '../../components/ui/loading';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Avatar } from '../../components/ui/avatar';
import { ImageViewer } from '../../components/ui/image-viewer';
import { PortfolioGrid } from '../../components/profile/portfolio-grid';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../hooks/use-auth';
import { useUpload } from '../../hooks/use-upload';
import { portfolioService } from '../../services/portfolio-service';
import { userService } from '../../services/user-service';
import { analyticsService } from '../../services/analytics-service';
import { formatters } from '../../utils/formatters';
import { validators } from '../../utils/validators';
import { portfolioConstants } from '../../constants/portfolio';

/**
 * Portfolio Management Screen
 * 
 * Comprehensive portfolio management system for showcasing
 * work samples, projects, certifications, and achievements
 * 
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route parameters
 */
export const PortfolioScreen = ({ navigation, route }) => {
  const { theme, colors } = useTheme();
  const { user } = useAuth();
  const { uploadImage, uploadVideo, deleteFile } = useUpload();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [portfolioStats, setPortfolioStats] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newItemForm, setNewItemForm] = useState({});

  const screenWidth = Dimensions.get('window').width;

  // Portfolio categories configuration
  const portfolioCategories = {
    all: { title: 'All Work', icon: 'grid', count: 0 },
    construction: { 
      title: 'Construction', 
      icon: 'building', 
      count: 0,
      description: 'Building and construction projects',
      color: colors.primary,
    },
    renovation: { 
      title: 'Renovation', 
      icon: 'home', 
      count: 0,
      description: 'Home renovation and remodeling',
      color: colors.info,
    },
    electrical: { 
      title: 'Electrical', 
      icon: 'zap', 
      count: 0,
      description: 'Electrical installations and repairs',
      color: colors.warning,
    },
    plumbing: { 
      title: 'Plumbing', 
      icon: 'droplet', 
      count: 0,
      description: 'Plumbing and water systems',
      color: colors.info,
    },
    design: { 
      title: 'Design', 
      icon: 'layout', 
      count: 0,
      description: 'Architectural and interior design',
      color: colors.success,
    },
    finishing: { 
      title: 'Finishing', 
      icon: 'brush', 
      count: 0,
      description: 'Painting and finishing work',
      color: colors.warning,
    },
    other: { 
      title: 'Other', 
      icon: 'more-horizontal', 
      count: 0,
      description: 'Other types of work',
      color: colors.default,
    },
  };

  /**
   * Fetch portfolio data
   */
  const fetchPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [items, stats] = await Promise.all([
        portfolioService.getUserPortfolio(user.id),
        portfolioService.getPortfolioStats(user.id),
      ]);

      setPortfolioItems(items || []);
      setPortfolioStats(stats);

      // Update category counts
      updateCategoryCounts(items || []);

      // Track portfolio view
      analyticsService.trackScreenView('portfolio', user.id);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
      Alert.alert('Error', 'Unable to load portfolio items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  /**
   * Update category counts
   */
  const updateCategoryCounts = (items) => {
    const counts = { ...portfolioCategories };
    
    Object.keys(counts).forEach(category => {
      if (category === 'all') {
        counts[category].count = items.length;
      } else {
        counts[category].count = items.filter(item => 
          item.category === category
        ).length;
      }
    });
    
    // Update categories with counts
    Object.keys(portfolioCategories).forEach(key => {
      portfolioCategories[key].count = counts[key].count;
    });
  };

  /**
   * Refresh data
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  /**
   * Handle portfolio item upload
   */
  const handleUploadItem = async (files, itemData) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadPromises = files.map(file => {
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        file.type.startsWith('video/') ? 'video' : 'document';
        
        const uploadFunction = fileType === 'image' ? uploadImage : 
                              fileType === 'video' ? uploadVideo : uploadImage;

        return uploadFunction(
          file.uri,
          `portfolio/${fileType}s`,
          user.id,
          (progress) => setUploadProgress(progress)
        );
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Check for failed uploads
      const failedUploads = uploadResults.filter(result => !result.success);
      if (failedUploads.length > 0) {
        throw new Error(`${failedUploads.length} file(s) failed to upload`);
      }

      // Create portfolio item
      const portfolioItem = {
        ...itemData,
        userId: user.id,
        media: uploadResults.map(result => ({
          url: result.url,
          type: result.type,
          thumbnail: result.thumbnail,
          size: result.size,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        views: 0,
        likes: 0,
      };

      const saveResult = await portfolioService.createPortfolioItem(portfolioItem);

      if (saveResult.success) {
        setPortfolioItems(prev => [saveResult.item, ...prev]);
        setShowUploadModal(false);
        setNewItemForm({});
        setUploadProgress(0);

        Alert.alert('Success', 'Portfolio item added successfully.');

        // Track portfolio item creation
        analyticsService.trackPortfolioItemCreated(
          itemData.category,
          files.length,
          user.id
        );
      } else {
        throw new Error(saveResult.message);
      }
    } catch (error) {
      console.error('Portfolio upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Unable to add portfolio item.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle portfolio item update
   */
  const handleUpdateItem = async (itemId, updates) => {
    try {
      const result = await portfolioService.updatePortfolioItem(itemId, updates);

      if (result.success) {
        setPortfolioItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        );
        setShowEditModal(false);
        
        Alert.alert('Success', 'Portfolio item updated successfully.');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Portfolio update failed:', error);
      Alert.alert('Update Failed', error.message || 'Unable to update portfolio item.');
    }
  };

  /**
   * Handle portfolio item deletion
   */
  const handleDeleteItem = async (itemId) => {
    try {
      const result = await portfolioService.deletePortfolioItem(itemId);

      if (result.success) {
        setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
        setShowDeleteModal(false);
        setSelectedItem(null);
        
        Alert.alert('Success', 'Portfolio item deleted successfully.');

        // Track portfolio item deletion
        analyticsService.trackPortfolioItemDeleted(user.id);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Portfolio deletion failed:', error);
      Alert.alert('Deletion Failed', error.message || 'Unable to delete portfolio item.');
    }
  };

  /**
   * Handle item view
   */
  const handleItemView = (item) => {
    setSelectedItem(item);
    setShowViewerModal(true);

    // Track portfolio item view
    analyticsService.trackPortfolioItemViewed(item.id, user.id);
  };

  /**
   * Handle item like
   */
  const handleItemLike = async (itemId) => {
    try {
      const result = await portfolioService.likePortfolioItem(itemId, user.id);

      if (result.success) {
        setPortfolioItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, likes: item.likes + 1 } : item
          )
        );
      }
    } catch (error) {
      console.error('Like action failed:', error);
    }
  };

  /**
   * Handle item share
   */
  const handleItemShare = async (item) => {
    try {
      const shareResult = await portfolioService.generateShareLink(item.id);

      if (shareResult.success) {
        // Implement sharing functionality
        Alert.alert('Share', 'Share link generated successfully.');
        
        // Track portfolio item share
        analyticsService.trackPortfolioItemShared(item.id, user.id);
      }
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Share Failed', 'Unable to share portfolio item.');
    }
  };

  /**
   * Filter portfolio items
   */
  const getFilteredItems = () => {
    let filtered = portfolioItems;

    // Apply category filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(item => item.category === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  /**
   * Get category color
   */
  const getCategoryColor = (category) => {
    return portfolioCategories[category]?.color || colors.default;
  };

  /**
   * Render portfolio stats
   */
  const renderStats = () => (
    <Card style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {portfolioStats?.totalItems || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Total Items
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {portfolioStats?.totalViews || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Total Views
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {portfolioStats?.totalLikes || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Total Likes
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText type="title" style={styles.statValue}>
            {portfolioStats?.avgRating || 0}
          </ThemedText>
          <ThemedText type="default" style={styles.statLabel}>
            Avg. Rating
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  /**
   * Render category filters
   */
  const renderCategoryFilters = () => (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesScroll}
      contentContainerStyle={styles.categoriesContent}
    >
      {Object.entries(portfolioCategories).map(([key, category]) => (
        <Button
          key={key}
          title={`${category.title} (${category.count})`}
          onPress={() => setActiveFilter(key)}
          variant={activeFilter === key ? 'primary' : 'outline'}
          size="small"
          style={styles.categoryButton}
        />
      ))}
    </ScrollView>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <Card style={styles.emptyState}>
      <View style={styles.emptyContent}>
        <ThemedText type="title" style={styles.emptyTitle}>
          No Portfolio Items
        </ThemedText>
        <ThemedText type="default" style={styles.emptyDescription}>
          Showcase your best work to attract more clients and build trust
        </ThemedText>
        <View style={styles.emptyFeatures}>
          <ThemedText type="default" style={styles.emptyFeature}>
            ✓ Upload photos and videos of your work
          </ThemedText>
          <ThemedText type="default" style={styles.emptyFeature}>
            ✓ Add descriptions and project details
          </ThemedText>
          <ThemedText type="default" style={styles.emptyFeature}>
            ✓ Organize by project categories
          </ThemedText>
          <ThemedText type="default" style={styles.emptyFeature}>
            ✓ Get ratings and feedback from clients
          </ThemedText>
        </View>
        <Button
          title="Add Your First Work"
          onPress={() => setShowUploadModal(true)}
          variant="primary"
          size="large"
          icon="plus"
          style={styles.emptyButton}
        />
      </View>
    </Card>
  );

  /**
   * Render portfolio grid
   */
  const renderPortfolioGrid = () => {
    const filteredItems = getFilteredItems();

    if (filteredItems.length === 0) {
      return renderEmptyState();
    }

    return (
      <PortfolioGrid
        items={filteredItems}
        onItemPress={handleItemView}
        onItemLike={handleItemLike}
        onItemShare={handleItemShare}
        onItemEdit={(item) => {
          setSelectedItem(item);
          setShowEditModal(true);
        }}
        onItemDelete={(item) => {
          setSelectedItem(item);
          setShowDeleteModal(true);
        }}
        columns={2}
        showStats={true}
      />
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loading size="large" message="Loading portfolio..." />
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
          <View style={styles.headerTop}>
            <ThemedText type="title" style={styles.title}>
              My Portfolio
            </ThemedText>
            <Button
              title="Add Work"
              onPress={() => setShowUploadModal(true)}
              variant="primary"
              size="small"
              icon="plus"
            />
          </View>
          <ThemedText type="default" style={styles.subtitle}>
            Showcase your best work and attract more clients
          </ThemedText>
        </View>

        {/* Portfolio Statistics */}
        {renderStats()}

        {/* Search Bar */}
        <Card style={styles.searchCard}>
          <Input
            placeholder="Search portfolio items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon="search"
            clearButtonMode="while-editing"
          />
        </Card>

        {/* Category Filters */}
        {renderCategoryFilters()}

        {/* Portfolio Grid */}
        <View style={styles.portfolioContainer}>
          {renderPortfolioGrid()}
        </View>

        {/* Quick Actions */}
        {portfolioItems.length > 0 && (
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
                title="Rearrange"
                onPress={() => navigation.navigate('PortfolioArrange')}
                variant="outline"
                size="medium"
                icon="grid"
              />
              <Button
                title="Export Portfolio"
                onPress={() => navigation.navigate('PortfolioExport')}
                variant="outline"
                size="medium"
                icon="download"
              />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Add Portfolio Item"
        size="large"
      >
        <View style={styles.uploadModal}>
          {/* Upload form would be implemented here */}
          <ThemedText>Portfolio upload form component</ThemedText>
          
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

      {/* Image/Video Viewer Modal */}
      <ImageViewer
        visible={showViewerModal}
        onClose={() => setShowViewerModal(false)}
        media={selectedItem?.media}
        title={selectedItem?.title}
        description={selectedItem?.description}
        showControls={true}
        onLike={() => handleItemLike(selectedItem?.id)}
        onShare={() => handleItemShare(selectedItem)}
        onDownload={() => {}}
      />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Portfolio Item"
        size="large"
      >
        <View style={styles.editModal}>
          {/* Edit form would be implemented here */}
          <ThemedText>Portfolio edit form component</ThemedText>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        onConfirm={() => handleDeleteItem(selectedItem?.id)}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        title="Delete Portfolio Item"
        message="Are you sure you want to delete this portfolio item? This action cannot be undone."
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 20,
  },
  statsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  searchCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  categoriesScroll: {
    marginHorizontal: 16,
  },
  categoriesContent: {
    paddingRight: 16,
    gap: 8,
  },
  categoryButton: {
    marginRight: 8,
  },
  portfolioContainer: {
    padding: 16,
  },
  emptyState: {
    margin: 16,
  },
  emptyContent: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  emptyFeatures: {
    gap: 8,
    marginVertical: 16,
  },
  emptyFeature: {
    textAlign: 'center',
    opacity: 0.8,
  },
  emptyButton: {
    marginTop: 8,
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
  progressBar: {
    height: 4,
    backgroundColor: '#e1e1e1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  editModal: {
    gap: 16,
    padding: 16,
  },
});

export default PortfolioScreen;