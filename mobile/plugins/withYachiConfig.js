// plugins/withYachiConfig.js

/**
 * 🏢 ENTERPRISE EXPO CONFIG PLUGIN
 * Advanced Configuration for Yachi Platform with Ethiopian Market Optimization
 * 
 * Features Configured:
 * ✅ Multi-Environment Support (Development, Staging, Production)
 * ✅ Ethiopian Market Specific Configurations
 * ✅ AI & Construction Feature Flags
 * ✅ Advanced Security & Biometric Setup
 * ✅ Ethiopian Payment Gateway Integration
 * ✅ Multi-Language & RTL Support
 * ✅ Construction Project Management Features
 * ✅ Government Portal Configuration
 * ✅ Premium Feature Enablement
 * ✅ Enterprise Analytics & Monitoring
 */

const { withPlugins, withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');
const pkg = require('../package.json');

/**
 * 🎯 ENTERPRISE YACHI CONFIGURATION PLUGIN
 */
const withYachiConfig = (config, props = {}) => {
  // Extract environment and feature flags
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
  const isProduction = environment === 'production';
  const isStaging = environment === 'staging';
  
  // Enhanced Yachi configuration with enterprise features
  const yachiConfig = {
    // Core App Identity
    name: props.appName || getAppName(environment),
    slug: props.appSlug || 'yachi-enterprise-platform',
    version: pkg.version || '2.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'yachi',
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },

    // Enhanced Splash Screen with Ethiopian Theme
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: getSplashBackground(environment),
      imageWidth: 240,
      imageHeight: 240,
    },

    // Asset Configuration
    assetBundlePatterns: [
      '**/*'
    ],

    // iOS Enterprise Configuration
    ios: {
      ...config.ios,
      bundleIdentifier: getBundleIdentifier(props.appIdentifier, environment),
      buildNumber: props.buildNumber || getBuildNumber(),
      supportsTablet: true,
      requireFullScreen: false,
      associatedDomains: getAssociatedDomains(environment),
      infoPlist: {
        ...config.ios?.infoPlist,
        // Enhanced Privacy Descriptions
        NSCameraUsageDescription: 'Yachi needs camera access to capture service photos, verify identity documents, and document construction progress.',
        NSPhotoLibraryUsageDescription: 'Yachi needs photo library access to upload service portfolio, project documentation, and verification materials.',
        NSLocationWhenInUseUsageDescription: 'Yachi needs location access to show nearby services, optimize worker assignments, and provide regional pricing.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Yachi needs location access for real-time service tracking, construction site monitoring, and emergency response.',
        NSFaceIDUsageDescription: 'Yachi uses Face ID for secure authentication, government access, and premium feature protection.',
        NSMicrophoneUsageDescription: 'Yachi needs microphone access for voice messages, AI assistance, and construction site communication.',
        NSContactsUsageDescription: 'Yachi needs contacts access to connect with team members and service providers.',
        
        // Enterprise Features
        UIBackgroundModes: [
          'remote-notification',
          'location',
          'audio',
          'voip'
        ],
        ITSAppUsesNonExemptEncryption: false,
        
        // AI & Advanced Features
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: getExceptionDomains(environment),
        },
        
        // Ethiopian Market Specific
        CFBundleDevelopmentRegion: 'en',
        CFBundleLocalizations: ['en', 'am', 'om'],
      },
      config: {
        usesNonExemptEncryption: false,
      },
      entitlements: {
        'com.apple.developer.associated-domains': getAssociatedDomains(environment),
      },
    },

    // Android Enterprise Configuration
    android: {
      ...config.android,
      package: getPackageIdentifier(props.appIdentifier, environment),
      versionCode: getVersionCode(),
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundImage: './assets/images/adaptive-background.png',
        backgroundColor: getPrimaryColor(environment),
        monochromeImage: './assets/images/monochrome-icon.png',
      },
      permissions: getAndroidPermissions(),
      intentFilters: getIntentFilters(),
      softwareKeyboardLayoutMode: 'resize',
      allowBackup: true,
      usesCleartextTraffic: false,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    // Web PWA Configuration
    web: {
      ...config.web,
      favicon: './assets/images/favicon.png',
      name: 'Yachi Enterprise Platform',
      shortName: 'Yachi',
      lang: 'en',
      scope: '/',
      themeColor: getPrimaryColor(environment),
      backgroundColor: '#FFFFFF',
      display: 'standalone',
      orientation: 'portrait',
      description: 'AI-Powered Service Marketplace for Ethiopian Market - Construction, Government Projects & Premium Services',
      categories: ['business', 'productivity', 'utilities'],
      shortcuts: getWebAppShortcuts(),
      preferRelatedApplications: false,
    },

    // Enhanced Plugins Configuration
    plugins: [
      ...(config.plugins || []),
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Yachi needs location access for real-time service tracking and construction site monitoring.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Yachi needs camera access for service verification and project documentation.',
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: getPrimaryColor(environment),
          sounds: ['./assets/sounds/notification.wav'],
        },
      ],
      [
        'expo-secure-store',
        {
          faceIDPermission: 'Yachi uses Face ID for secure authentication and government access.',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0',
            kotlinVersion: '1.9.0',
          },
          ios: {
            deploymentTarget: '15.1',
            useFrameworks: 'static',
          },
        },
      ],
    ],

    // Enterprise Extra Configuration
    extra: {
      ...config.extra,
      yachi: {
        // Core Configuration
        appName: props.appName || 'Yachi',
        appIdentifier: props.appIdentifier || 'com.yachi.enterprise',
        buildDate: new Date().toISOString(),
        environment: environment,
        version: pkg.version,
        
        // Ethiopian Market Configuration
        market: {
          country: 'ETH',
          currency: 'ETB',
          languages: ['en', 'am', 'om'],
          cities: [
            'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa',
            'Bahir Dar', 'Jimma', 'Adama', 'Arba Minch', 'Debre Markos'
          ],
          paymentProviders: ['chapa', 'telebirr', 'cbe-birr'],
          measurementSystem: 'metric',
          timezone: 'Africa/Addis_Ababa',
        },
        
        // Feature Flags
        features: {
          // AI Features
          aiConstruction: true,
          aiWorkerMatching: true,
          aiServiceRecommendations: true,
          aiRiskAssessment: true,
          
          // Construction Features
          constructionManagement: true,
          governmentProjects: true,
          teamFormation: true,
          projectTracking: true,
          
          // Government Features
          governmentPortal: true,
          complianceMonitoring: true,
          budgetManagement: true,
          infrastructureTracking: true,
          
          // Premium Features
          premiumBadge: true,
          featuredListing: true,
          advancedAnalytics: true,
          prioritySupport: true,
          
          // Ethiopian Specific Features
          ethiopianHolidays: true,
          regionalPricing: true,
          localVerification: true,
          multiLanguage: true,
        },
        
        // AI Configuration
        ai: {
          matchingAlgorithm: 'skill-location-rating',
          maxWorkersPerProject: 50,
          autoReplacement: true,
          confidenceThreshold: 0.7,
        },
        
        // Construction Configuration
        construction: {
          maxProjectSize: 10000, // square meters
          maxTeamSize: 50,
          projectTypes: ['new-building', 'finishing', 'renovation', 'government'],
          safetyRequirements: true,
        },
        
        // Government Configuration
        government: {
          securityLevels: ['standard', 'high', 'very_high', 'maximum'],
          approvalWorkflow: true,
          budgetTracking: true,
          complianceMonitoring: true,
        },
        
        // Premium Configuration
        premium: {
          badgePrice: 200, // ETB
          listingPrice: 399, // ETB
          benefits: {
            prioritySearch: true,
            featuredPlacement: true,
            verifiedBadge: true,
            enhancedVisibility: true,
          },
        },
        
        // Analytics Configuration
        analytics: {
          enabled: true,
          providers: ['mixpanel', 'sentry', 'firebase'],
          trackUserBehavior: true,
          performanceMonitoring: true,
        },
        
        // Security Configuration
        security: {
          encryptionLevel: 'high',
          biometricAuth: true,
          sessionTimeout: 3600, // seconds
          maxLoginAttempts: 5,
        },
        
        // API Configuration
        api: {
          baseUrl: getApiBaseUrl(environment),
          timeout: 30000,
          retryAttempts: 3,
          version: 'v2',
        },
        
        ...props,
      },
      eas: {
        projectId: props.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
    },

    // Update Configuration
    updates: {
      url: `https://u.expo.dev/${process.env.EXPO_PUBLIC_EAS_PROJECT_ID}`,
      fallbackToCacheTimeout: 0,
      enabled: true,
      checkAutomatically: 'ON_LOAD',
    },

    // Runtime Version Configuration
    runtimeVersion: {
      policy: 'appVersion',
    },
  };

  return withPlugins(config, [
    // Additional plugins for enhanced functionality
    withEnhancedAndroidManifest,
    withEnhancedInfoPlist,
    withEthiopianMarketConfig,
  ])(yachiConfig);
};

