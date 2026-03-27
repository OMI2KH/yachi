// components/forms/rating-form.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// Contexts
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Button from '../ui/button';
import Input from '../ui/input';
import Card from '../ui/card';
import Badge from '../ui/badge';
import Loading from '../ui/loading';
import Modal from '../ui/modal';
import StarRating from '../ui/rating';

// Services
import { ratingService } from '../../services/rating-service';
import { uploadService } from '../../services/upload-service';
import { notificationService } from '../../services/notification-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Utils
import { storage } from '../../utils/storage';

// Constants
import { COLORS } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Rating Form Component
 * Ethiopian market focused with local context
 * Multi-criteria rating system for comprehensive feedback
 */

const RatingForm = ({
  booking,
  service,
  provider,
  onSuccess,
  onCancel,
  maxPhotos = 5,
  testID = 'rating-form',
}) => {
  const router = useRouter();
  const { theme, user } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState([]);
  const [criteriaRatings, setCriteriaRatings] = useState({
    quality: 5,
    timeliness: 5,
    communication: 5,
    professionalism: 5,
    value: 5,
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef(null);

  // Rating labels for Ethiopian context
  const ratingLabels = {
    1: { en: 'Poor', am: 'ከፋ', om: 'Hamaa' },
    2: { en: 'Fair', am: 'መጥፎ', om: 'Gaariidha' },
    3: { en: 'Good', am: 'ጥሩ', om: 'Gaari' },
    4: { en: 'Very Good', am: 'በጣም ጥሩ', om: 'Baayyee gaari' },
    5: { en: 'Excellent', am: 'እጅግ በጣም ጥሩ', om: 'Baayyee bareedaa' },
  };

  // Rating criteria for comprehensive feedback
  const ratingCriteria = [
    {
      id: 'quality',
      label: 'Quality of Work',
      description: 'How satisfied are you with the work quality?',
      icon: '🛠️',
    },
    {
      id: 'timeliness',
      label: 'Timeliness',
      description: 'Did the service start and finish on time?',
      icon: '⏰',
    },
    {
      id: 'communication',
      label: 'Communication',
      description: 'How was the provider\'s communication?',
      icon: '💬',
    },
    {
      id: 'professionalism',
      label: 'Professionalism',
      description: 'Was the provider professional and respectful?',
      icon: '👔',
    },
    {
      id: 'value',
      label: 'Value for Money',
      description: 'Was the service worth the price?',
      icon: '💰',
    },
  ];

  // Initialize component
  useEffect(() => {
    animateEntrance();
    requestPermissions();
  }, []);

  const animateEntrance = () => {
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
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        notificationService.show({
          type: 'warning',
          title: 'Permission Required',
          message: 'Please allow photo access to upload review photos',
        });
      }
    }
  };

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    // Review validation
    if (!review.trim()) {
      errors.review = 'Please write a review';
    } else if (review.length < 10) {
      errors.review = 'Review should be at least 10 characters';
    } else if (review.length > 1000) {
      errors.review = 'Review should not exceed 1000 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [review]);

  // Handle image upload
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos - photos.length,
      });

      if (!result.canceled && result.assets) {
        setUploading(true);

        // Upload each photo to cloud storage
        const uploadPromises = result.assets.map(asset =>
          uploadService.uploadImage(asset.uri, `reviews/${booking?.id || 'general'}`)
        );

        const uploadResults = await Promise.all(uploadPromises);
        
        const newPhotos = uploadResults
          .filter(result => result.success)
          .map(result => ({
            id: Date.now() + Math.random(),
            url: result.url,
            thumbnail: result.thumbnail,
          }));

        setPhotos(prev => [...prev, ...newPhotos]);
        
        notificationService.show({
          type: 'success',
          title: 'Photos Added',
          message: `${newPhotos.length} photo(s) added to your review`,
        });

      }
    } catch (error) {
      console.error('Image upload error:', error);
      notificationService.show({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload photos. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Remove photo from selection
  const removePhoto = useCallback((photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  }, []);

  // Calculate average criteria rating
  const calculateAverageRating = useCallback(() => {
    const values = Object.values(criteriaRatings);
    const sum = values.reduce((total, value) => total + value, 0);
    return Math.round(sum / values.length);
  }, [criteriaRatings]);

  // Update overall rating when criteria change
  useEffect(() => {
    const average = calculateAverageRating();
    setRating(average);
  }, [calculateAverageRating]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      notificationService.show({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please check your review before submitting',
      });
      return;
    }

    try {
      setLoading(true);

      const ratingData = {
        bookingId: booking?.id,
        serviceId: service?.id,
        providerId: provider?.id,
        rating,
        criteriaRatings,
        review: review.trim(),
        photos: photos.map(photo => photo.url),
        reviewerId: user.id,
        reviewerName: user.firstName + ' ' + user.lastName,
        reviewerAvatar: user.avatar,
      };

      const result = await ratingService.submitRating(ratingData);

      if (result.success) {
        // Track analytics
        analyticsService.track('rating_submitted', {
          serviceId: service?.id,
          providerId: provider?.id,
          rating,
          hasPhotos: photos.length > 0,
          reviewLength: review.length,
        });

        // Show success notification
        notificationService.show({
          type: 'success',
          title: 'Thank You! 🎉',
          message: 'Your review helps the community make better choices',
        });

        // Call success callback
        onSuccess?.(result.rating);

      } else {
        throw new Error(result.message || 'Failed to submit rating');
      }

    } catch (error) {
      console.error('Rating submission error:', error);
      
      errorService.handleError(error, {
        context: 'RatingForm',
        bookingId: booking?.id,
        userId: user?.id,
      });

      notificationService.show({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'Unable to submit rating. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Render overall rating section
  const renderOverallRating = () => (
    <Card style={styles.ratingCard}>
      <ThemedText type="title" weight="bold" style={styles.sectionTitle}>
        Overall Rating
      </ThemedText>
      <ThemedText type="body" color="secondary" style={styles.sectionSubtitle}>
        How was your experience with {provider?.firstName}'s service?
      </ThemedText>
      
      <View style={styles.overallRating}>
        <StarRating
          rating={rating}
          onRatingChange={setRating}
          size="large"
          style={styles.starRating}
        />
        <ThemedText type="body" weight="semiBold" color="primary" style={styles.ratingLabel}>
          {ratingLabels[rating]?.en} • {rating} out of 5
        </ThemedText>
      </View>
    </Card>
  );

  // Render detailed criteria ratings
  const renderCriteriaRatings = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Rate Specific Aspects
      </ThemedText>
      
      <View style={styles.criteriaList}>
        {ratingCriteria.map(criterion => (
          <View key={criterion.id} style={styles.criterionItem}>
            <View style={styles.criterionHeader}>
              <ThemedText type="body">
                {criterion.icon} {criterion.label}
              </ThemedText>
              <Badge variant="outline" color="primary" size="small">
                {criteriaRatings[criterion.id]}/5
              </Badge>
            </View>
            <ThemedText type="caption" color="secondary" style={styles.criterionDescription}>
              {criterion.description}
            </ThemedText>
            <StarRating
              rating={criteriaRatings[criterion.id]}
              onRatingChange={(value) => 
                setCriteriaRatings(prev => ({ ...prev, [criterion.id]: value }))
              }
              size="small"
              style={styles.criterionStars}
            />
          </View>
        ))}
      </View>
    </Card>
  );

  // Render review input section
  const renderReviewInput = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Write Your Review
      </ThemedText>
      
      <Input
        placeholder="Share details of your experience... What did you like? What could be improved?"
        value={review}
        onChangeText={(value) => {
          setReview(value);
          setTouched(prev => ({ ...prev, review: true }));
        }}
        error={formErrors.review}
        touched={touched.review}
        multiline
        numberOfLines={6}
        style={styles.reviewInput}
        maxLength={1000}
      />
      
      <View style={styles.charCounter}>
        <ThemedText type="caption" color={review.length > 800 ? 'warning' : 'secondary'}>
          {review.length}/1000 characters
        </ThemedText>
      </View>
    </Card>
  );

  // Render photo upload section
  const renderPhotoUpload = () => (
    <Card style={styles.sectionCard}>
      <ThemedText type="body" weight="semiBold" style={styles.sectionLabel}>
        Add Photos ({photos.length}/{maxPhotos})
      </ThemedText>
      <ThemedText type="caption" color="secondary" style={styles.photoSubtitle}>
        Share photos of the completed work (optional)
      </ThemedText>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.photosScroll}
      >
        <TouchableOpacity 
          style={styles.addPhotoButton}
          onPress={handleImagePick}
          disabled={uploading || photos.length >= maxPhotos}
        >
          {uploading ? (
            <Loading size="small" />
          ) : (
            <>
              <ThemedText type="title">📷</ThemedText>
              <ThemedText type="caption" color="secondary" style={styles.addPhotoText}>
                Add Photos
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoItem}>
            <Image 
              source={{ uri: photo.thumbnail || photo.url }} 
              style={styles.photo} 
            />
            <TouchableOpacity 
              style={styles.removePhotoButton}
              onPress={() => removePhoto(photo.id)}
            >
              <ThemedText type="caption" color="error">✕</ThemedText>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </Card>
  );

  // Render review tips
  const renderReviewTips = () => (
    <Card style={styles.tipsCard}>
      <ThemedText type="body" weight="semiBold" style={styles.tipsTitle}>
        💡 Writing a Helpful Review
      </ThemedText>
      
      <View style={styles.tipsList}>
        <View style={styles.tipItem}>
          <ThemedText type="caption" weight="medium">
            • Describe the quality and outcome of the work
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <ThemedText type="caption" weight="medium">
            • Mention timeliness and adherence to schedule
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <ThemedText type="caption" weight="medium">
            • Note communication and professionalism
          </ThemedText>
        </View>
        <View style={styles.tipItem}>
          <ThemedText type="caption" weight="medium">
            • Share if you would recommend this provider
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading message="Submitting your review..." />
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      testID={testID}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service Header */}
        <Card style={styles.headerCard}>
          <ThemedText type="title" weight="bold" style={styles.headerTitle}>
            Rate Your Experience
          </ThemedText>
          <ThemedText type="body" color="secondary" style={styles.headerSubtitle}>
            {service?.name} by {provider?.firstName} {provider?.lastName}
          </ThemedText>
        </Card>

        {renderOverallRating()}
        {renderCriteriaRatings()}
        {renderReviewInput()}
        {renderPhotoUpload()}
        {renderReviewTips()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onCancel && (
            <Button
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !review.trim()}
            style={styles.submitButton}
          >
            Submit {rating}-Star Review
          </Button>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <ThemedText type="caption" color="secondary" style={styles.privacyText}>
            🔒 Your review will be public and help others in the Ethiopian community make informed decisions
          </ThemedText>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  ratingCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  overallRating: {
    alignItems: 'center',
    gap: 12,
  },
  starRating: {
    marginVertical: 8,
  },
  ratingLabel: {
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  criteriaList: {
    gap: 16,
  },
  criterionItem: {
    gap: 8,
  },
  criterionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criterionDescription: {
    marginBottom: 4,
  },
  criterionStars: {
    alignSelf: 'flex-start',
  },
  reviewInput: {
    minHeight: 120,
  },
  charCounter: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  photoSubtitle: {
    marginBottom: 12,
  },
  photosScroll: {
    flexDirection: 'row',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginRight: 12,
  },
  addPhotoText: {
    marginTop: 4,
    textAlign: 'center',
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tipsCard: {
    marginBottom: 16,
  },
  tipsTitle: {
    marginBottom: 12,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  privacyNotice: {
    paddingHorizontal: 8,
  },
  privacyText: {
    textAlign: 'center',
  },
});

export default RatingForm;