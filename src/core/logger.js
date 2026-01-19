/**
 * ATLAS Logger
 * Structured logging with levels and timestamps
 *
 * @module src/core/logger
 */
const { config } = require('./config');

/**
 * Log levels in order of priority
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Current log level from config
 */
const currentLevel = LOG_LEVELS[config.logLevel] ?? LOG_LEVELS.INFO;

/**
 * Formats a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} [meta] - Additional metadata
 * @returns {string}
 */
function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * Logs a debug message
 * @param {string} message - Message to log
 * @param {object} [meta] - Additional metadata
 */
function debug(message, meta = null) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(formatMessage('DEBUG', message, meta));
  }
}

/**
 * Logs an info message
 * @param {string} message - Message to log
 * @param {object} [meta] - Additional metadata
 */
function info(message, meta = null) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(formatMessage('INFO', message, meta));
  }
}

/**
 * Logs a warning message
 * @param {string} message - Message to log
 * @param {object} [meta] - Additional metadata
 */
function warn(message, meta = null) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, meta));
  }
}

/**
 * Logs an error message
 * @param {string} message - Message to log
 * @param {Error|object} [error] - Error object or metadata
 */
function error(message, error = null) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    let meta = null;
    if (error instanceof Error) {
      meta = { message: error.message, stack: error.stack };
    } else if (error) {
      meta = error;
    }
    console.error(formatMessage('ERROR', message, meta));
  }
}

/**
 * Creates a child logger with a prefix
 * @param {string} prefix - Prefix for all messages (e.g., agent name)
 * @returns {object} Logger with prefixed methods
 */
function child(prefix) {
  return {
    debug: (msg, meta) => debug(`[${prefix}] ${msg}`, meta),
    info: (msg, meta) => info(`[${prefix}] ${msg}`, meta),
    warn: (msg, meta) => warn(`[${prefix}] ${msg}`, meta),
    error: (msg, err) => error(`[${prefix}] ${msg}`, err),
  };
}

module.exports = {
  debug,
  info,
  warn,
  error,
  child,
  LOG_LEVELS,
};