/**
 * 🛠️ ENHANCED ANDROID MANIFEST CONFIGURATION
 */
const withEnhancedAndroidManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Add Ethiopian market specific configurations
    androidManifest.$ = {
      ...androidManifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
      'xmlns:android': 'http://schemas.android.com/apk/res/android',
    };

    // Add application attributes
    if (!androidManifest.application) {
      androidManifest.application = [{}];
    }
    
    androidManifest.application[0].$ = {
      ...androidManifest.application[0].$,
      'android:name': '.MainApplication',
      'android:allowBackup': 'true',
      'android:dataExtractionRules': '@xml/data_extraction_rules',
      'android:fullBackupContent': '@xml/backup_rules',
      'android:usesCleartextTraffic': 'false',
      'android:networkSecurityConfig': '@xml/network_security_config',
      'tools:targetApi': '31',
    };

    // Add Ethiopian specific permissions
    const existingPermissions = androidManifest.application[0]['uses-permission'] || [];
    androidManifest.application[0]['uses-permission'] = [
      ...existingPermissions,
      // Enhanced permissions for Ethiopian market
      { $: { 'android:name': 'android.permission.ACCESS_BACKGROUND_LOCATION' } },
      { $: { 'android:name': 'android.permission.FOREGROUND_SERVICE' } },
      { $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_LOCATION' } },
      { $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' } },
      { $: { 'android:name': 'android.permission.USE_BIOMETRIC' } },
      { $: { 'android:name': 'android.permission.USE_FINGERPRINT' } },
    ];

    return config;
  });
};

