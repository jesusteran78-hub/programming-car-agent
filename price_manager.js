const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const logger = require('./logger');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Checks if we have a "Learned" or "Fixed" price for this car/service.
 * Service Types: 'copy', 'lost_all', 'programming'
 */
async function getStoredPrice(make, model, year, serviceType = 'copy') {
  try {
    // Query database for matching make/model and year range
    // We look for strict match on Make/Model, and Year falling within range
    const { data, error } = await supabase
      .from('service_prices')
      .select('*')
      .ilike('make', make) // ilike for case-insensitive
      .ilike('model', model)
      .eq('service_type', serviceType)
      .lte('year_start', year)
      .gte('year_end', year)
      .limit(1);

    if (error) {
      logger.error('Error fetching stored price:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data[0]; // { price: 250, description: 'Smart Key' ... }
    }

    return null;
  } catch (e) {
    logger.error('Exception in getStoredPrice:', e);
    return null;
  }
}

/**
 * Parses a "Teacher Message" and learns a new price.
 * Format: "Aprende: [Make] [Model] [YearStart]-[YearEnd] [Type] [Price]"
 * Example: "Aprende: Mercedes C300 2015-2018 Copia 250"
 */
async function learnNewPrice(text) {
  // Regex flexible
  // Capture: Make, Model, Year(s), Type, Price
  // Allow: "Aprende: Toyota Corolla 2018-2022 Copia $180" or "Aprende: BMW X5 2010 Lost 300"

  // Normalize text
  const cleanText = text.replace(/^aprende:\s*/i, '').trim();

  // Pattern:
  // 1. Make (Word) -> Mercedes
  // 2. Model (Word/Alphanum) -> C300
  // 3. Year (YYYY or YYYY-YYYY) -> 2015 or 2015-2018
  // 4. Type (Word) -> Copia/Lost/Prog
  // 5. Price ($XXX or XXX) -> 250

  const regex = /^([a-zA-Z]+)\s+([a-zA-Z0-9-_]+)\s+(\d{4}(?:-\d{4})?)\s+([a-zA-Z]+)\s+\$?(\d+)/i;
  const match = cleanText.match(regex);

  if (!match) {
    return {
      success: false,
      message:
        "No entendí el formato. Usa: 'Aprende: Marca Modelo Años Tipo Precio' (Ej: Mercedes C300 2015-2018 Copia 250)",
    };
  }

  const [, make, model, yearStr, typeRaw, priceStr] = match;

  // Parse Years
  let startYear, endYear;
  if (yearStr.includes('-')) {
    const parts = yearStr.split('-');
    startYear = parseInt(parts[0]);
    endYear = parseInt(parts[1]);
  } else {
    startYear = parseInt(yearStr);
    endYear = parseInt(yearStr);
  }

  // Normalize Type
  let serviceType = 'copy';
  const typeLower = typeRaw.toLowerCase();
  if (typeLower.includes('lost') || typeLower.includes('perdida')) {serviceType = 'lost_all';}
  if (typeLower.includes('prog')) {serviceType = 'programming';}

  const price = parseFloat(priceStr);

  // Insert into DB
  const { error } = await supabase.from('service_prices').insert([
    {
      make,
      model,
      year_start: startYear,
      year_end: endYear,
      service_type: serviceType,
      price: price,
      description: `Aprendido via WhatsApp`,
    },
  ]);

  if (error) {
    logger.error('Error learning price:', error);
    return { success: false, message: 'Error guardando en base de datos.' };
  }

  return {
    success: true,
    message: `¡Aprendido! ${make} ${model} (${startYear}-${endYear}) - ${serviceType}: $${price}`,
  };
}

module.exports = { getStoredPrice, learnNewPrice };
