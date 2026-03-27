/**
 * @file ESLint Configuration
 * @description Enterprise-level ESLint configuration for Yachi Ethiopia React Native project
 * @version 1.0.0
 * @module eslint.config
 */

const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const reactNative = require('eslint-plugin-react-native');
const jest = require('eslint-plugin-jest');
const testingLibrary = require('eslint-plugin-testing-library');
const reactRefresh = require('eslint-plugin-react-refresh');
const importPlugin = require('eslint-plugin-import');
const prettier = require('eslint-config-prettier');
const security = require('eslint-plugin-security');
const sonarjs = require('eslint-plugin-sonarjs');
const promise = require('eslint-plugin-promise');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  // Base JavaScript configuration
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...typescript.configs['recommended-requiring-type-checking'].rules,
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  // React configuration
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      
      // React specific rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/display-name': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unknown-property': 'error',
      'react/no-unsafe': 'warn',
      'react/require-render-return': 'error',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React Refresh for Fast Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // React Native configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-native': reactNative,
    },
    rules: {
      ...reactNative.configs.all.rules,
      
      // React Native specific rules
      'react-native/no-unused-styles': 'error',
      'react-native/split-platform-components': 'warn',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'warn',
      'react-native/no-raw-text': [
        'error',
        {
          skip: ['ThemedText', 'Button', 'Link'], // Custom components that handle text
        },
      ],
      'react-native/no-single-element-style-arrays': 'error',
    },
  },

  // Import/Export configuration
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      
      // Import/Export rules
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-relative-parent-imports': 'off',
      'import/export': 'error',
      'import/no-named-as-default': 'warn',
      'import/no-named-as-default-member': 'warn',
      'import/no-deprecated': 'warn',
      'import/no-mutable-exports': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'react-native',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@expo/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: './**',
              group: 'sibling',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/newline-after-import': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.native.js'],
        },
      },
    },
  },

  // Promise/Async configuration
  {
    plugins: {
      promise,
    },
    rules: {
      ...promise.configs.recommended.rules,
      
      // Promise specific rules
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
    },
  },

  // Security configuration
  {
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
      
      // Security specific rules for Ethiopian market
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-require': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'error',
    },
  },

  // Code Quality (SonarJS)
  {
    plugins: {
      sonarjs,
    },
    rules: {
      ...sonarjs.configs.recommended.rules,
      
      // Code quality rules
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-collection-size-mischeck': 'error',
      'sonarjs/no-empty-collection': 'error',
      'sonarjs/no-extra-arguments': 'error',
      'sonarjs/no-gratuitous-expressions': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-ignored-return': 'error',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-nested-switch': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-same-line-conditional': 'error',
      'sonarjs/no-small-switch': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/no-use-of-empty-return-value': 'error',
      'sonarjs/no-useless-catch': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/prefer-object-literal': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',
    },
  },

  // Testing configuration (Jest + Testing Library)
  {
    files: [
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    plugins: {
      jest,
      'testing-library': testingLibrary,
    },
    rules: {
      ...jest.configs.recommended.rules,
      ...testingLibrary.configs.react.rules,
      
      // Jest specific rules
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      'jest/no-mocks-import': 'error',
      'jest/prefer-spy-on': 'warn',
      'jest/prefer-to-contain': 'warn',
      
      // Testing Library rules
      'testing-library/prefer-screen-queries': 'error',
      'testing-library/no-debugging-utils': 'warn',
      'testing-library/no-container': 'error',
      'testing-library/no-node-access': 'error',
      'testing-library/prefer-presence-queries': 'error',
      'testing-library/prefer-query-by-disappearance': 'error',
    },
  },

  // Ethiopian Market Specific Rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Ethiopian market specific validation rules
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      
      // Ethiopian payment gateway specific rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // Performance rules for Ethiopian network conditions
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'warn',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['warn', { max: 5 }],
      'complexity': ['warn', { max: 10 }],
      
      // Code style rules
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      
      // Error prevention
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-undef': 'off', // Handled by TypeScript
      'no-duplicate-imports': 'error',
      'no-const-assign': 'error',
      'no-class-assign': 'error',
      'no-this-before-super': 'error',
    },
  },

  // Prettier configuration (must be last)
  prettier,

  // Overrides for specific file types
  {
    files: ['**/*.config.js', '**/*.config.ts'],
    rules: {
      'import/no-commonjs': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  
  // Overrides for Ethiopian utility files
  {
    files: ['**/utils/**/*.{js,ts}', '**/services/**/*.{js,ts}'],
    rules: {
      'max-lines-per-function': [
        'warn',
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      'complexity': ['warn', { max: 15 }],
    },
  },
  
  // Overrides for test files
  {
    files: ['**/__tests__/**', '**/*.{test,spec}.*'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
      'complexity': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/web-build/**',
      '**/assets/**',
      '**/android/**',
      '**/ios/**',
      '**/eas-builds/**',
      '**/*.min.js',
      '**/bundle/**',
      '**/__snapshots__/**',
      '**/.history/**',
      '**/secrets/**',
      '**/temp/**',
      '**/tmp/**',
    ],
  },
];

// Environment specific configurations
const environmentConfigs = {
  development: {
    rules: {
      'no-console': 'off',
      'no-debugger': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  production: {
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
};

// Apply environment specific rules
const currentEnv = process.env.NODE_ENV || 'development';
if (environmentConfigs[currentEnv]) {
  module.exports.push({
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: environmentConfigs[currentEnv].rules,
  });
}

// Ethiopian market specific overrides
module.exports.push({
  files: [
    '**/services/payment-gateways/**',
    '**/utils/ethiopian-calendar.js',
    '**/utils/validators.js',
  ],
  rules: {
    'max-lines-per-function': [
      'warn',
      { max: 200, skipBlankLines: true, skipComments: true },
    ],
    'complexity': ['warn', { max: 20 }],
    'sonarjs/cognitive-complexity': ['error', { threshold: 25 }],
  },
});

// React Native specific file extensions
module.exports.forEach(config => {
  if (config.files) {
    config.files = config.files.map(pattern => 
      pattern.replace(/\{js,jsx,ts,tsx\}/, '{js,jsx,ts,tsx,native.js}')
    );
  }
});