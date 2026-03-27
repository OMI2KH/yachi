// components/chat/typing-indicator.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { ThemedText } from '../ui/themed-text';
import Avatar from '../ui/avatar';

/**
 * Typing Indicator Component
 * Ethiopian Home Services Platform - Real-time typing indicators
 * Supports multiple users, construction projects, and service coordination
 */

const TypingIndicator = ({
  // Typing data
  typingUsers = [],
  isVisible = false,
  
  // Configuration
  mode = 'default', // 'default', 'compact', 'minimal'
  position = 'left', // 'left', 'right'
  showNames = true,
  animationSpeed = 1.0,
  dotSize = 4,
  
  // Context
  chatType = 'direct', // 'direct', 'group', 'construction', 'booking'
  
  // Styling
  style,
  testID = 'typing-indicator',
}) => {
  const { theme } = useTheme();
  
  const dotAnimations = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  const animationRef = useRef(null);
  const timeoutRef = useRef(null);

  // Colors based on theme and position
  const colors = useMemo(() => {
    const isOwn = position === 'right';
    
    return {
      dotColor: isOwn ? '#FFFFFF' : theme.colors.textSecondary,
      backgroundColor: isOwn ? theme.colors.primary : theme.colors.card,
      textColor: isOwn ? '#FFFFFF' : theme.colors.textSecondary,
    };
  }, [position, theme]);

  // Typing user names display
  const typingDisplay = useMemo(() => {
    if (typingUsers.length === 0) return '';
    
    // Special handling for different chat types
    if (chatType === 'construction') {
      if (typingUsers.length === 1) {
        return `${typingUsers[0].name} is updating project`;
      }
      return `${typingUsers.length} team members are updating`;
    }
    
    if (chatType === 'booking') {
      if (typingUsers.length === 1) {
        return `${typingUsers[0].name} is responding`;
      }
      return 'Service provider is responding';
    }
    
    // Default chat typing messages
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing`;
    }
    
    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    }
    
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`;
  }, [typingUsers, chatType]);

  // Start typing animation
  const startAnimation = useCallback(() => {
    if (!isVisible) return;

    // Reset all dots to bottom position
    dotAnimations.forEach(anim => anim.setValue(0));

    // Create animation sequence for typing dots
    const animations = [
      // Dot 1
      Animated.sequence([
        Animated.delay(0),
        Animated.timing(dotAnimations[0], {
          toValue: 1,
          duration: 400 * (1 / animationSpeed),
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimations[0], {
          toValue: 0,
          duration: 400 * (1 / animationSpeed),
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
      // Dot 2
      Animated.sequence([
        Animated.delay(150 * (1 / animationSpeed)),
        Animated.timing(dotAnimations[1], {
          toValue: 1,
          duration: 400 * (1 / animationSpeed),
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimations[1], {
          toValue: 0,
          duration: 400 * (1 / animationSpeed),
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
      // Dot 3
      Animated.sequence([
        Animated.delay(300 * (1 / animationSpeed)),
        Animated.timing(dotAnimations[2], {
          toValue: 1,
          duration: 400 * (1 / animationSpeed),
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimations[2], {
          toValue: 0,
          duration: 400 * (1 / animationSpeed),
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
    ];

    // Run all animations in parallel
    animationRef.current = Animated.parallel(animations);

    animationRef.current.start(({ finished }) => {
      if (finished && isVisible) {
        // Continue animation with random delay for natural feel
        const randomDelay = 800 + Math.random() * 1200;
        timeoutRef.current = setTimeout(startAnimation, randomDelay * (1 / animationSpeed));
      }
    });
  }, [isVisible, dotAnimations, animationSpeed]);

  // Pulse animation for minimal mode
  const startPulseAnimation = useCallback(() => {
    if (!isVisible || mode !== 'minimal') return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 600 * (1 / animationSpeed),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 600 * (1 / animationSpeed),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isVisible, mode, animationSpeed, pulseAnimation]);

  // Stop all animations
  const stopAnimations = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset animation values
    dotAnimations.forEach(anim => anim.setValue(0));
    pulseAnimation.setValue(1);
  }, [dotAnimations, pulseAnimation]);

  // Effect to handle animation lifecycle
  useEffect(() => {
    if (isVisible && typingUsers.length > 0) {
      if (mode === 'minimal') {
        startPulseAnimation();
      } else {
        startAnimation();
      }
    } else {
      stopAnimations();
    }

    return stopAnimations;
  }, [isVisible, typingUsers.length, mode, startAnimation, startPulseAnimation, stopAnimations]);

  // Render animated dot
  const renderAnimatedDot = (index) => {
    const translateY = dotAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -dotSize * 2],
    });

    const opacity = dotAnimations[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: colors.dotColor,
            transform: [{ translateY }],
            opacity,
            marginHorizontal: dotSize / 2,
          },
        ]}
      />
    );
  };

  // Render typing dots
  const renderTypingDots = () => {
    if (mode === 'minimal') {
      return (
        <Animated.View
          style={[
            styles.minimalDot,
            {
              width: dotSize * 1.5,
              height: dotSize * 1.5,
              borderRadius: (dotSize * 1.5) / 2,
              backgroundColor: colors.dotColor,
              transform: [{ scale: pulseAnimation }],
            },
          ]}
        />
      );
    }

    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map(renderAnimatedDot)}
      </View>
    );
  };

  // Render user avatars for group typing
  const renderTypingAvatars = () => {
    if (mode === 'compact' || mode === 'minimal') return null;
    
    const visibleUsers = typingUsers.slice(0, 3);
    
    return (
      <View style={styles.avatarsContainer}>
        {visibleUsers.map((user, index) => (
          <Avatar
            key={user.id}
            source={user.avatar ? { uri: user.avatar } : null}
            name={user.name}
            size="small"
            style={[
              styles.avatar,
              { marginLeft: index > 0 ? -8 : 0 }
            ]}
          />
        ))}
      </View>
    );
  };

  // Render compact typing indicator
  const renderCompactIndicator = () => (
    <View
      style={[
        styles.compactContainer,
        {
          backgroundColor: colors.backgroundColor,
          alignSelf: position === 'right' ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      {renderTypingDots()}
    </View>
  );

  // Render default typing indicator
  const renderDefaultIndicator = () => (
    <View
      style={[
        styles.defaultContainer,
        {
          backgroundColor: colors.backgroundColor,
          alignSelf: position === 'right' ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      {renderTypingAvatars()}
      
      <View style={styles.content}>
        {showNames && typingDisplay && (
          <ThemedText 
            type="caption" 
            color={position === 'right' ? 'white' : 'secondary'}
            numberOfLines={1}
            style={styles.typingText}
          >
            {typingDisplay}
          </ThemedText>
        )}
        
        {renderTypingDots()}
      </View>
    </View>
  );

  // Don't render if not visible or no typing users
  if (!isVisible || typingUsers.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={typingDisplay || "Someone is typing"}
      accessibilityLiveRegion="polite"
    >
      {mode === 'compact' || mode === 'minimal' 
        ? renderCompactIndicator()
        : renderDefaultIndicator()
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  defaultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: 60,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typingText: {
    flex: 1,
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    marginHorizontal: 2,
  },
  minimalDot: {
    alignSelf: 'center',
  },
});

export default TypingIndicator;

// Hook for using typing indicator
export const useTypingIndicator = (chatId) => {
  const [typingUsers, setTypingUsers] = useState([]);

  const addTypingUser = useCallback((user) => {
    setTypingUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) return prev;
      return [...prev, user];
    });
  }, []);

  const removeTypingUser = useCallback((userId) => {
    setTypingUsers(prev => prev.filter(user => user.id !== userId));
  }, []);

  const clearTypingUsers = useCallback(() => {
    setTypingUsers([]);
  }, []);

  return {
    typingUsers,
    addTypingUser,
    removeTypingUser,
    clearTypingUsers,
    isVisible: typingUsers.length > 0,
  };
};