/**
 * ATLAS Configuration
 * Centralized environment validation and configuration
 *
 * @module src/core/config
 */
require('dotenv').config();

/**
 * Required environment variables
 */
const REQUIRED_VARS = [
  'OPENAI_API_KEY',
  'WHAPI_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY',
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
  PORT: '3000',
  LOG_LEVEL: 'INFO',
  OWNER_PHONE: '',
  KIE_API_KEY: '',
  BLOTATO_API_KEY: '',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
  GEMINI_API_KEY: '',
  USE_EVENT_BUS: 'false',
  USE_NEW_ALEX: 'false',
  USE_NEW_MARCUS: 'false',
};

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required variable is missing
 */
function validateEnvironment() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Gets a configuration value with optional default
 * @param {string} key - Environment variable name
 * @param {string} [defaultValue] - Default value if not set
 * @returns {string} Configuration value
 */
function get(key, defaultValue = undefined) {
  const value = process.env[key];

  if (value !== undefined) {
    return value;
  }

  if (OPTIONAL_VARS[key] !== undefined) {
    return OPTIONAL_VARS[key];
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return undefined;
}

/**
 * Gets a boolean configuration value
 * @param {string} key - Environment variable name
 * @returns {boolean}
 */
function getBoolean(key) {
  const value = get(key, 'false');
  return value === 'true' || value === '1';
}

/**
 * Gets a numeric configuration value
 * @param {string} key - Environment variable name
 * @param {number} [defaultValue=0] - Default value
 * @returns {number}
 */
function getNumber(key, defaultValue = 0) {
  const value = get(key);
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Frozen configuration object
 */
const config = Object.freeze({
  // Server
  port: getNumber('PORT', 3000),
  logLevel: get('LOG_LEVEL', 'INFO'),

  // OpenAI
  openaiApiKey: get('OPENAI_API_KEY'),

  // Supabase
  supabaseUrl: get('SUPABASE_URL'),
  supabaseKey: get('SUPABASE_KEY'),
  supabaseAnonKey: get('SUPABASE_ANON_KEY'),

  // WhatsApp
  whapiToken: get('WHAPI_TOKEN'),
  ownerPhone: get('OWNER_PHONE'),

  // Video Generation
  kieApiKey: get('KIE_API_KEY'),
  geminiApiKey: get('GEMINI_API_KEY'),

  // Social Media
  blotatoApiKey: get('BLOTATO_API_KEY'),
  blotatoAccountId: get('BLOTATO_ACCOUNT_ID'),
  blotatoInstagramId: get('BLOTATO_INSTAGRAM_ID'),
  blotatoYoutubeId: get('BLOTATO_YOUTUBE_ID'),
  blotatoTwitterId: get('BLOTATO_TWITTER_ID'),
  blotatoFacebookId: get('BLOTATO_FACEBOOK_ID'),
  blotatoFacebookPageId: get('BLOTATO_FACEBOOK_PAGE_ID'),

  // Cloudinary
  cloudinaryCloudName: get('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: get('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: get('CLOUDINARY_API_SECRET'),

  // Feature Flags
  useEventBus: getBoolean('USE_EVENT_BUS'),
  useNewAlex: getBoolean('USE_NEW_ALEX'),
  useNewMarcus: getBoolean('USE_NEW_MARCUS'),

  // Helper methods
  isOwner: (phone) => phone === get('OWNER_PHONE'),
});

module.exports = {
  config,
  get,
  getBoolean,
  getNumber,
  validateEnvironment,
};
