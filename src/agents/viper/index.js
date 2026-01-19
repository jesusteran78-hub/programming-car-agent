/**
 * ATLAS Agent: Viper (Outreach)
 * Handles outbound marketing campaigns and lead generation
 *
 * STATUS: Placeholder with basic campaign management
 *
 * @module src/agents/viper
 */
require('dotenv').config();

const logger = require('../../core/logger').child('Viper');
const { getSupabase } = require('../../core/supabase');
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
  const cmd = command.toLowerCase().trim();

  // viper status / stats
  if (cmd === 'status' || cmd === 'stats' || cmd === 'viper' || cmd === 'outreach') {
    const result = await getCampaignStats();
    if (result.error) {
      return { success: false, message: `Error: ${result.error}` };
    }
    return {
      success: true,
      message: formatStats(result.stats),
      data: result.stats,
    };
  }

  // viper list / campaigns
  if (cmd === 'list' || cmd === 'campaigns' || cmd === 'campanas') {
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

  // viper active
  if (cmd === 'active' || cmd === 'running') {
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

  // viper types
  if (cmd === 'types' || cmd === 'tipos') {
    let msg = '**Tipos de Campana:**\n';
    Object.entries(CAMPAIGN_TYPES).forEach(([key, name]) => {
      msg += `- ${key}: ${name}\n`;
    });
    return { success: true, message: msg.trim() };
  }

  // Unknown command
  return {
    success: false,
    message:
      '**Viper Commands:**\n' +
      '- outreach status - Estadisticas\n' +
      '- outreach list - Todas las campanas\n' +
      '- outreach active - Campanas activas\n' +
      '- outreach types - Tipos de campana',
  };
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

  // Constants
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUS,
};
