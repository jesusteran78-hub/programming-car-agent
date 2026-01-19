/**
 * ATLAS Gateway Bridge
 * Provides backward compatibility during migration
 * Allows gradual transition from legacy sales_agent.js to new event-driven architecture
 *
 * Usage:
 * - In sales_agent.js: const bridge = require('./src/gateway/bridge');
 * - bridge.handleLegacyWebhook(req, res, sendToWhapi)
 *
 * @module src/gateway/bridge
 */
const logger = require('../core/logger').child('Bridge');
const { publishEvent, EVENT_TYPES } = require('../core/event-bus');
const { config } = require('../core/config');

// Import legacy handlers
let getAIResponse = null;
let processOwnerCommand = null;
let handleOwnerResponse = null;
let learnNewPrice = null;
let saveConversation = null;

/**
 * Initializes the bridge with legacy handlers
 * @param {object} handlers - Legacy handler functions
 */
function initBridge(handlers) {
  getAIResponse = handlers.getAIResponse;
  processOwnerCommand = handlers.processOwnerCommand;
  handleOwnerResponse = handlers.handleOwnerResponse;
  learnNewPrice = handlers.learnNewPrice;
  saveConversation = handlers.saveConversation;
  logger.info('Bridge initialized with legacy handlers');
}

/**
 * Handles incoming WhatsApp webhook in hybrid mode
 * Publishes events AND processes with legacy handlers
 *
 * @param {object} body - Request body from Whapi
 * @param {Function} sendToWhapi - Function to send messages
 * @returns {Promise<{handled: boolean, response?: string}>}
 */
async function handleWebhook(body, sendToWhapi) {
  try {
    const messages = body.messages;
    if (!messages || messages.length === 0) {
      return { handled: true };
    }

    const incomingMsg = messages[0];
    if (incomingMsg.from_me) {
      return { handled: true };
    }

    const senderNumber = incomingMsg.chat_id;
    const userText = incomingMsg.text?.body || '';
    const userImage = incomingMsg.image?.link || null;
    const userAudio = incomingMsg.voice?.link || incomingMsg.audio?.link || null;

    if (!userText && !userImage && !userAudio) {
      return { handled: true };
    }

    const isOwnerMsg = config.isOwner(senderNumber);

    // Publish event to bus (for future agents to consume)
    if (config.useEventBus) {
      const eventType = isOwnerMsg ? EVENT_TYPES.MESSAGE_OWNER : EVENT_TYPES.MESSAGE_RECEIVED;
      await publishEvent(
        eventType,
        'gateway',
        {
          chatId: senderNumber,
          text: userText,
          image: userImage,
          audio: userAudio,
          timestamp: Date.now(),
          senderType: isOwnerMsg ? 'owner' : 'customer',
        },
        isOwnerMsg ? null : 'alex'
      );
    }

    // Continue with legacy processing
    logger.debug(`Processing message from ${isOwnerMsg ? 'owner' : 'customer'}`);

    // --- OWNER COMMAND ROUTING ---
    if (isOwnerMsg && handleOwnerResponse && processOwnerCommand) {
      // 1. Check price response
      if (userText) {
        const priceHandled = await handleOwnerResponse(sendToWhapi, userText);
        if (priceHandled.handled) {
          logger.info('Owner price response processed');
          return { handled: true };
        }
      }

      // 2. Route through dispatcher
      const dispatchResult = await processOwnerCommand(userText, userImage);
      if (dispatchResult.handled) {
        logger.info(`Routed to ${dispatchResult.department}`);
        await sendToWhapi(senderNumber, dispatchResult.response);
        return { handled: true, response: dispatchResult.response };
      }
    }

    // --- TRAINING MODE ---
    if (userText && userText.toLowerCase().startsWith('aprende:') && learnNewPrice) {
      const learnResult = await learnNewPrice(userText);
      await sendToWhapi(senderNumber, learnResult.message);
      return { handled: true, response: learnResult.message };
    }

    // --- AI RESPONSE ---
    if (getAIResponse) {
      // Save user message
      if (userText && saveConversation) {
        saveConversation(senderNumber, 'user', userText).catch(e => logger.error('DbSaveError', e));
      }

      const aiResponse = await getAIResponse(userText, senderNumber, userImage, sendToWhapi, userAudio);

      if (aiResponse) {
        await sendToWhapi(senderNumber, aiResponse);

        // Save assistant response
        if (saveConversation) {
          saveConversation(senderNumber, 'assistant', aiResponse).catch(e => logger.error('DbSaveError', e));
        }

        return { handled: true, response: aiResponse };
      }
    }

    return { handled: true };
  } catch (error) {
    logger.error('Bridge webhook error:', error);
    return { handled: false, error: error.message };
  }
}

/**
 * Creates Express middleware for the bridge
 * Can be used in sales_agent.js to gradually migrate
 */
function createMiddleware() {
  return async (req, res, next) => {
    // Only handle POST /webhook
    if (req.method !== 'POST' || req.path !== '/webhook') {
      return next();
    }

    // Bridge requires sendToWhapi to be available
    if (!req.app.locals.sendToWhapi) {
      logger.warn('sendToWhapi not available in app.locals');
      return next();
    }

    const result = await handleWebhook(req.body, req.app.locals.sendToWhapi);

    if (result.handled) {
      return res.sendStatus(200);
    }

    next();
  };
}

module.exports = {
  initBridge,
  handleWebhook,
  createMiddleware,
};
