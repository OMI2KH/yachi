// backend/eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import nodePlugin from 'eslint-plugin-n';
import securityPlugin from 'eslint-plugin-security';
import promisePlugin from 'eslint-plugin-promise';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Global variables
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
      }
    }
  },
  
  // Node.js specific rules
  {
    files: ['**/*.js'],
    plugins: {
      n: nodePlugin,
      security: securityPlugin,
      promise: promisePlugin,
      import: importPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      // Node.js rules
      'n/handle-callback-err': ['error', '^(err|error)$'],
      'n/no-callback-literal': 'error',
      'n/no-deprecated-api': 'error',
      'n/no-exports-assign': 'error',
      'n/no-new-require': 'error',
      'n/no-path-concat': 'error',
      'n/no-process-exit': 'error',
      'n/no-unpublished-bin': 'error',
      'n/no-unpublished-import': 'error',
      'n/no-unpublished-require': 'error',
      'n/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
      'n/process-exit-as-throw': 'error',
      
      // Security rules for Ethiopian payment integration
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      
      // Promise rules
      'promise/always-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-native': 'off',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/avoid-new': 'off',
      'promise/no-new-statics': 'error',
      'promise/valid-params': 'error',
      
      // Import rules
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }],
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/export': 'error',
      'import/no-duplicates': 'error',
      
      // JSDoc rules for Ethiopian payment services
      'jsdoc/require-jsdoc': ['warn', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false
        },
        contexts: [
          'FunctionDeclaration',
          'MethodDefinition',
          'ClassDeclaration'
        ]
      }],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-returns-type': 'warn',
      'jsdoc/require-description': 'warn',
      
      // Ethiopian payment gateway specific rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'strict': ['error', 'global'],
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      'no-undef': 'error',
      'no-global-assign': 'error',
      'no-implicit-globals': 'error',
      'no-multi-str': 'error',
      'no-new-require': 'error',
      'no-path-concat': 'error',
      'no-process-exit': 'error',
      'no-process-env': 'off', // We need process.env for Ethiopian payment API keys
      
      // Code quality rules
      'complexity': ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines': ['warn', 300],
      'max-lines-per-function': ['warn', 50],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['warn', 4],
      'max-statements': ['warn', 15],
      'require-atomic-updates': 'error',
      
      // Ethiopian currency handling rules
      'no-magic-numbers': ['warn', {
        'ignore': [0, 1, 100, 1000], // Common Ethiopian currency denominations
        'ignoreArrayIndexes': true,
        'enforceConst': true
      }],
      
      // Error handling rules for payment transactions
      'consistent-return': 'error',
      'no-else-return': 'warn',
      'no-useless-return': 'error',
      'require-await': 'error',
      'no-return-await': 'error',
      
      // Payment security rules
      'no-buffer-constructor': 'error',
      'no-sync': ['error', { allowAtRootLevel: false }],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    }
  },
  
  // Test files configuration
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.mocha
      }
    },
    rules: {
      'no-console': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off'
    }
  },
  
  // Configuration files
  {
    files: ['**/*.config.js', '**/config/**/*.js'],
    rules: {
      'no-process-env': 'off',
      'security/detect-non-literal-require': 'off',
      'no-console': 'off'
    }
  },
  
  // Ethiopian payment service files
  {
    files: [
      '**/services/payment/**/*.js',
      '**/controllers/payment/**/*.js',
      '**/routes/payment/**/*.js'
    ],
    rules: {
      'jsdoc/require-jsdoc': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'complexity': ['error', 8], // Stricter for payment logic
      'max-lines-per-function': ['error', 40],
      'max-statements': ['error', 12],
      'security/detect-object-injection': 'error',
      'security/detect-possible-timing-attacks': 'error',
      
      // Ethiopian currency validation
      'no-magic-numbers': ['error', {
        'ignore': [0, 1, 100], // ETB denominations
        'ignoreDefaultValues': true,
        'detectObjects': false
      }]
    }
  },
  
  // Database models
  {
    files: ['**/models/**/*.js'],
    rules: {
      'jsdoc/require-jsdoc': 'warn',
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^Sequelize$|^DataTypes$'
      }]
    }
  },
  
  // Migration files
  {
    files: ['**/migrations/**/*.js'],
    rules: {
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^queryInterface$|^Sequelize$'
      }],
      'max-lines-per-function': 'off',
      'max-statements': 'off'
    }
  },
  
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.nyc_output/**',
      '.vscode/**',
      '.github/**',
      'logs/**',
      '*.log',
      '*.pid',
      '.DS_Store',
      '*.min.js',
      '**/public/**',
      '**/static/**',
      '**/uploads/**',
      '**/temp/**',
      '**/*.config.js', // Config files have different rules
      '**/seeders/**', // Seed files
      '**/database/seeders/**'
    ]
  },
  
  // Environment-specific overrides
  {
    files: ['**/*.js'],
    rules: {
      'no-process-env': process.env.NODE_ENV === 'production' ? 'error' : 'off'
    }
  }
];