/**
 * Contabilidad Agent
 * Handles financial tracking: income, expenses, reports
 */
const { createClient } = require('@supabase/supabase-js');
const logger = require('../logger');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Get income summary for a period
 * @param {string} period - 'today', 'week', 'month', 'year'
 * @returns {Promise<{total: number, count: number, details: Array}>}
 */
async function getIncomeSummary(period = 'month') {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setMonth(now.getMonth(), 1);
  }

  const { data, error } = await supabase
    .from('leads')
    .select('amount_charged, make, model, year, completed_at')
    .eq('pipeline_status', 'COMPLETADO')
    .gte('completed_at', startDate.toISOString())
    .not('amount_charged', 'is', null);

  if (error) {
    logger.error('Error fetching income:', error);
    return { total: 0, count: 0, details: [] };
  }

  const total = (data || []).reduce((sum, item) => sum + (parseFloat(item.amount_charged) || 0), 0);

  return {
    total,
    count: data?.length || 0,
    details: data || [],
  };
}

/**
 * Get completed jobs with amounts
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRecentCompletedJobs(limit = 10) {
  const { data, error } = await supabase
    .from('leads')
    .select('make, model, year, amount_charged, completed_at, phone')
    .eq('pipeline_status', 'COMPLETADO')
    .not('amount_charged', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching completed jobs:', error);
    return [];
  }

  return data || [];
}

/**
 * Record a manual income entry
 * @param {number} amount
 * @param {string} description
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function recordIncome(amount, description) {
  // For now, we'll create a pseudo-lead to track manual income
  // In the future, you might want a separate income table
  const { error } = await supabase
    .from('leads')
    .insert({
      phone: 'manual_entry@internal',
      pipeline_status: 'COMPLETADO',
      amount_charged: amount,
      notes: description,
      completed_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Error recording income:', error);
    return { success: false, message: `Error: ${error.message}` };
  }

  return { success: true, message: `✅ Ingreso de $${amount} registrado` };
}

/**
 * Process contabilidad command from owner
 * @param {string} command - Command after "contabilidad" or "conta"
 * @returns {Promise<string>}
 */
async function processContabilidadCommand(command) {
  const lowerCmd = command.toLowerCase().trim();

  // Status / summary
  if (lowerCmd === 'status' || lowerCmd === '' || lowerCmd === 'resumen') {
    const todayIncome = await getIncomeSummary('today');
    const weekIncome = await getIncomeSummary('week');
    const monthIncome = await getIncomeSummary('month');

    let response = `📊 **CONTABILIDAD - RESUMEN**\n\n`;
    response += `💰 **Hoy:** $${todayIncome.total.toFixed(2)} (${todayIncome.count} trabajos)\n`;
    response += `📅 **Semana:** $${weekIncome.total.toFixed(2)} (${weekIncome.count} trabajos)\n`;
    response += `📆 **Mes:** $${monthIncome.total.toFixed(2)} (${monthIncome.count} trabajos)\n\n`;
    response += `Comandos:\n`;
    response += `• \`conta hoy\` - Detalle de hoy\n`;
    response += `• \`conta mes\` - Detalle del mes\n`;
    response += `• \`conta recientes\` - Últimos trabajos cobrados\n`;
    response += `• \`conta ingreso [monto] [descripción]\` - Registrar ingreso manual`;

    return response;
  }

  // Today detail
  if (lowerCmd === 'hoy') {
    const income = await getIncomeSummary('today');

    if (income.count === 0) {
      return '📊 **HOY**\n\nSin ingresos registrados hoy.';
    }

    let response = `📊 **INGRESOS DE HOY**\n\n`;
    response += `💰 Total: **$${income.total.toFixed(2)}**\n`;
    response += `📋 Trabajos: ${income.count}\n\n`;

    income.details.forEach((job, i) => {
      response += `${i + 1}. ${job.make || ''} ${job.model || ''} - $${job.amount_charged}\n`;
    });

    return response;
  }

  // Month detail
  if (lowerCmd === 'mes' || lowerCmd === 'mensual') {
    const income = await getIncomeSummary('month');

    let response = `📊 **INGRESOS DEL MES**\n\n`;
    response += `💰 Total: **$${income.total.toFixed(2)}**\n`;
    response += `📋 Trabajos: ${income.count}\n`;

    if (income.count > 0) {
      const avgPerJob = income.total / income.count;
      response += `📈 Promedio por trabajo: $${avgPerJob.toFixed(2)}\n`;
    }

    return response;
  }

  // Recent jobs
  if (lowerCmd === 'recientes' || lowerCmd === 'ultimos') {
    const jobs = await getRecentCompletedJobs(10);

    if (jobs.length === 0) {
      return '📊 No hay trabajos completados con monto registrado.';
    }

    let response = `📊 **ÚLTIMOS TRABAJOS COBRADOS**\n\n`;
    jobs.forEach((job, i) => {
      const date = job.completed_at ? new Date(job.completed_at).toLocaleDateString('es-ES') : '';
      response += `${i + 1}. ${job.make || ''} ${job.model || ''} - **$${job.amount_charged}**\n`;
      response += `   📅 ${date}\n`;
    });

    return response;
  }

  // Record income
  if (lowerCmd.startsWith('ingreso')) {
    const parts = command.replace(/^ingreso\s*/i, '').trim().split(/\s+/);
    const amount = parseFloat(parts[0]);

    if (isNaN(amount) || amount <= 0) {
      return '❌ Uso: `conta ingreso [monto] [descripción]`\nEjemplo: `conta ingreso 150 llave toyota`';
    }

    const description = parts.slice(1).join(' ') || 'Ingreso manual';
    const result = await recordIncome(amount, description);
    return result.message;
  }

  return '❓ Comando no reconocido. Usa `conta status` para ver opciones.';
}

module.exports = {
  getIncomeSummary,
  getRecentCompletedJobs,
  recordIncome,
  processContabilidadCommand,
};
