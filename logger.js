/**
 * Simple structured logger for Programming Car OS
 * Replaces console.log with level-based logging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LEVEL = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * Formats a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @param {object} [meta] - Optional metadata
 * @returns {string} Formatted log string
 */
function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

const logger = {
  debug(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.warn(formatLog('DEBUG', message, meta));
    }
  },

  info(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.warn(formatLog('INFO', message, meta));
    }
  },

  warn(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, meta));
    }
  },

  error(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, meta));
    }
  },
};

module.exports = logger;
