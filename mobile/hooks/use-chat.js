// hooks/use-chat.js
/**
 * ENTERPRISE-LEVEL CHAT MANAGEMENT HOOK
 * Real-time messaging with Ethiopian market optimization and construction project integration
 * Advanced features for all Yachi platform services
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import { Platform, Alert } from 'react-native';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics-service';
import { errorService } from '../services/error-service';
import { useAuth } from '../contexts/auth-context';
import { useNotification } from '../contexts/notification-context';
import { useAIMatching } from '../contexts/ai-matching-context';
import { 
  CHAT_TYPES, 
  MESSAGE_TYPES, 
  MESSAGE_STATUS, 
  CHAT_ROLES,
  USER_ROLES,
  ETHIOPIAN_REGIONS 
} from '../constants/chat';

// ==================== CHAT CONSTANTS ====================
const CHAT_ACTIONS = {
  // Chat Management
  SET_CHATS: 'SET_CHATS',
  ADD_CHAT: 'ADD_CHAT',
  UPDATE_CHAT: 'UPDATE_CHAT',
  REMOVE_CHAT: 'REMOVE_CHAT',
  SET_CURRENT_CHAT: 'SET_CURRENT_CHAT',
  
  // Message Management
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  REMOVE_MESSAGE: 'REMOVE_MESSAGE',
  SET_PINNED_MESSAGES: 'SET_PINNED_MESSAGES',
  
  // Real-time Features
  SET_TYPING_USERS: 'SET_TYPING_USERS',
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  SET_CONNECTED: 'SET_CONNECTED',
  ADD_REAL_TIME_UPDATE: 'ADD_REAL_TIME_UPDATE',
  
  // UI State
  SET_LOADING: 'SET_LOADING',
  SET_SENDING: 'SET_SENDING',
  SET_UPLOADING: 'SET_UPLOADING',
  SET_SEARCHING: 'SET_SEARCHING',
  
  // Composition
  SET_DRAFT_MESSAGE: 'SET_DRAFT_MESSAGE',
  SET_REPLY_TO_MESSAGE: 'SET_REPLY_TO_MESSAGE',
  SET_SELECTED_FILES: 'SET_SELECTED_FILES',
  
  // Error Handling
  SET_ERROR: 'SET_ERROR',
  SET_SEND_ERROR: 'SET_SEND_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
};

const STORAGE_KEYS = {
  CHATS_CACHE: 'yachi_chats_cache',
  MESSAGES_CACHE: 'yachi_messages_cache',
  DRAFT_MESSAGES: 'yachi_draft_messages',
  CHAT_PREFERENCES: 'yachi_chat_preferences',
  BLOCKED_USERS: 'yachi_blocked_users',
};

// ==================== INITIAL STATE ====================
const initialState = {
  // Chat Data
  chats: [],
  currentChat: null,
  chatMembers: [],
  chatSettings: null,
  
  // Message Data
  messages: [],
  pinnedMessages: [],
  starredMessages: [],
  unreadCount: 0,
  
  // Real-time Features
  typingUsers: new Set(),
  onlineUsers: new Set(),
  connected: false,
  lastMessageUpdate: null,
  
  // Composition State
  draftMessage: '',
  replyToMessage: null,
  selectedFiles: [],
  isRecording: false,
  
  // Search & Filter
  searchQuery: '',
  searchResults: [],
  messageFilters: {
    hasAttachments: false,
    hasLinks: false,
    dateRange: null,
    sender: null,
    messageType: null,
  },
  
  // Pagination
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true,
  },
  
  // Loading States
  isLoading: false,
  isSending: false,
  isUploading: false,
  isSearching: false,
  isRefreshing: false,
  isCreatingChat: false,
  
  // Selection
  selectedMessages: new Set(),
  
  // Security & Preferences
  blockedUsers: new Set(),
  chatPreferences: {
    soundEnabled: true,
    vibrationEnabled: true,
    previewEnabled: true,
    autoDownload: true,
    language: 'en',
    timezone: 'Africa/Addis_Ababa',
  },
  
  // Ethiopian Context
  ethiopianContext: {
    regionalLanguage: 'am',
    workingHours: '09:00-18:00',
    holidayMode: false,
    culturalSensitivity: true,
  },
  
  // Error States
  error: null,
  errorCode: null,
  sendError: null,
  connectionError: null,
};

// ==================== ENTERPRISE CHAT HOOK ====================
/**
 * Enterprise Chat Management Hook
 * Comprehensive real-time messaging with Ethiopian market optimization
 */
