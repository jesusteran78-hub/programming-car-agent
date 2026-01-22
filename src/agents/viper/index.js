/**
 * ATLAS Agent: Viper (Outreach)
 * Handles outbound marketing campaigns and lead generation
 *
 * STATUS: Active with Apollo integration and lead management
 *
 * @module src/agents/viper
 */
require('dotenv').config();

const logger = require('../../core/logger').child('Viper');
const { getSupabase } = require('../../core/supabase');
const { dryRunCampaign } = require('./reactivation-campaign');
const apollo = require('../../services/apollo');

/**
 * Viper Agent - Outreach & Growth
 * Handles reactivation campaigns and automated follow-ups.
 */
const {
  consumeEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  registerHeartbeat,
  EVENT_TYPES,
} = require('../../core/event-bus');

const AGENT_ID = 'viper';

/**
 * Events that Viper listens to
 */
const SUBSCRIBED_EVENTS = [EVENT_TYPES.CAMPAIGN_STARTED];

/**
 * Campaign types
 */
const CAMPAIGN_TYPES = {
  whatsapp: 'WhatsApp Masivo',
  sms: 'SMS',
  email: 'Email',
  social: 'Redes Sociales',
  followup: 'Follow-up',
};

/**
 * Campaign statuses
 */
const CAMPAIGN_STATUS = {
  draft: 'Borrador',
  scheduled: 'Programada',
  running: 'En Progreso',
  paused: 'Pausada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

/**
 * Creates a new outreach campaign
 * @param {object} campaign - Campaign data
 * @returns {Promise<object>}
 */
async function createCampaign(campaign) {
  const supabase = getSupabase();
  const { name, type, target_list, template, scheduled_for } = campaign;

  try {
    const { data, error } = await supabase
      .from('outreach_campaigns')
      .insert({
        name,
        type,
        status: scheduled_for ? 'scheduled' : 'draft',
        target_list,
        template,
        scheduled_for,
        created_by: AGENT_ID,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Campaign created: ${name}`);
    return { success: true, campaign: data };
  } catch (e) {
    logger.error('Error creating campaign:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Gets all campaigns
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<object>}
 */
async function getCampaigns(status = null) {
  const supabase = getSupabase();

  try {
    let query = supabase
      .from('outreach_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return { campaigns: [], error: error.message };
    }

    return { campaigns: data || [], success: true };
  } catch (e) {
    logger.error('Error fetching campaigns:', e);
    return { campaigns: [], error: e.message };
  }
}

/**
 * Gets campaign statistics
 * @returns {Promise<object>}
 */
async function getCampaignStats() {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('outreach_campaigns')
      .select('status, sent_count, response_count, conversion_count')
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    // Calculate stats
    const campaigns = data || [];
    const stats = {
      total: campaigns.length,
      by_status: {},
      total_sent: 0,
      total_responses: 0,
      total_conversions: 0,
    };

    campaigns.forEach((c) => {
      stats.by_status[c.status] = (stats.by_status[c.status] || 0) + 1;
      stats.total_sent += c.sent_count || 0;
      stats.total_responses += c.response_count || 0;
      stats.total_conversions += c.conversion_count || 0;
    });

    // Calculate rates
    if (stats.total_sent > 0) {
      stats.response_rate = ((stats.total_responses / stats.total_sent) * 100).toFixed(1);
      stats.conversion_rate = ((stats.total_conversions / stats.total_sent) * 100).toFixed(1);
    }

    return { stats, success: true };
  } catch (e) {
    logger.error('Error fetching campaign stats:', e);
    return { error: e.message };
  }
}

/**
 * Gets outreach leads with optional filters
 * @param {object} filters - Filter options (state, status, limit)
 * @returns {Promise<object>}
 */
async function getOutreachLeads(filters = {}) {
  const supabase = getSupabase();
  const { state, status, limit = 50, offset = 0 } = filters;

  try {
    let query = supabase
      .from('outreach_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state) {
      query = query.eq('state', state);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, leads: data || [] };
  } catch (e) {
    logger.error('Error fetching leads:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Gets outreach lead statistics
 * @returns {Promise<object>}
 */
async function getLeadStats() {
  const supabase = getSupabase();

  try {
    // Total count
    const { count: total } = await supabase
      .from('outreach_leads')
      .select('*', { count: 'exact', head: true });

    // By status
    const { data: statusData } = await supabase
      .from('outreach_leads')
      .select('status');

    const byStatus = {};
    (statusData || []).forEach((l) => {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    });

    // By state (top 10)
    const { data: stateData } = await supabase
      .from('outreach_leads')
      .select('state');

    const byState = {};
    (stateData || []).forEach((l) => {
      if (l.state) {
        byState[l.state] = (byState[l.state] || 0) + 1;
      }
    });

    // Sort by count and take top 10
    const topStates = Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      success: true,
      stats: {
        total,
        byStatus,
        topStates,
      },
    };
  } catch (e) {
    logger.error('Error fetching lead stats:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Updates lead status
 * @param {string} leadId - Lead ID
 * @param {string} status - New status
 * @returns {Promise<object>}
 */
async function updateLeadStatus(leadId, status) {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('outreach_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Lead ${leadId} status updated to ${status}`);
    return { success: true, lead: data };
  } catch (e) {
    logger.error('Error updating lead:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Searches for new leads via Apollo
 * @param {string} state - US state to search
 * @param {number} limit - Max results
 * @returns {Promise<object>}
 */
async function searchNewLeads(state = 'Florida', limit = 25) {
  try {
    const result = await apollo.searchTransmissionShops(state, limit);
    return result;
  } catch (e) {
    logger.error('Error searching Apollo:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Updates campaign status
 * @param {string} campaignId - Campaign ID
 * @param {string} status - New status
 * @returns {Promise<object>}
 */
async function updateCampaignStatus(campaignId, status) {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('outreach_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Campaign ${campaignId} status updated to ${status}`);
    return { success: true, campaign: data };
  } catch (e) {
    logger.error('Error updating campaign:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Formats campaign list for WhatsApp
 * @param {object[]} campaigns - Campaigns array
 * @returns {string}
 */
function formatCampaignList(campaigns) {
  if (!campaigns || campaigns.length === 0) {
    return 'Sin campanas registradas.';
  }

  let response = `**OUTREACH - Viper**\n`;
  response += `**Campanas (${campaigns.length}):**\n\n`;

  campaigns.slice(0, 10).forEach((c, i) => {
    const statusIcon =
      c.status === 'completed'
        ? 'ok'
        : c.status === 'running'
          ? 'arrow'
          : c.status === 'paused'
            ? 'pause'
            : 'pending';
    const typeName = CAMPAIGN_TYPES[c.type] || c.type;
    const statusName = CAMPAIGN_STATUS[c.status] || c.status;

    response += `${i + 1}. **${c.name}**\n`;
    response += `   Tipo: ${typeName} | Estado: ${statusName}\n`;

    if (c.sent_count > 0) {
      response += `   Enviados: ${c.sent_count} | Respuestas: ${c.response_count || 0}\n`;
    }
    response += '\n';
  });

  return response.trim();
}

/**
 * Formats stats for WhatsApp
 * @param {object} stats - Campaign stats
 * @returns {string}
 */
function formatStats(stats) {
  let response = `**OUTREACH STATS - Viper**\n\n`;

  response += `**Total Campanas:** ${stats.total}\n`;
  response += `**Total Enviados:** ${stats.total_sent}\n`;
  response += `**Total Respuestas:** ${stats.total_responses}\n`;
  response += `**Total Conversiones:** ${stats.total_conversions}\n\n`;

  if (stats.response_rate) {
    response += `**Tasa de Respuesta:** ${stats.response_rate}%\n`;
    response += `**Tasa de Conversion:** ${stats.conversion_rate}%\n\n`;
  }

  if (Object.keys(stats.by_status).length > 0) {
    response += `**Por Estado:**\n`;
    Object.entries(stats.by_status).forEach(([status, count]) => {
      const statusName = CAMPAIGN_STATUS[status] || status;
      response += `- ${statusName}: ${count}\n`;
    });
  }

  return response.trim();
}

/**
 * Processes owner command for Viper
 * @param {string} command - Command string
 * @returns {Promise<object>}
 */
async function processOwnerCommand(command) {
  const parts = command.toLowerCase().trim().split(' ');
  const agentCommand = parts[0]; // Should be 'viper' or 'outreach'
  const subCommand = parts[1]; // e.g., 'status', 'reactivate', 'list'
  const args = parts.slice(2).join(' '); // Remaining arguments

  if (agentCommand !== 'viper' && agentCommand !== 'outreach') {
    return { success: false, message: 'Invalid agent command.' };
  }

  // Handle commands
  if (subCommand === 'status') {
    return handleStatus();
  }

  if (subCommand === 'reactivate') {
    // Default limit 5 for safety
    const limit = 5;
    const results = await dryRunCampaign(limit);
    return {
      success: true,
      message: `🐍 **Viper Report (Dry Run)**\n\nFound ${results.length} stale leads.\n\n` +
        results.map(r => `👤 ${r.name || 'Unknown'} (${r.car})\n📱 ${r.phone}\n💬 "${r.proposedMessage}"`).join('\n\n') +
        `\n\n*This was a simulation. No messages sent.*`
    };
  }

  // Existing campaign commands
  if (subCommand === 'list' || subCommand === 'campaigns' || subCommand === 'campanas') {
    const result = await getCampaigns();
    if (result.error) {
      return { success: false, message: `Error: ${result.error}` };
    }
    return {
      success: true,
      message: formatCampaignList(result.campaigns),
      data: result.campaigns,
    };
  }

  if (subCommand === 'active' || subCommand === 'running') {
    const result = await getCampaigns('running');
    if (result.error) {
      return { success: false, message: `Error: ${result.error}` };
    }

    if (result.campaigns.length === 0) {
      return { success: true, message: 'Sin campanas activas.' };
    }

    return {
      success: true,
      message: formatCampaignList(result.campaigns),
      data: result.campaigns,
    };
  }

  if (subCommand === 'types' || subCommand === 'tipos') {
    let msg = '**Tipos de Campana:**\n';
    Object.entries(CAMPAIGN_TYPES).forEach(([key, name]) => {
      msg += `- ${key}: ${name}\n`;
    });
    return { success: true, message: msg.trim() };
  }

  // Lead management commands
  if (subCommand === 'leads') {
    const state = args || null;
    const result = await getOutreachLeads({ state, limit: 10 });
    if (!result.success) {
      return { success: false, message: `Error: ${result.error}` };
    }

    if (result.leads.length === 0) {
      return { success: true, message: 'No hay leads registrados.' };
    }

    let msg = `🐍 **LEADS** ${state ? `(${state})` : ''}\n\n`;
    result.leads.forEach((l, i) => {
      msg += `${i + 1}. **${l.contact_name || 'Sin nombre'}**\n`;
      msg += `   ${l.business_name}\n`;
      msg += `   ${l.email} | ${l.city}, ${l.state}\n`;
      msg += `   Estado: ${l.status}\n\n`;
    });

    return { success: true, message: msg.trim() };
  }

  if (subCommand === 'search') {
    const state = args || 'Florida';
    const result = await searchNewLeads(state, 10);
    if (!result.success) {
      return { success: false, message: `Error buscando en Apollo: ${result.error}` };
    }

    let msg = `🔍 **Busqueda Apollo - ${state}**\n\n`;
    msg += `Encontrados: ${result.total || 0} resultados\n\n`;

    if (result.contacts && result.contacts.length > 0) {
      result.contacts.slice(0, 5).forEach((c, i) => {
        msg += `${i + 1}. ${c.name || 'N/A'} @ ${c.organization?.name || 'N/A'}\n`;
      });
    } else {
      msg += 'Sin contactos con detalles visibles (limitacion API free tier)';
    }

    return { success: true, message: msg };
  }

  if (subCommand === 'update' && args) {
    const [leadId, newStatus] = args.split(' ');
    if (!leadId || !newStatus) {
      return { success: false, message: 'Uso: viper update <lead_id> <status>' };
    }

    const result = await updateLeadStatus(leadId, newStatus);
    if (!result.success) {
      return { success: false, message: `Error: ${result.error}` };
    }

    return { success: true, message: `Lead actualizado a: ${newStatus}` };
  }

  return {
    success: false,
    message: `Comando desconocido. Comandos disponibles:
- viper status - Ver estadisticas
- viper leads [estado] - Ver leads
- viper search [estado] - Buscar en Apollo
- viper campaigns - Ver campanas
- viper reactivate - Simular reactivacion`,
  };
}

async function handleStatus() {
  const leadResult = await getLeadStats();
  const campaignResult = await getCampaignStats();

  let message = '🐍 **VIPER - Outreach Agent**\n\n';

  if (leadResult.success) {
    const { stats } = leadResult;
    message += `**LEADS:**\n`;
    message += `Total: ${stats.total}\n`;

    if (Object.keys(stats.byStatus).length > 0) {
      message += `Por estado:\n`;
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        message += `  - ${status}: ${count}\n`;
      });
    }

    if (stats.topStates.length > 0) {
      message += `\nTop estados:\n`;
      stats.topStates.slice(0, 5).forEach(([state, count]) => {
        message += `  - ${state}: ${count}\n`;
      });
    }
  }

  if (campaignResult.stats) {
    message += `\n**CAMPAIGNS:**\n`;
    message += `Total: ${campaignResult.stats.total}\n`;
    message += `Enviados: ${campaignResult.stats.total_sent}\n`;
    message += `Respuestas: ${campaignResult.stats.total_responses}\n`;
  }

  return { success: true, message };
}

/**
 * Event consumer loop
 * @param {number} pollInterval - Milliseconds between polls
 */
async function startEventLoop(pollInterval = 30000) {
  logger.info('Starting Viper event loop...');

  await registerHeartbeat(AGENT_ID, { status: 'inactive', version: '1.0.0' });

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
            case EVENT_TYPES.CAMPAIGN_STARTED:
              // Start a campaign
              if (event.payload.campaignId) {
                response = await updateCampaignStatus(event.payload.campaignId, 'running');
              } else {
                response = { status: 'missing_campaign_id' };
              }
              break;
            default:
              response = { status: 'pending_implementation' };
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

module.exports = {
  AGENT_ID,
  startEventLoop,

  // Owner commands
  processOwnerCommand,

  // Campaign functions
  createCampaign,
  getCampaigns,
  getCampaignStats,
  updateCampaignStatus,
  formatCampaignList,
  formatStats,

  // Lead functions
  getOutreachLeads,
  getLeadStats,
  updateLeadStatus,
  searchNewLeads,

  // Constants
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUS,
};
