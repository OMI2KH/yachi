// components/ui/language-selector.js
// ============================================================
// YACHI ENTERPRISE LANGUAGE SELECTOR
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  StyleSheet,
  I18nManager 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context
import { useTheme } from '../../contexts/theme-context';
import { useNotification } from '../../contexts/notification-context';

// Constants
import { YachiColors } from '../../constants/colors';
import { AppConfig } from '../../config/app';

class YachiLanguageService {
  constructor() {
    this.STORAGE_KEY = 'yachi_selected_language';
    this.supportedLanguages = this.getSupportedLanguages();
  }

  getSupportedLanguages() {
    return {
      en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        flag: '🇺🇸',
        rtl: false
      },
      am: {
        code: 'am',
        name: 'Amharic',
        nativeName: 'አማርኛ',
        direction: 'ltr',
        flag: '🇪🇹',
        rtl: false
      },
      om: {
        code: 'om',
        name: 'Oromo',
        nativeName: 'Oromoo',
        direction: 'ltr',
        flag: '🇪🇹',
        rtl: false
      }
    };
  }

  async getCurrentLanguage() {
    try {
      // Check stored preference first
      const storedLanguage = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedLanguage && this.supportedLanguages[storedLanguage]) {
        return this.supportedLanguages[storedLanguage];
      }

      // Fallback to device language
      const deviceLocale = Localization.locale.split('-')[0];
      return this.supportedLanguages[deviceLocale] || this.supportedLanguages.en;
    } catch (error) {
      console.error('Error getting current language:', error);
      return this.supportedLanguages.en;
    }
  }

  async setLanguage(languageCode) {
    try {
      const language = this.supportedLanguages[languageCode];
      if (!language) {
        throw new Error(`Unsupported language: ${languageCode}`);
      }

      // Store preference
      await AsyncStorage.setItem(this.STORAGE_KEY, languageCode);

      // Update app direction for RTL languages
      if (I18nManager.forceRTL !== language.rtl) {
        I18nManager.forceRTL(language.rtl);
        I18nManager.allowRTL(language.rtl);
      }

      return language;
    } catch (error) {
      console.error('Error setting language:', error);
      throw error;
    }
  }

  getLanguageDirection(languageCode) {
    const language = this.supportedLanguages[languageCode];
    return language?.direction || 'ltr';
  }

  isRTL(languageCode) {
    const language = this.supportedLanguages[languageCode];
    return language?.rtl || false;
  }
}

// Singleton instance
export const languageService = new YachiLanguageService();

