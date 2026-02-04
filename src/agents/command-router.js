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
  mktugc: 'marcus',    // User alias
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

// ... (skipping unchanged code) ...

/**
 * Routes a command to the appropriate agent
 * @param {string} rawCommand - Raw command string from owner
 * @param {string} imageUrl - Optional image URL attached to command
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
      result = await processor(`fcc ${subCommand}`, imageUrl);
    } else if (prefix === 'video') {
      // video is a direct command for marcus
      result = await processor(`video ${subCommand}`, imageUrl);
    } else if (prefix === 'selfie' || prefix === 'viral' || prefix === 'ugc' || prefix === 'mktugc') {
      // selfie/viral/ugc are direct commands for marcus (image-to-video)
      const effectivePrefix = prefix === 'mktugc' ? 'ugc' : prefix;
      result = await processor(`${effectivePrefix} ${subCommand}`, imageUrl);
    } else if (prefix === 'txt' || prefix === 'txt2vid' || prefix === 'texto') {
      // txt/txt2vid/texto are direct commands for marcus (text-to-video, no photo)
      result = await processor(`txt ${subCommand}`, imageUrl); // Image ignored but passed for consistency
    } else if (prefix === 'gasto') {
      // gasto is a direct command for sofia
      result = await processor(`add ${subCommand}`, imageUrl);
    } else if (agentId === 'viper') {
      // Explicitly reconstruct Viper commands to include the prefix
      result = await processor(`${prefix} ${subCommand}`, imageUrl);
    } else {
      // Normal routing - pass subcommand or full command WITH IMAGE
      result = await processor(subCommand || 'status', imageUrl);
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
