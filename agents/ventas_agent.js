/**
 * Ventas Agent
 * Handles sales: leads, quotes, pricing, customers
 */
const { createClient } = require('@supabase/supabase-js');
const logger = require('../logger');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Get leads summary by status
 * @returns {Promise<Object>}
 */
async function getLeadsSummary() {
  const { data, error } = await supabase
    .from('leads')
    .select('pipeline_status');

  if (error) {
    logger.error('Error fetching leads summary:', error);
    return {};
  }

  const summary = (data || []).reduce((acc, lead) => {
    const status = lead.pipeline_status || 'NUEVO';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return summary;
}

/**
 * Get recent leads
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRecentLeads(limit = 5) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching recent leads:', error);
    return [];
  }

  return data || [];
}

/**
 * Get pending price requests
 * @returns {Promise<Array>}
 */
async function getPendingPriceRequests() {
  const { data, error } = await supabase
    .from('price_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching price requests:', error);
    return [];
  }

  return data || [];
}

/**
 * Get leads by status
 * @param {string} status
 * @returns {Promise<Array>}
 */
async function getLeadsByStatus(status) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('pipeline_status', status.toUpperCase())
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    logger.error('Error fetching leads by status:', error);
    return [];
  }

  return data || [];
}

/**
 * Search leads by phone or name
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchLeads(query) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    logger.error('Error searching leads:', error);
    return [];
  }

  return data || [];
}

/**
 * Process ventas command from owner
 * @param {string} command - Command after "ventas"
 * @returns {Promise<string>}
 */
async function processVentasCommand(command) {
  const lowerCmd = command.toLowerCase().trim();

  // Status / summary
  if (lowerCmd === 'status' || lowerCmd === '' || lowerCmd === 'resumen') {
    const summary = await getLeadsSummary();
    const pendingRequests = await getPendingPriceRequests();
    const recentLeads = await getRecentLeads(5);

    const total = Object.values(summary).reduce((a, b) => a + b, 0);

    let response = `💰 **VENTAS - STATUS**\n\n`;
    response += `📊 **Pipeline (${total} total):**\n`;

    const statusEmojis = {
      'NUEVO': '🆕',
      'COTIZANDO': '💬',
      'PROGRAMADO': '📅',
      'COMPLETADO': '✅',
      'PERDIDO': '❌',
    };

    for (const [status, count] of Object.entries(summary)) {
      const emoji = statusEmojis[status] || '•';
      response += `${emoji} ${status}: ${count}\n`;
    }

    response += `\n🔔 **Precios pendientes:** ${pendingRequests.length}\n`;

    if (pendingRequests.length > 0) {
      response += '\n';
      pendingRequests.slice(0, 3).forEach((req, i) => {
        response += `  #${req.request_code}: ${req.make} ${req.model} ${req.year}\n`;
      });
    }

    response += `\n📋 **Últimos leads:**\n`;
    recentLeads.forEach((lead, i) => {
      const phone = lead.phone?.replace('@s.whatsapp.net', '') || 'Sin teléfono';
      const vehicle = lead.make ? `${lead.make} ${lead.model}` : 'Sin vehículo';
      response += `${i + 1}. ${phone} - ${vehicle}\n`;
    });

    response += `\nComandos:\n`;
    response += `• \`ventas nuevos\` - Ver leads nuevos\n`;
    response += `• \`ventas pendientes\` - Precios por responder\n`;
    response += `• \`ventas buscar [teléfono]\` - Buscar cliente`;

    return response;
  }

  // New leads
  if (lowerCmd === 'nuevos' || lowerCmd === 'nuevo') {
    const leads = await getLeadsByStatus('NUEVO');

    if (leads.length === 0) {
      return '✅ No hay leads nuevos';
    }

    let response = `🆕 **LEADS NUEVOS (${leads.length})**\n\n`;
    leads.slice(0, 10).forEach((lead, i) => {
      const phone = lead.phone?.replace('@s.whatsapp.net', '') || '';
      const date = new Date(lead.created_at).toLocaleDateString('es-ES');
      response += `${i + 1}. 📞 ${phone}\n`;
      response += `   📅 ${date}\n`;
    });

    return response;
  }

  // Pending price requests
  if (lowerCmd === 'pendientes' || lowerCmd === 'precios') {
    const requests = await getPendingPriceRequests();

    if (requests.length === 0) {
      return '✅ No hay precios pendientes';
    }

    let response = `🔔 **PRECIOS PENDIENTES (${requests.length})**\n\n`;
    requests.forEach((req, i) => {
      const date = new Date(req.created_at).toLocaleString('es-ES');
      response += `#${req.request_code}: ${req.make} ${req.model} ${req.year}\n`;
      response += `   FCC: ${req.fcc_id || 'N/A'}\n`;
      response += `   📅 ${date}\n\n`;
    });

    response += `💡 Responde con el precio (ej: "180")`;

    return response;
  }

  // Cotizando
  if (lowerCmd === 'cotizando') {
    const leads = await getLeadsByStatus('COTIZANDO');

    if (leads.length === 0) {
      return '📭 No hay leads en cotización';
    }

    let response = `💬 **EN COTIZACIÓN (${leads.length})**\n\n`;
    leads.slice(0, 10).forEach((lead, i) => {
      const phone = lead.phone?.replace('@s.whatsapp.net', '') || '';
      const vehicle = lead.make ? `${lead.make} ${lead.model} ${lead.year}` : 'Sin vehículo';
      response += `${i + 1}. ${phone} - ${vehicle}\n`;
    });

    return response;
  }

  // Search
  if (lowerCmd.startsWith('buscar') || lowerCmd.startsWith('busca')) {
    const query = command.replace(/^busca[r]?\s*/i, '').trim();
    if (!query) {
      return '❌ Uso: `ventas buscar [teléfono o nombre]`';
    }

    const results = await searchLeads(query);

    if (results.length === 0) {
      return `❌ No encontré clientes con "${query}"`;
    }

    let response = `🔍 **RESULTADOS PARA "${query}"**\n\n`;
    results.forEach((lead, i) => {
      const phone = lead.phone?.replace('@s.whatsapp.net', '') || '';
      const vehicle = lead.make ? `${lead.make} ${lead.model} ${lead.year}` : 'Sin vehículo';
      response += `${i + 1}. ${phone}\n`;
      response += `   🚗 ${vehicle}\n`;
      response += `   📊 ${lead.pipeline_status}\n\n`;
    });

    return response;
  }

  return '❓ Comando no reconocido. Usa `ventas status` para ver opciones.';
}

module.exports = {
  getLeadsSummary,
  getRecentLeads,
  getPendingPriceRequests,
  getLeadsByStatus,
  searchLeads,
  processVentasCommand,
};