const LanguageSelector = ({
  visible = false,
  onClose = () => {},
  showAsModal = true,
  position = 'bottom-right',
  triggerComponent,
  onLanguageChange = () => {}
}) => {
  const { theme, colors } = useTheme();
  const { showNotification } = useNotification();
  
  const [currentLanguage, setCurrentLanguage] = useState(languageService.supportedLanguages.en);
  const [isLoading, setIsLoading] = useState(false);

  // Load current language on mount
  React.useEffect(() => {
    loadCurrentLanguage();
  }, []);

  const loadCurrentLanguage = async () => {
    try {
      const language = await languageService.getCurrentLanguage();
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error loading current language:', error);
    }
  };

  const handleLanguageChange = async (languageCode) => {
    if (isLoading || currentLanguage.code === languageCode) return;

    setIsLoading(true);
    try {
      const newLanguage = await languageService.setLanguage(languageCode);
      setCurrentLanguage(newLanguage);
      
      // Show success notification
      showNotification({
        type: 'success',
        title: 'Language Changed',
        message: `App language changed to ${newLanguage.name}`,
        duration: 3000
      });

      // Call callback
      onLanguageChange(newLanguage);

      // Close modal if in modal mode
      if (showAsModal) {
        onClose();
      }
    } catch (error) {
      console.error('Error changing language:', error);
      showNotification({
        type: 'error',
        title: 'Language Change Failed',
        message: 'Failed to change app language. Please try again.',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const languageOptions = useMemo(() => {
    return Object.values(languageService.supportedLanguages).map(lang => ({
      ...lang,
      isSelected: lang.code === currentLanguage.code,
      isRTL: lang.rtl
    }));
  }, [currentLanguage]);

  const renderLanguageItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        {
          backgroundColor: colors.card,
          borderColor: item.isSelected ? colors.primary : colors.border
        }
      ]}
      onPress={() => handleLanguageChange(item.code)}
      disabled={isLoading}
    >
      <View style={styles.languageContent}>
        <Text style={styles.flagText}>{item.flag}</Text>
        <View style={styles.languageTextContainer}>
          <Text 
            style={[
              styles.languageName,
              { color: colors.foreground }
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text 
            style={[
              styles.languageNativeName,
              { color: colors.mutedForeground }
            ]}
            numberOfLines={1}
          >
            {item.nativeName}
          </Text>
        </View>
      </View>
      
      {item.isSelected && (
        <Ionicons 
          name="checkmark-circle" 
          size={24} 
          color={colors.primary} 
        />
      )}
      
      {isLoading && item.code === currentLanguage.code && (
        <Ionicons 
          name="refresh" 
          size={20} 
          color={colors.mutedForeground} 
          style={styles.loadingIcon}
        />
      )}
    </TouchableOpacity>
  ), [currentLanguage, isLoading, colors]);

  const renderModal = () => (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Select Language
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Language List */}
        <FlatList
          data={languageOptions}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.code}
          style={styles.languageList}
          contentContainerStyle={styles.languageListContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer Info */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Language settings affect all text in the app
          </Text>
        </View>
      </View>
    </Modal>
  );

  const renderInlineSelector = () => (
    <View style={[styles.inlineContainer, { backgroundColor: colors.card }]}>
      <Text style={[styles.inlineTitle, { color: colors.foreground }]}>
        Preferred Language
      </Text>
      <FlatList
        data={languageOptions}
        renderItem={renderLanguageItem}
        keyExtractor={(item) => item.code}
        style={styles.inlineList}
        scrollEnabled={false}
      />
    </View>
  );

  const renderTrigger = () => (
    <TouchableOpacity
      style={[styles.triggerButton, { backgroundColor: colors.card }]}
      onPress={onClose} // In trigger mode, onClose should toggle visibility
    >
      <Text style={styles.flagText}>{currentLanguage.flag}</Text>
      <Text style={[styles.triggerText, { color: colors.foreground }]}>
        {currentLanguage.code.toUpperCase()}
      </Text>
      <Ionicons 
        name="chevron-down" 
        size={16} 
        color={colors.mutedForeground} 
      />
    </TouchableOpacity>
  );

  if (triggerComponent && !showAsModal) {
    return renderTrigger();
  }

  if (!showAsModal) {
    return renderInlineSelector();
  }

  return renderModal();
};

const styles = StyleSheet.create({
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  
  // Language List
  languageList: {
    flex: 1,
  },
  languageListContent: {
    padding: 16,
  },
  
  // Language Item
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagText: {
    fontSize: 24,
    marginRight: 12,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    marginBottom: 2,
  },
  languageNativeName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  
  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  
  // Inline Styles
  inlineContainer: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  inlineTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 12,
  },
  inlineList: {
    flex: 1,
  },
  
  // Trigger Styles
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: YachiColors.gray[200],
    gap: 8,
  },
  triggerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
});

// Higher Order Component for language-aware components
export const withLanguage = (WrappedComponent) => {
  return (props) => {
    const [currentLanguage, setCurrentLanguage] = React.useState(languageService.supportedLanguages.en);

    React.useEffect(() => {
      loadLanguage();
    }, []);

    const loadLanguage = async () => {
      const language = await languageService.getCurrentLanguage();
      setCurrentLanguage(language);
    };

    const handleLanguageChange = (newLanguage) => {
      setCurrentLanguage(newLanguage);
    };

    return (
      <WrappedComponent
        {...props}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />
    );
  };
};

// Hook for language functionality
export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = React.useState(languageService.supportedLanguages.en);

  React.useEffect(() => {
    loadCurrentLanguage();
  }, []);

  const loadCurrentLanguage = async () => {
    const language = await languageService.getCurrentLanguage();
    setCurrentLanguage(language);
  };

  const changeLanguage = async (languageCode) => {
    try {
      const newLanguage = await languageService.setLanguage(languageCode);
      setCurrentLanguage(newLanguage);
      return newLanguage;
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    }
  };

  const isRTL = currentLanguage.rtl;

  return {
    currentLanguage,
    changeLanguage,
    isRTL,
    supportedLanguages: languageService.supportedLanguages,
    languageService
  };
};

export default React.memo(LanguageSelector);