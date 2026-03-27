import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/auth-context';
import { useBookings } from '../../../hooks/use-bookings';
import { useNotifications } from '../../../hooks/use-notifications';
import { useTheme } from '../../../contexts/theme-context';
import {
  ThemedView,
  ThemedText,
} from '../../../components/themed-view';
import {
  Card,
  Button,
  Loading,
  Avatar,
  Rating,
  Input,
  ImageViewer,
  ConfirmationModal,
} from '../../../components/ui';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { validateReview } from '../../../utils/validators';
import { uploadImages } from '../../../utils/upload';

/**
 * Enterprise-level Booking Review Screen
 * Handles reviews for both service bookings and construction projects
 */
const BookingReviewScreen = () => {
  const { id: bookingId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, colors } = useTheme();
  
  const {
    getBookingById,
    submitReview,
    loading: bookingsLoading,
  } = useBookings();

  const { scheduleNotification } = useNotifications();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [anonymous, setAnonymous] = useState(false);

  // Modal states
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Review tags based on booking type
  const reviewTags = {
    service: [
      'Professionalism', 'Punctuality', 'Quality', 'Communication', 
      'Cleanliness', 'Expertise', 'Value for Money', 'Would Recommend'
    ],
    construction: [
      'Teamwork', 'Timeline', 'Quality Work', 'Communication',
      'Clean Site', 'Expertise', 'Budget Management', 'Safety Standards'
    ]
  };

  /**
   * Fetch booking details and check review eligibility
   */
  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const bookingData = await getBookingById(bookingId);
      
      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Check if booking can be reviewed
      if (!canReviewBooking(bookingData, user)) {
        Alert.alert(
          'Cannot Review',
          getReviewEligibilityMessage(bookingData, user),
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Check if already reviewed
      if (hasAlreadyReviewed(bookingData, user)) {
        Alert.alert(
          'Already Reviewed',
          'You have already submitted a review for this booking.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      setBooking(bookingData);

    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [bookingId, user, getBookingById, router]);

  /**
   * Handle image selection for review
   */
  const handleAddPhotos = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to add review images.');
        return;
      }

      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - reviewPhotos.length, // Max 5 photos
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          fileName: asset.fileName || `review_${Date.now()}.jpg`,
          type: 'image/jpeg',
        }));

        setReviewPhotos(prev => [...prev, ...newPhotos].slice(0, 5)); // Enforce limit
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  /**
   * Remove photo from review
   */
  const handleRemovePhoto = (index) => {
    setReviewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Handle tag selection
   */
  const handleTagSelect = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag].slice(0, 5) // Limit to 5 tags
    );
  };

  /**
   * Validate review form
   */
  const validateForm = () => {
    const errors = validateReview({
      rating,
      reviewText,
      reviewPhotos,
      bookingType: booking?.type
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Upload review photos
   */
  const uploadReviewPhotos = async () => {
    if (reviewPhotos.length === 0) return [];

    try {
      const uploadPromises = reviewPhotos.map(photo => 
        uploadImages(photo.uri, 'reviews')
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      return uploadResults.map(result => result.url);
    } catch (error) {
      console.error('Error uploading review photos:', error);
      throw new Error('Failed to upload review photos');
    }
  };

  /**
   * Handle review submission
   */
  const handleSubmitReview = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please provide a rating and review text before submitting.');
      return;
    }

    setShowConfirmModal(true);
  };

  /**
   * Confirm and process review submission
   */
  const confirmSubmitReview = async () => {
    try {
      setSubmitting(true);

      // Upload photos first
      const photoUrls = await uploadReviewPhotos();

      const reviewData = {
        rating,
        review: reviewText,
        photos: photoUrls,
        tags: selectedTags,
        anonymous,
        bookingId: booking.id,
        reviewerId: user.id,
        revieweeId: getRevieweeId(booking, user),
        type: booking.type,
        serviceId: booking.service?.id,
        projectId: booking.constructionProject?.id,
        metadata: {
          bookingAmount: booking.totalAmount,
          bookingDate: booking.scheduledDate,
          serviceCategory: booking.service?.category,
          projectType: booking.constructionProject?.type
        }
      };

      await submitReview(reviewData);

      // Notify the service provider/worker
      await scheduleNotification({
        userId: getRevieweeId(booking, user),
        title: 'New Review Received',
        message: `You received a ${rating}-star rating for your ${booking.type === 'construction' ? 'project work' : 'service'}`,
        type: 'new_review',
        data: { 
          bookingId, 
          rating,
          reviewId: reviewData.id,
          isAnonymous: anonymous
        }
      });

      // Show success and navigate
      Alert.alert(
        'Review Submitted', 
        'Thank you for your feedback! Your review helps maintain quality standards in our community.',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace({
              pathname: '/bookings/[id]',
              params: { id: bookingId }
            })
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  /**
   * Get appropriate tags based on booking type
   */
  const getTags = () => {
    return booking?.type === 'construction' 
      ? reviewTags.construction 
      : reviewTags.service;
  };

  /**
   * Get character count for review text
   */
  const getCharacterCount = () => {
    return reviewText.length;
  };

  // Load booking details on mount
  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  if (loading || !booking) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading size="large" message="Loading booking details..." />
      </ThemedView>
    );
  }

  const isConstruction = booking.type === 'construction';
  const serviceProvider = booking.serviceProvider || booking.assignedWorkers?.[0];
  const tags = getTags();

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={{ marginBottom: 24 }}>
          <ThemedText type="title" style={{ marginBottom: 8 }}>
            Leave a Review
          </ThemedText>
          <ThemedText type="body" style={{ color: colors.textSecondary }}>
            Share your experience to help others in the community
          </ThemedText>
        </View>

        {/* Booking Summary Card */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Avatar 
              source={serviceProvider?.avatar} 
              size={50}
              badge={serviceProvider?.premium ? 'premium' : null}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText type="subtitle">
                {booking.service?.name || booking.constructionProject?.name}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                with {serviceProvider?.name}
              </ThemedText>
            </View>
          </View>

          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border
          }}>
            <View>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Service Date
              </ThemedText>
              <ThemedText>
                {formatDate(booking.scheduledDate, 'full')}
              </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Amount
              </ThemedText>
              <ThemedText type="subtitle">
                {formatCurrency(booking.totalAmount, booking.currency)}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Rating Section */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 16, textAlign: 'center' }}>
            How would you rate your experience?
          </ThemedText>
          
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Rating
              rating={rating}
              onRatingChange={setRating}
              size={40}
              showLabel={true}
              labelStyle={{ marginTop: 8 }}
            />
          </View>

          {validationErrors.rating && (
            <ThemedText type="caption" style={{ color: colors.error, textAlign: 'center' }}>
              {validationErrors.rating}
            </ThemedText>
          )}
        </Card>

        {/* Review Text Section */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Share Your Experience
          </ThemedText>
          
          <Input
            multiline
            numberOfLines={6}
            placeholder={
              isConstruction 
                ? 'Tell us about your construction project experience... How was the team coordination, work quality, timeline adherence?'
                : 'Tell us about your service experience... What did you like? What could be improved?'
            }
            value={reviewText}
            onChangeText={setReviewText}
            style={{ textAlignVertical: 'top' }}
            error={validationErrors.reviewText}
            maxLength={1000}
          />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              {getCharacterCount()}/1000 characters
            </ThemedText>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              {Math.floor(getCharacterCount() / 10)}/100 words
            </ThemedText>
          </View>
        </Card>

        {/* Review Tags Section */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            What stood out? (Select up to 5)
          </ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleTagSelect(tag)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedTags.includes(tag) ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedTags.includes(tag) ? colors.primary : colors.border,
                }}
              >
                <ThemedText 
                  style={{ 
                    color: selectedTags.includes(tag) ? colors.white : colors.text,
                    fontSize: 14,
                  }}
                >
                  {tag}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Review Photos Section */}
        <Card style={{ marginBottom: 16 }}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Add Photos ({reviewPhotos.length}/5)
          </ThemedText>
          
          <ThemedText type="caption" style={{ color: colors.textSecondary, marginBottom: 12 }}>
            Visuals help others see the quality of work
          </ThemedText>

          {/* Photo Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {/* Add Photo Button */}
            {reviewPhotos.length < 5 && (
              <TouchableOpacity
                onPress={handleAddPhotos}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                }}
              >
                <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>+</ThemedText>
                <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                  Add Photo
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Selected Photos */}
            {reviewPhotos.map((photo, index) => (
              <View key={index} style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImageIndex(index);
                    setShowImagePicker(true);
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => handleRemovePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: colors.error,
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ThemedText style={{ color: colors.white, fontSize: 14 }}>×</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {validationErrors.reviewPhotos && (
            <ThemedText type="caption" style={{ color: colors.error, marginTop: 8 }}>
              {validationErrors.reviewPhotos}
            </ThemedText>
          )}
        </Card>

        {/* Anonymous Review Option */}
        <Card style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
                Post Anonymously
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                Your name and photo will be hidden from the public
              </ThemedText>
            </View>
            
            <TouchableOpacity
              onPress={() => setAnonymous(!anonymous)}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                backgroundColor: anonymous ? colors.primary : colors.border,
                justifyContent: 'center',
                padding: 2,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.white,
                  transform: [{ translateX: anonymous ? 24 : 0 }],
                }}
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Review Guidelines */}
        <Card variant="outline">
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            📝 Review Guidelines
          </ThemedText>
          <ThemedText type="caption" style={{ color: colors.textSecondary, lineHeight: 20 }}>
            • Be honest and specific about your experience{'\n'}
            • Focus on the service quality and professionalism{'\n'}
            • Avoid personal attacks or offensive language{'\n'}
            • Photos should be relevant to the service provided{'\n'}
            • Reviews help maintain community standards
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ 
        padding: 16, 
        borderTopWidth: 1, 
        borderTopColor: colors.border,
        gap: 12
      }}>
        <Button
          variant="primary"
          onPress={handleSubmitReview}
          loading={submitting}
          disabled={submitting}
        >
          Submit Review
        </Button>
        
        <Button
          variant="ghost"
          onPress={() => router.back()}
          disabled={submitting}
        >
          Maybe Later
        </Button>
      </View>

      {/* Image Viewer Modal */}
      <ImageViewer
        visible={showImagePicker}
        images={reviewPhotos.map(photo => ({ url: photo.uri }))}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImagePicker(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Submit Review"
        message={
          anonymous 
            ? "Are you sure you want to submit your review anonymously? This cannot be changed later."
            : "Are you ready to submit your review? This will be visible to the service provider and other users."
        }
        onConfirm={confirmSubmitReview}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Submit Review"
        cancelText="Edit Review"
        loading={submitting}
      />
    </ThemedView>
  );
};

