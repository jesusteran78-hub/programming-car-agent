/**
 * ATLAS Health Monitor
 * Monitors critical services and alerts owner via WhatsApp if anything fails
 *
 * Part of PROJECT MILLION - Protecting revenue by ensuring zero downtime
 *
 * @module src/core/health-monitor
 */
const { getSupabase } = require('./supabase');
const { getOpenAI } = require('./openai');
const { config } = require('./config');
const logger = require('./logger').child('HealthMonitor');

/**
 * Health status for each service
 */
const healthStatus = {
  whatsapp: { status: 'unknown', lastCheck: null, lastError: null },
  openai: { status: 'unknown', lastCheck: null, lastError: null },
  supabase: { status: 'unknown', lastCheck: null, lastError: null },
};

/**
 * Track if we've already alerted for current outage (avoid spam)
 */
const alertedServices = new Set();

/**
 * Check WhatsApp API (Whapi) health
 * @returns {Promise<{healthy: boolean, error?: string}>}
 */
async function checkWhatsApp() {
  try {
    const response = await fetch('https://gate.whapi.cloud/health', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.whapiToken}`,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      return { healthy: true };
    }
    return { healthy: false, error: `HTTP ${response.status}` };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}

/**
 * Check OpenAI API health
 * @returns {Promise<{healthy: boolean, error?: string, quota?: string}>}
 */
async function checkOpenAI() {
  try {
    const openai = getOpenAI();

    // Simple models list call to verify API key works
    const models = await openai.models.list();

    if (models.data && models.data.length > 0) {
      return { healthy: true };
    }
    return { healthy: false, error: 'No models returned' };
  } catch (e) {
    // Check for quota error specifically
    if (e.message && e.message.includes('429')) {
      return { healthy: false, error: 'QUOTA EXCEEDED - Add credits!', quota: 'exceeded' };
    }
    return { healthy: false, error: e.message };
  }
}

/**
 * Check Supabase health
 * @returns {Promise<{healthy: boolean, error?: string}>}
 */
async function checkSupabase() {
  try {
    const supabase = getSupabase();

    // Simple query to verify connection
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .limit(1);

    if (error) {
      return { healthy: false, error: error.message };
    }
    return { healthy: true };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}

/**
 * Send alert to owner via WhatsApp
 * @param {string} message - Alert message
 * @param {Function} sendWhatsApp - WhatsApp send function
 */
async function sendAlert(message, sendWhatsApp) {
  const ownerPhone = config.ownerPhone || process.env.OWNER_PHONE;

  if (!ownerPhone || !sendWhatsApp) {
    logger.error('Cannot send alert: missing owner phone or sendWhatsApp function');
    return;
  }

  try {
    await sendWhatsApp(ownerPhone, message);
    logger.info(`Alert sent to owner: ${message.substring(0, 50)}...`);
  } catch (e) {
    logger.error('Failed to send alert:', e);
  }
}

/**
 * Run all health checks
 * @param {Function} [sendWhatsApp] - Optional WhatsApp send function for alerts
 * @returns {Promise<object>} Health status of all services
 */
async function runHealthChecks(sendWhatsApp = null) {
  const timestamp = new Date().toISOString();
  const results = {
    timestamp,
    services: {},
    allHealthy: true,
    alerts: [],
  };

  // Check WhatsApp
  logger.debug('Checking WhatsApp API...');
  const whatsappResult = await checkWhatsApp();
  healthStatus.whatsapp = {
    status: whatsappResult.healthy ? 'healthy' : 'unhealthy',
    lastCheck: timestamp,
    lastError: whatsappResult.error || null,
  };
  results.services.whatsapp = healthStatus.whatsapp;

  if (!whatsappResult.healthy) {
    results.allHealthy = false;
    if (!alertedServices.has('whatsapp')) {
      results.alerts.push(`🚨 WHATSAPP API DOWN: ${whatsappResult.error}`);
      alertedServices.add('whatsapp');
    }
  } else {
    alertedServices.delete('whatsapp');
  }

  // Check OpenAI
  logger.debug('Checking OpenAI API...');
  const openaiResult = await checkOpenAI();
  healthStatus.openai = {
    status: openaiResult.healthy ? 'healthy' : 'unhealthy',
    lastCheck: timestamp,
    lastError: openaiResult.error || null,
    quota: openaiResult.quota || 'ok',
  };
  results.services.openai = healthStatus.openai;

  if (!openaiResult.healthy) {
    results.allHealthy = false;
    if (!alertedServices.has('openai')) {
      const alertMsg = openaiResult.quota === 'exceeded'
        ? '🚨 OPENAI SIN CREDITOS - Alex no puede responder!'
        : `🚨 OPENAI API DOWN: ${openaiResult.error}`;
      results.alerts.push(alertMsg);
      alertedServices.add('openai');
    }
  } else {
    alertedServices.delete('openai');
  }

  // Check Supabase
  logger.debug('Checking Supabase...');
  const supabaseResult = await checkSupabase();
  healthStatus.supabase = {
    status: supabaseResult.healthy ? 'healthy' : 'unhealthy',
    lastCheck: timestamp,
    lastError: supabaseResult.error || null,
  };
  results.services.supabase = healthStatus.supabase;

  if (!supabaseResult.healthy) {
    results.allHealthy = false;
    if (!alertedServices.has('supabase')) {
      results.alerts.push(`🚨 SUPABASE DOWN: ${supabaseResult.error}`);
      alertedServices.add('supabase');
    }
  } else {
    alertedServices.delete('supabase');
  }

  // Send alerts if there are any
  if (results.alerts.length > 0 && sendWhatsApp) {
    const alertMessage = `⚠️ ATLAS HEALTH ALERT ⚠️\n\n${results.alerts.join('\n\n')}\n\n⏰ ${timestamp}`;
    await sendAlert(alertMessage, sendWhatsApp);
  }

  // Log summary
  if (results.allHealthy) {
    logger.info('All services healthy ✅');
  } else {
    logger.warn(`Health issues detected: ${results.alerts.join(', ')}`);
  }

  return results;
}

/**
 * Get current health status without running new checks
 * @returns {object}
 */
function getHealthStatus() {
  return {
    ...healthStatus,
    allHealthy: Object.values(healthStatus).every(s => s.status === 'healthy'),
  };
}

/**
 * Start periodic health monitoring
 * @param {Function} sendWhatsApp - WhatsApp send function for alerts
 * @param {number} [intervalMs=300000] - Check interval (default: 5 minutes)
 * @returns {NodeJS.Timeout} Interval handle for cleanup
 */
function startMonitoring(sendWhatsApp, intervalMs = 300000) {
  logger.info(`Starting health monitoring (interval: ${intervalMs / 1000}s)`);

  // Run initial check
  runHealthChecks(sendWhatsApp);

  // Schedule periodic checks
  const intervalHandle = setInterval(() => {
    runHealthChecks(sendWhatsApp);
  }, intervalMs);

  return intervalHandle;
}

/**
 * Stop health monitoring
 * @param {NodeJS.Timeout} intervalHandle - Handle from startMonitoring
 */
function stopMonitoring(intervalHandle) {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    logger.info('Health monitoring stopped');
  }
}

/**
 * Format health status for WhatsApp message
 * @returns {string}
 */
function formatHealthReport() {
  const status = getHealthStatus();

  const serviceEmoji = (s) => s.status === 'healthy' ? '✅' : '❌';

  return `📊 ATLAS HEALTH REPORT

${serviceEmoji(status.whatsapp)} WhatsApp: ${status.whatsapp.status}
${serviceEmoji(status.openai)} OpenAI: ${status.openai.status}${status.openai.quota === 'exceeded' ? ' (SIN CREDITOS!)' : ''}
${serviceEmoji(status.supabase)} Supabase: ${status.supabase.status}

Overall: ${status.allHealthy ? '✅ All systems operational' : '⚠️ Issues detected'}
Last check: ${status.whatsapp.lastCheck || 'Never'}`;
}

module.exports = {
  checkWhatsApp,
  checkOpenAI,
  checkSupabase,
  runHealthChecks,
  getHealthStatus,
  startMonitoring,
  stopMonitoring,
  formatHealthReport,
};
