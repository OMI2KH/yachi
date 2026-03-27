/**
 * Yachi - Enterprise Storage Utilities
 * Advanced storage layer with encryption, migration, caching, and security
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import { 
  STORAGE_KEYS, 
  PERFORMANCE_CONFIG,
  SECURITY_LEVELS 
} from '../constants/storage';
import { logStorageEvent, logError } from '../services/analytics-service';

/**
 * Enterprise Storage Manager
 * Comprehensive storage solution with security and performance optimizations
 */
class StorageManager {
  constructor() {
    this.isInitialized = false;
    this.encryptionKey = null;
    this.cache = new Map();
    this.storageStats = {
      reads: 0,
      writes: 0,
      hits: 0,
      misses: 0,
      errors: 0
    };
  }

  /**
   * Initialize storage system with enterprise features
   */
  async initialize() {
    try {
      await this.generateEncryptionKey();
      await this.runStorageMigrations();
      await this.setupCacheCleanup();
      await this.verifyStorageIntegrity();
      
      this.isInitialized = true;
      
      logStorageEvent('storage_system_initialized', {
        platform: Platform.OS,
        encryptionEnabled: !!this.encryptionKey,
        cacheSize: this.cache.size
      });
    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw new Error('STORAGE_INIT_FAILED');
    }
  }

  /**
   * Generate secure encryption key for data protection
   */
  async generateEncryptionKey() {
    try {
      // Try to retrieve existing key from secure storage
      let key = await SecureStore.getItemAsync('storage_encryption_key');
      
      if (!key) {
        // Generate new key using multiple entropy sources
        const entropy = [
          Date.now().toString(),
          Math.random().toString(36),
          Platform.OS,
          Platform.Version?.toString() || 'unknown'
        ].join('|');
        
        key = CryptoJS.SHA512(entropy).toString(CryptoJS.enc.Hex);
        
        // Store in secure storage
        await SecureStore.setItemAsync('storage_encryption_key', key);
        
        logStorageEvent('encryption_key_generated');
      }
      
      this.encryptionKey = key;
      return key;
    } catch (error) {
      console.error('Encryption key generation failed:', error);
      throw new Error('ENCRYPTION_KEY_GENERATION_FAILED');
    }
  }

  /**
   * Run storage migrations for schema updates
   */
  async runStorageMigrations() {
    try {
      const currentVersion = await this.getStorageVersion();
      const targetVersion = 3; // Current schema version
      
      if (currentVersion >= targetVersion) {
        return; // No migration needed
      }

      logStorageEvent('storage_migration_started', {
        fromVersion: currentVersion,
        toVersion: targetVersion
      });

      // Execute migrations in sequence
      for (let version = currentVersion + 1; version <= targetVersion; version++) {
        const migrationFunction = this[`migrateToV${version}`];
        if (typeof migrationFunction === 'function') {
          await migrationFunction.call(this);
          logStorageEvent(`migration_v${version}_completed`);
        }
      }

      await this.setStorageVersion(targetVersion);
      logStorageEvent('storage_migration_completed');
    } catch (error) {
      console.error('Storage migration failed:', error);
      throw new Error('STORAGE_MIGRATION_FAILED');
    }
  }

