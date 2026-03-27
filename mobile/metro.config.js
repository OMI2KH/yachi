/**
 * Enterprise Metro Configuration for Yachi Platform
 * Advanced bundler configuration for Ethiopian service marketplace
 * Version: 2.0.0
 */

const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

// ===== ENVIRONMENT CONFIGURATION =====
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const isCI = process.env.CI === 'true';
const isEASBuild = process.env.EAS_BUILD === 'true';

// Platform detection
const platform = process.env.PLATFORM || 'all';

// ===== PROJECT PATHS =====
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// ===== CUSTOM RESOLVERS =====
const createModuleResolver = (config) => {
  const originalResolveRequest = config.resolver.resolveRequest;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Custom resolution for Ethiopian-specific modules
    if (moduleName.startsWith('ethiopian-')) {
      const customPath = path.resolve(projectRoot, 'src/utils/ethiopian', moduleName);
      if (fs.existsSync(customPath)) {
        return {
          filePath: customPath,
          type: 'sourceFile',
        };
      }
    }

    // Platform-specific resolution
    if (platform) {
      const platformModule = `${moduleName}.${platform}`;
      try {
        const resolved = originalResolveRequest(context, platformModule, platform);
        if (resolved) return resolved;
      } catch (error) {
        // Fall through to default resolution
      }
    }

    // Default resolution
    return originalResolveRequest(context, moduleName, platform);
  };

  return config;
};

// ===== CUSTOM TRANSFORMERS =====
const createCustomTransformers = () => {
  return {
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
    // Custom transformers can be added here
  };
};

// ===== ASSET CONFIGURATION =====
const configureAssets = (config) => {
  config.resolver.assetExts = [
    // Default asset extensions
    ...config.resolver.assetExts.filter(ext => ext !== 'svg'),
    
    // Custom asset extensions
    'obj',
    'mtl',
    'JPG',
    'vrx',
    'hdr',
    'gltf',
    'glb',
    'bin',
    'arobject',
    'gif',
    
    // Document types
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    
    // Ethiopian specific assets
    'amh',
    'orm',
    'tir',
  ];

  config.resolver.sourceExts = [
    // Platform-specific extensions
    `${platform}.js`,
    `${platform}.jsx`,
    `${platform}.ts`,
    `${platform}.tsx`,
    
    // Default extensions
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    
    // Ethiopian language files
    'amh.js',
    'amh.ts',
    'orm.js',
    'orm.ts',
    
    // Styling files
    'css',
    'scss',
    'sass',
    'less',
    
    // SVG as source for transformation
    'svg',
  ];

  return config;
};

// ===== CACHE CONFIGURATION =====
const configureCache = (config) => {
  if (isProduction || isEASBuild) {
    // Production cache configuration
    config.cacheStores = [
      new FileStore({
        root: path.join(projectRoot, 'node_modules', '.cache', 'metro'),
      }),
    ];
    
    config.cacheVersion = `${process.env.APP_VERSION}-${platform}`;
  } else {
    // Development cache configuration
    config.cacheStores = [
      new FileStore({
        root: path.join(projectRoot, 'node_modules', '.cache', 'metro-dev'),
      }),
    ];
  }

  // Cache configuration
  config.maxWorkers = isCI ? 2 : Math.max(1, require('os').cpus().length - 1);
  config.resetCache = process.env.RESET_CACHE === 'true';

  return config;
};

// ===== BUNDLER OPTIMIZATIONS =====
const configureBundler = (config) => {
  // Bundle configuration
  config.transformer.minifierPath = require.resolve('metro-minify-terser');
  config.transformer.minifierConfig = {
    // Terser configuration
    compress: {
      // Production optimizations
      drop_console: isProduction && process.env.EXPO_PUBLIC_REMOVE_CONSOLE === 'true',
      drop_debugger: isProduction,
      pure_funcs: isProduction ? ['console.debug', 'console.log'] : [],
      sequences: true,
      conditionals: true,
      booleans: true,
      if_return: true,
      join_vars: true,
      reduce_vars: true,
      warnings: false,
    },
    mangle: {
      toplevel: isProduction,
      keep_classnames: !isProduction,
      keep_fnames: !isProduction,
    },
    output: {
      comments: !isProduction,
      beautify: !isProduction,
    },
  };

  // Transformer configuration
  config.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');
  config.transformer.optimization = {
    // Enable Hermes optimizations
    hermes: true,
    // Enable inline requires for better performance
    inlineRequires: isProduction,
  };

  // Server configuration
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Custom middleware for Ethiopian market specific assets
        if (req.url.includes('/assets/ethiopian/')) {
          // Custom handling for Ethiopian assets
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        
        // Custom API proxy for development
        if (req.url.startsWith('/api/')) {
          // Proxy API requests in development
          if (isDevelopment) {
            // Development API proxy logic
          }
        }

        return middleware(req, res, next);
      };
    },
    port: process.env.METRO_PORT || 8081,
    rewriteRequestUrl: (url) => {
      // URL rewriting for deep linking
      if (!url.endsWith('.bundle') && !url.includes('/_expo/')) {
            return `${url}.bundle`;
          }
          return url;
        },
  };

  return config;
};

