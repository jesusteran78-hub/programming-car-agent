/**
 * ATLAS Command Router
 * Central dispatcher for all owner commands
 *
 * Recognizes commands by prefix and routes to appropriate agent
 *
 * @module src/agents/command-router
 */
const logger = require('../core/logger').child('CmdRouter');
const healthMonitor = require('../core/health-monitor');

// Import all agents
const alex = require('./alex');
const marcus = require('./marcus');
const diego = require('./diego');
const sofia = require('./sofia');
const viper = require('./viper');

/**
 * Command prefixes mapped to agents
 */
const COMMAND_PREFIXES = {
  // Sales (Alex)
  ventas: 'alex',
  sales: 'alex',
  alex: 'alex',

  // Marketing (Marcus)
  mkt: 'marcus',
  marketing: 'marcus',
  marcus: 'marcus',
  video: 'marcus',
  selfie: 'marcus',
  viral: 'marcus',
  ugc: 'marcus',
  txt: 'marcus',       // TEXT-TO-VIDEO (no photo)
  txt2vid: 'marcus',   // TEXT-TO-VIDEO alias
  texto: 'marcus',     // TEXT-TO-VIDEO Spanish alias

  // Operations (Diego)
  ops: 'diego',
  operations: 'diego',
  diego: 'diego',
  fcc: 'diego',

  // Finance (Sofia)
  fin: 'sofia',
  finanzas: 'sofia',
  finance: 'sofia',
  sofia: 'sofia',
  gasto: 'sofia',

  // Outreach (Viper)
  outreach: 'viper',
  campaign: 'viper',
  viper: 'viper',
};

/**
 * Agent processors
 */
const AGENT_PROCESSORS = {
  alex: async (command) => {
    // Alex doesn't have processOwnerCommand yet, return help
    return {
      success: true,
      message:
        '**Alex (Sales) Commands:**\n' +
        '- ventas status - Estado de ventas\n' +
        '- ventas leads - Leads activos\n' +
        '- ventas today - Actividad de hoy',
    };
  },
  marcus: marcus.processOwnerCommand,
  diego: diego.processOwnerCommand,
  sofia: sofia.processOwnerCommand,
  viper: viper.processOwnerCommand,
};

/**
 * Shows help for all agents
 * @returns {string}
 */
function getHelpMessage() {
  return `**ATLAS - Sistema de Agentes**

**Comandos disponibles:**

**Alex (Ventas):**
- ventas status - Estado de ventas

**Marcus (Marketing):**
- mkt ugc [idea] - UGC Selfie viral (pide foto)
- mkt txt [idea] - TEXT-TO-VIDEO (SIN foto)
- mkt video [idea] - Video cinematico
- mkt viral [idea] - Hook viral TikTok
- mkt [estilo] [idea] | [url] - Usar imagen URL
- mkt status - Estado de videos
- mkt pendiente - Ver video esperando foto
- mkt cancelar - Cancelar video pendiente

**Diego (Operaciones):**
- ops status - Estado de operaciones
- ops today - Trabajos de hoy
- ops pending - Trabajos pendientes
- fcc [year] [make] [model] - Buscar FCC ID

**Sofia (Finanzas):**
- fin status - Resumen del mes
- fin today - Gastos de hoy
- fin add [monto] [cat] [desc] - Registrar gasto
- fin categorias - Ver categorias

**Viper (Outreach):**
- outreach status - Estadisticas
- outreach list - Todas las campanas
- outreach active - Campanas activas

**General:**
- help / ayuda - Esta ayuda
- status - Estado de todos los agentes
- health / salud - Estado de servicios (WhatsApp, OpenAI, DB)`;
}

/**
 * Gets status from all agents
 * @returns {Promise<object>}
 */
async function getAllAgentStatus() {
  const results = {};

  try {
    // Diego status
    const diegoStatus = await diego.getOpsStatus();
    results.diego = {
      agent: 'Diego (Operations)',
      status: 'active',
      todayJobs: diegoStatus.today?.total || 0,
      pendingJobs: diegoStatus.pending?.total || 0,
    };
  } catch (e) {
    results.diego = { agent: 'Diego', status: 'error', error: e.message };
  }

  try {
    // Sofia status
    const sofiaStatus = await sofia.getMonthlyExpenses();
    results.sofia = {
      agent: 'Sofia (Finance)',
      status: 'active',
      monthlyExpenses: sofiaStatus.total || 0,
      expenseCount: sofiaStatus.expenses?.length || 0,
    };
  } catch (e) {
    results.sofia = { agent: 'Sofia', status: 'error', error: e.message };
  }

  try {
    // Viper status
    const viperStatus = await viper.getCampaignStats();
    results.viper = {
      agent: 'Viper (Outreach)',
      status: 'active',
      totalCampaigns: viperStatus.stats?.total || 0,
      totalSent: viperStatus.stats?.total_sent || 0,
    };
  } catch (e) {
    results.viper = { agent: 'Viper', status: 'error', error: e.message };
  }

  // Marcus - just check if loaded
  results.marcus = {
    agent: 'Marcus (Marketing)',
    status: 'active',
    videoGeneration: 'ready',
  };

  // Alex - just check if loaded
  results.alex = {
    agent: 'Alex (Sales)',
    status: 'active',
    whatsapp: 'connected',
  };

  return results;
}

/**
 * Formats all agent status for WhatsApp
 * @param {object} status - Status from getAllAgentStatus
 * @returns {string}
 */
