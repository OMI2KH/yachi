// app/(profile)/portfolio.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useLoading } from '../../../contexts/loading-context';
import { portfolioService } from '../../../services/portfolio-service';
import { uploadService } from '../../../services/upload-service';
import { analyticsService } from '../../../services/analytics-service';
import { errorService } from '../../../services/error-service';
import { storage } from '../../../utils/storage';

// Components
import PortfolioHeader from '../../../components/profile/portfolio/portfolio-header';
import PortfolioGrid from '../../../components/profile/portfolio/portfolio-grid';
import PortfolioStats from '../../../components/profile/portfolio/portfolio-stats';
import FilterBar from '../../../components/profile/portfolio/filter-bar';
import EmptyPortfolio from '../../../components/profile/portfolio/empty-portfolio';
import AddItemFAB from '../../../components/profile/portfolio/add-item-fab';
import LoadingScreen from '../../../components/ui/loading';
import ErrorScreen from '../../../components/ui/error-screen';
import RetryButton from '../../../components/ui/retry-button';
import Toast from '../../../components/ui/toast';
import ConfirmationModal from '../../../components/ui/confirmation-modal';

// Constants
import {
  PORTFOLIO_ITEM_TYPES,
  PORTFOLIO_CATEGORIES,
  SORT_OPTIONS,
  FILTER_OPTIONS
} from '../../../constants/portfolio';

const { width, height } = Dimensions.get('window');