/**
 * 🍎 ENHANCED IOS INFOPLIST CONFIGURATION
 */
const withEnhancedInfoPlist = (config) => {
  return withInfoPlist(config, (config) => {
    // Enhanced Info.plist for enterprise features
    config.modResults = {
      ...config.modResults,
      
      // Ethiopian Market Support
      CFBundleDevelopmentRegion: 'en',
      CFBundleLocalizations: ['en', 'am', 'om'],
      
      // AI & Machine Learning
      NSMLModelUsageDescription: 'Yachi uses machine learning for AI worker matching, construction risk assessment, and service recommendations.',
      
      // Background Processing
      BGTaskSchedulerPermittedIdentifiers: [
        'com.yachi.background-sync',
        'com.yachi.location-updates',
        'com.yachi.notification-processing',
      ],
      
      // Ethiopian Payment Gateway Support
      LSApplicationQueriesSchemes: [
        'telebirr',
        'chapa',
        'cbe-birr',
        'ethio-mobile',
      ],
      
      // Enhanced Security
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          'yachi.app': {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSIncludesSubdomains: true,
            NSRequiresCertificateTransparency: false,
          },
          'api.yachi.app': {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSIncludesSubdomains: true,
          },
        },
      },
    };

    return config;
  });
};

/**
 * 🇪🇹 ETHIOPIAN MARKET SPECIFIC CONFIGURATION
 */
