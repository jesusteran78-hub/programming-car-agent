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

// Google Calendar integration
const googleCalendar = require('../../services/google-calendar');

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
 * Handles check_calendar tool call
 * Uses Google Calendar for real availability
 * @param {object} args - Tool arguments (date, range)
 * @returns {Promise<object>}
 */
async function handleCheckCalendar(args) {
  const { date, range = 'day' } = args;

  try {
    // Default to today if no date provided
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

    if (range === 'week') {
      // Get week view from Google Calendar
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split('T')[0];

      const result = await googleCalendar.getEventsInRange(dateStr, endDateStr);

      if (!result.success) {
        logger.error('Error checking Google Calendar:', result.error);
        return { error: result.error };
      }

      if (!result.events || result.events.length === 0) {
        return {
          message: 'No hay citas programadas para esta semana',
          appointments: [],
          available: true,
        };
      }

      // Format appointments for display
      const appointments = result.events.map((event) => {
        const eventDate = new Date(event.start);
        return {
          date: eventDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
          time: eventDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          service: event.summary,
          location: event.location || 'Por confirmar',
        };
      });

      logger.info(`Calendar check (week): ${appointments.length} appointments found`);
      return {
        message: `${appointments.length} cita(s) programada(s) esta semana`,
        appointments,
        available: true,
      };
    } else {
      // Single day - check availability
      const result = await googleCalendar.checkAvailability(dateStr);

      if (!result.success) {
        logger.error('Error checking Google Calendar:', result.error);
        return { error: result.error };
      }

      const formattedDate = targetDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      if (!result.events || result.events.length === 0) {
        return {
          message: `No hay citas programadas para ${formattedDate}`,
          appointments: [],
          available: true,
          freeSlots: result.freeSlots,
        };
      }

      // Format appointments for display
      const appointments = result.events.map((event) => {
        const eventDate = new Date(event.start);
        return {
          date: formattedDate,
          time: eventDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          service: event.summary,
        };
      });

      logger.info(`Calendar check: ${appointments.length} appointments found`);
      return {
        message: `${appointments.length} cita(s) programada(s) para ${formattedDate}`,
        appointments,
        available: result.freeSlots && result.freeSlots.length > 0,
        freeSlots: result.freeSlots,
        busySlots: result.busySlots,
      };
    }
  } catch (error) {
    logger.error('Error in handleCheckCalendar:', error);
    return { error: error.message };
  }
}

/**
 * Handles schedule_appointment tool call
 * Creates appointment in both Supabase and Google Calendar
 * @param {object} args - Tool arguments
 * @param {string} leadId - Lead ID
 * @param {object} context - Additional context (notificationCallback, leadData)
 * @returns {Promise<object>}
 */
async function handleScheduleAppointment(args, leadId, context = {}) {
  const { date, time, service_type, location, notes } = args;
  const { notificationCallback, leadData } = context;

  try {
    const supabase = getSupabase();

    // Build client info
    const vehicle = leadData?.make
      ? `${leadData.make} ${leadData.model || ''} ${leadData.year || ''}`.trim()
      : 'Sin vehículo';
    const clientPhone = leadData?.phone?.replace('@s.whatsapp.net', '') || 'Desconocido';
    const clientName = leadData?.name || 'Cliente';

    // 1. Create Google Calendar event FIRST
    let calendarEvent = null;
    try {
      const calendarResult = await googleCalendar.createAppointment({
        date,
        time,
        serviceType: service_type,
        clientName,
        clientPhone,
        vehicle,
        location: location || '',
        notes: notes || '',
      });

      if (calendarResult.success) {
        calendarEvent = calendarResult.event;
        logger.info(`Google Calendar event created: ${calendarEvent.id}`);
      } else {
        logger.warn('Failed to create Google Calendar event:', calendarResult.error);
      }
    } catch (calError) {
      logger.warn('Google Calendar error (non-blocking):', calError.message);
    }

    // 2. Create scheduled job in Supabase (backup/CRM tracking)
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .insert({
        lead_id: leadId,
        agent_id: 'alex',
        job_type: service_type,
        scheduled_for: `${date}T${time}:00`,
        status: 'scheduled',
        payload: {
          location,
          notes,
          google_calendar_id: calendarEvent?.id || null,
          google_calendar_link: calendarEvent?.htmlLink || null,
        },
        notes: notes,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // 3. Update lead status
    if (leadId) {
      await supabase
        .from('leads')
        .update({ pipeline_status: 'PROGRAMADO' })
        .eq('id', leadId);
    }

    // 4. NOTIFY OWNER about new appointment
    if (notificationCallback) {
      const calendarLink = calendarEvent?.htmlLink ? `\n🔗 Calendar: ${calendarEvent.htmlLink}` : '';

      const ownerNotification = `🗓️ *NUEVA CITA AGENDADA*

📅 Fecha: ${date}
⏰ Hora: ${time}
🔧 Servicio: ${service_type}
🚗 Vehículo: ${vehicle}
👤 Cliente: ${clientName}
📞 Teléfono: ${clientPhone}
📍 Ubicación: ${location || 'Por confirmar'}
${notes ? `📝 Notas: ${notes}` : ''}${calendarLink}

⚠️ *PENDIENTE: Confirmar pago antes de la cita*`;

      try {
        const OWNER_NUMBER = process.env.OWNER_PHONE || '17864782531';
        await notificationCallback(`${OWNER_NUMBER}@s.whatsapp.net`, ownerNotification);
        logger.info('Owner notified about new appointment');
      } catch (notifyError) {
        logger.warn('Failed to notify owner:', notifyError.message);
      }
    }

    logger.info(`Appointment scheduled for ${date} at ${time} (Calendar: ${calendarEvent?.id || 'none'})`);
    return {
      success: true,
      appointment: data,
      google_calendar: calendarEvent ? { id: calendarEvent.id, link: calendarEvent.htmlLink } : null,
      owner_notified: !!notificationCallback,
    };
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

    case 'check_calendar':
      return handleCheckCalendar(args);

    case 'schedule_appointment':
      return handleScheduleAppointment(args, leadId, { notificationCallback, leadData });

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
  handleCheckCalendar,
  handleScheduleAppointment,
  executeTool,
};
