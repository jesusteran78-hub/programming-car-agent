/**
 * Libro Maestro Parser
 * Parses the libro_maestro_gm.txt and other brand files to extract FCC IDs
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Cache for parsed data
let libroMaestroCache = [];
let cacheLoaded = false;

/**
 * Brand mappings for file detection
 */
const BRAND_FILES = {
  chevrolet: 'libro_maestro_gm.txt',
  gmc: 'libro_maestro_gm.txt',
  cadillac: 'libro_maestro_gm.txt',
  buick: 'libro_maestro_gm.txt',
  ford: 'ford-lincoln-mercury.txt',
  lincoln: 'ford-lincoln-mercury.txt',
  mercury: 'ford-lincoln-mercury.txt',
  toyota: 'lexus-scion-toyota.txt',
  lexus: 'lexus-scion-toyota.txt',
  scion: 'lexus-scion-toyota.txt',
  honda: 'acura-honda.txt',
  acura: 'acura-honda.txt',
  nissan: 'nissan-infiniti.txt',
  infiniti: 'nissan-infiniti.txt',
  hyundai: 'hyundai-kia.txt',
  kia: 'hyundai-kia.txt',
  bmw: 'bmw-mini.txt',
  mini: 'bmw-mini.txt',
  mazda: 'mazda,txt',
  subaru: 'subaru.txt',
  mitsubishi: 'mitsubishi.txt',
  mercedes: 'mercedes.txt',
  'mercedes-benz': 'mercedes.txt',
  volvo: 'volvo.txt',
  audi: 'audi-vw-porsche,txt',
  volkswagen: 'audi-vw-porsche,txt',
  vw: 'audi-vw-porsche,txt',
  porsche: 'audi-vw-porsche,txt',
  fiat: 'fiat-alfa romero.txt',
  alfa: 'fiat-alfa romero.txt',
  'alfa romeo': 'fiat-alfa romero.txt',
  jaguar: 'jaguar-land rover.txt',
  'land rover': 'jaguar-land rover.txt',
  dodge: 'chevy-dodge-jeep.txt',
  jeep: 'chevy-dodge-jeep.txt',
  chrysler: 'chevy-dodge-jeep.txt',
  ram: 'chevy-dodge-jeep.txt',
};

/**
 * Parse the libro_maestro_gm.txt file (best structured format)
 * @returns {Array} Array of parsed entries
 */
function parseLibroMaestroGM() {
  const entries = [];
  const filePath = path.join(__dirname, 'libros_marcas', 'libro_maestro_gm.txt');

  if (!fs.existsSync(filePath)) {
    logger.error('libro_maestro_gm.txt not found');
    return entries;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let currentModel = null;
    let currentYearStart = null;
    let currentYearEnd = null;
    let currentFccId = null;
    let currentFreq = null;
    let currentMake = 'Chevrolet'; // Default, will be updated based on index

    // Regex patterns
    const modelYearPattern = /^([A-Za-z][A-Za-z0-9\s-]+?)\s+(\d{4})\s*-\s*(\d{4})/;
    const fccPattern = /FCC\s*ID:\s*([A-Z0-9-]+)/i;
    const freqPattern = /Freq[.:]*\s*(\d+)\s*MHz/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect make from index sections
      if (line.includes('ÍNDICE CHEVROLET')) {currentMake = 'Chevrolet';}
      else if (line.includes('ÍNDICE GMC')) {currentMake = 'GMC';}
      else if (line.includes('ÍNDICE CADILLAC')) {currentMake = 'Cadillac';}
      else if (line.includes('ÍNDICE BUICK')) {currentMake = 'Buick';}

      // Match model and year range (e.g., "Avalanche 2007-2013")
      const modelMatch = line.match(modelYearPattern);
      if (modelMatch) {
        // Save previous entry if we have complete data
        if (currentModel && currentFccId) {
          entries.push({
            make: currentMake,
            model: currentModel,
            yearStart: currentYearStart,
            yearEnd: currentYearEnd,
            fccId: currentFccId,
            freq: currentFreq || 'Unknown',
          });
        }

        currentModel = modelMatch[1].trim();
        currentYearStart = parseInt(modelMatch[2]);
        currentYearEnd = parseInt(modelMatch[3]);
        currentFccId = null;
        currentFreq = null;
      }

      // Match FCC ID
      const fccMatch = line.match(fccPattern);
      if (fccMatch && currentModel) {
        currentFccId = fccMatch[1].trim();
      }

      // Match Frequency
      const freqMatch = line.match(freqPattern);
      if (freqMatch && currentModel) {
        currentFreq = freqMatch[1] + ' MHz';
      }
    }

    // Don't forget the last entry
    if (currentModel && currentFccId) {
      entries.push({
        make: currentMake,
        model: currentModel,
        yearStart: currentYearStart,
        yearEnd: currentYearEnd,
        fccId: currentFccId,
        freq: currentFreq || 'Unknown',
      });
    }

    logger.info(`Parsed ${entries.length} entries from libro_maestro_gm.txt`);
  } catch (error) {
    logger.error('Error parsing libro_maestro_gm.txt:', error.message);
  }

  return entries;
}

