/**
 * ATLAS Event Bus
 * Database-backed event system for agent communication
 * Agents communicate via events stored in Supabase, not direct imports
 *
 * @module src/core/event-bus
 */
const { getSupabase, insert, update, select } = require('./supabase');
const logger = require('./logger');

/**
 * Event types used in ATLAS
 */
const EVENT_TYPES = {
  // Gateway events
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_OWNER: 'message.owner',
  MESSAGE_SEND: 'message.send',

  // Alex (Sales) events
  PRICE_REQUESTED: 'price.requested',
  PRICE_APPROVED: 'price.approved',
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',

  // Marcus (Marketing) events
  VIDEO_REQUESTED: 'video.requested',
  VIDEO_COMPLETED: 'video.completed',
  VIDEO_FAILED: 'video.failed',
  SOCIAL_PUBLISH: 'social.publish',
  SOCIAL_PUBLISHED: 'social.published',

  // Diego (Operations) events
  JOB_SCHEDULED: 'job.scheduled',
  JOB_COMPLETED: 'job.completed',
  FCC_LOOKUP: 'fcc.lookup',

  // Sofia (Finance) events
  PAYMENT_RECEIVED: 'payment.received',
  INVOICE_CREATED: 'invoice.created',
  EXPENSE_RECORDED: 'expense.recorded',

  // Viper (Outreach) events
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',

  // System events
  AGENT_HEARTBEAT: 'agent.heartbeat',
  AGENT_ERROR: 'agent.error',
};

/**
 * Event status values
 */
const EVENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Publishes an event to the event bus
 * @param {string} eventType - Type of event (use EVENT_TYPES)
 * @param {string} sourceAgent - Agent publishing the event
 * @param {object} payload - Event data
 * @param {string} [targetAgent=null] - Specific target agent (null = broadcast)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function publishEvent(eventType, sourceAgent, payload, targetAgent = null) {
  try {
    const result = await insert('events', {
      event_type: eventType,
      source_agent: sourceAgent,
      target_agent: targetAgent,
      payload,
      status: EVENT_STATUS.PENDING,
    });

    if (result.success) {
      logger.debug(`Event published: ${eventType}`, {
        source: sourceAgent,
        target: targetAgent,
        eventId: result.data?.id,
      });
    }

    return result;
  } catch (e) {
    logger.error('Failed to publish event', e);
    return { success: false, error: e.message };
  }
}

/**
 * Consumes pending events for an agent
 * @param {string} agentId - Agent consuming events
 * @param {string[]} [eventTypes=[]] - Filter by event types (empty = all)
 * @param {number} [limit=10] - Max events to consume
 * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
 */
async function consumeEvents(agentId, eventTypes = [], limit = 10) {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('events')
      .select('*')
      .eq('status', EVENT_STATUS.PENDING)
      .or(`target_agent.eq.${agentId},target_agent.is.null`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (eventTypes.length > 0) {
      query = query.in('event_type', eventTypes);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (e) {
    logger.error('Failed to consume events', e);
    return { success: false, error: e.message };
  }
}

/**
 * Marks an event as being processed
 * @param {string} eventId - Event ID
 * @param {string} agentId - Agent processing the event
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function markEventProcessing(eventId, agentId) {
  return update('events', {
    status: EVENT_STATUS.PROCESSING,
    processed_by: agentId,
  }, { id: eventId });
}

/**
 * Marks an event as completed
 * @param {string} eventId - Event ID
 * @param {string} agentId - Agent that processed the event
 * @param {object} [result=null] - Optional result data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function markEventCompleted(eventId, agentId, result = null) {
  const updates = {
    status: EVENT_STATUS.COMPLETED,
    processed_at: new Date().toISOString(),
    processed_by: agentId,
  };

  if (result) {
    updates.result = result;
  }

  return update('events', updates, { id: eventId });
}

/**
 * Marks an event as failed
 * @param {string} eventId - Event ID
 * @param {string} agentId - Agent that attempted to process
 * @param {string} errorMessage - Error message
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function markEventFailed(eventId, agentId, errorMessage) {
  return update('events', {
    status: EVENT_STATUS.FAILED,
    processed_at: new Date().toISOString(),
    processed_by: agentId,
    error: errorMessage,
  }, { id: eventId });
}

/**
 * Gets recent events for monitoring
 * @param {number} [limit=50] - Number of events to fetch
 * @param {string} [agentId=null] - Filter by agent
 * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
 */
async function getRecentEvents(limit = 50, agentId = null) {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentId) {
      query = query.or(`source_agent.eq.${agentId},target_agent.eq.${agentId}`);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Cleans up old completed events (housekeeping)
 * @param {number} [daysOld=7] - Delete events older than this many days
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
async function cleanupOldEvents(daysOld = 7) {
  try {
    const supabase = getSupabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const { data, error } = await supabase
      .from('events')
      .delete()
      .eq('status', EVENT_STATUS.COMPLETED)
      .lt('created_at', cutoff.toISOString())
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || 0 };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Registers an agent heartbeat
 * @param {string} agentId - Agent ID
 * @param {object} [status={}] - Optional status info
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function registerHeartbeat(agentId, status = {}) {
  try {
    const supabase = getSupabase();

    const { error } = await supabase.from('agents').upsert({
      id: agentId,
      name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
      status: 'active',
      last_heartbeat: new Date().toISOString(),
      config: status,
    }, { onConflict: 'id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  EVENT_TYPES,
  EVENT_STATUS,
  publishEvent,
  consumeEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  getRecentEvents,
  cleanupOldEvents,
  registerHeartbeat,
};
