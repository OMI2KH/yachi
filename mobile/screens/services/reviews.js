import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';
import { useNotifications } from '../../../hooks/use-notifications';
import { 
  ThemedView, 
  ThemedText 
} from '../../../components/themed-view';
import { 
  Button 
} from '../../../components/ui/button';
import { 
  Card 
} from '../../../components/ui/card';
import { 
  Loading 
} from '../../../components/ui/loading';
import { 
  Input 
} from '../../../components/ui/input';
import { 
  Rating 
} from '../../../components/ui/rating';
import { 
  ReviewCard 
} from '../../../components/service/review-card';
import { 
  RatingModal 
} from '../../../components/ui/rating-modal';
import { 
  ConfirmationModal 
} from '../../../components/ui/confirmation-modal';
import { 
  analyticsService 
} from '../../../services/analytics-service';
import { 
  reviewService 
} from '../../../services/review-service';
import { 
  serviceService 
} from '../../../services/service-service';
import { 
  userService 
} from '../../../services/user-service';
import { 
  notificationService 
} from '../../../services/notification-service';

/**
 * Enterprise-level Reviews Management Screen
 * Features: AI-powered review analysis, sentiment tracking, response management, reputation analytics
 */
const ServiceReviewsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotifications();
  
  const serviceId = params.serviceId;
  const providerId = params.providerId;
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    sentimentScore: 0,
    responseRate: 0,
    recentTrend: 'stable',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [aiInsights, setAiInsights] = useState([]);

  // Analytics tracking
  useFocusEffect(
    useCallback(() => {
      analyticsService.trackScreenView('ServiceReviews');
    }, [])
  );

  // Load reviews data
  const loadReviewsData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      let reviewsData, statsData, insightsData;
      
      if (serviceId) {
        // Load reviews for specific service
        [reviewsData, statsData, insightsData] = await Promise.all([
          reviewService.getServiceReviews(serviceId),
          reviewService.getServiceReviewStats(serviceId),
          reviewService.getAIReviewInsights(serviceId)
        ]);
      } else if (providerId) {
        // Load reviews for service provider
        [reviewsData, statsData, insightsData] = await Promise.all([
          reviewService.getProviderReviews(providerId),
          reviewService.getProviderReviewStats(providerId),
          reviewService.getAIReviewInsights(null, providerId)
        ]);
      } else if (user?.role === 'service_provider') {
        // Load all reviews for current provider
        [reviewsData, statsData, insightsData] = await Promise.all([
          reviewService.getProviderReviews(user.id),
          reviewService.getProviderReviewStats(user.id),
          reviewService.getAIReviewInsights(null, user.id)
        ]);
      } else {
        // Load user's reviews
        [reviewsData, statsData, insightsData] = await Promise.all([
          reviewService.getUserReviews(user.id),
          reviewService.getUserReviewStats(user.id),
          reviewService.getAIReviewInsights(null, null, user.id)
        ]);
      }
      
      setReviews(reviewsData);
      setFilteredReviews(reviewsData);
      setReviewStats(statsData);
      setAiInsights(insightsData);
      
      analyticsService.trackEvent('reviews_loaded', {
        userId: user?.id,
        serviceId: serviceId,
        providerId: providerId,
        reviewCount: reviewsData.length,
        averageRating: statsData.averageRating,
        sentimentScore: statsData.sentimentScore,
      });
    } catch (error) {
      console.error('Error loading reviews:', error);
      showError('Failed to load reviews');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [serviceId, providerId, user?.id, user?.role]);

  // Initial data load
  useFocusEffect(
    useCallback(() => {
      loadReviewsData();
    }, [loadReviewsData])
  );

  // Filter and sort reviews
  const processReviews = useMemo(() => {
    let processed = [...reviews];

    // Apply search filter
    if (searchQuery) {
      processed = processed.filter(review =>
        review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.service?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply rating filter
    if (ratingFilter > 0) {
      processed = processed.filter(review => review.rating === ratingFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        processed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        processed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'highest_rating':
        processed.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest_rating':
        processed.sort((a, b) => a.rating - b.rating);
        break;
      case 'most_helpful':
        processed.sort((a, b) => b.helpfulCount - a.helpfulCount);
        break;
      default:
        break;
    }

    return processed;
  }, [reviews, searchQuery, ratingFilter, sortBy]);

  // Update filtered reviews when filters change
  useMemo(() => {
    setFilteredReviews(processReviews);
  }, [processReviews]);

  // Handle review submission
  const handleSubmitReview = async (rating, comment, images = []) => {
    try {
      const reviewData = {
        rating,
        comment,
        images,
        serviceId: selectedReview?.serviceId,
        bookingId: selectedReview?.bookingId,
        clientId: user.id,
        providerId: selectedReview?.providerId,
      };

      await reviewService.submitReview(reviewData);
      
      // Refresh data
      await loadReviewsData();
      
      analyticsService.trackEvent('review_submitted', {
        userId: user?.id,
        rating: rating,
        hasImages: images.length > 0,
        commentLength: comment.length,
      });
      
      showSuccess('Review submitted successfully');
      setShowReviewModal(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Failed to submit review');
    }
  };

  // Handle review response
  const handleSubmitResponse = async () => {
    try {
      if (!responseText.trim()) {
        showError('Please enter a response');
        return;
      }

      await reviewService.respondToReview(selectedReview.id, responseText);
      
      // Refresh data
      await loadReviewsData();
      
      analyticsService.trackEvent('review_response_submitted', {
        userId: user?.id,
        reviewId: selectedReview.id,
        responseLength: responseText.length,
      });
      
      showSuccess('Response submitted successfully');
      setShowResponseModal(false);
      setSelectedReview(null);
      setResponseText('');
    } catch (error) {
      console.error('Error submitting response:', error);
      showError('Failed to submit response');
    }
  };

  // Handle review helpful vote
  const handleHelpfulVote = async (reviewId, helpful) => {
    try {
      await reviewService.voteReviewHelpful(reviewId, helpful);
      
      // Update local state for immediate feedback
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              helpfulCount: helpful 
                ? review.helpfulCount + 1 
                : Math.max(0, review.helpfulCount - 1),
              userVoted: helpful
            }
          : review
      ));
      
      analyticsService.trackEvent('review_helpful_voted', {
        userId: user?.id,
        reviewId: reviewId,
        helpful: helpful,
      });
    } catch (error) {
      console.error('Error voting on review:', error);
      showError('Failed to update vote');
    }
  };

  // Handle review report
  const handleReportReview = async (reviewId, reason) => {
    Alert.alert(
      'Report Review',
      'Why are you reporting this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Inappropriate Content',
          onPress: async () => {
            try {
              await reviewService.reportReview(reviewId, 'inappropriate_content');
              showSuccess('Review reported successfully');
              
              analyticsService.trackEvent('review_reported', {
                userId: user?.id,
                reviewId: reviewId,
                reason: 'inappropriate_content',
              });
            } catch (error) {
              console.error('Error reporting review:', error);
              showError('Failed to report review');
            }
          },
        },
        {
          text: 'False Information',
          onPress: async () => {
            try {
              await reviewService.reportReview(reviewId, 'false_information');
              showSuccess('Review reported successfully');
              
              analyticsService.trackEvent('review_reported', {
                userId: user?.id,
                reviewId: reviewId,
                reason: 'false_information',
              });
            } catch (error) {
              console.error('Error reporting review:', error);
              showError('Failed to report review');
            }
          },
        },
        {
          text: 'Spam',
          onPress: async () => {
            try {
              await reviewService.reportReview(reviewId, 'spam');
              showSuccess('Review reported successfully');
              
              analyticsService.trackEvent('review_reported', {
                userId: user?.id,
                reviewId: reviewId,
                reason: 'spam',
              });
            } catch (error) {
              console.error('Error reporting review:', error);
              showError('Failed to report review');
            }
          },
        },
      ]
    );
  };

  // Handle AI insight application
  const handleApplyInsight = async (insight) => {
    try {
      await reviewService.applyAIInsight(insight.id);
      
      analyticsService.trackEvent('ai_insight_applied', {
        userId: user?.id,
        insightId: insight.id,
        insightType: insight.type,
      });
      
      showSuccess('AI insight applied successfully');
    } catch (error) {
      console.error('Error applying AI insight:', error);
      showError('Failed to apply insight');
    }
  };

  // Handle review edit
  const handleEditReview = (review) => {
    setSelectedReview(review);
    setShowReviewModal(true);
  };

  // Handle review deletion
  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewService.deleteReview(reviewId);
              
              // Refresh data
              await loadReviewsData();
              
              analyticsService.trackEvent('review_deleted', {
                userId: user?.id,
                reviewId: reviewId,
              });
              
              showSuccess('Review deleted successfully');
            } catch (error) {
              console.error('Error deleting review:', error);
              showError('Failed to delete review');
            }
          },
        },
      ]
    );
  };

  // Calculate rating percentage
  const calculateRatingPercentage = (rating) => {
    const total = reviewStats.totalReviews;
    if (total === 0) return 0;
    return (reviewStats.ratingDistribution[rating] / total) * 100;
  };

  // Get sentiment color
  const getSentimentColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  // Get trend icon
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  // Render review statistics
  const renderReviewStats = () => (
    <Card style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <View style={styles.ratingOverview}>
          <ThemedText style={styles.averageRating}>
            {reviewStats.averageRating.toFixed(1)}
          </ThemedText>
          <Rating rating={reviewStats.averageRating} size={20} />
          <ThemedText style={styles.totalReviews}>
            {reviewStats.totalReviews} reviews
          </ThemedText>
        </View>
        
        <View style={styles.sentimentScore}>
          <ThemedText style={styles.sentimentLabel}>Sentiment</ThemedText>
          <View style={[
            styles.sentimentBadge,
            { backgroundColor: getSentimentColor(reviewStats.sentimentScore) }
          ]}>
            <ThemedText style={styles.sentimentValue}>
              {reviewStats.sentimentScore}%
            </ThemedText>
          </View>
          <ThemedText style={styles.trendIndicator}>
            {getTrendIcon(reviewStats.recentTrend)} {reviewStats.recentTrend}
          </ThemedText>
        </View>
      </View>

      <View style={styles.ratingDistribution}>
        {[5, 4, 3, 2, 1].map((rating) => (
          <View key={rating} style={styles.ratingBar}>
            <ThemedText style={styles.ratingLabel}>{rating} ⭐</ThemedText>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.ratingBarFill,
                  { width: `${calculateRatingPercentage(rating)}%` }
                ]} 
              />
            </View>
            <ThemedText style={styles.ratingCount}>
              {reviewStats.ratingDistribution[rating]}
            </ThemedText>
          </View>
        ))}
      </View>

      {user?.role === 'service_provider' && (
        <View style={styles.providerStats}>
          <ThemedText style={styles.responseRate}>
            Response Rate: {reviewStats.responseRate}%
          </ThemedText>
        </View>
      )}
    </Card>
  );

  // Render AI insights
  const renderAIInsights = () => {
    if (aiInsights.length === 0 || user?.role !== 'service_provider') return null;

    return (
      <Card style={styles.insightsCard}>
        <ThemedText style={styles.sectionTitle}>
          🤖 AI Review Insights
        </ThemedText>
        
        {aiInsights.slice(0, 3).map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <View style={styles.insightContent}>
              <ThemedText style={styles.insightTitle}>
                {insight.title}
              </ThemedText>
              <ThemedText style={styles.insightDescription}>
                {insight.description}
              </ThemedText>
              <ThemedText style={styles.insightImpact}>
                Impact: {insight.impactScore}%
              </ThemedText>
            </View>
            
            <Button
              variant="outlined"
              onPress={() => handleApplyInsight(insight)}
              size="small"
              style={styles.applyInsightButton}
            >
              Apply
            </Button>
          </View>
        ))}
      </Card>
    );
  };

  // Render filters and search
  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <Input
        placeholder="Search reviews..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="search"
        style={styles.searchInput}
      />

      <View style={styles.filterSection}>
        <View style={styles.filterGroup}>
          <ThemedText style={styles.filterLabel}>Rating:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 0, label: 'All Ratings' },
              { key: 5, label: '5 Stars' },
              { key: 4, label: '4 Stars' },
              { key: 3, label: '3 Stars' },
              { key: 2, label: '2 Stars' },
              { key: 1, label: '1 Star' },
            ].map((filter) => (
              <Button
                key={filter.key}
                variant={ratingFilter === filter.key ? 'primary' : 'outlined'}
                onPress={() => setRatingFilter(filter.key)}
                size="small"
                style={styles.filterButton}
              >
                {filter.label}
              </Button>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <ThemedText style={styles.filterLabel}>Sort by:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'highest_rating', label: 'Highest Rated' },
              { key: 'lowest_rating', label: 'Lowest Rated' },
              { key: 'most_helpful', label: 'Most Helpful' },
            ].map((sort) => (
              <Button
                key={sort.key}
                variant={sortBy === sort.key ? 'primary' : 'outlined'}
                onPress={() => setSortBy(sort.key)}
                size="small"
                style={styles.filterButton}
              >
                {sort.label}
              </Button>
            ))}
          </ScrollView>
        </View>
      </View>
    </Card>
  );

  // Render reviews list
  const renderReviewsList = () => {
    if (filteredReviews.length === 0) {
      return (
        <Card style={styles.emptyState}>
          <ThemedText style={styles.emptyStateTitle}>
            No Reviews Found
          </ThemedText>
          <ThemedText style={styles.emptyStateText}>
            {searchQuery || ratingFilter > 0
              ? 'Try adjusting your search or filters'
              : user?.role === 'service_provider'
                ? 'No reviews yet. Keep providing great service!'
                : 'No reviews to display'
            }
          </ThemedText>
        </Card>
      );
    }

    return (
      <View style={styles.reviewsList}>
        {filteredReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            userRole={user?.role}
            onHelpfulVote={(helpful) => handleHelpfulVote(review.id, helpful)}
            onReport={() => handleReportReview(review.id)}
            onRespond={() => {
              setSelectedReview(review);
              setShowResponseModal(true);
            }}
            onEdit={() => handleEditReview(review)}
            onDelete={() => handleDeleteReview(review.id)}
            style={styles.reviewCard}
          />
        ))}
      </View>
    );
  };

  // Render action buttons based on user role
  const renderActionButtons = () => {
    if (user?.role === 'client' && !serviceId && !providerId) {
      return (
        <Card style={styles.actionsCard}>
          <Button
            variant="primary"
            onPress={() => router.push('/(bookings)/history')}
            leftIcon="add"
            style={styles.actionButton}
          >
            Write a Review
          </Button>
        </Card>
      );
    }

    return null;
  };

  if (isLoading) {
    return <Loading message="Loading reviews..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadReviewsData}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Review Statistics */}
        {renderReviewStats()}

        {/* AI Insights */}
        {renderAIInsights()}

        {/* Search and Filters */}
        {renderFilters()}

        {/* Reviews List */}
        {renderReviewsList()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Review Submission Modal */}
      <RatingModal
        visible={showReviewModal}
        title="Write a Review"
        onSubmit={handleSubmitReview}
        onCancel={() => {
          setShowReviewModal(false);
          setSelectedReview(null);
        }}
        initialRating={selectedReview?.rating}
        initialComment={selectedReview?.comment}
        editMode={!!selectedReview}
      />

      {/* Response Modal */}
      <ConfirmationModal
        visible={showResponseModal}
        title="Respond to Review"
        message="Write a professional response to this review"
        confirmText="Submit Response"
        cancelText="Cancel"
        onConfirm={handleSubmitResponse}
        onCancel={() => {
          setShowResponseModal(false);
          setSelectedReview(null);
          setResponseText('');
        }}
      >
        <View style={styles.modalContent}>
          <ThemedText style={styles.reviewComment}>
            "{selectedReview?.comment}"
          </ThemedText>
          <Input
            placeholder="Type your response here..."
            value={responseText}
            onChangeText={setResponseText}
            multiline
            numberOfLines={4}
            style={styles.responseInput}
          />
        </View>
      </ConfirmationModal>
    </ThemedView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingOverview: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalReviews: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  sentimentScore: {
    alignItems: 'center',
  },
  sentimentLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  sentimentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sentimentValue: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  trendIndicator: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  ratingDistribution: {
    gap: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 12,
    width: 50,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#eab308',
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: 12,
    opacity: 0.7,
    width: 30,
    textAlign: 'right',
  },
  providerStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  responseRate: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  insightsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  insightContent: {
    flex: 1,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    lineHeight: 16,
  },
  insightImpact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  applyInsightButton: {
    alignSelf: 'flex-start',
  },
  filtersCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  filterSection: {
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    marginRight: 8,
  },
  reviewsList: {
    gap: 12,
    padding: 16,
  },
  reviewCard: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  actionButton: {
    width: '100%',
  },
  spacer: {
    height: 20,
  },
  modalContent: {
    gap: 16,
  },
  reviewComment: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  responseInput: {
    minHeight: 100,
  },
};

export default ServiceReviewsScreen;