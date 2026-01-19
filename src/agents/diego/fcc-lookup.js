/**
 * ATLAS Agent: Diego (Operations)
 * FCC Lookup - Key Information Database
 *
 * @module src/agents/diego/fcc-lookup
 */
const logger = require('../../core/logger').child('FCCLookup');

// Import existing key finder
const { findKeyDetails, getSupplierLinks } = require('../../../key_finder');

/**
 * Looks up FCC ID for a vehicle
 * @param {number|string} year - Vehicle year
 * @param {string} make - Vehicle make
 * @param {string} model - Vehicle model
 * @returns {object}
 */
function lookupFCC(year, make, model) {
  try {
    logger.info(`FCC lookup: ${year} ${make} ${model}`);

    const results = findKeyDetails(year, make, model);

    if (!results || results.length === 0 || results[0].db_miss) {
      return {
        found: false,
        message: `No se encontró FCC para ${make} ${model} ${year}`,
        vehicle: { year, make, model },
      };
    }

    const fccResults = results.map((r) => ({
      fccId: r.fccId,
      frequency: r.frequency || 'N/A',
      source: r.source,
      note: r.note || '',
    }));

    logger.info(`Found ${fccResults.length} FCC results`);

    return {
      found: true,
      vehicle: { year, make, model },
      results: fccResults,
      recommended: fccResults[0].fccId,
    };
  } catch (error) {
    logger.error('Error in FCC lookup:', error);
    return {
      found: false,
      error: error.message,
      vehicle: { year, make, model },
    };
  }
}

/**
 * Formats FCC lookup result for WhatsApp display
 * @param {object} lookupResult - Result from lookupFCC
 * @returns {string}
 */
function formatFCCResult(lookupResult) {
  const { found, vehicle, results, message, error } = lookupResult;

  if (!found) {
    return `❌ ${message || error || 'No se encontró información'}`;
  }

  let response = `🔑 **${vehicle.make} ${vehicle.model} ${vehicle.year}**\n\n`;

  results.forEach((r, i) => {
    response += `${i + 1}. FCC: **${r.fccId}**\n`;
    response += `   Freq: ${r.frequency}\n`;
    response += `   Fuente: ${r.source}\n`;
    if (r.note) {
      response += `   Nota: ${r.note}\n`;
    }
    response += '\n';
  });

  return response.trim();
}

/**
 * Gets supplier links for internal use (owner only)
 * @param {string} make - Vehicle make
 * @param {string} model - Vehicle model
 * @param {number} year - Vehicle year
 * @param {string} fccId - FCC ID
 * @returns {object}
 */
function getInternalSupplierLinks(make, model, year, fccId) {
  try {
    return getSupplierLinks(make, model, year, fccId);
  } catch (error) {
    logger.error('Error getting supplier links:', error);
    return {};
  }
}

/**
 * Validates FCC lookup parameters
 * @param {string} input - Raw input string (e.g., "2015 toyota camry")
 * @returns {object} - Parsed parameters or error
 */
function parseFCCInput(input) {
  const parts = input.trim().split(/\s+/);

  if (parts.length < 3) {
    return {
      valid: false,
      error: 'Formato: [año] [marca] [modelo]\nEjemplo: 2015 toyota camry',
    };
  }

  const year = parseInt(parts[0]);

  if (isNaN(year) || year < 1980 || year > new Date().getFullYear() + 2) {
    return {
      valid: false,
      error: 'El año debe ser un número válido (1980-presente)',
    };
  }

  const make = parts[1];
  const model = parts.slice(2).join(' ');

  return {
    valid: true,
    year,
    make,
    model,
  };
}

/**
 * Full FCC lookup workflow
 * @param {string} input - Raw input string
 * @returns {object}
 */
function processFCCLookup(input) {
  const parsed = parseFCCInput(input);

  if (!parsed.valid) {
    return {
      success: false,
      message: `❌ ${parsed.error}`,
    };
  }

  const result = lookupFCC(parsed.year, parsed.make, parsed.model);
  const formatted = formatFCCResult(result);

  return {
    success: result.found,
    message: formatted,
    data: result,
  };
}

module.exports = {
  lookupFCC,
  formatFCCResult,
  getInternalSupplierLinks,
  parseFCCInput,
  processFCCLookup,
};
