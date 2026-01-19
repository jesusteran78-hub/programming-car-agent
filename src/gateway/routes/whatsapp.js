/**
 * ATLAS Gateway - WhatsApp Webhook Routes
 * Receives messages from Whapi.cloud and publishes to Event Bus
 *
 * @module src/gateway/routes/whatsapp
 */
const express = require('express');
const router = express.Router();

const { config } = require('../../core/config');
const logger = require('../../core/logger').child('WhatsApp');
const { publishEvent, EVENT_TYPES } = require('../../core/event-bus');

// Import legacy handlers for bridge pattern
// These will be removed once agents are fully migrated
let legacyHandler = null;

/**
 * Registers legacy message handler for bridge pattern
 * @param {Function} handler - Function that processes messages in legacy mode
 */
function setLegacyHandler(handler) {
  legacyHandler = handler;
}

/**
 * Extracts message data from Whapi webhook payload
 * @param {object} payload - Raw webhook payload
 * @returns {object|null} Normalized message data or null if invalid
 */
function extractMessageData(payload) {
  const messages = payload.messages;
  if (!messages || messages.length === 0) return null;

  const msg = messages[0];

  // Ignore our own messages
  if (msg.from_me) return null;

  const data = {
    chatId: msg.chat_id,
    messageId: msg.id,
    text: msg.text?.body || '',
    image: msg.image?.link || null,
    audio: msg.voice?.link || msg.audio?.link || null,
    timestamp: msg.timestamp || Date.now(),
    rawMessage: msg,
  };

  // Must have at least one content type
  if (!data.text && !data.image && !data.audio) return null;

  return data;
}

/**
 * Checks if sender is the owner
 * @param {string} chatId - WhatsApp chat ID
 * @returns {boolean}
 */
function isOwner(chatId) {
  return chatId === config.ownerPhone;
}

/**
 * Sends message via Whapi API
 * @param {string} chatId - Recipient chat ID
 * @param {string} text - Message text
 * @returns {Promise<object>}
 */
async function sendMessage(chatId, text) {
  const url = 'https://gate.whapi.cloud/messages/text';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${config.whapiToken}`,
      },
      body: JSON.stringify({ to: chatId, body: text }),
    });

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error('Failed to send message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main webhook endpoint for Whapi
 * POST /webhook
 */
router.post('/', async (req, res) => {
  try {
    // Extract message data
    const messageData = extractMessageData(req.body);
    if (!messageData) {
      return res.sendStatus(200);
    }

    const { chatId, text, image, audio } = messageData;
    const senderType = isOwner(chatId) ? 'owner' : 'customer';

    logger.info(`Message from ${senderType} (${chatId.substring(0, 8)}...): ${text || (audio ? '[AUDIO]' : '[IMAGE]')}`);

    // Determine event type based on sender
    const eventType = isOwner(chatId) ? EVENT_TYPES.MESSAGE_OWNER : EVENT_TYPES.MESSAGE_RECEIVED;

    // Publish event to Event Bus
    const eventResult = await publishEvent(
      eventType,
      'gateway',
      {
        chatId,
        text,
        image,
        audio,
        timestamp: messageData.timestamp,
        senderType,
      },
      senderType === 'owner' ? null : 'alex' // Route customer messages to Alex
    );

    if (!eventResult.success) {
      logger.error('Failed to publish event:', eventResult.error);
    }

    // BRIDGE PATTERN: Also call legacy handler if registered
    // This allows gradual migration without breaking existing functionality
    if (legacyHandler) {
      await legacyHandler(req, res, sendMessage);
      return; // Legacy handler sends response
    }

    // TODO: In full event-driven mode, we'd respond immediately
    // and let agents process events asynchronously
    res.sendStatus(200);
  } catch (error) {
    logger.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
module.exports.setLegacyHandler = setLegacyHandler;
module.exports.sendMessage = sendMessage;
module.exports.isOwner = isOwner;
