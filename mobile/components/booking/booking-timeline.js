// components/booking/booking-timeline.js
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

// Components
import { ThemedText } from '../ui/themed-text';
import ProgressBar from '../ui/progress-bar';

// Constants
import { 
  BOOKING_STATUS,
  BOOKING_TYPES 
} from '../../constants/booking';

// Utils
import { formatDate, formatTime, formatRelativeTime } from '../../utils/formatters';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Booking Timeline Component
 * Supports service bookings and construction projects
 * Ethiopian market focused with real-time progress tracking
 */

// Timeline step configurations
const TIMELINE_STEPS = {
  [BOOKING_STATUS.PENDING]: {
    label: 'Pending',
    description: 'Waiting for provider confirmation',
    icon: 'hourglass-empty',
    color: 'warning',
    order: 0,
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: 'Confirmed',
    description: 'Service provider has accepted your booking',
    icon: 'check-circle',
    color: 'success',
    order: 1,
  },
  [BOOKING_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    description: 'Service is currently being performed',
    icon: 'build',
    color: 'primary',
    order: 2,
  },
  [BOOKING_STATUS.COMPLETED]: {
    label: 'Completed',
    description: 'Service has been successfully completed',
    icon: 'flag',
    color: 'success',
    order: 3,
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: 'Cancelled',
    description: 'Booking was cancelled',
    icon: 'cancel',
    color: 'error',
    order: -1,
  },
  [BOOKING_STATUS.EXPIRED]: {
    label: 'Expired',
    description: 'Booking request expired',
    icon: 'schedule',
    color: 'textSecondary',
    order: -2,
  },
};

