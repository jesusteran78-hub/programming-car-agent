module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script', // CommonJS
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'no-throw-literal': 'error',
    'no-return-await': 'error',
    'require-await': 'warn',
  },
  overrides: [
    {
      files: ['dashboard/**/*.{js,jsx}'],
      env: {
        browser: true,
        node: false,
      },
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dashboard/node_modules/',
    'dashboard/dist/',
    // Debug/test scripts - console.log is expected
    'debug_*.js',
    'test_*.js',
    'check_*.js',
    'manual_*.js',
    'seed_*.js',
    'parse_*.js',
    'inspect_*.js',
    'verify_*.js',
    'audit_agent.js',
    'csv_to_n8n.js',
    'download_db.js',
    'get_channels.js',
    'list_*.js',
    'update_webhook.js',
    'setup_db.js',
    'whapi_sender.js',
    'claude_bridge.js',
  ],
};
