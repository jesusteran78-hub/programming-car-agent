/**
 * ATLAS Agent: Alex (Sales)
 * Event-driven sales agent that handles customer conversations
 *
 * @module src/agents/alex
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { getOpenAI, chat, transcribe } = require('../../core/openai');
const { getSupabase } = require('../../core/supabase');
const { config } = require('../../core/config');
const logger = require('../../core/logger').child('Alex');
const {
  consumeEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  registerHeartbeat,
  EVENT_TYPES,
} = require('../../core/event-bus');

const { getPrompt } = require('./prompts');
const { getTools } = require('./tools');
const { executeTool } = require('./handlers');

const AGENT_ID = 'alex';
const MAX_TOOL_STEPS = 5;

/**
 * Loads the training manual if it exists
 * @returns {string}
 */
function loadTrainingManual() {
  try {
    const manualPath = path.join(__dirname, '..', '..', '..', 'alex_training.md');
    return fs.readFileSync(manualPath, 'utf8');
  } catch (e) {
    logger.warn('No training manual found (alex_training.md)');
    return '';
  }
}

/**
 * Gets or creates a lead for the sender
 * @param {string} chatId - WhatsApp chat ID
 * @returns {Promise<object>}
 */
async function getOrCreateLead(chatId) {
  const supabase = getSupabase();

  // Try to find existing lead
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id, name, vin, make, model, year, engine, pipeline_status')
    .eq('phone', chatId)
    .limit(1)
    .single();

  if (existingLead) {
    return existingLead;
  }

  // Check for international numbers (spam filtering)
  const isInternational = chatId.includes('@s.whatsapp.net') && !chatId.startsWith('1'); // Assuming +1 for US/Canada

  // Create new lead
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      phone: chatId,
      name: 'WhatsApp User',
      pipeline_status: isInternational ? 'INTERNATIONAL' : 'NUEVO',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating lead:', error);
    return null;
  }

  if (isInternational) {
    logger.info(`New INTERNATIONAL lead detected (ignoring): ${newLead.id} (${chatId})`);
    // OPTIONAL: You could return null here to completely ignore them,
    // but tagging them allows us to keep a record without processing logic.
  } else {
    logger.info(`New lead created: ${newLead.id}`);
  }

  return newLead;
}

/**
 * Checks for spam (duplicate messages within 60 seconds)
 * @param {string} leadId - Lead ID
 * @param {string} message - Message content
 * @returns {Promise<boolean>}
 */
async function isSpam(leadId, message) {
  // TEMPORARILY DISABLED FOR TESTING
  // TODO: Remove this return to re-enable spam protection
  return false;

  if (!message) return false;

  const supabase = getSupabase();
  const { data: lastMsg } = await supabase
    .from('conversations')
    .select('content, created_at')
    .eq('lead_id', leadId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastMsg && lastMsg.content === message) {
    const timeDiff = Date.now() - new Date(lastMsg.created_at).getTime();
    if (timeDiff < 60000) {
      logger.info(`Spam detected (ignoring): ${message.substring(0, 30)}`);
      return true;
    }
  }

  return false;
}

/**
 * Saves a message to the conversation history
 * @param {string} leadId - Lead ID
 * @param {string} role - Message role (user/assistant/system)
 * @param {string} content - Message content
 */
async function saveMessage(leadId, role, content) {
  const supabase = getSupabase();
  await supabase.from('conversations').insert({
    lead_id: leadId,
    role,
    content,
  });
}

/**
 * Gets conversation history for a lead
 * @param {string} leadId - Lead ID
 * @param {number} limit - Max messages to retrieve
 * @returns {Promise<Array>}
 */
async function getConversationHistory(leadId, limit = 10) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('conversations')
    .select('role, content')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // +1 because we skip the most recent

  // Skip the most recent (we add it manually with image if present)
  const cleanHistory = data ? data.slice(1) : [];
  return cleanHistory.reverse();
}

/**
 * Processes a message and generates AI response
 * @param {object} payload - Event payload
 * @param {Function} sendMessage - Function to send WhatsApp messages
 * @returns {Promise<string|null>}
 */
