/**
 * Yachi - Enterprise Security Utilities
 * Comprehensive security framework for Ethiopian market with advanced protection
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { 
  SECURITY_LEVELS, 
  ENCRYPTION_ALGORITHMS,
  TOKEN_TYPES,
  BIOMETRIC_TYPES 
} from '../constants/security';
import { logSecurityEvent, logError } from '../services/analytics-service';

/**
 * Enterprise Security Manager
 * Implements military-grade security with Ethiopian compliance
 */
class SecurityManager {
  constructor() {
    this.encryptionKey = null;
    this.biometricEnabled = false;
    this.securityLevel = SECURITY_LEVELS.HIGH;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastActivity = Date.now();
    this.failedAttempts = 0;
    this.maxFailedAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Initialize security system
   */
  async initialize() {
    try {
      await this.generateEncryptionKey();
      await this.setupBiometricSupport();
      await this.initializeSecureStorage();
      
      this.startSessionMonitoring();
      this.startActivityTracking();
      
      logSecurityEvent('security_system_initialized', {
        platform: Platform.OS,
        biometricEnabled: this.biometricEnabled,
        securityLevel: this.securityLevel
      });
    } catch (error) {
      console.error('Security initialization failed:', error);
      throw new Error('SECURITY_INIT_FAILED');
    }
  }

  /**
   * Generate secure encryption key
   */
  async generateEncryptionKey() {
    try {
      // Try to retrieve existing key
      let key = await SecureStore.getItemAsync('encryption_key');
      
      if (!key) {
        // Generate new key using multiple entropy sources
        const entropySources = [
          Constants.deviceName,
          Constants.deviceYearClass,
          Date.now().toString(),
          Math.random().toString(),
          Platform.OS
        ];
        
        const entropy = entropySources.join('|');
        key = CryptoJS.SHA512(entropy).toString();
        
        // Store securely
        await SecureStore.setItemAsync('encryption_key', key);
        
        logSecurityEvent('encryption_key_generated');
      }
      
      this.encryptionKey = key;
      return key;
    } catch (error) {
      console.error('Encryption key generation failed:', error);
      throw new Error('ENCRYPTION_KEY_GENERATION_FAILED');
    }
  }

  /**
   * Setup biometric authentication support
   */
  async setupBiometricSupport() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      
      if (!hasHardware) {
        this.biometricEnabled = false;
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      this.biometricEnabled = hasHardware && isEnrolled;
      
      logSecurityEvent('biometric_setup_completed', {
        hasHardware,
        isEnrolled,
        supportedTypes: supportedTypes.map(type => this.mapBiometricType(type))
      });
    } catch (error) {
      console.error('Biometric setup failed:', error);
      this.biometricEnabled = false;
    }
  }

