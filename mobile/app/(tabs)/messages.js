import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { useLoading } from '../../contexts/loading-context';
import { 
  Button, 
  ButtonVariant,
  PrimaryButton,
  OutlineButton,
  IconButton 
} from '../../components/ui/button';
import Input, { SearchInput } from '../../components/ui/input';
import Loading from '../../components/ui/loading';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import ChatList from '../../components/chat/chat-list';
import MessageBubble from '../../components/chat/message-bubble';
import TypingIndicator from '../../components/chat/typing-indicator';
import { Collapsible } from '../../components/collapsible';
import { analyticsService } from '../../services/analytics-service';
import { errorService } from '../../services/error-service';
import { chatService } from '../../services/chat-service';
import { notificationService } from '../../services/notification-service';

// Message types
export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  BOOKING: 'booking',
  PAYMENT: 'payment',
};

// Conversation status
export const ConversationStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  BLOCKED: 'blocked',
};

// Mock conversations data - replace with API
const MOCK_CONVERSATIONS = [
  {
    id: '1',
    participant: {
      id: '1',
      name: 'SparkleClean Pro',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
      type: 'provider',
      verified: true,
      rating: 4.9,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    },
    lastMessage: {
      id: '101',
      content: 'Looking forward to cleaning your home tomorrow! Do you have any specific areas you want me to focus on?',
      type: MessageType.TEXT,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      isRead: true,
      isSender: false,
    },
    unreadCount: 0,
    booking: {
      id: '1',
      service: 'Deep Home Cleaning',
      date: '2024-01-15T10:00:00Z',
      status: 'confirmed',
    },
    status: ConversationStatus.ACTIVE,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    participant: {
      id: '2',
      name: 'FixIt Masters',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      type: 'provider',
      verified: true,
      rating: 4.8,
      isOnline: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    lastMessage: {
      id: '102',
      content: 'I can come by within 2 hours for the plumbing emergency. Please confirm if that works for you.',
      type: MessageType.TEXT,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      isRead: false,
      isSender: false,
    },
    unreadCount: 2,
    booking: {
      id: '2',
      service: 'Emergency Plumbing',
      date: '2024-01-16T14:00:00Z',
      status: 'pending',
    },
    status: ConversationStatus.ACTIVE,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    participant: {
      id: '3',
      name: 'CoolAir Experts',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
      type: 'provider',
      verified: true,
      rating: 4.7,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    },
    lastMessage: {
      id: '103',
      content: 'Thanks for the 5-star review! We appreciate your business.',
      type: MessageType.TEXT,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      isRead: true,
      isSender: false,
    },
    unreadCount: 0,
    booking: {
      id: '3',
      service: 'AC Installation',
      date: '2024-01-12T09:00:00Z',
      status: 'completed',
    },
    status: ConversationStatus.ACTIVE,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    participant: {
      id: '5',
      name: 'Nail Studio Elite',
      avatar: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1bf',
      type: 'provider',
      verified: true,
      rating: 4.9,
      isOnline: false,
      lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    lastMessage: {
      id: '104',
      content: 'Your appointment is confirmed for tomorrow at 3 PM. See you then! 🎉',
      type: MessageType.TEXT,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      isRead: true,
      isSender: false,
    },
    unreadCount: 0,
    booking: {
      id: '4',
      service: 'Professional Manicure',
      date: '2024-01-18T15:00:00Z',
      status: 'in_progress',
    },
    status: ConversationStatus.ACTIVE,
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock messages for active conversation
const MOCK_MESSAGES = [
  {
    id: '1',
    content: 'Hi! I need help with a leaking kitchen sink.',
    type: MessageType.TEXT,
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    isRead: true,
    isSender: true,
  },
  {
    id: '2',
    content: 'Hello! Sorry to hear about the leak. I can come by within 2 hours for the plumbing emergency.',
    type: MessageType.TEXT,
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    isRead: true,
    isSender: false,
  },
  {
    id: '3',
    content: 'That would be great! The sink is leaking from under the counter.',
    type: MessageType.TEXT,
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    isRead: true,
    isSender: true,
  },
  {
    id: '4',
    content: 'I have the necessary tools for that. Please confirm if 2 hours from now works for you?',
    type: MessageType.TEXT,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isRead: false,
    isSender: false,
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [filteredConversations, setFilteredConversations] = useState(MOCK_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set(['1', '3']));
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'bookings'

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const messagesEndRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      startAnimations();
      setupRealTimeListeners();
      
      // Track screen view
      analyticsService.trackScreenView('messages', {
        user_id: user?.id,
        has_active_conversation: !!activeConversation,
      });

      return () => {
        // Cleanup real-time listeners
        cleanupRealTimeListeners();
      };
    }, [user, activeConversation])
  );

  // Filter conversations when criteria change
  useEffect(() => {
    applyFilters();
  }, [conversations, searchQuery, activeTab]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && activeConversation) {
      scrollToBottom();
    }
  }, [messages, activeConversation]);

  // Initial animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Setup real-time listeners
  const setupRealTimeListeners = () => {
    // Subscribe to new messages
    chatService.subscribeToMessages((message) => {
      handleNewMessage(message);
    });

    // Subscribe to typing indicators
    chatService.subscribeToTyping((data) => {
      handleTypingIndicator(data);
    });

    // Subscribe to user presence
    chatService.subscribeToPresence((data) => {
      handleUserPresence(data);
    });
  };

  // Cleanup real-time listeners
  const cleanupRealTimeListeners = () => {
    chatService.unsubscribeFromMessages();
    chatService.unsubscribeFromTyping();
    chatService.unsubscribeFromPresence();
  };

  // Load conversations data
  const loadConversations = async () => {
    try {
      const conversationsData = await chatService.getConversations(user.id);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
      errorService.captureError(error, { context: 'MessagesScreen' });
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    try {
      const messagesData = await chatService.getMessages(conversationId);
      setMessages(messagesData);
      
      // Mark messages as read
      await chatService.markAsRead(conversationId, user.id);
    } catch (error) {
      console.error('Error loading messages:', error);
      errorService.captureError(error, { 
        context: 'LoadMessages',
        conversation_id: conversationId,
      });
    }
  };

  // Apply filters to conversations
  const applyFilters = () => {
    let filtered = [...conversations];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(conversation =>
        conversation.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.booking.service.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tab filter
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'bookings':
        filtered = filtered.filter(conv => 
          ['pending', 'confirmed', 'in_progress'].includes(conv.booking.status)
        );
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Sort by last message timestamp (most recent first)
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    setFilteredConversations(filtered);
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConversations();
      if (activeConversation) {
        await loadMessages(activeConversation.id);
      }
      analyticsService.trackEvent('messages_refresh', {
        has_active_conversation: !!activeConversation,
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeConversation]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  // Handle new incoming message
  const handleNewMessage = (message) => {
    if (message.conversationId === activeConversation?.id) {
      // Add to current conversation
      setMessages(prev => [...prev, message]);
      
      // Mark as read
      chatService.markAsRead(activeConversation.id, user.id);
    } else {
      // Update conversation list with new message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === message.conversationId 
            ? {
                ...conv,
                lastMessage: message,
                unreadCount: conv.id === activeConversation?.id ? 0 : conv.unreadCount + 1,
                updatedAt: message.timestamp,
              }
            : conv
        )
      );

      // Show notification for new message
      if (message.conversationId !== activeConversation?.id) {
        notificationService.showMessageNotification(message);
      }
    }
  };

  // Handle typing indicators
  const handleTypingIndicator = (data) => {
    if (data.conversationId === activeConversation?.id && data.userId !== user.id) {
      setIsTyping(true);
      
      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  };

  // Handle user presence updates
  const handleUserPresence = (data) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      if (data.isOnline) {
        newSet.add(data.userId);
      } else {
        newSet.delete(data.userId);
      }
      return newSet;
    });
  };

  // Navigation and action handlers
  const handleConversationSelect = async (conversation) => {
    setActiveConversation(conversation);
    await loadMessages(conversation.id);
    
    analyticsService.trackEvent('conversation_open', {
      conversation_id: conversation.id,
      provider_id: conversation.participant.id,
      booking_id: conversation.booking.id,
    });
  };

  const handleBackToList = () => {
    setActiveConversation(null);
    setMessages([]);
    setIsTyping(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    const messageData = {
      conversationId: activeConversation.id,
      content: newMessage.trim(),
      type: MessageType.TEXT,
      isSender: true,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    try {
      // Optimistically add message to UI
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');

      // Send message via service
      await chatService.sendMessage(
        activeConversation.id,
        newMessage.trim(),
        MessageType.TEXT
      );

      // Update conversation list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === activeConversation.id
            ? {
                ...conv,
                lastMessage: messageData,
                updatedAt: messageData.timestamp,
              }
            : conv
        )
      );

      analyticsService.trackEvent('message_sent', {
        conversation_id: activeConversation.id,
        message_length: newMessage.length,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      errorService.captureError(error, {
        context: 'SendMessage',
        conversation_id: activeConversation.id,
      });
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== messageData.id));
      Alert.alert('Send Failed', 'Unable to send message. Please try again.');
    }
  };

  const handleTypingStart = () => {
    if (activeConversation) {
      chatService.sendTypingIndicator(activeConversation.id, user.id, true);
    }
  };

  const handleTypingEnd = () => {
    if (activeConversation) {
      chatService.sendTypingIndicator(activeConversation.id, user.id, false);
    }
  };

  const handleCallProvider = () => {
    if (activeConversation) {
      analyticsService.trackEvent('provider_call', {
        provider_id: activeConversation.participant.id,
        conversation_id: activeConversation.id,
      });
      
      Alert.alert(
        'Call Provider',
        `Call ${activeConversation.participant.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // Implement calling functionality
            console.log('Calling provider:', activeConversation.participant.name);
          }},
        ]
      );
    }
  };

  const handleViewBooking = () => {
    if (activeConversation) {
      router.push(`/(bookings)/${activeConversation.booking.id}`);
    }
  };

  const handleArchiveConversation = (conversationId) => {
    Alert.alert(
      'Archive Conversation',
      'Are you sure you want to archive this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.archiveConversation(conversationId);
              setConversations(prev => 
                prev.filter(conv => conv.id !== conversationId)
              );
              
              if (activeConversation?.id === conversationId) {
                handleBackToList();
              }

              analyticsService.trackEvent('conversation_archived', {
                conversation_id: conversationId,
              });
            } catch (error) {
              console.error('Error archiving conversation:', error);
            }
          },
        },
      ]
    );
  };

  // Render conversation list view
  const renderConversationList = () => (
    <Animated.View 
      style={[
        styles.conversationList,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
          style={styles.searchInput}
        />
        
        <View style={styles.tabContainer}>
          {['all', 'unread', 'bookings'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && [
                  styles.tabActive,
                  { backgroundColor: theme.colors.primary }
                ],
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Conversations List */}
      <ChatList
        conversations={filteredConversations}
        onConversationSelect={handleConversationSelect}
        onArchiveConversation={handleArchiveConversation}
        onlineUsers={onlineUsers}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Empty State */}
      {filteredConversations.length === 0 && (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyIcon, { fontSize: 64 }]}>
            💬
          </ThemedText>
          <ThemedText type="title" style={styles.emptyTitle}>
            No conversations
          </ThemedText>
          <ThemedText type="default" style={styles.emptyDescription}>
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : 'Your conversations with service providers will appear here.'
            }
          </ThemedText>
          {!searchQuery && (
            <PrimaryButton
              title="Book a Service"
              onPress={() => router.push('/(services)/search')}
              style={styles.emptyButton}
            />
          )}
        </View>
      )}
    </Animated.View>
  );

  // Render active conversation view
  const renderActiveConversation = () => {
    if (!activeConversation) return null;

    return (
      <View style={styles.conversationView}>
        {/* Conversation Header */}
        <View style={styles.conversationHeader}>
          <IconButton
            icon="←"
            onPress={handleBackToList}
            accessibilityLabel="Back to conversations"
          />
          
          <TouchableOpacity 
            style={styles.headerInfo}
            onPress={() => router.push(`/(profile)/provider/${activeConversation.participant.id}`)}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: activeConversation.participant.avatar }}
                style={styles.avatar}
              />
              {onlineUsers.has(activeConversation.participant.id) && (
                <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]} />
              )}
            </View>
            
            <View style={styles.headerText}>
              <ThemedText type="subtitle" style={styles.providerName}>
                {activeConversation.participant.name}
              </ThemedText>
              <ThemedText type="caption" style={styles.providerStatus}>
                {onlineUsers.has(activeConversation.participant.id) ? 'Online' : 'Offline'}
              </ThemedText>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <IconButton
              icon="📞"
              onPress={handleCallProvider}
              accessibilityLabel="Call provider"
            />
            <IconButton
              icon="📅"
              onPress={handleViewBooking}
              accessibilityLabel="View booking"
            />
          </View>
        </View>

        {/* Messages Area */}
        <View style={styles.messagesContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Booking Info */}
            <View style={styles.bookingInfo}>
              <ThemedText type="caption" style={styles.bookingService}>
                {activeConversation.booking.service}
              </ThemedText>
              <ThemedText type="caption" style={styles.bookingDate}>
                {new Date(activeConversation.booking.date).toLocaleDateString()} • 
                {new Date(activeConversation.booking.date).toLocaleTimeString()}
              </ThemedText>
              <View style={[
                styles.bookingStatus,
                { backgroundColor: getStatusColor(activeConversation.booking.status) }
              ]}>
                <ThemedText type="caption" style={styles.bookingStatusText}>
                  {activeConversation.booking.status}
                </ThemedText>
              </View>
            </View>

            {/* Messages */}
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isConsecutive={index > 0 && messages[index - 1].isSender === message.isSender}
                showAvatar={!message.isSender && (
                  index === messages.length - 1 || 
                  messages[index + 1]?.isSender !== message.isSender
                )}
                avatar={activeConversation.participant.avatar}
              />
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <TypingIndicator />
            )}

            <View ref={messagesEndRef} />
          </ScrollView>
        </View>

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={newMessage}
              onChangeText={setNewMessage}
              onChange={handleTypingStart}
              onBlur={handleTypingEnd}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.placeholder}
              multiline
              maxLength={1000}
            />
            <IconButton
              icon="📤"
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
              accessibilityLabel="Send message"
              style={styles.sendButton}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  // Helper function for status colors
  const getStatusColor = (status) => {
    const colors = {
      pending: theme.colors.warning + '40',
      confirmed: theme.colors.success + '40',
      in_progress: theme.colors.primary + '40',
      completed: theme.colors.success + '40',
      cancelled: theme.colors.error + '40',
    };
    return colors[status] || theme.colors.neutral[200];
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Messages',
          headerShown: true,
          headerRight: () => (
            <IconButton
              icon="🔍"
              onPress={() => router.push('/(services)/search')}
              accessibilityLabel="Find Services"
              size="small"
            />
          ),
        }} 
      />

      {activeConversation ? renderActiveConversation() : renderConversationList()}
    </ThemedView>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  conversationList: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInput: {
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontWeight: '500',
    fontSize: 12,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 160,
  },
  conversationView: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  providerName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  providerStatus: {
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  bookingInfo: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    marginBottom: 20,
  },
  bookingService: {
    fontWeight: '600',
    marginBottom: 4,
  },
  bookingDate: {
    opacity: 0.7,
    marginBottom: 8,
  },
  bookingStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookingStatusText: {
    fontWeight: '500',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
  },
};

// Note: You'll need to implement the Image import and additional components
// like ChatList, MessageBubble, and TypingIndicator