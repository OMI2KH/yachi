/**
 * Yachi Chat Types
 * Enterprise-level type definitions for real-time chat system
 * Comprehensive type safety for messaging, conversations, and real-time features
 */

/**
 * @typedef {Object} ChatUser
 * @property {string} id - Unique user identifier
 * @property {string} name - User's display name
 * @property {string} [avatar] - User's profile image URL
 * @property {string} role - User role (client, provider, government, admin)
 * @property {boolean} isOnline - Online status
 * @property {Date} [lastSeen] - Last seen timestamp
 * @property {UserVerification} verification - User verification status
 * @property {string} [status] - Custom status message
 */

/**
 * @typedef {Object} UserVerification
 * @property {string} level - Verification level (basic, verified, premium)
 * @property {boolean} isVerified - Whether user is verified
 * @property {Date} [verifiedAt] - Verification timestamp
 */

/**
 * @typedef {Object} MessageAttachment
 * @property {string} id - Unique attachment identifier
 * @property {string} type - Attachment type (image, video, document, audio)
 * @property {string} url - File URL
 * @property {string} name - Original file name
 * @property {number} size - File size in bytes
 * @property {string} mimeType - MIME type
 * @property {Object} [metadata] - Additional metadata (dimensions, duration, etc.)
 * @property {Date} uploadedAt - Upload timestamp
 */

/**
 * @typedef {('text' | 'image' | 'video' | 'document' | 'audio' | 'system' | 'booking' | 'payment' | 'project')} MessageType
 */

/**
 * @typedef {('sent' | 'delivered' | 'read' | 'failed')} MessageStatus
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - Unique message identifier
 * @property {string} conversationId - Parent conversation ID
 * @property {string} senderId - Message sender ID
 * @property {MessageType} type - Message type
 * @property {string} [text] - Message text content (for text messages)
 * @property {MessageAttachment[]} [attachments] - Message attachments
 * @property {MessageStatus} status - Delivery status
 * @property {Date} sentAt - Sent timestamp
 * @property {Date} [deliveredAt] - Delivered timestamp
 * @property {Date} [readAt] - Read timestamp
 * @property {MessageReaction[]} [reactions] - Message reactions
 * @property {string} [replyTo] - ID of message being replied to
 * @property {MessageMetadata} metadata - Message metadata
 * @property {boolean} isEdited - Whether message has been edited
 * @property {Date} [editedAt] - Edit timestamp
 * @property {string} [editHistory] - Edit history (for audit purposes)
 */

/**
 * @typedef {Object} MessageReaction
 * @property {string} emoji - Reaction emoji
 * @property {string} userId - User who reacted
 * @property {Date} reactedAt - Reaction timestamp
 */

/**
 * @typedef {Object} MessageMetadata
 * @property {string} [clientMessageId] - Client-side message ID for deduplication
 * @property {string} [deviceId] - Sending device identifier
 * @property {string} [platform] - Sending platform (ios, android, web)
 * @property {string} [appVersion] - App version
 * @property {boolean} [isOffline] - Whether message was sent offline
 * @property {Date} [syncedAt] - Sync timestamp for offline messages
 */

/**
 * @typedef {('direct' | 'group' | 'project' | 'support' | 'broadcast')} ConversationType
 */

/**
 * @typedef {('active' | 'archived' | 'blocked' | 'deleted')} ConversationStatus
 */

/**
 * @typedef {Object} ConversationParticipant
 * @property {string} userId - Participant user ID
 * @property {string} role - Participant role (member, admin, owner)
 * @property {Date} joinedAt - Join timestamp
 * @property {Date} [leftAt] - Leave timestamp (if applicable)
 * @property {NotificationSettings} notificationSettings - Participant notification preferences
 * @property {boolean} isActive - Whether participant is active in conversation
 */

/**
 * @typedef {Object} NotificationSettings
 * @property {boolean} mute - Whether conversation is muted
 * @property {string} sound - Notification sound preference
 * @property {boolean} vibrate - Vibration preference
 * @property {string} [customSound] - Custom sound file
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id - Unique conversation identifier
 * @property {string} [name] - Conversation name (for groups)
 * @property {string} [avatar] - Conversation avatar URL
 * @property {ConversationType} type - Conversation type
 * @property {ConversationStatus} status - Conversation status
 * @property {ConversationParticipant[]} participants - Conversation participants
 * @property {ChatMessage} [lastMessage] - Last message in conversation
 * @property {number} unreadCount - Number of unread messages for current user
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {string} [createdBy] - User who created the conversation
 * @property {ConversationSettings} settings - Conversation settings
 * @property {ConversationMetadata} metadata - Conversation metadata
 */

