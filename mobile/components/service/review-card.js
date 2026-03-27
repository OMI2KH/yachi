// components/service/review-card.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Image,
  Share,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Star,
  Heart,
  Share2,
  Flag,
  MoreHorizontal,
  CheckCircle,
  Award,
  ThumbsUp,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  User,
  Shield,
  Crown,
  Edit3,
  Trash2,
  Reply,
  Bookmark,
  Download,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Review Card Component
 * Features: Multi-type reviews, rich interactions, social features, Ethiopian market focus
 */

// Review types and configurations
const REVIEW_TYPES = {
  service: {
    label: 'Service Review',
    icon: Award,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
  },
  construction: {
    label: 'Construction Review',
    icon: Shield,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  government: {
    label: 'Government Project',
    icon: Crown,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
  },
  premium: {
    label: 'Premium Review',
    icon: Crown,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
};

// Review rating categories for detailed feedback
const RATING_CATEGORIES = {
  quality: { label: 'Quality', icon: Award },
  professionalism: { label: 'Professionalism', icon: User },
  communication: { label: 'Communication', icon: MessageCircle },
  timeliness: { label: 'Timeliness', icon: Clock },
  value: { label: 'Value', icon: ThumbsUp },
};

const ReviewCard = ({
  review,
  variant = 'default', // 'default', 'compact', 'detailed', 'featured'
  editable = false,
  showActions = true,
  showReplies = true,
  onPress,
  onEdit,
  onDelete,
  onReply,
  onLike,
  onShare,
  onReport,
  onUserPress,
  onServicePress,
  enableSocialFeatures = true,
  enableAnalytics = true,
  style,
  testID = 'review-card',
}) => {
  const { theme, colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { isUserPremium } = usePremium();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(review?.userLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Enhanced review data with fallbacks
  const reviewData = useMemo(() => ({
    id: review?.id || '',
    userId: review?.userId || '',
    userName: review?.userName || 'ያልታወቀ ተጠቃሚ',
    userAvatar: review?.userAvatar,
    userType: review?.userType || 'client',
    userVerified: review?.userVerified || false,
    userPremium: review?.userPremium || false,
    serviceId: review?.serviceId || '',
    serviceName: review?.serviceName || 'Service',
    serviceType: review?.serviceType || 'general',
    rating: review?.rating || 5,
    categoryRatings: review?.categoryRatings || {},
    title: review?.title || '',
    comment: review?.comment || '',
    images: review?.images || [],
    projectType: review?.projectType || 'residential',
    projectBudget: review?.projectBudget,
    projectDuration: review?.projectDuration,
    location: review?.location || 'Addis Ababa, Ethiopia',
    createdAt: review?.createdAt || new Date().toISOString(),
    updatedAt: review?.updatedAt || new Date().toISOString(),
    likes: review?.likes || 0,
    replies: review?.replies || [],
    userLiked: review?.userLiked || false,
    verifiedPurchase: review?.verifiedPurchase || false,
    helpful: review?.helpful || 0,
    featured: review?.featured || false,
    reviewType: review?.reviewType || 'service',
    tags: review?.tags || [],
    language: review?.language || 'amharic',
  }), [review]);

  // Enhanced review type configuration
  const reviewTypeConfig = useMemo(() => {
    return REVIEW_TYPES[reviewData.reviewType] || REVIEW_TYPES.service;
  }, [reviewData.reviewType]);

  // Enhanced animations
  React.useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    // Pulse animation for featured reviews
    if (reviewData.featured) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [reviewData.featured]);

  // Check if text needs truncation
  const needsTruncation = useMemo(() => {
    return reviewData.comment.length > 150;
  }, [reviewData.comment]);

  // Enhanced like handler
  const handleLikePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    
    if (onLike) {
      await onLike(reviewData.id, newLikeState);
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackReviewLike(reviewData.id, newLikeState, currentUser.id);
    }
  }, [isLiked, reviewData.id, onLike, enableAnalytics, currentUser]);

  // Enhanced share handler
  const handleSharePress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const shareUrl = `https://yachi.et/reviews/${reviewData.id}`;
      const message = `ስለ ${reviewData.serviceName} ከ${reviewData.userName} የተሰጠ አስተያየት በያቺ ይመልከቱ! ${shareUrl}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: `Review by ${reviewData.userName} - Yachi`,
            text: message,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert('ተገልጧል', 'የአስተያየት አገናኝ ተገልጧል');
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: `Review by ${reviewData.userName} - Yachi`,
        });
      }
      
      if (onShare) {
        onShare(reviewData);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [reviewData, onShare]);

  // Enhanced bookmark handler
  const handleBookmarkPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);
    
    // Analytics tracking
    if (enableAnalytics) {
      // trackReviewBookmark(reviewData.id, newBookmarkState, currentUser.id);
    }
  }, [isBookmarked, reviewData.id, enableAnalytics, currentUser]);

  // Enhanced more actions handler
  const handleMoreActions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const options = [];
    
    if (editable) {
      options.push('Edit Review', 'Delete Review');
    } else {
      options.push('Report Review', 'Share Review');
    }
    
    if (showReplies) {
      options.push('View Replies');
    }
    
    options.push('Cancel');
    
    const cancelIndex = options.length - 1;
    const destructiveIndex = editable ? 1 : 0;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
        },
        async (buttonIndex) => {
          const selectedOption = options[buttonIndex];
          switch (selectedOption) {
            case 'Edit Review':
              onEdit?.(reviewData);
              break;
            case 'Delete Review':
              handleDeleteReview();
              break;
            case 'Report Review':
              onReport?.(reviewData);
              break;
            case 'Share Review':
              handleSharePress();
              break;
            case 'View Replies':
              setIsExpanded(!isExpanded);
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Review Actions',
        undefined,
        options.map((option, index) => ({
          text: option,
          style: index === destructiveIndex ? 'destructive' : 'default',
          onPress: () => {
            const selectedOption = options[index];
            switch (selectedOption) {
              case 'Edit Review':
                onEdit?.(reviewData);
                break;
              case 'Delete Review':
                handleDeleteReview();
                break;
              case 'Report Review':
                onReport?.(reviewData);
                break;
              case 'Share Review':
                handleSharePress();
                break;
              case 'View Replies':
                setIsExpanded(!isExpanded);
                break;
            }
          },
        }))
      );
    }
  }, [editable, showReplies, reviewData, onEdit, onReport, handleSharePress, isExpanded]);

  // Enhanced delete handler
  const handleDeleteReview = useCallback(() => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(reviewData.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [reviewData.id, onDelete]);

  // Enhanced reply handler
  const handleReplyPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onReply) {
      onReply(reviewData);
    } else {
      setIsExpanded(!isExpanded);
    }
  }, [reviewData, onReply, isExpanded]);

  // Enhanced user press handler
  const handleUserPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onUserPress) {
      onUserPress(reviewData.userId);
    }
  }, [reviewData.userId, onUserPress]);

  // Enhanced service press handler
  const handleServicePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onServicePress) {
      onServicePress(reviewData.serviceId);
    }
  }, [reviewData.serviceId, onServicePress]);

  // Render star rating
  const renderStarRating = useCallback((rating, size = 16) => {
    return (
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={colors.warning}
            fill={star <= rating ? colors.warning : 'transparent'}
          />
        ))}
      </View>
    );
  }, [colors.warning]);

  // Render category ratings
  const renderCategoryRatings = useCallback(() => {
    if (!reviewData.categoryRatings || Object.keys(reviewData.categoryRatings).length === 0) {
      return null;
    }

    return (
      <View style={styles.categoryRatings}>
        {Object.entries(reviewData.categoryRatings).map(([category, rating]) => {
          const categoryConfig = RATING_CATEGORIES[category];
          if (!categoryConfig) return null;
          
          const CategoryIcon = categoryConfig.icon;
          
          return (
            <View key={category} style={styles.categoryRating}>
              <CategoryIcon size={12} color={colors.textTertiary} />
              <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
                {categoryConfig.label}
              </Text>
              {renderStarRating(rating, 12)}
            </View>
          );
        })}
      </View>
    );
  }, [reviewData.categoryRatings, colors]);

  // Render review images
  const renderImages = useCallback(() => {
    if (!reviewData.images || reviewData.images.length === 0) {
      return null;
    }

    const visibleImages = variant === 'compact' 
      ? reviewData.images.slice(0, 2)
      : reviewData.images.slice(0, 4);

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.imagesContainer}
      >
        {visibleImages.map((image, index) => (
          <Pressable
            key={index}
            style={styles.imageWrapper}
            onPress={() => {
              // Handle image preview
            }}
          >
            <Image
              source={{ uri: image }}
              style={styles.reviewImage}
              resizeMode="cover"
            />
            {index === visibleImages.length - 1 && reviewData.images.length > visibleImages.length && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>
                  +{reviewData.images.length - visibleImages.length}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    );
  }, [reviewData.images, variant]);

  // Render review header
  const renderHeader = useCallback(() => {
    const ReviewTypeIcon = reviewTypeConfig.icon;

    return (
      <View style={styles.header}>
        {/* User Info */}
        <Pressable style={styles.userInfo} onPress={handleUserPress}>
          {reviewData.userAvatar ? (
            <Image
              source={{ uri: reviewData.userAvatar }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
              <User size={16} color="#FFFFFF" />
            </View>
          )}
          
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {reviewData.userName}
              </Text>
              
              {/* Verification Badges */}
              <View style={styles.userBadges}>
                {reviewData.userVerified && (
                  <CheckCircle size={12} color={colors.success} />
                )}
                {reviewData.userPremium && (
                  <Crown size={12} color={colors.warning} />
                )}
              </View>
            </View>
            
            <View style={styles.metaInfo}>
              {renderStarRating(reviewData.rating, 14)}
              <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
                {new Date(reviewData.createdAt).toLocaleDateString('en-ET')}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Review Type Badge */}
        <View style={[styles.reviewTypeBadge, { backgroundColor: reviewTypeConfig.color + '20' }]}>
          <ReviewTypeIcon size={12} color={reviewTypeConfig.color} />
          <Text style={[styles.reviewTypeText, { color: reviewTypeConfig.color }]}>
            {reviewTypeConfig.label}
          </Text>
        </View>
      </View>
    );
  }, [reviewData, reviewTypeConfig, colors, handleUserPress]);

  // Render review content
  const renderContent = useCallback(() => {
    const displayComment = showFullText 
      ? reviewData.comment 
      : reviewData.comment.slice(0, 150) + (needsTruncation ? '...' : '');

    return (
      <View style={styles.content}>
        {/* Review Title */}
        {reviewData.title && (
          <Text style={[styles.reviewTitle, { color: colors.text }]}>
            {reviewData.title}
          </Text>
        )}

        {/* Review Comment */}
        <Text style={[styles.reviewComment, { color: colors.text }]}>
          {displayComment}
        </Text>

        {/* Read More/Less Toggle */}
        {needsTruncation && (
          <Pressable
            onPress={() => setShowFullText(!showFullText)}
            style={styles.readMoreButton}
          >
            <Text style={[styles.readMoreText, { color: colors.primary }]}>
              {showFullText ? 'Read Less' : 'Read More'}
            </Text>
          </Pressable>
        )}

        {/* Category Ratings */}
        {variant === 'detailed' && renderCategoryRatings()}

        {/* Project Details */}
        {(reviewData.projectBudget || reviewData.projectDuration) && variant === 'detailed' && (
          <View style={styles.projectDetails}>
            {reviewData.projectBudget && (
              <View style={styles.projectDetail}>
                <Award size={12} color={colors.textTertiary} />
                <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                  {reviewData.projectBudget} ETB
                </Text>
              </View>
            )}
            {reviewData.projectDuration && (
              <View style={styles.projectDetail}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                  {reviewData.projectDuration}
                </Text>
              </View>
            )}
            {reviewData.location && (
              <View style={styles.projectDetail}>
                <MapPin size={12} color={colors.textTertiary} />
                <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                  {reviewData.location}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Images */}
        {renderImages()}

        {/* Tags */}
        {reviewData.tags && reviewData.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {reviewData.tags.slice(0, 3).map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: colors.primary + '15' }]}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [reviewData, variant, showFullText, needsTruncation, colors, renderCategoryRatings, renderImages]);

  // Render review footer with actions
  const renderFooter = useCallback(() => {
    if (!showActions) return null;

    return (
      <View style={styles.footer}>
        {/* Social Actions */}
        {enableSocialFeatures && (
          <View style={styles.socialActions}>
            <Pressable
              style={styles.socialAction}
              onPress={handleLikePress}
            >
              <Heart 
                size={16} 
                color={isLiked ? colors.error : colors.textTertiary} 
                fill={isLiked ? colors.error : 'transparent'}
              />
              <Text style={[
                styles.socialActionText, 
                { color: isLiked ? colors.error : colors.textTertiary }
              ]}>
                {reviewData.likes}
              </Text>
            </Pressable>

            {showReplies && (
              <Pressable
                style={styles.socialAction}
                onPress={handleReplyPress}
              >
                <MessageCircle size={16} color={colors.textTertiary} />
                <Text style={[styles.socialActionText, { color: colors.textTertiary }]}>
                  {reviewData.replies.length}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.socialAction}
              onPress={handleBookmarkPress}
            >
              <Bookmark 
                size={16} 
                color={isBookmarked ? colors.warning : colors.textTertiary} 
                fill={isBookmarked ? colors.warning : 'transparent'}
              />
            </Pressable>

            <Pressable
              style={styles.socialAction}
              onPress={handleSharePress}
            >
              <Share2 size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
        )}

        {/* More Actions */}
        <Pressable
          style={styles.moreActions}
          onPress={handleMoreActions}
        >
          <MoreHorizontal size={16} color={colors.textTertiary} />
        </Pressable>
      </View>
    );
  }, [
    showActions,
    enableSocialFeatures,
    showReplies,
    isLiked,
    isBookmarked,
    reviewData.likes,
    reviewData.replies.length,
    colors,
    handleLikePress,
    handleReplyPress,
    handleBookmarkPress,
    handleSharePress,
    handleMoreActions,
  ]);

  // Render featured badge
  const renderFeaturedBadge = useCallback(() => {
    if (!reviewData.featured) return null;

    return (
      <Animated.View 
        style={[
          styles.featuredBadge,
          { 
            backgroundColor: colors.warning + '20',
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Award size={12} color={colors.warning} />
        <Text style={[styles.featuredText, { color: colors.warning }]}>
          Featured
        </Text>
      </Animated.View>
    );
  }, [reviewData.featured, colors, pulseAnim]);

  // Render verified purchase badge
  const renderVerifiedBadge = useCallback(() => {
    if (!reviewData.verifiedPurchase) return null;

    return (
      <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
        <CheckCircle size={12} color={colors.success} />
        <Text style={[styles.verifiedText, { color: colors.success }]}>
          Verified Purchase
        </Text>
      </View>
    );
  }, [reviewData.verifiedPurchase, colors]);

  if (isLoading) {
    return <Loading size="small" />;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        variant === 'compact' && styles.compactContainer,
        variant === 'featured' && styles.featuredContainer,
        style,
      ]}
      testID={testID}
    >
      {/* Featured Badge */}
      {renderFeaturedBadge()}

      {/* Header */}
      {renderHeader()}

      {/* Content */}
      {renderContent()}

      {/* Verified Badge */}
      {renderVerifiedBadge()}

      {/* Footer */}
      {renderFooter()}

      {/* Replies Section */}
      {isExpanded && reviewData.replies.length > 0 && (
        <View style={styles.repliesSection}>
          <Text style={[styles.repliesTitle, { color: colors.text }]}>
            Replies ({reviewData.replies.length})
          </Text>
          {reviewData.replies.slice(0, 3).map((reply, index) => (
            <View key={reply.id} style={[styles.replyItem, { borderColor: colors.border }]}>
              <View style={styles.replyHeader}>
                <Text style={[styles.replyAuthor, { color: colors.text }]}>
                  {reply.authorName}
                </Text>
                <Text style={[styles.replyDate, { color: colors.textTertiary }]}>
                  {new Date(reply.createdAt).toLocaleDateString('en-ET')}
                </Text>
              </View>
              <Text style={[styles.replyText, { color: colors.text }]}>
                {reply.text}
              </Text>
            </View>
          ))}
          {reviewData.replies.length > 3 && (
            <Pressable style={styles.viewAllReplies}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                View all {reviewData.replies.length} replies
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  compactContainer: {
    padding: 12,
    marginVertical: 2,
  },
  featuredContainer: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 1,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  reviewTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryRatings: {
    gap: 6,
    marginBottom: 12,
  },
  categoryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 100,
  },
  projectDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  projectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectDetailText: {
    fontSize: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  socialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  socialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreActions: {
    padding: 4,
  },
  repliesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  repliesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  replyItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyDate: {
    fontSize: 10,
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  viewAllReplies: {
    padding: 8,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(ReviewCard);
export { REVIEW_TYPES, RATING_CATEGORIES };