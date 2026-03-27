// components/chat/chat-header.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { ThemedText } from '../ui/themed-text';
import Avatar from '../ui/avatar';
import Badge from '../ui/badge';

const ChatHeader = ({
  receiver,
  context,
  onBack,
  onClose,
  onCallPress,
  onVideoCallPress,
  onInfoPress,
  enableCalls,
  enableVideoCalls,
  isTyping,
}) => {
  const { theme } = useTheme();
  
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
            source={receiver.avatar ? { uri: receiver.avatar } : null}
            name={receiver.name}
            size="medium"
            status={receiver.isOnline ? 'online' : 'offline'}
          />
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <ThemedText type="body" weight="semiBold">
                {receiver.name}
              </ThemedText>
              {receiver.premiumBadge && (
                <Badge variant="filled" color="warning" size="small">
                  ⭐ Premium
                </Badge>
              )}
            </View>
            <ThemedText type="caption" color="secondary">
              {receiver.isOnline ? 'Online' : 'Offline'}
              {isTyping && ' • Typing...'}
              {receiver.userType === 'provider' && ' • Service Provider'}
              {receiver.userType === 'government' && ' • Government Official'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.headerActions}>
          {enableCalls && (
            <TouchableOpacity style={styles.headerButton} onPress={onCallPress}>
              <Ionicons name="call" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          {enableVideoCalls && (
            <TouchableOpacity style={styles.headerButton} onPress={onVideoCallPress}>
              <Ionicons name="videocam" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={onInfoPress}>
            <Ionicons name="information-circle" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Context information */}
      {(context.booking || context.project || context.service) && (
        <View style={styles.contextBar}>
          {context.booking && (
            <ThemedText type="caption" color="secondary">
              Booking: {context.booking.service?.title}
            </ThemedText>
          )}
          {context.project && (
            <ThemedText type="caption" color="secondary">
              Project: {context.project.title} • {context.project.type}
            </ThemedText>
          )}
          {context.service && (
            <ThemedText type="caption" color="secondary">
              Service: {context.service.title}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
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
    gap: 2,
  },
});

export default ChatHeader;