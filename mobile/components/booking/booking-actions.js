// components/booking/booking-actions.js

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { format, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/auth-context';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

/**
 * Enhanced Booking Actions Component for Ethiopian Market
 * 
 * Features:
 * - Ethiopian payment method integration (Chapa, Telebirr, CBE Birr)
 * - AI construction project specific actions
 * - Government project management actions
 * - Premium service provider features
 * - Ethiopian cancellation policies and fees
 * - Multi-language support for Ethiopian users
 */

// Action types configuration for Ethiopian market
const ACTION_TYPES = {
  // Client Actions
  CANCEL: 'cancel',
  RESCHEDULE: 'reschedule',
  REVIEW: 'review',
  REBOOK: 'rebook',
  PAY: 'pay',
  MESSAGE: 'message',
  SHARE: 'share',
  EMERGENCY_CANCEL: 'emergency_cancel',
  ADD_TIP: 'add_tip',
  
  // Service Provider Actions
  ACCEPT: 'accept',
  DECLINE: 'decline',
  START_SERVICE: 'start_service',
  COMPLETE_SERVICE: 'complete_service',
  REQUEST_PAYMENT: 'request_payment',
  SEND_INVOICE: 'send_invoice',
  UPDATE_PROGRESS: 'update_progress',
  REQUEST_MATERIALS: 'request_materials',
  
  // Construction Specific Actions
  ASSIGN_WORKERS: 'assign_workers',
  UPDATE_TIMELINE: 'update_timeline',
  APPROVE_MILESTONE: 'approve_milestone',
  REQUEST_APPROVAL: 'request_approval',
  
  // Government Actions
  APPROVE_PROJECT: 'approve_project',
  REJECT_PROJECT: 'reject_project',
  ALLOCATE_BUDGET: 'allocate_budget',
  REVIEW_PROGRESS: 'review_progress',
  
  // Admin Actions
  FORCE_COMPLETE: 'force_complete',
  REFUND: 'refund',
  MODIFY: 'modify',
  ESCALATE: 'escalate',
  UPGRADE_PREMIUM: 'upgrade_premium',
};

// Action configurations for Ethiopian market
const ACTION_CONFIG = {
  [ACTION_TYPES.CANCEL]: {
    label: 'Cancel Booking',
    icon: 'cancel',
    color: '#EF4444',
    role: ['client', 'admin'],
    confirmation: {
      title: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking? Cancellation fees may apply based on Ethiopian market policies.',
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Booking',
      severity: 'medium',
    },
    conditions: {
      status: ['pending', 'confirmed'],
      timeLimit: 24, // hours before service
    },
    ethiopianContext: {
      cancellationFee: true,
      policy: '24-hour cancellation policy applies',
    },
  },
  
  [ACTION_TYPES.RESCHEDULE]: {
    label: 'Reschedule',
    icon: 'schedule',
    color: '#3B82F6',
    role: ['client', 'admin'],
    confirmation: {
      title: 'Reschedule Booking',
      message: 'Do you want to reschedule this booking?',
      confirmText: 'Reschedule',
      cancelText: 'Keep Current Time',
    },
    conditions: {
      status: ['pending', 'confirmed'],
      timeLimit: 2, // hours before service
    },
  },
  
  [ACTION_TYPES.REVIEW]: {
    label: 'Write Review',
    icon: 'rate-review',
    color: '#F59E0B',
    role: ['client'],
    confirmation: null,
    conditions: {
      status: ['completed'],
      notReviewed: true,
    },
  },
  
  [ACTION_TYPES.REBOOK]: {
    label: 'Book Again',
    icon: 'replay',
    color: '#8B5CF6',
    role: ['client'],
    confirmation: null,
    conditions: {
      status: ['completed', 'cancelled', 'expired'],
    },
  },
  
  [ACTION_TYPES.PAY]: {
    label: 'Make Payment',
    icon: 'payment',
    color: '#10B981',
    role: ['client'],
    confirmation: null,
    conditions: {
      status: ['confirmed'],
      paymentPending: true,
    },
    ethiopianContext: {
      paymentMethods: ['chapa', 'telebirr', 'cbe_birr'],
      currency: 'ETB',
    },
  },
  
  [ACTION_TYPES.ADD_TIP]: {
    label: 'Add Tip',
    icon: 'attach-money',
    color: '#F59E0B',
    role: ['client'],
    confirmation: {
      title: 'Add Tip',
      message: 'Show appreciation for excellent service by adding a tip.',
      confirmText: 'Add Tip',
      cancelText: 'Maybe Later',
    },
    conditions: {
      status: ['completed'],
      canTip: true,
    },
    ethiopianContext: {
      currency: 'ETB',
      commonAmounts: [50, 100, 200],
    },
  },
  
  [ACTION_TYPES.MESSAGE]: {
    label: 'Message',
    icon: 'message',
    color: '#6B7280',
    role: ['client', 'service_provider'],
    confirmation: null,
    conditions: {
      status: ['pending', 'confirmed', 'in_progress', 'completed'],
    },
  },
  
  [ACTION_TYPES.SHARE]: {
    label: 'Share Details',
    icon: 'share',
    color: '#6B7280',
    role: ['client', 'service_provider'],
    confirmation: null,
    conditions: {},
  },
  
  [ACTION_TYPES.EMERGENCY_CANCEL]: {
    label: 'Emergency Cancel',
    icon: 'warning',
    color: '#DC2626',
    role: ['client', 'admin'],
    confirmation: {
      title: 'Emergency Cancellation',
      message: 'This should only be used in emergencies. A 50% cancellation fee will apply as per Ethiopian service policies.',
      confirmText: 'Emergency Cancel',
      cancelText: 'Go Back',
      severity: 'high',
    },
    conditions: {
      status: ['confirmed', 'in_progress'],
    },
    ethiopianContext: {
      cancellationFee: true,
      feePercentage: 50,
      policy: 'Emergency cancellation policy',
    },
  },
  
  [ACTION_TYPES.ACCEPT]: {
    label: 'Accept Booking',
    icon: 'check-circle',
    color: '#10B981',
    role: ['service_provider'],
    confirmation: {
      title: 'Accept Booking',
      message: 'Are you sure you want to accept this booking?',
      confirmText: 'Accept',
      cancelText: 'Review',
    },
    conditions: {
      status: ['pending'],
    },
  },
  
  [ACTION_TYPES.DECLINE]: {
    label: 'Decline Booking',
    icon: 'block',
    color: '#EF4444',
    role: ['service_provider'],
    confirmation: {
      title: 'Decline Booking',
      message: 'Are you sure you want to decline this booking?',
      confirmText: 'Decline',
      cancelText: 'Keep',
    },
    conditions: {
      status: ['pending'],
    },
  },
  
  [ACTION_TYPES.START_SERVICE]: {
    label: 'Start Service',
    icon: 'play-arrow',
    color: '#3B82F6',
    role: ['service_provider'],
    confirmation: {
      title: 'Start Service',
      message: 'Mark this service as started?',
      confirmText: 'Start',
      cancelText: 'Not Yet',
    },
    conditions: {
      status: ['confirmed'],
      canStart: true,
    },
  },
  
  [ACTION_TYPES.COMPLETE_SERVICE]: {
    label: 'Complete Service',
    icon: 'check-circle',
    color: '#10B981',
    role: ['service_provider'],
    confirmation: {
      title: 'Complete Service',
      message: 'Mark this service as completed?',
      confirmText: 'Complete',
      cancelText: 'Not Yet',
    },
    conditions: {
      status: ['in_progress'],
    },
  },
  
  [ACTION_TYPES.REQUEST_PAYMENT]: {
    label: 'Request Payment',
    icon: 'payment',
    color: '#F59E0B',
    role: ['service_provider'],
    confirmation: null,
    conditions: {
      status: ['completed'],
      paymentPending: true,
    },
    ethiopianContext: {
      paymentMethods: ['chapa', 'telebirr', 'cbe_birr'],
    },
  },
  
  [ACTION_TYPES.SEND_INVOICE]: {
    label: 'Send Invoice',
    icon: 'receipt',
    color: '#6B7280',
    role: ['service_provider'],
    confirmation: null,
    conditions: {
      status: ['completed'],
    },
  },
  
  [ACTION_TYPES.UPDATE_PROGRESS]: {
    label: 'Update Progress',
    icon: 'trending-up',
    color: '#8B5CF6',
    role: ['service_provider'],
    confirmation: null,
    conditions: {
      status: ['in_progress'],
      isConstruction: true,
    },
  },
  
  [ACTION_TYPES.REQUEST_MATERIALS]: {
    label: 'Request Materials',
    icon: 'inventory',
    color: '#F59E0B',
    role: ['service_provider'],
    confirmation: {
      title: 'Request Materials',
      message: 'Request additional materials for this project?',
      confirmText: 'Request',
      cancelText: 'Cancel',
    },
    conditions: {
      status: ['in_progress'],
      isConstruction: true,
    },
  },
  
  [ACTION_TYPES.ASSIGN_WORKERS]: {
    label: 'Assign Workers',
    icon: 'groups',
    color: '#10B981',
    role: ['service_provider', 'government'],
    confirmation: null,
    conditions: {
      status: ['confirmed', 'in_progress'],
      isConstruction: true,
      canAssignWorkers: true,
    },
  },
  
  [ACTION_TYPES.UPDATE_TIMELINE]: {
    label: 'Update Timeline',
    icon: 'timeline',
    color: '#3B82F6',
    role: ['service_provider', 'government'],
    confirmation: null,
    conditions: {
      status: ['confirmed', 'in_progress'],
      isConstruction: true,
    },
  },
  
  [ACTION_TYPES.APPROVE_MILESTONE]: {
    label: 'Approve Milestone',
    icon: 'approval',
    color: '#10B981',
    role: ['client', 'government'],
    confirmation: {
      title: 'Approve Milestone',
      message: 'Approve this construction milestone and release payment?',
      confirmText: 'Approve',
      cancelText: 'Review',
    },
    conditions: {
      status: ['in_progress'],
      isConstruction: true,
      hasPendingMilestone: true,
    },
  },
  
  [ACTION_TYPES.REQUEST_APPROVAL]: {
    label: 'Request Approval',
    icon: 'send',
    color: '#3B82F6',
    role: ['service_provider'],
    confirmation: {
      title: 'Request Approval',
      message: 'Request client approval for completed work?',
      confirmText: 'Request',
      cancelText: 'Cancel',
    },
    conditions: {
      status: ['in_progress'],
      isConstruction: true,
      hasCompletedMilestone: true,
    },
  },
  
  [ACTION_TYPES.APPROVE_PROJECT]: {
    label: 'Approve Project',
    icon: 'verified',
    color: '#10B981',
    role: ['government'],
    confirmation: {
      title: 'Approve Project',
      message: 'Approve this government construction project?',
      confirmText: 'Approve',
      cancelText: 'Review',
    },
    conditions: {
      status: ['pending'],
      isGovernmentProject: true,
    },
  },
  
  [ACTION_TYPES.REJECT_PROJECT]: {
    label: 'Reject Project',
    icon: 'block',
    color: '#EF4444',
    role: ['government'],
    confirmation: {
      title: 'Reject Project',
      message: 'Reject this government construction project?',
      confirmText: 'Reject',
      cancelText: 'Review',
    },
    conditions: {
      status: ['pending'],
      isGovernmentProject: true,
    },
  },
  
  [ACTION_TYPES.ALLOCATE_BUDGET]: {
    label: 'Allocate Budget',
    icon: 'account-balance',
    color: '#F59E0B',
    role: ['government'],
    confirmation: {
      title: 'Allocate Budget',
      message: 'Allocate budget for this government project?',
      confirmText: 'Allocate',
      cancelText: 'Cancel',
    },
    conditions: {
      status: ['confirmed'],
      isGovernmentProject: true,
      budgetPending: true,
    },
    ethiopianContext: {
      currency: 'ETB',
    },
  },
  
  [ACTION_TYPES.REVIEW_PROGRESS]: {
    label: 'Review Progress',
    icon: 'analytics',
    color: '#8B5CF6',
    role: ['government'],
    confirmation: null,
    conditions: {
      status: ['in_progress'],
      isGovernmentProject: true,
    },
  },
  
  [ACTION_TYPES.FORCE_COMPLETE]: {
    label: 'Force Complete',
    icon: 'admin-panel-settings',
    color: '#8B5CF6',
    role: ['admin'],
    confirmation: {
      title: 'Force Complete',
      message: 'This will forcefully mark the booking as completed. Use only for disputes.',
      confirmText: 'Force Complete',
      cancelText: 'Cancel',
      severity: 'high',
    },
    conditions: {
      status: ['in_progress', 'confirmed'],
    },
  },
  
  [ACTION_TYPES.REFUND]: {
    label: 'Process Refund',
    icon: 'money-off',
    color: '#EF4444',
    role: ['admin'],
    confirmation: {
      title: 'Process Refund',
      message: 'This will initiate a refund for this booking.',
      confirmText: 'Process Refund',
      cancelText: 'Cancel',
    },
    conditions: {
      status: ['cancelled', 'completed'],
      hasPayment: true,
    },
    ethiopianContext: {
      paymentMethods: ['chapa', 'telebirr', 'cbe_birr'],
    },
  },
  
  [ACTION_TYPES.MODIFY]: {
    label: 'Modify Booking',
    icon: 'edit',
    color: '#3B82F6',
    role: ['admin'],
    confirmation: null,
    conditions: {},
  },
  
  [ACTION_TYPES.ESCALATE]: {
    label: 'Escalate Issue',
    icon: 'priority-high',
    color: '#DC2626',
    role: ['admin'],
    confirmation: null,
    conditions: {
      hasIssues: true,
    },
  },
  
  [ACTION_TYPES.UPGRADE_PREMIUM]: {
    label: 'Upgrade to Premium',
    icon: 'star',
    color: '#F59E0B',
    role: ['admin'],
    confirmation: {
      title: 'Upgrade to Premium',
      message: 'Upgrade this service provider to premium status? (200 ETB/month)',
      confirmText: 'Upgrade',
      cancelText: 'Cancel',
    },
    conditions: {
      userIsProvider: true,
      notPremium: true,
    },
    ethiopianContext: {
      price: 200,
      currency: 'ETB',
      duration: 'month',
    },
  },
};

const BookingActions = ({
  booking,
  currentUser,
  onActionPress,
  variant = 'default', // 'default', 'compact', 'expanded', 'construction', 'government'
  maxVisibleActions = 3,
  showLabels = true,
  interactive = true,
  style,
  testID = 'booking-actions',
}) => {
  const { theme, isDark } = useTheme();
  const { user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [pressedAction, setPressedAction] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Determine user role and permissions for Ethiopian market
  const userRole = useMemo(() => {
    if (!currentUser && !authUser) return 'client';
    
    const user = currentUser || authUser;
    
    if (user.role === 'admin') return 'admin';
    if (user.role === 'government') return 'government';
    if (user.role === 'service_provider') return 'service_provider';
    if (user.id === booking?.provider?.id) return 'service_provider';
    
    return 'client';
  }, [currentUser, authUser, booking]);

  // Check if booking is construction project
  const isConstructionProject = useMemo(() => {
    return booking?.projectType === 'construction' || 
           booking?.category === 'construction' ||
           booking?.skills?.includes('construction');
  }, [booking]);

  // Check if booking is government project
  const isGovernmentProject = useMemo(() => {
    return booking?.projectType === 'government' || 
           booking?.clientType === 'government' ||
           userRole === 'government';
  }, [booking, userRole]);

  // Calculate available actions based on Ethiopian market context
  const availableActions = useMemo(() => {
    if (!booking || !interactive) return [];

    return Object.entries(ACTION_CONFIG)
      .filter(([actionKey, config]) => {
        // Check role permission
        if (!config.role.includes(userRole)) return false;

        // Check status condition
        if (config.conditions.status && 
            !config.conditions.status.includes(booking.status)) {
          return false;
        }

        // Check time limit conditions
        if (config.conditions.timeLimit && booking.scheduledTime) {
          const scheduledTime = parseISO(booking.scheduledTime);
          const timeLimit = addDays(scheduledTime, -config.conditions.timeLimit / 24);
          if (isBefore(new Date(), timeLimit)) return false;
        }

        // Check construction-specific conditions
        if (config.conditions.isConstruction && !isConstructionProject) return false;
        if (config.conditions.isGovernmentProject && !isGovernmentProject) return false;

        // Check custom conditions
        if (config.conditions.notReviewed && booking.reviewed) return false;
        if (config.conditions.paymentPending && !booking.paymentPending) return false;
        if (config.conditions.canStart && !canStartService(booking)) return false;
        if (config.conditions.hasPayment && !booking.paymentId) return false;
        if (config.conditions.hasIssues && !booking.hasIssues) return false;
        if (config.conditions.canTip && !booking.canReceiveTip) return false;
        if (config.conditions.canAssignWorkers && !booking.canAssignWorkers) return false;
        if (config.conditions.hasPendingMilestone && !booking.hasPendingMilestone) return false;
        if (config.conditions.hasCompletedMilestone && !booking.hasCompletedMilestone) return false;
        if (config.conditions.budgetPending && !booking.budgetPending) return false;
        if (config.conditions.userIsProvider && userRole !== 'service_provider') return false;
        if (config.conditions.notPremium && booking.provider?.isPremium) return false;

        return true;
      })
      .map(([actionKey, config]) => ({
        key: actionKey,
        ...config,
        // Add Ethiopian context to action
        ethiopianContext: {
          ...config.ethiopianContext,
          isConstruction: isConstructionProject,
          isGovernment: isGovernmentProject,
          city: booking?.city || 'Addis Ababa',
        },
      }))
      .sort((a, b) => {
        // Sort by priority/importance for Ethiopian market
        const priorityOrder = {
          [ACTION_TYPES.EMERGENCY_CANCEL]: 0,
          [ACTION_TYPES.APPROVE_PROJECT]: 1,
          [ACTION_TYPES.ALLOCATE_BUDGET]: 2,
          [ACTION_TYPES.ACCEPT]: 3,
          [ACTION_TYPES.DECLINE]: 4,
          [ACTION_TYPES.PAY]: 5,
          [ACTION_TYPES.START_SERVICE]: 6,
          [ACTION_TYPES.COMPLETE_SERVICE]: 7,
          [ACTION_TYPES.APPROVE_MILESTONE]: 8,
          [ACTION_TYPES.CANCEL]: 9,
          [ACTION_TYPES.RESCHEDULE]: 10,
          [ACTION_TYPES.REVIEW]: 11,
          [ACTION_TYPES.REBOOK]: 12,
        };
        
        return (priorityOrder[a.key] || 20) - (priorityOrder[b.key] || 20);
      });
  }, [booking, userRole, interactive, isConstructionProject, isGovernmentProject]);

  // Check if service can be started with Ethiopian market considerations
  const canStartService = (booking) => {
    if (!booking.scheduledTime) return true;
    
    const scheduledTime = parseISO(booking.scheduledTime);
    const fifteenMinutesEarly = addDays(scheduledTime, -15 / (24 * 60));
    
    return isAfter(new Date(), fifteenMinutesEarly);
  };

  // Handle action press with Ethiopian market analytics
  const handleActionPress = useCallback(async (action) => {
    if (!interactive || isLoading) return;

    try {
      setPressedAction(action.key);
      
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animation
      await animateButtonPress();

      // Track analytics for Ethiopian market
      analyticsService.trackEvent('booking_action_pressed', {
        action: action.key,
        bookingId: booking?.id,
        userRole,
        bookingStatus: booking?.status,
        isConstruction: isConstructionProject,
        isGovernment: isGovernmentProject,
        city: booking?.city,
        providerPremium: booking.provider?.isPremium,
      });

      // Handle confirmation with Ethiopian context
      if (action.confirmation) {
        await showConfirmationDialog(action);
      } else {
        await executeAction(action);
      }
    } catch (error) {
      console.error('Error handling action:', error);
      errorService.captureError(error, {
        context: 'BookingActions',
        action: action.key,
        bookingId: booking?.id,
        userRole,
        isConstruction: isConstructionProject,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPressedAction(null);
    }
  }, [interactive, isLoading, booking, userRole, isConstructionProject, isGovernmentProject]);

  // Animate button press
  const animateButtonPress = () => {
    return new Promise((resolve) => {
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
      ]).start(resolve);
    });
  };

  // Show confirmation dialog with Ethiopian context
  const showConfirmationDialog = async (action) => {
    let enhancedMessage = action.confirmation.message;
    
    // Add Ethiopian context to messages
    if (action.ethiopianContext?.cancellationFee) {
      enhancedMessage += `\n\nCancellation fee: ${action.ethiopianContext.feePercentage || 25}%`;
    }
    
    if (action.ethiopianContext?.price) {
      enhancedMessage += `\n\nPrice: ${action.ethiopianContext.price} ${action.ethiopianContext.currency}/${action.ethiopianContext.duration}`;
    }

    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: action.confirmation.title,
            message: enhancedMessage,
            options: [action.confirmation.cancelText, action.confirmation.confirmText],
            destructiveButtonIndex: action.confirmation.severity === 'high' ? 1 : -1,
            cancelButtonIndex: 0,
          },
          async (buttonIndex) => {
            if (buttonIndex === 1) {
              await executeAction(action);
            }
            resolve();
          }
        );
      });
    } else {
      return new Promise((resolve) => {
        Alert.alert(
          action.confirmation.title,
          enhancedMessage,
          [
            {
              text: action.confirmation.cancelText,
              style: 'cancel',
              onPress: resolve,
            },
            {
              text: action.confirmation.confirmText,
              style: action.confirmation.severity === 'high' ? 'destructive' : 'default',
              onPress: async () => {
                await executeAction(action);
                resolve();
              },
            },
          ]
        );
      });
    }
  };

  // Execute the action with Ethiopian market context
  const executeAction = async (action) => {
    setIsLoading(true);
    
    try {
      // Add Ethiopian context to action data
      const actionData = {
        action: action.key,
        booking,
        ethiopianContext: action.ethiopianContext,
        userRole,
        timestamp: new Date().toISOString(),
      };

      if (onActionPress) {
        await onActionPress(action.key, actionData);
      }
      
      // Success feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Analytics for Ethiopian market
      analyticsService.trackEvent('booking_action_completed', {
        action: action.key,
        bookingId: booking?.id,
        userRole,
        isConstruction: isConstructionProject,
        isGovernment: isGovernmentProject,
        city: booking?.city,
        amount: booking?.amount,
        currency: booking?.currency || 'ETB',
      });
    } catch (error) {
      console.error('Action execution failed:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Show error alert with Ethiopian support info
      Alert.alert(
        'Action Failed',
        'There was an issue processing your request. Please try again or contact Ethiopian support: +251 911 234 567',
        [{ text: 'OK' }]
      );
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Render action button with Ethiopian styling
  const renderActionButton = (action, index) => {
    const isPressed = pressedAction === action.key;
    const isPrimary = index === 0 && variant === 'default';
    const isConstruction = action.ethiopianContext?.isConstruction;
    const isGovernment = action.ethiopianContext?.isGovernment;
    
    // Determine button style based on context
    let buttonStyle = styles.secondaryAction;
    if (isPrimary) buttonStyle = styles.primaryAction;
    if (isConstruction) buttonStyle = styles.constructionAction;
    if (isGovernment) buttonStyle = styles.governmentAction;
    
    return (
      <TouchableOpacity
        key={action.key}
        style={[
          styles.actionButton,
          buttonStyle,
          {
            backgroundColor: getButtonBackgroundColor(action, isPrimary, isConstruction, isGovernment),
            borderColor: action.color,
            opacity: isLoading && pressedAction === action.key ? 0.7 : 1,
          },
          variant === 'compact' && styles.compactAction,
        ]}
        onPress={() => handleActionPress(action)}
        disabled={!interactive || isLoading}
        accessibilityLabel={action.label}
        accessibilityHint={`Performs ${action.label} for this ${isConstruction ? 'construction' : ''} booking`}
      >
        <MaterialIcons
          name={action.icon}
          size={variant === 'compact' ? 16 : 20}
          color={getButtonTextColor(action, isPrimary, isConstruction, isGovernment)}
          style={styles.actionIcon}
        />
        
        {showLabels && (
          <Text
            style={[
              styles.actionText,
              {
                color: getButtonTextColor(action, isPrimary, isConstruction, isGovernment),
              },
              variant === 'compact' && styles.compactActionText,
            ]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        )}

        {/* Premium badge for premium-related actions */}
        {action.key === ACTION_TYPES.UPGRADE_PREMIUM && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Helper function to determine button background color
  const getButtonBackgroundColor = (action, isPrimary, isConstruction, isGovernment) => {
    if (isPrimary) return action.color;
    if (isConstruction) return action.color + '20'; // 20% opacity
    if (isGovernment) return action.color + '20';
    return 'transparent';
  };

  // Helper function to determine button text color
  const getButtonTextColor = (action, isPrimary, isConstruction, isGovernment) => {
    if (isPrimary) return '#FFFFFF';
    return action.color;
  };

  // Render expanded actions view
  const renderExpandedActions = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.expandedActionsContainer}
    >
      {availableActions.map((action, index) => renderActionButton(action, index))}
    </ScrollView>
  );

  // Render construction-specific actions
  const renderConstructionActions = () => (
    <View style={styles.constructionActionsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Construction Project Actions
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.expandedActionsContainer}
      >
        {availableActions
          .filter(action => action.ethiopianContext?.isConstruction)
          .map((action, index) => renderActionButton(action, index))}
      </ScrollView>
    </View>
  );

  // Render government-specific actions
  const renderGovernmentActions = () => (
    <View style={styles.governmentActionsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Government Project Actions
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.expandedActionsContainer}
      >
        {availableActions
          .filter(action => action.ethiopianContext?.isGovernment)
          .map((action, index) => renderActionButton(action, index))}
      </ScrollView>
    </View>
  );

  // Render default actions view
  const renderDefaultActions = () => {
    const visibleActions = availableActions.slice(0, maxVisibleActions);
    const hiddenActions = availableActions.slice(maxVisibleActions);

    return (
      <View style={styles.defaultActionsContainer}>
        {visibleActions.map((action, index) => renderActionButton(action, index))}
        
        {hiddenActions.length > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, styles.moreActionsButton]}
            onPress={() => {
              // Show action sheet for hidden actions
              if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                  {
                    title: 'More Actions',
                    options: [...hiddenActions.map(a => a.label), 'Cancel'],
                    cancelButtonIndex: hiddenActions.length,
                  },
                  (buttonIndex) => {
                    if (buttonIndex < hiddenActions.length) {
                      handleActionPress(hiddenActions[buttonIndex]);
                    }
                  }
                );
              } else {
                // Android - show alert with options
                Alert.alert(
                  'More Actions',
                  undefined,
                  hiddenActions.map(action => ({
                    text: action.label,
                    onPress: () => handleActionPress(action),
                  }))
                );
              }
            }}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.moreActionsText, { color: theme.colors.textSecondary }]}>
              More
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!availableActions.length) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.card },
        style,
        { transform: [{ scale: scaleAnim }] },
      ]}
      testID={testID}
    >
      {/* Render appropriate view based on variant */}
      {variant === 'expanded' && renderExpandedActions()}
      {variant === 'construction' && renderConstructionActions()}
      {variant === 'government' && renderGovernmentActions()}
      {variant === 'default' && renderDefaultActions()}
      {variant === 'compact' && renderDefaultActions()}
      
      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Animated.View style={styles.loadingSpinner}>
            <Ionicons
              name="refresh"
              size={20}
              color={theme.colors.primary}
            />
          </Animated.View>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Processing...
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  defaultActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expandedActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  constructionActionsContainer: {
    gap: 12,
  },
  governmentActionsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 44,
    gap: 8,
    position: 'relative',
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    backgroundColor: 'transparent',
  },
  constructionAction: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  governmentAction: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  compactAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  compactActionText: {
    fontSize: 12,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreActionsButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: 'transparent',
    paddingHorizontal: 12,
  },
  moreActionsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingSpinner: {
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

// Add spin animation
StyleSheet.create({
  '@keyframes spin': {
    from: { transform: [{ rotate: '0deg' }] },
    to: { transform: [{ rotate: '360deg' }] },
  },
});

export default BookingActions;
export { ACTION_TYPES, ACTION_CONFIG };