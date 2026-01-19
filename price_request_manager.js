/**
 * Price Request Manager
 * Handles the owner-approval flow for new prices
 */
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();
const logger = require('./logger');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';

/**
 * Creates a new price request and notifies the owner
 */
async function createPriceRequest(sendWhatsApp, clientPhone, make, model, year, serviceType, fccId, vin, supplierLinks) {
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

    const linksText = (supplierLinks || [])
      .map(l => `• ${l.name}: ${l.url}`)
      .join('\n');

    const msg = `🔔 PRECIO #${code}
🚗 ${make} ${model} ${year}
🔢 VIN: ${vin || 'N/A'}
🔑 FCC: ${fccId || 'N/A'}
🔧 Servicio: ${serviceType || 'copy'}
👤 Cliente: ${clientPhone.replace('@s.whatsapp.net', '')}

🔗 LINKS PROVEEDORES:
${linksText || 'No disponibles'}

💰 Responde con el PRECIO FINAL (ej: 180)`;

    await sendWhatsApp(OWNER_PHONE, msg);
    logger.info(`📤 Price request #${code} sent to owner`);

    return { success: true, code };
  } catch (e) {
    logger.error('Exception in createPriceRequest:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Handles owner's price response with AI Parsing for complex offers
 */
async function handleOwnerResponse(sendWhatsApp, text) {
  try {
    let price = null;
    let priceData = null;
    let requestCode = null;

    // 1. Try STRICT Price Match first (Preferred for speed)
    // Match formats: "180", "#abc123 180", "abc123: 180", "$180"
    const simpleMatch = text.trim().match(/^#?([a-z0-9]{6})?\s*:?\s*\$?(\d+(?:\.\d{2})?)$/i);

    if (simpleMatch) {
      requestCode = simpleMatch[1];
      price = parseFloat(simpleMatch[2]);
    } else {
      // NOT a simple price - check if it looks like a price response at all
      // If it looks like a command or general message, let dispatcher handle it
      const lowerText = text.toLowerCase().trim();

      // Command prefixes that should NOT be handled as price responses
      // Includes both legacy and ATLAS commands
      const commandPrefixes = [
        'help', 'ayuda', '?',           // Help
        'status', 'estado',              // Global status
        'mkt', 'marketing', 'marcus', 'video',  // Marcus
        'ventas', 'sales', 'alex',       // Alex
        'ops', 'operaciones', 'diego',   // Diego
        'fin', 'finanzas', 'sofia', 'gasto',    // Sofia
        'outreach', 'viper', 'campaign', // Viper
        'conta', 'contabilidad',         // Legacy
        'fcc'                            // FCC lookup
      ];
      const isCommand = commandPrefixes.some(prefix => lowerText.startsWith(prefix));

      // Price-related keywords that indicate this MIGHT be a price response
      const priceKeywords = ['$', 'oem', 'original', 'aftermarket', 'generi', 'china', 'refurb', 'uso', 'precio', 'cuesta', 'vale'];
      const looksLikePrice = priceKeywords.some(kw => lowerText.includes(kw)) || /\d{2,}/.test(text);

      if (isCommand || !looksLikePrice) {
        // This is a command or doesn't look like a price - let dispatcher handle it
        return { handled: false };
      }
    }

    // 2. Find pending request(s)
    let query = supabase
      .from('price_requests')
      .select('*')
      .eq('status', 'pending');

    if (requestCode) {
      query = query.eq('request_code', requestCode);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: requests, error: fetchError } = await query;
    if (fetchError || !requests || requests.length === 0) {
      return { handled: false };
    }

    const request = requests[0];

    // --- DECISION LOGIC ---
    let clientMsg = '';
    let ownerConfirmation = '';

    if (price && price > 0) {
      // CASE A: SIMPLE PRICE (Legacy/Fast)
      priceData = { price: price }; // Standardize format internally

      clientMsg = `¡Listo! El precio para tu ${request.make} ${request.model} ${request.year} es $${price}. ¿Te gustaría agendar el servicio?`;
      ownerConfirmation = `✅ Precio guardado: $${price}`;

    } else {
      // CASE B: COMPLEX TEXT -> SMART PARSING
      logger.info(`🧠 Parsing complex price text with AI: "${text}"`);

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system", content: `You are a Price Parser. Extract car key prices from text.
    Output JSON ONLY:
    {
      "oem_new": number | null,
      "oem_refurbished": number | null,
      "aftermarket": number | null,
      "service_programming": number | null
    }
    Rules:
    - If text says "original" or "OEM" without specifying condition, assume "oem_new".
    - If "generica" or "china", use "aftermarket".
    - If "uso" or "refurb", use "oem_refurbished".
    ` },
            { role: "user", content: text }
          ],
          response_format: { type: "json_object" }
        });

        const mlResult = JSON.parse(completion.choices[0].message.content);

        // Check if we actually found prices
        const foundPrices = mlResult && Object.values(mlResult).some(v => v !== null);

        if (foundPrices) {
          priceData = mlResult;
          // Use the lowest price as the "main" price column for compatibility
          const validPrices = Object.values(mlResult).filter(v => v);
          price = Math.min(...validPrices);

          // Construct nice message with USER PREFERRED TERMS
          const options = [];
          if (mlResult.oem_new) options.push(`💎 OEM: $${mlResult.oem_new}`);
          if (mlResult.oem_refurbished) options.push(`♻️ OEM REFURBISHED: $${mlResult.oem_refurbished}`);
          if (mlResult.aftermarket) options.push(`📉 AFTERMARKET: $${mlResult.aftermarket}`);

          clientMsg = `¡Buenas noticias! Tengo estas opciones para tu ${request.make}:\n\n${options.join('\n')}\n\n¿Cuál prefieres?`;
          ownerConfirmation = `✅ Precios múltiples guardados.\n${JSON.stringify(priceData)}`;

        } else {
          throw new Error('No prices found in AI response');
        }
      } catch (aiError) {
        // CASE C: FALLBACK (Just text forwarding)
        logger.warn('AI Parsing failed or found no prices, forwarding text.', aiError);
        clientMsg = `Hola, sobre tu ${request.make} ${request.model}:\n\n"${text}"\n\n¿Te interesa alguna de estas opciones?`;
        ownerConfirmation = `⚠️ No detecté precios claros, reenvié el mensaje textual.`;
      }
    }

    // UPDATE DB (With robustness for missing columns)
    const updatePayload = {
      status: 'answered',
      price: price || 0, // Fallback for sort
      answered_at: new Date().toISOString(),
    };
    // Only try to save price_data if we have it. If column missing, this might fail, so we catch it.
    if (priceData) {
      updatePayload.price_data = priceData;
    }

    const { error: updateError } = await supabase
      .from('price_requests')
      .update(updatePayload)
      .eq('id', request.id);

    if (updateError) {
      logger.warn('Error updating price_request (possible missing column price_data?):', updateError);
      // Fallback: try updating WITHOUT price_data just to close the request
      if (updatePayload.price_data) {
        delete updatePayload.price_data;
        await supabase.from('price_requests').update(updatePayload).eq('id', request.id);
      }
    }

    // Save to service_prices
    if (priceData || (price && price > 0)) {
      const insertPayload = {
        make: request.make,
        model: request.model,
        year_start: request.year,
        year_end: request.year,
        service_type: request.service_type,
        price: price || 0,
        description: text,
      };
      if (priceData) insertPayload.price_data = priceData;

      const { error: insertError } = await supabase.from('service_prices').insert(insertPayload);

      if (insertError) {
        logger.error('Error saving service_prices:', insertError);
      }
    }

    // Notify client
    await sendWhatsApp(request.client_phone, clientMsg);

    // Confirm to owner
    await sendWhatsApp(OWNER_PHONE, ownerConfirmation);

    return { handled: true };

  } catch (e) {
    logger.error('Exception in handleOwnerResponse:', e);
    return { handled: false, error: e.message };
  }
}

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

async function expireOldRequests(hoursOld = 24) {
  try {
    const cutoff = new Date();
    const { data, error } = await supabase
      .from('price_requests')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', cutoff.toISOString())
      .select();
    if (error) return 0;
    return data ? data.length : 0;
  } catch (e) {
    return 0;
  }
}

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
