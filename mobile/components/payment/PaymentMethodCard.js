import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const PaymentMethodCard = ({ 
  method, 
  isSelected = false, 
  onSelect, 
  onRemove,
  onSetDefault,
  showActions = true,
  style
}) => {
  const { colors, theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get provider display name
  const getProviderName = (provider) => {
    const providerNames = {
      'chapa': 'Chapa',
      'telebirr': 'Telebirr',
      'cbe_birr': 'CBE Birr',
      'card': 'Card',
      'mobile_money': 'Mobile Money',
      'bank_account': 'Bank Account'
    };
    return providerNames[provider] || provider;
  };

  // Get provider icon
  const getProviderIcon = (provider, methodType) => {
    const iconColor = isSelected ? colors.primary : colors.text;
    const size = 24;
    
    // Ethiopian gateway icons
    if (provider === 'chapa') {
      return <FontAwesome5 name="money-bill-wave" size={size} color={iconColor} />;
    }
    if (provider === 'telebirr') {
      return <FontAwesome5 name="mobile-alt" size={size} color={iconColor} />;
    }
    if (provider === 'cbe_birr') {
      return <FontAwesome5 name="university" size={size} color={iconColor} />;
    }
    
    // Method type icons for fallback
    if (methodType === 'card') {
      return <Ionicons name="card" size={size} color={iconColor} />;
    }
    if (methodType === 'mobile_money') {
      return <Ionicons name="phone-portrait" size={size} color={iconColor} />;
    }
    if (methodType === 'bank_account') {
      return <FontAwesome5 name="university" size={size} color={iconColor} />;
    }
    
    return <Ionicons name="wallet" size={size} color={iconColor} />;
  };

  // Format display information
  const getDisplayInfo = () => {
    if (method.methodType === 'card' && method.lastFour) {
      return `Card •••• ${method.lastFour}`;
    }
    
    if (method.methodType === 'mobile_money' && method.metadata?.phoneNumber) {
      const phone = method.metadata.phoneNumber;
      return `Mobile Money ${phone.substring(0, 3)}••••${phone.substring(7)}`;
    }
    
    if (method.methodType === 'bank_account' && method.metadata?.accountNumber) {
      const account = method.metadata.accountNumber;
      const lastFour = account.slice(-4);
      return `Bank Account ••••${lastFour}`;
    }
    
    return `${getProviderName(method.methodType)} • ${getProviderName(method.provider)}`;
  };

  // Format expiry date
  const getExpiryDisplay = () => {
    if (method.expiryMonth && method.expiryYear) {
      const month = method.expiryMonth.toString().padStart(2, '0');
      const year = method.expiryYear.toString().slice(-2);
      return `Expires ${month}/${year}`;
    }
    return null;
  };

  // Handle remove confirmation
  const handleRemove = () => {
    if (method.isDefault) {
      Alert.alert(
        'Cannot Remove Default',
        'Please set another payment method as default before removing this one.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onRemove(method.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove payment method');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle set as default
  const handleSetDefault = async () => {
    if (method.isDefault) return;
    
    setIsLoading(true);
    try {
      await onSetDefault(method.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to set default payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: isSelected ? colors.primary : 'transparent',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      ...style,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    methodInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isSelected ? `${colors.primary}15` : colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    methodName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    methodDetails: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    expiryText: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    defaultBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: 8,
    },
    defaultText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '600',
    },
    selectIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isSelected ? colors.primary : colors.border,
      backgroundColor: isSelected ? colors.primary : 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.white,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect ? () => onSelect(method) : null}
      activeOpacity={onSelect ? 0.7 : 1}
      disabled={isLoading}
    >
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.methodInfo}>
          <View style={styles.iconContainer}>
            {getProviderIcon(method.provider, method.methodType)}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.methodName}>
              {getProviderName(method.provider)}
            </Text>
            <Text style={styles.methodDetails}>
              {getDisplayInfo()}
            </Text>
            {getExpiryDisplay() && (
              <Text style={styles.expiryText}>
                {getExpiryDisplay()}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.badgeContainer}>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>DEFAULT</Text>
            </View>
          )}
          
          {onSelect && (
            <View style={styles.selectIcon}>
              {isSelected && <View style={styles.selectInner} />}
            </View>
          )}
        </View>
      </View>

      {showActions && onRemove && onSetDefault && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${colors.error}15` }]}
            onPress={handleRemove}
            disabled={isLoading}
          >
            <MaterialIcons name="delete-outline" size={20} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>
              Remove
            </Text>
          </TouchableOpacity>
          
          {!method.isDefault && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
              onPress={handleSetDefault}
              disabled={isLoading}
            >
              <MaterialIcons name="star" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>
                Set as Default
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default PaymentMethodCard;