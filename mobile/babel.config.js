/**
 * Enterprise Babel Configuration for Yachi Platform
 * Advanced transpilation setup for Ethiopian service marketplace
 * Version: 2.0.0
 */

const path = require('path');

module.exports = function(api) {
  // Cache the configuration based on environment
  api.cache.using(() => process.env.NODE_ENV);
  
  // Environment detection
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Platform detection
  const isWeb = process.env.PLATFORM === 'web';
  const isIOS = process.env.PLATFORM === 'ios';
  const isAndroid = process.env.PLATFORM === 'android';

  return {
    // ===== PRESET CONFIGURATION =====
    presets: [
      // Expo preset with platform-specific optimizations
      [
        'babel-preset-expo',
        {
          // Web-specific optimizations
          web: {
            disableImportExportTransform: true,
            useTransformReactJSXExperimental: true,
          },
          // Native-specific optimizations
          native: {
            disableImportExportTransform: false,
            useTransformReactJSXExperimental: false,
          },
          // TypeScript support
          typescript: {
            isTSX: true,
            allExtensions: true,
          },
          // React optimization
          react: {
            runtime: 'automatic',
            development: isDevelopment,
            useSpread: true,
          },
        },
      ],
      
      // Environment-specific optimizations
      [
        '@babel/preset-env',
        {
          // Target specific environments for better optimization
          targets: {
            // Mobile app targets
            ios: '13.0',
            android: '10.0',
            // Web targets
            browsers: isWeb ? [
              'last 2 versions',
              'not dead',
              'not ie <= 11'
            ] : [],
          },
          // Only include necessary polyfills
          useBuiltIns: 'usage',
          corejs: {
            version: '3.27',
            proposals: true,
          },
          // Module transformation based on environment
          modules: isTest ? 'commonjs' : false,
          // Debug information in development
          debug: isDevelopment,
          // Exclude transforms that make debugging harder
          exclude: isDevelopment ? [
            'transform-typeof-symbol',
            'transform-regenerator'
          ] : [],
        },
      ],
    ],

    // ===== PLUGIN CONFIGURATION =====
    plugins: [
      // ===== REACT & JSX TRANSFORMATIONS =====
      
      // New JSX transform (automatic runtime)
      [
        '@babel/plugin-transform-react-jsx',
        {
          runtime: 'automatic',
          development: isDevelopment,
          useSpread: true,
          useBuiltIns: true,
        },
      ],
      
      // React refresh for development
      isDevelopment && [
        'react-refresh/babel',
        {
          skipEnvCheck: true,
        },
      ],
      
      // React Native specific optimizations
      !isWeb && [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: true,
          allowUndefined: false,
          verbose: false,
        },
      ],

      // ===== PERFORMANCE OPTIMIZATIONS =====
      
      // Replaces lodash imports with specific function imports
      [
        'babel-plugin-lodash',
        {
          id: ['lodash', 'recompose'],
        },
      ],
      
      // Transform inline environment variables
      [
        'transform-inline-environment-variables',
        {
          include: [
            'NODE_ENV',
            'APP_ENV',
            'EXPO_PUBLIC_*',
            'PLATFORM'
          ],
        },
      ],
      
      // Optional: Emotion CSS-in-JS optimization
      isProduction && [
        '@emotion/babel-plugin',
        {
          sourceMap: isDevelopment,
          autoLabel: 'dev-only',
          labelFormat: '[local]',
          cssPropOptimization: true,
        },
      ],

      // ===== SYNTAX & LANGUAGE FEATURES =====
      
      // TypeScript decorators support
      [
        '@babel/plugin-proposal-decorators',
        {
          legacy: true,
        },
      ],
      
      // Class properties transformation
      [
        '@babel/plugin-proposal-class-properties',
        {
          loose: true,
        },
      ],
      
      // Private methods support
      [
        '@babel/plugin-proposal-private-methods',
        {
          loose: true,
        },
      ],
      
      // Private property in object support
      [
        '@babel/plugin-proposal-private-property-in-object',
        {
          loose: true,
        },
      ],
      
      // Optional chaining and nullish coalescing
      [
        '@babel/plugin-proposal-optional-chaining',
        {
          loose: true,
        },
      ],
      [
        '@babel/plugin-proposal-nullish-coalescing-operator',
        {
          loose: true,
        },
      ],
      
      // Logical assignment operators
      [
        '@babel/plugin-proposal-logical-assignment-operators',
        {
          loose: true,
        },
      ],

      // ===== MODULE & IMPORT OPTIMIZATIONS =====
      
      // Module resolver for absolute imports
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: [
            '.ios.js',
            '.android.js',
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.json',
          ],
          alias: {
            // Core application aliases
            '@app': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@contexts': './src/contexts',
            '@config': './src/config',
            '@constants': './src/constants',
            '@types': './src/types',
            '@styles': './src/styles',
            '@assets': './assets',
            '@plugins': './plugins',
            
            // Platform-specific aliases
            ...(isWeb && {
              '@native': './src/platform/web',
            }),
            ...((isIOS || isAndroid) && {
              '@native': './src/platform/native',
            }),
          },
          // Custom resolver for better module resolution
          resolvePath: (sourcePath, currentFile, opts) => {
            // Custom resolution logic for platform-specific files
            if (sourcePath.startsWith('./') || sourcePath.startsWith('../')) {
              return null; // Use default resolution for relative paths
            }
            
            // Handle platform-specific file extensions
            const platformExt = isIOS ? '.ios' : isAndroid ? '.android' : '';
            const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
            
            for (const ext of extensions) {
              const platformFile = `${sourcePath}${platformExt}${ext}`;
              const normalFile = `${sourcePath}${ext}`;
              
              // Try to resolve platform-specific file first
              try {
                const resolved = require.resolve(platformFile, {
                  paths: [path.dirname(currentFile)],
                });
                if (resolved) return resolved;
              } catch (e) {}
              
              // Fall back to normal file
              try {
                const resolved = require.resolve(normalFile, {
                  paths: [path.dirname(currentFile)],
                });
                if (resolved) return resolved;
              } catch (e) {}
            }
            
            return null;
          },
        },
      ],
      
      // Import optimization for production
      isProduction && [
        'babel-plugin-transform-imports',
        {
          // Optimize lodash imports
          lodash: {
            transform: 'lodash/${member}',
            preventFullImport: true,
          },
          // Optimize react-native imports
          'react-native': {
            transform: 'react-native/${member}',
            preventFullImport: true,
          },
          // Optimize @expo/vector-icons imports
          '@expo/vector-icons': {
            transform: '@expo/vector-icons/${member}',
            preventFullImport: true,
          },
        },
      ],

      // ===== DEVELOPMENT & DEBUGGING TOOLS =====
      
      // Better debugging experience
      isDevelopment && [
        '@babel/plugin-transform-react-jsx-source',
        {
          development: true,
        },
      ],
      
      // Display names for React components
      isDevelopment && [
        '@babel/plugin-transform-react-display-name',
        {
          development: true,
        },
      ],
      
      // Reactotron integration for debugging
      isDevelopment && process.env.REACTOTRON_ENABLED === 'true' && [
        'reactotron-react-js',
        {
          host: process.env.REACTOTRON_HOST || 'localhost',
          port: process.env.REACTOTRON_PORT || 9090,
        },
      ],

      // ===== TESTING SUPPORT =====
      
      // Support for Jest testing
      isTest && [
        'babel-plugin-dynamic-import-node',
        {
          noInterop: true,
        },
      ],
      
      // Support for testing utilities
      isTest && [
        'babel-plugin-istanbul',
        {
          useInlineSourceMaps: false,
        },
      ],

      // ===== ADVANCED OPTIMIZATIONS =====
      
      // Constant folding for better performance
      isProduction && [
        '@babel/plugin-transform-inline-constants',
        {
          reduceVars: true,
        },
      ],
      
      // Member expression literals
      isProduction && [
        '@babel/plugin-transform-member-expression-literals',
      ],
      
      // Property literals
      isProduction && [
        '@babel/plugin-transform-property-literals',
      ],
      
      // Merge sibling variables
      isProduction && [
        '@babel/plugin-transform-merge-sibling-variables',
      ],

      // ===== SECURITY & SANITIZATION =====
      
      // Remove console logs in production (optional)
      isProduction && process.env.EXPO_PUBLIC_REMOVE_CONSOLE === 'true' && [
        'transform-remove-console',
        {
          exclude: ['error', 'warn'],
        },
      ],
      
      // Minification for production
      isProduction && [
        'babel-plugin-minify-dead-code-elimination',
        {
          keepFnName: true,
          keepClassName: true,
          optimizeRawSize: true,
        },
      ],

    ].filter(Boolean), // Remove false values from array

    // ===== ENVIRONMENT SPECIFIC OVERRIDES =====
    env: {
      // Development environment
      development: {
        plugins: [
          // Development-specific plugins
          'babel-plugin-styled-components',
          '@babel/plugin-transform-react-jsx-development',
        ],
        presets: [
          // Development-specific presets
        ],
        sourceMaps: 'inline',
        retainLines: true,
      },
      
      // Production environment
      production: {
        plugins: [
          // Production-specific plugins
          [
            'babel-plugin-transform-react-remove-prop-types',
            {
              mode: 'remove',
              removeImport: true,
              additionalLibraries: [
                'react-native-proptypes',
              ],
            },
          ],
        ],
        presets: [
          // Production-specific presets
        ],
        sourceMaps: 'hidden',
        compact: true,
        comments: false,
      },
      
      // Test environment
      test: {
        plugins: [
          // Test-specific plugins
          '@babel/plugin-transform-modules-commonjs',
          'babel-plugin-dynamic-import-node',
        ],
        presets: [
          // Test-specific presets
          [
            '@babel/preset-env',
            {
              targets: {
                node: 'current',
              },
            },
          ],
        ],
        sourceMaps: 'both',
      },
    },

    // ===== SOURCE MAP CONFIGURATION =====
    sourceMaps: isDevelopment ? 'inline' : isProduction ? 'hidden' : false,
    
    // ===== ADDITIONAL BABEL CONFIGURATION =====
    
    // Input source code parsing options
    parserOpts: {
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true,
      createImportExpressions: true,
      createParenthesizedExpressions: true,
      errorRecovery: true,
      plugins: [
        'asyncGenerators',
        'bigInt',
        'classPrivateMethods',
        'classPrivateProperties',
        'classProperties',
        'classStaticBlock',
        'decimal',
        'decorators-legacy',
        'doExpressions',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'functionBind',
        'functionSent',
        'importAssertions',
        'jsx',
        'logicalAssignment',
        'moduleStringNames',
        'nullishCoalescingOperator',
        'numericSeparator',
        'objectRestSpread',
        'optionalCatchBinding',
        'optionalChaining',
        'partialApplication',
        'privateIn',
        'throwExpressions',
        'topLevelAwait',
        'v8intrinsic',
      ],
    },
    
    // Generator options
    generatorOpts: {
      decoratorsBeforeExport: true,
      jsescOption: {
        minimal: true,
      },
      retainLines: isDevelopment,
      compact: isProduction,
      comments: !isProduction,
    },
    
    // Should the output be minified
    minified: isProduction,
    
    // Include AST in the output
    ast: isDevelopment,
    
    // Highlight code in error messages
    highlightCode: true,
    
    // Source type
    sourceType: 'unambiguous',
  };
};

// ===== CUSTOM BABEL UTILITIES =====

/**
 * Custom babel plugin for Yachi-specific transformations
 */
const yachiBabelPlugin = () => {
  return {
    name: 'yachi-custom-transforms',
    visitor: {
      // Custom visitor logic can be added here
      ImportDeclaration(path) {
        // Example: Transform specific import patterns
        const source = path.node.source.value;
        
        // Optimize imports for Ethiopian-specific modules
        if (source.includes('ethiopian')) {
          // Custom transformation logic
        }
      },
      
      // Add custom JSX transformations if needed
      JSXElement(path) {
        // Custom JSX optimization logic
      },
    },
  };
};

/**
 * Environment variable helper for babel
 */
const getBabelEnvVars = () => {
  return {
    IS_WEB: process.env.PLATFORM === 'web',
    IS_NATIVE: ['ios', 'android'].includes(process.env.PLATFORM),
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    IS_TEST: process.env.NODE_ENV === 'test',
  };
};

module.exports.getBabelEnvVars = getBabelEnvVars;
module.exports.yachiBabelPlugin = yachiBabelPlugin;