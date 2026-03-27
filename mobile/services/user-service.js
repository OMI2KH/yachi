/**
 * Yachi User Service
 * Enterprise-level user management with multi-role support, profiles, and comprehensive analytics
 * Advanced user management for clients, service providers, government, and admin roles
 */

import { Platform } from 'react-native';
import { compare, hash } from 'bcryptjs';
import { addYears, isBefore, parseISO } from 'date-fns';

// Internal services
import { authService } from './auth-service';
import { analyticsService } from './analytics-service';
import { storageService } from './storage-service';
import { errorService } from './error-service';
import { notificationService } from './notification-service';

// Constants
import {
  USER_ROLES,
  USER_STATUS,
  VERIFICATION_LEVELS,
  SUBSCRIPTION_TIERS,
  SECURITY_SETTINGS
} from '../constants/user';
import { ETHIOPIAN_CITIES } from '../constants/location';

/**
 * Enterprise User Service Class
 */
class UserService {
  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL;
    this.timeout = 30000;
    this.retryAttempts = 3;
    
    // Caching
    this.userCache = new Map();
    this.profileCache = new Map();
    this.verificationCache = new Map();
    
    // Session management
    this.activeSessions = new Map();
    this.failedLoginAttempts = new Map();
    
    // Analytics
    this.userAnalytics = new Map();
    
