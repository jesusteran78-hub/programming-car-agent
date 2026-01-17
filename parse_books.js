const fs = require('fs');
const path = require('path');

const LIBROS_DIR = path.join(__dirname, 'libros_marcas');
const OUTPUT_FILE = path.join(__dirname, 'custom_key_db.json');

const FILES_MAP = {
  'acura-honda.txt': ['Acura', 'Honda'],
  'audi-vw-porsche,txt': ['Audi', 'Volkswagen', 'Porsche'],
  'bmw-mini.txt': ['BMW', 'Mini'],
  'chevy-dodge-jeep.txt': ['Chevrolet', 'Dodge', 'Jeep', 'Chrysler', 'Ram'],
  'fiat-alfa romero.txt': ['Fiat', 'Alfa Romeo'],
  'ford-lincoln-mercury.txt': ['Ford', 'Lincoln', 'Mercury'],
  'gm.txt': ['Buick', 'Cadillac', 'Chevrolet', 'GMC', 'Hummer', 'Oldsmobile', 'Pontiac', 'Saturn'],
  'gm,txt': ['Buick', 'Cadillac', 'Chevrolet', 'GMC', 'Hummer', 'Oldsmobile', 'Pontiac', 'Saturn'],
  'libro_maestro_gm.txt': ['Chevrolet', 'Buick', 'Cadillac', 'GMC', 'Pontiac', 'Saturn'], // NEW GLOBAL GM BOOK
  'hyundai-kia.txt': ['Hyundai', 'Kia'],
  'jaguar-land rover.txt': ['Jaguar', 'Land Rover'],
  'lexus-scion-toyota.txt': ['Lexus', 'Scion', 'Toyota'],
  'mazda.txt': ['Mazda'],
  'mazda,txt': ['Mazda'],
  'mercedes.txt': ['Mercedes-Benz'],
  'mitsubishi.txt': ['Mitsubishi'],
  'nissan-infiniti.txt': ['Nissan', 'Infiniti'],
  'subaru.txt': ['Subaru'],
  'volvo.txt': ['Volvo'],
};

const database = [];

function parseYearRange(rangeStr) {
  if (!rangeStr) {return null;}
  const match = rangeStr.match(/(\d{4})(?:\s*-\s*(\d{2,4}))?/);
  if (!match) {return null;}

  const start = parseInt(match[1]);
  let end = start;

  if (match[2]) {
    const endPart = match[2];
    if (endPart.length === 2) {
      const startCentury = Math.floor(start / 100) * 100;
      end = startCentury + parseInt(endPart);
      if (end < start) {end += 100;}
    } else {
      end = parseInt(endPart);
    }
  }
  return { start, end };
}

