// components/chat/chat.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';

// Components
import { ThemedText } from '../ui/themed-text';
import Avatar from '../ui/avatar';
import Loading from '../ui/loading';
import ChatHeader from './chat-header';
import MessageList from './message-list';
import InputArea from './input-area';

// Services
import { chatService } from '../../services/chat-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Hooks
import { useChat } from '../../hooks/use-chat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Main Chat Component
 * Ethiopian Home Services Platform - Real-time messaging
 * Supports service bookings, construction projects, and government communications
 */

const Chat = ({
  // Chat identification
  chatId,
  receiverId,
  
  // User information
  receiver,
  receiver: {
    id: receiverIdProp,
    name: receiverName,
    avatar: receiverAvatar,
    userType,
    isOnline = false,
    premiumBadge = false,
  } = {},
  
  // Context information
  booking = null,
  project = null,
  service = null,
  
  // Configuration
  showHeader = true,
  enableAttachments = true,
  enableCalls = false,
  enableVideoCalls = false,
  
  // Navigation
  onClose,
  onBack,
  onInfoPress,
  
  // Styling
  style,
  testID = 'chat',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  
  // Use the chat hook for state management
  const {
    messages,
    loading,
    sending,
    isTyping,
    onlineStatus,
    sendMessage,
    markAsRead,
    loadMoreMessages,
    hasMoreMessages,
  } = useChat(chatId || receiverId, receiverId);
  
  const [newMessage, setNewMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Final receiver ID from props or receiver object
  const finalReceiverId = receiverId || receiverIdProp;
  const finalReceiverName = receiverName || 'User';

  // Initialize analytics
  useEffect(() => {
    analyticsService.trackEvent('chat_opened', {
      chatId: chatId || finalReceiverId,
      receiverType: userType,
      hasBooking: !!booking,
      hasProject: !!project,
      hasService: !!service,
    });
  }, [chatId, finalReceiverId, userType, booking, project, service]);

  // Handle message input change with typing indicators
  const handleMessageChange = useCallback((text) => {
    setNewMessage(text);
    
    // Typing indicators
    if (text.trim() && !isTyping) {
      chatService.emitTypingStart(chatId || finalReceiverId, currentUser.id);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      chatService.emitTypingStop(chatId || finalReceiverId, currentUser.id);
    }, 1000);
  }, [chatId, finalReceiverId, currentUser.id, isTyping]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;

    try {
      const messageData = {
        content: newMessage.trim(),
        receiverId: finalReceiverId,
        chatId: chatId || finalReceiverId,
        type: 'text',
        metadata: {
          bookingId: booking?.id,
          projectId: project?.id,
          serviceId: service?.id,
          userType,
        },
      };

      await sendMessage(messageData);
      setNewMessage('');
      
      // Stop typing indicator
      chatService.emitTypingStop(chatId || finalReceiverId, currentUser.id);
      
    } catch (error) {
      console.error('Send message error:', error);
      showError('Failed to send message');
    }
  }, [newMessage, sending, finalReceiverId, chatId, booking, project, service, userType, sendMessage, currentUser.id]);

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollButton(!isNearBottom);
    
    // Mark messages as read when scrolling near bottom
    if (isNearBottom) {
      markAsRead();
    }
  }, [markAsRead]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Show error alert
  const showError = (message) => {
    Alert.alert('Error', message, [{ text: 'OK' }]);
  };

  // Handle attachment press
  const handleAttachmentPress = useCallback(() => {
    // Future implementation for file attachments
    Alert.alert('Coming Soon', 'File attachment feature will be available soon');
  }, []);

  // Handle emoji press
  const handleEmojiPress = useCallback(() => {
    // Future implementation for emoji picker
    Alert.alert('Coming Soon', 'Emoji picker will be available soon');
  }, []);

  // Handle call press
  const handleCallPress = useCallback(() => {
    if (!enableCalls) {
      Alert.alert('Coming Soon', 'Voice calls will be available in a future update');
      return;
    }
    // Future implementation for voice calls
  }, [enableCalls]);

  // Handle video call press
  const handleVideoCallPress = useCallback(() => {
    if (!enableVideoCalls) {
      Alert.alert('Coming Soon', 'Video calls will be available in a future update');
      return;
    }
    // Future implementation for video calls
  }, [enableVideoCalls]);

  // Handle info press
  const handleInfoPress = useCallback(() => {
    if (onInfoPress) {
      onInfoPress();
    } else {
      // Default info action
      if (booking) {
        router.push(`/bookings/${booking.id}`);
      } else if (project) {
        router.push(`/construction/${project.id}`);
      } else if (service) {
        router.push(`/services/${service.id}`);
      } else {
        router.push(`/profile/${finalReceiverId}`);
      }
    }
  }, [onInfoPress, booking, project, service, finalReceiverId, router]);

  // Render chat header
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <ChatHeader
        receiver={{
          id: finalReceiverId,
          name: finalReceiverName,
          avatar: receiverAvatar,
          userType,
          isOnline: onlineStatus,
          premiumBadge,
        }}
        context={{ booking, project, service }}
        onBack={onBack}
        onClose={onClose}
        onCallPress={handleCallPress}
        onVideoCallPress={handleVideoCallPress}
        onInfoPress={handleInfoPress}
        enableCalls={enableCalls}
        enableVideoCalls={enableVideoCalls}
        isTyping={isTyping}
      />
    );
  };

  // Render input area
  const renderInputArea = () => (
    <InputArea
      message={newMessage}
      onMessageChange={handleMessageChange}
      onSendMessage={handleSendMessage}
      onAttachmentPress={handleAttachmentPress}
      onEmojiPress={handleEmojiPress}
      sending={sending}
      enableAttachments={enableAttachments}
    />
  );

  if (loading && messages.length === 0) {
    return <Loading message="Loading chat..." />;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <MessageList
          ref={flatListRef}
          messages={messages}
          currentUserId={currentUser.id}
          receiver={{
            id: finalReceiverId,
            name: finalReceiverName,
            avatar: receiverAvatar,
          }}
          onScroll={handleScroll}
          onEndReached={loadMoreMessages}
          onContentSizeChange={scrollToBottom}
          hasMoreMessages={hasMoreMessages}
        />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <TouchableOpacity 
            style={[styles.scrollButton, { backgroundColor: theme.colors.primary }]}
            onPress={scrollToBottom}
          >
            <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

      {renderInputArea()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default Chat;

// Hook for using chat component
export const useChatComponent = (chatId, receiverId) => {
  const [state, setState] = useState({
    receiver: null,
    booking: null,
    project: null,
    service: null,
    loading: true,
  });

  const loadChatData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Load chat context data
      const [receiverResult, contextResult] = await Promise.all([
        chatService.getChatParticipant(receiverId),
        chatService.getChatContext(chatId || receiverId),
      ]);

      if (receiverResult.success && contextResult.success) {
        setState({
          receiver: receiverResult.data,
          booking: contextResult.data.booking,
          project: contextResult.data.project,
          service: contextResult.data.service,
          loading: false,
        });
      } else {
        throw new Error('Failed to load chat data');
      }
    } catch (error) {
      console.error('Load chat data error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
      }));
      throw error;
    }
  }, [chatId, receiverId]);

  return {
    ...state,
    loadChatData,
  };
};