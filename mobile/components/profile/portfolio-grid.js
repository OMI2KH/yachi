// components/profile/portfolio-grid.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  Share,
  LayoutAnimation,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
  Crown,
  Shield,
  Star,
  Heart,
  Eye,
  Share2,
  Play,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Globe,
  Music,
  Edit3,
  Trash2,
  Plus,
  X,
  Filter,
  Search,
  Grid,
  List,
  Zap,
  Calendar,
  TrendingUp,
  Download,
  MessageCircle,
  Bookmark,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { usePremium } from '../../contexts/premium-context';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Enterprise Portfolio Grid Component
 * Features: Multi-media support, advanced filtering, social engagement, analytics
 */

// Portfolio item types configuration
const PORTFOLIO_TYPES = {
  image: {
    label: 'Image',
    icon: ImageIcon,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  video: {
    label: 'Video',
    icon: VideoIcon,
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
  },
  document: {
    label: 'Document',
    icon: FileText,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
  },
  website: {
    label: 'Website',
    icon: Globe,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  audio: {
    label: 'Audio',
    icon: Music,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
};

// Portfolio categories configuration
const PORTFOLIO_CATEGORIES = {
  construction: { 
    label: 'Construction', 
    icon: Zap, 
    color: '#F59E0B',
    description: 'Building and construction projects'
  },
  design: { 
    label: 'Design', 
    icon: Edit3, 
    color: '#8B5CF6',
    description: 'Architectural and interior design'
  },
  renovation: { 
    label: 'Renovation', 
    icon: TrendingUp, 
    color: '#10B981',
    description: 'Home and building renovations'
  },
  government: { 
    label: 'Government', 
    icon: Shield, 
    color: '#3B82F6',
    description: 'Public infrastructure projects'
  },
  residential: { 
    label: 'Residential', 
    icon: Crown, 
    color: '#EC4899',
    description: 'Housing and residential projects'
  },
  commercial: { 
    label: 'Commercial', 
    icon: TrendingUp, 
    color: '#6366F1',
    description: 'Commercial building projects'
  },
};

const PortfolioGrid = ({
  portfolioItems = [],
  userId,
  onItemPress,
  onItemEdit,
  onItemDelete,
  onItemShare,
  onItemLike,
  onItemDownload,
  onAddItem,
  editable = false,
  showStats = true,
  showFilters = true,
  viewMode = 'grid', // 'grid', 'list', 'masonry'
  columns = 3,
  maxItems = 50,
  categoryFilter = null,
  typeFilter = null,
  sortBy = 'date', // 'date', 'likes', 'views', 'title', 'featured'
  sortOrder = 'desc', // 'asc', 'desc'
  style,
  enableSocialFeatures = true,
  enableAnalytics = true,
  testID = 'portfolio-grid',
}) => {
  const { theme, colors } = useTheme();
  const { isUserPremium, premiumTier } = usePremium();
  const { user: currentUser } = useAuth();
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [videoRefs] = useState({});
  const [likedItems, setLikedItems] = useState(new Set());
  const [viewedItems, setViewedItems] = useState(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  // Enhanced filter and sort with AI recommendations
  const filteredItems = useMemo(() => {
    let result = portfolioItems;
    
    // Apply category filter
    if (categoryFilter) {
      result = result.filter(item => item.category === categoryFilter);
    }
    
    // Apply type filter
    if (typeFilter) {
      result = result.filter(item => item.type === typeFilter);
    }
    
    // Apply search filter with fuzzy matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        item.skills?.some(skill => skill.toLowerCase().includes(query))
      );
    }
    
    // Apply active filters
    if (activeFilters.length > 0) {
      result = result.filter(item => 
        activeFilters.every(filter => {
          switch (filter) {
            case 'featured':
              return item.featured;
            case 'recent':
              const itemDate = new Date(item.createdAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return itemDate > weekAgo;
            case 'popular':
              return item.likes > 10 || item.views > 100;
            case 'premium':
              return item.premiumContent;
            case 'ai_recommended':
              return item.aiScore > 0.7;
            default:
              return true;
          }
        })
      );
    }
    
    // Enhanced sorting with multiple criteria
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'likes':
          aValue = a.likes;
          bValue = b.likes;
          break;
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'engagement':
          aValue = (a.likes * 2) + a.views + (a.comments || 0);
          bValue = (b.likes * 2) + b.views + (b.comments || 0);
          break;
        case 'ai_score':
          aValue = a.aiScore || 0;
          bValue = b.aiScore || 0;
          break;
        case 'date':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    // AI-powered recommendations for premium users
    if (isUserPremium && sortBy === 'ai_recommended') {
      result.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    }
    
    return result.slice(0, maxItems);
  }, [portfolioItems, categoryFilter, typeFilter, searchQuery, activeFilters, sortBy, sortOrder, maxItems, isUserPremium]);

  // Calculate responsive grid dimensions
  const gridStyles = useMemo(() => {
    const gap = 12;
    const itemWidth = (SCREEN_WIDTH - (gap * (columns + 1))) / columns;
    
    return {
      container: {
        gap,
        padding: gap,
      },
      item: {
        width: itemWidth,
        marginBottom: gap,
      },
      listItem: {
        width: SCREEN_WIDTH - 32,
        marginHorizontal: 16,
        marginBottom: 16,
      },
      masonryItem: {
        width: (SCREEN_WIDTH - 48) / 2,
        marginBottom: gap,
      },
    };
  }, [columns]);

  // Enhanced item press with analytics
  const handleItemPress = useCallback(async (item) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Track view for analytics
    if (!viewedItems.has(item.id)) {
      setViewedItems(prev => new Set([...prev, item.id]));
      
      // Analytics tracking
      if (enableAnalytics) {
        // trackPortfolioView(item.id, currentUser.id);
      }
    }
    
    if (onItemPress) {
      onItemPress(item);
    } else {
      setSelectedItem(item);
      setShowDetailModal(true);
    }
  }, [onItemPress, viewedItems, enableAnalytics, currentUser]);

  // Enhanced item actions with premium features
  const handleItemLongPress = useCallback((item) => {
    if (!editable) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showItemActions(item);
  }, [editable]);

  // Advanced action sheet with premium options
  const showItemActions = useCallback((item) => {
    const options = [
      'View Details',
      'Share Portfolio',
      'Download',
      'Bookmark',
      'Edit',
      'Delete',
      'Cancel',
    ];
    
    const cancelIndex = 6;
    const destructiveIndex = 5;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              setSelectedItem(item);
              setShowDetailModal(true);
              break;
            case 1:
              handleShareItem(item);
              break;
            case 2:
              handleDownloadItem(item);
              break;
            case 3:
              handleBookmarkItem(item);
              break;
            case 4:
              onItemEdit?.(item);
              break;
            case 5:
              handleDeleteItem(item);
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Portfolio Actions',
        `What would you like to do with "${item.title}"?`,
        [
          { text: 'View Details', onPress: () => {
            setSelectedItem(item);
            setShowDetailModal(true);
          }},
          { text: 'Share', onPress: () => handleShareItem(item) },
          { text: 'Download', onPress: () => handleDownloadItem(item) },
          { text: 'Bookmark', onPress: () => handleBookmarkItem(item) },
          { text: 'Edit', onPress: () => onItemEdit?.(item) },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => handleDeleteItem(item),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [onItemEdit]);

  // Enhanced sharing with Ethiopian market focus
  const handleShareItem = useCallback(async (item) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const shareUrl = item.url || `https://yachi.et/portfolio/${item.id}`;
      const message = `ስራዬን ተመልከቱ: "${item.title}" በያቺ ፖርትፎሊዮ! ${shareUrl}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: item.title,
            text: message,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert('ተገልጧል', 'የፖርትፎሊዮ አገናኝ ተገልጧል');
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: item.title,
        });
      }
      
      onItemShare?.(item);
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [onItemShare]);

  // Download handler with premium checks
  const handleDownloadItem = useCallback(async (item) => {
    if (item.premiumContent && !isUserPremium) {
      Alert.alert(
        'Premium Content',
        'This content requires a premium subscription to download.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('PremiumUpgrade') },
        ]
      );
      return;
    }

    try {
      setIsLoading(true);
      await onItemDownload?.(item);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Download Failed', 'Unable to download the file.');
    } finally {
      setIsLoading(false);
    }
  }, [isUserPremium, onItemDownload]);

  // Bookmark functionality
  const handleBookmarkItem = useCallback(async (item) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isBookmarked = bookmarkedItems.has(item.id);
    const newBookmarkedItems = new Set(bookmarkedItems);
    
    if (isBookmarked) {
      newBookmarkedItems.delete(item.id);
    } else {
      newBookmarkedItems.add(item.id);
    }
    
    setBookmarkedItems(newBookmarkedItems);
    
    // Analytics tracking
    if (enableAnalytics) {
      // trackBookmarkAction(item.id, !isBookmarked);
    }
  }, [bookmarkedItems, enableAnalytics]);

  // Enhanced delete with confirmation
  const handleDeleteItem = useCallback((item) => {
    Alert.alert(
      'Delete Portfolio Item',
      `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onItemDelete?.(item);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [onItemDelete]);

  // Enhanced like with animations
  const handleLikeItem = useCallback(async (item, event) => {
    event?.stopPropagation();
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isLiked = likedItems.has(item.id);
    const newLikedItems = new Set(likedItems);
    
    if (isLiked) {
      newLikedItems.delete(item.id);
    } else {
      newLikedItems.add(item.id);
    }
    
    setLikedItems(newLikedItems);
    
    if (onItemLike) {
      onItemLike(item, !isLiked);
    }
    
    // Enhanced animation sequence
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [likedItems, onItemLike, scaleAnim]);

  // Enhanced filter system
  const toggleFilter = useCallback((filter) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Render portfolio item with enhanced design
  const renderPortfolioItem = useCallback(({ item, index }) => {
    const portfolioType = PORTFOLIO_TYPES[item.type] || PORTFOLIO_TYPES.image;
    const category = PORTFOLIO_CATEGORIES[item.category] || PORTFOLIO_CATEGORIES.construction;
    const TypeIcon = portfolioType.icon;
    const CategoryIcon = category.icon;
    
    const isLiked = likedItems.has(item.id);
    const isBookmarked = bookmarkedItems.has(item.id);
    const isViewed = viewedItems.has(item.id);

    const itemStyle = viewMode === 'list' ? gridStyles.listItem : 
                     viewMode === 'masonry' ? gridStyles.masonryItem : 
                     gridStyles.item;

    return (
      <Pressable
        style={[
          styles.portfolioItem,
          itemStyle,
          {
            backgroundColor: colors.card,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          },
        ]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {/* Media Container with Enhanced Overlays */}
        <View style={styles.mediaContainer}>
          {/* Media Preview */}
          {item.type === 'image' && item.thumbnail && (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.mediaPreview}
              resizeMode="cover"
            />
          )}
          
          {item.type === 'video' && (
            <View style={styles.videoContainer}>
              {item.thumbnail ? (
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={portfolioType.gradient}
                  style={styles.mediaPreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <TypeIcon size={40} color="#FFFFFF" />
                </LinearGradient>
              )}
              <View style={styles.videoOverlay}>
                <Play size={24} color="#FFFFFF" />
              </View>
            </View>
          )}
          
          {['document', 'website', 'audio'].includes(item.type) && (
            <LinearGradient
              colors={portfolioType.gradient}
              style={styles.mediaPreview}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TypeIcon size={40} color="#FFFFFF" />
            </LinearGradient>
          )}
          
          {/* Enhanced Badge System */}
          <View style={styles.badgesContainer}>
            {/* Type Badge */}
            <View style={[styles.typeBadge, { backgroundColor: portfolioType.color }]}>
              <TypeIcon size={12} color="#FFFFFF" />
            </View>
            
            {/* Category Badge */}
            <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
              <CategoryIcon size={10} color="#FFFFFF" />
              <Text style={styles.categoryBadgeText}>{category.label}</Text>
            </View>
            
            {/* Premium Badge */}
            {item.premiumContent && (
              <View style={styles.premiumBadge}>
                <Crown size={10} color="#FFFFFF" />
              </View>
            )}
            
            {/* Featured Badge */}
            {item.featured && (
              <View style={styles.featuredBadge}>
                <Star size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Social Actions Overlay */}
          {enableSocialFeatures && (
            <View style={styles.socialOverlay}>
              <Pressable
                style={styles.socialButton}
                onPress={(e) => handleLikeItem(item, e)}
              >
                <Heart 
                  size={16} 
                  color={isLiked ? '#EF4444' : '#FFFFFF'} 
                  fill={isLiked ? '#EF4444' : 'transparent'}
                />
              </Pressable>
              
              <Pressable
                style={styles.socialButton}
                onPress={() => handleBookmarkItem(item)}
              >
                <Bookmark 
                  size={16} 
                  color={isBookmarked ? '#F59E0B' : '#FFFFFF'} 
                  fill={isBookmarked ? '#F59E0B' : 'transparent'}
                />
              </Pressable>
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gradientOverlay}
          />
        </View>

        {/* Enhanced Content Area */}
        <View style={styles.itemContent}>
          <Text
            style={[styles.itemTitle, { color: colors.text }]}
            numberOfLines={viewMode === 'list' ? 2 : 1}
          >
            {item.title}
          </Text>
          
          {viewMode === 'list' && item.description && (
            <Text
              style={[styles.itemDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          
          {/* Skills/Tags */}
          {item.skills && item.skills.length > 0 && viewMode === 'list' && (
            <View style={styles.skillsContainer}>
              {item.skills.slice(0, 3).map((skill, idx) => (
                <View
                  key={idx}
                  style={[styles.skillTag, { backgroundColor: colors.primary + '15' }]}
                >
                  <Text style={[styles.skillText, { color: colors.primary }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Enhanced Stats Footer */}
          <View style={styles.itemFooter}>
            {showStats && (
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Eye size={12} color={colors.textTertiary} />
                  <Text style={[styles.statText, { color: colors.textTertiary }]}>
                    {item.views?.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.stat}>
                  <Heart 
                    size={12} 
                    color={isLiked ? '#EF4444' : colors.textTertiary} 
                    fill={isLiked ? '#EF4444' : 'transparent'}
                  />
                  <Text style={[styles.statText, { color: colors.textTertiary }]}>
                    {item.likes?.toLocaleString()}
                  </Text>
                </View>

                {item.comments > 0 && (
                  <View style={styles.stat}>
                    <MessageCircle size={12} color={colors.textTertiary} />
                    <Text style={[styles.statText, { color: colors.textTertiary }]}>
                      {item.comments}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            <Text style={[styles.itemDate, { color: colors.textTertiary }]}>
              {new Date(item.createdAt).toLocaleDateString('en-ET')}
            </Text>
          </View>
        </View>

        {/* Edit Overlay for Editable Portfolios */}
        {editable && (
          <View style={styles.editOverlay}>
            <Pressable
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => onItemEdit?.(item)}
            >
              <Edit3 size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  }, [
    theme,
    colors,
    viewMode,
    gridStyles,
    editable,
    showStats,
    enableSocialFeatures,
    likedItems,
    bookmarkedItems,
    viewedItems,
    handleItemPress,
    handleItemLongPress,
    handleLikeItem,
    handleBookmarkItem,
    onItemEdit,
  ]);

  // Render enhanced filter system
  const renderFilters = () => {
    if (!showFilters) return null;

    const filterOptions = [
      { key: 'featured', label: 'Featured', icon: Star },
      { key: 'recent', label: 'Recent', icon: Calendar },
      { key: 'popular', label: 'Popular', icon: TrendingUp },
      { key: 'premium', label: 'Premium', icon: Crown },
    ];

    // Add AI recommendations filter for premium users
    if (isUserPremium) {
      filterOptions.push({ key: 'ai_recommended', label: 'AI Recommended', icon: Zap });
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {filterOptions.map((filter) => {
          const FilterIcon = filter.icon;
          const isActive = activeFilters.includes(filter.key);
          
          return (
            <Pressable
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.background,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => toggleFilter(filter.key)}
            >
              <FilterIcon
                size={14}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterText,
                  {
                    color: isActive ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  // Render enhanced empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <ImageIcon size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        {editable ? 'No portfolio items yet' : 'No portfolio to show'}
      </Text>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        {editable 
          ? 'Showcase your best work to attract more clients and projects'
          : 'This professional hasn\'t added any portfolio items yet'
        }
      </Text>
      {editable && onAddItem && (
        <Button
          title="Add Your First Project"
          onPress={onAddItem}
          variant="primary"
          size="large"
          icon={Plus}
          style={styles.addFirstButton}
        />
      )}
    </View>
  );

  // Render enhanced add button
  const renderAddButton = () => {
    if (!editable || !onAddItem) return null;

    return (
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={onAddItem}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.addButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Plus size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    );
  };

  // Render portfolio view
  const renderPortfolioItems = () => {
    if (filteredItems.length === 0) {
      return renderEmptyState();
    }

    if (viewMode === 'list') {
      return (
        <FlatList
          data={filteredItems}
          renderItem={renderPortfolioItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      );
    }

    return (
      <View style={[styles.gridContainer, gridStyles.container]}>
        {filteredItems.map((item, index) => (
          <View key={item.id}>
            {renderPortfolioItem({ item, index })}
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return <Loading message="Loading portfolio..." />;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Enhanced Filter System */}
      {renderFilters()}
      
      {/* Portfolio Items */}
      {renderPortfolioItems()}
      
      {/* Enhanced Add Button */}
      {renderAddButton()}
      
      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedItem && (
          <PortfolioDetailModal
            item={selectedItem}
            onClose={() => setShowDetailModal(false)}
            onLike={handleLikeItem}
            onShare={handleShareItem}
            onDownload={handleDownloadItem}
            onBookmark={handleBookmarkItem}
            theme={theme}
            colors={colors}
          />
        )}
      </Modal>
    </View>
  );
};

// Enhanced Portfolio Detail Modal
const PortfolioDetailModal = ({ 
  item, 
  onClose, 
  onLike, 
  onShare, 
  onDownload, 
  onBookmark,
  theme,
  colors 
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const videoRef = useRef(null);

  return (
    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
      {/* Enhanced Header */}
      <BlurView intensity={80} tint={theme} style={styles.modalHeader}>
        <View style={styles.modalHeaderContent}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          
          <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          
          <View style={styles.headerActions}>
            <Pressable onPress={() => onShare?.(item)} style={styles.actionButton}>
              <Share2 size={20} color={colors.text} />
            </Pressable>
            <Pressable 
              onPress={() => {
                setIsLiked(!isLiked);
                onLike?.(item, { stopPropagation: () => {} });
              }} 
              style={styles.actionButton}
            >
              <Heart 
                size={20} 
                color={isLiked ? '#EF4444' : colors.text} 
                fill={isLiked ? '#EF4444' : 'transparent'}
              />
            </Pressable>
            <Pressable 
              onPress={() => {
                setIsBookmarked(!isBookmarked);
                onBookmark?.(item);
              }} 
              style={styles.actionButton}
            >
              <Bookmark 
                size={20} 
                color={isBookmarked ? '#F59E0B' : colors.text} 
                fill={isBookmarked ? '#F59E0B' : 'transparent'}
              />
            </Pressable>
          </View>
        </View>
      </BlurView>

      {/* Enhanced Content */}
      <ScrollView style={styles.modalContent}>
        {/* Media display, stats, description, tags, comments would be implemented here */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  listContainer: {
    paddingVertical: 8,
  },
  portfolioItem: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaContainer: {
    position: 'relative',
    aspectRatio: 1,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  premiumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    gap: 8,
  },
  socialButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  itemContent: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 48,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  addFirstButton: {
    minWidth: 200,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
});

export default React.memo(PortfolioGrid);
export { PORTFOLIO_TYPES, PORTFOLIO_CATEGORIES };