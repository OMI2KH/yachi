// components/external-link.js
// ============================================================
// YACHI ENTERPRISE EXTERNAL LINK COMPONENT
// ============================================================

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Animated,
  Platform,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

// Context
import { useTheme } from '../contexts/theme-context';
import { useLanguage } from './ui/language-selector';
import { useNotification } from '../contexts/notification-context';

// Services
import { analyticsService } from '../services/analytics-service';
import { securityService } from '../services/security-service';

// Constants
import { YachiColors } from '../constants/colors';
import { AppConfig } from '../config/app';

class YachiExternalLinkService {
  constructor() {
    this.securityLevels = this.getSecurityLevels();
    this.linkVariants = this.getLinkVariants();
    this.linkSizes = this.getLinkSizes();
    this.openStrategies = this.getOpenStrategies();
    this.trustedDomains = this.getTrustedDomains();
  }

  getSecurityLevels() {
    return {
      TRUSTED: 'trusted',
      NEUTRAL: 'neutral',
      SUSPICIOUS: 'suspicious',
      UNKNOWN: 'unknown',
      DANGEROUS: 'dangerous',
    };
  }

  getLinkVariants() {
    return {
      DEFAULT: 'default',
      MINIMAL: 'minimal',
      BUTTON: 'button',
      CARD: 'card',
      INLINE: 'inline',
      ICON: 'icon',
    };
  }

  getLinkSizes() {
    return {
      SMALL: 'small',
      MEDIUM: 'medium',
      LARGE: 'large',
    };
  }

  getOpenStrategies() {
    return {
      IN_APP: 'in_app',
      SYSTEM: 'system',
      ASK: 'ask',
      SAFE: 'safe',
    };
  }

  getTrustedDomains() {
    return [
      'yachi.app',
      'yachi.com',
      'yachi.et',
      'chapa.co',
      'telebirr.et',
      'cbe-birr.et',
      'ethiopianairlines.com',
      'ethiotelecom.et',
      // Add more trusted Ethiopian and partner domains
    ];
  }

  getSecurityConfig(securityLevel) {
    const configs = {
      [this.securityLevels.TRUSTED]: {
        color: YachiColors.success[500],
        icon: 'shield-checkmark',
        label: 'Trusted',
        description: 'Verified and secure link',
        requiresWarning: false,
      },
      [this.securityLevels.NEUTRAL]: {
        color: YachiColors.warning[500],
        icon: 'link',
        label: 'External',
        description: 'External website link',
        requiresWarning: true,
      },
      [this.securityLevels.SUSPICIOUS]: {
        color: YachiColors.warning[600],
        icon: 'warning',
        label: 'Suspicious',
        description: 'Potentially unsafe link',
        requiresWarning: true,
      },
      [this.securityLevels.UNKNOWN]: {
        color: YachiColors.gray[500],
        icon: 'help-circle',
        label: 'Unknown',
        description: 'Unverified link source',
        requiresWarning: true,
      },
      [this.securityLevels.DANGEROUS]: {
        color: YachiColors.error[500],
        icon: 'alert-circle',
        label: 'Dangerous',
        description: 'Potentially harmful link',
        requiresWarning: true,
      },
    };

    return configs[securityLevel] || configs[this.securityLevels.UNKNOWN];
  }

