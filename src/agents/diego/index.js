/**
 * ATLAS Agent: Diego (Operations)
 * Handles scheduling, job management, and FCC lookups
 *
 * STATUS: Fully implemented with scheduler and FCC modules
 *
 * @module src/agents/diego
 */
require('dotenv').config();

const logger = require('../../core/logger').child('Diego');
const { getSupabase } = require('../../core/supabase');
const {
  consumeEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  registerHeartbeat,
  publishEvent,
  EVENT_TYPES,
} = require('../../core/event-bus');

// Import Diego modules
const scheduler = require('./scheduler');
const fccLookup = require('./fcc-lookup');

const AGENT_ID = 'diego';

/**
 * Events that Diego listens to
 */
const SUBSCRIBED_EVENTS = [
  EVENT_TYPES.JOB_SCHEDULED,
  EVENT_TYPES.JOB_COMPLETED,
  EVENT_TYPES.FCC_LOOKUP,
];

/**
 * Handles FCC lookup request
 * @param {object} payload - Event payload
 * @returns {Promise<object>}
 */
async function handleFCCLookup(payload) {
  const { year, make, model, input } = payload;

  // If raw input provided, parse it first
  if (input) {
    const result = fccLookup.processFCCLookup(input);
    return {
      status: result.success ? 'found' : 'not_found',
      message: result.message,
      data: result.data,
    };
  }

  // Direct lookup with year/make/model
  if (year && make && model) {
    const result = fccLookup.lookupFCC(year, make, model);
    return {
      status: result.found ? 'found' : 'not_found',
      message: fccLookup.formatFCCResult(result),
      data: result,
    };
  }

  return {
    status: 'error',
    message: 'Missing required parameters (year, make, model) or input string',
  };
}

/**
 * Handles job scheduled event
 * @param {object} payload - Event payload
 * @returns {Promise<object>}
 */
async function handleJobScheduled(payload) {
  const { leadId, jobType, scheduledFor, notes } = payload;

  logger.info(`Creating job: ${jobType} for lead ${leadId}`);

  const result = await scheduler.createJob(leadId, jobType, scheduledFor, {
    notes,
    source: 'event_bus',
  });

  if (result.error) {
    return { status: 'error', error: result.error };
  }

  return {
    status: 'created',
    jobId: result.job?.id,
    scheduledFor: result.job?.scheduled_for,
  };
}

/**
 * Handles job completed event
 * @param {object} payload - Event payload
 * @returns {Promise<object>}
 */
async function handleJobCompleted(payload) {
  const { jobId, leadId, notes } = payload;

  logger.info(`Completing job: ${jobId || 'by lead ' + leadId}`);

  let result;
  if (jobId) {
    result = await scheduler.completeJob(jobId, notes);
  } else if (leadId) {
    result = await scheduler.completeLeadJob(leadId, notes);
  } else {
    return { status: 'error', error: 'Missing jobId or leadId' };
  }

  if (result.error) {
    return { status: 'error', error: result.error };
  }

  return { status: 'completed', job: result.job };
}

/**
 * Gets operations status for owner commands
 * @returns {Promise<object>}
 */
async function getOpsStatus() {
  const [todayResult, pendingResult] = await Promise.all([
    scheduler.getTodayJobs(),
    scheduler.getPendingJobs(),
  ]);

  const today = todayResult.jobs || [];
  const pending = pendingResult.jobs || [];

  // Group by status
  const scheduled = today.filter((j) => j.status === 'scheduled').length;
  const completed = today.filter((j) => j.status === 'completed').length;
  const cancelled = today.filter((j) => j.status === 'cancelled').length;

  return {
    today: {
      total: today.length,
      scheduled,
      completed,
      cancelled,
      jobs: today,
    },
    pending: {
      total: pending.length,
      jobs: pending.slice(0, 10), // Limit to 10
    },
    formatted: formatOpsStatus(today, pending),
  };
}

/**
 * Formats operations status for WhatsApp display
 * @param {object[]} today - Today's jobs
 * @param {object[]} pending - Pending jobs
 * @returns {string}
 */
function formatOpsStatus(today, pending) {
  let response = '**OPS STATUS - Diego**\n\n';

  // Today's summary
  const scheduled = today.filter((j) => j.status === 'scheduled').length;
  const completed = today.filter((j) => j.status === 'completed').length;

  response += `**HOY (${today.length} trabajos)**\n`;
  response += `- Programados: ${scheduled}\n`;
  response += `- Completados: ${completed}\n\n`;

  // Today's jobs list
  if (today.length > 0) {
    response += '**Agenda del dia:**\n';
    today.forEach((job, i) => {
      const time = new Date(job.scheduled_for).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const statusIcon = job.status === 'completed' ? '' : '';
      response += `${i + 1}. ${time} - ${job.job_type} ${statusIcon}\n`;
    });
    response += '\n';
  }

  // Pending jobs
  if (pending.length > 0) {
    response += `**Pendientes (${pending.length} total):**\n`;
    pending.slice(0, 5).forEach((job) => {
      const date = new Date(job.scheduled_for).toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric',
      });
      response += `- ${date}: ${job.job_type}\n`;
    });
    if (pending.length > 5) {
      response += `... y ${pending.length - 5} mas\n`;
    }
  }

  return response.trim();
}

/**
 * Processes owner command for Diego
 * @param {string} command - Command string
 * @returns {Promise<object>}
 */
