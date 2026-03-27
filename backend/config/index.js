/**
 * Yachi - Enterprise Configuration Manager
 * Centralized configuration management for Ethiopian Service Marketplace & Construction Platform
 * @version 1.0.0
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// Import Enterprise Services
const { YachiLogger } = require('../utils/logger');
const { securityManager } = require('../utils/security');
const { storageManager } = require('../utils/storage');

/**
 * Enterprise Configuration Manager
 * Advanced configuration management with encryption, validation, and real-time updates
 */
class ConfigManager extends EventEmitter {
  constructor() {
    super();
    
    this.configs = new Map();
    this.validators = new Map();
    this.watchers = new Map();
    this.encryptedFields = new Set();
    this.initialized = false;
    this.startTime = performance.now();
    
    // Configuration state
    this.state = {
      isReady: false,
      lastValidation: null,
      errors: [],
      warnings: [],
      environment: process.env.NODE_ENV || 'development'
    };

    // Setup event listeners
    this.setupEventHandlers();
  }

  /**
   * Initialize configuration manager with all enterprise modules
   */
  async initialize() {
    if (this.initialized) {
      YachiLogger.warn('Configuration manager already initialized');
      return true;
    }

    try {
      YachiLogger.info('🚀 Initializing Yachi Enterprise Configuration Manager...');

      // Step 1: Load environment variables
      await this.loadEnvironment();

      // Step 2: Load all configuration modules
      await this.loadConfigurationModules();

      // Step 3: Setup encryption for sensitive data
      await this.setupEncryption();

      // Step 4: Validate all configurations
      await this.validateAllConfigurations();

      // Step 5: Setup monitoring and hot-reload
      await this.setupMonitoring();

      // Step 6: Setup configuration backup
      await this.setupBackup();

      this.initialized = true;
      this.state.isReady = true;
      this.state.lastValidation = new Date();

      const initTime = performance.now() - this.startTime;
      
      YachiLogger.info(`✅ Configuration manager initialized in ${initTime.toFixed(2)}ms`, {
        environment: this.state.environment,
        configModules: Array.from(this.configs.keys()),
        encryptedFields: this.encryptedFields.size,
        validators: this.validators.size
      });

      this.emit('initialized', this.getSummary());
      return true;

    } catch (error) {
      YachiLogger.error('❌ Configuration manager initialization failed:', error);
      this.state.errors.push(error.message);
      this.emit('initialization_failed', error);
      throw error;
    }
  }