// ===== WATCHER CONFIGURATION =====
const configureWatcher = (config) => {
  if (isDevelopment) {
    config.watcher = {
      ...config.watcher,
      // Enhanced file watching
      additionalExts: [
        'css',
        'scss',
        'sass',
        'less',
        'amh',
        'orm',
        'svg',
      ],
      watchFolders: [
        projectRoot,
        path.join(projectRoot, 'src'),
        path.join(projectRoot, 'assets'),
        path.join(projectRoot, 'node_modules'),
      ],
      // Use polling in certain environments
      usePolling: process.env.USE_POLLING === 'true',
      interval: 100,
    };
  }

  return config;
};

// ===== SOURCE MAPS CONFIGURATION =====
const configureSourceMaps = (config) => {
  config.transformer.minifyConfig = {
    ...config.transformer.minifyConfig,
    sourceMap: isDevelopment
      ? {
          includeSources: true,
          root: projectRoot,
        }
      : false,
  };

  // Source map configuration
  config.serializer = {
    ...config.serializer,
    createModuleIdFactory: () => {
      // Custom module ID factory for better debugging
      let nextId = 0;
      const moduleIds = new Map();

      return (path) => {
        let id = moduleIds.get(path);
        if (typeof id !== 'number') {
          id = nextId++;
          moduleIds.set(path, id);
        }
        return id;
      };
    },
    getRunModuleStatement: (moduleId) => {
      // Custom run module statement
      return `__r(${moduleId});`;
    },
    // Enable Hermes source maps
    hermesBundle: true,
    // Source map URL configuration
    getSourceMapUrl: (modules, options) => {
      // Custom source map URL generation
      return `${options.dev ? 'http://localhost:8081' : ''}/index.map?platform=${options.platform}&dev=${options.dev}&minify=${options.minify}`;
    },
  };

  return config;
};

// ===== REPORTER CONFIGURATION =====
const configureReporter = (config) => {
  if (isDevelopment) {
    config.reporter = {
      update: (event) => {
        // Custom build reporting
        if (event.type === 'initialize_started') {
          console.log('🚀 Yachi Metro Bundler Initializing...');
        }
        
        if (event.type === 'initialize_done') {
          console.log('✅ Yachi Metro Bundler Ready!');
        }
        
        if (event.type === 'bundle_build_done') {
          const { buildID, bundleDetails } = event;
          console.log(`📦 Bundle Built: ${bundleDetails?.platform || 'unknown'} | ${bundleDetails?.dev ? 'development' : 'production'}`);
        }
        
        // Ethiopian market specific logging
        if (event.type === 'client_log') {
          const { level, data } = event;
          if (data?.some(item => typeof item === 'string' && item.includes('ethiopian'))) {
            console.log('🌍 Ethiopian Module:', data);
          }
        }
      },
    };
  }

  return config;
};

// ===== SECURITY CONFIGURATION =====
const configureSecurity = (config) => {
  // Module blacklist for security
  config.resolver.blacklistRE = /(.*\/__fixtures__\/.*|node_modules[\/\\]react[\/\\]dist[\/\\].*|website\\node_modules\\.*|heapCapture\\bundle\.js|.*\\__tests__\\.*)$/;

  // Block certain modules in production
  if (isProduction) {
    const blockedModules = [
      /react-native\/Libraries\/Utilities\/HMRClient\.js$/,
      /@storybook\/.*/,
      /\.story\.(js|jsx|ts|tsx)$/,
    ];
    
    config.resolver.blockList = [
      ...(config.resolver.blockList || []),
      ...blockedModules,
    ];
  }

  return config;
};

