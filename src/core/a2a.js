/**
 * A2A (Agent-to-Agent) Communication Module
 * Real-time communication channel between Claude and Gemini via Supabase
 *
 * @module src/core/a2a
 */
const { getSupabase } = require('./supabase');
const logger = require('./logger').child('A2A');

/**
 * Agent identifiers
 */
const AGENTS = {
  CLAUDE: 'claude',
  GEMINI: 'gemini',
};

/**
 * Message types for A2A communication
 */
const MESSAGE_TYPES = {
  CHAT: 'chat',           // General conversation
  TASK: 'task',           // Task delegation
  RESULT: 'result',       // Task result
  QUESTION: 'question',   // Question for the other agent
  ANSWER: 'answer',       // Answer to a question
  HANDSHAKE: 'handshake', // Protocol acknowledgment
};

/**
 * Sends a message to another agent
 * @param {string} from - Sender agent (AGENTS.CLAUDE or AGENTS.GEMINI)
 * @param {string} to - Recipient agent
 * @param {string} type - Message type (MESSAGE_TYPES)
 * @param {string} content - Message content
 * @param {object} [metadata={}] - Optional metadata
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendMessage(from, to, type, content, metadata = {}) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('a2a_messages')
      .insert({
        from_agent: from,
        to_agent: to,
        message_type: type,
        content,
        metadata,
        read: false,
      })
      .select('id')
      .single();

    if (error) {
      // Table might not exist, try to create it
      if (error.code === '42P01') {
        logger.warn('A2A table does not exist. Creating...');
        return { success: false, error: 'A2A table needs to be created in Supabase' };
      }
      return { success: false, error: error.message };
    }

    logger.info(`[${from}→${to}] ${type}: ${content.substring(0, 50)}...`);
    return { success: true, messageId: data.id };
  } catch (e) {
    logger.error('Failed to send A2A message:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Gets unread messages for an agent
 * @param {string} agentId - Agent receiving messages
 * @param {number} [limit=10] - Max messages to fetch
 * @returns {Promise<{success: boolean, messages?: object[], error?: string}>}
 */
async function getMessages(agentId, limit = 10) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('a2a_messages')
      .select('*')
      .eq('to_agent', agentId)
      .eq('read', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messages: data || [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Marks a message as read
 * @param {string} messageId - Message ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function markAsRead(messageId) {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('a2a_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Gets conversation history between agents
 * @param {number} [limit=20] - Max messages to fetch
 * @returns {Promise<{success: boolean, messages?: object[], error?: string}>}
 */
async function getConversationHistory(limit = 20) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('a2a_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messages: (data || []).reverse() };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ==========================================
// CONVENIENCE FUNCTIONS FOR EACH AGENT
// ==========================================

/**
 * Claude sends a message to Gemini
 */
async function claudeToGemini(type, content, metadata = {}) {
  return sendMessage(AGENTS.CLAUDE, AGENTS.GEMINI, type, content, metadata);
}

/**
 * Gemini sends a message to Claude
 */
async function geminiToClaude(type, content, metadata = {}) {
  return sendMessage(AGENTS.GEMINI, AGENTS.CLAUDE, type, content, metadata);
}

/**
 * Claude checks for messages from Gemini
 */
async function claudeGetMessages() {
  return getMessages(AGENTS.CLAUDE);
}

/**
 * Gemini checks for messages from Claude
 */
async function geminiGetMessages() {
  return getMessages(AGENTS.GEMINI);
}

/**
 * Sends a handshake to establish connection
 * @param {string} fromAgent - Agent sending handshake
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendHandshake(fromAgent) {
  const toAgent = fromAgent === AGENTS.CLAUDE ? AGENTS.GEMINI : AGENTS.CLAUDE;
  return sendMessage(
    fromAgent,
    toAgent,
    MESSAGE_TYPES.HANDSHAKE,
    `[A2A] ${fromAgent} is online and ready for collaboration.`,
    { timestamp: new Date().toISOString(), protocol: '1.0.0' }
  );
}

module.exports = {
  AGENTS,
  MESSAGE_TYPES,
  sendMessage,
  getMessages,
  markAsRead,
  getConversationHistory,
  claudeToGemini,
  geminiToClaude,
  claudeGetMessages,
  geminiGetMessages,
  sendHandshake,
};