  analyzeUrl(url, customSecurityLevel) {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      const isSecure = parsedUrl.protocol === 'https:';
      
      // Use custom security level if provided
      if (customSecurityLevel && this.securityLevels[customSecurityLevel.toUpperCase()]) {
        return {
          isValid: true,
          domain,
          isSecure,
          securityLevel: customSecurityLevel.toLowerCase(),
          securityConfig: this.getSecurityConfig(customSecurityLevel.toLowerCase()),
          displayUrl: this.formatDisplayUrl(url),
          fullUrl: url,
        };
      }

      // Auto-detect security level
      let securityLevel = this.securityLevels.NEUTRAL;

      // Check against trusted domains
      if (this.trustedDomains.some(trusted => domain.includes(trusted))) {
        securityLevel = this.securityLevels.TRUSTED;
      }
      // Check for suspicious patterns
      else if (this.isSuspiciousDomain(domain)) {
        securityLevel = this.securityLevels.SUSPICIOUS;
      }
      // Check for dangerous patterns
      else if (this.isDangerousDomain(domain)) {
        securityLevel = this.securityLevels.DANGEROUS;
      }
      // Check HTTPS
      else if (!isSecure) {
        securityLevel = this.securityLevels.SUSPICIOUS;
      }

      return {
        isValid: true,
        domain,
        isSecure,
        securityLevel,
        securityConfig: this.getSecurityConfig(securityLevel),
        displayUrl: this.formatDisplayUrl(url),
        fullUrl: url,
      };
    } catch (error) {
      return {
        isValid: false,
        securityLevel: this.securityLevels.UNKNOWN,
        securityConfig: this.getSecurityConfig(this.securityLevels.UNKNOWN),
        displayUrl: 'Invalid URL',
        fullUrl: url,
      };
    }
  }

  isSuspiciousDomain(domain) {
    const suspiciousPatterns = [
      'phishing',
      'malware',
      'spam',
      'fake',
      'clone',
      'copy',
      'lookalike',
      // Add more suspicious patterns
    ];
    
    return suspiciousPatterns.some(pattern => 
      domain.toLowerCase().includes(pattern)
    );
  }

  isDangerousDomain(domain) {
    const dangerousPatterns = [
      'malicious',
      'harmful',
      'dangerous',
      'exploit',
      // Add more dangerous patterns
    ];
    
    return dangerousPatterns.some(pattern => 
      domain.toLowerCase().includes(pattern)
    );
  }

  formatDisplayUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url;
    
    const start = url.substring(0, maxLength / 2 - 3);
    const end = url.substring(url.length - maxLength / 2 + 3);
    return `${start}...${end}`;
  }

  getSizeConfig(size) {
    const configs = {
      [this.linkSizes.SMALL]: {
        padding: 8,
        iconSize: 14,
        fontSize: 12,
        badgeFontSize: 10,
      },
      [this.linkSizes.MEDIUM]: {
        padding: 12,
        iconSize: 16,
        fontSize: 14,
        badgeFontSize: 11,
      },
      [this.linkSizes.LARGE]: {
        padding: 16,
        iconSize: 18,
        fontSize: 16,
        badgeFontSize: 12,
      },
    };

    return configs[size] || configs[this.linkSizes.MEDIUM];
  }

  getVariantConfig(variant, colors) {
    const configs = {
      [this.linkVariants.DEFAULT]: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        textColor: colors.foreground,
        padding: 12,
        borderRadius: 8,
        showIcon: true,
        showBadge: true,
      },
      [this.linkVariants.MINIMAL]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.primary,
        padding: 4,
        borderRadius: 0,
        showIcon: true,
        showBadge: false,
      },
      [this.linkVariants.BUTTON]: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        textColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        showIcon: true,
        showBadge: false,
      },
      [this.linkVariants.CARD]: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        textColor: colors.foreground,
        padding: 16,
        borderRadius: 12,
        showIcon: true,
        showBadge: true,
        shadow: true,
      },
      [this.linkVariants.INLINE]: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.primary,
        padding: 0,
        borderRadius: 0,
        showIcon: false,
        showBadge: false,
      },
      [this.linkVariants.ICON]: {
        backgroundColor: colors.muted,
        borderColor: colors.border,
        textColor: colors.foreground,
        padding: 8,
        borderRadius: 20,
        showIcon: true,
        showBadge: false,
      },
    };

    return configs[variant] || configs[this.linkVariants.DEFAULT];
  }

  getDefaultMessages() {
    return {
      en: {
        securityWarning: 'Security Warning',
        externalLink: 'External Link',
        openInApp: 'Open in App Browser',
        openInSystem: 'Open in System Browser',
        cancel: 'Cancel',
        continue: 'Continue',
        loading: 'Opening...',
        error: 'Failed to open link',
        invalidUrl: 'Invalid URL',
        trusted: 'Trusted',
        external: 'External',
        suspicious: 'Suspicious',
        unknown: 'Unknown',
        dangerous: 'Dangerous',
      },
      am: {
        securityWarning: 'የደህንነት ማስጠንቀቂያ',
        externalLink: 'የውጭ አገናኝ',
        openInApp: 'በአፕ አሳሽ ውስጥ ክፈት',
        openInSystem: 'በስርአት አሳሽ ውስጥ ክፈት',
        cancel: 'ሰርዝ',
        continue: 'ቀጥል',
        loading: 'በመክፈት ላይ...',
        error: 'አገናኙን ማከፈት አልተቻለም',
        invalidUrl: 'ልክ ያልሆነ URL',
        trusted: 'ታማኝ',
        external: 'ውጫዊ',
        suspicious: 'ጠራጣሪ',
        unknown: 'የማይታወቅ',
        dangerous: 'አደገኛ',
      },
      om: {
        securityWarning: 'Dhimma Biiraa',
        externalLink: 'Mallattoo Alaa',
        openInApp: 'App Broozeraatti Bani',
        openInSystem: 'Sistemi Broozeraatti Bani',
        cancel: 'Dhiisi',
        continue: 'Itti Fufi',
        loading: 'Banaa jira...',
        error: 'Mallattoo banuu hin dandeenye',
        invalidUrl: 'URL dogoggora',
        trusted: 'Amanna',
        external: 'Alaa',
        suspicious: 'Shakkii qaba',
        unknown: 'Kan hin beekamne',
        dangerous: 'Balaa qaba',
      },
    };
  }
}

