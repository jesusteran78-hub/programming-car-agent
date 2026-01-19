/**
 * ATLAS Agent: Alex (Sales)
 * Tool Handlers - Business Logic for GPT Tools
 *
 * @module src/agents/alex/handlers
 */
const { getSupabase } = require('../../core/supabase');
const logger = require('../../core/logger').child('Alex');

// Import existing business logic
const { decodeVIN } = require('../../../vin_decoder');
const { findKeyDetails, getSupplierLinks } = require('../../../key_finder');
const { checkInternalPrices } = require('../../../price_checker');
const { getStoredPrice } = require('../../../price_manager');
const { createPriceRequest } = require('../../../price_request_manager');

/**
 * Handles get_system_status tool call
 * @param {object} args - Tool arguments
 * @returns {Promise<object>}
 */
async function handleGetSystemStatus(args = {}) {
  const supabase = getSupabase();
  const statusData = {};

  try {
    // Count leads by status
    const { data: leadsCount } = await supabase
      .from('leads')
      .select('pipeline_status');

    if (leadsCount) {
      statusData.total_leads = leadsCount.length;
      statusData.leads_by_status = leadsCount.reduce((acc, l) => {
        acc[l.pipeline_status || 'NUEVO'] = (acc[l.pipeline_status || 'NUEVO'] || 0) + 1;
        return acc;
      }, {});
    }

    // Pending price requests
    const { data: pendingRequests } = await supabase
      .from('price_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    statusData.pending_price_requests = pendingRequests ? pendingRequests.length : 0;
    if (pendingRequests && pendingRequests.length > 0) {
      statusData.pending_details = pendingRequests.map((r) => ({
        code: r.request_code,
        vehicle: `${r.make} ${r.model} ${r.year}`,
        service: r.service_type,
        created: r.created_at,
      }));
    }

    // Recent leads
    if (args.include_leads !== false) {
      const { data: recentLeads } = await supabase
        .from('leads')
        .select('name, phone, make, model, year, pipeline_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentLeads) {
        statusData.recent_leads = recentLeads.map((l) => ({
          name: l.name,
          phone: l.phone?.replace('@s.whatsapp.net', ''),
          vehicle: l.make ? `${l.make} ${l.model} ${l.year}` : 'Sin vehículo',
          status: l.pipeline_status,
        }));
      }
    }

    return statusData;
  } catch (error) {
    logger.error('Error in handleGetSystemStatus:', error);
    return { error: error.message };
  }
}

/**
 * Handles lookup_vin tool call
 * @param {object} args - Tool arguments
 * @param {string} leadId - Lead ID to update
 * @returns {Promise<object>}
 */
async function handleLookupVin(args, leadId = null) {
  const { vin } = args;

  try {
    logger.info(`Looking up VIN: ${vin}`);
    const vinData = await decodeVIN(vin);

    // Update CRM if we have a lead ID
    if (vinData && vinData.year && leadId) {
      const supabase = getSupabase();
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          vin: vin,
          year: parseInt(vinData.year) || null,
          make: vinData.make,
          model: vinData.model,
          engine: vinData.engine,
          pipeline_status: 'COTIZANDO',
        })
        .eq('id', leadId);

      if (updateError) {
        logger.error('Error updating CRM:', updateError);
      } else {
        logger.info('CRM updated with vehicle data');
      }
    }

    // Auto-enrich with FCC ID
    if (vinData && vinData.year) {
      const keyResults = findKeyDetails(vinData.year, vinData.make, vinData.model);
      if (keyResults && keyResults.length > 0 && !keyResults[0].db_miss) {
        vinData.fcc_info = keyResults.map((k) => ({
          fccId: k.fccId,
          frequency: k.frequency,
          source: k.source,
        }));
        vinData.recommended_fcc = keyResults[0].fccId;
        logger.info(`Auto-found FCC: ${keyResults[0].fccId}`);
      }
    }

    return vinData;
  } catch (error) {
    logger.error('Error in handleLookupVin:', error);
    return { error: error.message };
  }
}

/**
 * Handles lookup_key_info tool call
 * @param {object} args - Tool arguments
 * @returns {Promise<object>}
 */
async function handleLookupKeyInfo(args) {
  const { year, make, model } = args;

  try {
    logger.info(`Looking up key info: ${year} ${make} ${model}`);
    const keyResults = await findKeyDetails(year, make, model);

    // Format results for GPT - NEVER include supplier links
    if (keyResults.length > 0 && keyResults[0].db_miss) {
      return {
        message: 'FCC no encontrado en base de datos. Procede con check_internal_key_cost usando año/marca/modelo.',
        suggestion: 'Pide al cliente confirmar el modelo exacto o usa el FCC genérico.',
      };
    }

    return keyResults.map((r) => ({
      fccId: r.fccId,
      frequency: r.frequency,
      source: r.source,
      note: r.note,
    }));
  } catch (error) {
    logger.error('Error in handleLookupKeyInfo:', error);
    return { error: error.message };
  }
}

