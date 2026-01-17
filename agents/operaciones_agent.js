/**
 * Operaciones Agent
 * Handles technical operations: agenda, jobs, FCC lookups
 */
const { createClient } = require('@supabase/supabase-js');
const { findKeyDetails } = require('../key_finder');
const logger = require('../logger');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Get today's scheduled jobs
 * @returns {Promise<Array>}
 */
async function getTodayJobs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('pipeline_status', 'PROGRAMADO')
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    logger.error('Error fetching today jobs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all pending jobs (scheduled but not completed)
 * @returns {Promise<Array>}
 */
async function getPendingJobs() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('pipeline_status', 'PROGRAMADO')
    .order('scheduled_at', { ascending: true });

  if (error) {
    logger.error('Error fetching pending jobs:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark a job as completed
 * @param {string} leadId - Lead ID
 * @param {number} amount - Amount charged
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function completeJob(leadId, amount = null) {
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
    logger.error('Error completing job:', error);
    return { success: false, message: `Error: ${error.message}` };
  }

  return { success: true, message: '✅ Trabajo marcado como completado' };
}

/**
 * Lookup FCC for a vehicle
 * @param {number} year
 * @param {string} make
 * @param {string} model
 * @returns {string}
 */
function lookupFCC(year, make, model) {
  const results = findKeyDetails(year, make, model);

  if (!results || results.length === 0 || results[0].db_miss) {
    return `❌ No encontré FCC para ${make} ${model} ${year}`;
  }

  let response = `🔑 **${make} ${model} ${year}**\n\n`;
  results.forEach((r, i) => {
    response += `${i + 1}. FCC: **${r.fccId}**\n`;
    response += `   Freq: ${r.frequency || 'N/A'}\n`;
    response += `   Fuente: ${r.source}\n\n`;
  });

  return response;
}

/**
 * Process operaciones command from owner
 * @param {string} command - Command after "operaciones" or "ops"
 * @returns {Promise<string>}
 */
async function processOperacionesCommand(command) {
  const lowerCmd = command.toLowerCase().trim();

  // Status / agenda
  if (lowerCmd === 'status' || lowerCmd === '' || lowerCmd === 'agenda' || lowerCmd === 'hoy') {
    const todayJobs = await getTodayJobs();
    const pendingJobs = await getPendingJobs();

    let response = `🔧 **OPERACIONES - HOY**\n\n`;

    if (todayJobs.length === 0) {
      response += `📅 Sin trabajos programados para hoy\n\n`;
    } else {
      response += `📅 **Trabajos de hoy (${todayJobs.length}):**\n`;
      todayJobs.forEach((job, i) => {
        const time = job.scheduled_at ? new Date(job.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora';
        response += `${i + 1}. ${time} - ${job.make || ''} ${job.model || ''} ${job.year || ''}\n`;
        response += `   📞 ${job.phone?.replace('@s.whatsapp.net', '') || 'Sin teléfono'}\n`;
      });
      response += '\n';
    }

    response += `📋 Total pendientes: ${pendingJobs.length}\n\n`;
    response += `Comandos:\n`;
    response += `• \`ops fcc [año] [marca] [modelo]\` - Buscar FCC\n`;
    response += `• \`ops pendientes\` - Ver todos los trabajos pendientes`;

    return response;
  }

  // Pending jobs
  if (lowerCmd === 'pendientes' || lowerCmd === 'todos') {
    const jobs = await getPendingJobs();

    if (jobs.length === 0) {
      return '✅ No hay trabajos pendientes';
    }

    let response = `📋 **TRABAJOS PENDIENTES (${jobs.length})**\n\n`;
    jobs.slice(0, 10).forEach((job, i) => {
      const date = job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString('es-ES') : 'Sin fecha';
      response += `${i + 1}. ${job.make || ''} ${job.model || ''} ${job.year || ''}\n`;
      response += `   📅 ${date} | 📞 ${job.phone?.replace('@s.whatsapp.net', '') || ''}\n`;
    });

    if (jobs.length > 10) {
      response += `\n... y ${jobs.length - 10} más`;
    }

    return response;
  }

  // FCC lookup
  if (lowerCmd.startsWith('fcc')) {
    const parts = command.replace(/^fcc\s*/i, '').trim().split(/\s+/);
    if (parts.length < 3) {
      return '❌ Uso: `ops fcc [año] [marca] [modelo]`\nEjemplo: `ops fcc 2015 toyota camry`';
    }

    const year = parseInt(parts[0]);
    const make = parts[1];
    const model = parts.slice(2).join(' ');

    if (isNaN(year)) {
      return '❌ El año debe ser un número. Ejemplo: `ops fcc 2015 toyota camry`';
    }

    return lookupFCC(year, make, model);
  }

  return '❓ Comando no reconocido. Usa `ops status` para ver opciones.';
}

module.exports = {
  getTodayJobs,
  getPendingJobs,
  completeJob,
  lookupFCC,
  processOperacionesCommand,
};
