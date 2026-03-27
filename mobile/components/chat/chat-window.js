// components/chat/chat-window.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
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

// Services
import { chatService } from '../../services/chat-service';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';

// Utils
import { formatTime, formatRelativeTime } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Chat Window Component
 * Real-time messaging for Ethiopian Home Services Platform
 * Supports service bookings, construction projects, and government communications
 */

const ChatWindow = ({
  // Chat data
  chatId,
  receiver,
  receiver: {
    id: receiverId,
    name: receiverName,
    avatar: receiverAvatar,
    userType,
    isOnline = false,
  } = {},
  
  // Booking/Project context
  booking = null,
  project = null,
  
  // Configuration
  showHeader = true,
  enableAttachments = true,
  enableCalls = false, // Future feature
  enableVideoCalls = false, // Future feature
  
  // Callbacks
  onClose,
  onBack,
  onInfoPress,
  
  // Styling
  style,
  testID = 'chat-window',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize chat
  useEffect(() => {
    initializeChat();
    
    return () => {
      cleanupChat();
    };
  }, [chatId, receiverId]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Load chat history
      const result = await chatService.getChatMessages(chatId || receiverId);
      
      if (result.success) {
        setMessages(result.data);
        scrollToBottom();
      } else {
        throw new Error(result.message);
      }
      
      // Initialize real-time connection
      initializeSocket();
      
      // Analytics
      analyticsService.trackEvent('chat_opened', {
        chatId: chatId || receiverId,
        receiverType: userType,
        hasBooking: !!booking,
        hasProject: !!project,
      });
      
    } catch (error) {
      console.error('Chat initialization error:', error);
      showError('Failed to load chat messages');
      
      errorService.captureError(error, {
        context: 'ChatInitialization',
        chatId: chatId || receiverId,
        receiverId,
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = () => {
    // Initialize socket connection for real-time messaging
    // This would connect to your WebSocket service
    const socket = chatService.initializeSocket();
    socketRef.current = socket;
    
    socket.on('new_message', (message) => {
      if (message.chatId === chatId || message.senderId === receiverId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        markAsRead([message.id]);
      }
    });
    
    socket.on('user_typing', (data) => {
      if (data.userId === receiverId) {
        setIsTyping(true);
      }
    });
    
    socket.on('user_stop_typing', (data) => {
      if (data.userId === receiverId) {
        setIsTyping(false);
      }
    });
    
    socket.on('message_read', (data) => {
      setMessages(prev => 
        prev.map(msg => 
          data.messageIds.includes(msg.id) ? { ...msg, read: true } : msg
        )
      );
    });
    
    // Join chat room
    socket.emit('join_chat', { 
      chatId: chatId || receiverId,
      userId: currentUser.id 
    });
  };

  const cleanupChat = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_chat', { 
        chatId: chatId || receiverId,
        userId: currentUser.id 
      });
      socketRef.current.disconnect();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleMessageChange = (text) => {
    setNewMessage(text);
    
    // Typing indicators
    if (text.trim() && socketRef.current) {
      socketRef.current.emit('typing', { 
        chatId: chatId || receiverId,
        userId: currentUser.id 
      });
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('stop_typing', { 
          chatId: chatId || receiverId,
          userId: currentUser.id 
        });
      }
    }, 1000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageData = {
      content: newMessage.trim(),
      receiverId,
      chatId: chatId || receiverId,
      type: 'text',
      metadata: {
        bookingId: booking?.id,
        projectId: project?.id,
        userType,
      },
    };

    try {
      setSending(true);
      
      // Optimistically add message to UI
      const tempMessage = {
        id: `temp-${Date.now()}`,
        ...messageData,
        senderId: currentUser.id,
        sender: currentUser,
        timestamp: new Date().toISOString(),
        status: 'sending',
        read: false,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Stop typing indicator
      if (socketRef.current) {
        socketRef.current.emit('stop_typing', { 
          chatId: chatId || receiverId,
          userId: currentUser.id 
        });
      }
      
      // Send message
      const result = await chatService.sendMessage(messageData);
      
      if (result.success) {
        // Replace temp message with actual message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...result.data, status: 'sent' }
              : msg
          )
        );
        
        // Emit via socket for real-time delivery
        if (socketRef.current) {
          socketRef.current.emit('send_message', result.data);
        }
        
        // Analytics
        analyticsService.trackEvent('message_sent', {
          chatId: chatId || receiverId,
          messageType: 'text',
          hasBooking: !!booking,
          hasProject: !!project,
        });
        
      } else {
        throw new Error(result.message);
      }
      
      scrollToBottom();
      
    } catch (error) {
      console.error('Send message error:', error);
      showError('Failed to send message');
      
      // Update message status to failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      
      errorService.captureError(error, {
        context: 'SendMessage',
        chatId: chatId || receiverId,
        receiverId,
      });
    } finally {
      setSending(false);
    }
  };

  const markAsRead = (messageIds) => {
    if (socketRef.current && messageIds.length > 0) {
      socketRef.current.emit('mark_read', {
        messageIds,
        chatId: chatId || receiverId,
        userId: currentUser.id,
      });
    }
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollButton(!isNearBottom);
    
    // Mark messages as read when scrolling near bottom
    if (isNearBottom) {
      const unreadMessages = messages.filter(
        msg => msg.senderId === receiverId && !msg.read
      );
      if (unreadMessages.length > 0) {
        markAsRead(unreadMessages.map(msg => msg.id));
      }
    }
  };

  const retrySendMessage = async (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    setNewMessage(message.content);
    await sendMessage();
    
    // Remove the failed message
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const showError = (message) => {
    Alert.alert('Error', message, [{ text: 'OK' }]);
  };

  // Render message item
  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.senderId === currentUser.id;
    const showAvatar = !isOwnMessage && (
      index === 0 || messages[index - 1]?.senderId !== item.senderId
    );

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.sentContainer : styles.receivedContainer,
      ]}>
        {showAvatar && (
          <Avatar
            source={receiverAvatar ? { uri: receiverAvatar } : null}
            name={receiverName}
            size="small"
            style={styles.avatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.sentBubble : styles.receivedBubble,
          item.status === 'sending' && styles.sendingBubble,
          item.status === 'failed' && styles.failedBubble,
        ]}>
          <ThemedText type="body">
            {item.content}
          </ThemedText>
          
          <View style={styles.messageFooter}>
            <ThemedText type="caption" color="tertiary">
              {formatTime(item.timestamp)}
            </ThemedText>
            
            {isOwnMessage && (
              <View style={styles.statusContainer}>
                {item.status === 'sending' && (
                  <Loading size="small" />
                )}
                {item.status === 'sent' && (
                  <Ionicons 
                    name={item.read ? "checkmark-done" : "checkmark"} 
                    size={12} 
                    color={theme.colors[item.read ? 'success' : 'textTertiary']} 
                  />
                )}
                {item.status === 'failed' && (
                  <TouchableOpacity onPress={() => retrySendMessage(item.id)}>
                    <Ionicons name="refresh" size={12} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
        
        {isOwnMessage && (
          <Avatar
            source={currentUser.avatar ? { uri: currentUser.avatar } : null}
            name={currentUser.name}
            size="small"
            style={styles.avatar}
          />
        )}
      </View>
    );
  };

  // Render chat header
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <View style={styles.headerContent}>
          {(onClose || onBack) && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onClose || onBack}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          
          <View style={styles.userInfo}>
            <Avatar
              source={receiverAvatar ? { uri: receiverAvatar } : null}
              name={receiverName}
              size="medium"
              status={isOnline ? 'online' : 'offline'}
            />
            <View style={styles.userDetails}>
              <ThemedText type="body" weight="semiBold">
                {receiverName}
              </ThemedText>
              <ThemedText type="caption" color="secondary">
                {isOnline ? 'Online' : 'Offline'}
                {isTyping && ' • Typing...'}
                {userType === 'provider' && ' • Service Provider'}
                {userType === 'government' && ' • Government'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.headerActions}>
            {enableCalls && (
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="call" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            )}
            {enableVideoCalls && (
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="videocam" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onInfoPress}
            >
              <Ionicons name="information-circle" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Booking/Project context */}
        {(booking || project) && (
          <View style={styles.contextBar}>
            {booking && (
              <ThemedText type="caption" color="secondary">
                Booking: {booking.service?.title} • {formatTime(booking.scheduledDate)}
              </ThemedText>
            )}
            {project && (
              <ThemedText type="caption" color="secondary">
                Project: {project.title} • {project.type}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={64}
        color={theme.colors.textTertiary}
      />
      <ThemedText type="title" weight="semiBold" style={styles.emptyTitle}>
        No messages yet
      </ThemedText>
      <ThemedText type="body" color="secondary" style={styles.emptySubtitle}>
        Start a conversation with {receiverName}
      </ThemedText>
    </View>
  );

  // Render input area
  const renderInputArea = () => (
    <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
      ]}>
        {enableAttachments && (
          <TouchableOpacity style={styles.attachmentButton}>
            <Ionicons name="attach" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        <TextInput
          style={[
            styles.input,
            { color: theme.colors.text }
          ]}
          value={newMessage}
          onChangeText={handleMessageChange}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity style={styles.emojiButton}>
          <Ionicons name="happy" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.sendButton,
          { backgroundColor: theme.colors.primary },
          (!newMessage.trim() || sending) && styles.sendButtonDisabled,
        ]}
        onPress={sendMessage}
        disabled={!newMessage.trim() || sending}
      >
        <Ionicons 
          name="send" 
          size={20} 
          color={newMessage.trim() && !sending ? "#FFFFFF" : theme.colors.textTertiary} 
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
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
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messageList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  contextBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  sentBubble: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  sendingBubble: {
    opacity: 0.7,
  },
  failedBubble: {
    backgroundColor: '#FEE2E2',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusContainer: {
    marginLeft: 8,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    padding: 0,
  },
  attachmentButton: {
    padding: 4,
    marginRight: 8,
  },
  emojiButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatWindow;

// Hook for using chat window
export const useChatWindow = (chatId, receiverId) => {
  const [state, setState] = useState({
    messages: [],
    loading: true,
    error: null,
  });

  const sendMessage = useCallback(async (content) => {
    try {
      const result = await chatService.sendMessage({
        content,
        receiverId,
        chatId,
        type: 'text',
      });

      if (result.success) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, result.data],
        }));
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }, [chatId, receiverId]);

  const loadMessages = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await chatService.getChatMessages(chatId || receiverId);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          messages: result.data,
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
  }, [chatId, receiverId]);

  return {
    ...state,
    sendMessage,
    loadMessages,
  };
};