  /**
   * Migration to version 2 - Enhanced security
   */
  async migrateToV2() {
    // Migrate sensitive data to secure storage
    const sensitiveKeys = [
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.PAYMENT_INFO
    ];

    for (const key of sensitiveKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          await this.secureSet(key, data);
          await AsyncStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Migration failed for key ${key}:`, error);
      }
    }
  }

  /**
   * Migration to version 3 - Cache optimization
   */
  async migrateToV3() {
    // Clear old cache structure and implement new one
    const allKeys = await AsyncStorage.getAllKeys();
    const oldCacheKeys = allKeys.filter(key => key.startsWith('cache_'));
    
    if (oldCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(oldCacheKeys);
    }
  }

  /**
   * Get current storage version
   */
  async getStorageVersion() {
    try {
      const version = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);
      return version ? parseInt(version, 10) : 1;
    } catch {
      return 1;
    }
  }

  /**
   * Set storage version
   */
  async setStorageVersion(version) {
    await AsyncStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, version.toString());
  }

  /**
   * Setup automatic cache cleanup
   */
  async setupCacheCleanup() {
    // Cleanup expired cache entries every hour
    setInterval(() => {
      this.cleanupExpiredCache().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Verify storage integrity and performance
   */
  async verifyStorageIntegrity() {
    try {
      const testData = {
        timestamp: Date.now(),
        test: 'storage_integrity_check'
      };

      const testKey = 'storage_integrity_test';
      
      // Test write
      await this.set(testKey, testData, { ttl: 60000 }); // 1 minute TTL
      
      // Test read
      const retrieved = await this.get(testKey);
      
      // Test delete
      await this.remove(testKey);

      if (!retrieved || retrieved.test !== testData.test) {
        throw new Error('STORAGE_INTEGRITY_CHECK_FAILED');
      }

      logStorageEvent('storage_integrity_verified');
    } catch (error) {
      console.error('Storage integrity verification failed:', error);
      throw new Error('STORAGE_INTEGRITY_FAILED');
    }
  }

  /**
   * Store data with advanced options
   */
  async set(key, value, options = {}) {
    try {
      this.validateKey(key);
      
      const {
        encrypt = false,
        ttl = 0, // Time to live in milliseconds (0 = no expiration)
        secure = false,
        compress = false
      } = options;

      const storageItem = {
        data: value,
        metadata: {
          timestamp: Date.now(),
          ttl,
          encrypted: encrypt,
          secure,
          compressed: compress,
          version: '1.0'
        }
      };

      let processedData = storageItem;

      // Encrypt if requested
      if (encrypt && this.encryptionKey) {
        processedData = this.encryptData(processedData);
      }

      // Compress if requested (simple JSON stringify for now)
      if (compress) {
        processedData = this.compressData(processedData);
      }

      const storageKey = this.getStorageKey(key, secure);
      const storageString = JSON.stringify(processedData);

      if (secure) {
        await SecureStore.setItemAsync(storageKey, storageString);
      } else {
        await AsyncStorage.setItem(storageKey, storageString);
      }

      // Update memory cache
      if (ttl > 0) {
        this.cache.set(key, {
          data: value,
          expiry: Date.now() + ttl
        });
      }

      this.storageStats.writes++;
      logStorageEvent('data_stored', { key, secure, encrypted: encrypt, ttl });

      return true;
    } catch (error) {
      console.error(`Storage set failed for key "${key}":`, error);
      this.storageStats.errors++;
      throw new Error('STORAGE_SET_FAILED');
    }
  }

  /**
   * Retrieve data with cache support
   */
  async get(key, options = {}) {
    try {
      this.validateKey(key);
      
      const {
        secure = false,
        defaultValue = null,
        skipCache = false
      } = options;

      this.storageStats.reads++;

      // Check memory cache first
      if (!skipCache && this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (cached.expiry > Date.now()) {
          this.storageStats.hits++;
          return cached.data;
        } else {
          this.cache.delete(key); // Remove expired cache
        }
      }

      this.storageStats.misses++;

      const storageKey = this.getStorageKey(key, secure);
      let storedData;

      if (secure) {
        storedData = await SecureStore.getItemAsync(storageKey);
      } else {
        storedData = await AsyncStorage.getItem(storageKey);
      }

      if (!storedData) {
        return defaultValue;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(storedData);
      } catch (parseError) {
        console.error(`Failed to parse stored data for key "${key}":`, parseError);
        await this.remove(key, { secure });
        return defaultValue;
      }

      // Decompress if needed
      if (parsedData.metadata?.compressed) {
        parsedData = this.decompressData(parsedData);
      }

      // Decrypt if needed
      if (parsedData.metadata?.encrypted) {
        parsedData = this.decryptData(parsedData);
      }

      // Check TTL
      if (parsedData.metadata?.ttl > 0) {
        const age = Date.now() - parsedData.metadata.timestamp;
        if (age > parsedData.metadata.ttl) {
          await this.remove(key, { secure });
          return defaultValue;
        }
      }

      const result = parsedData.data;

      // Update memory cache
      if (parsedData.metadata?.ttl > 0) {
        this.cache.set(key, {
          data: result,
          expiry: parsedData.metadata.timestamp + parsedData.metadata.ttl
        });
      }

      return result;
    } catch (error) {
      console.error(`Storage get failed for key "${key}":`, error);
      this.storageStats.errors++;
      return defaultValue;
    }
  }

  /**
   * Remove data from storage
   */
  async remove(key, options = {}) {
    try {
      this.validateKey(key);
      
      const { secure = false } = options;

      const storageKey = this.getStorageKey(key, secure);

      if (secure) {
        await SecureStore.deleteItemAsync(storageKey);
      } else {
        await AsyncStorage.removeItem(storageKey);
      }

      // Remove from memory cache
      this.cache.delete(key);

      logStorageEvent('data_removed', { key, secure });
      return true;
    } catch (error) {
      console.error(`Storage remove failed for key "${key}":`, error);
      this.storageStats.errors++;
      throw new Error('STORAGE_REMOVE_FAILED');
    }
  }

  /**
   * Store data securely with encryption
   */
  async secureSet(key, value, options = {}) {
    return this.set(key, value, { ...options, secure: true, encrypt: true });
  }

  /**
   * Retrieve secure data
   */
  async secureGet(key, defaultValue = null) {
    return this.get(key, { secure: true, defaultValue });
  }

  /**
   * Store data in cache with TTL
   */
  async cacheSet(key, value, ttl = PERFORMANCE_CONFIG.CACHE_TTL) {
    return this.set(key, value, { ttl });
  }

  /**
   * Get data from cache
   */
  async cacheGet(key, defaultValue = null) {
    return this.get(key, { defaultValue });
  }

  /**
   * Get multiple items efficiently
   */
  async multiGet(keys, options = {}) {
    try {
      const { secure = false, defaultValue = null } = options;
      
      const storageKeys = keys.map(key => this.getStorageKey(key, secure));
      const results = {};
      
      if (secure) {
        // Secure store doesn't support multiGet, so we do sequential
        for (let i = 0; i < keys.length; i++) {
          results[keys[i]] = await this.get(keys[i], { secure, defaultValue });
        }
      } else {
        const items = await AsyncStorage.multiGet(storageKeys);
        
        for (let i = 0; i < items.length; i++) {
          const [storageKey, value] = items[i];
          const originalKey = this.getOriginalKey(storageKey);
          
          if (value !== null) {
            results[originalKey] = await this.get(originalKey, options);
          } else {
            results[originalKey] = defaultValue;
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('MultiGet operation failed:', error);
      return {};
    }
  }

  /**
   * Set multiple items efficiently
   */
  async multiSet(keyValuePairs, options = {}) {
    try {
      const operations = keyValuePairs.map(([key, value]) => 
        this.set(key, value, options)
      );
      
      await Promise.all(operations);
      return true;
    } catch (error) {
      console.error('MultiSet operation failed:', error);
      throw new Error('MULTI_SET_FAILED');
    }
  }

  /**
   * Remove multiple items
   */
  async multiRemove(keys, options = {}) {
    try {
      const operations = keys.map(key => 
        this.remove(key, options)
      );
      
      await Promise.all(operations);
      return true;
    } catch (error) {
      console.error('MultiRemove operation failed:', error);
      throw new Error('MULTI_REMOVE_FAILED');
    }
  }

  /**
   * Get all keys with optional filter
   */
  async getAllKeys(filter = null) {
    try {
      const asyncKeys = await AsyncStorage.getAllKeys();
      const secureKeys = await this.getSecureStoreKeys();
      
      const allKeys = [...asyncKeys, ...secureKeys];
      
      if (filter) {
        return allKeys.filter(key => filter.test(key));
      }
      
      return allKeys;
    } catch (error) {
      console.error('GetAllKeys operation failed:', error);
      return [];
    }
  }

  /**
   * Get keys from secure store (approximation)
   */
  async getSecureStoreKeys() {
    // SecureStore doesn't provide getAllKeys, so we maintain our own registry
    try {
      const registry = await SecureStore.getItemAsync('secure_keys_registry');
      return registry ? JSON.parse(registry) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all storage data (with exclusions)
   */
  async clear(excludePatterns = []) {
    try {
      const allKeys = await this.getAllKeys();
      
      const keysToRemove = allKeys.filter(key =>
        !excludePatterns.some(pattern => key.includes(pattern))
      );

      await this.multiRemove(keysToRemove);
      
      // Clear memory cache
      this.cache.clear();
      
      logStorageEvent('storage_cleared', { 
        keysRemoved: keysToRemove.length,
        excludePatterns 
      });
      
      return true;
    } catch (error) {
      console.error('Storage clear failed:', error);
      throw new Error('STORAGE_CLEAR_FAILED');
    }
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredCache() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean memory cache
      for (const [key, value] of this.cache.entries()) {
        if (value.expiry <= now) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      // Clean persistent cache
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache_'));

      for (const key of cacheKeys) {
        try {
          const data = await this.get(this.getOriginalKey(key));
          if (!data) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        } catch {
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logStorageEvent('cache_cleanup_completed', { cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      ...this.storageStats,
      cacheSize: this.cache.size,
      hitRate: this.storageStats.reads > 0 ? 
        (this.storageStats.hits / this.storageStats.reads) * 100 : 0
    };
  }

  /**
   * Reset storage statistics
   */
  resetStats() {
    this.storageStats = {
      reads: 0,
      writes: 0,
      hits: 0,
      misses: 0,
      errors: 0
    };
  }

  /**
   * Encrypt data using AES
   */
  encryptData(data) {
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY_NOT_AVAILABLE');
    }

    const dataString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(dataString, this.encryptionKey).toString();
    
    return {
      encrypted: true,
      data: encrypted
    };
  }

  /**
   * Decrypt data
   */
  decryptData(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY_NOT_AVAILABLE');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, this.encryptionKey);
      const dataString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!dataString) {
        throw new Error('DECRYPTION_FAILED');
      }

      return JSON.parse(dataString);
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('DECRYPTION_FAILED');
    }
  }

  /**
   * Compress data (simple implementation)
   */
  compressData(data) {
    // For now, use JSON stringify - can be enhanced with proper compression
    return {
      compressed: true,
      data: JSON.stringify(data)
    };
  }

  /**
   * Decompress data
   */
  decompressData(compressedData) {
    try {
      return JSON.parse(compressedData.data);
    } catch (error) {
      console.error('Data decompression failed:', error);
      throw new Error('DECOMPRESSION_FAILED');
    }
  }

  /**
   * Validate storage key
   */
  validateKey(key) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('INVALID_STORAGE_KEY');
    }

    if (key.length > 255) {
      throw new Error('STORAGE_KEY_TOO_LONG');
    }

    // Prevent reserved patterns
    const reservedPatterns = ['__internal__', 'secure_keys_registry'];
    if (reservedPatterns.some(pattern => key.includes(pattern))) {
      throw new Error('RESERVED_STORAGE_KEY');
    }
  }

  /**
   * Get storage key with prefix
   */
  getStorageKey(key, secure = false) {
    const prefix = secure ? 'secure_' : 'yachi_';
    return `${prefix}${key}`;
  }

  /**
   * Get original key from storage key
   */
  getOriginalKey(storageKey) {
    return storageKey.replace(/^(secure_|yachi_)/, '');
  }

  /**
   * Check if storage system is ready
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Cleanup storage resources
   */
  cleanup() {
    this.cache.clear();
    this.isInitialized = false;
    
    logStorageEvent('storage_system_cleanup');
  }
}

// Create singleton instance
const storageManager = new StorageManager();

export default storageManager;

/**
 * Quick storage utilities for common operations
 */
export const storage = {
  // Basic operations
  set: (key, value, options) => storageManager.set(key, value, options),
  get: (key, options) => storageManager.get(key, options),
  remove: (key, options) => storageManager.remove(key, options),
  
  // Secure operations
  secureSet: (key, value, options) => storageManager.secureSet(key, value, options),
  secureGet: (key, defaultValue) => storageManager.secureGet(key, defaultValue),
  
  // Cache operations
  cacheSet: (key, value, ttl) => storageManager.cacheSet(key, value, ttl),
  cacheGet: (key, defaultValue) => storageManager.cacheGet(key, defaultValue),
  
  // Batch operations
  multiGet: (keys, options) => storageManager.multiGet(keys, options),
  multiSet: (keyValuePairs, options) => storageManager.multiSet(keyValuePairs, options),
  multiRemove: (keys, options) => storageManager.multiRemove(keys, options),
  
  // Management
  getAllKeys: (filter) => storageManager.getAllKeys(filter),
  clear: (excludePatterns) => storageManager.clear(excludePatterns),
  getStats: () => storageManager.getStats(),
  cleanup: () => storageManager.cleanupExpiredCache()
};

/**
 * Export manager for direct access
 */
export { storageManager };