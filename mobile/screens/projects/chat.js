import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Context & Hooks
import { useAuth } from '../../../contexts/auth-context';
import { useChat } from '../../../contexts/notification-context';
import { useTheme } from '../../../contexts/theme-context';

// Services
import { chatService } from '../../../services/chat-service';
import { notificationService } from '../../../services/notification-service';
import { uploadService } from '../../../services/upload-service';

// Components
import { ChatHeader } from '../../../components/chat/chat-header';
import { ChatWindow } from '../../../components/chat/chat-window';
import { MessageInput } from '../../../components/chat/message-input';
import { TypingIndicator } from '../../../components/chat/typing-indicator';
import { Loading } from '../../../components/ui/loading';
import { AccessDenied } from '../../../components/ui/access-denied';
import { OfflineIndicator } from '../../../components/ui/offline-indicator';

// Constants
import { CHAT_EVENTS, MESSAGE_TYPES, USER_ROLES } from '../../../constants/chat';
import { NAVIGATION_ROUTES } from '../../../constants/navigation';

/**
 * Project Chat Screen - Real-time communication for construction projects
 * Supports text messages, file sharing, and project-specific updates
 */
const ProjectChatScreen = () => {
  const { projectId, conversationId } = useLocalSearchParams();
  const router = useRouter();
  
  // Context hooks
  const { user, isAuthenticated, hasRole } = useAuth();
  const { theme, isDark } = useTheme();
  const { 
    messages, 
    participants, 
    isTyping, 
    isOnline,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    loadMoreMessages 
  } = useChat();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Refs
  const chatWindowRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pageRef = useRef(1);

  const styles = createStyles(theme);

  /**
   * Load initial chat data
   */
  const loadChatData = useCallback(async () => {
    if (!isAuthenticated || !projectId) {
      setError('Authentication or project ID missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Validate user access to project chat
      const hasAccess = await chatService.validateProjectAccess(
        projectId, 
        user.id
      );
      
      if (!hasAccess) {
        setError('access_denied');
        return;
      }

      // Load conversation or create new one
      const conversation = conversationId 
        ? await chatService.getConversation(conversationId)
        : await chatService.createProjectConversation(projectId, user.id);

      if (conversation) {
        await loadMoreMessages(conversation.id, 1);
      }

    } catch (err) {
      console.error('Failed to load chat data:', err);
      setError(err.message || 'Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, conversationId, user?.id, isAuthenticated, loadMoreMessages]);

  /**
   * Handle sending text messages
   */
  const handleSendMessage = async (text, attachments = []) => {
    if (!text.trim() && attachments.length === 0) return;

    try {
      setIsSending(true);
      setError(null);

      // Upload attachments first if any
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        uploadedAttachments = await handleFileUpload(attachments);
      }

      // Create message object
      const messageData = {
        text: text.trim(),
        attachments: uploadedAttachments,
        projectId,
        senderId: user.id,
        type: MESSAGE_TYPES.TEXT,
        metadata: {
          timestamp: new Date().toISOString(),
          projectContext: true
        }
      };

      // Send message via chat service
      await sendMessage(messageData);

      // Send push notification to other participants
      await notificationService.sendChatNotification({
        conversationId: conversationId,
        message: text,
        sender: user.name,
        projectId,
        type: 'project_chat'
      });

      // Clear typing indicator
      clearTypingIndicator();

    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      Alert.alert('Send Error', 'Failed to send message. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Handle file upload with progress tracking
   */
  const handleFileUpload = async (files) => {
    try {
      setUploadProgress(0);
      
      const uploadPromises = files.map(file => 
        uploadService.uploadFile(file, {
          folder: `projects/${projectId}/chat`,
          onProgress: (progress) => {
            setUploadProgress(progress);
          }
        })
      );

      const results = await Promise.all(uploadPromises);
      setUploadProgress(100);
      
      return results.map(result => ({
        url: result.url,
        type: result.type,
        name: result.name,
        size: result.size
      }));
    } catch (err) {
      console.error('File upload failed:', err);
      throw new Error('Failed to upload files');
    }
  };

  /**
   * Handle typing indicator
   */
  const handleTypingStart = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingIndicator(true);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  }, [sendTypingIndicator]);

  /**
   * Clear typing indicator
   */
  const clearTypingIndicator = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingIndicator(false);
  };

  /**
   * Load more messages for infinite scroll
   */
  const handleLoadMore = async () => {
    if (!hasMoreMessages || isLoading) return;

    try {
      pageRef.current += 1;
      const newMessages = await loadMoreMessages(conversationId, pageRef.current);
      
      if (!newMessages || newMessages.length === 0) {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  };

  /**
   * Handle participant actions (view profile, call, etc.)
   */
  const handleParticipantAction = (participant, action) => {
    switch (action) {
      case 'view_profile':
        router.push(`${NAVIGATION_ROUTES.PROFILE}/${participant.id}`);
        break;
      case 'call':
        // Implement calling functionality
        Alert.alert('Call', `Would you like to call ${participant.name}?`);
        break;
      case 'report':
        handleReportParticipant(participant);
        break;
      default:
        console.warn('Unknown participant action:', action);
    }
  };

  /**
   * Handle reporting a participant
   */
  const handleReportParticipant = (participant) => {
    Alert.alert(
      'Report User',
      `Why are you reporting ${participant.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Inappropriate Messages', 
          onPress: () => submitReport(participant, 'inappropriate_messages') 
        },
        { 
          text: 'Spam', 
          onPress: () => submitReport(participant, 'spam') 
        },
        { 
          text: 'Harassment', 
          onPress: () => submitReport(participant, 'harassment') 
        },
      ]
    );
  };

  const submitReport = async (participant, reason) => {
    try {
      await chatService.reportUser({
        reporterId: user.id,
        reportedUserId: participant.id,
        conversationId,
        reason,
        projectId
      });
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (err) {
      Alert.alert('Report Failed', 'Failed to submit report. Please try again.');
    }
  };

  // Effects
  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  useEffect(() => {
    // Mark messages as read when chat is active
    if (messages.length > 0 && !isLoading) {
      markAsRead(conversationId, user.id);
    }
  }, [messages, conversationId, user?.id, markAsRead, isLoading]);

  useEffect(() => {
    return () => {
      // Cleanup
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      clearTypingIndicator();
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading conversation..." />
      </SafeAreaView>
    );
  }

  // Render access denied
  if (error === 'access_denied') {
    return (
      <SafeAreaView style={styles.container}>
        <AccessDenied 
          message="You don't have access to this project chat"
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && error !== 'access_denied') {
    return (
      <SafeAreaView style={styles.container}>
        <AccessDenied 
          message={error}
          onRetry={loadChatData}
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Header */}
        <ChatHeader
          participants={participants}
          projectId={projectId}
          isOnline={isOnline}
          onParticipantAction={handleParticipantAction}
          onBack={() => router.back()}
          theme={theme}
        />

        {/* Offline Indicator */}
        {!isOnline && (
          <OfflineIndicator 
            message="You are currently offline. Some features may be limited."
          />
        )}

        {/* Chat Messages */}
        <View style={styles.chatContainer}>
          <ChatWindow
            ref={chatWindowRef}
            messages={messages}
            currentUserId={user.id}
            onLoadMore={handleLoadMore}
            hasMoreMessages={hasMoreMessages}
            projectId={projectId}
            theme={theme}
          />

          {/* Typing Indicator */}
          {isTyping && (
            <TypingIndicator participants={participants} theme={theme} />
          )}
        </View>

        {/* Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onTypingStart={handleTypingStart}
          isSending={isSending}
          uploadProgress={uploadProgress}
          allowedFileTypes={['image/*', 'video/*', 'application/pdf']}
          maxFileSize={25 * 1024 * 1024} // 25MB
          projectId={projectId}
          theme={theme}
          disabled={!isOnline}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Create dynamic styles based on theme
 */
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
});

export default ProjectChatScreen;