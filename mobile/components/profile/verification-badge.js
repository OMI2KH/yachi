// components/profile/verification-badge.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  User,
  Briefcase,
  Award,
  Zap,
  Crown,
  Star,
  Eye,
  Edit3,
  Download,
  Share2,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Verification Badge Component
 * Features: Multi-level verification, Ethiopian market focus, AI-powered verification, premium features
 */

// Enhanced verification types for Ethiopian market
const VERIFICATION_TYPES = {
  identity: {
    label: 'Identity Verified',
    description: 'Government ID has been verified and validated',
    icon: User,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    level: 'high',
    requirements: ['Government ID', 'Biometric verification', 'Background check'],
    trustScore: 95,
    duration: '1 year',
    authority: 'Ethiopian Federal ID System',
  },
  email: {
    label: 'Email Verified',
    description: 'Email address has been confirmed and secured',
    icon: Mail,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
    level: 'basic',
    requirements: ['Email confirmation', 'SPF/DKIM validation'],
    trustScore: 70,
    duration: 'Permanent',
    authority: 'Yachi Security',
  },
  phone: {
    label: 'Phone Verified',
    description: 'Phone number has been confirmed and authenticated',
    icon: Phone,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    level: 'basic',
    requirements: ['SMS verification', 'Carrier validation'],
    trustScore: 75,
    duration: '6 months',
    authority: 'Telecom Ethiopia',
  },
  professional: {
    label: 'Professional Verified',
    description: 'Professional credentials and expertise verified',
    icon: Briefcase,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    level: 'high',
    requirements: ['Professional license', 'Portfolio review', 'Client references', 'Background verification'],
    trustScore: 90,
    duration: '2 years',
    authority: 'Ethiopian Professional Bureau',
  },
  payment: {
    label: 'Payment Verified',
    description: 'Payment methods and financial history secured',
    icon: CreditCard,
    color: '#6366F1',
    gradient: ['#6366F1', '#4F46E5'],
    level: 'medium',
    requirements: ['Bank account verification', 'Transaction history', 'Credit check'],
    trustScore: 85,
    duration: '1 year',
    authority: 'Ethiopian Banking Partners',
  },
  address: {
    label: 'Address Verified',
    description: 'Physical location and residence confirmed',
    icon: MapPin,
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
    level: 'medium',
    requirements: ['Utility bill verification', 'Geolocation confirmation', 'Neighbor validation'],
    trustScore: 80,
    duration: '6 months',
    authority: 'Ethiopian Postal Service',
  },
  government: {
    label: 'Government Verified',
    description: 'Official government entity or contractor',
    icon: Shield,
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
    level: 'premium',
    requirements: ['Government registration', 'Tax clearance', 'Official documentation'],
    trustScore: 98,
    duration: '2 years',
    authority: 'Ethiopian Government',
  },
  premium: {
    label: 'Premium Verified',
    description: 'Enhanced verification with premium features',
    icon: Crown,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    level: 'premium',
    requirements: ['Enhanced background check', 'Financial review', 'Premium subscription'],
    trustScore: 92,
    duration: '1 year',
    authority: 'Yachi Premium',
  },
};

// Enhanced verification statuses
const VERIFICATION_STATUS = {
  pending: {
    label: 'Pending Review',
    color: '#F59E0B',
    icon: Clock,
    description: 'Verification is under review',
  },
  verified: {
    label: 'Verified',
    color: '#10B981',
    icon: CheckCircle,
    description: 'Successfully verified and active',
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444',
    icon: XCircle,
    description: 'Verification was not approved',
  },
  expired: {
    label: 'Expired',
    color: '#6B7280',
    icon: AlertCircle,
    description: 'Verification has expired',
  },
  in_review: {
    label: 'In Review',
    color: '#3B82F6',
    icon: Zap,
    description: 'Currently being reviewed by our team',
  },
  requires_action: {
    label: 'Action Required',
    color: '#F59E0B',
    icon: AlertCircle,
    description: 'Additional information needed',
  },
};

