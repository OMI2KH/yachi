// components/booking/booking-status.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Components
import { ThemedText } from '../ui/themed-text';
import Badge from '../ui/badge';
import Button from '../ui/button';

// Constants
import { 
  BOOKING_STATUS, 
  BOOKING_ACTIONS,
  BOOKING_PRIORITY 
} from '../../constants/booking';

// Service
import { bookingService } from '../../services/booking-service';
import { analyticsService } from '../../services/analytics-service';

/**
 * Booking Status Component
 * Supports both service bookings and construction projects
 * Ethiopian market focused with AI construction support
 */

// Comprehensive booking status configurations
const BOOKING_STATUS_CONFIG = {
  [BOOKING_STATUS.PENDING]: {
    label: 'Pending',
    description: 'Waiting for provider confirmation',
    color: 'warning',
    icon: 'hourglass-empty',
    actions: [BOOKING_ACTIONS.CANCEL],
    priority: 1,
    showCountdown: true,
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: 'Confirmed',
    description: 'Booking has been confirmed',
    color: 'success',
    icon: 'check-circle',
    actions: [BOOKING_ACTIONS.CANCEL, BOOKING_ACTIONS.RESCHEDULE],
    priority: 2,
    showCountdown: true,
  },
  [BOOKING_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    description: 'Service is currently being performed',
    color: 'primary',
    icon: 'build',
    actions: [BOOKING_ACTIONS.COMPLETE, BOOKING_ACTIONS.CANCEL],
    priority: 3,
  },
  [BOOKING_STATUS.COMPLETED]: {
    label: 'Completed',
    description: 'Service has been successfully completed',
    color: 'success',
    icon: 'flag',
    actions: [BOOKING_ACTIONS.REVIEW, BOOKING_ACTIONS.REBOOK],
    priority: 4,
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: 'Cancelled',
    description: 'Booking was cancelled',
    color: 'error',
    icon: 'cancel',
    actions: [BOOKING_ACTIONS.REBOOK],
    priority: 0,
  },
  [BOOKING_STATUS.EXPIRED]: {
    label: 'Expired',
    description: 'Booking request expired',
    color: 'textSecondary',
    icon: 'schedule',
    actions: [BOOKING_ACTIONS.REBOOK],
    priority: -1,
  },
};

// Action configurations
const ACTION_CONFIG = {
  [BOOKING_ACTIONS.CANCEL]: {
    label: 'Cancel Booking',
    icon: 'cancel',
    variant: 'outline',
    color: 'error',
    requiresConfirmation: true,
    confirmation: {
      title: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking?',
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Booking',
    },
  },
  [BOOKING_ACTIONS.RESCHEDULE]: {
    label: 'Reschedule',
    icon: 'schedule',
    variant: 'outline',
    color: 'primary',
    requiresConfirmation: false,
  },
  [BOOKING_ACTIONS.COMPLETE]: {
    label: 'Mark Complete',
    icon: 'check-circle',
    variant: 'primary',
    color: 'success',
    requiresConfirmation: true,
    confirmation: {
      title: 'Complete Service',
      message: 'Mark this service as completed?',
      confirmText: 'Yes, Complete',
      cancelText: 'Not Yet',
    },
  },
  [BOOKING_ACTIONS.REVIEW]: {
    label: 'Write Review',
    icon: 'rate-review',
    variant: 'primary',
    color: 'warning',
    requiresConfirmation: false,
  },
  [BOOKING_ACTIONS.REBOOK]: {
    label: 'Book Again',
    icon: 'replay',
    variant: 'outline',
    color: 'primary',
    requiresConfirmation: false,
  },
  [BOOKING_ACTIONS.MESSAGE]: {
    label: 'Message',
    icon: 'message',
    variant: 'outline',
    color: 'primary',
    requiresConfirmation: false,
  },
  [BOOKING_ACTIONS.PAY]: {
    label: 'Pay Now',
    icon: 'payment',
    variant: 'primary',
    color: 'success',
    requiresConfirmation: false,
  },
  [BOOKING_ACTIONS.VIEW]: {
    label: 'View Details',
    icon: 'visibility',
    variant: 'outline',
    color: 'primary',
    requiresConfirmation: false,
  },
};