const BookingTimeline = ({
  // Data
  booking,
  currentStatus = booking?.status,
  
  // Configuration
  showDetails = true,
  interactive = true,
  compact = false,
  showProgress = true,
  
  // Callbacks
  onStatusPress,
  onExpand,
  
  // Styling
  style,
  testID = 'booking-timeline',
  
  // Accessibility
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(!compact);
  const [animation] = useState(new Animated.Value(expanded ? 1 : 0));

  // Memoized timeline calculation
  const { timelineSteps, currentStepIndex, progressPercentage } = useMemo(() => {
    return calculateTimelineProgress(booking, currentStatus);
  }, [booking, currentStatus]);

  // Animate expand/collapse
  const toggleExpanded = () => {
    if (compact) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    onExpand?.(!expanded);
  };

  // Handle status item press
  const handleStatusPress = (step) => {
    if (interactive && onStatusPress) {
      onStatusPress(step.status);
    }
  };

  // Render status icon based on status and completion
  const renderStatusIcon = (step) => {
    const { isCompleted, isCurrent, status } = step;
    const iconSize = compact ? 16 : 20;

    if (isCurrent && !isCompleted) {
      return (
        <View style={[styles.currentIconContainer, { backgroundColor: theme.colors[status.color] }]}>
          <Ionicons name="ellipsis-horizontal" size={compact ? 12 : 14} color="#FFFFFF" />
        </View>
      );
    }

    if (isCompleted) {
      return (
        <View style={[styles.completedIconContainer, { backgroundColor: theme.colors[status.color] }]}>
          <Ionicons name="checkmark" size={compact ? 12 : 14} color="#FFFFFF" />
        </View>
      );
    }

    return (
      <View style={[styles.pendingIconContainer, { borderColor: theme.colors.border }]}>
        <MaterialIcons 
          name={status.icon} 
          size={iconSize} 
          color={theme.colors.textTertiary} 
        />
      </View>
    );
  };

  // Render timeline step
  const renderTimelineStep = (step, index, isLast) => {
    const { isCompleted, isCurrent, isUpcoming, status, timestamp } = step;
    const isCancelled = currentStatus === BOOKING_STATUS.CANCELLED;

    return (
      <TouchableOpacity
        key={status}
        style={[
          styles.stepContainer,
          isCompleted && styles.completedStep,
          isCurrent && styles.currentStep,
          isUpcoming && styles.upcomingStep,
        ]}
        onPress={() => handleStatusPress(step)}
        disabled={!interactive || isUpcoming}
        activeOpacity={interactive ? 0.7 : 1}
        accessibilityLabel={`${TIMELINE_STEPS[status].label} status, ${TIMELINE_STEPS[status].description}`}
        accessibilityState={{
          selected: isCurrent,
          disabled: isUpcoming,
        }}
      >
        {/* Connection line */}
        {!isLast && (
          <View
            style={[
              styles.connectionLine,
              {
                backgroundColor: isCompleted ? theme.colors[status.color] : theme.colors.border,
                opacity: isCompleted ? 1 : 0.3,
              },
            ]}
          />
        )}

        {/* Status icon */}
        <View style={styles.iconContainer}>
          {renderStatusIcon(step)}
        </View>

        {/* Status details */}
        {expanded && (
          <Animated.View 
            style={[
              styles.detailsContainer,
              {
                opacity: animation,
                transform: [{
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                }],
              },
            ]}
          >
            <ThemedText 
              type="body" 
              weight={isCurrent ? 'semiBold' : 'regular'}
              color={isCompleted || isCurrent ? 'default' : 'secondary'}
            >
              {TIMELINE_STEPS[status].label}
            </ThemedText>
            
            <ThemedText type="caption" color="secondary" numberOfLines={2}>
              {TIMELINE_STEPS[status].description}
            </ThemedText>

            {/* Timestamp */}
            {timestamp && (
              <ThemedText type="caption" color="tertiary">
                {formatRelativeTime(timestamp)}
              </ThemedText>
            )}

            {/* Construction project specific info */}
            {isCurrent && booking?.projectType === BOOKING_TYPES.CONSTRUCTION && (
              <View style={styles.constructionInfo}>
                <MaterialIcons
                  name="construction"
                  size={12}
                  color={theme.colors.primary}
                />
                <ThemedText type="caption" color="primary">
                  AI Construction Project
                </ThemedText>
              </View>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  // Render progress section
  const renderProgress = () => {
    if (!showProgress || !expanded) return null;

    return (
      <View style={styles.progressSection}>
        <ProgressBar
          progress={progressPercentage}
          color={TIMELINE_STEPS[currentStatus]?.color || 'primary'}
          height={6}
        />
        <View style={styles.progressLabels}>
          <ThemedText type="caption" color="secondary">
            Progress
          </ThemedText>
          <ThemedText type="caption" color="secondary">
            {Math.round(progressPercentage)}%
          </ThemedText>
        </View>
      </View>
    );
  };

  // Render additional booking information
  const renderAdditionalInfo = () => {
    if (!expanded || !showDetails || !booking) return null;

    return (
      <Animated.View
        style={[
          styles.additionalInfo,
          {
            opacity: animation,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <ThemedText type="caption" color="secondary">
              Booking ID
            </ThemedText>
            <ThemedText type="caption" weight="semiBold">
              {booking.id.slice(-8)}
            </ThemedText>
          </View>
          
          <View style={styles.infoItem}>
            <ThemedText type="caption" color="secondary">
              Service
            </ThemedText>
            <ThemedText type="caption" weight="semiBold" numberOfLines={1}>
              {booking.service?.title || booking.projectTitle}
            </ThemedText>
          </View>

          {booking.scheduledDate && (
            <View style={styles.infoItem}>
              <ThemedText type="caption" color="secondary">
                Scheduled
              </ThemedText>
              <ThemedText type="caption" weight="semiBold">
                {formatDate(booking.scheduledDate)}
              </ThemedText>
            </View>
          )}

          {booking.provider && (
            <View style={styles.infoItem}>
              <ThemedText type="caption" color="secondary">
                Provider
              </ThemedText>
              <ThemedText type="caption" weight="semiBold">
                {booking.provider.name}
              </ThemedText>
            </View>
          )}

          {/* Construction project details */}
          {booking.projectType === BOOKING_TYPES.CONSTRUCTION && booking.constructionDetails && (
            <View style={styles.infoItem}>
              <ThemedText type="caption" color="secondary">
                Project Type
              </ThemedText>
              <ThemedText type="caption" weight="semiBold">
                {booking.constructionDetails.type}
              </ThemedText>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View 
      style={[
        styles.container,
        { backgroundColor: theme.colors.card },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Booking timeline for ${booking?.service?.title}`}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        disabled={compact}
        activeOpacity={compact ? 1 : 0.7}
      >
        <View style={styles.headerLeft}>
          <ThemedText type="title" weight="semiBold">
            Booking Progress
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.background }]}>
            <ThemedText 
              type="caption" 
              weight="semiBold"
              color={TIMELINE_STEPS[currentStatus]?.color || 'primary'}
            >
              {TIMELINE_STEPS[currentStatus]?.label || currentStatus}
            </ThemedText>
          </View>
        </View>

        {!compact && (
          <Animated.View
            style={{
              transform: [
                {
                  rotate: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Progress Bar */}
      {renderProgress()}

      {/* Timeline Steps */}
      <View style={styles.timelineContainer}>
        {timelineSteps.map((step, index) =>
          renderTimelineStep(step, index, index === timelineSteps.length - 1)
        )}
      </View>

      {/* Additional Information */}
      {renderAdditionalInfo()}
    </View>
  );
};

// Helper function to calculate timeline progress
const calculateTimelineProgress = (booking, currentStatus) => {
  // Handle cancelled or expired bookings
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED].includes(currentStatus)) {
    return {
      timelineSteps: [{
        status: currentStatus,
        isCompleted: false,
        isCurrent: true,
        isUpcoming: false,
        timestamp: booking?.updatedAt,
      }],
      currentStepIndex: 0,
      progressPercentage: 0,
    };
  }

  // Normal timeline progression
  const statusOrder = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED];
  
  const timelineSteps = statusOrder.map((status, index) => {
    const isCompleted = statusOrder.indexOf(status) < statusOrder.indexOf(currentStatus);
    const isCurrent = status === currentStatus;
    const isUpcoming = statusOrder.indexOf(status) > statusOrder.indexOf(currentStatus);

    // Get timestamp from booking history
    const timestamp = booking?.statusHistory?.[status];

    return {
      status,
      isCompleted,
      isCurrent,
      isUpcoming,
      timestamp,
    };
  }).filter(step => step.status !== currentStatus || step.isCurrent);

  const currentStepIndex = timelineSteps.findIndex(step => step.isCurrent);
  const progressPercentage = currentStepIndex >= 0 
    ? ((currentStepIndex + 1) / timelineSteps.length) * 100 
    : 0;

  return {
    timelineSteps,
    currentStepIndex,
    progressPercentage,
  };
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timelineContainer: {
    position: 'relative',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    position: 'relative',
  },
  completedStep: {
    opacity: 1,
  },
  currentStep: {
    opacity: 1,
  },
  upcomingStep: {
    opacity: 0.5,
  },
  connectionLine: {
    position: 'absolute',
    left: 15,
    top: 30,
    width: 2,
    height: '120%',
    zIndex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  completedIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
    gap: 2,
  },
  constructionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  additionalInfo: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    minWidth: '45%',
    gap: 2,
  },
});

export default BookingTimeline;

// Hook for using booking timeline
export const useBookingTimeline = (bookingId) => {
  const [timeline, setTimeline] = useState({
    steps: [],
    currentStatus: null,
    progress: 0,
  });

  const updateTimeline = useCallback((bookingData) => {
    if (!bookingData) return;

    const { timelineSteps, currentStepIndex, progressPercentage } = calculateTimelineProgress(
      bookingData,
      bookingData.status
    );

    setTimeline({
      steps: timelineSteps,
      currentStatus: bookingData.status,
      progress: progressPercentage,
    });
  }, []);

  return {
    ...timeline,
    updateTimeline,
  };
};