const withEthiopianMarketConfig = (config) => {
  // Add Ethiopian market specific configurations
  config.extra = {
    ...config.extra,
    ethiopianConfig: {
      // Regional Settings
      regions: [
        {
          name: 'Addis Ababa',
          code: 'AA',
          coordinates: { lat: 9.03, lng: 38.74 },
          serviceAvailability: 'high',
        },
        {
          name: 'Dire Dawa',
          code: 'DD',
          coordinates: { lat: 9.6, lng: 41.87 },
          serviceAvailability: 'medium',
        },
        // ... more regions
      ],
      
      // Ethiopian Business Configuration
      businessHours: {
        start: '08:30',
        end: '17:30',
        timezone: 'Africa/Addis_Ababa',
      },
      
      // Ethiopian Holiday Configuration
      holidays: [
        { date: '01-07', name: 'Ethiopian Christmas', type: 'national' },
        { date: '01-19', name: 'Epiphany', type: 'national' },
        { date: '03-02', name: 'Victory of Adwa', type: 'national' },
        { date: '04-06', name: 'Ethiopian Patriots Victory Day', type: 'national' },
        { date: '05-01', name: 'International Workers Day', type: 'national' },
        { date: '05-05', name: 'Ethiopian Patriots Day', type: 'national' },
        { date: '05-28', name: 'Downfall of Derg', type: 'national' },
        { date: '09-11', name: 'Ethiopian New Year', type: 'national' },
        { date: '09-27', name: 'Finding of True Cross', type: 'national' },
      ],
      
      // Ethiopian Payment Configuration
      payments: {
        defaultCurrency: 'ETB',
        supportedCurrencies: ['ETB', 'USD'],
        exchangeRateProvider: 'national-bank',
        taxRate: 0.15, // 15% VAT
      },
      
      // Ethiopian Regulatory Compliance
      compliance: {
        businessLicenseRequired: true,
        taxIdentificationRequired: true,
        governmentApprovalRequired: ['construction', 'government-projects'],
        safetyStandards: 'ethiopian-building-code',
      },
    },
  };

  return config;
};

/**
 * 🎯 CONFIGURATION HELPER FUNCTIONS
 */

// Get environment-specific app name
const getAppName = (environment) => {
  const names = {
    development: 'Yachi Dev',
    staging: 'Yachi Staging',
    production: 'Yachi',
  };
  return names[environment] || 'Yachi';
};

// Get environment-specific bundle identifier
const getBundleIdentifier = (baseIdentifier, environment) => {
  const base = baseIdentifier || 'com.yachi.enterprise';
  const suffixes = {
    development: '.dev',
    staging: '.staging',
    production: '',
  };
  return base + (suffixes[environment] || '');
};

// Get environment-specific package identifier for Android
const getPackageIdentifier = (baseIdentifier, environment) => {
  return getBundleIdentifier(baseIdentifier, environment);
};

// Get dynamic build number based on environment
const getBuildNumber = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  return process.env.EXPO_PUBLIC_BUILD_NUMBER || timestamp.toString();
};

// Get version code for Android (increment for each release)
const getVersionCode = () => {
  const baseCode = 1000000; // Start with 1,000,000
  const timestamp = Math.floor(Date.now() / 1000) - 1700000000; // Relative to recent date
  return baseCode + timestamp;
};

// Get associated domains for iOS
const getAssociatedDomains = (environment) => {
  const domains = {
    development: [
      'applinks:dev.yachi.app',
      'applinks:api.dev.yachi.app',
    ],
    staging: [
      'applinks:staging.yachi.app',
      'applinks:api.staging.yachi.app',
    ],
    production: [
      'applinks:yachi.app',
      'applinks:www.yachi.app',
      'applinks:api.yachi.app',
    ],
  };
  return domains[environment] || domains.development;
};

