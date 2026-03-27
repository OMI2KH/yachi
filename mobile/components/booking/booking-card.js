// components/booking/booking-card.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { bookingService } from '../../services/booking-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

// Components
import Avatar from '../ui/avatar';
import Badge from '../ui/badge';
import Button from '../ui/button';
import ProgressBar from '../ui/progress-bar';
import CountdownTimer from '../ui/countdown-timer';
import Modal from '../ui/modal';
import Loading from '../ui/loading';
import { ThemedText } from '../ui/themed-text';

// Constants - Moved to constants/booking.js for consistency
import { 
  BOOKING_STATUS, 
  BOOKING_PRIORITY,
  BOOKING_ACTIONS 
} from '../../constants/booking';

const CARD_VARIANTS = {
  DEFAULT: 'default',
  COMPACT: 'compact',
  DETAILED: 'detailed',
  EXPANDABLE: 'expandable',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Booking Card Component
 * Supports service bookings and construction projects
 */
const BookingCard = ({
  // Data
  booking,
  booking: {
    id,
    service,
    provider,
    client,
    scheduledDate,
    duration,
    status,
    totalAmount,
    paymentStatus,
    specialRequests,
    createdAt,
    updatedAt,
    timeline = [],
    metadata = {},
    projectType, // Added for construction projects
    constructionDetails, // Added for AI construction features
  },
  
  // Configuration
  variant = CARD_VARIANTS.DEFAULT,
  showActions = true,
  showStatus = true,
  showProgress = true,
  showCountdown = true,
  enableExpansion = false,
  autoRefresh = false,
  refreshInterval = 30000,
  
  // User context
  currentUserRole,
  showUserInfo = true,
  
  // Interactions
  onPress,
  onLongPress,
  onAction,
  onStatusChange,
  onExpand,
  
  // Analytics
  analyticsEvent,
  analyticsData,
  
  // Customization
  style,
  contentStyle,
  headerStyle,
  footerStyle,
  statusStyle,
  
  // Performance
  lazyLoad = true,
  
  // Accessibility
  testID,
  accessibilityLabel,
  accessibilityHint,
  
  ...rest
}) => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  
  // State management
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(booking);
  
  // Refs
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef(null);
  const pressAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize component
  useEffect(() => {
    mountedRef.current = true;
    animateIn();
    
    if (autoRefresh) {
      startAutoRefresh();
    }
    
    return () => {
      mountedRef.current = false;
      stopAutoRefresh();
    };
  }, []);

  // Update booking data when prop changes
  useEffect(() => {
    setCurrentBooking(booking);
  }, [booking]);

  // Animation
  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  // Expand/collapse animation
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  // Auto-refresh for real-time updates
  const startAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setInterval(() => {
      refreshBookingStatus();
    }, refreshInterval);
  }, [refreshInterval]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Refresh booking status
  const refreshBookingStatus = useCallback(async () => {
    try {
      const result = await bookingService.getBookingById(currentBooking.id);
      if (result.success && mountedRef.current) {
        setCurrentBooking(result.data);
        onStatusChange?.(result.data);
      }
    } catch (error) {
      console.error('Error refreshing booking status:', error);
    }
  }, [currentBooking.id, onStatusChange]);

  // Handle press animations
  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.95,
      tension: 100,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 100,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle card press
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(currentBooking);
    } else if (enableExpansion) {
      setIsExpanded(prev => !prev);
      onExpand?.(!isExpanded);
    } else {
      // Navigate based on booking type
      if (currentBooking.projectType === 'construction') {
        router.push(`/construction/${currentBooking.id}`);
      } else {
        router.push(`/bookings/${currentBooking.id}`);
      }
    }
    
    analyticsService.trackEvent('booking_card_pressed', {
      bookingId: currentBooking.id,
      status: currentBooking.status,
      projectType: currentBooking.projectType,
      variant,
      ...analyticsData,
    });
  }, [currentBooking, onPress, enableExpansion, isExpanded, onExpand, router, variant, analyticsData]);

  // Handle long press
  const handleLongPress = useCallback(() => {
    onLongPress?.(currentBooking);
    
    analyticsService.trackEvent('booking_card_long_pressed', {
      bookingId: currentBooking.id,
      status: currentBooking.status,
    });
  }, [currentBooking, onLongPress]);

  // Handle action
  const handleAction = useCallback(async (actionType, requireConfirmation = true) => {
    if (isLoading) return;
    
    analyticsService.trackEvent('booking_action_attempted', {
      bookingId: currentBooking.id,
      actionType,
      status: currentBooking.status,
    });
    
    if (requireConfirmation) {
      setPendingAction(actionType);
      setShowActionModal(true);
      return;
    }
    
    await executeAction(actionType);
  }, [currentBooking, isLoading]);

  // Execute booking action
  const executeAction = useCallback(async (actionType) => {
    setIsLoading(true);
    
    try {
      let result;
      
      switch (actionType) {
        case BOOKING_ACTIONS.CONFIRM:
          result = await bookingService.confirmBooking(currentBooking.id);
          break;
          
        case BOOKING_ACTIONS.CANCEL:
          result = await bookingService.cancelBooking(currentBooking.id, {
            reason: 'User requested cancellation',
          });
          break;
          
        case BOOKING_ACTIONS.START:
          result = await bookingService.startBooking(currentBooking.id);
          break;
          
        case BOOKING_ACTIONS.COMPLETE:
          result = await bookingService.completeBooking(currentBooking.id);
          break;
          
        case BOOKING_ACTIONS.RESCHEDULE:
          onAction?.(BOOKING_ACTIONS.RESCHEDULE, currentBooking);
          setIsLoading(false);
          return;
          
        case BOOKING_ACTIONS.MESSAGE:
          router.push(`/messages/${getOtherUserId()}`);
          setIsLoading(false);
          return;
          
        case BOOKING_ACTIONS.PAY:
          router.push(`/payment?bookingId=${currentBooking.id}`);
          setIsLoading(false);
          return;
          
        case BOOKING_ACTIONS.REVIEW:
          router.push(`/bookings/${currentBooking.id}/review`);
          setIsLoading(false);
          return;
          
        case BOOKING_ACTIONS.VIEW:
        default:
          handlePress();
          setIsLoading(false);
          return;
      }
      
      if (result.success) {
        setCurrentBooking(result.data);
        onAction?.(actionType, result.data);
        onStatusChange?.(result.data);
        
        analyticsService.trackEvent('booking_action_success', {
          bookingId: currentBooking.id,
          actionType,
          newStatus: result.data.status,
        });
        
      } else {
        throw new Error(result.message || `Failed to ${actionType} booking`);
      }
      
    } catch (error) {
      console.error(`Error executing booking action ${actionType}:`, error);
      
      errorService.captureError(error, {
        context: 'BookingAction',
        actionType,
        bookingId: currentBooking.id,
        userId: user?.id,
      });
      
      analyticsService.trackEvent('booking_action_failed', {
        bookingId: currentBooking.id,
        actionType,
        error: error.message,
      });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setShowActionModal(false);
        setPendingAction(null);
      }
    }
  }, [currentBooking, user, onAction, onStatusChange, router, handlePress]);

  // Get other user ID for messaging
  const getOtherUserId = useCallback(() => {
    if (currentUserRole === 'client') {
      return currentBooking.provider?.id;
    } else {
      return currentBooking.client?.id;
    }
  }, [currentBooking, currentUserRole]);

  // Get available actions based on status and user role
  const getAvailableActions = useCallback(() => {
    const actions = [];
    const isClient = currentUserRole === 'client';
    const isProvider = currentUserRole === 'provider';
    
    switch (currentBooking.status) {
      case BOOKING_STATUS.PENDING:
        if (isProvider) {
          actions.push(
            { type: BOOKING_ACTIONS.CONFIRM, label: 'Confirm', variant: 'primary' },
            { type: BOOKING_ACTIONS.CANCEL, label: 'Decline', variant: 'outline' }
          );
        }
        if (isClient) {
          actions.push(
            { type: BOOKING_ACTIONS.CANCEL, label: 'Cancel', variant: 'outline' }
          );
        }
        break;
        
      case BOOKING_STATUS.CONFIRMED:
        if (isProvider) {
          actions.push(
            { type: BOOKING_ACTIONS.START, label: 'Start Service', variant: 'primary' },
            { type: BOOKING_ACTIONS.RESCHEDULE, label: 'Reschedule', variant: 'outline' }
          );
        }
        actions.push(
          { type: BOOKING_ACTIONS.MESSAGE, label: 'Message', variant: 'outline' }
        );
        break;
        
      case BOOKING_STATUS.IN_PROGRESS:
        if (isProvider) {
          actions.push(
            { type: BOOKING_ACTIONS.COMPLETE, label: 'Complete', variant: 'primary' }
          );
        }
        actions.push(
          { type: BOOKING_ACTIONS.MESSAGE, label: 'Message', variant: 'outline' }
        );
        break;
        
      case BOOKING_STATUS.COMPLETED:
        if (isClient && !currentBooking.hasReview) {
          actions.push(
            { type: BOOKING_ACTIONS.REVIEW, label: 'Add Review', variant: 'primary' }
          );
        }
        if (isClient && currentBooking.paymentStatus !== 'paid') {
          actions.push(
            { type: BOOKING_ACTIONS.PAY, label: 'Pay Now', variant: 'primary' }
          );
        }
        actions.push(
          { type: BOOKING_ACTIONS.VIEW, label: 'View Details', variant: 'outline' }
        );
        break;
        
      case BOOKING_STATUS.CANCELLED:
      case BOOKING_STATUS.EXPIRED:
        actions.push(
          { type: BOOKING_ACTIONS.VIEW, label: 'View Details', variant: 'outline' }
        );
        break;
    }
    
    // Always allow messaging for active bookings
    if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS].includes(currentBooking.status)) {
      if (!actions.find(a => a.type === BOOKING_ACTIONS.MESSAGE)) {
        actions.push({ type: BOOKING_ACTIONS.MESSAGE, label: 'Message', variant: 'outline' });
      }
    }
    
    return actions;
  }, [currentBooking, currentUserRole]);

  // Get status configuration
  const getStatusConfig = useCallback(() => {
    const config = {
      [BOOKING_STATUS.PENDING]: {
        label: 'Pending',
        color: theme.colors.warning,
        icon: '⏳',
      },
      [BOOKING_STATUS.CONFIRMED]: {
        label: 'Confirmed',
        color: theme.colors.success,
        icon: '✅',
      },
      [BOOKING_STATUS.IN_PROGRESS]: {
        label: 'In Progress',
        color: theme.colors.primary,
        icon: '🔄',
      },
      [BOOKING_STATUS.COMPLETED]: {
        label: 'Completed',
        color: theme.colors.success,
        icon: '🎉',
      },
      [BOOKING_STATUS.CANCELLED]: {
        label: 'Cancelled',
        color: theme.colors.error,
        icon: '❌',
      },
      [BOOKING_STATUS.EXPIRED]: {
        label: 'Expired',
        color: theme.colors.textSecondary,
        icon: '⏰',
      },
    };
    
    return config[currentBooking.status] || config[BOOKING_STATUS.PENDING];
  }, [currentBooking.status, theme]);

  // Get priority configuration
  const getPriorityConfig = useCallback(() => {
    const priority = currentBooking.priority || BOOKING_PRIORITY.MEDIUM;
    
    const config = {
      [BOOKING_PRIORITY.LOW]: {
        label: 'Low',
        color: theme.colors.success,
      },
      [BOOKING_PRIORITY.MEDIUM]: {
        label: 'Medium',
        color: theme.colors.warning,
      },
      [BOOKING_PRIORITY.HIGH]: {
        label: 'High',
        color: theme.colors.error,
      },
      [BOOKING_PRIORITY.URGENT]: {
        label: 'Urgent',
        color: theme.colors.error,
        animated: true,
      },
    };
    
    return config[priority] || config[BOOKING_PRIORITY.MEDIUM];
  }, [currentBooking.priority, theme]);

  // Get progress percentage
  const getProgressPercentage = useCallback(() => {
    const statusProgress = {
      [BOOKING_STATUS.PENDING]: 25,
      [BOOKING_STATUS.CONFIRMED]: 50,
      [BOOKING_STATUS.IN_PROGRESS]: 75,
      [BOOKING_STATUS.COMPLETED]: 100,
      [BOOKING_STATUS.CANCELLED]: 0,
      [BOOKING_STATUS.EXPIRED]: 0,
    };
    
    return statusProgress[currentBooking.status] || 0;
  }, [currentBooking.status]);

  // Get countdown target date
  const getCountdownTarget = useCallback(() => {
    switch (currentBooking.status) {
      case BOOKING_STATUS.PENDING:
        // 24 hours to confirm
        return new Date(currentBooking.createdAt).getTime() + (24 * 60 * 60 * 1000);
        
      case BOOKING_STATUS.CONFIRMED:
        // Scheduled date
        return new Date(currentBooking.scheduledDate).getTime();
        
      case BOOKING_STATUS.IN_PROGRESS:
        // Expected completion time
        const startTime = currentBooking.startedAt ? new Date(currentBooking.startedAt).getTime() : Date.now();
        return startTime + (currentBooking.duration * 60 * 1000);
        
      default:
        return null;
    }
  }, [currentBooking]);

  // Render user info
  const renderUserInfo = () => {
    if (!showUserInfo) return null;
    
    const userInfo = currentUserRole === 'client' ? currentBooking.provider : currentBooking.client;
    if (!userInfo) return null;
    
    return (
      <View style={styles.userInfo}>
        <Avatar
          source={userInfo.avatar ? { uri: userInfo.avatar } : null}
          name={userInfo.name}
          size="small"
        />
        <View style={styles.userDetails}>
          <ThemedText type="body" weight="semiBold">
            {userInfo.name}
          </ThemedText>
          <ThemedText type="caption" color="secondary">
            {currentUserRole === 'client' ? 'Service Provider' : 'Client'}
            {userInfo.premiumBadge && ' • ⭐ Premium'}
          </ThemedText>
        </View>
      </View>
    );
  };

  // Render service/construction info
  const renderServiceInfo = () => {
    const isConstruction = currentBooking.projectType === 'construction';
    
    return (
      <View style={styles.serviceInfo}>
        <ThemedText type="body" weight="semiBold" numberOfLines={2}>
          {service?.title || currentBooking.projectTitle}
        </ThemedText>
        <ThemedText type="caption" color="secondary">
          {formatDate(scheduledDate)} • {formatTime(scheduledDate)}
          {isConstruction && ' • 🏗️ Construction'}
        </ThemedText>
      </View>
    );
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (!showStatus) return null;
    
    const statusConfig = getStatusConfig();
    const priorityConfig = getPriorityConfig();
    
    return (
      <View style={styles.statusContainer}>
        <Badge
          variant="outline"
          color={statusConfig.color}
          icon={statusConfig.icon}
        >
          {statusConfig.label}
        </Badge>
        
        {currentBooking.priority && currentBooking.priority !== BOOKING_PRIORITY.MEDIUM && (
          <Badge
            variant="outline"
            color={priorityConfig.color}
            pulse={priorityConfig.animated}
          >
            {priorityConfig.label}
          </Badge>
        )}

        {/* Payment Status Badge */}
        {currentBooking.paymentStatus && (
          <Badge
            variant="outline"
            color={currentBooking.paymentStatus === 'paid' ? theme.colors.success : theme.colors.warning}
          >
            {currentBooking.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
          </Badge>
        )}
      </View>
    );
  };

  // Render progress bar
  const renderProgressBar = () => {
    if (!showProgress || variant === CARD_VARIANTS.COMPACT) return null;
    
    const progress = getProgressPercentage();
    
    return (
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={progress}
          color={getStatusConfig().color}
          height={4}
        />
        <View style={styles.progressLabels}>
          <ThemedText type="caption" color="secondary">
            {progress}% complete
          </ThemedText>
        </View>
      </View>
    );
  };

  // Render countdown timer
  const renderCountdownTimer = () => {
    if (!showCountdown || variant === CARD_VARIANTS.COMPACT) return null;
    
    const targetDate = getCountdownTarget();
    if (!targetDate) return null;
    
    return (
      <View style={styles.countdownContainer}>
        <CountdownTimer
          targetDate={targetDate}
          onComplete={() => refreshBookingStatus()}
        />
      </View>
    );
  };

  // Render action buttons
  const renderActionButtons = () => {
    if (!showActions || variant === CARD_VARIANTS.COMPACT) return null;
    
    const availableActions = getAvailableActions();
    if (availableActions.length === 0) return null;
    
    return (
      <View style={styles.actionsContainer}>
        {availableActions.map((action, index) => (
          <Button
            key={action.type}
            onPress={() => handleAction(action.type)}
            variant={action.variant === 'primary' ? 'primary' : 'outline'}
            size="small"
            loading={isLoading && pendingAction === action.type}
            style={[
              styles.actionButton,
              index > 0 && styles.actionButtonSpaced,
            ]}
          >
            {action.label}
          </Button>
        ))}
      </View>
    );
  };

  // Render expanded content
  const renderExpandedContent = () => {
    if (!isExpanded || variant !== CARD_VARIANTS.EXPANDABLE) return null;
    
    return (
      <Animated.View
        style={[
          styles.expandedContent,
          {
            height: expandAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200],
            }),
            opacity: expandAnim,
          },
        ]}
      >
        <ThemedText type="body" weight="semiBold">
          Booking Details
        </ThemedText>
        
        {specialRequests && (
          <View style={styles.detailSection}>
            <ThemedText type="caption" color="secondary">
              Special Requests:
            </ThemedText>
            <ThemedText type="caption">
              {specialRequests}
            </ThemedText>
          </View>
        )}
        
        <View style={styles.detailSection}>
          <ThemedText type="caption" color="secondary">
            Created:
          </ThemedText>
          <ThemedText type="caption">
            {formatDate(createdAt)} at {formatTime(createdAt)}
          </ThemedText>
        </View>
        
        {currentBooking.constructionDetails && (
          <View style={styles.detailSection}>
            <ThemedText type="caption" color="secondary">
              Construction Type:
            </ThemedText>
            <ThemedText type="caption">
              {currentBooking.constructionDetails.type}
            </ThemedText>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render action confirmation modal
  const renderActionModal = () => {
    if (!showActionModal || !pendingAction) return null;
    
    const getModalConfig = () => {
      const configs = {
        [BOOKING_ACTIONS.CONFIRM]: {
          title: 'Confirm Booking',
          message: 'Are you sure you want to confirm this booking?',
          confirmText: 'Confirm',
          variant: 'primary',
        },
        [BOOKING_ACTIONS.CANCEL]: {
          title: 'Cancel Booking',
          message: 'Are you sure you want to cancel this booking? This action cannot be undone.',
          confirmText: 'Cancel Booking',
          variant: 'danger',
        },
        [BOOKING_ACTIONS.START]: {
          title: 'Start Service',
          message: 'Are you ready to start the service?',
          confirmText: 'Start Service',
          variant: 'primary',
        },
        [BOOKING_ACTIONS.COMPLETE]: {
          title: 'Complete Service',
          message: 'Have you completed the service?',
          confirmText: 'Complete Service',
          variant: 'primary',
        },
      };
      
      return configs[pendingAction] || {
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
        confirmText: 'Confirm',
        variant: 'primary',
      };
    };
    
    const modalConfig = getModalConfig();
    
    return (
      <Modal
        visible={showActionModal}
        onDismiss={() => setShowActionModal(false)}
        variant="center"
        size="small"
      >
        <View style={styles.modalContent}>
          <ThemedText type="title" weight="semiBold" style={styles.modalTitle}>
            {modalConfig.title}
          </ThemedText>
          <ThemedText type="body" color="secondary" style={styles.modalMessage}>
            {modalConfig.message}
          </ThemedText>
          <View style={styles.modalActions}>
            <Button
              onPress={() => setShowActionModal(false)}
              variant="outline"
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              onPress={() => executeAction(pendingAction)}
              variant={modalConfig.variant}
              loading={isLoading}
              style={styles.modalButton}
            >
              {modalConfig.confirmText}
            </Button>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading && !currentBooking) {
    return <Loading size="small" />;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: pressAnim }],
        },
        style,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Booking for ${service?.title}`}
      accessibilityHint={accessibilityHint}
      {...rest}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[
          styles.card,
          contentStyle,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, headerStyle]}>
          {renderServiceInfo()}
          
          <View style={styles.headerSide}>
            <ThemedText type="title" color="primary">
              {formatCurrency(totalAmount)}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              {duration} min
            </ThemedText>
          </View>
        </View>

        {/* User Info */}
        {renderUserInfo()}

        {/* Status & Priority */}
        {renderStatusBadge()}

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Countdown Timer */}
        {renderCountdownTimer()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Expanded Content */}
        {renderExpandedContent()}
      </Pressable>

      {/* Action Confirmation Modal */}
      {renderActionModal()}
    </Animated.View>
  );
};

// Constants for external use
BookingCard.Status = BOOKING_STATUS;
BookingCard.Priority = BOOKING_PRIORITY;
BookingCard.Variants = CARD_VARIANTS;
BookingCard.Actions = BOOKING_ACTIONS;

// Hook for using booking card in components
export const useBookingCard = (bookingId) => {
  const [state, setState] = useState({
    booking: null,
    loading: false,
    error: null,
  });

  const refreshBooking = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await bookingService.getBookingById(bookingId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          booking: result.data,
          loading: false,
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

  const executeAction = useCallback(async (actionType) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await bookingService.updateBookingStatus(bookingId, actionType);
      
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

  return {
    ...state,
    refreshBooking,
    executeAction,
  };
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerSide: {
    alignItems: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  countdownContainer: {
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    marginTop: 8,
  },
  actionButtonSpaced: {
    marginLeft: 8,
  },
  expandedContent: {
    overflow: 'hidden',
    marginTop: 12,
  },
  detailSection: {
    marginBottom: 6,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default BookingCard;