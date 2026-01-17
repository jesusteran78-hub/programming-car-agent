/**
 * Agent Dispatcher
 * Routes owner commands to the appropriate department agent
 */
const { DEPARTMENTS, detectDepartment, getDepartmentsHelp } = require('./index');
const { processVentasCommand } = require('./ventas_agent');
const { processMarketingCommand, handlePendingVideoImage } = require('./marketing_agent');
const { processOperacionesCommand } = require('./operaciones_agent');
const { processContabilidadCommand } = require('./contabilidad_agent');
const logger = require('../logger');

/**
 * Process a command from the owner
 * @param {string} message - Full message from owner
 * @param {string|null} imageUrl - Optional image URL from WhatsApp
 * @returns {Promise<{handled: boolean, response?: string, department?: string}>}
 */
async function processOwnerCommand(message, imageUrl = null) {
  const lowerMsg = message.toLowerCase().trim();

  // PRIMERO: Si solo hay imagen (sin texto), verificar si hay video pendiente esperando foto
  if (imageUrl && (!message || message.trim() === '')) {
    const pendingResult = await handlePendingVideoImage(imageUrl);
    if (pendingResult.handled) {
      logger.info('📸 Imagen procesada para video pendiente');
      return {
        handled: true,
        response: pendingResult.response,
        department: 'marketing',
      };
    }
    // Si no hay video pendiente, la imagen no se maneja aquí
    return { handled: false };
  }

  // Help command
  if (lowerMsg === 'help' || lowerMsg === 'ayuda' || lowerMsg === '?') {
    return {
      handled: true,
      response: getDepartmentsHelp(),
      department: 'system',
    };
  }

  // Direct department routing (e.g., "ventas status", "marketing publica")
  let department = null;
  let subCommand = message;

  // Check for department prefix
  for (const key of Object.keys(DEPARTMENTS)) {
    if (lowerMsg.startsWith(key)) {
      department = key;
      subCommand = message.substring(key.length).trim();
      break;
    }
  }

  // Check for shorthand prefixes
  const shortcuts = {
    'ops': 'operaciones',
    'conta': 'contabilidad',
    'mkt': 'marketing',
  };

  for (const [shortcut, fullName] of Object.entries(shortcuts)) {
    if (lowerMsg.startsWith(shortcut + ' ') || lowerMsg === shortcut) {
      department = fullName;
      subCommand = message.substring(shortcut.length).trim();
      break;
    }
  }

  // If no explicit department, try to detect from keywords
  if (!department) {
    department = detectDepartment(message);
    // For keyword detection, pass full message as subcommand
    subCommand = message;
  }

  // Route to appropriate agent
  if (department) {
    try {
      let response;

      switch (department) {
        case 'ventas':
          response = await processVentasCommand(subCommand);
          break;
        case 'marketing':
          response = await processMarketingCommand(subCommand, imageUrl);
          break;
        case 'operaciones':
          response = await processOperacionesCommand(subCommand);
          break;
        case 'contabilidad':
          response = await processContabilidadCommand(subCommand);
          break;
        default:
          return { handled: false };
      }

      logger.info(`📬 Dispatcher routed to ${department}: "${subCommand.substring(0, 50)}..."`);

      return {
        handled: true,
        response,
        department,
      };
    } catch (error) {
      logger.error(`Dispatcher error for ${department}:`, error);
      return {
        handled: true,
        response: `❌ Error en ${DEPARTMENTS[department]?.name || department}: ${error.message}`,
        department,
      };
    }
  }

  // Not handled by any department
  return { handled: false };
}

/**
 * Get a quick status from all departments
 * @returns {Promise<string>}
 */
async function getGlobalStatus() {
  const ventasStatus = await processVentasCommand('status');
  const opsStatus = await processOperacionesCommand('status');
  const contaStatus = await processContabilidadCommand('status');

  return `🏢 **RESUMEN GLOBAL**\n\n` +
    `─────────────────\n` +
    `${ventasStatus}\n\n` +
    `─────────────────\n` +
    `${opsStatus}\n\n` +
    `─────────────────\n` +
    `${contaStatus}`;
}

module.exports = {
  processOwnerCommand,
  getGlobalStatus,
};
