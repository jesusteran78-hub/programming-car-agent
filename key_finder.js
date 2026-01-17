// key_finder.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Load databases
const csvDatabase = [];
let customDatabase = [];

function loadDatabases() {
  // 1. Load Custom JSON (High Priority)
  try {
    const customPath = path.join(__dirname, 'custom_key_db.json');
    if (fs.existsSync(customPath)) {
      const data = fs.readFileSync(customPath, 'utf8');
      customDatabase = JSON.parse(data);
      logger.info(`Loaded ${customDatabase.length} entries from Custom Book.`);
    }
  } catch (error) {
    logger.error('Error loading Custom DB:', error);
  }

  // 2. Load CSV (Generic DB - Fallback)
  try {
    const dbPath = path.join(__dirname, 'fcc_db.csv');
    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      const lines = fileContent.split('\n');
      // Headers: Year,Make,Model,FCCID
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const parts = line.split(',');
        if (parts.length >= 4) {
          csvDatabase.push({
            year: parseInt(parts[0]),
            make: parts[1].trim().toLowerCase(),
            model: parts[2].trim().toLowerCase(),
            fccId: parts[3].trim(),
          });
        }
      }
      logger.info(`Loaded ${csvDatabase.length} entries from generic CSV.`);
    }
  } catch (error) {
    logger.error('Error loading CSV DB:', error);
  }
}

// Initialize on load
loadDatabases();

/**
 * Finds key details (FCC ID) for a given vehicle.
 * Prioritizes Custom Book, falls back to CSV.
 * @param {number} year
 * @param {string} make
 * @param {string} model
 * @returns {Array<{fccId: string, source: string, note: string}>}
 */
function findKeyDetails(year, make, model) {
  const results = [];
  const searchMake = make.toLowerCase();
  const searchModel = model.toLowerCase();
  const searchYear = typeof year === 'string' ? parseInt(year) : year;

  // 1. Search Custom Database (Priority)
  const customMatches = customDatabase.filter((entry) => {
    const entryMake = entry.make.toLowerCase();
    const entryModel = entry.model.toLowerCase();

    // Check Make
    if (!entryMake.includes(searchMake) && !searchMake.includes(entryMake)) {return false;}

    // Check Model (fuzzy match)
    if (!entryModel.includes(searchModel) && !searchModel.includes(entryModel)) {return false;}

    // Check Year Range
    if (searchYear >= entry.startYear && searchYear <= entry.endYear) {return true;}

    return false;
  });

  customMatches.forEach((match) => {
    if (!results.some((r) => r.fccId === match.fccId)) {
      results.push({
        fccId: match.fccId,
        frequency: match.freq,
        source: 'Libro Maestro (Prioridad)',
        note: `Rango: ${match.startYear}-${match.endYear}`,
      });
    }
  });

  // 2. If no results or we want backups, Search CSV Database (Fallback)
  // We append these even if Custom found something, to give options,
  // OR we could return early if custom found something (Strict Priority).
  // Let's return mixed results but labelled, so user sees "Book" vs "Generic".

  // Actually, usually if the Book has it, it's right. But let's verify coverage.
  // If Custom matches found, maybe we skip generic?
  // Let's include both for maximum helpfulness, sorted by priority in UI?
  // The agent will present them.

  const csvMatches = csvDatabase.filter((entry) => {
    return entry.year === searchYear && entry.make === searchMake && entry.model === searchModel;
  });

  csvMatches.forEach((match) => {
    if (!results.some((r) => r.fccId === match.fccId)) {
      results.push({
        fccId: match.fccId,
        source: 'Base de Datos Genérica',
        note: 'Coincidencia Exacta',
      });
    }
  });

  // 3. Fallback: If no results found in DBs, return Web Search Links
  if (results.length === 0) {
    const links = getSupplierLinks(make, model, year);

    results.push({
      fccId: 'No encontrado en base de datos',
      source: 'Búsqueda Web (Respaldo)',
      note: 'Intente buscar manualmente en los siguientes enlaces:',
      links: links, // Pass links object for frontend/agent to parse if needed
    });

    // Also append text representation for simple agents
    results[0].frequency = 'N/A';
    results[0].db_miss = true; // Flag for agent handling
  }

  return results;
}

/**
 * Generates supplier links for the key
 * @param {string} make
 * @param {string} model
 * @param {number} year
 * @param {string} [fccId] Optional FCC ID to refine search
 */
function getSupplierLinks(make, model, year, fccId) {
  const safeYear = year || '';
  const safeMake = make || '';
  const safeModel = model || '';
  const query = `${safeYear} ${safeMake} ${safeModel} ${fccId || ''}`.trim();
  const encodedQuery = encodeURIComponent(query);

  return [
    {
      name: 'UHS Hardware',
      url: `https://www.uhs-hardware.com/pages/search-results-page?q=${encodedQuery}`,
    },
    {
      name: 'Locksmith Keyless',
      url: `https://www.locksmithkeyless.com/pages/search-results-page?q=${encodedQuery}`,
    },
  ];
}

module.exports = {
  findKeyDetails,
  getSupplierLinks,
};