/**
 * @typedef {Object} ConversationSettings
 * @property {boolean} allowInvites - Whether participants can invite others
 * @property {boolean} allowMedia - Whether media sharing is allowed
 * @property {boolean} allowReactions - Whether reactions are allowed
 * @property {boolean} allowEditing - Whether message editing is allowed
 * @property {number} editTimeLimit - Time limit for editing messages (minutes)
 * @property {boolean} adminOnlyPosts - Whether only admins can post
 * @property {string[]} [allowedMessageTypes] - Allowed message types
 */

/**
 * @typedef {Object} ConversationMetadata
 * @property {string} [projectId] - Associated project ID (for project chats)
 * @property {string} [bookingId] - Associated booking ID (for booking chats)
 * @property {string} [serviceId] - Associated service ID
 * @property {string} [context] - Chat context (support, general, etc.)
 * @property {string[]} tags - Conversation tags for categorization
 * @property {boolean} isEncrypted - Whether conversation is end-to-end encrypted
 * @property {string} [encryptionKey] - Encryption key (if encrypted)
 */

/**
 * @typedef {Object} TypingIndicator
 * @property {string} conversationId - Conversation ID
 * @property {string} userId - User who is typing
 * @property {string} userName - User's display name
 * @property {Date} startedAt - Typing start timestamp
 * @property {Date} [lastAction] - Last typing action timestamp
 */

/**
 * @typedef {Object} ReadReceipt
 * @property {string} messageId - Message ID
 * @property {string} userId - User who read the message
 * @property {Date} readAt - Read timestamp
 * @property {string} [deviceId] - Device identifier
 */

/**
 * @typedef {Object} ChatSearchResult
 * @property {ChatMessage[]} messages - Matching messages
 * @property {Conversation[]} conversations - Matching conversations
 * @property {number} totalMessages - Total matching messages count
 * @property {number} totalConversations - Total matching conversations count
 * @property {Object} highlights - Search term highlights
 */

/**
 * @typedef {Object} ChatFilters
 * @property {string} [conversationId] - Filter by conversation
 * @property {string} [senderId] - Filter by sender
 * @property {MessageType[]} [types] - Filter by message types
 * @property {Date} [startDate] - Start date filter
 * @property {Date} [endDate] - End date filter
 * @property {boolean} [hasAttachments] - Filter messages with attachments
 * @property {string} [searchTerm] - Text search term
 * @property {boolean} [unreadOnly] - Show only unread messages
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} page - Page number (1-based)
 * @property {number} limit - Number of items per page
 * @property {string} [cursor] - Cursor for cursor-based pagination
 * @property {string} [sortBy] - Field to sort by
 * @property {'asc' | 'desc'} [sortOrder] - Sort order
 */

/**
 * @typedef {Object} ChatPagination
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 * @property {number} total - Total items
 * @property {number} totalPages - Total pages
 * @property {boolean} hasNext - Whether there are more pages
 * @property {boolean} hasPrev - Whether there are previous pages
 * @property {string} [nextCursor] - Next cursor for pagination
 */

/**
 * @typedef {Object} ChatListResponse
 * @property {Conversation[]} conversations - List of conversations
 * @property {ChatPagination} pagination - Pagination info
 * @property {number} totalUnread - Total unread messages count
 */

/**
 * @typedef {Object} MessageListResponse
 * @property {ChatMessage[]} messages - List of messages
 * @property {ChatPagination} pagination - Pagination info
 * @property {Conversation} conversation - Conversation details
 * @property {TypingIndicator[]} typingUsers - Currently typing users
 */

/**
 * @typedef {Object} SendMessagePayload
 * @property {string} conversationId - Target conversation ID
 * @property {MessageType} type - Message type
 * @property {string} [text] - Message text
 * @property {MessageAttachment[]} [attachments] - Message attachments
 * @property {string} [replyTo] - ID of message to reply to
 * @property {string} [clientMessageId] - Client-generated message ID
 * @property {MessageMetadata} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} CreateConversationPayload
 * @property {ConversationType} type - Conversation type
 * @property {string[]} participantIds - Initial participant IDs
 * @property {string} [name] - Conversation name (for groups)
 * @property {string} [avatar] - Conversation avatar URL
 * @property {ConversationSettings} [settings] - Conversation settings
 * @property {ConversationMetadata} [metadata] - Conversation metadata
 */

/**
 * @typedef {Object} UpdateConversationPayload
 * @property {string} [name] - New conversation name
 * @property {string} [avatar] - New conversation avatar
 * @property {ConversationSettings} [settings] - Updated settings
 * @property {ConversationStatus} [status] - Updated status
 */

