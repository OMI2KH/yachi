import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText, ThemedView } from '../../components/ui';
import { useTheme } from '../../contexts/theme-context';

const { width, height } = Dimensions.get('window');

export default function ConfirmationModal({
  visible = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  type = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  showCancel = true,
  isLoading = false,
  icon = null,
  customContent = null,
  animationType = 'fade',
}) {
  const { theme, colors } = useTheme();
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          confirmColor: colors.success,
          iconColor: colors.success,
        };
      case 'warning':
        return {
          icon: '⚠️',
          confirmColor: colors.warning,
          iconColor: colors.warning,
        };
      case 'error':
        return {
          icon: '❌',
          confirmColor: colors.error,
          iconColor: colors.error,
        };
      case 'info':
        return {
          icon: 'ℹ️',
          confirmColor: colors.info,
          iconColor: colors.info,
        };
      case 'delete':
        return {
          icon: '🗑️',
          confirmColor: colors.error,
          iconColor: colors.error,
          destructive: true,
        };
      default:
        return {
          icon: '❓',
          confirmColor: colors.primary,
          iconColor: colors.text,
        };
    }
  };

  const typeStyles = getTypeStyles();
  const finalDestructive = destructive || typeStyles.destructive;

  const handleConfirm = () => {
    if (!isLoading && onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading && onCancel) {
      onCancel();
    }
  };

  const renderIcon = () => {
    if (icon) return icon;
    
    return (
      <Text style={[styles.icon, { color: typeStyles.iconColor }]}>
        {typeStyles.icon}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={20}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityValue,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleCancel}
          />
          
          <ThemedView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              {renderIcon()}
              <ThemedText style={styles.title}>
                {title}
              </ThemedText>
            </View>

            {/* Body */}
            <View style={styles.body}>
              {customContent ? (
                customContent
              ) : (
                <ThemedText style={styles.message}>
                  {message}
                </ThemedText>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {showCancel && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: colors.border }
                  ]}
                  onPress={handleCancel}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  finalDestructive && styles.destructiveButton,
                  { 
                    backgroundColor: finalDestructive 
                      ? colors.error 
                      : typeStyles.confirmColor,
                    opacity: isLoading ? 0.7 : 1,
                  },
                ]}
                onPress={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.confirmButtonText}>
                      Loading...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {confirmText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  body: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destructiveButton: {
    shadowColor: '#FF3B30',
    shadowOpacity: 0.3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

// Additional specialized confirmation modals
export const DeleteConfirmationModal = (props) => (
  <ConfirmationModal
    type="delete"
    destructive
    title="Delete Confirmation"
    message="This action cannot be undone. Are you sure you want to delete this item?"
    confirmText="Delete"
    {...props}
  />
);

export const LogoutConfirmationModal = (props) => (
  <ConfirmationModal
    type="warning"
    title="Logout"
    message="Are you sure you want to logout? You'll need to sign in again to access your account."
    confirmText="Logout"
    {...props}
  />
);

export const PaymentConfirmationModal = (props) => (
  <ConfirmationModal
    type="info"
    title="Confirm Payment"
    message="Please confirm that you want to proceed with this payment. This action will charge your payment method."
    confirmText="Pay Now"
    {...props}
  />
);

export const BookingConfirmationModal = (props) => (
  <ConfirmationModal
    type="success"
    title="Confirm Booking"
    message="Please confirm your booking details. Once confirmed, the service provider will be notified."
    confirmText="Confirm Booking"
    {...props}
  />
);

export const GovernmentProjectModal = (props) => (
  <ConfirmationModal
    type="info"
    title="Government Project Assignment"
    message="This will assign multiple workers to the government infrastructure project. Confirm to proceed with AI-powered worker allocation."
    confirmText="Assign Workers"
    {...props}
  />
);