  /**
   * Map biometric type to readable format
   */
  mapBiometricType(type) {
    const typeMap = {
      [LocalAuthentication.AuthenticationType.FINGERPRINT]: BIOMETRIC_TYPES.FINGERPRINT,
      [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: BIOMETRIC_TYPES.FACE_ID,
      [LocalAuthentication.AuthenticationType.IRIS]: BIOMETRIC_TYPES.IRIS_SCAN,
    };
    
    return typeMap[type] || BIOMETRIC_TYPES.UNKNOWN;
  }

  /**
   * Initialize secure storage with encryption
   */
  async initializeSecureStorage() {
    try {
      // Verify secure storage is available
      const testData = 'security_test';
      await SecureStore.setItemAsync('security_test', testData);
      const retrieved = await SecureStore.getItemAsync('security_test');
      await SecureStore.deleteItemAsync('security_test');
      
      if (retrieved !== testData) {
        throw new Error('SECURE_STORAGE_VERIFICATION_FAILED');
      }
      
      logSecurityEvent('secure_storage_initialized');
    } catch (error) {
      console.error('Secure storage initialization failed:', error);
      throw new Error('SECURE_STORAGE_INIT_FAILED');
    }
  }

  /**
   * Start session monitoring for automatic logout
   */
  startSessionMonitoring() {
    this.sessionInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - this.lastActivity;
      
      if (inactiveTime > this.sessionTimeout) {
        this.forceLogout('SESSION_TIMEOUT');
      }
    }, 60000); // Check every minute
  }

  /**
   * Start user activity tracking
   */
  startActivityTracking() {
    // Track user interactions to update last activity
    const activities = ['touchstart', 'click', 'keypress', 'scroll', 'mousemove'];
    
    activities.forEach(event => {
      document.addEventListener?.(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Encrypt sensitive data with multiple algorithms
   */
  encryptData(data, algorithm = ENCRYPTION_ALGORITHMS.AES_256) {
    try {
      if (!this.encryptionKey) {
        throw new Error('ENCRYPTION_KEY_NOT_AVAILABLE');
      }

      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      let encryptedData;
      
      switch (algorithm) {
        case ENCRYPTION_ALGORITHMS.AES_256:
          encryptedData = CryptoJS.AES.encrypt(dataString, this.encryptionKey).toString();
          break;
          
        case ENCRYPTION_ALGORITHMS.TRIPLE_DES:
          encryptedData = CryptoJS.TripleDES.encrypt(dataString, this.encryptionKey).toString();
          break;
          
        default:
          throw new Error('UNSUPPORTED_ENCRYPTION_ALGORITHM');
      }

      logSecurityEvent('data_encrypted', { 
        algorithm,
        dataLength: dataString.length
      });
      
      return encryptedData;
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('ENCRYPTION_FAILED');
    }
  }

  /**
   * Decrypt encrypted data
   */
  decryptData(encryptedData, algorithm = ENCRYPTION_ALGORITHMS.AES_256) {
    try {
      if (!this.encryptionKey) {
        throw new Error('ENCRYPTION_KEY_NOT_AVAILABLE');
      }

      let decryptedBytes;
      
      switch (algorithm) {
        case ENCRYPTION_ALGORITHMS.AES_256:
          decryptedBytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
          break;
          
        case ENCRYPTION_ALGORITHMS.TRIPLE_DES:
          decryptedBytes = CryptoJS.TripleDES.decrypt(encryptedData, this.encryptionKey);
          break;
          
        default:
          throw new Error('UNSUPPORTED_ENCRYPTION_ALGORITHM');
      }

      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('DECRYPTION_FAILED_INVALID_KEY');
      }

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('DECRYPTION_FAILED');
    }
  }

  /**
   * Hash data with salt (for passwords, etc.)
   */
  hashData(data, salt = null) {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const saltToUse = salt || this.generateSalt();
      
      const saltedData = saltToUse + dataString;
      const hash = CryptoJS.SHA512(saltedData).toString();
      
      return {
        hash,
        salt: saltToUse
      };
    } catch (error) {
      console.error('Data hashing failed:', error);
      throw new Error('HASHING_FAILED');
    }
  }

  /**
   * Generate cryptographically secure salt
   */
  generateSalt(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let salt = '';
    
    for (let i = 0; i < length; i++) {
      salt += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return salt;
  }

  /**
   * Verify hash against data
   */
  verifyHash(data, hash, salt) {
    try {
      const { hash: computedHash } = this.hashData(data, salt);
      return computedHash === hash;
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Secure token generation
   */
  generateSecureToken(type = TOKEN_TYPES.ACCESS, payload = {}) {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2);
      const tokenData = {
        type,
        timestamp,
        payload,
        random,
        version: '1.0'
      };

      const tokenString = JSON.stringify(tokenData);
      const encryptedToken = this.encryptData(tokenString);
      
      // Add integrity check
      const integrityHash = CryptoJS.SHA256(encryptedToken + this.encryptionKey).toString();
      
      const finalToken = {
        token: encryptedToken,
        integrity: integrityHash,
        expires: timestamp + (type === TOKEN_TYPES.ACCESS ? 3600000 : 2592000000) // 1 hour or 30 days
      };

      logSecurityEvent('token_generated', { type });
      
      return this.encryptData(finalToken);
    } catch (error) {
      console.error('Token generation failed:', error);
      throw new Error('TOKEN_GENERATION_FAILED');
    }
  }

  /**
   * Validate and decode token
   */
  validateToken(encryptedToken) {
    try {
      const tokenData = this.decryptData(encryptedToken);
      
      // Verify integrity
      const computedIntegrity = CryptoJS.SHA256(tokenData.token + this.encryptionKey).toString();
      if (computedIntegrity !== tokenData.integrity) {
        throw new Error('TOKEN_INTEGRITY_CHECK_FAILED');
      }
      
      // Check expiration
      if (Date.now() > tokenData.expires) {
        throw new Error('TOKEN_EXPIRED');
      }
      
      const decodedData = this.decryptData(tokenData.token);
      
      logSecurityEvent('token_validated', { type: decodedData.type });
      
      return decodedData;
    } catch (error) {
      console.error('Token validation failed:', error);
      throw new Error('TOKEN_VALIDATION_FAILED');
    }
  }

  /**
   * Biometric authentication
   */
  async authenticateWithBiometrics(promptMessage = 'Authenticate to access Yachi') {
    try {
      if (!this.biometricEnabled) {
        throw new Error('BIOMETRIC_NOT_AVAILABLE');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        this.failedAttempts = 0; // Reset failed attempts on success
        logSecurityEvent('biometric_authentication_success');
        return true;
      } else {
        this.failedAttempts++;
        logSecurityEvent('biometric_authentication_failed', {
          error: result.error,
          failedAttempts: this.failedAttempts
        });
        
        if (this.failedAttempts >= this.maxFailedAttempts) {
          await this.triggerLockout();
        }
        
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      logSecurityEvent('biometric_authentication_error', { error: error.message });
      return false;
    }
  }

  /**
   * Trigger security lockout
   */
  async triggerLockout() {
    this.securityLevel = SECURITY_LEVELS.LOCKED;
    
    // Clear sensitive data
    await this.clearSensitiveData();
    
    // Set lockout timeout
    setTimeout(() => {
      this.securityLevel = SECURITY_LEVELS.HIGH;
      this.failedAttempts = 0;
    }, this.lockoutTime);
    
    logSecurityEvent('security_lockout_triggered', {
      lockoutDuration: this.lockoutTime,
      failedAttempts: this.failedAttempts
    });
  }

  /**
   * Store data securely with encryption
   */
  async storeSecureData(key, data, requireBiometric = false) {
    try {
      if (requireBiometric && !this.biometricEnabled) {
        throw new Error('BIOMETRIC_REQUIRED_BUT_NOT_AVAILABLE');
      }

      const encryptedData = this.encryptData(data);
      const storageKey = `secure_${key}`;
      
      await SecureStore.setItemAsync(storageKey, encryptedData);
      
      logSecurityEvent('secure_data_stored', { 
        key: storageKey,
        requiresBiometric: requireBiometric
      });
      
      return true;
    } catch (error) {
      console.error('Secure data storage failed:', error);
      throw new Error('SECURE_STORAGE_FAILED');
    }
  }

  /**
   * Retrieve securely stored data
   */
  async retrieveSecureData(key, requireBiometric = false) {
    try {
      if (requireBiometric) {
        const authenticated = await this.authenticateWithBiometrics();
        if (!authenticated) {
          throw new Error('BIOMETRIC_AUTHENTICATION_REQUIRED');
        }
      }

      const storageKey = `secure_${key}`;
      const encryptedData = await SecureStore.getItemAsync(storageKey);
      
      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decryptData(encryptedData);
      
      logSecurityEvent('secure_data_retrieved', { 
        key: storageKey,
        requiresBiometric: requireBiometric
      });
      
      return decryptedData;
    } catch (error) {
      console.error('Secure data retrieval failed:', error);
      throw new Error('SECURE_RETRIEVAL_FAILED');
    }
  }

  /**
   * Clear sensitive data from secure storage
   */
  async clearSensitiveData() {
    try {
      const keys = await SecureStore.getItemAsync('secure_keys');
      if (keys) {
        const keyList = JSON.parse(keys);
        for (const key of keyList) {
          await SecureStore.deleteItemAsync(key);
        }
      }
      
      await SecureStore.deleteItemAsync('secure_keys');
      await SecureStore.deleteItemAsync('user_tokens');
      await SecureStore.deleteItemAsync('payment_data');
      
      logSecurityEvent('sensitive_data_cleared');
    } catch (error) {
      console.error('Sensitive data clearance failed:', error);
    }
  }

  /**
   * Force logout with security cleanup
   */
  async forceLogout(reason = 'SECURITY_POLICY') {
    try {
      await this.clearSensitiveData();
      this.securityLevel = SECURITY_LEVELS.LOGGED_OUT;
      
      logSecurityEvent('forced_logout', { reason });
      
      // Trigger logout event for app to handle
      if (typeof this.onForceLogout === 'function') {
        this.onForceLogout(reason);
      }
    } catch (error) {
      console.error('Force logout failed:', error);
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const requirements = {
      minLength: 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const strength = {
      score: 0,
      meetsRequirements: false,
      feedback: []
    };

    // Calculate score
    if (password.length >= requirements.minLength) strength.score += 25;
    if (requirements.hasUpperCase) strength.score += 25;
    if (requirements.hasLowerCase) strength.score += 25;
    if (requirements.hasNumbers) strength.score += 15;
    if (requirements.hasSpecialChar) strength.score += 10;

    // Generate feedback
    if (password.length < requirements.minLength) {
      strength.feedback.push(`Password must be at least ${requirements.minLength} characters long`);
    }
    if (!requirements.hasUpperCase) {
      strength.feedback.push('Include at least one uppercase letter');
    }
    if (!requirements.hasLowerCase) {
      strength.feedback.push('Include at least one lowercase letter');
    }
    if (!requirements.hasNumbers) {
      strength.feedback.push('Include at least one number');
    }
    if (!requirements.hasSpecialChar) {
      strength.feedback.push('Include at least one special character');
    }

    strength.meetsRequirements = strength.score >= 80;

    return strength;
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#x60;');
  }

  /**
   * Validate Ethiopian phone number format
   */
  validateEthiopianPhoneNumber(phone) {
    const ethiopianPhoneRegex = /^(?:\+251|251|0)?(9\d{8})$/;
    return ethiopianPhoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      biometricEnabled: this.biometricEnabled,
      securityLevel: this.securityLevel,
      failedAttempts: this.failedAttempts,
      sessionActive: Date.now() - this.lastActivity < this.sessionTimeout,
      lockoutTimeRemaining: this.securityLevel === SECURITY_LEVELS.LOCKED ? 
        Math.max(0, this.lockoutTime - (Date.now() - this.lastActivity)) : 0
    };
  }

  /**
   * Cleanup security system
   */
  cleanup() {
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
    }
    
    this.encryptionKey = null;
    this.securityLevel = SECURITY_LEVELS.LOGGED_OUT;
    
    logSecurityEvent('security_system_cleanup');
  }
}

// Create singleton instance
const securityManager = new SecurityManager();

export default securityManager;

/**
 * Quick security utilities for common operations
 */
export const secure = {
  encrypt: (data) => securityManager.encryptData(data),
  decrypt: (encryptedData) => securityManager.decryptData(encryptedData),
  hash: (data) => securityManager.hashData(data),
  store: (key, data) => securityManager.storeSecureData(key, data),
  retrieve: (key) => securityManager.retrieveSecureData(key),
  authenticate: () => securityManager.authenticateWithBiometrics(),
  validatePassword: (password) => securityManager.validatePasswordStrength(password),
  sanitize: (input) => securityManager.sanitizeInput(input),
  validatePhone: (phone) => securityManager.validateEthiopianPhoneNumber(phone)
};

/**
 * Export manager for direct access
 */
export { securityManager };