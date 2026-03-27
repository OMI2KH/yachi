// components/ui/rating-modal.js
// ============================================================
// YACHI ENTERPRISE RATING MODAL COMPONENT
// ============================================================

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  I18nManager,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from './language-selector';
import { useNotification } from '../../contexts/notification-context';

// Components
import Loading from './loading';
import Button from './button';

// Services
import { ratingService } from '../../services/rating-service';
import { analyticsService } from '../../services/analytics-service';
import { uploadService } from '../../services/upload-service';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class YachiRatingService {
  constructor() {
    this.ratingTypes = this.getRatingTypes();
    this.ratingCategories = this.getRatingCategories();
    this.maxRating = 5;
    this.maxPhotos = 3;
    this.maxCommentLength = 500;
  }

  getRatingTypes() {
    return {
      SERVICE: 'service',
      WORKER: 'worker',
      CONSTRUCTION_PROJECT: 'construction_project',
      GOVERNMENT_PROJECT: 'government_project',
      AI_MATCHING: 'ai_matching',
    };
  }

  getRatingCategories() {
    return {
      [this.ratingTypes.SERVICE]: [
        { id: 'quality', label: 'Service Quality', emoji: '⭐' },
        { id: 'professionalism', label: 'Professionalism', emoji: '👔' },
        { id: 'punctuality', label: 'Punctuality', emoji: '⏰' },
        { id: 'communication', label: 'Communication', emoji: '💬' },
        { id: 'value', label: 'Value for Money', emoji: '💰' },
      ],
      [this.ratingTypes.WORKER]: [
        { id: 'skill', label: 'Skill Level', emoji: '🔧' },
        { id: 'attitude', label: 'Attitude', emoji: '😊' },
        { id: 'reliability', label: 'Reliability', emoji: '✅' },
        { id: 'efficiency', label: 'Efficiency', emoji: '⚡' },
        { id: 'cleanliness', label: 'Cleanliness', emoji: '🧹' },
      ],
      [this.ratingTypes.CONSTRUCTION_PROJECT]: [
        { id: 'quality', label: 'Work Quality', emoji: '🏗️' },
        { id: 'timeline', label: 'Timeline Adherence', emoji: '📅' },
        { id: 'budget', label: 'Budget Management', emoji: '💳' },
        { id: 'communication', label: 'Team Communication', emoji: '👥' },
        { id: 'safety', label: 'Safety Standards', emoji: '🛡️' },
      ],
      [this.ratingTypes.GOVERNMENT_PROJECT]: [
        { id: 'impact', label: 'Community Impact', emoji: '🌍' },
        { id: 'quality', label: 'Infrastructure Quality', emoji: '🏛️' },
        { id: 'timeline', label: 'Project Timeline', emoji: '⏱️' },
        { id: 'transparency', label: 'Transparency', emoji: '🔍' },
        { id: 'maintenance', label: 'Maintenance', emoji: '🔧' },
      ],
      [this.ratingTypes.AI_MATCHING]: [
        { id: 'accuracy', label: 'Match Accuracy', emoji: '🎯' },
        { id: 'speed', label: 'Matching Speed', emoji: '⚡' },
        { id: 'quality', label: 'Worker Quality', emoji: '👷' },
        { id: 'communication', label: 'AI Communication', emoji: '🤖' },
        { id: 'satisfaction', label: 'Overall Satisfaction', emoji: '😊' },
      ],
    };
  }

  getDefaultMessages() {
    return {
      en: {
        title: 'Rate Your Experience',
        subtitle: 'Share your feedback to help us improve',
        overall: 'Overall Rating',
        comment: 'Add detailed feedback (optional)',
        commentPlaceholder: 'Tell us about your experience...',
        addPhotos: 'Add Photos',
        submit: 'Submit Review',
        submitting: 'Submitting...',
        success: 'Thank you for your feedback!',
        error: 'Failed to submit review. Please try again.',
        required: 'Please provide an overall rating',
        maxPhotos: `Maximum ${this.maxPhotos} photos allowed`,
        maxComment: `Maximum ${this.maxCommentLength} characters`,
        categories: {
          service: 'Service Rating',
          worker: 'Worker Rating',
          construction: 'Project Rating',
          government: 'Government Project Rating',
          ai: 'AI Matching Rating',
        },
      },
      am: {
        title: 'ልምድዎን ደረጅ',
        subtitle: 'ለማሻሻል እርዳታ እንድንችል አስተያየትዎን አጋርተን',
        overall: 'አጠቃላይ ደረጃ',
        comment: 'ዝርዝር አስተያየት ያስገቡ (አማራጭ)',
        commentPlaceholder: 'ስለ ልምድዎ ይንገሩን...',
        addPhotos: 'ፎቶዎች ያክሉ',
        submit: 'አስተያየት አስገባ',
        submitting: 'በማስገባት ላይ...',
        success: 'አስተያየትዎ ስላሳደረ እናመሰግናለን!',
        error: 'አስተያየት ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
        required: 'እባክዎ አጠቃላይ ደረጃ ይስጡ',
        maxPhotos: `ከፍተኛ ${this.maxPhotos} ፎቶዎች ብቻ`,
        maxComment: `ከፍተኛ ${this.maxCommentLength} ፊደሎች`,
        categories: {
          service: 'የአገልግሎት ደረጃ',
          worker: 'የሰራተኛ ደረጃ',
          construction: 'የፕሮጀክት ደረጃ',
          government: 'የመንግስት ፕሮጀክት ደረጃ',
          ai: 'የAI ማጣመር ደረጃ',
        },
      },
      om: {
        title: 'Odeeffannoo Keessan Madaa',
        subtitle: 'Nu gargaarufi akka nuu fooyya\'uu odeeffannoo kenni',
        overall: 'Madaa Waliigalaa',
        comment: 'Odeeffannoo dheeraa dabalachuu (Filannoo)',
        commentPlaceholder: 'Odeeffannoo keessan nuu himaa...',
        addPhotos: 'Faayilliwwan Suuraa Dabalachiisi',
        submit: 'Yaada Gabaasa',
        submitting: 'Galmaa\'uu...',
        success: 'Odeeffannoo keessanif galatoomaa!',
        error: 'Yaada galmaa\'uu hin dandeenye. Irra deebi\'ii yaali.',
        required: 'Madaa waliigalaa kenni',
        maxPhotos: `Faayila Suuraa ${this.maxPhotos} qofatu hayyama`,
        maxComment: `Qubee ${this.maxCommentLength} qofatu hayyama`,
        categories: {
          service: 'Madaa Tajaajilaa',
          worker: 'Madaa Hojjettootaa',
          construction: 'Madaa Pirojeektii',
          government: 'Madaa Pirojeektii Mootummaa',
          ai: 'Madaa Walqabsiisaa AI',
        },
      },
    };
  }

  calculateAverageRating(ratings) {
    if (!ratings || Object.keys(ratings).length === 0) return 0;
    
    const values = Object.values(ratings).filter(value => value > 0);
    if (values.length === 0) return 0;
    
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  validateRating(rating) {
    return rating >= 1 && rating <= this.maxRating;
  }

  validateComment(comment) {
    return comment.length <= this.maxCommentLength;
  }

  validatePhotos(photos) {
    return photos.length <= this.maxPhotos;
  }

  getRatingEmoji(rating) {
    const emojis = ['😠', '😕', '😐', '😊', '😍'];
    return emojis[Math.floor(rating) - 1] || '😐';
  }

  getCategoryLabel(category, language = 'en') {
    const messages = this.getDefaultMessages();
    return messages[language]?.categories?.[category] || category;
  }
}

// Singleton instance
export const yachiRatingService = new YachiRatingService();

/**
 * Enterprise Rating Modal with Advanced Features
 * Supports multiple rating types, categories, photos, and detailed feedback
 */
export default function RatingModal({
  // Core Props
  visible = false,
  onClose = () => {},
  onSubmit = () => {},
  onSuccess = () => {},
  
  // Rating Target
  targetId,
  targetType = yachiRatingService.ratingTypes.SERVICE,
  targetName,
  targetImage,
  
  // Initial Data
  initialRating = 0,
  initialComment = '',
  initialPhotos = [],
  isEdit = false,
  
  // Configuration
  required = true,
  allowPhotos = true,
  allowComment = true,
  showCategories = true,
  autoCloseOnSuccess = true,
  
  // Styling
  customStyle,
  overlayColor,
  
  // Technical
  testID = 'yachi-rating-modal',
  accessibilityLabel = 'Rating modal',
  preventCloseOnSubmit = false,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  const { showNotification } = useNotification();
  
  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const scrollViewRef = useRef(null);
  
  // State
  const [overallRating, setOverallRating] = useState(initialRating);
  const [categoryRatings, setCategoryRatings] = useState({});
  const [comment, setComment] = useState(initialComment);
  const [photos, setPhotos] = useState(initialPhotos);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState({});

  // Memoized values
  const messages = useMemo(() => 
    yachiRatingService.getDefaultMessages()[currentLanguage.code] || 
    yachiRatingService.getDefaultMessages().en,
    [currentLanguage]
  );

  const ratingCategories = useMemo(() => 
    yachiRatingService.ratingCategories[targetType] || 
    yachiRatingService.ratingCategories[yachiRatingService.ratingTypes.SERVICE],
    [targetType]
  );

  const averageRating = useMemo(() => 
    yachiRatingService.calculateAverageRating({
      ...categoryRatings,
      overall: overallRating
    }),
    [categoryRatings, overallRating]
  );

  const canSubmit = useMemo(() => {
    if (required && overallRating === 0) return false;
    if (!yachiRatingService.validateComment(comment)) return false;
    if (!yachiRatingService.validatePhotos(photos)) return false;
    return true;
  }, [required, overallRating, comment, photos]);

  const characterCount = useMemo(() => 
    yachiRatingService.maxCommentLength - comment.length,
    [comment]
  );

  // Effects
  useEffect(() => {
    if (visible) {
      animateEntrance();
      resetForm();
    } else {
      animateExit();
    }
  }, [visible]);

  useEffect(() => {
    if (overallRating > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [overallRating]);

  // Animation
  const animateEntrance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateExit = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Form handling
  const resetForm = useCallback(() => {
    setOverallRating(initialRating);
    setCategoryRatings({});
    setComment(initialComment);
    setPhotos(initialPhotos);
    setErrors({});
  }, [initialRating, initialComment, initialPhotos]);

  const handleOverallRating = useCallback((rating) => {
    setOverallRating(rating);
    setErrors(prev => ({ ...prev, overall: null }));
  }, []);

  const handleCategoryRating = useCallback((categoryId, rating) => {
    setCategoryRatings(prev => ({
      ...prev,
      [categoryId]: rating
    }));
  }, []);

  const handleCommentChange = useCallback((text) => {
    if (yachiRatingService.validateComment(text)) {
      setComment(text);
      setErrors(prev => ({ ...prev, comment: null }));
    }
  }, []);

  const handleAddPhoto = useCallback(async () => {
    if (photos.length >= yachiRatingService.maxPhotos) {
      showNotification({
        type: 'warning',
        title: 'Photo Limit',
        message: messages.maxPhotos,
        duration: 3000,
      });
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showNotification({
          type: 'error',
          title: 'Permission Required',
          message: 'Please allow access to your photos',
          duration: 5000,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        const uploadedUrl = await uploadService.uploadImage(result.assets[0].uri);
        setPhotos(prev => [...prev, uploadedUrl]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload photo. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  }, [photos.length, messages, showNotification]);

  const handleRemovePhoto = useCallback((index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (required && overallRating === 0) {
      newErrors.overall = messages.required;
    }

    if (!yachiRatingService.validateComment(comment)) {
      newErrors.comment = messages.maxComment;
    }

    if (!yachiRatingService.validatePhotos(photos)) {
      newErrors.photos = messages.maxPhotos;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [required, overallRating, comment, photos, messages]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);

    try {
      const ratingData = {
        targetId,
        targetType,
        overallRating,
        categoryRatings,
        comment: comment.trim(),
        photos,
        averageRating,
        timestamp: Date.now(),
        isEdit,
      };

      // Submit rating
      const result = await ratingService.submitRating(ratingData);

      // Track analytics
      analyticsService.trackEvent('rating_submitted', {
        targetType,
        overallRating: overallRating,
        averageRating,
        hasComment: !!comment.trim(),
        hasPhotos: photos.length > 0,
        isEdit,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success
      showNotification({
        type: 'success',
        title: 'Success',
        message: messages.success,
        duration: 3000,
      });

      // Callbacks
      onSubmit(ratingData);
      onSuccess(result);

      // Close modal
      if (autoCloseOnSuccess && !preventCloseOnSubmit) {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showNotification({
        type: 'error',
        title: 'Submission Failed',
        message: messages.error,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm, targetId, targetType, overallRating, categoryRatings,
    comment, photos, averageRating, isEdit, onSubmit, onSuccess, onClose,
    autoCloseOnSuccess, preventCloseOnSubmit, messages, showNotification
  ]);

  const renderStars = useCallback((rating, onRatingChange, size = 'medium') => {
    const starSize = size === 'large' ? 32 : size === 'small' ? 20 : 24;
    
    return (
      <View style={styles.starsContainer}>
        {[...Array(yachiRatingService.maxRating)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= rating;
          
          return (
            <TouchableOpacity
              key={starValue}
              onPress={() => onRatingChange(starValue)}
              style={styles.starButton}
              accessibilityLabel={`Rate ${starValue} out of ${yachiRatingService.maxRating}`}
              accessibilityRole="button"
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={starSize}
                color={isFilled ? YachiColors.warning[500] : colors.mutedForeground}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [colors]);

  const renderOverallRating = () => (
    <View style={styles.overallSection}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {messages.overall}
      </Text>
      <View style={styles.overallContent}>
        {renderStars(overallRating, handleOverallRating, 'large')}
        {overallRating > 0 && (
          <Text style={[styles.ratingEmoji, { color: colors.mutedForeground }]}>
            {yachiRatingService.getRatingEmoji(overallRating)}
          </Text>
        )}
      </View>
      {errors.overall && (
        <Text style={styles.errorText}>{errors.overall}</Text>
      )}
    </View>
  );

  const renderCategoryRatings = () => {
    if (!showCategories) return null;

    return (
      <View style={styles.categoriesSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {messages.categories[targetType] || 'Detailed Rating'}
        </Text>
        {ratingCategories.map((category) => (
          <View key={category.id} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
                {category.label}
              </Text>
            </View>
            {renderStars(
              categoryRatings[category.id] || 0,
              (rating) => handleCategoryRating(category.id, rating),
              'small'
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCommentSection = () => {
    if (!allowComment) return null;

    return (
      <View style={styles.commentSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {messages.comment}
        </Text>
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: errors.comment ? colors.error : colors.border,
            },
          ]}
          placeholder={messages.commentPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={comment}
          onChangeText={handleCommentChange}
          multiline
          maxLength={yachiRatingService.maxCommentLength}
          textAlignVertical="top"
        />
        <View style={styles.commentFooter}>
          {errors.comment && (
            <Text style={styles.errorText}>{errors.comment}</Text>
          )}
          <Text style={[styles.characterCount, { 
            color: characterCount < 50 ? colors.error : colors.mutedForeground 
          }]}>
            {characterCount}
          </Text>
        </View>
      </View>
    );
  };

  const renderPhotoSection = () => {
    if (!allowPhotos) return null;

    return (
      <View style={styles.photoSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {messages.addPhotos}
        </Text>
        <View style={styles.photosContainer}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image
                source={{ uri: photo }}
                style={styles.photo}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          
          {photos.length < yachiRatingService.maxPhotos && (
            <TouchableOpacity
              style={[styles.addPhotoButton, { 
                backgroundColor: colors.background,
                borderColor: colors.border 
              }]}
              onPress={handleAddPhoto}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loading size="small" />
              ) : (
                <>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                  <Text style={[styles.addPhotoText, { color: colors.primary }]}>
                    Add
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        {errors.photos && (
          <Text style={styles.errorText}>{errors.photos}</Text>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {messages.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {messages.subtitle}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        disabled={isSubmitting}
        accessibilityLabel="Close rating modal"
      >
        <Ionicons name="close" size={24} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <Button
        title={isSubmitting ? messages.submitting : messages.submit}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        loading={isSubmitting}
        variant="primary"
        size="large"
        fullWidth
      />
    </View>
  );

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          disabled={isSubmitting}
        />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }, customStyle]}>
          {renderHeader()}
          
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderOverallRating()}
            {renderCategoryRatings()}
            {renderCommentSection()}
            {renderPhotoSection()}
          </ScrollView>
          
          {renderFooter()}
        </View>
      </Animated.View>
    </View>
  );
}

// Pre-configured rating modal variants
export function ServiceRatingModal({ service, ...props }) {
  return (
    <RatingModal
      targetType={yachiRatingService.ratingTypes.SERVICE}
      targetId={service?.id}
      targetName={service?.name}
      targetImage={service?.image}
      showCategories={true}
      allowPhotos={true}
      {...props}
    />
  );
}

export function WorkerRatingModal({ worker, ...props }) {
  return (
    <RatingModal
      targetType={yachiRatingService.ratingTypes.WORKER}
      targetId={worker?.id}
      targetName={worker?.name}
      targetImage={worker?.avatar}
      showCategories={true}
      allowPhotos={true}
      {...props}
    />
  );
}

export function ConstructionRatingModal({ project, ...props }) {
  return (
    <RatingModal
      targetType={yachiRatingService.ratingTypes.CONSTRUCTION_PROJECT}
      targetId={project?.id}
      targetName={project?.name}
      showCategories={true}
      allowPhotos={true}
      allowComment={true}
      {...props}
    />
  );
}

export function AIRatingModal({ matching, ...props }) {
  return (
    <RatingModal
      targetType={yachiRatingService.ratingTypes.AI_MATCHING}
      targetId={matching?.id}
      targetName="AI Worker Matching"
      showCategories={true}
      allowPhotos={false}
      allowComment={true}
      {...props}
    />
  );
}

// Hook for rating modal management
export const useRatingModal = (initialVisible = false) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [ratingData, setRatingData] = useState(null);

  const show = useCallback((data = null) => {
    setRatingData(data);
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setRatingData(null);
  }, []);

  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  return {
    isVisible,
    show,
    hide,
    toggle,
    ratingData,
    modalProps: {
      visible: isVisible,
      onClose: hide,
      ...ratingData,
    },
  };
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  overallSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 12,
  },
  overallContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 4,
  },
  ratingEmoji: {
    fontSize: 24,
    marginLeft: 12,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  photoSection: {
    marginBottom: 24,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    padding: 2,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: YachiColors.error[500],
    marginTop: 4,
  },
});

export { yachiRatingService };