export default function PortfolioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalViews: 0,
    totalLikes: 0,
    completionScore: 0,
  });

  // Filters and sorting
  const [activeFilter, setActiveFilter] = useState(FILTER_OPTIONS.ALL);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.RECENT);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // UI state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs
  const scrollViewRef = useRef();
  const mountedRef = useRef(true);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Initialize portfolio data
  useEffect(() => {
    mountedRef.current = true;
    loadPortfolioData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // Apply filters when they change
  useEffect(() => {
    if (portfolioItems.length > 0) {
      applyFilters();
    }
  }, [portfolioItems, activeFilter, sortBy, searchQuery, selectedCategory]);

  // FAB animation on scroll
  useEffect(() => {
    const showFab = () => {
      Animated.timing(fabAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    const hideFab = () => {
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    // Show FAB after initial load
    if (!loading) {
      showFab();
    }

    return () => {
      hideFab();
    };
  }, [loading]);

  const loadPortfolioData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      const result = await portfolioService.getUserPortfolio(user.id, {
        includeStats: true,
        includeMetrics: true,
      });

      if (!mountedRef.current) return;

      if (result.success) {
        setPortfolioItems(result.data.items || []);
        setStats(result.data.stats || stats);

        // Cache the data
        await storage.setItem(`portfolio_${user.id}`, {
          items: result.data.items,
          stats: result.data.stats,
          timestamp: Date.now(),
        });

        // Animate content in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();

        analyticsService.trackEvent('portfolio_loaded', {
          userId: user.id,
          itemCount: result.data.items?.length || 0,
          completionScore: result.data.stats?.completionScore || 0,
        });

      } else {
        throw new Error(result.message || 'Failed to load portfolio');
      }

    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(err.message);
      
      errorService.captureError(err, {
        context: 'PortfolioLoad',
        userId: user?.id,
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Apply filters and sorting
  const applyFilters = useCallback(() => {
    let filtered = [...portfolioItems];

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply type filter
    if (activeFilter !== FILTER_OPTIONS.ALL) {
      filtered = filtered.filter(item => item.type === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.RECENT:
          return new Date(b.createdAt) - new Date(a.createdAt);
        case SORT_OPTIONS.OLDEST:
          return new Date(a.createdAt) - new Date(b.createdAt);
        case SORT_OPTIONS.POPULAR:
          return (b.metrics?.views || 0) - (a.metrics?.views || 0);
        case SORT_OPTIONS.ALPHABETICAL:
          return (a.title || '').localeCompare(b.title || '');
        case SORT_OPTIONS.UPDATED:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  }, [portfolioItems, activeFilter, sortBy, searchQuery, selectedCategory]);

  // Refresh control
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPortfolioData(false);
  }, []);

  // Add new portfolio item
  const handleAddItem = async (itemData) => {
    try {
      setUploading(true);
      showLoading('Adding to portfolio...');

      // Handle file uploads if present
      let mediaUrls = [];
      if (itemData.media && itemData.media.length > 0) {
        showLoading('Uploading media...');
        
        for (const [index, media] of itemData.media.entries()) {
          const uploadResult = await uploadService.uploadMedia(media.uri, {
            folder: 'portfolio',
            userId: user.id,
            itemType: itemData.type,
            onProgress: (progress) => {
              const overallProgress = (index / itemData.media.length) + (progress / itemData.media.length);
              setUploadProgress(overallProgress * 100);
            },
          });

          if (uploadResult.success) {
            mediaUrls.push({
              url: uploadResult.url,
              type: media.type,
              thumbnail: uploadResult.thumbnail,
              metadata: uploadResult.metadata,
            });
          } else {
            throw new Error(`Failed to upload media: ${uploadResult.message}`);
          }
        }
      }

      // Create portfolio item
      const createData = {
        ...itemData,
        media: mediaUrls,
        userId: user.id,
        status: 'published',
      };

      const result = await portfolioService.createPortfolioItem(createData);

      if (result.success) {
        // Update local state
        setPortfolioItems(prev => [result.item, ...prev]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          completionScore: calculateCompletionScore([...portfolioItems, result.item]),
        }));

        showToast('Portfolio item added successfully', 'success');
        
        analyticsService.trackEvent('portfolio_item_created', {
          userId: user.id,
          itemType: itemData.type,
          category: itemData.category,
          mediaCount: itemData.media?.length || 0,
        });

        // Navigate to the new item
        router.push(`/(profile)/portfolio/${result.item.id}`);

      } else {
        throw new Error(result.message || 'Failed to create portfolio item');
      }

    } catch (err) {
      console.error('Error adding portfolio item:', err);
      showToast('Failed to add portfolio item', 'error');
      
      errorService.captureError(err, {
        context: 'PortfolioItemCreate',
        userId: user.id,
        itemType: itemData.type,
      });
    } finally {
      setUploading(false);
      hideLoading();
      setUploadProgress(0);
    }
  };

  // Edit portfolio item
  const handleEditItem = (item) => {
    router.push(`/(profile)/portfolio/${item.id}/edit`);
  };

  // Delete portfolio item
  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      showLoading('Deleting portfolio item...');

      const result = await portfolioService.deletePortfolioItem(itemToDelete.id);

      if (result.success) {
        // Update local state
        setPortfolioItems(prev => prev.filter(item => item.id !== itemToDelete.id));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
          totalViews: prev.totalViews - (itemToDelete.metrics?.views || 0),
          totalLikes: prev.totalLikes - (itemToDelete.metrics?.likes || 0),
          completionScore: calculateCompletionScore(portfolioItems.filter(item => item.id !== itemToDelete.id)),
        }));

        showToast('Portfolio item deleted successfully', 'success');
        
        analyticsService.trackEvent('portfolio_item_deleted', {
          userId: user.id,
          itemId: itemToDelete.id,
          itemType: itemToDelete.type,
        });

      } else {
        throw new Error(result.message || 'Failed to delete portfolio item');
      }

    } catch (err) {
      console.error('Error deleting portfolio item:', err);
      showToast('Failed to delete portfolio item', 'error');
      
      errorService.captureError(err, {
        context: 'PortfolioItemDelete',
        userId: user.id,
        itemId: itemToDelete.id,
      });
    } finally {
      hideLoading();
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  // Toggle item visibility
  const handleToggleVisibility = async (item) => {
    try {
      const newStatus = item.status === 'published' ? 'draft' : 'published';
      
      const result = await portfolioService.updatePortfolioItem(item.id, {
        status: newStatus,
      });

      if (result.success) {
        // Update local state
        setPortfolioItems(prev =>
          prev.map(prevItem =>
            prevItem.id === item.id
              ? { ...prevItem, status: newStatus }
              : prevItem
          )
        );

        showToast(
          `Item ${newStatus === 'published' ? 'published' : 'unpublished'}`,
          'success'
        );

        analyticsService.trackEvent('portfolio_item_visibility_toggled', {
          userId: user.id,
          itemId: item.id,
          newStatus,
        });

      } else {
        throw new Error(result.message || 'Failed to update item');
      }

    } catch (err) {
      console.error('Error toggling item visibility:', err);
      showToast('Failed to update item', 'error');
    }
  };

  // Handle item press
  const handleItemPress = (item) => {
    router.push(`/(profile)/portfolio/${item.id}`);
    
    analyticsService.trackEvent('portfolio_item_viewed', {
      userId: user.id,
      itemId: item.id,
      itemType: item.type,
    });
  };

  // Calculate completion score
  const calculateCompletionScore = (items) => {
    const requiredFields = [
      'title',
      'description',
      'category',
      'media',
    ];

    const totalPossibleScore = items.length * requiredFields.length;
    let actualScore = 0;

    items.forEach(item => {
      requiredFields.forEach(field => {
        if (field === 'media') {
          if (item.media && item.media.length > 0) {
            actualScore += 1;
          }
        } else if (item[field] && item[field].toString().trim().length > 0) {
          actualScore += 1;
        }
      });
    });

    return totalPossibleScore > 0 ? Math.round((actualScore / totalPossibleScore) * 100) : 0;
  };

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    loadPortfolioData(true);
  };

  if (loading && portfolioItems.length === 0) {
    return <LoadingScreen message="Loading your portfolio..." />;
  }

  if (error && portfolioItems.length === 0) {
    return (
      <ErrorScreen
        message={error}
        onRetry={handleRetry}
        retryButton={<RetryButton onPress={handleRetry} />}
      />
    );
  }

  const hasItems = portfolioItems.length > 0;
  const completionScore = stats.completionScore || calculateCompletionScore(portfolioItems);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Portfolio',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 16,
          },
        }}
      />

      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            !hasItems && styles.emptyContentContainer,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Portfolio Header with Stats */}
            {hasItems && (
              <PortfolioHeader
                stats={stats}
                completionScore={completionScore}
                theme={theme}
              />
            )}

            {/* Portfolio Stats */}
            {hasItems && (
              <PortfolioStats
                stats={stats}
                itemsCount={portfolioItems.length}
                theme={theme}
              />
            )}

            {/* Filter and Search Bar */}
            {hasItems && (
              <FilterBar
                activeFilter={activeFilter}
                sortBy={sortBy}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onFilterChange={setActiveFilter}
                onSortChange={setSortBy}
                onSearchChange={setSearchQuery}
                onCategoryChange={setSelectedCategory}
                categories={PORTFOLIO_CATEGORIES}
                theme={theme}
              />
            )}

            {/* Portfolio Grid or Empty State */}
            {hasItems ? (
              <PortfolioGrid
                items={filteredItems}
                onItemPress={handleItemPress}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onToggleVisibility={handleToggleVisibility}
                loading={uploading}
                uploadProgress={uploadProgress}
                theme={theme}
              />
            ) : (
              <EmptyPortfolio
                onAddFirstItem={() => router.push('/(profile)/portfolio/create')}
                theme={theme}
              />
            )}
          </Animated.View>
        </ScrollView>

        {/* Floating Action Button */}
        {hasItems && (
          <Animated.View
            style={[
              styles.fabContainer,
              {
                opacity: fabAnim,
                transform: [
                  {
                    scale: fabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <AddItemFAB
              onPress={() => router.push('/(profile)/portfolio/create')}
              uploading={uploading}
              uploadProgress={uploadProgress}
              theme={theme}
            />
          </Animated.View>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          visible={showDeleteModal}
          title="Delete Portfolio Item?"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteItem}
          onCancel={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          type="danger"
          theme={theme}
        />

        {/* Toast Notification */}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(prev => ({ ...prev, visible: false }))}
          theme={theme}
        />

        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height - 200,
  },
  animatedContainer: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 1000,
  },
});