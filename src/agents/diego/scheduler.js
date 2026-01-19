/**
 * ATLAS Agent: Diego (Operations)
 * Scheduler - Job and Appointment Management
 *
 * @module src/agents/diego/scheduler
 */
const { getSupabase } = require('../../core/supabase');
const logger = require('../../core/logger').child('Scheduler');

/**
 * Gets today's scheduled jobs
 * @returns {Promise<object>}
 */
async function getTodayJobs() {
  const supabase = getSupabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Get from scheduled_jobs table
    const { data: scheduledJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .gte('scheduled_for', today.toISOString())
      .lt('scheduled_for', tomorrow.toISOString())
      .order('scheduled_for', { ascending: true });

    if (jobsError) {
      logger.error('Error fetching scheduled_jobs:', jobsError);
      return { jobs: [], error: jobsError.message };
    }

    // Also check leads with PROGRAMADO status (just the status, no date filter since column may not exist)
    let leadJobs = [];
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, phone, name, make, model, year, pipeline_status, created_at')
        .eq('pipeline_status', 'PROGRAMADO')
        .limit(20);

      if (!leadsError && leads) {
        leadJobs = leads.map((lead) => ({
          ...lead,
          job_type: 'lead_programado',
          scheduled_for: lead.created_at, // Use created_at as fallback
        }));
      }
    } catch (e) {
      // Ignore errors from leads query - it's optional
    }

    // Combine and return
    const allJobs = [...(scheduledJobs || []), ...leadJobs];

    return {
      jobs: allJobs,
      success: true,
    };
  } catch (error) {
    logger.error('Error in getTodayJobs:', error);
    return { jobs: [], error: error.message };
  }
}

/**
 * Gets all pending jobs
 * @returns {Promise<object>}
 */
async function getPendingJobs() {
  const supabase = getSupabase();

  try {
    // Get from scheduled_jobs
    const { data: scheduledJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('status', 'scheduled')
      .order('scheduled_for', { ascending: true });

    if (jobsError) {
      logger.error('Error fetching pending scheduled_jobs:', jobsError);
      return { jobs: [], error: jobsError.message };
    }

    // Get from leads with PROGRAMADO status
    let leadJobs = [];
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, phone, name, make, model, year, pipeline_status, created_at')
        .eq('pipeline_status', 'PROGRAMADO')
        .limit(50);

      if (!leadsError && leads) {
        leadJobs = leads.map((lead) => ({
          ...lead,
          job_type: 'lead_programado',
          status: 'scheduled',
          scheduled_for: lead.created_at,
        }));
      }
    } catch (e) {
      // Ignore errors from leads query - it's optional
    }

    // Combine and return
    const allJobs = [...(scheduledJobs || []), ...leadJobs];

    return {
      jobs: allJobs,
      success: true,
    };
  } catch (error) {
    logger.error('Error in getPendingJobs:', error);
    return { jobs: [], error: error.message };
  }
}

/**
 * Creates a new scheduled job
 * @param {object} jobData - Job details
 * @returns {Promise<object>}
 */
async function createJob(jobData) {
  const supabase = getSupabase();

  const {
    leadId,
    jobType,
    scheduledFor,
    location,
    notes,
    payload = {},
  } = jobData;

  try {
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .insert({
        lead_id: leadId,
        agent_id: 'diego',
        job_type: jobType,
        scheduled_for: scheduledFor,
        status: 'scheduled',
        payload: { ...payload, location },
        notes,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Job created: ${data.id} for ${scheduledFor}`);
    return { success: true, job: data };
  } catch (error) {
    logger.error('Error creating job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marks a job as completed
 * @param {string} jobId - Job ID (from scheduled_jobs)
 * @param {object} result - Completion details
 * @returns {Promise<object>}
 */
async function completeJob(jobId, result = {}) {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('scheduled_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payload: result,
      })
      .eq('id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Job completed: ${jobId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error completing job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marks a lead job as completed
 * @param {string} leadId - Lead ID
 * @param {number} amount - Amount charged
 * @returns {Promise<object>}
 */
async function completeLeadJob(leadId, amount = null) {
  const supabase = getSupabase();

  try {
    const updates = {
      pipeline_status: 'COMPLETADO',
      completed_at: new Date().toISOString(),
    };

    if (amount) {
      updates.amount_charged = amount;
    }

    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Lead job completed: ${leadId}`);
    return { success: true, message: 'Trabajo marcado como completado' };
  } catch (error) {
    logger.error('Error completing lead job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancels a job
 * @param {string} jobId - Job ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<object>}
 */
async function cancelJob(jobId, reason = '') {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('scheduled_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        notes: reason,
      })
      .eq('id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Job cancelled: ${jobId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error cancelling job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets jobs for a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<object>}
 */
async function getJobsInRange(startDate, endDate) {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .gte('scheduled_for', startDate.toISOString())
      .lt('scheduled_for', endDate.toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, jobs: data || [] };
  } catch (error) {
    logger.error('Error fetching jobs in range:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Formats job list for WhatsApp display
 * @param {Array} jobs - Jobs array
 * @param {string} title - Section title
 * @returns {string}
 */
function formatJobList(jobs, title = 'Trabajos') {
  if (!jobs || jobs.length === 0) {
    return `📅 Sin ${title.toLowerCase()} programados\n`;
  }

  let response = `📅 **${title} (${jobs.length}):**\n`;

  jobs.slice(0, 10).forEach((job, i) => {
    const time = job.scheduled_for || job.scheduled_at;
    const timeStr = time
      ? new Date(time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : 'Sin hora';
    const dateStr = time
      ? new Date(time).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      : '';

    const vehicle = job.make
      ? `${job.make} ${job.model || ''} ${job.year || ''}`
      : job.job_type || 'Sin detalles';

    const phone = (job.phone || '').replace('@s.whatsapp.net', '');

    response += `${i + 1}. ${dateStr} ${timeStr} - ${vehicle}\n`;
    if (phone) {
      response += `   📞 ${phone}\n`;
    }
  });

  if (jobs.length > 10) {
    response += `\n... y ${jobs.length - 10} más\n`;
  }

  return response;
}

module.exports = {
  getTodayJobs,
  getPendingJobs,
  createJob,
  completeJob,
  completeLeadJob,
  cancelJob,
  getJobsInRange,
  formatJobList,
};