  /**
   * Load and validate environment variables
   */
  async loadEnvironment() {
    const requiredEnvVars = {
      // Core Environment
      NODE_ENV: 'development',
      
      // Database
      MONGODB_URI: null,
      REDIS_URL: null,
      
      // Security
      JWT_SECRET: null,
      ENCRYPTION_KEY: null,
      
      // Payment Gateways
      CHAPA_SECRET_KEY: this.state.environment === 'production' ? null : 'optional',
      TELEBIRR_APP_KEY: this.state.environment === 'production' ? null : 'optional',
      CBE_BIRR_SECRET_KEY: this.state.environment === 'production' ? null : 'optional',
      
      // External Services
      GOOGLE_MAPS_API_KEY: 'optional',
      SENTRY_DSN: 'optional'
    };

    const missing = [];
    const warnings = [];

    for (const [key, requirement] of Object.entries(requiredEnvVars)) {
      if (!process.env[key]) {
        if (requirement === null) {
          missing.push(key);
        } else if (requirement === 'optional') {
          warnings.push(`${key} is not set (optional)`);
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (warnings.length > 0) {
      YachiLogger.warn('Environment variable warnings:', warnings);
      this.state.warnings.push(...warnings);
    }

    // Set environment-specific defaults
    this.applyEnvironmentDefaults();

    YachiLogger.info('✅ Environment variables loaded successfully');
  }

  /**
   * Apply environment-specific configuration defaults
   */
  applyEnvironmentDefaults() {
    const defaults = {
      development: {
        LOG_LEVEL: 'debug',
        CACHE_ENABLED: 'false',
        SSL_ENABLED: 'false'
      },
      production: {
        LOG_LEVEL: 'warn',
        CACHE_ENABLED: 'true',
        SSL_ENABLED: 'true'
      },
      staging: {
        LOG_LEVEL: 'info',
        CACHE_ENABLED: 'true',
        SSL_ENABLED: 'true'
      }
    };

    const envDefaults = defaults[this.state.environment] || {};
    
    for (const [key, value] of Object.entries(envDefaults)) {
      if (!process.env[key]) {
        process.env[key] = value;
        YachiLogger.debug(`Set default environment variable: ${key}=${value}`);
      }
    }
  }

  /**
   * Load all enterprise configuration modules
   */
  async loadConfigurationModules() {
    const modules = [
      // Core Configurations
      { name: 'core', path: './core-config', critical: true },
      { name: 'database', path: './database', critical: true },
      { name: 'security', path: './security', critical: true },
      
      // Feature Configurations
      { name: 'ai', path: './ai-config', critical: false },
      { name: 'construction', path: './construction-config', critical: false },
      { name: 'payment', path: './payment-config', critical: false },
      { name: 'government', path: './government-config', critical: false },
      { name: 'premium', path: './premium-config', critical: false },
      
      // Service Configurations
      { name: 'notifications', path: './notification-config', critical: false },
      { name: 'analytics', path: './analytics-config', critical: false },
      { name: 'cache', path: './cache-config', critical: false }
    ];

    for (const module of modules) {
      try {
        await this.loadConfigurationModule(module);
      } catch (error) {
        if (module.critical) {
          throw new Error(`Critical configuration module ${module.name} failed to load: ${error.message}`);
        } else {
          YachiLogger.warn(`Non-critical configuration module ${module.name} failed to load:`, error.message);
        }
      }
    }

    // Set up configuration relationships and dependencies
    this.setupConfigurationDependencies();
  }

  /**
   * Load individual configuration module
   */
  async loadConfigurationModule(module) {
    const modulePath = path.join(__dirname, module.path);
    
    try {
      // Clear cache for fresh load
      delete require.cache[require.resolve(modulePath)];
      
      const configModule = require(modulePath);
      
      // Handle different export patterns
      let config;
      if (typeof configModule === 'function') {
        config = configModule();
      } else if (configModule.config) {
        config = configModule.config;
      } else {
        config = configModule;
      }

      // Encrypt sensitive fields
      config = await this.encryptSensitiveData(module.name, config);
      
      this.configs.set(module.name, config);
      
      // Register validators if available
      if (configModule.validateConfig) {
        this.validators.set(module.name, configModule.validateConfig);
      }

      YachiLogger.debug(`✅ Loaded configuration module: ${module.name}`);
      
    } catch (error) {
      YachiLogger.error(`❌ Failed to load configuration module ${module.name}:`, error);
      throw error;
    }
  }

  /**
   * Setup configuration dependencies and relationships
   */
  setupConfigurationDependencies() {
    // Database dependencies
    const dbConfig = this.get('database');
    if (dbConfig) {
      // Ensure all feature configs use the same database settings
      this.propagateDatabaseSettings(dbConfig);
    }

    // Security dependencies
    const securityConfig = this.get('security');
    if (securityConfig) {
      this.propagateSecuritySettings(securityConfig);
    }

    YachiLogger.debug('✅ Configuration dependencies established');
  }

  /**
   * Propagate database settings to feature configurations
   */
  propagateDatabaseSettings(dbConfig) {
    const features = ['ai', 'construction', 'payment', 'government', 'premium'];
    
    for (const feature of features) {
      const featureConfig = this.get(feature);
      if (featureConfig && typeof featureConfig === 'object') {
        featureConfig.database = { ...dbConfig, ...featureConfig.database };
        this.configs.set(feature, featureConfig);
      }
    }
  }

  /**
   * Propagate security settings to feature configurations
   */
  propagateSecuritySettings(securityConfig) {
    const features = ['payment', 'government', 'premium'];
    
    for (const feature of features) {
      const featureConfig = this.get(feature);
      if (featureConfig && typeof featureConfig === 'object') {
        featureConfig.security = { ...securityConfig, ...featureConfig.security };
        this.configs.set(feature, featureConfig);
      }
    }
  }

  /**
   * Setup encryption for sensitive configuration data
   */
  async setupEncryption() {
    try {
      // Define sensitive fields that should be encrypted
      const sensitiveFields = {
        payment: ['secretKey', 'apiKey', 'privateKey', 'webhookSecret'],
        security: ['encryptionKey', 'jwtSecret', 'apiSecret'],
        database: ['password', 'connectionString']
      };

      for (const [module, fields] of Object.entries(sensitiveFields)) {
        fields.forEach(field => this.encryptedFields.add(`${module}.${field}`));
      }

      YachiLogger.debug(`✅ Encryption setup completed for ${this.encryptedFields.size} fields`);

    } catch (error) {
      YachiLogger.error('❌ Encryption setup failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data in configuration
   */
  async encryptSensitiveData(moduleName, config) {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    const encryptedConfig = { ...config };

    for (const key of Object.keys(encryptedConfig)) {
      const fullPath = `${moduleName}.${key}`;
      
      if (this.encryptedFields.has(fullPath) && encryptedConfig[key]) {
        try {
          encryptedConfig[key] = await securityManager.encryptData(encryptedConfig[key]);
          YachiLogger.debug(`🔒 Encrypted configuration field: ${fullPath}`);
        } catch (error) {
          YachiLogger.error(`❌ Failed to encrypt ${fullPath}:`, error);
        }
      } else if (typeof encryptedConfig[key] === 'object') {
        encryptedConfig[key] = await this.encryptSensitiveData(fullPath, encryptedConfig[key]);
      }
    }

    return encryptedConfig;
  }

  /**
   * Decrypt sensitive configuration data
   */
  async decryptSensitiveData(moduleName, config) {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    const decryptedConfig = { ...config };

    for (const key of Object.keys(decryptedConfig)) {
      const fullPath = `${moduleName}.${key}`;
      
      if (this.encryptedFields.has(fullPath) && decryptedConfig[key]) {
        try {
          decryptedConfig[key] = await securityManager.decryptData(decryptedConfig[key]);
        } catch (error) {
          YachiLogger.error(`❌ Failed to decrypt ${fullPath}:`, error);
        }
      } else if (typeof decryptedConfig[key] === 'object') {
        decryptedConfig[key] = await this.decryptSensitiveData(fullPath, decryptedConfig[key]);
      }
    }

    return decryptedConfig;
  }

  /**
   * Validate all configurations
   */
  async validateAllConfigurations() {
    YachiLogger.info('🔍 Validating all configurations...');

    const validationResults = [];

    for (const [moduleName, validator] of this.validators) {
      try {
        const config = this.configs.get(moduleName);
        const result = await validator(config);
        
        validationResults.push({
          module: moduleName,
          valid: result.valid || true,
          errors: result.errors || [],
          warnings: result.warnings || []
        });

        if (result.errors && result.errors.length > 0) {
          this.state.errors.push(...result.errors.map(error => `${moduleName}: ${error}`));
        }

        if (result.warnings && result.warnings.length > 0) {
          this.state.warnings.push(...result.warnings.map(warning => `${moduleName}: ${warning}`));
        }

      } catch (error) {
        YachiLogger.error(`❌ Validation failed for ${moduleName}:`, error);
        validationResults.push({
          module: moduleName,
          valid: false,
          errors: [error.message]
        });
        this.state.errors.push(`${moduleName}: ${error.message}`);
      }
    }

    // Log validation summary
    const validCount = validationResults.filter(r => r.valid).length;
    const totalCount = validationResults.length;

    YachiLogger.info(`✅ Configuration validation completed: ${validCount}/${totalCount} modules valid`);

    if (this.state.errors.length > 0) {
      YachiLogger.error('Configuration validation errors:', this.state.errors);
      throw new Error('Configuration validation failed');
    }

    if (this.state.warnings.length > 0) {
      YachiLogger.warn('Configuration validation warnings:', this.state.warnings);
    }

    this.state.lastValidation = new Date();
    this.emit('validation_completed', validationResults);
  }

  /**
   * Setup configuration monitoring and hot-reload
   */
  async setupMonitoring() {
    if (this.state.environment === 'production') {
      YachiLogger.info('📊 Configuration monitoring enabled');
      return;
    }

    try {
      // Setup file watching for development
      const chokidar = await import('chokidar');
      const configDir = __dirname;

      const watcher = chokidar.watch(configDir, {
        ignored: /(^|[/\\])\../,
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', async (filePath) => {
        const moduleName = path.basename(filePath, '.js');
        YachiLogger.info(`🔄 Configuration file changed: ${moduleName}`);

        try {
          await this.reloadConfiguration(moduleName);
          this.emit('config_updated', { module: moduleName, timestamp: new Date() });
        } catch (error) {
          YachiLogger.error(`❌ Failed to reload configuration ${moduleName}:`, error);
          this.emit('config_reload_failed', { module: moduleName, error: error.message });
        }
      });

      this.watchers.set('file', watcher);
      YachiLogger.debug('✅ Configuration file watching enabled');

    } catch (error) {
      YachiLogger.warn('⚠️ File watching not available:', error.message);
    }
  }

  /**
   * Setup configuration backup system
   */
  async setupBackup() {
    try {
      // Backup configuration to secure storage
      const backupConfig = this.getAll();
      await storageManager.secureSet('config_backup', backupConfig);
      
      // Schedule regular backups
      setInterval(async () => {
        try {
          const currentConfig = this.getAll();
          await storageManager.secureSet('config_backup', currentConfig);
          YachiLogger.debug('✅ Configuration backup completed');
        } catch (error) {
          YachiLogger.error('❌ Configuration backup failed:', error);
        }
      }, 24 * 60 * 60 * 1000); // Daily backup

      YachiLogger.debug('✅ Configuration backup system enabled');

    } catch (error) {
      YachiLogger.error('❌ Configuration backup setup failed:', error);
    }
  }

  /**
   * Setup event handlers for configuration changes
   */
  setupEventHandlers() {
    this.on('config_updated', (data) => {
      YachiLogger.info(`Configuration updated: ${data.module}`, data);
    });

    this.on('validation_completed', (results) => {
      YachiLogger.debug('Configuration validation completed', {
        valid: results.filter(r => r.valid).length,
        total: results.length
      });
    });

    this.on('error', (error) => {
      YachiLogger.error('Configuration manager error:', error);
    });
  }

  /**
   * Get configuration value with dot notation support
   */
  get(path, defaultValue = null) {
    if (!this.state.isReady) {
      YachiLogger.warn('Configuration manager not ready');
      return defaultValue;
    }

    try {
      const keys = path.split('.');
      let value = this.configs;

      for (const key of keys) {
        if (value && typeof value === 'object' && value.has && value.get) {
          // Map instance
          value = value.get(key);
        } else if (value && typeof value === 'object' && key in value) {
          // Plain object
          value = value[key];
        } else {
          return defaultValue;
        }
      }

      return value !== undefined ? value : defaultValue;
    } catch (error) {
      YachiLogger.error(`Error accessing configuration path ${path}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set configuration value
   */
  async set(path, value, options = {}) {
    if (!this.state.isReady) {
      throw new Error('Configuration manager not ready');
    }

    const keys = path.split('.');
    const moduleName = keys[0];
    const config = this.configs.get(moduleName);

    if (!config) {
      throw new Error(`Configuration module ${moduleName} not found`);
    }

    // Encrypt if sensitive field
    const fullPath = keys.join('.');
    let processedValue = value;
    
    if (this.encryptedFields.has(fullPath) && options.encrypt !== false) {
      processedValue = await securityManager.encryptData(value);
    }

    // Update configuration
    this.updateNestedConfig(config, keys.slice(1), processedValue);
    this.configs.set(moduleName, config);

    YachiLogger.debug(`Configuration updated: ${path}`);
    this.emit('config_changed', { path, value: processedValue, encrypted: options.encrypt !== false });

    // Revalidate if requested
    if (options.validate !== false) {
      await this.validateConfiguration(moduleName);
    }
  }

  /**
   * Update nested configuration object
   */
  updateNestedConfig(obj, keys, value) {
    const key = keys[0];
    
    if (keys.length === 1) {
      obj[key] = value;
    } else {
      if (!obj[key] || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      this.updateNestedConfig(obj[key], keys.slice(1), value);
    }
  }

  /**
   * Reload specific configuration module
   */
  async reloadConfiguration(moduleName) {
    try {
      const modulePath = `./${moduleName}`;
      
      // Clear from cache
      delete require.cache[require.resolve(modulePath)];
      
      // Reload module
      const reloadedModule = require(modulePath);
      let config = reloadedModule;
      
      if (typeof reloadedModule === 'function') {
        config = reloadedModule();
      } else if (reloadedModule.config) {
        config = reloadedModule.config;
      }

      // Encrypt sensitive data
      config = await this.encryptSensitiveData(moduleName, config);
      
      this.configs.set(moduleName, config);
      
      // Update validators
      if (reloadedModule.validateConfig) {
        this.validators.set(moduleName, reloadedModule.validateConfig);
      }

      // Revalidate
      await this.validateConfiguration(moduleName);

      YachiLogger.info(`✅ Configuration reloaded: ${moduleName}`);
      return true;

    } catch (error) {
      YachiLogger.error(`❌ Failed to reload configuration ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Validate specific configuration module
   */
  async validateConfiguration(moduleName) {
    const validator = this.validators.get(moduleName);
    if (!validator) {
      return { valid: true, errors: [], warnings: [] };
    }

    try {
      const config = this.configs.get(moduleName);
      const result = await validator(config);
      
      if (result.errors && result.errors.length > 0) {
        this.state.errors = this.state.errors.filter(error => !error.startsWith(`${moduleName}:`));
        this.state.errors.push(...result.errors.map(error => `${moduleName}: ${error}`));
      }

      if (result.warnings && result.warnings.length > 0) {
        this.state.warnings = this.state.warnings.filter(warning => !warning.startsWith(`${moduleName}:`));
        this.state.warnings.push(...result.warnings.map(warning => `${moduleName}: ${warning}`));
      }

      return result;

    } catch (error) {
      YachiLogger.error(`❌ Validation failed for ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Get all configurations (for backup/debugging)
   */
  getAll() {
    const allConfigs = {};
    for (const [key, value] of this.configs) {
      allConfigs[key] = value;
    }
    return allConfigs;
  }

  /**
   * Get configuration summary (safe for logging)
   */
  getSummary() {
    return {
      environment: this.state.environment,
      isReady: this.state.isReady,
      lastValidation: this.state.lastValidation,
      modules: Array.from(this.configs.keys()),
      encryptedFields: this.encryptedFields.size,
      errors: this.state.errors.length,
      warnings: this.state.warnings.length
    };
  }

  /**
   * Get health status of configuration manager
   */
  getHealthStatus() {
    return {
      status: this.state.isReady ? 'healthy' : 'unhealthy',
      isReady: this.state.isReady,
      lastValidation: this.state.lastValidation,
      errors: this.state.errors,
      warnings: this.state.warnings,
      modules: {
        total: this.configs.size,
        loaded: Array.from(this.configs.keys())
      }
    };
  }

  /**
   * Reset configuration manager (for testing)
   */
  async reset() {
    // Close watchers
    for (const [name, watcher] of this.watchers) {
      await watcher.close();
    }

    // Clear all data
    this.configs.clear();
    this.validators.clear();
    this.watchers.clear();
    this.encryptedFields.clear();
    
    this.initialized = false;
    this.state = {
      isReady: false,
      lastValidation: null,
      errors: [],
      warnings: [],
      environment: process.env.NODE_ENV || 'development'
    };

    YachiLogger.info('Configuration manager reset');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    YachiLogger.info('Shutting down configuration manager...');
    
    // Close watchers
    for (const [name, watcher] of this.watchers) {
      await watcher.close();
    }
    
    // Backup current configuration
    try {
      const currentConfig = this.getAll();
      await storageManager.secureSet('config_shutdown_backup', currentConfig);
    } catch (error) {
      YachiLogger.error('Final configuration backup failed:', error);
    }
    
    this.initialized = false;
    this.state.isReady = false;
    
    YachiLogger.info('Configuration manager shutdown completed');
  }
}

// Create singleton instance
const configManager = new ConfigManager();

// Export configuration manager and utilities
module.exports = {
  // Configuration manager instance
  configManager,
  
  // Quick access methods
  get: (path, defaultValue) => configManager.get(path, defaultValue),
  set: (path, value, options) => configManager.set(path, value, options),
  getAll: () => configManager.getAll(),
  getSummary: () => configManager.getSummary(),
  getHealthStatus: () => configManager.getHealthStatus(),
  reload: (moduleName) => configManager.reloadConfiguration(moduleName),
  validate: (moduleName) => configManager.validateConfiguration(moduleName),
  
  // Environment helpers
  isProduction: () => configManager.state.environment === 'production',
  isDevelopment: () => configManager.state.environment === 'development',
  isStaging: () => configManager.state.environment === 'staging',
  
  // Lifecycle methods
  initialize: () => configManager.initialize(),
  shutdown: () => configManager.shutdown(),
  reset: () => configManager.reset()
};

// Auto-initialize in non-test environments
if (process.env.NODE_ENV !== 'test') {
  configManager.initialize().catch(console.error);
}