import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { 
  AUTH_CONFIG, 
  TOKEN_CONFIG, 
  SECURITY_LEVELS 
} from '../config/auth';
import { 
  validateEmail, 
  validatePhone, 
  validatePassword,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateOTP 
} from '../utils/security';
import { 
  formatEthiopianPhone,
  normalizeEmail 
} from '../utils/formatters';
import api from './api';
import analyticsService from './analytics-service';
import notificationService from './notification-service';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
    this.refreshTimeout = null;
    this.isRefreshing = false;
    this.pendingRequests = [];
  }

  // ==================== STORAGE MANAGEMENT ====================

  /**
   * Secure token storage with encryption
   */
  async storeAuthData(token, user, rememberMe = false) {
    try {
      const authData = {
        token,
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          verificationLevel: user.verificationLevel,
        },
        timestamp: Date.now(),
        expiresIn: rememberMe ? TOKEN_CONFIG.REMEMBER_ME_EXPIRY : TOKEN_CONFIG.STANDARD_EXPIRY,
      };

      // Store in secure storage
      await SecureStore.setItemAsync(AUTH_CONFIG.STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));
      
      // Set current instance
      this.token = token;
      this.user = user;

      // Schedule token refresh
      this.scheduleTokenRefresh(authData.expiresIn);

      console.log('Auth data stored securely');
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw new Error('AUTH_STORAGE_FAILED');
    }
  }

  /**
   * Retrieve auth data from secure storage
   */
  async getStoredAuthData() {
    try {
      const authDataString = await SecureStore.getItemAsync(AUTH_CONFIG.STORAGE_KEYS.AUTH_DATA);
      if (!authDataString) return null;

      const authData = JSON.parse(authDataString);
      
      // Check if token is expired
      if (Date.now() - authData.timestamp > authData.expiresIn) {
        await this.clearAuthData();
        return null;
      }

      this.token = authData.token;
      this.user = authData.user;

      // Schedule refresh
      const timeUntilExpiry = authData.expiresIn - (Date.now() - authData.timestamp);
      this.scheduleTokenRefresh(timeUntilExpiry);

      return authData;
    } catch (error) {
      console.error('Failed to retrieve auth data:', error);
      await this.clearAuthData();
      return null;
    }
  }

  /**
   * Clear all auth data from storage
   */
  async clearAuthData() {
    try {
      await SecureStore.deleteItemAsync(AUTH_CONFIG.STORAGE_KEYS.AUTH_DATA);
      await SecureStore.deleteItemAsync(AUTH_CONFIG.STORAGE_KEYS.BIOMETRIC_DATA);
      
      this.token = null;
      this.user = null;
      
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
      }

      console.log('Auth data cleared');
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  // ==================== AUTHENTICATION METHODS ====================

  /**
   * Email/Password registration with comprehensive validation
   */
  async registerWithEmail(userData) {
    try {
      // Validate input data
      const validation = this.validateRegistrationData(userData);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Prepare registration data
      const registrationData = {
        email: normalizeEmail(userData.email),
        passwordHash,
        phoneNumber: userData.phoneNumber ? formatEthiopianPhone(userData.phoneNumber) : null,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'client',
        acceptTerms: userData.acceptTerms,
        marketingEmails: userData.marketingEmails || false,
        locale: userData.locale || 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // API call to register
      const response = await api.post('/auth/register', registrationData);

      if (response.data.success) {
        const { user, token, requiresVerification } = response.data;

        // Store auth data if no verification required
        if (!requiresVerification) {
          await this.storeAuthData(token, user, userData.rememberMe);
        }

        // Track analytics
        await analyticsService.trackEvent('user_registered', {
          userId: user.id,
          role: user.role,
          method: 'email',
        });

        return {
          success: true,
          user,
          token: requiresVerification ? null : token,
          requiresVerification,
          verificationMethod: response.data.verificationMethod,
        };
      }

      throw new Error(response.data.message || 'Registration failed');

    } catch (error) {
      console.error('Registration error:', error);
      
      // Track failed registration
      await analyticsService.trackEvent('registration_failed', {
        error: error.message,
        email: userData.email,
      });

      throw this.handleAuthError(error);
    }
  }

  /**
   * Phone number registration (Ethiopian focus)
   */
  async registerWithPhone(phoneData) {
    try {
      // Validate Ethiopian phone number
      if (!validatePhone(phoneData.phoneNumber)) {
        throw new Error('INVALID_ETHIOPIAN_PHONE');
      }

      const formattedPhone = formatEthiopianPhone(phoneData.phoneNumber);

      // Check if phone already registered
      const checkResponse = await api.post('/auth/check-phone', { 
        phoneNumber: formattedPhone 
      });

      if (checkResponse.data.exists) {
        throw new Error('PHONE_ALREADY_REGISTERED');
      }

      // Generate and send OTP
      const otp = generateOTP();
      const otpResponse = await api.post('/auth/send-otp', {
        phoneNumber: formattedPhone,
        otp,
        purpose: 'registration',
      });

      if (otpResponse.data.success) {
        return {
          success: true,
          phoneNumber: formattedPhone,
          otpId: otpResponse.data.otpId,
          method: 'phone',
        };
      }

      throw new Error('OTP_SEND_FAILED');

    } catch (error) {
      console.error('Phone registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Complete phone registration with OTP verification
   */
  async completePhoneRegistration(registrationData) {
    try {
      // Verify OTP first
      const otpVerify = await this.verifyOTP(
        registrationData.otpId, 
        registrationData.otp, 
        'registration'
      );

      if (!otpVerify.success) {
        throw new Error('INVALID_OTP');
      }

      // Hash password
      const passwordHash = await hashPassword(registrationData.password);

      // Complete registration
      const response = await api.post('/auth/complete-phone-registration', {
        phoneNumber: registrationData.phoneNumber,
        passwordHash,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        role: registrationData.role || 'client',
        acceptTerms: registrationData.acceptTerms,
        otpId: registrationData.otpId,
      });

      if (response.data.success) {
        const { user, token } = response.data;

        await this.storeAuthData(token, user, registrationData.rememberMe);

        await analyticsService.trackEvent('user_registered', {
          userId: user.id,
          role: user.role,
          method: 'phone',
        });

        return {
          success: true,
          user,
          token,
        };
      }

      throw new Error('REGISTRATION_COMPLETION_FAILED');

    } catch (error) {
      console.error('Phone registration completion error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Email/Password login
   */
  async loginWithEmail(email, password, rememberMe = false) {
    try {
      // Validate inputs
      if (!validateEmail(email) || !validatePassword(password)) {
        throw new Error('INVALID_CREDENTIALS');
      }

      const response = await api.post('/auth/login', {
        email: normalizeEmail(email),
        password,
        deviceInfo: this.getDeviceInfo(),
      });

      if (response.data.success) {
        const { user, token, requires2FA } = response.data;

        if (requires2FA) {
          return {
            success: true,
            requires2FA: true,
            tempToken: token,
            userId: user.id,
          };
        }

        await this.storeAuthData(token, user, rememberMe);

        // Track successful login
        await analyticsService.trackEvent('user_logged_in', {
          userId: user.id,
          method: 'email',
        });

        return {
          success: true,
          user,
          token,
        };
      }

      throw new Error('LOGIN_FAILED');

    } catch (error) {
      console.error('Login error:', error);
      
      // Track failed login attempt
      await analyticsService.trackEvent('login_failed', {
        email,
        error: error.message,
      });

      throw this.handleAuthError(error);
    }
  }

  /**
   * Phone number login
   */
  async loginWithPhone(phoneNumber, password) {
    try {
      if (!validatePhone(phoneNumber)) {
        throw new Error('INVALID_ETHIOPIAN_PHONE');
      }

      const formattedPhone = formatEthiopianPhone(phoneNumber);

      const response = await api.post('/auth/login-phone', {
        phoneNumber: formattedPhone,
        password,
        deviceInfo: this.getDeviceInfo(),
      });

      if (response.data.success) {
        const { user, token } = response.data;

        await this.storeAuthData(token, user);

        await analyticsService.trackEvent('user_logged_in', {
          userId: user.id,
          method: 'phone',
        });

        return {
          success: true,
          user,
          token,
        };
      }

      throw new Error('LOGIN_FAILED');

    } catch (error) {
      console.error('Phone login error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Social media authentication
   */
  async socialLogin(provider, accessToken, userData) {
    try {
      const response = await api.post('/auth/social-login', {
        provider,
        accessToken,
        userData,
        deviceInfo: this.getDeviceInfo(),
      });

      if (response.data.success) {
        const { user, token, isNewUser } = response.data;

        await this.storeAuthData(token, user);

        await analyticsService.trackEvent('user_logged_in', {
          userId: user.id,
          method: `social_${provider}`,
          isNewUser,
        });

        return {
          success: true,
          user,
          token,
          isNewUser,
        };
      }

      throw new Error('SOCIAL_LOGIN_FAILED');

    } catch (error) {
      console.error('Social login error:', error);
      throw this.handleAuthError(error);
    }
  }

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  /**
   * Enable 2FA for user account
   */
  async enable2FA(userId, method = 'app') {
    try {
      const response = await api.post('/auth/enable-2fa', {
        userId,
        method,
        deviceInfo: this.getDeviceInfo(),
      });

      if (response.data.success) {
        return {
          success: true,
          secret: response.data.secret,
          qrCode: response.data.qrCode,
          backupCodes: response.data.backupCodes,
        };
      }

      throw new Error('2FA_ENABLE_FAILED');

    } catch (error) {
      console.error('2FA enable error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verify 2FA setup
   */
  async verify2FASetup(userId, token, method = 'app') {
    try {
      const response = await api.post('/auth/verify-2fa', {
        userId,
        token,
        method,
      });

      if (response.data.success) {
        await analyticsService.trackEvent('2fa_enabled', {
          userId,
          method,
        });

        return { success: true };
      }

      throw new Error('2FA_VERIFICATION_FAILED');

    } catch (error) {
      console.error('2FA verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Complete 2FA login
   */
  async complete2FALogin(tempToken, twoFAToken, method = 'app') {
    try {
      const response = await api.post('/auth/complete-2fa-login', {
        tempToken,
        twoFAToken,
        method,
      });

      if (response.data.success) {
        const { user, token } = response.data;

        await this.storeAuthData(token, user);

        return {
          success: true,
          user,
          token,
        };
      }

      throw new Error('2FA_LOGIN_FAILED');

    } catch (error) {
      console.error('2FA login error:', error);
      throw this.handleAuthError(error);
    }
  }

  // ==================== BIOMETRIC AUTHENTICATION ====================

  /**
   * Check biometric authentication availability
   */
  async isBiometricAvailable() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        available: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes,
      };
    } catch (error) {
      console.error('Biometric check error:', error);
      return { available: false };
    }
  }

  /**
   * Setup biometric authentication
   */
  async setupBiometricAuth(userId, password) {
    try {
      // First verify password
      const verifyResponse = await api.post('/auth/verify-password', {
        userId,
        password,
      });

      if (!verifyResponse.data.valid) {
        throw new Error('INVALID_PASSWORD');
      }

      // Store biometric data securely
      const biometricData = {
        userId,
        setupDate: Date.now(),
        deviceId: this.getDeviceId(),
      };

      await SecureStore.setItemAsync(
        AUTH_CONFIG.STORAGE_KEYS.BIOMETRIC_DATA,
        JSON.stringify(biometricData)
      );

      await analyticsService.trackEvent('biometric_setup', { userId });

      return { success: true };

    } catch (error) {
      console.error('Biometric setup error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics() {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Yachi',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (biometricAuth.success) {
        // Retrieve stored biometric data
        const biometricDataString = await SecureStore.getItemAsync(
          AUTH_CONFIG.STORAGE_KEYS.BIOMETRIC_DATA
        );

        if (!biometricDataString) {
          throw new Error('BIOMETRIC_DATA_NOT_FOUND');
        }

        const biometricData = JSON.parse(biometricDataString);

        // Get auth token using biometric data
        const response = await api.post('/auth/biometric-login', {
          userId: biometricData.userId,
          deviceId: biometricData.deviceId,
        });

        if (response.data.success) {
          const { user, token } = response.data;

          await this.storeAuthData(token, user);

          await analyticsService.trackEvent('biometric_login_success', {
            userId: user.id,
          });

          return {
            success: true,
            user,
            token,
          };
        }
      }

      throw new Error('BIOMETRIC_AUTH_FAILED');

    } catch (error) {
      console.error('Biometric auth error:', error);
      
      await analyticsService.trackEvent('biometric_login_failed', {
        error: error.message,
      });

      throw this.handleAuthError(error);
    }
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Request password reset
   */
  async requestPasswordReset(emailOrPhone) {
    try {
      let identifier = {};
      
      if (validateEmail(emailOrPhone)) {
        identifier.email = normalizeEmail(emailOrPhone);
      } else if (validatePhone(emailOrPhone)) {
        identifier.phoneNumber = formatEthiopianPhone(emailOrPhone);
      } else {
        throw new Error('INVALID_EMAIL_OR_PHONE');
      }

      const response = await api.post('/auth/request-password-reset', identifier);

      if (response.data.success) {
        await analyticsService.trackEvent('password_reset_requested', {
          identifier: Object.keys(identifier)[0],
        });

        return {
          success: true,
          method: response.data.method,
          resetToken: response.data.resetToken,
        };
      }

      throw new Error('PASSWORD_RESET_REQUEST_FAILED');

    } catch (error) {
      console.error('Password reset request error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetToken, newPassword) {
    try {
      if (!validatePassword(newPassword)) {
        throw new Error('WEAK_PASSWORD');
      }

      const passwordHash = await hashPassword(newPassword);

      const response = await api.post('/auth/reset-password', {
        resetToken,
        passwordHash,
      });

      if (response.data.success) {
        await analyticsService.trackEvent('password_reset_success', {
          userId: response.data.userId,
        });

        return { success: true };
      }

      throw new Error('PASSWORD_RESET_FAILED');

    } catch (error) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      if (!validatePassword(newPassword)) {
        throw new Error('WEAK_PASSWORD');
      }

      const response = await api.post('/auth/change-password', {
        userId,
        currentPassword,
        newPassword: await hashPassword(newPassword),
      });

      if (response.data.success) {
        await analyticsService.trackEvent('password_changed', { userId });

        // Invalidate other sessions if requested
        if (response.data.invalidateOtherSessions) {
          await this.clearAuthData();
        }

        return { success: true };
      }

      throw new Error('PASSWORD_CHANGE_FAILED');

    } catch (error) {
      console.error('Password change error:', error);
      throw this.handleAuthError(error);
    }
  }

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * Refresh access token
   */
  async refreshToken() {
    if (this.isRefreshing) {
      // Wait for ongoing refresh to complete
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
      });
    }

    try {
      this.isRefreshing = true;

      const response = await api.post('/auth/refresh-token', {
        refreshToken: this.token, // In a real app, you'd have a separate refresh token
      });

      if (response.data.success) {
        const { token, user } = response.data;

        this.token = token;
        this.user = user;

        // Update stored auth data
        await this.storeAuthData(token, user);

        // Resolve pending requests
        this.pendingRequests.forEach(({ resolve }) => resolve({ token, user }));
        this.pendingRequests = [];

        return { token, user };
      }

      throw new Error('TOKEN_REFRESH_FAILED');

    } catch (error) {
      console.error('Token refresh error:', error);
      
      // Reject pending requests
      this.pendingRequests.forEach(({ reject }) => reject(error));
      this.pendingRequests = [];

      // Clear auth data on refresh failure
      await this.clearAuthData();
      throw error;

    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(expiresIn) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Refresh 5 minutes before expiry
    const refreshTime = expiresIn - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshToken().catch(error => {
          console.error('Scheduled token refresh failed:', error);
        });
      }, refreshTime);
    }
  }

  // ==================== VERIFICATION METHODS ====================

  /**
   * Send verification code
   */
  async sendVerificationCode(userId, method) {
    try {
      const response = await api.post('/auth/send-verification', {
        userId,
        method,
      });

      if (response.data.success) {
        return {
          success: true,
          verificationId: response.data.verificationId,
          method: response.data.method,
        };
      }

      throw new Error('VERIFICATION_SEND_FAILED');

    } catch (error) {
      console.error('Verification send error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verify code (OTP, email, etc.)
   */
  async verifyCode(verificationId, code, method) {
    try {
      const response = await api.post('/auth/verify-code', {
        verificationId,
        code,
        method,
      });

      if (response.data.success) {
        // Update user verification status if needed
        if (this.user && response.data.user) {
          this.user = response.data.user;
        }

        await analyticsService.trackEvent('verification_success', {
          method,
          userId: response.data.userId,
        });

        return {
          success: true,
          user: response.data.user,
        };
      }

      throw new Error('VERIFICATION_FAILED');

    } catch (error) {
      console.error('Verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * OTP verification (for phone registration/login)
   */
  async verifyOTP(otpId, otp, purpose) {
    try {
      const response = await api.post('/auth/verify-otp', {
        otpId,
        otp,
        purpose,
      });

      if (response.data.success) {
        return { success: true };
      }

      throw new Error('INVALID_OTP');

    } catch (error) {
      console.error('OTP verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Logout user from all devices
   */
  async logout(allDevices = false) {
    try {
      if (this.token) {
        await api.post('/auth/logout', {
          allDevices,
          deviceInfo: this.getDeviceInfo(),
        });
      }

      // Track logout
      await analyticsService.trackEvent('user_logged_out', {
        userId: this.user?.id,
        allDevices,
      });

      // Send notification
      await notificationService.sendLogoutNotification(this.user?.id);

      // Clear local data
      await this.clearAuthData();

      return { success: true };

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API call fails
      await this.clearAuthData();
      return { success: true };
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession() {
    return {
      isAuthenticated: !!this.token && !!this.user,
      user: this.user,
      token: this.token,
    };
  }

  /**
   * Validate current session
   */
  async validateSession() {
    try {
      if (!this.token || !this.user) {
        return { valid: false };
      }

      const response = await api.get('/auth/validate-session');

      return {
        valid: response.data.valid,
        user: response.data.user || this.user,
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate registration data
   */
  validateRegistrationData(userData) {
    const errors = [];

    if (!validateEmail(userData.email)) {
      errors.push('INVALID_EMAIL');
    }

    if (!validatePassword(userData.password)) {
      errors.push('WEAK_PASSWORD');
    }

    if (userData.phoneNumber && !validatePhone(userData.phoneNumber)) {
      errors.push('INVALID_PHONE');
    }

    if (!userData.firstName || userData.firstName.trim().length < 2) {
      errors.push('INVALID_FIRST_NAME');
    }

    if (!userData.lastName || userData.lastName.trim().length < 2) {
      errors.push('INVALID_LAST_NAME');
    }

    if (!userData.acceptTerms) {
      errors.push('TERMS_NOT_ACCEPTED');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get device information for security
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model || 'unknown',
      brand: Platform.constants?.Brand || 'unknown',
      userAgent: navigator?.userAgent || 'unknown',
      timestamp: Date.now(),
    };
  }

  /**
   * Generate unique device ID
   */
  getDeviceId() {
    // This would be a more sophisticated device fingerprinting in production
    return `${Platform.OS}-${Platform.Version}-${Date.now()}`;
  }

  /**
   * Handle authentication errors consistently
   */
  handleAuthError(error) {
    // Map server errors to client-friendly messages
    const errorMap = {
      'INVALID_CREDENTIALS': 'Invalid email or password',
      'USER_NOT_FOUND': 'Account not found',
      'ACCOUNT_SUSPENDED': 'Account suspended. Please contact support.',
      'EMAIL_ALREADY_EXISTS': 'Email already registered',
      'PHONE_ALREADY_REGISTERED': 'Phone number already registered',
      'INVALID_OTP': 'Invalid verification code',
      'OTP_EXPIRED': 'Verification code expired',
      'WEAK_PASSWORD': 'Password must be at least 8 characters with letters and numbers',
      'INVALID_ETHIOPIAN_PHONE': 'Please enter a valid Ethiopian phone number',
      'NETWORK_ERROR': 'Network error. Please check your connection.',
    };

    const message = errorMap[error.message] || 
                   error.response?.data?.message || 
                   'Authentication failed. Please try again.';

    return new Error(message);
  }

  // ==================== SECURITY METHODS ====================

  /**
   * Check if user needs to re-authenticate for sensitive operations
   */
  async requiresReauthentication(securityLevel = SECURITY_LEVELS.MEDIUM) {
    const sessionAge = Date.now() - (await this.getStoredAuthData())?.timestamp;
    
    switch (securityLevel) {
      case SECURITY_LEVELS.HIGH:
        return sessionAge > AUTH_CONFIG.REAUTHENTICATION_TIMEOUT.HIGH;
      case SECURITY_LEVELS.MEDIUM:
        return sessionAge > AUTH_CONFIG.REAUTHENTICATION_TIMEOUT.MEDIUM;
      default:
        return false;
    }
  }

  /**
   * Get security level for operation
   */
  getSecurityLevel(operation) {
    const securityMap = {
      'change_password': SECURITY_LEVELS.HIGH,
      'update_payment_method': SECURITY_LEVELS.HIGH,
      'delete_account': SECURITY_LEVELS.HIGH,
      'update_profile': SECURITY_LEVELS.MEDIUM,
      'view_sensitive_data': SECURITY_LEVELS.MEDIUM,
      'basic_operation': SECURITY_LEVELS.LOW,
    };

    return securityMap[operation] || SECURITY_LEVELS.LOW;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;