const BookingStatus = ({
  // Data
  booking,
  status = booking?.status,
  
  // Configuration
  showActions = true,
  showDetails = true,
  compact = false,
  interactive = true,
  currentUserRole,
  
  // Callbacks
  onStatusChange,
  onActionPress,
  
  // Styling
  style,
  testID = 'booking-status',
  
  // Accessibility
  accessibilityLabel,
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Get current status configuration
  const statusConfig = useMemo(() => {
    return BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG[BOOKING_STATUS.PENDING];
  }, [status]);

  // Get available actions for current status and user role
  const availableActions = useMemo(() => {
    if (!showActions || !interactive || !booking) return [];
    
    const baseActions = statusConfig.actions || [];
    const actions = [];
    
    // Filter actions based on user role and booking context
    baseActions.forEach(actionKey => {
      const actionConfig = ACTION_CONFIG[actionKey];
      if (actionConfig) {
        // Role-based filtering
        if (actionKey === BOOKING_ACTIONS.COMPLETE && currentUserRole !== 'provider') {
          return; // Only providers can complete bookings
        }
        
        if (actionKey === BOOKING_ACTIONS.PAY && booking.paymentStatus === 'paid') {
          return; // Don't show pay action if already paid
        }
        
        actions.push({
          key: actionKey,
          ...actionConfig,
        });
      }
    });
    
    // Always allow messaging for active bookings
    if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS].includes(status)) {
      if (!actions.find(a => a.key === BOOKING_ACTIONS.MESSAGE)) {
        actions.push({
          key: BOOKING_ACTIONS.MESSAGE,
          ...ACTION_CONFIG[BOOKING_ACTIONS.MESSAGE],
        });
      }
    }
    
    // Show pay action for completed bookings with pending payment
    if (status === BOOKING_STATUS.COMPLETED && booking.paymentStatus !== 'paid') {
      if (currentUserRole === 'client') {
        actions.push({
          key: BOOKING_ACTIONS.PAY,
          ...ACTION_CONFIG[BOOKING_ACTIONS.PAY],
        });
      }
    }
    
    return actions;
  }, [statusConfig.actions, showActions, interactive, booking, status, currentUserRole]);

  // Handle action press with confirmation
  const handleActionPress = useCallback(async (action) => {
    if (!interactive || isLoading) return;

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animation feedback
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();

      // Handle confirmation if needed
      if (action.requiresConfirmation) {
        if (Platform.OS === 'ios') {
          // iOS Action Sheet
          ActionSheetIOS.showActionSheetWithOptions(
            {
              title: action.confirmation.title,
              message: action.confirmation.message,
              options: [action.confirmation.cancelText, action.confirmation.confirmText],
              destructiveButtonIndex: 1,
              cancelButtonIndex: 0,
            },
            async (buttonIndex) => {
              if (buttonIndex === 1) {
                await executeAction(action);
              }
            }
          );
        } else {
          // Android Alert
          Alert.alert(
            action.confirmation.title,
            action.confirmation.message,
            [
              {
                text: action.confirmation.cancelText,
                style: 'cancel',
              },
              {
                text: action.confirmation.confirmText,
                style: 'destructive',
                onPress: () => executeAction(action),
              },
            ]
          );
        }
      } else {
        // No confirmation needed
        await executeAction(action);
      }
    } catch (error) {
      console.error('Error handling action:', error);
    }
  }, [interactive, isLoading, scaleAnim]);

  // Execute the action
  const executeAction = async (action) => {
    setIsLoading(true);
    
    try {
      // Track analytics
      analyticsService.trackEvent('booking_action_executed', {
        action: action.key,
        bookingId: booking?.id,
        status: booking?.status,
        userRole: currentUserRole,
      });

      // If custom handler provided, use it
      if (onActionPress) {
        await onActionPress(action.key, booking);
        return;
      }

      // Default action handling
      let result;
      
      switch (action.key) {
        case BOOKING_ACTIONS.CANCEL:
          result = await bookingService.cancelBooking(booking.id, {
            reason: 'User requested cancellation',
          });
          break;
          
        case BOOKING_ACTIONS.COMPLETE:
          result = await bookingService.completeBooking(booking.id);
          break;
          
        case BOOKING_ACTIONS.RESCHEDULE:
          // Navigate to reschedule screen
          router.push(`/bookings/${booking.id}/reschedule`);
          break;
          
        case BOOKING_ACTIONS.REVIEW:
          // Navigate to review screen
          router.push(`/bookings/${booking.id}/review`);
          break;
          
        case BOOKING_ACTIONS.MESSAGE:
          // Navigate to chat
          const otherUserId = currentUserRole === 'client' 
            ? booking.provider?.id 
            : booking.client?.id;
          router.push(`/messages/${otherUserId}`);
          break;
          
        case BOOKING_ACTIONS.PAY:
          // Navigate to payment
          router.push(`/payment?bookingId=${booking.id}`);
          break;
          
        case BOOKING_ACTIONS.REBOOK:
          // Navigate to service page for rebooking
          if (booking.service) {
            router.push(`/services/${booking.service.id}`);
          }
          break;
          
        case BOOKING_ACTIONS.VIEW:
          // Navigate to booking details
          if (booking.projectType === 'construction') {
            router.push(`/construction/${booking.id}`);
          } else {
            router.push(`/bookings/${booking.id}`);
          }
          break;
          
        default:
          console.warn('Unknown action:', action.key);
      }

      // Update status if action was successful
      if (result?.success && result.data) {
        onStatusChange?.(result.data);
        
        // Success haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
    } catch (error) {
      console.error('Action execution failed:', error);
      
      // Error haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Show error alert
      Alert.alert(
        'Action Failed',
        'There was an issue processing your request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show action sheet for multiple actions
  const showActionSheet = () => {
    if (availableActions.length === 0) return;

    if (Platform.OS === 'ios' && availableActions.length > 1) {
      const options = [...availableActions.map(action => action.label), 'Cancel'];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            handleActionPress(availableActions[buttonIndex]);
          }
        }
      );
    } else {
      // For Android or single action, show first action directly
      handleActionPress(availableActions[0]);
    }
  };

  // Render status badge
  const renderStatusBadge = () => (
    <View style={styles.statusContainer}>
      <Badge
        variant="filled"
        color={statusConfig.color}
        icon={statusConfig.icon}
        size={compact ? 'small' : 'medium'}
      >
        {statusConfig.label}
      </Badge>
      
      {/* Priority badge for urgent bookings */}
      {booking?.priority === BOOKING_PRIORITY.URGENT && (
        <Badge
          variant="outline"
          color="error"
          size="small"
          pulse
        >
          Urgent
        </Badge>
      )}
      
      {/* Construction project badge */}
      {booking?.projectType === 'construction' && (
        <Badge
          variant="outline"
          color="primary"
          size="small"
          icon="construction"
        >
          Construction
        </Badge>
      )}
    </View>
  );

  // Render action buttons
  const renderActions = () => {
    if (!showActions || availableActions.length === 0) return null;

    if (compact || availableActions.length > 2) {
      // Show dropdown button for multiple actions or compact mode
      return (
        <Button
          onPress={showActionSheet}
          variant="outline"
          size="small"
          loading={isLoading}
          icon="more-horiz"
        >
          Actions
        </Button>
      );
    }

    // Show individual action buttons
    return (
      <View style={styles.actionsContainer}>
        {availableActions.map((action, index) => (
          <Button
            key={action.key}
            onPress={() => handleActionPress(action)}
            variant={action.variant}
            size="small"
            loading={isLoading}
            icon={action.icon}
            style={index > 0 && styles.actionSpacing}
          >
            {compact ? '' : action.label}
          </Button>
        ))}
      </View>
    );
  };

  // Render status details
  const renderStatusDetails = () => {
    if (!showDetails || compact || !booking) return null;

    return (
      <View style={styles.detailsContainer}>
        <ThemedText type="body" color="secondary">
          {statusConfig.description}
        </ThemedText>
        
        {/* Additional status metadata */}
        <View style={styles.metadataContainer}>
          {booking.updatedAt && (
            <View style={styles.metadataRow}>
              <MaterialIcons
                name="update"
                size={14}
                color={theme.colors.textTertiary}
              />
              <ThemedText type="caption" color="tertiary">
                Updated {formatRelativeTime(booking.updatedAt)}
              </ThemedText>
            </View>
          )}
          
          {booking.scheduledDate && statusConfig.showCountdown && (
            <View style={styles.metadataRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={theme.colors.textTertiary}
              />
              <ThemedText type="caption" color="tertiary">
                {formatDate(booking.scheduledDate)}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    // Simplified version - you can use date-fns or similar for full implementation
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // Format date
  const formatDate = (dateString) => {
    // Simplified - use your date formatter utility
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ET', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.card },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Booking status: ${statusConfig.label}`}
    >
      <View style={styles.content}>
        <View style={styles.mainContent}>
          {renderStatusBadge()}
          {renderStatusDetails()}
        </View>
        
        {renderActions()}
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <MaterialIcons
            name="refresh"
            size={20}
            color={theme.colors.primary}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mainContent: {
    flex: 1,
    marginRight: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  detailsContainer: {
    marginTop: 4,
  },
  metadataContainer: {
    marginTop: 8,
    gap: 4,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionSpacing: {
    marginLeft: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default BookingStatus;

// Hook for using booking status
export const useBookingStatus = (bookingId) => {
  const [state, setState] = useState({
    booking: null,
    loading: false,
    error: null,
  });

  const updateStatus = useCallback(async (newStatus) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await bookingService.updateBookingStatus(bookingId, newStatus);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          booking: result.data,
          loading: false,
        }));
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
      throw error;
    }
  }, [bookingId]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await bookingService.getBookingById(bookingId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          booking: result.data,
          loading: false,
          error: null,
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        loading: false,
      }));
    }
  }, [bookingId]);

  return {
    ...state,
    updateStatus,
    refresh,
  };
};