/**
 * Utility Functions
 */

const canReviewBooking = (booking, user) => {
  // Only completed bookings can be reviewed
  if (booking.status !== 'completed') {
    return false;
  }

  // Only clients can review service providers, and vice versa
  const isClient = user.role === 'client';
  const isServiceProvider = ['service_provider', 'construction_worker'].includes(user.role);
  
  if (isClient && !booking.serviceProvider && !booking.assignedWorkers) {
    return false;
  }

  if (isServiceProvider && !booking.clientId) {
    return false;
  }

  // Can only review within 30 days of completion
  const completionDate = new Date(booking.completedAt || booking.updatedAt);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return completionDate > thirtyDaysAgo;
};

const getReviewEligibilityMessage = (booking, user) => {
  if (booking.status !== 'completed') {
    return 'You can only review completed bookings.';
  }

  const completionDate = new Date(booking.completedAt || booking.updatedAt);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  if (completionDate <= thirtyDaysAgo) {
    return 'The review period for this booking has expired (30 days).';
  }

  return 'You are not eligible to review this booking.';
};

const hasAlreadyReviewed = (booking, user) => {
  if (user.role === 'client') {
    return booking.clientReview !== null;
  } else {
    return booking.providerReview !== null;
  }
};

const getRevieweeId = (booking, user) => {
  if (user.role === 'client') {
    return booking.serviceProvider?.id || booking.assignedWorkers?.[0]?.id;
  } else {
    return booking.clientId;
  }
};

export default BookingReviewScreen;