export const useChat = (options = {}) => {
  const {
    autoConnect = true,
    enableRealTime = true,
    enableOfflineMode = true,
    maxMessageHistory = 1000,
    typingIndicatorTimeout = 3000,
  } = options;

  // Context Hooks
  const { user, isAuthenticated } = useAuth();
  const { sendNotification } = useNotification();
  const { aiInsights } = useAIMatching();

  // State Management
  const [state, setState] = useState(initialState);
  
  // Refs
  const typingTimeoutRef = useRef();
  const reconnectTimeoutRef = useRef();
  const messageQueueRef = useRef([]);
  const socketRef = useRef();
  const lastActivityRef = useRef();

  // ==================== LIFECYCLE MANAGEMENT ====================
  useEffect(() => {
    if (isAuthenticated && autoConnect) {
      initializeChat();
    }

    return () => {
      cleanupChat();
    };
  }, [isAuthenticated, autoConnect]);

  useEffect(() => {
    if (enableRealTime && state.connected) {
      startRealTimeFeatures();
    } else {
      stopRealTimeFeatures();
    }
  }, [enableRealTime, state.connected]);

  // ==================== INITIALIZATION ====================
  const initializeChat = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        throw new Error('Authentication required for chat access');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load cached data and preferences
      const [
        cachedChats, 
        chatPreferences, 
        blockedUsers,
        draftMessages
      ] = await Promise.all([
        storage.getItem(STORAGE_KEYS.CHATS_CACHE),
        storage.getItem(STORAGE_KEYS.CHAT_PREFERENCES),
        storage.getItem(STORAGE_KEYS.BLOCKED_USERS),
        storage.getItem(STORAGE_KEYS.DRAFT_MESSAGES),
      ]);

      // Initialize WebSocket connection
      await connectWebSocket();

      // Load initial chat data
      const [chatsResponse, unreadResponse] = await Promise.all([
        fetchChats({ page: 1, limit: 50 }),
        fetchUnreadChats(),
      ]);

      setState(prev => ({
        ...prev,
        chats: chatsResponse.chats,
        unreadCount: unreadResponse.totalUnread,
        chatPreferences: chatPreferences || prev.chatPreferences,
        blockedUsers: new Set(blockedUsers || []),
        draftMessage: draftMessages || '',
        isLoading: false,
        lastActivityRef: Date.now(),
      }));

      analyticsService.trackEvent('chat_system_initialized', {
        chatsCount: chatsResponse.chats.length,
        unreadCount: unreadResponse.totalUnread,
        platform: Platform.OS,
      });

    } catch (error) {
      handleChatError(error, 'ChatInitialization');
    }
  }, [isAuthenticated]);

  // ==================== CHAT MANAGEMENT ====================
  /**
   * Fetch chats with pagination and filtering
   */
  const fetchChats = useCallback(async (options = {}) => {
    try {
      const {
        page = 1,
        limit = 50,
        chatType = null,
        refresh = false,
      } = options;

      setState(prev => ({ 
        ...prev, 
        isLoading: !refresh,
        isRefreshing: refresh,
      }));

      const params = { page, limit };
      if (chatType) params.type = chatType;

      const response = await api.get('/chats', { params });
      const { chats, pagination } = response.data;

      setState(prev => ({
        ...prev,
        chats: page === 1 ? chats : [...prev.chats, ...chats],
        pagination,
        isLoading: false,
        isRefreshing: false,
        error: null,
      }));

      // Cache results
      await cacheChatsData(chats);

      analyticsService.trackEvent('chats_fetched', {
        page,
        resultsCount: chats.length,
        chatType,
      });

      return { chats, pagination };

    } catch (error) {
      handleChatError(error, 'FetchChats', options);
      throw error;
    }
  }, []);

  /**
   * Create a new chat with Ethiopian context optimization
   */
  const createChat = useCallback(async (participants, chatType = CHAT_TYPES.DIRECT, options = {}) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Authentication required to create chats');
      }

      setState(prev => ({ ...prev, isCreatingChat: true, error: null }));

      // Check for existing direct chat
      if (chatType === CHAT_TYPES.DIRECT && participants.length === 1) {
        const existingChat = findExistingDirectChat(participants[0]);
        if (existingChat) {
          setState(prev => ({ 
            ...prev, 
            isCreatingChat: false,
            currentChat: existingChat,
          }));
          return { success: true, chat: existingChat, existing: true };
        }
      }

      // Prepare chat data with Ethiopian context
      const chatData = {
        participants,
        type: chatType,
        name: options.name,
        description: options.description,
        settings: {
          ...options.settings,
          language: state.ethiopianContext.regionalLanguage,
          timezone: state.ethiopianContext.timezone,
        },
        metadata: {
          createdBy: user.id,
          ethiopianRegion: user.region,
          projectContext: options.projectContext,
        },
      };

      const response = await api.post('/chats', chatData);
      const newChat = response.data;

      setState(prev => ({
        ...prev,
        chats: [newChat, ...prev.chats],
        currentChat: newChat,
        isCreatingChat: false,
      }));

      analyticsService.trackEvent('chat_created', {
        chatId: newChat.id,
        chatType,
        participantsCount: participants.length,
        projectContext: !!options.projectContext,
      });

      return { success: true, chat: newChat, existing: false };

    } catch (error) {
      handleChatError(error, 'CreateChat', { participants, chatType });
      throw error;
    }
  }, [isAuthenticated, user, state.ethiopianContext]);

  /**
   * Create construction project chat
   */
  const createProjectChat = useCallback(async (projectId, participants, projectData) => {
    try {
      const chatName = `Project: ${projectData.name}`;
      const chatDescription = `Construction project chat for ${projectData.name} in ${projectData.location}`;

      const projectChat = await createChat(
        participants,
        CHAT_TYPES.GROUP,
        {
          name: chatName,
          description: chatDescription,
          settings: {
            allowInvites: false,
            adminOnlyMessages: false,
            fileSharing: true,
          },
          projectContext: {
            projectId,
            projectType: projectData.type,
            budget: projectData.budget,
            timeline: projectData.timeline,
          },
        }
      );

      // Pin project information message
      await sendSystemMessage(projectChat.chat.id, {
        type: MESSAGE_TYPES.SYSTEM,
        content: `Construction project chat created for ${projectData.name}. Budget: ${projectData.budget} ETB, Timeline: ${projectData.timeline} days.`,
        metadata: {
          projectId,
          projectType: projectData.type,
          action: 'project_chat_created',
        },
      });

      analyticsService.trackEvent('project_chat_created', {
        projectId,
        chatId: projectChat.chat.id,
        teamSize: participants.length,
      });

      return projectChat;

    } catch (error) {
      handleChatError(error, 'CreateProjectChat', { projectId });
      throw error;
    }
  }, [createChat]);

  // ==================== MESSAGE MANAGEMENT ====================
  /**
   * Send text message with Ethiopian context awareness
   */
  const sendMessage = useCallback(async (chatId, content, options = {}) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Authentication required to send messages');
      }

      setState(prev => ({ ...prev, isSending: true, sendError: null }));

      const tempMessageId = generateTempId();
      const tempMessage = createTempMessage(chatId, content, MESSAGE_TYPES.TEXT, options);

      // Optimistic UI update
      setState(prev => ({
        ...prev,
        messages: [tempMessage, ...prev.messages],
        isSending: true,
        draftMessage: '', // Clear draft
      }));

      // Apply Ethiopian content filtering
      const filteredContent = applyEthiopianContentFilter(content);

      const messageData = {
        chatId,
        content: filteredContent,
        type: MESSAGE_TYPES.TEXT,
        replyTo: options.replyTo,
        metadata: {
          language: detectLanguage(content),
          culturalContext: analyzeCulturalContext(content),
          senderRegion: user.region,
          ...options.metadata,
        },
      };

      const response = await api.post(`/chats/${chatId}/messages`, messageData);
      const sentMessage = response.data;

      // Replace temp message with real message
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === tempMessageId ? { ...sentMessage, status: MESSAGE_STATUS.SENT } : msg
        ),
        isSending: false,
      }));

      // Stop typing indicator
      sendTypingIndicator(chatId, false);

      analyticsService.trackEvent('message_sent', {
        chatId,
        messageType: MESSAGE_TYPES.TEXT,
        contentLength: content.length,
        hasReply: !!options.replyTo,
      });

      return { success: true, message: sentMessage };

    } catch (error) {
      handleChatError(error, 'SendMessage', { chatId, contentLength: content.length });
      
      // Mark message as failed
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id.startsWith('temp_') ? { ...msg, status: MESSAGE_STATUS.FAILED } : msg
        ),
        isSending: false,
        sendError: error.message,
      }));

      return { success: false, error: error.message };
    }
  }, [isAuthenticated, user]);

  /**
   * Send file message with Ethiopian market optimization
   */
  const sendFileMessage = useCallback(async (chatId, file, options = {}) => {
    try {
      setState(prev => ({ ...prev, isUploading: true, sendError: null }));

      const tempMessageId = generateTempId();
      const messageType = getMessageTypeFromFile(file.type);
      
      const tempMessage = createTempMessage(chatId, '', messageType, {
        ...options,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          uri: file.uri,
        },
      });

      // Optimistic UI update
      setState(prev => ({
        ...prev,
        messages: [tempMessage, ...prev.messages],
        isUploading: true,
      }));

      // Prepare form data with Ethiopian context
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', messageType);
      formData.append('metadata', JSON.stringify({
        ethiopianRegion: user.region,
        fileCategory: getFileCategory(file.type),
        ...options.metadata,
      }));

      if (options.replyTo) {
        formData.append('replyTo', options.replyTo);
      }

      const response = await api.post(`/chats/${chatId}/messages/file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for large files
      });

      const sentMessage = response.data;

      // Replace temp message
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === tempMessageId ? { ...sentMessage, status: MESSAGE_STATUS.SENT } : msg
        ),
        isUploading: false,
      }));

      analyticsService.trackEvent('file_message_sent', {
        chatId,
        fileType: messageType,
        fileSize: file.size,
        fileCategory: getFileCategory(file.type),
      });

      return { success: true, message: sentMessage };

    } catch (error) {
      handleChatError(error, 'SendFileMessage', { 
        chatId, 
        fileType: file.type,
        fileSize: file.size,
      });

      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id.startsWith('temp_') ? { ...msg, status: MESSAGE_STATUS.FAILED } : msg
        ),
        isUploading: false,
        sendError: error.message,
      }));

      return { success: false, error: error.message };
    }
  }, [user]);

  /**
   * Send AI construction update message
   */
  const sendAIUpdateMessage = useCallback(async (chatId, aiUpdate, options = {}) => {
    try {
      const messageContent = formatAIUpdateMessage(aiUpdate);
      
      const message = await sendMessage(chatId, messageContent, {
        type: MESSAGE_TYPES.SYSTEM,
        metadata: {
          aiUpdate: true,
          updateType: aiUpdate.type,
          projectId: aiUpdate.projectId,
          confidence: aiUpdate.confidence,
          recommendations: aiUpdate.recommendations,
        },
        ...options,
      });

      analyticsService.trackEvent('ai_update_message_sent', {
        chatId,
        updateType: aiUpdate.type,
        projectId: aiUpdate.projectId,
      });

      return message;

    } catch (error) {
      handleChatError(error, 'SendAIUpdateMessage', { 
        chatId, 
        updateType: aiUpdate.type 
      });
      throw error;
    }
  }, [sendMessage]);

  // ==================== REAL-TIME FEATURES ====================
  const connectWebSocket = useCallback(async () => {
    try {
      // Initialize WebSocket connection
      const socket = await initializeWebSocket();
      socketRef.current = socket;

      setupWebSocketListeners(socket);

      setState(prev => ({
        ...prev,
        connected: true,
        connectionError: null,
      }));

      analyticsService.trackEvent('chat_websocket_connected');

    } catch (error) {
      handleChatError(error, 'ConnectWebSocket');
      scheduleReconnect();
    }
  }, []);

  const setupWebSocketListeners = useCallback((socket) => {
    socket.on('message', handleIncomingMessage);
    socket.on('message_updated', handleMessageUpdate);
    socket.on('message_deleted', handleMessageDelete);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('chat_updated', handleChatUpdate);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_read', handleMessageRead);
  }, []);

  const handleIncomingMessage = useCallback((message) => {
    // Check if message is from blocked user
    if (state.blockedUsers.has(message.sender.id)) {
      return;
    }

    // Apply Ethiopian content filtering
    if (message.type === MESSAGE_TYPES.TEXT) {
      message.content = applyEthiopianContentFilter(message.content);
    }

    setState(prev => ({
      ...prev,
      messages: [message, ...prev.messages],
      lastMessageUpdate: new Date().toISOString(),
    }));

    // Send notification if chat is not active
    if (state.currentChat?.id !== message.chatId) {
      handleNewMessageNotification(message);
    }

    // Mark as read if it's the current chat
    if (state.currentChat?.id === message.chatId) {
      markMessagesAsRead(message.chatId, [message.id]);
    }

    analyticsService.trackEvent('message_received', {
      chatId: message.chatId,
      messageType: message.type,
      senderType: message.sender.role,
    });
  }, [state.blockedUsers, state.currentChat]);

  const handleTypingStart = useCallback(({ chatId, userId }) => {
    if (state.currentChat?.id === chatId && userId !== user.id) {
      setState(prev => ({
        ...prev,
        typingUsers: new Set([...prev.typingUsers, userId]),
      }));

      // Auto-clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop({ chatId, userId });
      }, typingIndicatorTimeout);
    }
  }, [state.currentChat, user, typingIndicatorTimeout]);

  const handleTypingStop = useCallback(({ chatId, userId }) => {
    if (state.currentChat?.id === chatId) {
      setState(prev => ({
        ...prev,
        typingUsers: new Set([...prev.typingUsers].filter(id => id !== userId)),
      }));
    }
  }, [state.currentChat]);

  const sendTypingIndicator = useCallback((chatId, isTyping) => {
    if (!socketRef.current || !state.connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      socketRef.current.emit('typing_start', { chatId, userId: user.id });
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(chatId, false);
      }, typingIndicatorTimeout);
    } else {
      socketRef.current.emit('typing_stop', { chatId, userId: user.id });
    }
  }, [state.connected, user, typingIndicatorTimeout]);

  // ==================== ETHIOPIAN CONTEXT FEATURES ====================
  const applyEthiopianContentFilter = useCallback((content) => {
    // Implement Ethiopian cultural and linguistic content filtering
    const filters = [
      // Language normalization
      normalizeEthiopianText(content),
      // Cultural sensitivity checks
      checkCulturalSensitivity(content),
      // Professional context adaptation
      adaptToProfessionalContext(content),
    ];

    return filters.reduce((filteredContent, filter) => filter(filteredContent), content);
  }, []);

  const detectLanguage = useCallback((content) => {
    // Simple language detection for Ethiopian languages
    const amharicRegex = /[ሀ-፿]/;
    const oromoRegex = /[a-zA-Z]/; // Oromo uses Latin script
    
    if (amharicRegex.test(content)) return 'am';
    if (oromoRegex.test(content)) return 'om';
    return 'en';
  }, []);

  const analyzeCulturalContext = useCallback((content) => {
    // Analyze content for Ethiopian cultural context
    const context = {
      hasGreeting: hasEthiopianGreeting(content),
      hasRespectTerms: hasRespectfulTerms(content),
      hasProfessionalTerms: hasProfessionalConstructionTerms(content),
      sentiment: analyzeSentiment(content),
    };
    
    return context;
  }, []);

  const formatAIUpdateMessage = useCallback((aiUpdate) => {
    const templates = {
      TEAM_ASSIGNMENT: `🏗️ AI Team Assignment Complete\n\nProject: ${aiUpdate.projectName}\nOptimal Team: ${aiUpdate.teamSize} workers\nMatch Score: ${(aiUpdate.confidence * 100).toFixed(1)}%\nBudget Efficiency: ${(aiUpdate.budgetEfficiency * 100).toFixed(1)}%`,
      
      PROGRESS_UPDATE: `📊 Construction Progress Update\n\nProject: ${aiUpdate.projectName}\nCompletion: ${aiUpdate.progress}%\nTimeline: ${aiUpdate.daysRemaining} days remaining\nNext Milestone: ${aiUpdate.nextMilestone}`,
      
      RISK_ALERT: `⚠️ AI Risk Alert\n\nProject: ${aiUpdate.projectName}\nRisk Level: ${aiUpdate.riskLevel}\nIssue: ${aiUpdate.issue}\nRecommendation: ${aiUpdate.recommendation}`,
      
      MATERIAL_UPDATE: `📦 Material Delivery Update\n\nProject: ${aiUpdate.projectName}\nMaterial: ${aiUpdate.materialType}\nStatus: ${aiUpdate.deliveryStatus}\nExpected: ${aiUpdate.expectedDate}`,
    };

    return templates[aiUpdate.type] || `AI Update: ${aiUpdate.message}`;
  }, []);

  // ==================== UTILITY FUNCTIONS ====================
  const findExistingDirectChat = useCallback((participantId) => {
    return state.chats.find(chat =>
      chat.type === CHAT_TYPES.DIRECT &&
      chat.participants.some(p => p.id === participantId)
    );
  }, [state.chats]);

  const generateTempId = () => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createTempMessage = (chatId, content, type, options = {}) => {
    return {
      id: generateTempId(),
      chatId,
      content,
      type,
      sender: user,
      timestamp: new Date().toISOString(),
      status: MESSAGE_STATUS.SENDING,
      ...options,
    };
  };

  const getMessageTypeFromFile = (mimeType) => {
    if (mimeType.startsWith('image/')) return MESSAGE_TYPES.IMAGE;
    if (mimeType.startsWith('video/')) return MESSAGE_TYPES.VIDEO;
    if (mimeType.startsWith('audio/')) return MESSAGE_TYPES.AUDIO;
    return MESSAGE_TYPES.FILE;
  };

  const getFileCategory = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    return 'other';
  };

  // ==================== ERROR HANDLING ====================
  const handleChatError = useCallback((error, context, metadata = {}) => {
    console.error(`${context} error:`, error);
    
    const errorCode = getChatErrorCode(error);
    const errorMessage = getChatErrorMessage(error, errorCode);

    setState(prev => ({
      ...prev,
      error: errorMessage,
      errorCode,
      isLoading: false,
      isSending: false,
      isUploading: false,
      isCreatingChat: false,
    }));

    analyticsService.trackEvent('chat_error', {
      context,
      errorCode,
      ...metadata,
    });

    errorService.captureError(error, {
      context: `Chat-${context}`,
      errorCode,
      ...metadata,
    });
  }, []);

  const getChatErrorCode = (error) => {
    if (error.message?.includes('network') || error.message?.includes('Network')) {
      return 'NETWORK_ERROR';
    }
    if (error.message?.includes('permission') || error.response?.status === 403) {
      return 'PERMISSION_DENIED';
    }
    if (error.message?.includes('blocked')) {
      return 'USER_BLOCKED';
    }
    if (error.response?.status === 429) {
      return 'RATE_LIMITED';
    }
    return 'UNKNOWN_ERROR';
  };

  const getChatErrorMessage = (error, errorCode) => {
    const errorMessages = {
      NETWORK_ERROR: 'Network connection issue. Please check your internet connection.',
      PERMISSION_DENIED: 'You do not have permission to perform this action.',
      USER_BLOCKED: 'This user has been blocked from messaging.',
      RATE_LIMITED: 'Too many messages sent. Please wait a moment.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };

    return errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
  };

  // ==================== CLEANUP ====================
  const cleanupChat = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts || 0), 30000);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket();
    }, delay);
  }, [state.reconnectAttempts, connectWebSocket]);

  // ==================== HOOK RETURN VALUE ====================
  return {
    // State
    ...state,
    
    // Core Operations
    fetchChats,
    createChat,
    createProjectChat,
    sendMessage,
    sendFileMessage,
    sendAIUpdateMessage,
    
    // Real-time Features
    sendTypingIndicator,
    markMessagesAsRead,
    
    // Utility Functions
    cleanupChat,
    clearErrors: () => setState(prev => ({ 
      ...prev, 
      error: null, 
      sendError: null,
      connectionError: null,
    })),
    
    // Derived State
    isUserBlocked: (userId) => state.blockedUsers.has(userId),
    isUserOnline: (userId) => state.onlineUsers.has(userId),
    isUserTyping: (userId) => state.typingUsers.has(userId),
    
    // Analytics
    chatStats: {
      totalChats: state.chats.length,
      unreadMessages: state.unreadCount,
      onlineContacts: Array.from(state.onlineUsers).length,
      totalMessages: state.messages.length,
      projectChats: state.chats.filter(chat => chat.metadata?.projectContext).length,
    },
  };
};

// ==================== HELPER FUNCTIONS ====================
const initializeWebSocket = async () => {
  // Implementation for WebSocket initialization
  return {
    on: (event, callback) => {},
    emit: (event, data) => {},
    disconnect: () => {},
  };
};

const fetchUnreadChats = async () => {
  // Implementation for fetching unread chats
  return { totalUnread: 0, chats: [] };
};

const sendSystemMessage = async (chatId, messageData) => {
  // Implementation for system messages
  return { success: true };
};

const markMessagesAsRead = async (chatId, messageIds) => {
  // Implementation for marking messages as read
};

const handleNewMessageNotification = (message) => {
  // Implementation for new message notifications
};

const cacheChatsData = async (chats) => {
  await storage.setItem(STORAGE_KEYS.CHATS_CACHE, {
    chats,
    timestamp: Date.now(),
  });
};

const normalizeEthiopianText = (content) => content;
const checkCulturalSensitivity = (content) => content;
const adaptToProfessionalContext = (content) => content;
const hasEthiopianGreeting = (content) => false;
const hasRespectfulTerms = (content) => false;
const hasProfessionalConstructionTerms = (content) => false;
const analyzeSentiment = (content) => 'neutral';

const startRealTimeFeatures = () => {};
const stopRealTimeFeatures = () => {};
const handleMessageUpdate = () => {};
const handleMessageDelete = () => {};
const handleUserOnline = () => {};
const handleUserOffline = () => {};
const handleChatUpdate = () => {};
const handleMessageDelivered = () => {};
const handleMessageRead = () => {};

export default useChat;