// Singleton instance
export const externalLinkService = new YachiExternalLinkService();

/**
 * Enterprise External Link Component with Advanced Security Features
 * Supports secure link handling, multiple opening strategies, and comprehensive analytics
 */
export default function ExternalLink({
  // Core Props
  url,
  children,
  title,
  description,
  
  // Configuration
  variant = externalLinkService.linkVariants.DEFAULT,
  size = externalLinkService.linkSizes.MEDIUM,
  securityLevel = 'auto', // 'auto', 'trusted', 'neutral', 'suspicious', 'unknown', 'dangerous'
  openStrategy = externalLinkService.openStrategies.IN_APP,
  showSecurityBadge = true,
  showLoading = true,
  showConfirmation = false,
  
  // Customization
  customIcon,
  iconPosition = 'right',
  disabled = false,
  
  // Styling
  style,
  textStyle,
  iconStyle,
  
  // Technical
  testID = 'yachi-external-link',
  accessibilityLabel,
  analyticsEvent = 'external_link_click',
  
  // Callbacks
  onPress,
  onSuccess,
  onError,
  onSecurityWarning,
}) {
  const { theme, colors, isDark } = useTheme();
  const { currentLanguage, isRTL } = useLanguage();
  const { showNotification } = useNotification();
  
  // Refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Memoized values
  const messages = useMemo(() => 
    externalLinkService.getDefaultMessages()[currentLanguage.code] || 
    externalLinkService.getDefaultMessages().en,
    [currentLanguage]
  );

  const linkData = useMemo(() => 
    externalLinkService.analyzeUrl(url, securityLevel),
    [url, securityLevel]
  );

  const variantConfig = useMemo(() => 
    externalLinkService.getVariantConfig(variant, colors),
    [variant, colors]
  );

  const sizeConfig = useMemo(() => 
    externalLinkService.getSizeConfig(size),
    [size]
  );

  const resolvedAccessibilityLabel = useMemo(() => 
    accessibilityLabel || 
    `${title || messages.externalLink} - ${linkData.securityConfig.description}`,
    [accessibilityLabel, title, messages, linkData]
  );

  // Animation methods
  const animatePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const triggerHapticFeedback = useCallback(() => {
    if (Platform.OS === 'web') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Security and analytics
  const trackAnalytics = useCallback(() => {
    analyticsService.trackEvent(analyticsEvent, {
      url: linkData.fullUrl,
      domain: linkData.domain,
      security_level: linkData.securityLevel,
      open_strategy: openStrategy,
      variant: variant,
      timestamp: new Date().toISOString(),
    });
  }, [analyticsEvent, linkData, openStrategy, variant]);

  const showSecurityAlert = useCallback(() => {
    const showAlert = () => {
      Alert.alert(
        messages.securityWarning,
        `${messages.externalLink}: ${linkData.domain}\n\n${linkData.securityConfig.description}`,
        [
          { 
            text: messages.cancel, 
            style: 'cancel',
            onPress: () => {
              onSecurityWarning?.(linkData, 'cancelled');
            },
          },
          {
            text: messages.continue,
            style: linkData.securityLevel === externalLinkService.securityLevels.DANGEROUS ? 'destructive' : 'default',
            onPress: () => {
              onSecurityWarning?.(linkData, 'continued');
              openUrl();
            },
          },
        ]
      );
    };

    onSecurityWarning?.(linkData, 'warning_shown');
    showAlert();
    return true;
  }, [linkData, messages, onSecurityWarning, openUrl]);

  // URL handling
  const openUrl = useCallback(async () => {
    if (!linkData.isValid) {
      setHasError(true);
      onError?.(new Error(messages.invalidUrl), linkData);
      showNotification({
        type: 'error',
        title: 'Error',
        message: messages.invalidUrl,
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    setHasError(false);
    
    try {
      triggerHapticFeedback();
      trackAnalytics();

      // Custom handler
      if (onPress) {
        await onPress(linkData.fullUrl);
        return;
      }

      let result;

      switch (openStrategy) {
        case externalLinkService.openStrategies.IN_APP:
          result = await WebBrowser.openBrowserAsync(linkData.fullUrl, {
            toolbarColor: colors.primary,
            controlsColor: '#FFFFFF',
            dismissButtonStyle: 'close',
            enableBarCollapsing: true,
            showTitle: true,
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          });
          break;

        case externalLinkService.openStrategies.SYSTEM:
          const canOpen = await Linking.canOpenURL(linkData.fullUrl);
          if (canOpen) {
            await Linking.openURL(linkData.fullUrl);
            result = { type: 'system' };
          } else {
            throw new Error('Cannot open URL in system browser');
          }
          break;

        case externalLinkService.openStrategies.SAFE:
          // Always use in-app browser for safe mode
          result = await WebBrowser.openBrowserAsync(linkData.fullUrl, {
            toolbarColor: colors.primary,
            controlsColor: '#FFFFFF',
            dismissButtonStyle: 'close',
          });
          break;

        case externalLinkService.openStrategies.ASK:
        default:
          result = await showOpenStrategyDialog();
          break;
      }

      onSuccess?.(result, linkData);
      
    } catch (error) {
      console.error('Failed to open URL:', error);
      setHasError(true);
      onError?.(error, linkData);
      
      showNotification({
        type: 'error',
        title: 'Error',
        message: messages.error,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    linkData,
    openStrategy,
    colors,
    messages,
    onPress,
    onSuccess,
    onError,
    triggerHapticFeedback,
    trackAnalytics,
    showNotification,
  ]);

  const showOpenStrategyDialog = useCallback(() => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        messages.externalLink,
        `${messages.externalLink}: ${linkData.displayUrl}`,
        [
          {
            text: messages.openInApp,
            onPress: async () => {
              try {
                const result = await WebBrowser.openBrowserAsync(linkData.fullUrl, {
                  toolbarColor: colors.primary,
                  controlsColor: '#FFFFFF',
                });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            },
          },
          {
            text: messages.openInSystem,
            onPress: async () => {
              try {
                await Linking.openURL(linkData.fullUrl);
                resolve({ type: 'system' });
              } catch (error) {
                reject(error);
              }
            },
          },
          {
            text: messages.cancel,
            style: 'cancel',
            onPress: () => reject(new Error('Cancelled by user')),
          },
        ]
      );
    });
  }, [linkData, messages, colors]);

  // Interaction handler
  const handlePress = useCallback(() => {
    if (isLoading || disabled || !linkData.isValid) return;

    animatePress();

    // Show confirmation for sensitive operations
    if (showConfirmation) {
      Alert.alert(
        messages.externalLink,
        ` ${linkData.displayUrl}`,
        [
          { text: messages.cancel, style: 'cancel' },
          { 
            text: messages.continue, 
            onPress: () => {
              if (linkData.securityConfig.requiresWarning) {
                showSecurityAlert();
              } else {
                openUrl();
              }
            },
          },
        ]
      );
      return;
    }

    // Show security warning for suspicious links
    if (linkData.securityConfig.requiresWarning) {
      showSecurityAlert();
      return;
    }

    // Open directly for trusted links
    openUrl();
  }, [
    isLoading,
    disabled,
    linkData,
    showConfirmation,
    showSecurityAlert,
    openUrl,
    animatePress,
    messages,
  ]);

  // Render methods
  const renderSecurityBadge = () => {
    if (!showSecurityBadge || !variantConfig.showBadge) return null;

    return (
      <View
        style={[
          styles.securityBadge,
          {
            backgroundColor: `${linkData.securityConfig.color}20`,
            borderColor: linkData.securityConfig.color,
          },
        ]}
      >
        <Ionicons
          name={linkData.securityConfig.icon}
          size={sizeConfig.badgeFontSize}
          color={linkData.securityConfig.color}
        />
        <Text
          style={[
            styles.securityBadgeText,
            {
              color: linkData.securityConfig.color,
              fontSize: sizeConfig.badgeFontSize,
            },
          ]}
        >
          {messages[linkData.securityLevel] || linkData.securityConfig.label}
        </Text>
      </View>
    );
  };

  const renderIcon = () => {
    if (!variantConfig.showIcon) return null;

    const icon = customIcon || 'open-outline';
    
    return (
      <Ionicons
        name={icon}
        size={sizeConfig.iconSize}
        color={variantConfig.textColor}
        style={[
          styles.icon,
          iconStyle,
        ]}
      />
    );
  };

  const renderLoading = () => {
    if (!isLoading || !showLoading) return null;

    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator 
          size="small" 
          color={variantConfig.textColor} 
        />
      </View>
    );
  };

  const renderError = () => {
    if (!hasError) return null;

    return (
      <View style={styles.errorIndicator}>
        <Ionicons name="warning" size={14} color={colors.error} />
      </View>
    );
  };

  const renderContent = () => {
    if (children) return children;

    const isIconLeft = (iconPosition === 'left' && !isRTL) || (iconPosition === 'right' && isRTL);

    return (
      <View style={styles.content}>
        {isIconLeft && renderIcon()}
        
        <View style={styles.textContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  color: variantConfig.textColor,
                  fontSize: sizeConfig.fontSize,
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {description && (
            <Text
              style={[
                styles.description,
                {
                  color: variantConfig.textColor,
                  fontSize: sizeConfig.fontSize - 2,
                  opacity: 0.8,
                },
                textStyle,
              ]}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}
          {!title && !description && (
            <Text
              style={[
                styles.url,
                {
                  color: variantConfig.textColor,
                  fontSize: sizeConfig.fontSize,
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {linkData.displayUrl}
            </Text>
          )}
        </View>

        {!isIconLeft && renderIcon()}
      </View>
    );
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: variantConfig.backgroundColor,
      borderColor: variantConfig.borderColor,
      borderWidth: variantConfig.borderColor === 'transparent' ? 0 : 1,
      padding: variantConfig.padding,
      borderRadius: variantConfig.borderRadius,
      opacity: disabled ? 0.5 : 1,
      transform: [{ scale: scaleAnim }],
    },
    variantConfig.shadow && styles.shadow,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading || disabled || !linkData.isValid}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="link"
      accessibilityState={{ 
        busy: isLoading,
        disabled: disabled || !linkData.isValid,
      }}
    >
      <Animated.View style={containerStyle}>
        {renderContent()}
        {renderSecurityBadge()}
        {renderLoading()}
        {renderError()}
      </Animated.View>
    </TouchableOpacity>
  );
}

// External Link List Component
export function ExternalLinkList({
  links = [],
  title,
  description,
  maxVisible = 5,
  showMore = true,
  variant = 'default',
  ...props
}) {
  const { colors } = useTheme();
  const { currentLanguage } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const messages = externalLinkService.getDefaultMessages()[currentLanguage.code] || 
                  externalLinkService.getDefaultMessages().en;

  const visibleLinks = expanded ? links : links.slice(0, maxVisible);
  const hiddenCount = links.length - visibleLinks.length;

  if (links.length === 0) return null;

  return (
    <View style={[styles.listContainer, { backgroundColor: colors.card }]}>
      {(title || description) && (
        <View style={styles.listHeader}>
          {title && (
            <Text style={[styles.listTitle, { color: colors.foreground }]}>
              {title}
            </Text>
          )}
          {description && (
            <Text style={[styles.listDescription, { color: colors.mutedForeground }]}>
              {description}
            </Text>
          )}
        </View>
      )}

      {visibleLinks.map((link, index) => (
        <View key={link.id || index} style={styles.listItem}>
          <ExternalLink {...link} variant={variant} {...props} />
        </View>
      ))}

      {showMore && hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={[styles.showMoreText, { color: colors.primary }]}>
            {expanded ? messages.cancel : `${messages.continue} ${hiddenCount} ${messages.more}`}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontFamily: 'Inter-Regular',
  },
  url: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  icon: {
    marginHorizontal: 4,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 4,
    gap: 4,
  },
  securityBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  // List styles
  listContainer: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  listItem: {
    marginBottom: 8,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
});

export { externalLinkService };