async function processOwnerCommand(command) {
  const cmd = command.toLowerCase().trim();

  // ops status
  if (cmd === 'status' || cmd === 'ops' || cmd === 'ops status') {
    const status = await getOpsStatus();
    return {
      success: true,
      message: status.formatted,
      data: status,
    };
  }

  // ops today
  if (cmd === 'today' || cmd === 'hoy') {
    const result = await scheduler.getTodayJobs();
    if (result.error) {
      return { success: false, message: `Error: ${result.error}` };
    }
    return {
      success: true,
      message: scheduler.formatJobList(result.jobs, 'Trabajos de hoy'),
      data: result.jobs,
    };
  }

  // ops pending
  if (cmd === 'pending' || cmd === 'pendientes') {
    const result = await scheduler.getPendingJobs();
    if (result.error) {
      return { success: false, message: `Error: ${result.error}` };
    }
    return {
      success: true,
      message: scheduler.formatJobList(result.jobs, 'Trabajos pendientes'),
      data: result.jobs,
    };
  }

  // fcc [year make model]
  if (cmd.startsWith('fcc ')) {
    const input = cmd.substring(4);
    const result = fccLookup.processFCCLookup(input);
    return result;
  }

  // Unknown command
  return {
    success: false,
    message:
      '**Diego Commands:**\n' +
      '- ops status - Estado general\n' +
      '- ops today - Trabajos de hoy\n' +
      '- ops pending - Trabajos pendientes\n' +
      '- fcc [year] [make] [model] - Buscar FCC ID',
  };
}

/**
 * Event consumer loop
 * @param {number} pollInterval - Milliseconds between polls
 */
async function startEventLoop(pollInterval = 10000) {
  logger.info('Starting Diego event loop...');

  await registerHeartbeat(AGENT_ID, { status: 'running', version: '1.0.0' });

  const processEvents = async () => {
    try {
      const result = await consumeEvents(AGENT_ID, SUBSCRIBED_EVENTS, 5);

      if (!result.success || !result.data.length) {
        return;
      }

      for (const event of result.data) {
        logger.info(`Processing event: ${event.event_type}`);
        await markEventProcessing(event.id, AGENT_ID);

        try {
          let response;

          switch (event.event_type) {
            case EVENT_TYPES.JOB_SCHEDULED:
              response = await handleJobScheduled(event.payload);
              break;
            case EVENT_TYPES.JOB_COMPLETED:
              response = await handleJobCompleted(event.payload);
              break;
            case EVENT_TYPES.FCC_LOOKUP:
              response = await handleFCCLookup(event.payload);
              break;
            default:
              response = { status: 'unknown_event' };
          }

          await markEventCompleted(event.id, AGENT_ID, response);
        } catch (error) {
          logger.error(`Error processing event ${event.id}:`, error);
          await markEventFailed(event.id, AGENT_ID, error.message);
        }
      }

      await registerHeartbeat(AGENT_ID, { lastProcessed: new Date().toISOString() });
    } catch (error) {
      logger.error('Event loop error:', error);
    }
  };

  await processEvents();
  setInterval(processEvents, pollInterval);
}

// ============================================================
// LEGACY COMPATIBILITY EXPORTS
// These functions can be called directly from existing code
// ============================================================

/**
 * Legacy: Get today's jobs
 * @returns {Promise<object>}
 */
async function getTodaysJobs() {
  return scheduler.getTodayJobs();
}

/**
 * Legacy: Get pending jobs
 * @returns {Promise<object>}
 */
async function getPendingJobs() {
  return scheduler.getPendingJobs();
}

/**
 * Legacy: Create a scheduled job
 * @param {string} leadId - Lead UUID
 * @param {string} jobType - Type of job
 * @param {Date|string} scheduledFor - When to schedule
 * @param {object} payload - Additional data
 * @returns {Promise<object>}
 */
async function createJob(leadId, jobType, scheduledFor, payload = {}) {
  return scheduler.createJob(leadId, jobType, scheduledFor, payload);
}

/**
 * Legacy: Complete a job
 * @param {string} jobId - Job UUID
 * @param {string} notes - Completion notes
 * @returns {Promise<object>}
 */
async function completeJob(jobId, notes = '') {
  return scheduler.completeJob(jobId, notes);
}

/**
 * Legacy: FCC lookup
 * @param {number} year - Vehicle year
 * @param {string} make - Vehicle make
 * @param {string} model - Vehicle model
 * @returns {object}
 */
function lookupFCC(year, make, model) {
  return fccLookup.lookupFCC(year, make, model);
}

/**
 * Legacy: Process FCC input string
 * @param {string} input - Raw input
 * @returns {object}
 */
function processFCCLookup(input) {
  return fccLookup.processFCCLookup(input);
}

/**
 * Legacy: Get supplier links for owner
 * @param {string} make - Vehicle make
 * @param {string} model - Vehicle model
 * @param {number} year - Vehicle year
 * @param {string} fccId - FCC ID
 * @returns {object}
 */
function getSupplierLinks(make, model, year, fccId) {
  return fccLookup.getInternalSupplierLinks(make, model, year, fccId);
}

module.exports = {
  // Agent info
  AGENT_ID,

  // Event loop
  startEventLoop,

  // Owner commands
  processOwnerCommand,
  getOpsStatus,

  // Legacy scheduler functions
  getTodaysJobs,
  getPendingJobs,
  createJob,
  completeJob,

  // Legacy FCC functions
  lookupFCC,
  processFCCLookup,
  getSupplierLinks,

  // Direct module access
  scheduler,
  fccLookup,
};