async function processMessage(payload, sendMessage) {
  const { chatId, text, image, audio, senderType } = payload;
  const isOwner = senderType === 'owner';

  try {
    // Get or create lead
    const lead = await getOrCreateLead(chatId);
    if (!lead) {
      return 'Lo siento, hubo un error al procesar tu solicitud.';
    }

    // IGNORE INTERNATIONAL TRAFFIC (Anti-Spam)
    if (lead.pipeline_status === 'INTERNATIONAL') {
      logger.info(`Ignoring message from INTERNATIONAL lead: ${lead.id}`);
      return null;
    }

    // Handle audio transcription
    let userMessage = text;
    if (audio && !text) {
      const transcription = await transcribe(audio, 'es');
      userMessage = transcription || '(Audio ininteligible)';
      logger.info(`Audio transcribed: "${userMessage.substring(0, 50)}..."`);
    }

    // Check for spam
    if (await isSpam(lead.id, userMessage)) {
      return null; // Silent ignore
    }

    // Save user message
    const messageContent = userMessage || `[IMAGEN: ${image || 'Sin Link'}]`;
    await saveMessage(lead.id, 'user', messageContent);

    // Get conversation history
    const history = await getConversationHistory(lead.id);

    // Build context for prompt
    const context = {
      vin: lead.vin || 'NO DISPONIBLE',
      year: lead.year || '',
      make: lead.make || '',
      model: lead.model || '',
      engine: lead.engine || '',
      status: lead.pipeline_status || 'NUEVO',
    };

    // Load training manual and get prompt
    const trainingManual = loadTrainingManual();
    const systemPrompt = getPrompt(isOwner, context, trainingManual);

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    // Add current message (with image if present)
    if (image) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage || 'Esta es una foto de mi vehículo o del VIN. Busca el VIN (17 caracteres) y usa lookup_vin si lo encuentras.',
          },
          { type: 'image_url', image_url: { url: image } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    // Tool calling loop
    const openai = getOpenAI();
    const tools = getTools();
    let finalReply = '';
    let steps = 0;

    while (steps < MAX_TOOL_STEPS) {
      steps++;

      const completion = await openai.chat.completions.create({
        messages,
        model: 'gpt-4o',
        tools,
        tool_choice: 'auto',
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // If no tool calls, we have the final response
      if (!message.tool_calls) {
        finalReply = message.content;
        break;
      }

      // Process tool calls
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        logger.info(`Tool call: ${toolCall.function.name}(${JSON.stringify(args).substring(0, 100)})`);

        const result = await executeTool(toolCall.function.name, args, {
          leadId: lead.id,
          senderNumber: chatId,
          notificationCallback: sendMessage,
          leadData: lead,
        });

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
      }
    }

    // Save assistant response
    if (finalReply) {
      await saveMessage(lead.id, 'assistant', finalReply);
    }

    return finalReply;
  } catch (error) {
    logger.error('Error processing message:', error);
    return 'Lo siento, hubo un error al procesar tu solicitud.';
  }
}

/**
 * Event consumer loop - processes incoming messages from Event Bus
 * @param {Function} sendMessage - Function to send WhatsApp messages
 * @param {number} pollInterval - Milliseconds between polls
 */
async function startEventLoop(sendMessage, pollInterval = 5000) {
  logger.info('Starting Alex event loop...');

  // Register heartbeat
  await registerHeartbeat(AGENT_ID, { status: 'running', version: '2.0.0' });

  const processEvents = async () => {
    try {
      // Consume pending events targeted at Alex
      const result = await consumeEvents(AGENT_ID, [EVENT_TYPES.MESSAGE_RECEIVED], 5);

      if (!result.success || !result.data.length) {
        return;
      }

      for (const event of result.data) {
        logger.info(`Processing event: ${event.id}`);

        // Mark as processing
        await markEventProcessing(event.id, AGENT_ID);

        try {
          // Process the message
          const response = await processMessage(event.payload, sendMessage);

          if (response) {
            // Send response via WhatsApp
            await sendMessage(event.payload.chatId, response);
          }

          // Mark as completed
          await markEventCompleted(event.id, AGENT_ID, { response });
        } catch (error) {
          logger.error(`Error processing event ${event.id}:`, error);
          await markEventFailed(event.id, AGENT_ID, error.message);
        }
      }

      // Update heartbeat
      await registerHeartbeat(AGENT_ID, { lastProcessed: new Date().toISOString() });
    } catch (error) {
      logger.error('Event loop error:', error);
    }
  };

  // Initial processing
  await processEvents();

  // Start polling
  setInterval(processEvents, pollInterval);
}

/**
 * Legacy compatibility - direct message processing (no event bus)
 * @param {string} userMessage - User message text
 * @param {string} senderNumber - WhatsApp sender number
 * @param {string} userImage - Image URL
 * @param {Function} notificationCallback - Function to send notifications
 * @param {string} userAudio - Audio URL
 * @returns {Promise<string|null>}
 */
async function getAIResponse(userMessage, senderNumber, userImage = null, notificationCallback = null, userAudio = null) {
  const isOwner = config.isOwner(senderNumber);

  return processMessage(
    {
      chatId: senderNumber,
      text: userMessage,
      image: userImage,
      audio: userAudio,
      senderType: isOwner ? 'owner' : 'customer',
    },
    notificationCallback
  );
}

module.exports = {
  AGENT_ID,
  processMessage,
  startEventLoop,
  getAIResponse, // Legacy compatibility
};
