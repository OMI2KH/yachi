// components/chat/chat-list.js
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

// Components
import { ThemedText } from '../ui/themed-text';
import Avatar from '../ui/avatar';
import Badge from '../ui/badge';

// Services
import { chatService } from '../../services/chat-service';
import { analyticsService } from '../../services/analytics-service';

// Utils
import { formatRelativeTime, formatMessagePreview } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Chat List Component
 * Ethiopian Home Services Platform - Real-time messaging
 * Supports service provider, client, and construction project chats
 */

const ChatList = ({
  // Data
  conversations = [],
  
  // Configuration
  showSearch = true,
  showFilters = true,
  listType = 'all', // 'all', 'unread', 'archived'
  enableSelection = true,
  
  // States
  loading = false,
  refreshing = false,
  hasMore = false,
  
  // Callbacks
  onConversationPress,
  onConversationLongPress,
  onRefresh,
  onLoadMore,
  onSearch,
  onArchive,
  onDelete,
  onMarkAsRead,
  
  // Styling
  style,
  testID = 'chat-list',
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const flatListRef = useRef(null);
  const searchInputRef = useRef(null);

  // Available filters
  const AVAILABLE_FILTERS = useMemo(() => [
    { key: 'unread', label: 'Unread', icon: 'mail-unread' },
    { key: 'bookings', label: 'Bookings', icon: 'calendar' },
    { key: 'construction', label: 'Construction', icon: 'construct' },
    { key: 'government', label: 'Government', icon: 'business' },
  ], []);

  // Filter and search conversations
  useEffect(() => {
    let results = conversations;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(conversation => 
        conversation.name?.toLowerCase().includes(query) ||
        conversation.lastMessage?.text?.toLowerCase().includes(query) ||
        conversation.participants?.some(p => 
          p.name?.toLowerCase().includes(query) && p.id !== currentUser?.id
        )
      );
    }
    
    // Apply active filters
    if (activeFilters.length > 0) {
      results = results.filter(conversation => {
        return activeFilters.every(filter => {
          switch (filter) {
            case 'unread':
              return conversation.unreadCount > 0;
            case 'bookings':
              return conversation.bookingId != null;
            case 'construction':
              return conversation.projectType === 'construction';
            case 'government':
              return conversation.userType === 'government';
            default:
              return true;
          }
        });
      });
    }
    
    // Sort conversations: unread first, then by last message time
    results.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.lastMessage?.timestamp || b.updatedAt) - 
             new Date(a.lastMessage?.timestamp || a.updatedAt);
    });
    
    setFilteredConversations(results);
  }, [conversations, searchQuery, activeFilters, currentUser]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onRefresh]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (onLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  // Handle conversation press
  const handleConversationPress = useCallback((conversation) => {
    if (isSelectionMode && enableSelection) {
      // Toggle selection
      const newSelected = new Set(selectedConversations);
      if (newSelected.has(conversation.id)) {
        newSelected.delete(conversation.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        newSelected.add(conversation.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setSelectedConversations(newSelected);
      
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else if (onConversationPress) {
      onConversationPress(conversation);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Default navigation
      router.push(`/messages/${conversation.id}`);
    }

    // Analytics
    analyticsService.trackEvent('chat_conversation_opened', {
      conversationId: conversation.id,
      type: conversation.type,
      hasUnread: conversation.unreadCount > 0,
    });
  }, [isSelectionMode, selectedConversations, onConversationPress, router, enableSelection]);

  // Handle conversation long press
  const handleConversationLongPress = useCallback((conversation) => {
    if (onConversationLongPress) {
      onConversationLongPress(conversation);
    } else if (enableSelection) {
      // Enter selection mode
      setIsSelectionMode(true);
      setSelectedConversations(new Set([conversation.id]));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      // Show context menu
      showContextMenu(conversation);
    }
  }, [onConversationLongPress, enableSelection]);

  // Show context menu
  const showContextMenu = useCallback((conversation) => {
    Alert.alert(
      conversation.name,
      'Choose an action:',
      [
        { text: 'Mark as Read', onPress: () => onMarkAsRead?.([conversation.id]) },
        { text: 'Archive', onPress: () => onArchive?.([conversation.id]) },
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.([conversation.id]) },
      ]
    );
  }, [onMarkAsRead, onArchive, onDelete]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedConversations(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Toggle filter
  const toggleFilter = useCallback((filterKey) => {
    setActiveFilters(prev => {
      if (prev.includes(filterKey)) {
        return prev.filter(f => f !== filterKey);
      } else {
        return [...prev, filterKey];
      }
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Render conversation item
  const renderConversationItem = useCallback(({ item: conversation, index }) => {
    const isSelected = selectedConversations.has(conversation.id);
    const isUnread = conversation.unreadCount > 0;
    const isTyping = conversation.typingUsers && conversation.typingUsers.length > 0;

    // Get other participant for direct chats
    const otherParticipant = conversation.type === 'direct' 
      ? conversation.participants?.find(p => p.id !== currentUser?.id)
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          {
            backgroundColor: isSelected 
              ? theme.colors.primary + '20' 
              : theme.colors.card,
          },
        ]}
        onPress={() => handleConversationPress(conversation)}
        onLongPress={() => handleConversationLongPress(conversation)}
        delayLongPress={500}
        activeOpacity={0.7}
        accessibilityLabel={`Conversation with ${conversation.name}. ${isUnread ? `${conversation.unreadCount} unread messages.` : ''} ${isTyping ? 'User is typing.' : ''}`}
        accessibilityRole="button"
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Avatar
            source={conversation.avatar ? { uri: conversation.avatar } : null}
            name={conversation.name}
            size="medium"
            status={otherParticipant?.isOnline ? 'online' : 'offline'}
          />
          
          {/* Conversation type badge */}
          {conversation.bookingId && (
            <Badge
              variant="outline"
              color="primary"
              size="small"
              style={styles.typeBadge}
            >
              Booking
            </Badge>
          )}
          
          {conversation.projectType === 'construction' && (
            <Badge
              variant="outline"
              color="warning"
              size="small"
              style={styles.typeBadge}
              icon="construction"
            >
              Construction
            </Badge>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <ThemedText 
              type="body" 
              weight={isUnread ? 'semiBold' : 'regular'}
              numberOfLines={1}
              style={styles.conversationName}
            >
              {conversation.name}
            </ThemedText>
            
            <View style={styles.headerRight}>
              <ThemedText type="caption" color="tertiary">
                {formatRelativeTime(conversation.lastMessage?.timestamp || conversation.updatedAt)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.messageRow}>
            {isTyping ? (
              <View style={styles.typingContainer}>
                <ThemedText type="caption" color="primary">
                  typing...
                </ThemedText>
                <ActivityIndicator 
                  size="small" 
                  color={theme.colors.primary}
                  style={styles.typingIndicator}
                />
              </View>
            ) : (
              <ThemedText 
                type="caption" 
                color={isUnread ? 'default' : 'secondary'}
                weight={isUnread ? 'medium' : 'regular'}
                numberOfLines={1}
                style={styles.lastMessage}
              >
                {formatMessagePreview(conversation.lastMessage, conversation, currentUser)}
              </ThemedText>
            )}
            
            {/* Unread count badge */}
            {isUnread && (
              <Badge
                variant="filled"
                color="primary"
                size="small"
              >
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Badge>
            )}
          </View>
        </View>

        {/* Selection indicator */}
        {isSelectionMode && enableSelection && (
          <View style={styles.selectionIndicator}>
            <View
              style={[
                styles.selectionCircle,
                {
                  borderColor: theme.colors.primary,
                  backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [
    theme,
    selectedConversations,
    isSelectionMode,
    currentUser,
    handleConversationPress,
    handleConversationLongPress,
    enableSelection,
  ]);

  // Render search bar
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View
        style={[
          styles.searchInputContainer,
          {
            backgroundColor: theme.colors.background,
            borderColor: searchFocused ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textSecondary}
          style={styles.searchIcon}
        />
        
        <TextInput
          ref={searchInputRef}
          style={[
            styles.searchInput,
            {
              color: theme.colors.text,
            },
          ]}
          placeholder="Search conversations..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Render filter chips
  const renderFilterChips = () => (
    <View style={styles.filtersContainer}>
      {AVAILABLE_FILTERS.map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterChip,
            {
              backgroundColor: activeFilters.includes(filter.key)
                ? theme.colors.primary
                : theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => toggleFilter(filter.key)}
        >
          <Ionicons
            name={filter.icon}
            size={14}
            color={activeFilters.includes(filter.key) ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <ThemedText 
            type="caption" 
            color={activeFilters.includes(filter.key) ? 'white' : 'default'}
            weight="medium"
          >
            {filter.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={64}
        color={theme.colors.textTertiary}
      />
      <ThemedText type="title" weight="semiBold" style={styles.emptyStateTitle}>
        {searchQuery ? 'No conversations found' : 'No conversations yet'}
      </ThemedText>
      <ThemedText type="body" color="secondary" style={styles.emptyStateText}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Start a conversation to see it here'
        }
      </ThemedText>
    </View>
  );

  // Render loading footer
  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <ThemedText type="caption" color="secondary">
          Loading more conversations...
        </ThemedText>
      </View>
    );
  };

  // Render selection header
  const renderSelectionHeader = () => {
    if (!isSelectionMode || !enableSelection) return null;
    
    return (
      <View style={[styles.selectionHeader, { backgroundColor: theme.colors.card }]}>
        <View style={styles.selectionHeaderContent}>
          <TouchableOpacity
            style={styles.selectionHeaderButton}
            onPress={clearSelection}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <ThemedText type="body" weight="semiBold">
            {selectedConversations.size} selected
          </ThemedText>
          
          <TouchableOpacity
            style={styles.selectionHeaderButton}
            onPress={() => {
              Alert.alert(
                'Manage Conversations',
                `Perform action on ${selectedConversations.size} conversations?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Mark as Read', onPress: () => onMarkAsRead?.(Array.from(selectedConversations)) },
                  { text: 'Archive', onPress: () => onArchive?.(Array.from(selectedConversations)) },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(Array.from(selectedConversations)) },
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderSelectionHeader()}
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Search Bar */}
        {showSearch && renderSearchBar()}
        
        {/* Filter Chips */}
        {showFilters && renderFilterChips()}
        
        {/* Conversations List */}
        <FlatList
          ref={flatListRef}
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  selectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  selectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionHeaderButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  typeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexShrink: 0,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMessage: {
    flex: 1,
  },
  typingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingIndicator: {
    marginLeft: 4,
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    textAlign: 'center',
    paddingHorizontal: 48,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
});

export default ChatList;

// Hook for using chat list
export const useChatList = (filters = {}) => {
  const [state, setState] = useState({
    conversations: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    error: null,
  });

  const loadConversations = useCallback(async (refresh = false) => {
    if (refresh) {
      setState(prev => ({ ...prev, refreshing: true }));
    } else {
      setState(prev => ({ ...prev, loading: true }));
    }

    try {
      const result = await chatService.getConversations({
        ...filters,
        limit: 20,
        offset: refresh ? 0 : state.conversations.length,
      });

      if (result.success) {
        setState(prev => ({
          ...prev,
          conversations: refresh 
            ? result.data 
            : [...prev.conversations, ...result.data],
          hasMore: result.data.length === 20,
          loading: false,
          refreshing: false,
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
        refreshing: false,
      }));
    }
  }, [filters, state.conversations.length]);

  const refreshConversations = useCallback(() => {
    loadConversations(true);
  }, [loadConversations]);

  return {
    ...state,
    loadConversations,
    refreshConversations,
  };
};