function formatAllStatus(status) {
  let msg = '**ATLAS SYSTEM STATUS**\n\n';

  // Alex
  msg += `**Alex (Sales):** ${status.alex?.status || 'unknown'}\n`;

  // Marcus
  msg += `**Marcus (Marketing):** ${status.marcus?.status || 'unknown'}\n`;

  // Diego
  if (status.diego) {
    msg += `**Diego (Operations):** ${status.diego.status}\n`;
    msg += `   Hoy: ${status.diego.todayJobs} trabajos | Pendientes: ${status.diego.pendingJobs}\n`;
  }

  // Sofia
  if (status.sofia) {
    msg += `**Sofia (Finance):** ${status.sofia.status}\n`;
    msg += `   Gastos mes: $${status.sofia.monthlyExpenses?.toFixed(2) || '0.00'}\n`;
  }

  // Viper
  if (status.viper) {
    msg += `**Viper (Outreach):** ${status.viper.status}\n`;
    msg += `   Campanas: ${status.viper.totalCampaigns} | Enviados: ${status.viper.totalSent}\n`;
  }

  return msg.trim();
}

/**
 * Routes a command to the appropriate agent
 * @param {string} rawCommand - Raw command string from owner
 * @returns {Promise<object>}
 */
async function routeCommand(rawCommand, imageUrl = null) {
  const command = rawCommand.trim().toLowerCase();

  logger.info(`Routing command: ${command} ${imageUrl ? '(with image)' : ''}`);

  // 0. Intercept images for Marcus (Pending Photo Jobs)
  if (imageUrl && marcus.hasPendingPhotoJob()) {
    logger.info('Intercepting photo for Marcus pending job');
    const photoResult = await marcus.handleIncomingPhoto(imageUrl);
    if (photoResult.handled) {
      return {
        success: true,
        message: photoResult.message,
        agent: 'marcus',
      };
    }
  }

  // Help command
  if (command === 'help' || command === 'ayuda' || command === '?') {
    return {
      success: true,
      message: getHelpMessage(),
      agent: 'system',
    };
  }

  // Global status
  if (command === 'status' || command === 'estado') {
    const status = await getAllAgentStatus();
    return {
      success: true,
      message: formatAllStatus(status),
      agent: 'system',
      data: status,
    };
  }

  // Health check command
  if (command === 'health' || command === 'salud') {
    const healthResult = await healthMonitor.runHealthChecks();
    return {
      success: true,
      message: healthMonitor.formatHealthReport(),
      agent: 'system',
      data: healthResult,
    };
  }

  // Find matching prefix
  const parts = command.split(/\s+/);
  const prefix = parts[0];
  const subCommand = parts.slice(1).join(' ');

  // Check if it's a known prefix
  const agentId = COMMAND_PREFIXES[prefix];

  if (!agentId) {
    // Unknown command - show help
    return {
      success: false,
      message: `Comando no reconocido: "${prefix}"\n\nEscribe "help" para ver los comandos disponibles.`,
      agent: 'system',
    };
  }

  // Get the processor for this agent
  const processor = AGENT_PROCESSORS[agentId];

  if (!processor) {
    return {
      success: false,
      message: `Agente "${agentId}" no tiene procesador de comandos.`,
      agent: agentId,
    };
  }

  try {
    let result;

    // Special handling for some commands
    if (prefix === 'fcc') {
      // fcc is a direct command, not a prefix
      result = await processor(`fcc ${subCommand}`);
    } else if (prefix === 'video') {
      // video is a direct command for marcus
      result = await processor(`video ${subCommand}`);
    } else if (prefix === 'selfie' || prefix === 'viral' || prefix === 'ugc') {
      // selfie/viral/ugc are direct commands for marcus (image-to-video)
      result = await processor(`${prefix} ${subCommand}`);
    } else if (prefix === 'txt' || prefix === 'txt2vid' || prefix === 'texto') {
      // txt/txt2vid/texto are direct commands for marcus (text-to-video, no photo)
      result = await processor(`txt ${subCommand}`);
    } else if (prefix === 'gasto') {
      // gasto is a direct command for sofia
      result = await processor(`add ${subCommand}`);
    } else if (agentId === 'viper') {
      // Explicitly reconstruct Viper commands to include the prefix
      // because viper agent expects the FULL command string
      result = await processor(`${prefix} ${subCommand}`);
    } else {
      // Normal routing - pass subcommand or full command
      result = await processor(subCommand || 'status');
    }

    return { ...result, agent: agentId };

  } catch (error) {
    logger.error(`Error processing command for ${agentId}:`, error);
    return {
      success: false,
      message: `Error en agente ${agentId}: ${error.message}`,
      agent: agentId,
    };
  }
}

/**
 * Checks if a message is an owner command
 * @param {string} message - Message text
 * @returns {boolean}
 */
function isOwnerCommand(message) {
  const text = message.trim().toLowerCase();

  // Check for help
  if (text === 'help' || text === 'ayuda' || text === '?') {
    return true;
  }

  // Check for status
  if (text === 'status' || text === 'estado') {
    return true;
  }

  // Check for health
  if (text === 'health' || text === 'salud') {
    return true;
  }

  // Check for known prefixes
  const firstWord = text.split(/\s+/)[0];
  return COMMAND_PREFIXES.hasOwnProperty(firstWord);
}

module.exports = {
  routeCommand,
  isOwnerCommand,
  getHelpMessage,
  getAllAgentStatus,
  formatAllStatus,
  COMMAND_PREFIXES,
};