// Get environment-specific API base URL
const getApiBaseUrl = (environment) => {
  const urls = {
    development: 'https://api.dev.yachi.app/v2',
    staging: 'https://api.staging.yachi.app/v2',
    production: 'https://api.yachi.app/v2',
  };
  return urls[environment] || urls.development;
};

// Get environment-specific primary color
const getPrimaryColor = (environment) => {
  const colors = {
    development: '#10B981', // Emerald
    staging: '#F59E0B', // Amber
    production: '#059669', // Dark Emerald
  };
  return colors[environment] || '#10B981';
};

// Get environment-specific splash background
const getSplashBackground = (environment) => {
  const backgrounds = {
    development: '#10B981',
    staging: '#F59E0B',
    production: '#059669',
  };
  return backgrounds[environment] || '#10B981';
};

// Get Android permissions based on features
const getAndroidPermissions = () => {
  return [
    'CAMERA',
    'READ_EXTERNAL_STORAGE',
    'WRITE_EXTERNAL_STORAGE',
    'ACCESS_FINE_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'ACCESS_BACKGROUND_LOCATION',
    'VIBRATE',
    'RECORD_AUDIO',
    'WAKE_LOCK',
    'FOREGROUND_SERVICE',
    'FOREGROUND_SERVICE_LOCATION',
    'POST_NOTIFICATIONS',
    'USE_BIOMETRIC',
    'USE_FINGERPRINT',
    'INTERNET',
    'ACCESS_NETWORK_STATE',
    'BLUETOOTH',
    'NFC',
  ];
};

// Get intent filters for deep linking
const getIntentFilters = () => {
  return [
    {
      action: 'VIEW',
      data: [
        {
          scheme: 'yachi',
          host: 'services',
          pathPrefix: '/',
        },
        {
          scheme: 'yachi',
          host: 'construction',
          pathPrefix: '/',
        },
        {
          scheme: 'yachi',
          host: 'government',
          pathPrefix: '/',
        },
        {
          scheme: 'yachi',
          host: 'bookings',
          pathPrefix: '/',
        },
      ],
      category: ['BROWSABLE', 'DEFAULT'],
    },
  ];
};

// Get exception domains for iOS ATS
const getExceptionDomains = (environment) => {
  const baseDomains = {
    'localhost': {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSIncludesSubdomains: true,
    },
  };

  const environmentDomains = {
    development: {
      'dev.yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
      'api.dev.yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
    },
    staging: {
      'staging.yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
      'api.staging.yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
    },
    production: {
      'yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
      'www.yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
      'api.yachi.app': {
        NSExceptionAllowsInsecureHTTPLoads: false,
        NSIncludesSubdomains: true,
      },
    },
  };

  return { ...baseDomains, ...environmentDomains[environment] };
};

// Get PWA shortcuts for web app
const getWebAppShortcuts = () => {
  return [
    {
      name: 'Find Services',
      short_name: 'Services',
      description: 'Discover skilled service providers',
      url: '/services',
      icons: [
        {
          src: '/assets/icons/service-shortcut.png',
          sizes: '96x96',
        },
      ],
    },
    {
      name: 'Construction Projects',
      short_name: 'Construction',
      description: 'Manage construction projects',
      url: '/construction',
      icons: [
        {
          src: '/assets/icons/construction-shortcut.png',
          sizes: '96x96',
        },
      ],
    },
    {
      name: 'Government Portal',
      short_name: 'Government',
      description: 'Access government projects',
      url: '/government',
      icons: [
        {
          src: '/assets/icons/government-shortcut.png',
          sizes: '96x96',
        },
      ],
    },
  ];
};

module.exports = withYachiConfig;