// ===== MAIN CONFIGURATION FUNCTION =====
module.exports = (() => {
  // Get default Expo configuration
  const config = getDefaultConfig(projectRoot);

  // Apply all configurations
  config = createModuleResolver(config);
  config = configureAssets(config);
  config = configureCache(config);
  config = configureBundler(config);
  config = configureWatcher(config);
  config = configureSourceMaps(config);
  config = configureReporter(config);
  config = configureSecurity(config);

  // Custom transformer configuration
  config.transformer = {
    ...config.transformer,
    ...createCustomTransformers(),
    // Enable inline requires for better performance
    inlineRequires: isProduction,
    // Enable Babel runtime transform
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  };

  // Resolver configuration
  config.resolver = {
    ...config.resolver,
    // Resolve modules from project root and workspace
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Extra node modules
    extraNodeModules: {
      // Alias mappings for absolute imports
      '@app': path.resolve(projectRoot, 'src'),
      '@components': path.resolve(projectRoot, 'src/components'),
      '@screens': path.resolve(projectRoot, 'src/screens'),
      '@navigation': path.resolve(projectRoot, 'src/navigation'),
      '@services': path.resolve(projectRoot, 'src/services'),
      '@utils': path.resolve(projectRoot, 'src/utils'),
      '@hooks': path.resolve(projectRoot, 'src/hooks'),
      '@contexts': path.resolve(projectRoot, 'src/contexts'),
      '@config': path.resolve(projectRoot, 'src/config'),
      '@constants': path.resolve(projectRoot, 'src/constants'),
      '@types': path.resolve(projectRoot, 'src/types'),
      '@styles': path.resolve(projectRoot, 'src/styles'),
      '@assets': path.resolve(projectRoot, 'assets'),
      '@plugins': path.resolve(projectRoot, 'plugins'),
    },
    // Resolver main fields
    resolverMainFields: [
      'react-native',
      'browser',
      'main',
    ],
    // Disable symlinks for better performance
    disableHierarchicalLookup: false,
    // Use realpath for symlinks
    useWatchman: !process.env.CI,
  };

  // Serializer configuration
  config.serializer = {
    ...config.serializer,
    // Experimental features
    experimentalSerializerHook: (graph, options) => {
      // Custom serialization logic
      if (isDevelopment) {
        console.log(`📊 Bundle Stats: ${graph.entryPoints.size} entry points, ${graph.dependencies.size} modules`);
      }
      return graph;
    },
  };

  // Server configuration
  config.server = {
    ...config.server,
    port: process.env.METRO_PORT || 8081,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Custom middleware for Yachi platform
        if (req.url.includes('/ethiopian-assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
        return middleware(req, res, next);
      };
    },
  };

  // Maximum workers configuration
  config.maxWorkers = isCI ? 2 : Math.max(1, require('os').cpus().length - 1);

  // Reset cache flag
  config.resetCache = process.env.RESET_METRO_CACHE === 'true';

  return config;
})();

// ===== UTILITY FUNCTIONS =====

/**
 * Get platform-specific configuration
 */
module.exports.getPlatformConfig = (platform) => {
  const baseConfig = getDefaultConfig(projectRoot);
  
  switch (platform) {
    case 'ios':
      return {
        ...baseConfig,
        resolver: {
          ...baseConfig.resolver,
          sourceExts: ['ios.js', 'ios.jsx', 'ios.ts', 'ios.tsx', ...baseConfig.resolver.sourceExts],
        },
      };
    case 'android':
      return {
        ...baseConfig,
        resolver: {
          ...baseConfig.resolver,
          sourceExts: ['android.js', 'android.jsx', 'android.ts', 'android.tsx', ...baseConfig.resolver.sourceExts],
        },
      };
    case 'web':
      return {
        ...baseConfig,
        resolver: {
          ...baseConfig.resolver,
          sourceExts: ['web.js', 'web.jsx', 'web.ts', 'web.tsx', ...baseConfig.resolver.sourceExts],
        },
      };
    default:
      return baseConfig;
  }
};

/**
 * Clear Metro cache utility
 */
module.exports.clearCache = () => {
  const cacheDir = path.join(projectRoot, 'node_modules', '.cache', 'metro');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Metro cache cleared');
  }
};

/**
 * Get bundle analysis configuration
 */
module.exports.getBundleAnalysisConfig = () => {
  return {
    ...module.exports,
    serializer: {
      ...module.exports.serializer,
      createModuleIdFactory: () => {
        // Module ID factory for bundle analysis
        const modulePaths = new Map();
        return (filePath) => {
          const relativePath = path.relative(projectRoot, filePath);
          if (!modulePaths.has(relativePath)) {
            modulePaths.set(relativePath, modulePaths.size);
          }
          return modulePaths.get(relativePath);
        };
      },
    },
  };
};

// ===== ENVIRONMENT VARIABLES =====
module.exports.ENV = {
  IS_PRODUCTION: isProduction,
  IS_DEVELOPMENT: isDevelopment,
  IS_TEST: isTest,
  IS_CI: isCI,
  IS_EAS_BUILD: isEASBuild,
  PLATFORM: platform,
  PROJECT_ROOT: projectRoot,
};

console.log(`🚀 Yachi Metro Config: ${isProduction ? 'production' : 'development'} | Platform: ${platform}`);