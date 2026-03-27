// components/chat/message-bubble.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

// Components
import { ThemedText } from '../ui/themed-text';
import Avatar from '../ui/avatar';
import Badge from '../ui/badge';

// Utils
import { formatTime, formatRelativeTime } from '../../utils/formatters';

/**
 * Message Bubble Component
 * Ethiopian Home Services Platform - Rich message types
 * Supports booking updates, construction projects, and payment notifications
 */

// Message types configuration
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  SYSTEM: 'system',
  BOOKING: 'booking',
  PAYMENT: 'payment',
  CONSTRUCTION: 'construction',
  LOCATION: 'location',
  FILE: 'file',
};

// Message status types
const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
};

const MessageBubble = ({
  // Message data
  message,
  message: {
    id,
    type = MESSAGE_TYPES.TEXT,
    content,
    sender,
    timestamp,
    status = MESSAGE_STATUS.SENT,
    metadata = {},
    reactions = [],
  },
  
  // Configuration
  isOwnMessage = false,
  showAvatar = true,
  showStatus = true,
  showTimestamp = true,
  consecutive = false,
  chatType = 'direct', // 'direct', 'group'
  
  // Callbacks
  onPress,
  onLongPress,
  onReply,
  onCopy,
  onDelete,
  onReact,
  onBookingPress,
  onPaymentPress,
  onConstructionPress,
  
  // Styling
  style,
  testID = 'message-bubble',
}) => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  
  const [isPressed, setIsPressed] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Memoized message configuration
  const messageConfig = useMemo(() => {
    const isSystem = type === MESSAGE_TYPES.SYSTEM;
    const isSpecial = [
      MESSAGE_TYPES.BOOKING,
      MESSAGE_TYPES.PAYMENT,
      MESSAGE_TYPES.CONSTRUCTION,
      MESSAGE_TYPES.LOCATION
    ].includes(type);

    // Bubble styling based on type and ownership
    const getBubbleStyle = () => {
      if (isSystem) {
        return {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          alignSelf: 'center',
        };
      }

      const baseStyle = {
        backgroundColor: isOwnMessage ? theme.colors.primary : theme.colors.card,
        borderColor: isOwnMessage ? theme.colors.primary : theme.colors.border,
      };

      // Special message types
      switch (type) {
        case MESSAGE_TYPES.BOOKING:
          return {
            ...baseStyle,
            backgroundColor: isOwnMessage ? '#E3F2FD' : '#F3E5F5',
            borderColor: isOwnMessage ? '#BBDEFB' : '#E1BEE7',
          };
        case MESSAGE_TYPES.PAYMENT:
          return {
            ...baseStyle,
            backgroundColor: isOwnMessage ? '#E8F5E8' : '#FFF3E0',
            borderColor: isOwnMessage ? '#C8E6C9' : '#FFE0B2',
          };
        case MESSAGE_TYPES.CONSTRUCTION:
          return {
            ...baseStyle,
            backgroundColor: isOwnMessage ? '#FFF3E0' : '#E3F2FD',
            borderColor: isOwnMessage ? '#FFE0B2' : '#BBDEFB',
          };
        case MESSAGE_TYPES.LOCATION:
          return {
            ...baseStyle,
            backgroundColor: isOwnMessage ? '#E3F2FD' : '#E8F5E8',
            borderColor: isOwnMessage ? '#BBDEFB' : '#C8E6C9',
          };
        default:
          return baseStyle;
      }
    };

    // Text styling
    const getTextStyle = () => ({
      color: isSystem 
        ? theme.colors.textSecondary 
        : (isOwnMessage ? '#FFFFFF' : theme.colors.text),
      fontSize: isSystem ? 12 : 16,
      fontWeight: isSystem ? '500' : '400',
    });

    // Status icon
    const getStatusIcon = () => {
      if (!isOwnMessage || !showStatus) return null;

      const iconProps = {
        size: 12,
        color: theme.colors.textTertiary,
      };

      switch (status) {
        case MESSAGE_STATUS.SENDING:
          return <Ionicons name="time-outline" {...iconProps} />;
        case MESSAGE_STATUS.SENT:
          return <Ionicons name="checkmark" {...iconProps} />;
        case MESSAGE_STATUS.DELIVERED:
          return <Ionicons name="checkmark-done" {...iconProps} />;
        case MESSAGE_STATUS.READ:
          return <Ionicons name="checkmark-done" {...iconProps} color={theme.colors.success} />;
        case MESSAGE_STATUS.FAILED:
          return <Ionicons name="warning" {...iconProps} color={theme.colors.error} />;
        default:
          return null;
      }
    };

    // Avatar display logic
    const shouldShowAvatar = showAvatar && 
      !isOwnMessage && 
      !consecutive && 
      chatType !== 'direct' &&
      !isSystem;

    return {
      bubbleStyle: getBubbleStyle(),
      textStyle: getTextStyle(),
      statusIcon: getStatusIcon(),
      shouldShowAvatar,
      isSystem,
      isSpecial,
    };
  }, [message, isOwnMessage, consecutive, theme, showAvatar, showStatus, chatType]);

  // Handle press events
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(message);
    }
  }, [onPress, message]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (onLongPress) {
      onLongPress(message);
    } else {
      showMessageActions();
    }
  }, [onLongPress, message]);

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Show message action sheet
  const showMessageActions = useCallback(() => {
    const options = ['Copy Text', 'Reply', 'Forward', 'Cancel'];
    const cancelIndex = 3;

    // Add delete option for own messages
    if (isOwnMessage) {
      options.splice(2, 0, 'Delete');
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: isOwnMessage ? 2 : undefined,
        },
        (buttonIndex) => {
          handleActionSelection(buttonIndex);
        }
      );
    } else {
      const alertOptions = [
        { text: 'Copy Text', onPress: () => handleActionSelection(0) },
        { text: 'Reply', onPress: () => handleActionSelection(1) },
      ];

      if (isOwnMessage) {
        alertOptions.push({ 
          text: 'Delete', 
          onPress: () => handleActionSelection(2),
          style: 'destructive',
        });
        alertOptions.push({ text: 'Forward', onPress: () => handleActionSelection(3) });
      } else {
        alertOptions.push({ text: 'Forward', onPress: () => handleActionSelection(2) });
      }

      alertOptions.push({ 
        text: 'Cancel', 
        style: 'cancel',
      });

      Alert.alert('Message Actions', undefined, alertOptions);
    }
  }, [message, isOwnMessage]);

  // Handle action selection
  const handleActionSelection = useCallback(async (index) => {
    switch (index) {
      case 0: // Copy
        await handleCopy();
        break;
      case 1: // Reply
        if (onReply) onReply(message);
        break;
      case 2: // Delete or Forward
        if (isOwnMessage) {
          if (onDelete) onDelete(message);
        } else {
          // Handle forward logic
        }
        break;
      case 3: // Forward (for own messages)
        if (isOwnMessage) {
          // Handle forward logic
        }
        break;
      default:
        break;
    }
  }, [message, isOwnMessage, onReply, onDelete]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(content);
      if (onCopy) onCopy(message);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to copy message:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [content, message, onCopy]);

  // Render message content based on type
  const renderMessageContent = () => {
    switch (type) {
      case MESSAGE_TYPES.TEXT:
        return renderTextMessage();
      case MESSAGE_TYPES.SYSTEM:
        return renderSystemMessage();
      case MESSAGE_TYPES.BOOKING:
        return renderBookingMessage();
      case MESSAGE_TYPES.PAYMENT:
        return renderPaymentMessage();
      case MESSAGE_TYPES.CONSTRUCTION:
        return renderConstructionMessage();
      case MESSAGE_TYPES.IMAGE:
        return renderImageMessage();
      case MESSAGE_TYPES.LOCATION:
        return renderLocationMessage();
      default:
        return renderTextMessage();
    }
  };

  // Render text message
  const renderTextMessage = () => (
    <View style={styles.textContent}>
      <ThemedText 
        style={[styles.messageText, messageConfig.textStyle]}
        selectable={true}
      >
        {content}
      </ThemedText>

      {reactions.length > 0 && (
        <View style={styles.reactionsContainer}>
          {reactions.map((reaction, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.reactionBubble, { backgroundColor: theme.colors.card }]}
              onPress={() => onReact && onReact(message, reaction.emoji)}
            >
              <ThemedText type="caption">{reaction.emoji}</ThemedText>
              {reaction.count > 1 && (
                <ThemedText type="caption" color="secondary" style={styles.reactionCount}>
                  {reaction.count}
                </ThemedText>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Render system message
  const renderSystemMessage = () => (
    <View style={styles.systemContent}>
      <Ionicons 
        name="information-circle-outline" 
        size={14} 
        color={theme.colors.textSecondary}
        style={styles.systemIcon}
      />
      <ThemedText type="caption" color="secondary">
        {content}
      </ThemedText>
    </View>
  );

  // Render booking message
  const renderBookingMessage = () => (
    <TouchableOpacity 
      style={styles.specialContent}
      onPress={() => onBookingPress?.(metadata.bookingId)}
    >
      <View style={styles.specialHeader}>
        <MaterialIcons name="event" size={16} color={theme.colors.primary} />
        <ThemedText type="body" weight="semiBold">
          Booking Update
        </ThemedText>
      </View>
      <ThemedText type="body">
        {content}
      </ThemedText>
      {metadata.bookingId && (
        <View style={styles.actionButton}>
          <ThemedText type="caption" color="primary" weight="medium">
            View Booking
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render payment message
  const renderPaymentMessage = () => (
    <TouchableOpacity 
      style={styles.specialContent}
      onPress={() => onPaymentPress?.(metadata.paymentId)}
    >
      <View style={styles.specialHeader}>
        <MaterialIcons 
          name="payment" 
          size={16} 
          color={isOwnMessage ? theme.colors.success : theme.colors.warning} 
        />
        <ThemedText type="body" weight="semiBold">
          Payment {metadata.paymentStatus || 'Update'}
        </ThemedText>
      </View>
      <ThemedText type="body">
        {content}
      </ThemedText>
      {metadata.amount && (
        <ThemedText type="title" weight="semiBold" style={styles.amountText}>
          {metadata.amount} ETB
        </ThemedText>
      )}
    </TouchableOpacity>
  );

  // Render construction message
  const renderConstructionMessage = () => (
    <TouchableOpacity 
      style={styles.specialContent}
      onPress={() => onConstructionPress?.(metadata.projectId)}
    >
      <View style={styles.specialHeader}>
        <MaterialIcons name="construction" size={16} color={theme.colors.warning} />
        <ThemedText type="body" weight="semiBold">
          Construction Update
        </ThemedText>
      </View>
      <ThemedText type="body">
        {content}
      </ThemedText>
      {metadata.projectType && (
        <Badge variant="outline" color="warning" size="small">
          {metadata.projectType}
        </Badge>
      )}
    </TouchableOpacity>
  );

  // Render image message
  const renderImageMessage = () => (
    <View style={styles.imageContent}>
      <ThemedText type="caption" color="secondary">
        📷 Photo
      </ThemedText>
      <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.border }]}>
        <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
      </View>
    </View>
  );

  // Render location message
  const renderLocationMessage = () => (
    <TouchableOpacity style={styles.specialContent}>
      <View style={styles.specialHeader}>
        <MaterialIcons name="location-on" size={16} color={theme.colors.primary} />
        <ThemedText type="body" weight="semiBold">
          Location Shared
        </ThemedText>
      </View>
      <ThemedText type="body">
        {metadata.address || 'Shared location'}
      </ThemedText>
      <View style={styles.actionButton}>
        <ThemedText type="caption" color="primary" weight="medium">
          View on Map
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render avatar
  const renderAvatar = () => {
    if (!messageConfig.shouldShowAvatar) return null;

    return (
      <View style={styles.avatarContainer}>
        <Avatar
          source={sender?.avatar ? { uri: sender.avatar } : null}
          name={sender?.name}
          size="small"
        />
      </View>
    );
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    if (!isOwnMessage || !showStatus) return null;

    return (
      <View style={styles.statusContainer}>
        {messageConfig.statusIcon}
      </View>
    );
  };

  // Render timestamp
  const renderTimestamp = () => {
    if (!showTimestamp || messageConfig.isSystem) return null;

    return (
      <ThemedText type="caption" color="tertiary" style={styles.timestamp}>
        {formatTime(timestamp)}
      </ThemedText>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
        isOwnMessage ? styles.ownContainer : styles.otherContainer,
        consecutive && styles.consecutiveContainer,
        messageConfig.isSystem && styles.systemContainer,
        style,
      ]}
      testID={testID}
    >
      {renderAvatar()}
      
      <View style={[
        styles.contentContainer,
        isOwnMessage ? styles.ownContent : styles.otherContent,
      ]}>
        {!isOwnMessage && chatType === 'group' && !consecutive && (
          <ThemedText type="caption" color="secondary" style={styles.senderName}>
            {sender?.name}
          </ThemedText>
        )}
        
        <TouchableOpacity
          style={[
            styles.bubble,
            messageConfig.bubbleStyle,
            isPressed && styles.bubblePressed,
            messageConfig.isSystem && styles.systemBubble,
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          {renderMessageContent()}
        </TouchableOpacity>

        <View style={[
          styles.footer,
          isOwnMessage ? styles.ownFooter : styles.otherFooter,
        ]}>
          {renderTimestamp()}
          {renderStatusIndicator()}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  systemContainer: {
    justifyContent: 'center',
  },
  consecutiveContainer: {
    marginTop: -4,
  },
  contentContainer: {
    maxWidth: '80%',
    flexShrink: 1,
  },
  ownContent: {
    alignItems: 'flex-end',
  },
  otherContent: {
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  senderName: {
    marginBottom: 2,
    marginLeft: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  bubblePressed: {
    opacity: 0.8,
  },
  systemBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '90%',
  },
  textContent: {
    flex: 1,
  },
  messageText: {
    lineHeight: 20,
  },
  systemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemIcon: {
    marginRight: 6,
  },
  specialContent: {
    minWidth: 200,
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginTop: 8,
  },
  amountText: {
    marginTop: 4,
  },
  imageContent: {
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 200,
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    gap: 2,
  },
  reactionCount: {
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    gap: 4,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  otherFooter: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default MessageBubble;
export { MESSAGE_TYPES, MESSAGE_STATUS };