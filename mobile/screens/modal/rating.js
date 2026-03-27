import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, ThemedView, Button } from '../../components/ui';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;
const MAX_RATING = 5;

export default function RatingModal({
  visible = false,
  onClose,
  onSubmit,
  type = 'service',
  targetId = null,
  targetName = '',
  prefillRating = 0,
  prefillComment = '',
  editable = true,
  showSkip = false,
  mandatory = false,
}) {
  const { theme, colors } = useTheme();
  const { user } = useAuth();
  
  const [rating, setRating] = useState(prefillRating);
  const [comment, setComment] = useState(prefillComment);
  const [selectedAspects, setSelectedAspects] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(50)).current;

  const ratingTypes = {
    service: {
      title: 'Rate Service',
      aspects: [
        { id: 'quality', label: 'Quality of Work', emoji: '🔧' },
        { id: 'professionalism', label: 'Professionalism', emoji: '💼' },
        { id: 'punctuality', label: 'Punctuality', emoji: '⏰' },
        { id: 'communication', label: 'Communication', emoji: '💬' },
        { id: 'value', label: 'Value for Money', emoji: '💰' },
      ],
      placeholder: 'Tell us about your experience with this service...',
    },
    construction: {
      title: 'Rate Construction Project',
      aspects: [
        { id: 'workmanship', label: 'Workmanship', emoji: '🏗️' },
        { id: 'timeline', label: 'Timeline Adherence', emoji: '📅' },
        { id: 'materials', label: 'Material Quality', emoji: '🧱' },
        { id: 'safety', label: 'Safety Standards', emoji: '🛡️' },
        { id: 'cleanup', label: 'Site Cleanup', emoji: '🧹' },
      ],
      placeholder: 'Share your experience with this construction project...',
    },
    government: {
      title: 'Rate Government Project',
      aspects: [
        { id: 'efficiency', label: 'Project Efficiency', emoji: '⚡' },
        { id: 'quality', label: 'Infrastructure Quality', emoji: '🏛️' },
        { id: 'impact', label: 'Community Impact', emoji: '👥' },
        { id: 'transparency', label: 'Transparency', emoji: '🔍' },
        { id: 'sustainability', label: 'Sustainability', emoji: '🌱' },
      ],
      placeholder: 'Provide feedback on this government infrastructure project...',
    },
    worker: {
      title: 'Rate Worker',
      aspects: [
        { id: 'skill', label: 'Technical Skills', emoji: '🔧' },
        { id: 'attitude', label: 'Work Attitude', emoji: '😊' },
        { id: 'reliability', label: 'Reliability', emoji: '✅' },
        { id: 'teamwork', label: 'Teamwork', emoji: '🤝' },
        { id: 'safety', label: 'Safety Awareness', emoji: '🛡️' },
      ],
      placeholder: 'Share your feedback about this worker...',
    },
  };

  const currentType = ratingTypes[type] || ratingTypes.service;

  React.useEffect(() => {
    if (visible) {
      setRating(prefillRating);
      setComment(prefillComment);
      setSelectedAspects({});
      setCurrentStep(0);
      
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 50,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleStarPress = (starIndex) => {
    if (!editable) return;
    setRating(starIndex + 1);
  };

  const handleAspectRating = (aspectId, aspectRating) => {
    if (!editable) return;
    setSelectedAspects(prev => ({
      ...prev,
      [aspectId]: aspectRating,
    }));
  };

  const handleSubmit = async () => {
    if (mandatory && rating === 0) {
      alert('Please provide a rating before submitting');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const ratingData = {
        rating,
        comment: comment.trim(),
        aspects: selectedAspects,
        type,
        targetId,
        targetName,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      };

      await onSubmit?.(ratingData);
      
      // Reset form
      setRating(0);
      setComment('');
      setSelectedAspects({});
      setCurrentStep(0);
      
      onClose?.();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    if (mandatory && rating === 0) {
      alert('Rating is mandatory for this service');
      return;
    }
    
    onClose?.();
  };

  const handleSkip = () => {
    setRating(0);
    setComment('');
    setSelectedAspects({});
    onClose?.();
  };

  const nextStep = () => {
    if (currentStep < 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStars = (size = 'large') => {
    const starSize = size === 'large' ? 40 : 24;
    
    return (
      <View style={styles.starsContainer}>
        {[...Array(MAX_RATING)].map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleStarPress(index)}
            disabled={!editable}
            style={styles.starButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={index < rating ? 'star' : 'star-outline'}
              size={starSize}
              color={index < rating ? colors.warning : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepTitle}>Overall Rating</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        How would you rate your experience with {targetName}?
      </ThemedText>

      {renderStars('large')}

      <View style={styles.ratingLabels}>
        <ThemedText style={styles.ratingLabel}>Poor</ThemedText>
        <ThemedText style={styles.ratingLabel}>Excellent</ThemedText>
      </View>

      {rating > 0 && (
        <View style={styles.ratingFeedback}>
          <ThemedText style={styles.ratingText}>
            {rating === 1 && 'Poor - Very dissatisfied'}
            {rating === 2 && 'Fair - Some issues encountered'}
            {rating === 3 && 'Good - Met expectations'}
            {rating === 4 && 'Very Good - Exceeded expectations'}
            {rating === 5 && 'Excellent - Outstanding service'}
          </ThemedText>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepTitle}>Detailed Feedback</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Rate specific aspects of your experience (optional)
      </ThemedText>

      <ScrollView 
        style={styles.aspectsContainer}
        showsVerticalScrollIndicator={false}
      >
        {currentType.aspects.map((aspect) => (
          <View key={aspect.id} style={styles.aspectItem}>
            <View style={styles.aspectHeader}>
              <Text style={styles.aspectEmoji}>{aspect.emoji}</Text>
              <ThemedText style={styles.aspectLabel}>
                {aspect.label}
              </ThemedText>
            </View>
            
            <View style={styles.aspectStars}>
              {[...Array(MAX_RATING)].map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleAspectRating(aspect.id, index + 1)}
                  disabled={!editable}
                  style={styles.aspectStarButton}
                >
                  <Ionicons
                    name={index < (selectedAspects[aspect.id] || 0) ? 'star' : 'star-outline'}
                    size={20}
                    color={index < (selectedAspects[aspect.id] || 0) ? colors.warning : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.commentSection}>
        <ThemedText style={styles.commentLabel}>
          Additional Comments
        </ThemedText>
        <View style={styles.commentInputContainer}>
          <ScrollView 
            style={styles.commentInput}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.commentText,
                { color: colors.text }
              ]}
            >
              {comment || currentType.placeholder}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.editCommentButton}
            onPress={() => {
              // This would open a proper text input modal in a real implementation
              alert('Comment input would open here');
            }}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            {
              backgroundColor: step === currentStep 
                ? colors.primary 
                : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );

  const renderActions = () => (
    <View style={styles.actions}>
      {showSkip && !mandatory && (
        <Button
          title="Skip"
          variant="outline"
          onPress={handleSkip}
          disabled={isSubmitting}
          style={styles.skipButton}
        />
      )}
      
      <View style={styles.navigationActions}>
        {currentStep > 0 && (
          <Button
            title="Back"
            variant="outline"
            onPress={prevStep}
            disabled={isSubmitting}
            style={styles.navButton}
          />
        )}
        
        {currentStep < 1 ? (
          <Button
            title="Next"
            onPress={nextStep}
            disabled={isSubmitting || (mandatory && rating === 0)}
            style={styles.navButton}
          />
        ) : (
          <Button
            title={isSubmitting ? "Submitting..." : "Submit Rating"}
            onPress={handleSubmit}
            disabled={isSubmitting || (mandatory && rating === 0)}
            style={styles.submitButton}
          />
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={20}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityValue,
              transform: [
                { scale: scaleValue },
                { translateY: slideValue },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
          
          <ThemedView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                disabled={isSubmitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              
              <ThemedText style={styles.title}>
                {currentType.title}
              </ThemedText>
              
              {targetName && (
                <ThemedText style={styles.targetName}>
                  {targetName}
                </ThemedText>
              )}
            </View>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Content */}
            <View style={styles.content}>
              {currentStep === 0 ? renderStep1() : renderStep2()}
            </View>

            {/* Actions */}
            {renderActions()}
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  targetName: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  ratingFeedback: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  aspectsContainer: {
    maxHeight: 200,
    marginBottom: 24,
  },
  aspectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  aspectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aspectEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  aspectLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  aspectStars: {
    flexDirection: 'row',
    gap: 4,
  },
  aspectStarButton: {
    padding: 2,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentInputContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    minHeight: 100,
  },
  commentInput: {
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  editCommentButton: {
    padding: 4,
    marginLeft: 8,
  },
  actions: {
    gap: 12,
  },
  navigationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  navButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

// Specialized rating modal components
export const ServiceRatingModal = (props) => (
  <RatingModal
    type="service"
    mandatory={true}
    showSkip={false}
    {...props}
  />
);

export const ConstructionRatingModal = (props) => (
  <RatingModal
    type="construction"
    mandatory={true}
    showSkip={false}
    {...props}
  />
);

export const GovernmentProjectRatingModal = (props) => (
  <RatingModal
    type="government"
    mandatory={false}
    showSkip={true}
    {...props}
  />
);

export const WorkerRatingModal = (props) => (
  <RatingModal
    type="worker"
    mandatory={true}
    showSkip={false}
    {...props}
  />
);

export const QuickRatingModal = (props) => (
  <RatingModal
    type="service"
    mandatory={false}
    showSkip={true}
    {...props}
  />
);