/**
 * Load all libro maestro data into cache
 */
function loadLibroMaestro() {
  if (cacheLoaded) {return libroMaestroCache;}

  // Parse GM book (most complete)
  const gmEntries = parseLibroMaestroGM();
  libroMaestroCache = [...gmEntries];

  // Also load custom_key_db.json as fallback
  try {
    const customDbPath = path.join(__dirname, 'custom_key_db.json');
    if (fs.existsSync(customDbPath)) {
      const customDb = JSON.parse(fs.readFileSync(customDbPath, 'utf8'));
      // Add custom entries that aren't duplicates
      for (const entry of customDb) {
        if (entry.fccId && entry.fccId !== 'Info') {
          const exists = libroMaestroCache.some(
            (e) =>
              e.make.toLowerCase() === entry.make.toLowerCase() &&
              e.model.toLowerCase() === entry.model.toLowerCase() &&
              e.yearStart === entry.startYear &&
              e.fccId === entry.fccId
          );
          if (!exists) {
            libroMaestroCache.push({
              make: entry.make,
              model: entry.model,
              yearStart: entry.startYear,
              yearEnd: entry.endYear,
              fccId: entry.fccId,
              freq: entry.freq || 'Unknown',
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error loading custom_key_db.json:', error.message);
  }

  cacheLoaded = true;
  logger.info(`Libro Maestro loaded with ${libroMaestroCache.length} total entries`);
  return libroMaestroCache;
}

/**
 * Search for FCC ID by vehicle details
 * @param {number} year - Vehicle year
 * @param {string} make - Vehicle make
 * @param {string} model - Vehicle model
 * @returns {Array} Matching FCC entries
 */
function searchFccId(year, make, model) {
  const data = loadLibroMaestro();
  const searchYear = parseInt(year);
  const searchMake = make.toLowerCase().trim();
  const searchModel = model.toLowerCase().trim();

  const results = data.filter((entry) => {
    // Match make (fuzzy)
    const entryMake = entry.make.toLowerCase();
    const makeMatch = entryMake.includes(searchMake) || searchMake.includes(entryMake);
    if (!makeMatch) {return false;}

    // Match model (fuzzy)
    const entryModel = entry.model.toLowerCase();
    const modelMatch =
      entryModel.includes(searchModel) ||
      searchModel.includes(entryModel) ||
      // Handle common abbreviations
      entryModel.replace(/\s+/g, '').includes(searchModel.replace(/\s+/g, ''));
    if (!modelMatch) {return false;}

    // Match year range
    const yearMatch = searchYear >= entry.yearStart && searchYear <= entry.yearEnd;
    return yearMatch;
  });

  // Remove duplicates and sort by relevance
  const uniqueResults = [];
  const seenFccIds = new Set();
  for (const result of results) {
    if (!seenFccIds.has(result.fccId)) {
      seenFccIds.add(result.fccId);
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}

/**
 * Get all data for a specific make
 * @param {string} make - Vehicle make
 * @returns {Array} All entries for that make
 */
function getByMake(make) {
  const data = loadLibroMaestro();
  const searchMake = make.toLowerCase().trim();
  return data.filter((entry) => entry.make.toLowerCase().includes(searchMake));
}

/**
 * Format search results for display
 * @param {Array} results - Search results
 * @returns {string} Formatted string
 */
function formatResults(results) {
  if (!results || results.length === 0) {
    return 'No se encontró FCC ID en el libro maestro.';
  }

  return results
    .map((r) => `FCC: ${r.fccId} | Freq: ${r.freq} | Años: ${r.yearStart}-${r.yearEnd}`)
    .join('\n');
}

// Initialize cache on module load
loadLibroMaestro();

module.exports = {
  searchFccId,
  getByMake,
  formatResults,
  loadLibroMaestro,
};