/**
 * @typedef {Object} ConversationInvite
 * @property {string} id - Invite ID
 * @property {string} conversationId - Target conversation ID
 * @property {string} invitedBy - User who sent the invite
 * @property {string} invitedUser - User being invited
 * @property {string} [email] - Email of invited user (if not in system)
 * @property {string} [phone] - Phone of invited user (if not in system)
 * @property {string} status - Invite status (pending, accepted, declined, expired)
 * @property {Date} sentAt - Sent timestamp
 * @property {Date} [expiresAt] - Expiration timestamp
 * @property {Date} [respondedAt] - Response timestamp
 * @property {string} [message] - Invitation message
 */

/**
 * @typedef {Object} ChatNotification
 * @property {string} id - Notification ID
 * @property {string} type - Notification type (message, reaction, typing, etc.)
 * @property {string} userId - Target user ID
 * @property {ChatMessage} [message] - Related message (for message notifications)
 * @property {Conversation} [conversation] - Related conversation
 * @property {Object} data - Notification data
 * @property {boolean} isRead - Whether notification is read
 * @property {Date} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} ChatPresence
 * @property {string} userId - User ID
 * @property {boolean} isOnline - Online status
 * @property {Date} lastSeen - Last seen timestamp
 * @property {string} [status] - User status (available, away, busy, offline)
 * @property {string} [currentConversation] - Current active conversation
 * @property {string} [device] - Current device
 * @property {string} [platform] - Platform (web, mobile, desktop)
 */

/**
 * @typedef {Object} ChatAnalytics
 * @property {string} conversationId - Conversation ID
 * @property {number} totalMessages - Total messages count
 * @property {number} totalParticipants - Total participants count
 * @property {number} averageResponseTime - Average response time in minutes
 * @property {number} engagementRate - Engagement rate percentage
 * @property {Object} messageTypes - Count by message type
 * @property {Object} activityByHour - Activity count by hour
 * @property {Date} periodStart - Analytics period start
 * @property {Date} periodEnd - Analytics period end
 */

/**
 * @typedef {Object} ChatError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {string} [conversationId] - Related conversation ID
 * @property {string} [messageId] - Related message ID
 * @property {Date} timestamp - Error timestamp
 * @property {Object} [context] - Additional error context
 */

/**
 * @typedef {Object} ChatWebSocketEvent
 * @property {string} type - Event type
 * @property {string} [conversationId] - Related conversation ID
 * @property {ChatMessage} [message] - Message data (for message events)
 * @property {TypingIndicator} [typing] - Typing data (for typing events)
 * @property {ReadReceipt} [readReceipt] - Read receipt data
 * @property {ChatPresence} [presence] - Presence data
 * @property {ChatError} [error] - Error data
 * @property {Date} timestamp - Event timestamp
 */

/**
 * @typedef {Object} ChatExportOptions
 * @property {string} conversationId - Conversation to export
 * @property {Date} [startDate] - Export start date
 * @property {Date} [endDate] - Export end date
 * @property {MessageType[]} [includeTypes] - Message types to include
 * @property {boolean} [includeAttachments] - Whether to include attachments
 * @property {string} format - Export format (json, pdf, txt)
 */

/**
 * @typedef {Object} ChatExportResult
 * @property {string} id - Export job ID
 * @property {string} status - Export status (processing, completed, failed)
 * @property {string} [downloadUrl] - Download URL (when completed)
 * @property {number} messageCount - Number of messages exported
 * @property {Date} createdAt - Export creation timestamp
 * @property {Date} [completedAt] - Export completion timestamp
 * @property {ChatError} [error] - Export error (if failed)
 */

/**
 * @typedef {Object} ChatBackup
 * @property {string} id - Backup ID
 * @property {string} userId - User ID
 * @property {Date} createdAt - Backup creation timestamp
 * @property {Date} [completedAt] - Backup completion timestamp
 * @property {string} status - Backup status
 * @property {number} conversationCount - Number of conversations backed up
 * @property {number} messageCount - Number of messages backed up
 * @property {string} [downloadUrl] - Backup download URL
 * @property {string} [checksum] - Backup file checksum
 */

// Union types for specific use cases
/**
 * @typedef {MessageReceivedEvent | MessageUpdatedEvent | MessageDeletedEvent | TypingStartedEvent | TypingEndedEvent | PresenceUpdateEvent | ConversationUpdatedEvent} SpecificChatEvent
 */

/**
 * @typedef {Object} MessageReceivedEvent
 * @property {'message_received'} type
 * @property {ChatMessage} message
 * @property {string} conversationId
 */

/**
 * @typedef {Object} MessageUpdatedEvent
 * @property {'message_updated'} type
 * @property {ChatMessage} message
 * @property {string} conversationId
 */

