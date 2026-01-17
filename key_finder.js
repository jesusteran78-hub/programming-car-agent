// key_finder.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { searchFccId } = require('./libro_maestro_parser');

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
 * Priority: 1) Libro Maestro (parsed txt), 2) Custom JSON, 3) CSV, 4) Web fallback
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

  // 1. Search Libro Maestro (Highest Priority - parsed from txt files)
  const libroMatches = searchFccId(searchYear, make, model);
  libroMatches.forEach((match) => {
    if (!results.some((r) => r.fccId === match.fccId)) {
      results.push({
        fccId: match.fccId,
        frequency: match.freq,
        source: 'Libro Maestro',
        note: `${match.make} ${match.model} ${match.yearStart}-${match.yearEnd}`,
      });
    }
  });

  // 2. Search Custom JSON Database
  const customMatches = customDatabase.filter((entry) => {
    const entryMake = entry.make.toLowerCase();
    const entryModel = entry.model.toLowerCase();

    if (!entryMake.includes(searchMake) && !searchMake.includes(entryMake)) {return false;}
    if (!entryModel.includes(searchModel) && !searchModel.includes(entryModel)) {return false;}
    if (searchYear >= entry.startYear && searchYear <= entry.endYear) {return true;}

    return false;
  });

  customMatches.forEach((match) => {
    if (match.fccId && match.fccId !== 'Info' && !results.some((r) => r.fccId === match.fccId)) {
      results.push({
        fccId: match.fccId,
        frequency: match.freq,
        source: 'Custom DB',
        note: `Rango: ${match.startYear}-${match.endYear}`,
      });
    }
  });

  // 3. Search CSV Database (Fallback)
  const csvMatches = csvDatabase.filter((entry) => {
    return entry.year === searchYear && entry.make === searchMake && entry.model === searchModel;
  });

  csvMatches.forEach((match) => {
    if (!results.some((r) => r.fccId === match.fccId)) {
      results.push({
        fccId: match.fccId,
        source: 'CSV Database',
        note: 'Coincidencia Exacta',
      });
    }
  });

  // 4. Fallback: If no results found, return Web Search Links
  if (results.length === 0) {
    const links = getSupplierLinks(make, model, year);

    results.push({
      fccId: 'NO_ENCONTRADO',
      source: 'Búsqueda Web',
      note: 'No se encontró en bases de datos locales',
      links: links,
      frequency: 'N/A',
      db_miss: true,
    });
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