const VerificationBadge = ({
  type,
  status = 'verified',
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  showLabel = true,
  showTooltip = true,
  interactive = true,
  onPress,
  onVerifyPress,
  onDetailsPress,
  user,
  verificationData,
  enableAnalytics = true,
  style,
  testID = 'verification-badge',
}) => {
  const { theme, colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { isUserPremium, premiumTier } = usePremium();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0));
  
  const badgeRef = useRef(null);

  // Enhanced verification configuration
  const verificationConfig = useMemo(() => {
    return VERIFICATION_TYPES[type] || VERIFICATION_TYPES.identity;
  }, [type]);

  // Enhanced status configuration
  const statusConfig = useMemo(() => {
    return VERIFICATION_STATUS[status] || VERIFICATION_STATUS.verified;
  }, [status]);

  // Enhanced size configurations
  const sizeConfig = useMemo(() => {
    const sizes = {
      small: {
        container: 24,
        icon: 12,
        fontSize: 10,
        labelSize: 10,
        padding: 4,
        glowSize: 30,
      },
      medium: {
        container: 32,
        icon: 16,
        fontSize: 12,
        labelSize: 12,
        padding: 6,
        glowSize: 40,
      },
      large: {
        container: 48,
        icon: 24,
        fontSize: 14,
        labelSize: 14,
        padding: 8,
        glowSize: 60,
      },
      xlarge: {
        container: 64,
        icon: 32,
        fontSize: 16,
        labelSize: 16,
        padding: 12,
        glowSize: 80,
      },
    };
    return sizes[size] || sizes.medium;
  }, [size]);

  // Enhanced animation sequences
  const startPulseAnimation = useCallback(() => {
    if (!['pending', 'in_review', 'requires_action'].includes(status)) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [status, pulseAnim]);

  const startRotateAnimation = useCallback(() => {
    if (status !== 'in_review') return;

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [status, rotateAnim]);

  const startGlowAnimation = useCallback(() => {
    if (status !== 'verified' || !isUserPremium) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [status, isUserPremium, glowAnim]);

  // Enhanced press handlers
  const handlePressIn = useCallback(() => {
    if (!interactive) return;
    
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [interactive, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!interactive) return;
    
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [interactive, scaleAnim]);

  // Enhanced badge press with analytics
  const handlePress = useCallback(async () => {
    if (!interactive) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onPress) {
      onPress(type, status);
    } else if (status === 'verified' && showTooltip) {
      setShowDetails(true);
    } else if (['rejected', 'expired', 'requires_action'].includes(status) && onVerifyPress) {
      showVerificationOptions();
    }

    // Analytics tracking
    if (enableAnalytics) {
      // trackVerificationBadgePress(type, status, currentUser.id);
    }
  }, [interactive, type, status, onPress, showTooltip, onVerifyPress, enableAnalytics, currentUser]);

  // Enhanced verification options
  const showVerificationOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options = [
      'View Verification Details',
      'Start Verification Process',
      'Download Requirements',
      'Share Verification Status',
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 4,
        },
        async (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              setShowDetails(true);
              break;
            case 1:
              onVerifyPress?.(type);
              break;
            case 2:
              // Handle download requirements
              break;
            case 3:
              // Handle share
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Verification Options',
        `What would you like to do with ${verificationConfig.label}?`,
        [
          { text: 'View Details', onPress: () => setShowDetails(true) },
          { text: 'Verify Now', onPress: () => onVerifyPress?.(type) },
          { text: 'Download Requirements', onPress: () => {} },
          { text: 'Share Status', onPress: () => {} },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [type, verificationConfig, onVerifyPress]);

  // Start enhanced animations
  React.useEffect(() => {
    startPulseAnimation();
    startRotateAnimation();
    startGlowAnimation();

    return () => {
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [startPulseAnimation, startRotateAnimation, startGlowAnimation]);

  // Enhanced badge icon rendering
  const renderBadgeIcon = () => {
    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const IconComponent = status === 'in_review' ? Zap : statusConfig.icon;
    const iconProps = {
      size: sizeConfig.icon,
      color: '#FFFFFF',
    };

    if (status === 'in_review') {
      return (
        <Animated.View style={{ transform: [{ rotate }] }}>
          <IconComponent {...iconProps} />
        </Animated.View>
      );
    }

    return <IconComponent {...iconProps} />;
  };

  // Enhanced glow effect for premium verified badges
  const renderGlowEffect = () => {
    if (status !== 'verified' || !isUserPremium) return null;

    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    const glowScale = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.2],
    });

    return (
      <Animated.View
        style={[
          styles.glowEffect,
          {
            width: sizeConfig.glowSize,
            height: sizeConfig.glowSize,
            borderRadius: sizeConfig.glowSize / 2,
            backgroundColor: verificationConfig.color,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
    );
  };

  // Enhanced badge rendering
  const renderBadge = () => {
    const isVerified = status === 'verified';
    const isPending = ['pending', 'in_review', 'requires_action'].includes(status);
    const isNegative = ['rejected', 'expired'].includes(status);

    return (
      <Animated.View
        ref={badgeRef}
        style={[
          styles.badgeContainer,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.container / 2,
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim },
            ],
            opacity: isPressed ? 0.8 : 1,
          },
        ]}
      >
        {/* Glow Effect */}
        {renderGlowEffect()}

        {/* Main Badge */}
        {isVerified ? (
          <LinearGradient
            colors={verificationConfig.gradient}
            style={[
              styles.gradientBackground,
              {
                borderRadius: sizeConfig.container / 2,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {renderBadgeIcon()}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.badgeBackground,
              {
                backgroundColor: statusConfig.color,
                borderRadius: sizeConfig.container / 2,
              },
            ]}
          >
            {renderBadgeIcon()}
          </View>
        )}

        {/* Status Indicator */}
        {!isVerified && (
          <View
            style={[
              styles.statusIndicator,
              {
                width: sizeConfig.container / 4,
                height: sizeConfig.container / 4,
                borderRadius: sizeConfig.container / 8,
                backgroundColor: isPending ? '#F59E0B' : '#EF4444',
                borderColor: colors.background,
              },
            ]}
          />
        )}

        {/* Premium Crown for Premium Verification */}
        {type === 'premium' && isVerified && (
          <View style={styles.premiumCrown}>
            <Crown size={sizeConfig.icon / 2} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>
    );
  };

  // Enhanced label rendering
  const renderLabel = () => {
    if (!showLabel) return null;

    const labelText = status === 'verified' 
      ? verificationConfig.label
      : statusConfig.label;

    return (
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.label,
            {
              fontSize: sizeConfig.labelSize,
              color: colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {labelText}
        </Text>
        {status === 'verified' && verificationConfig.trustScore && (
          <View style={[styles.trustScore, { backgroundColor: colors.primary + '15' }]}>
            <Star size={sizeConfig.labelSize - 2} color={colors.primary} />
            <Text style={[styles.trustScoreText, { color: colors.primary }]}>
              {verificationConfig.trustScore}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Enhanced details modal
  const renderDetailsModal = () => (
    <Modal
      visible={showDetails}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDetails(false)}
    >
      <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Enhanced Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              {renderBadge()}
              <View style={styles.modalTitleText}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {verificationConfig.label}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {statusConfig.label} • {verificationConfig.authority}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <XCircle size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Enhanced Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Trust Score */}
            {status === 'verified' && (
              <View style={[styles.trustSection, { backgroundColor: colors.primary + '10' }]}>
                <View style={styles.trustHeader}>
                  <Shield size={20} color={colors.primary} />
                  <Text style={[styles.trustTitle, { color: colors.text }]}>
                    Trust Score
                  </Text>
                </View>
                <View style={styles.trustScoreLarge}>
                  <Text style={[styles.trustScoreValue, { color: colors.primary }]}>
                    {verificationConfig.trustScore}%
                  </Text>
                  <Text style={[styles.trustScoreLabel, { color: colors.textSecondary }]}>
                    Confidence Level
                  </Text>
                </View>
                <View style={styles.trustFactors}>
                  <Text style={[styles.trustFactorsTitle, { color: colors.text }]}>
                    Verification Factors:
                  </Text>
                  {verificationConfig.requirements.map((req, index) => (
                    <View key={index} style={styles.trustFactor}>
                      <CheckCircle size={14} color={colors.success} />
                      <Text style={[styles.trustFactorText, { color: colors.text }]}>
                        {req}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Verification Details */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Verification Details
              </Text>
              
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Status
                  </Text>
                  <View style={styles.detailValueContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                      <statusConfig.icon size={12} color={statusConfig.color} />
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Level
                  </Text>
                  <View style={styles.detailValueContainer}>
                    <View style={[styles.levelBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.levelText, { color: colors.primary }]}>
                        {verificationConfig.level.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {verificationData?.verifiedAt && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Verified On
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(verificationData.verifiedAt).toLocaleDateString('en-ET')}
                    </Text>
                  </View>
                )}

                {verificationConfig.duration && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Duration
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {verificationConfig.duration}
                    </Text>
                  </View>
                )}

                {verificationData?.expiresAt && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Expires On
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(verificationData.expiresAt).toLocaleDateString('en-ET')}
                    </Text>
                  </View>
                )}

                {verificationData?.verifiedBy && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Verified By
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {verificationData.verifiedBy}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Requirements Section */}
            <View style={styles.requirementsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Verification Requirements
              </Text>
              {verificationConfig.requirements.map((requirement, index) => (
                <View key={index} style={styles.requirementItem}>
                  <CheckCircle size={16} color={colors.success} />
                  <Text style={[styles.requirementText, { color: colors.text }]}>
                    {requirement}
                  </Text>
                </View>
              ))}
            </View>

            {/* Enhanced Actions */}
            {interactive && (
              <View style={styles.actionsSection}>
                {status !== 'verified' && onVerifyPress && (
                  <Button
                    title={
                      status === 'rejected' ? 'Re-verify Now' :
                      status === 'expired' ? 'Renew Verification' :
                      status === 'requires_action' ? 'Complete Verification' :
                      'Start Verification'
                    }
                    onPress={() => {
                      setShowDetails(false);
                      onVerifyPress(type);
                    }}
                    variant="primary"
                    size="large"
                    icon={Edit3}
                    style={styles.verifyButton}
                  />
                )}
                
                <View style={styles.secondaryActions}>
                  {onDetailsPress && (
                    <Button
                      title="View Full Details"
                      onPress={() => {
                        setShowDetails(false);
                        onDetailsPress(type);
                      }}
                      variant="outline"
                      icon={Eye}
                      style={styles.detailsButton}
                    />
                  )}
                  
                  <Button
                    title="Share Verification"
                    onPress={() => {
                      // Handle share
                    }}
                    variant="ghost"
                    icon={Share2}
                    style={styles.shareButton}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Pressable
        style={styles.touchableContainer}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!interactive}
        activeOpacity={interactive ? 0.7 : 1}
      >
        {renderBadge()}
        {renderLabel()}
      </Pressable>

      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  touchableContainer: {
    alignItems: 'center',
  },
  badgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glowEffect: {
    position: 'absolute',
    zIndex: -1,
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderWidth: 2,
  },
  premiumCrown: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    padding: 2,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  trustScore: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
    marginTop: 2,
  },
  trustScoreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    borderRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitleText: {
    marginLeft: 16,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  trustSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trustScoreLarge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trustScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  trustScoreLabel: {
    fontSize: 14,
  },
  trustFactors: {
    gap: 8,
  },
  trustFactorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  trustFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustFactorText: {
    fontSize: 14,
    flex: 1,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  requirementsSection: {
    marginBottom: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actionsSection: {
    gap: 16,
  },
  verifyButton: {
    marginBottom: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 2,
  },
  shareButton: {
    flex: 1,
  },
});

// Enhanced Verification Badge Group Component
const VerificationBadgeGroup = ({
  verifications = {},
  layout = 'horizontal', // 'horizontal', 'vertical', 'grid', 'compact'
  maxVisible = 6,
  showAll = false,
  enableTrustScore = true,
  ...props
}) => {
  const { colors } = useTheme();
  const { isUserPremium } = usePremium();

  const visibleVerifications = useMemo(() => {
    const verified = Object.entries(verifications)
      .filter(([_, data]) => data.status === 'verified')
      .sort((a, b) => {
        const aScore = VERIFICATION_TYPES[a[0]]?.trustScore || 0;
        const bScore = VERIFICATION_TYPES[b[0]]?.trustScore || 0;
        return bScore - aScore;
      })
      .map(([type, data]) => ({ type, ...data }));

    const others = Object.entries(verifications)
      .filter(([_, data]) => data.status !== 'verified')
      .map(([type, data]) => ({ type, ...data }));

    const all = [...verified, ...others];
    return showAll ? all : all.slice(0, maxVisible);
  }, [verifications, maxVisible, showAll]);

  const hiddenCount = Object.keys(verifications).length - visibleVerifications.length;
  const totalTrustScore = Object.values(verifications)
    .filter(v => v.status === 'verified')
    .reduce((sum, v) => sum + (VERIFICATION_TYPES[v.type]?.trustScore || 0), 0);
  const averageTrustScore = Math.round(totalTrustScore / Object.keys(verifications).filter(k => verifications[k].status === 'verified').length);

  if (visibleVerifications.length === 0) {
    return (
      <View style={[styles.groupContainer, { alignItems: 'center', padding: 20 }]}>
        <Shield size={48} color={colors.textTertiary} />
        <Text style={[styles.noVerificationsText, { color: colors.textSecondary }]}>
          No verifications yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.groupContainer,
      layout === 'vertical' && styles.groupVertical,
      layout === 'grid' && styles.groupGrid,
      layout === 'compact' && styles.groupCompact,
    ]}>
      {/* Trust Score Header */}
      {enableTrustScore && isUserPremium && (
        <View style={[styles.trustHeader, { backgroundColor: colors.primary + '10' }]}>
          <View style={styles.trustScoreHeader}>
            <Shield size={16} color={colors.primary} />
            <Text style={[styles.trustScoreHeaderText, { color: colors.text }]}>
              Overall Trust Score
            </Text>
          </View>
          <Text style={[styles.overallTrustScore, { color: colors.primary }]}>
            {averageTrustScore}%
          </Text>
        </View>
      )}

      {/* Verification Badges */}
      <View style={styles.badgesContainer}>
        {visibleVerifications.map((verification, index) => (
          <VerificationBadge
            key={verification.type}
            type={verification.type}
            status={verification.status}
            size={layout === 'compact' ? 'small' : 'medium'}
            showLabel={layout !== 'compact'}
            {...props}
          />
        ))}
        
        {hiddenCount > 0 && !showAll && (
          <Pressable
            style={[styles.moreBadge, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.moreText, { color: colors.textSecondary }]}>
              +{hiddenCount}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const groupStyles = StyleSheet.create({
  groupContainer: {
    gap: 12,
  },
  groupVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  groupCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustScoreHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overallTrustScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  moreBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noVerificationsText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default React.memo(VerificationBadge);
export { VerificationBadgeGroup, VERIFICATION_TYPES, VERIFICATION_STATUS };