/**
 * Handles check_internal_key_cost tool call
 * @param {object} args - Tool arguments
 * @param {object} context - Additional context
 * @returns {Promise<object>}
 */
async function handleCheckInternalKeyCost(args, context = {}) {
  const { fcc_id, make, model, year } = args;
  const { senderNumber, notificationCallback, leadData } = context;

  try {
    logger.info(`Checking internal key cost for FCC: ${fcc_id}`);

    // 1. Check Database First (Fixed Prices)
    let priceData = null;
    if (make && model && year) {
      const dbPrice = await getStoredPrice(make, model, parseInt(year));
      if (dbPrice) {
        priceData = {
          source: 'INTERNAL_DB',
          price: dbPrice.price,
          description: dbPrice.description,
          note: 'PRECIO FIJO/APRENDIDO',
        };
        logger.info(`Price found in DB: $${dbPrice.price}`);
        return priceData;
      }
    }

    // 2. If no DB hit, use Scraping
    if (!priceData) {
      priceData = await checkInternalPrices(fcc_id, make, model);
    }

    // 3. Check if we have a valid price
    const hasValidPrice =
      priceData &&
      ((Array.isArray(priceData) &&
        priceData.some((p) => p.price && p.price !== 'Consultar Web' && p.found !== false)) ||
        (!Array.isArray(priceData) && priceData.price && priceData.price !== 'Consultar Web' && priceData.found !== false));

    // 4. If no price, request from owner
    if (!hasValidPrice && make && model && year && notificationCallback) {
      const supplierLinks = getSupplierLinks(make, model, year, fcc_id);
      const vin = leadData?.vin || null;

      logger.info(`Creating price request for ${make} ${model}`);
      await createPriceRequest(
        notificationCallback,
        senderNumber,
        make,
        model,
        year,
        'copy',
        fcc_id,
        vin,
        supplierLinks
      );
    }

    return priceData || { error: 'No price found', awaiting_owner: true };
  } catch (error) {
    logger.error('Error in handleCheckInternalKeyCost:', error);
    return { error: error.message };
  }
}

/**
 * Handles update_lead_status tool call
 * @param {object} args - Tool arguments
 * @param {string} leadId - Lead ID to update
 * @returns {Promise<object>}
 */
async function handleUpdateLeadStatus(args, leadId) {
  const { status, notes } = args;

  if (!leadId) {
    return { error: 'No lead ID provided' };
  }

  try {
    const supabase = getSupabase();
    const updates = { pipeline_status: status };
    if (notes) {
      updates.notes = notes;
    }

    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (error) {
      return { error: error.message };
    }

    logger.info(`Lead ${leadId} status updated to ${status}`);
    return { success: true, new_status: status };
  } catch (error) {
    logger.error('Error in handleUpdateLeadStatus:', error);
    return { error: error.message };
  }
}

/**
 * Handles schedule_appointment tool call
 * @param {object} args - Tool arguments
 * @param {string} leadId - Lead ID
 * @returns {Promise<object>}
 */
async function handleScheduleAppointment(args, leadId) {
  const { date, time, service_type, location, notes } = args;

  try {
    const supabase = getSupabase();

    // Create scheduled job
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .insert({
        lead_id: leadId,
        agent_id: 'alex',
        job_type: service_type,
        scheduled_for: `${date}T${time}:00`,
        status: 'scheduled',
        payload: { location, notes },
        notes: notes,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Update lead status
    if (leadId) {
      await supabase
        .from('leads')
        .update({ pipeline_status: 'PROGRAMADO' })
        .eq('id', leadId);
    }

    logger.info(`Appointment scheduled for ${date} at ${time}`);
    return { success: true, appointment: data };
  } catch (error) {
    logger.error('Error in handleScheduleAppointment:', error);
    return { error: error.message };
  }
}

/**
 * Executes a tool by name
 * @param {string} toolName - Name of the tool
 * @param {object} args - Tool arguments
 * @param {object} context - Additional context (leadId, etc.)
 * @returns {Promise<object>}
 */
async function executeTool(toolName, args, context = {}) {
  const { leadId, senderNumber, notificationCallback, leadData } = context;

  switch (toolName) {
    case 'get_system_status':
      return handleGetSystemStatus(args);

    case 'lookup_vin':
      return handleLookupVin(args, leadId);

    case 'lookup_key_info':
      return handleLookupKeyInfo(args);

    case 'check_internal_key_cost':
      return handleCheckInternalKeyCost(args, { senderNumber, notificationCallback, leadData });

    case 'update_lead_status':
      return handleUpdateLeadStatus(args, leadId);

    case 'schedule_appointment':
      return handleScheduleAppointment(args, leadId);

    default:
      logger.warn(`Unknown tool: ${toolName}`);
      return { error: `Unknown tool: ${toolName}` };
  }
}

module.exports = {
  handleGetSystemStatus,
  handleLookupVin,
  handleLookupKeyInfo,
  handleCheckInternalKeyCost,
  handleUpdateLeadStatus,
  handleScheduleAppointment,
  executeTool,
};