/**
 * @typedef {Object} MessageDeletedEvent
 * @property {'message_deleted'} type
 * @property {string} messageId
 * @property {string} conversationId
 * @property {string} deletedBy
 */

/**
 * @typedef {Object} TypingStartedEvent
 * @property {'typing_started'} type
 * @property {TypingIndicator} typing
 */

/**
 * @typedef {Object} TypingEndedEvent
 * @property {'typing_ended'} type
 * @property {string} userId
 * @property {string} conversationId
 */

/**
 * @typedef {Object} PresenceUpdateEvent
 * @property {'presence_update'} type
 * @property {ChatPresence} presence
 */

/**
 * @typedef {Object} ConversationUpdatedEvent
 * @property {'conversation_updated'} type
 * @property {Conversation} conversation
 */

// Constants for chat system
/**
 * @type {Object}
 * @property {number} MAX_MESSAGE_LENGTH - Maximum allowed message length
 * @property {number} MAX_ATTACHMENT_SIZE - Maximum attachment size in bytes
 * @property {string[]} ALLOWED_ATTACHMENT_TYPES - Allowed attachment MIME types
 * @property {number} TYPING_INDICATOR_TIMEOUT - Typing indicator timeout in ms
 * @property {number} MESSAGE_EDIT_TIME_LIMIT - Time limit for editing messages in minutes
 * @property {number} CONVERSATION_CLEANUP_DAYS - Days before cleaning up old conversations
 */
export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_ATTACHMENT_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_ATTACHMENT_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  TYPING_INDICATOR_TIMEOUT: 5000, // 5 seconds
  MESSAGE_EDIT_TIME_LIMIT: 15, // 15 minutes
  CONVERSATION_CLEANUP_DAYS: 365, // 1 year
  MAX_GROUP_PARTICIPANTS: 50,
  MESSAGE_PAGE_SIZE: 50,
  CONVERSATION_PAGE_SIZE: 20
};

// Error codes for chat system
/**
 * @typedef {('MESSAGE_TOO_LONG' | 'ATTACHMENT_TOO_LARGE' | 'INVALID_ATTACHMENT_TYPE' | 'CONVERSATION_NOT_FOUND' | 'MESSAGE_NOT_FOUND' | 'PERMISSION_DENIED' | 'USER_BLOCKED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'ENCRYPTION_ERROR')} ChatErrorCode
 */

export const CHAT_ERROR_CODES = {
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  ATTACHMENT_TOO_LARGE: 'ATTACHMENT_TOO_LARGE',
  INVALID_ATTACHMENT_TYPE: 'INVALID_ATTACHMENT_TYPE',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  USER_BLOCKED: 'USER_BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR'
};

// Type guards for runtime type checking
/**
 * @param {any} message
 * @returns {message is ChatMessage}
 */
export const isChatMessage = (message) => {
  return message &&
    typeof message.id === 'string' &&
    typeof message.conversationId === 'string' &&
    typeof message.senderId === 'string' &&
    typeof message.type === 'string' &&
    typeof message.status === 'string' &&
    message.sentAt instanceof Date;
};

/**
 * @param {any} conversation
 * @returns {conversation is Conversation}
 */
export const isConversation = (conversation) => {
  return conversation &&
    typeof conversation.id === 'string' &&
    typeof conversation.type === 'string' &&
    typeof conversation.status === 'string' &&
    Array.isArray(conversation.participants) &&
    conversation.createdAt instanceof Date &&
    conversation.updatedAt instanceof Date;
};

/**
 * @param {any} event
 * @returns {event is ChatWebSocketEvent}
 */
export const isChatWebSocketEvent = (event) => {
  return event &&
    typeof event.type === 'string' &&
    event.timestamp instanceof Date;
};

// Utility types for common patterns
/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {T} [data]
 * @property {ChatError} [error]
 * @property {string} [message]
 */

/**
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]} data
 * @property {ChatPagination} pagination
 */

// Export all types
export default {
  // Core types
  ChatUser,
  ChatMessage,
  Conversation,
  
  // Supporting types
  MessageAttachment,
  MessageReaction,
  ConversationParticipant,
  TypingIndicator,
  ReadReceipt,
  
  // Payload types
  SendMessagePayload,
  CreateConversationPayload,
  
  // Response types
  ChatListResponse,
  MessageListResponse,
  
  // Event types
  ChatWebSocketEvent,
  SpecificChatEvent,
  
  // Utility types
  ApiResponse,
  PaginatedResponse,
  
  // Constants
  CHAT_CONSTANTS,
  CHAT_ERROR_CODES,
  
  // Type guards
  isChatMessage,
  isConversation,
  isChatWebSocketEvent
};