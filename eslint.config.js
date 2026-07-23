import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'coverage/', 'frontend/dist/'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-console': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ['frontend/src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
];