function processFile(filename) {
  const filePath = path.join(LIBROS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filename}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const brands = FILES_MAP[filename] || [];

  let currentMake = brands[0] || 'Unknown';
  let currentModel = 'Unknown';
  let currentStartYear = 0;
  let currentEndYear = 0;

  const isDebug = filename.includes('libro_maestro'); // Debug focus on new file

  // Regex 1: "2007-13 MDX" (Year First)
  const headerRegexYearFirst = /^\s*(\d{4}(?:\s*-\s*\d{2,4})?)\s+([A-Z0-9\s()/-]+)/i;
  // Regex 2: "Astra 2000-2003" (Model First)
  // Removed $ anchor to handle trailing noise/comments/CRLF issues better
  const headerRegexModelFirst = /^\s*([A-Z0-9\s()/-]+?)\s+(\d{4}(?:\s*-\s*\d{2,4})?)/i;

  const fccRegex = /(?:FCC|ECC|FCC ID|ECC ID|FV-|FV\s|FOC)\s*[:.]?\s*([A-Z0-9-]+)/i;
  const freqRegex = /(\d{3}(?:\.\d+)?)\s*MHz/i;

  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) {return;}

    // Update Make if line contains brand name
    brands.forEach((brand) => {
      if (line.toLowerCase().includes(brand.toLowerCase())) {
        currentMake = brand;
      }
    });

    // Try to match Headers
    let yearRange = null;
    let modelCandidate = null;

    const matchYearFirst = line.match(headerRegexYearFirst);
    const matchModelFirst = line.match(headerRegexModelFirst);

    if (matchYearFirst) {
      yearRange = parseYearRange(matchYearFirst[1]);
      modelCandidate = matchYearFirst[2];
    } else if (matchModelFirst) {
      // Check if capture group 1 looks like a model and not just garbage
      // "Astra 2000-2003" -> Model: Astra, Year: 2000-2003
      yearRange = parseYearRange(matchModelFirst[2]);
      modelCandidate = matchModelFirst[1];
    }

    // --- FALLBACK FOR GM BOOK ---
    // If strict regex failed, but we see a clear year range like "2000-2005"
    if (!yearRange && line.match(/\d{4}\s*-\s*\d{4}/)) {
      const fallbackMatch = line.match(/(.*?)\s+(\d{4}\s*-\s*\d{4})/);
      if (fallbackMatch) {
        modelCandidate = fallbackMatch[1];
        yearRange = parseYearRange(fallbackMatch[2]);
        // console.log(`[DEBUG] Fallback Header: ${modelCandidate} [${fallbackMatch[2]}]`);
      }
    }

    if (yearRange && modelCandidate) {
      // Clean up: stop at "Key", "Prox", "Remote"
      const cleanupRegex = /\s(Key|Prox|Remote|Fob|Smart|System).*/i;
      modelCandidate = modelCandidate.replace(cleanupRegex, '').trim();
      modelCandidate = modelCandidate.replace(/\(.*\)/g, '').trim();

      const isJustBrand = brands.some((b) => b.toLowerCase() === modelCandidate.toLowerCase());

      // Extra validity check: Model shouldn't be too long or numeric
      // Also ignore if model candidate is empty
      if (modelCandidate.length > 1 && !isJustBrand && !modelCandidate.match(/^\d/)) {
        currentStartYear = yearRange.start;
        currentEndYear = yearRange.end;
        currentModel = modelCandidate;
        if (isDebug)
          {console.log(`[DEBUG] Header: ${currentStartYear}-${currentEndYear} ${currentModel}`);}
      }
    }

    // Try to match FCC ID
    const fccMatch = line.match(fccRegex);
    if (fccMatch) {
      const fccId = fccMatch[1];
      // Filter noise
      if (fccId.length < 3 || fccId.startsWith('ID')) {return;}

      if (currentModel !== 'Unknown' && currentStartYear !== 0) {
        const freqMatch = line.match(freqRegex);
        const freq = freqMatch ? freqMatch[1] : 'Unknown';

        database.push({
          make: currentMake,
          model: currentModel,
          startYear: currentStartYear,
          endYear: currentEndYear,
          fccId: fccId,
          freq: freq,
        });
        if (isDebug) {console.log(`[DEBUG] Added: ${currentModel} ${fccId}`);}
      } else {
        if (isDebug) {console.log(`[DEBUG] Skipped FCC (No Context): ${fccId}`);}
      }
    }
  });
}

function run() {
  const files = fs.readdirSync(LIBROS_DIR);

  files.forEach((f) => {
    if (FILES_MAP[f] || FILES_MAP[f.replace(',', '.')]) {
      console.log(`Processing ${f}...`);
      processFile(f);
    }
  });

  console.log(`\nTotal raw entries: ${database.length}`);

  const uniqueDb = [];
  const seen = new Set();

  database.forEach((item) => {
    const key = `${item.make}|${item.model}|${item.startYear}|${item.endYear}|${item.fccId}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDb.push(item);
    }
  });

  console.log(`Total unique entries: ${uniqueDb.length}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueDb, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);
}

run();
