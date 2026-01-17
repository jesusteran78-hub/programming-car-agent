/**
 * Price Request Manager
 * Handles the owner-approval flow for new prices
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const logger = require('./logger');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';

/**
 * Creates a new price request and notifies the owner
 * @param {Function} sendWhatsApp - Function to send WhatsApp messages
 * @param {string} clientPhone - Client's WhatsApp ID
 * @param {string} make - Vehicle make
 * @param {string} model - Vehicle model
 * @param {number} year - Vehicle year
 * @param {string} serviceType - Service type (copy, lost_all, programming)
 * @param {string} fccId - FCC ID of the key
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
async function createPriceRequest(sendWhatsApp, clientPhone, make, model, year, serviceType, fccId) {
  try {
    const code = Math.random().toString(36).substring(2, 8);

    const { error } = await supabase.from('price_requests').insert({
      request_code: code,
      client_phone: clientPhone,
      make,
      model,
      year: parseInt(year),
      service_type: serviceType || 'copy',
      fcc_id: fccId,
    });

    if (error) {
      logger.error('Error creating price request:', error);
      return { success: false, error: error.message };
    }

    const msg = `🔔 PRECIO #${code}
${make} ${model} ${year}
Servicio: ${serviceType || 'copy'}
FCC: ${fccId || 'N/A'}
Cliente: ${clientPhone.replace('@s.whatsapp.net', '')}

Responde con el precio (ej: 180)`;

    await sendWhatsApp(OWNER_PHONE, msg);
    logger.info(`📤 Price request #${code} sent to owner`);

    return { success: true, code };
  } catch (e) {
    logger.error('Exception in createPriceRequest:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Handles owner's price response
 * @param {Function} sendWhatsApp - Function to send WhatsApp messages
 * @param {string} text - Owner's message text
 * @returns {Promise<{handled: boolean, error?: string}>}
 */
async function handleOwnerResponse(sendWhatsApp, text) {
  try {
    // Match formats: "180", "#abc123 180", "abc123: 180", "$180"
    const priceMatch = text.trim().match(/^#?([a-z0-9]{6})?\s*:?\s*\$?(\d+(?:\.\d{2})?)/i);

    if (!priceMatch) {
      return { handled: false };
    }

    const [, requestCode, priceStr] = priceMatch;
    const price = parseFloat(priceStr);

    if (isNaN(price) || price <= 0) {
      return { handled: false };
    }

    // Find pending request (by code if provided, or most recent)
    let query = supabase
      .from('price_requests')
      .select('*')
      .eq('status', 'pending');

    if (requestCode) {
      query = query.eq('request_code', requestCode);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: requests, error: fetchError } = await query;

    if (fetchError) {
      logger.error('Error fetching price request:', fetchError);
      return { handled: false, error: fetchError.message };
    }

    if (!requests || requests.length === 0) {
      logger.info('No pending price request found');
      return { handled: false };
    }

    const request = requests[0];

    // Update request status
    const { error: updateError } = await supabase
      .from('price_requests')
      .update({
        status: 'answered',
        price,
        answered_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (updateError) {
      logger.error('Error updating price request:', updateError);
      return { handled: false, error: updateError.message };
    }

    // Save price to service_prices for future lookups
    const { error: insertError } = await supabase.from('service_prices').insert({
      make: request.make,
      model: request.model,
      year_start: request.year,
      year_end: request.year,
      service_type: request.service_type,
      price,
      description: 'Via WhatsApp Owner',
    });

    if (insertError) {
      logger.error('Error saving service price:', insertError);
    }

    // Notify client
    const clientMsg = `¡Listo! El precio para tu ${request.make} ${request.model} ${request.year} es $${price}. ¿Te gustaría agendar el servicio?`;
    await sendWhatsApp(request.client_phone, clientMsg);

    // Confirm to owner
    await sendWhatsApp(OWNER_PHONE, `✅ Precio guardado: ${request.make} ${request.model} ${request.year} = $${price}`);

    logger.info(`✅ Price request #${request.request_code} completed: $${price}`);

    return { handled: true };
  } catch (e) {
    logger.error('Exception in handleOwnerResponse:', e);
    return { handled: false, error: e.message };
  }
}

/**
 * Gets all pending price requests
 * @returns {Promise<Array>}
 */
async function getPendingRequests() {
  try {
    const { data, error } = await supabase
      .from('price_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching pending requests:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    logger.error('Exception in getPendingRequests:', e);
    return [];
  }
}

/**
 * Expires old pending requests (older than X hours)
 * @param {number} hoursOld - Hours after which to expire requests
 * @returns {Promise<number>} - Number of expired requests
 */
async function expireOldRequests(hoursOld = 24) {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursOld);

    const { data, error } = await supabase
      .from('price_requests')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', cutoff.toISOString())
      .select();

    if (error) {
      logger.error('Error expiring old requests:', error);
      return 0;
    }

    if (data && data.length > 0) {
      logger.info(`⏰ Expired ${data.length} old price requests`);
    }

    return data ? data.length : 0;
  } catch (e) {
    logger.error('Exception in expireOldRequests:', e);
    return 0;
  }
}

/**
 * Checks if a number is the owner
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
function isOwner(phone) {
  return phone === OWNER_PHONE;
}

module.exports = {
  createPriceRequest,
  handleOwnerResponse,
  getPendingRequests,
  expireOldRequests,
  isOwner,
  OWNER_PHONE,
};