    this.initialize();
  }

  /**
   * Initialize user service
   */
  async initialize() {
    try {
      // Load current user if authenticated
      await this.loadCurrentUser();
      
      // Set up session cleanup
      this.startSessionCleanup();
      
      // Set up analytics flushing
      this.startAnalyticsFlush();
      
      console.log('👤 User Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize user service:', error);
    }
  }

  /**
   * Create a new user with comprehensive validation
   */
  async createUser(userData, options = {}) {
    try {
      // Validate user data
      const validation = await this.validateUserData(userData);
      if (!validation.isValid) {
        throw new Error(`User validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for existing user
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check phone number uniqueness
      if (userData.phone) {
        const existingPhoneUser = await this.findUserByPhone(userData.phone);
        if (existingPhoneUser) {
          throw new Error('User with this phone number already exists');
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Generate user ID
      const userId = this.generateUserId();
      
      // Create user object
      const user = {
        id: userId,
        ...userData,
        password: hashedPassword,
        status: USER_STATUS.PENDING_VERIFICATION,
        role: userData.role || USER_ROLES.CLIENT,
        verification: {
          level: VERIFICATION_LEVELS.BASIC,
          status: 'pending',
          documents: [],
          verifiedAt: null
        },
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: null,
          bio: '',
          skills: [],
          languages: ['am', 'en'], // Amharic and English by default
          preferences: this.getDefaultPreferences(userData.role),
          metadata: {
            completedOnboarding: false,
            tourCompleted: false,
            notificationSettings: this.getDefaultNotificationSettings()
          }
        },
        subscription: {
          tier: SUBSCRIPTION_TIERS.FREE,
          expiresAt: null,
          features: this.getSubscriptionFeatures(SUBSCRIPTION_TIERS.FREE),
          paymentMethod: null
        },
        security: {
          twoFactorEnabled: false,
          lastPasswordChange: new Date().toISOString(),
          loginAttempts: 0,
          accountLockedUntil: null,
          trustedDevices: []
        },
        analytics: {
          loginCount: 0,
          lastLogin: null,
          sessionDuration: 0,
          actions: [],
          devices: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          createdBy: 'self',
          creationPlatform: Platform.OS,
          appVersion: this.getAppVersion(),
          ipAddress: await this.getClientIP(),
          userAgent: this.getUserAgent()
        }
      };

      // Save user to database
      const savedUser = await this.saveUser(user);

      // Initialize user workflow
      await this.initializeUserWorkflow(savedUser);

      // Track analytics
      await analyticsService.track('user_created', {
        userId: savedUser.id,
        role: savedUser.role,
        signupMethod: options.signupMethod || 'email'
      });

      return this.sanitizeUser(savedUser);

    } catch (error) {
      console.error('User creation failed:', error);
      
      await errorService.captureError(error, {
        context: 'user_creation',
        userData: this.sanitizeUserData(userData)
      });

      throw error;
    }
  }

  /**
   * Validate user data comprehensively
   */
  async validateUserData(userData) {
    const errors = [];

    // Required fields validation
    const requiredFields = ['email', 'password', 'firstName', 'lastName'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        errors.push(`${field} is required`);
      }
    }

    // Email validation
    if (userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Invalid email format');
      }
    }

    // Password validation
    if (userData.password) {
      const passwordErrors = this.validatePassword(userData.password);
      errors.push(...passwordErrors);
    }

    // Phone validation (Ethiopian format)
    if (userData.phone) {
      const phoneErrors = this.validateEthiopianPhone(userData.phone);
      errors.push(...phoneErrors);
    }

    // Role validation
    if (userData.role && !Object.values(USER_ROLES).includes(userData.role)) {
      errors.push('Invalid user role');
    }

    // Location validation
    if (userData.location) {
      const locationErrors = await this.validateLocation(userData.location);
      errors.push(...locationErrors);
    }

    // Age validation (must be at least 18)
    if (userData.dateOfBirth) {
      const age = this.calculateAge(userData.dateOfBirth);
      if (age < 18) {
        errors.push('User must be at least 18 years old');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '12345678', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return errors;
  }

  /**
   * Validate Ethiopian phone number
   */
  validateEthiopianPhone(phone) {
    const errors = [];

    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Ethiopian phone numbers start with +251 or 09
    if (!cleanPhone.startsWith('251') && !cleanPhone.startsWith('9')) {
      errors.push('Invalid Ethiopian phone number format');
    }

    // Check length
    if (cleanPhone.length !== 9 && cleanPhone.length !== 12) {
      errors.push('Phone number must be 9 or 12 digits');
    }

    return errors;
  }

  /**
   * Validate location data
   */
  async validateLocation(location) {
    const errors = [];

    if (!location.city) {
      errors.push('City is required');
    }

    if (!ETHIOPIAN_CITIES.includes(location.city)) {
      errors.push('City must be a valid Ethiopian city');
    }

    if (location.coordinates) {
      const [latitude, longitude] = location.coordinates;
      if (latitude < 3.4 || latitude > 14.9 || longitude < 33.0 || longitude > 48.0) {
        errors.push('Location must be within Ethiopia');
      }
    }

    return errors;
  }

  /**
   * Get user by ID with comprehensive data
   */
  async getUserById(userId, options = {}) {
    try {
      const {
        includeSensitive = false,
        includeAnalytics = false,
        forceRefresh = false
      } = options;

      // Check cache first
      if (!forceRefresh) {
        const cachedUser = this.userCache.get(`user_${userId}`);
        if (cachedUser && !this.isCacheExpired(cachedUser.timestamp)) {
          return this.sanitizeUser(cachedUser.data, { includeSensitive });
        }
      }

      // Fetch user from database
      const user = await this.fetchUserById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Enrich user data
      const enrichedUser = await this.enrichUser(user, {
        includeAnalytics
      });

      // Cache user
      this.userCache.set(`user_${userId}`, {
        data: enrichedUser,
        timestamp: Date.now()
      });

      return this.sanitizeUser(enrichedUser, { includeSensitive });

    } catch (error) {
      console.error('Failed to fetch user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user profile with validation
   */
  async updateUserProfile(userId, updates, options = {}) {
    try {
      const {
        currentUserId,
        userRole
      } = options;

      // Verify permissions
      const canUpdate = await this.canUpdateProfile(userId, currentUserId, userRole);
      if (!canUpdate.allowed) {
        throw new Error(canUpdate.reason);
      }

      // Get current user
      const currentUser = await this.getUserById(userId, { includeSensitive: true });

      // Validate updates
      const validation = await this.validateProfileUpdates(currentUser, updates);
      if (!validation.isValid) {
        throw new Error(`Profile update validation failed: ${validation.errors.join(', ')}`);
      }

      // Apply updates
      const updatedUser = {
        ...currentUser,
        ...updates,
        profile: {
          ...currentUser.profile,
          ...updates.profile
        },
        updatedAt: new Date().toISOString(),
        metadata: {
          ...currentUser.metadata,
          updatedBy: currentUserId,
          updatePlatform: Platform.OS,
          updateTimestamp: new Date().toISOString()
        }
      };

      // Save updated user
      const savedUser = await this.saveUser(updatedUser);

      // Invalidate cache
      this.invalidateUserCache(userId);

      // Track update analytics
      await analyticsService.track('profile_updated', {
        userId,
        updatedFields: Object.keys(updates),
        updatedBy: currentUserId
      });

      return this.sanitizeUser(savedUser);

    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Update user password with security checks
   */
  async updatePassword(userId, passwordData, options = {}) {
    try {
      const {
        currentUserId,
        requireCurrentPassword = true
      } = options;

      // Verify permissions
      if (userId !== currentUserId) {
        throw new Error('Cannot update another user\'s password');
      }

      // Get current user
      const user = await this.getUserById(userId, { includeSensitive: true });

      // Verify current password if required
      if (requireCurrentPassword) {
        const isCurrentPasswordValid = await this.verifyPassword(
          passwordData.currentPassword,
          user.password
        );

        if (!isCurrentPasswordValid) {
          throw new Error('Current password is incorrect');
        }
      }

      // Validate new password
      const passwordErrors = this.validatePassword(passwordData.newPassword);
      if (passwordErrors.length > 0) {
        throw new Error(`New password validation failed: ${passwordErrors.join(', ')}`);
      }

      // Check if new password is different from current
      const isSamePassword = await this.verifyPassword(
        passwordData.newPassword,
        user.password
      );

      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(passwordData.newPassword);

      // Update user
      const updatedUser = await this.updateUser(userId, {
        password: hashedPassword,
        security: {
          ...user.security,
          lastPasswordChange: new Date().toISOString(),
          loginAttempts: 0, // Reset login attempts
          accountLockedUntil: null // Unlock account if locked
        }
      });

      // Track password change
      await analyticsService.track('password_changed', {
        userId,
        changedBy: currentUserId,
        changeMethod: requireCurrentPassword ? 'user_initiated' : 'admin_reset'
      });

      // Send notification
      await notificationService.sendNotification(userId, {
        type: 'security',
        title: 'Password Updated',
        message: 'Your password has been successfully updated',
        data: {
          changeType: 'password_update',
          timestamp: new Date().toISOString()
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to update password:', error);
      throw error;
    }
  }

  /**
   * Verify user account
   */
  async verifyUser(userId, verificationData, options = {}) {
    try {
      const {
        verifiedBy,
        userRole
      } = options;

      // Check permissions
      if (![USER_ROLES.ADMIN, USER_ROLES.GOVERNMENT].includes(userRole)) {
        throw new Error('Insufficient permissions to verify users');
      }

      const user = await this.getUserById(userId, { includeSensitive: true });

      // Update verification status
      const updatedUser = await this.updateUser(userId, {
        verification: {
          ...user.verification,
          level: verificationData.level || VERIFICATION_LEVELS.VERIFIED,
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          verifiedBy: verifiedBy,
          notes: verificationData.notes,
          documents: [
            ...user.verification.documents,
            ...(verificationData.documents || [])
          ]
        },
        status: USER_STATUS.ACTIVE
      });

      // Invalidate cache
      this.invalidateUserCache(userId);

      // Track verification
      await analyticsService.track('user_verified', {
        userId,
        verifiedBy,
        verificationLevel: verificationData.level,
        userRole: user.role
      });

      // Send notification to user
      await notificationService.sendNotification(userId, {
        type: 'verification',
        title: 'Account Verified',
        message: 'Your account has been successfully verified',
        data: {
          verificationLevel: verificationData.level,
          verifiedBy: verifiedBy
        }
      });

      return this.sanitizeUser(updatedUser);

    } catch (error) {
      console.error('Failed to verify user:', error);
      throw error;
    }
  }

  /**
   * Update user role with permission checks
   */
  async updateUserRole(userId, newRole, options = {}) {
    try {
      const {
        updatedBy,
        userRole: updaterRole,
        reason = ''
      } = options;

      // Check permissions
      if (updaterRole !== USER_ROLES.ADMIN) {
        throw new Error('Only administrators can update user roles');
      }

      // Validate new role
      if (!Object.values(USER_ROLES).includes(newRole)) {
        throw new Error('Invalid user role');
      }

      const user = await this.getUserById(userId);

      // Check if role is changing
      if (user.role === newRole) {
        throw new Error('User already has this role');
      }

      // Update user role
      const updatedUser = await this.updateUser(userId, {
        role: newRole,
        roleHistory: [
          ...(user.roleHistory || []),
          {
            from: user.role,
            to: newRole,
            updatedBy: updatedBy,
            timestamp: new Date().toISOString(),
            reason: reason
          }
        ]
      });

      // Invalidate cache
      this.invalidateUserCache(userId);

      // Track role change
      await analyticsService.track('role_updated', {
        userId,
        fromRole: user.role,
        toRole: newRole,
        updatedBy,
        reason
      });

      // Send notification
      await notificationService.sendNotification(userId, {
        type: 'role_change',
        title: 'Role Updated',
        message: `Your account role has been updated to ${newRole}`,
        data: {
          previousRole: user.role,
          newRole: newRole,
          updatedBy: updatedBy
        }
      });

      return this.sanitizeUser(updatedUser);

    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  }

  /**
   * Search users with advanced filtering
   */
  async searchUsers(searchParams, options = {}) {
    try {
      const {
        query = '',
        role = null,
        status = null,
        location = null,
        verificationLevel = null,
        sortBy = 'name',
        sortOrder = 'asc',
        limit = 20,
        offset = 0
      } = searchParams;

      const {
        includeSensitive = false,
        userRole: searcherRole
      } = options;

      // Check permissions for sensitive searches
      if (includeSensitive && searcherRole !== USER_ROLES.ADMIN) {
        throw new Error('Insufficient permissions for sensitive user search');
      }

      // Build search query
      const searchQuery = {
        query: query.trim(),
        filters: {
          ...(role && { role }),
          ...(status && { status }),
          ...(location && { location }),
          ...(verificationLevel && { verificationLevel })
        },
        sort: { [sortBy]: sortOrder },
        limit,
        offset
      };

      // Execute search
      const searchResults = await this.executeUserSearch(searchQuery);

      // Sanitize results based on permissions
      const sanitizedResults = searchResults.users.map(user => 
        this.sanitizeUser(user, { includeSensitive })
      );

      return {
        users: sanitizedResults,
        totalCount: searchResults.totalCount,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < searchResults.totalCount
        }
      };

    } catch (error) {
      console.error('User search failed:', error);
      throw error;
    }
  }

  /**
   * Get user analytics and statistics
   */
  async getUserAnalytics(userId, timeRange = '30d') {
    try {
      const analytics = await this.fetchUserAnalytics(userId, timeRange);

      // Calculate key metrics
      const metrics = this.calculateUserMetrics(analytics);

      // Generate insights
      const insights = this.generateUserInsights(metrics);

      return {
        metrics,
        insights,
        rawData: analytics,
        timeRange
      };

    } catch (error) {
      console.error('Failed to fetch user analytics:', error);
      throw error;
    }
  }

  /**
   * Handle user login with security features
   */
  async handleUserLogin(userId, loginData, options = {}) {
    try {
      const {
        deviceInfo,
        ipAddress
      } = options;

      // Check if account is locked
      const isLocked = await this.isAccountLocked(userId);
      if (isLocked) {
        throw new Error('Account is temporarily locked due to too many failed login attempts');
      }

      // Update login analytics
      await this.updateLoginAnalytics(userId, {
        deviceInfo,
        ipAddress,
        timestamp: new Date().toISOString()
      });

      // Reset failed login attempts
      this.failedLoginAttempts.delete(userId);

      // Track successful login
      await analyticsService.track('user_login', {
        userId,
        loginMethod: loginData.method || 'email',
        deviceType: deviceInfo?.type,
        timestamp: new Date().toISOString()
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to handle user login:', error);
      throw error;
    }
  }

  /**
   * Handle failed login attempt
   */
  async handleFailedLogin(userId, loginData, options = {}) {
    try {
      const currentAttempts = this.failedLoginAttempts.get(userId) || 0;
      const newAttempts = currentAttempts + 1;

      this.failedLoginAttempts.set(userId, newAttempts);

      // Check if account should be locked
      if (newAttempts >= SECURITY_SETTINGS.MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + SECURITY_SETTINGS.LOCKOUT_DURATION);
        await this.lockUserAccount(userId, lockUntil);

        // Send security notification
        await notificationService.sendNotification(userId, {
          type: 'security',
          title: 'Account Locked',
          message: 'Your account has been locked due to too many failed login attempts',
          data: {
            lockUntil: lockUntil.toISOString(),
            failedAttempts: newAttempts
          }
        });
      }

      // Track failed login
      await analyticsService.track('login_failed', {
        userId,
        loginMethod: loginData.method || 'email',
        failedAttempts: newAttempts,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to handle failed login:', error);
    }
  }

  /**
   * Utility Methods
   */

  generateUserId() {
    return `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return await hash(password, saltRounds);
  }

  async verifyPassword(password, hashedPassword) {
    return await compare(password, hashedPassword);
  }

  calculateAge(dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  sanitizeUser(user, options = {}) {
    const sanitized = { ...user };
    
    // Always remove sensitive fields
    delete sanitized.password;
    delete sanitized.security;
    delete sanitized.metadata;

    // Remove analytics if not requested
    if (!options.includeSensitive) {
      delete sanitized.analytics;
      delete sanitized.verification?.documents;
    }

    return sanitized;
  }

  sanitizeUserData(userData) {
    const sanitized = { ...userData };
    delete sanitized.password;
    return sanitized;
  }

  getDefaultPreferences(role) {
    const basePreferences = {
      language: 'en',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
      notifications: this.getDefaultNotificationSettings(),
      privacy: {
        profileVisible: true,
        searchable: true,
        showOnlineStatus: true
      }
    };

    // Role-specific preferences
    switch (role) {
      case USER_ROLES.SERVICE_PROVIDER:
        return {
          ...basePreferences,
          business: {
            autoAcceptBookings: false,
            instantBooking: true,
            advanceNotice: 2 // hours
          }
        };

      case USER_ROLES.GOVERNMENT:
        return {
          ...basePreferences,
          government: {
            department: '',
            notifications: {
              projectUpdates: true,
              budgetAlerts: true,
              complianceIssues: true
            }
          }
        };

      default:
        return basePreferences;
    }
  }

  getDefaultNotificationSettings() {
    return {
      push: true,
      email: false,
      sms: false,
      types: {
        bookings: true,
        messages: true,
        payments: true,
        promotions: false,
        security: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  getSubscriptionFeatures(tier) {
    const features = {
      [SUBSCRIPTION_TIERS.FREE]: {
        maxServices: 3,
        maxBookings: 10,
        basicAnalytics: true,
        standardSupport: true
      },
      [SUBSCRIPTION_TIERS.PREMIUM]: {
        maxServices: 20,
        maxBookings: 100,
        advancedAnalytics: true,
        prioritySupport: true,
        featuredListing: true,
        customDomain: false
      },
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
        maxServices: 100,
        maxBookings: 500,
        advancedAnalytics: true,
        dedicatedSupport: true,
        featuredListing: true,
        customDomain: true,
        apiAccess: true
      }
    };

    return features[tier] || features[SUBSCRIPTION_TIERS.FREE];
  }

  async enrichUser(user, options = {}) {
    const enriched = { ...user };

    if (options.includeAnalytics) {
      enriched.analytics = await this.getUserAnalytics(user.id);
    }

    // Add computed fields
    enriched.isVerified = user.verification?.status === 'verified';
    enriched.isActive = user.status === USER_STATUS.ACTIVE;
    enriched.hasCompleteProfile = this.checkProfileCompleteness(user);
    enriched.accountAge = this.calculateAccountAge(user.createdAt);

    return enriched;
  }

  checkProfileCompleteness(user) {
    const requiredFields = [
      'profile.firstName',
      'profile.lastName',
      'email',
      'phone',
      'location.city'
    ];

    return requiredFields.every(field => {
      const value = this.getNestedValue(user, field);
      return value && value.toString().trim().length > 0;
    });
  }

  calculateAccountAge(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  isCacheExpired(timestamp, ttl = 10 * 60 * 1000) { // 10 minutes default TTL
    return Date.now() - timestamp > ttl;
  }

  async canUpdateProfile(targetUserId, currentUserId, currentUserRole) {
    // Users can update their own profile
    if (targetUserId === currentUserId) {
      return { allowed: true };
    }

    // Admins can update any profile
    if (currentUserRole === USER_ROLES.ADMIN) {
      return { allowed: true };
    }

    // Government users have limited cross-user update permissions
    if (currentUserRole === USER_ROLES.GOVERNMENT) {
      const targetUser = await this.getUserById(targetUserId);
      if (targetUser.role === USER_ROLES.SERVICE_PROVIDER) {
        return { allowed: true, reason: 'Government can update service provider profiles' };
      }
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  async isAccountLocked(userId) {
    const user = await this.getUserById(userId, { includeSensitive: true });
    
    if (user.security.accountLockedUntil) {
      const lockUntil = new Date(user.security.accountLockedUntil);
      if (isBefore(new Date(), lockUntil)) {
        return true;
      }
    }

    return false;
  }

  async lockUserAccount(userId, lockUntil) {
    await this.updateUser(userId, {
      security: {
        accountLockedUntil: lockUntil.toISOString()
      }
    });
  }

  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // Clean up every hour
  }

  startAnalyticsFlush() {
    setInterval(() => {
      this.flushUserAnalytics();
    }, 5 * 60 * 1000); // Flush every 5 minutes
  }

  cleanupExpiredSessions() {
    const now = new Date();
    
    for (const [userId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(userId);
      }
    }
  }

  async flushUserAnalytics() {
    // Implementation would flush analytics to backend
  }

  invalidateUserCache(userId) {
    this.userCache.delete(`user_${userId}`);
    this.profileCache.delete(`profile_${userId}`);
  }

  /**
   * Backend API methods (would be implemented with actual API calls)
   */

  async loadCurrentUser() {
    // Implementation would load current user from auth service
  }

  async findUserByEmail(email) {
    // Implementation would query database
    return null;
  }

  async findUserByPhone(phone) {
    // Implementation would query database
    return null;
  }

  async saveUser(user) {
    // Implementation would save to database
    return user;
  }

  async fetchUserById(userId) {
    // Implementation would fetch from database
    return null;
  }

  async updateUser(userId, updates) {
    // Implementation would update user in database
    return { id: userId, ...updates };
  }

  async executeUserSearch(searchQuery) {
    // Implementation would execute user search
    return {
      users: [],
      totalCount: 0
    };
  }

  async fetchUserAnalytics(userId, timeRange) {
    // Implementation would fetch user analytics
    return {};
  }

  calculateUserMetrics(analytics) {
    // Implementation would calculate user metrics
    return {};
  }

  generateUserInsights(metrics) {
    // Implementation would generate user insights
    return [];
  }

  async updateLoginAnalytics(userId, loginData) {
    // Implementation would update login analytics
  }

  async validateProfileUpdates(currentUser, updates) {
    // Implementation would validate profile updates
    return { isValid: true, errors: [] };
  }

  async initializeUserWorkflow(user) {
    // Implementation would initialize user workflow
  }

  getAppVersion() {
    return '1.0.0';
  }

  async getClientIP() {
    return 'unknown';
  }

  getUserAgent() {
    return Platform.OS;
  }
}

// Create singleton instance
const userService = new UserService();

// Export service instance and class
export { UserService, userService };
export default userService;