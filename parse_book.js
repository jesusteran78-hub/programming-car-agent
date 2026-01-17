const fs = require('fs');

const inputFile = 'libro_de_llave';
const outputFile = 'custom_key_db.json';

try {
  const data = fs.readFileSync(inputFile, 'utf8');
  const lines = data.split('\n');

  let currentMake = 'Chevrolet'; // Default
  let currentModel = '';
  let startYear = 0;
  let endYear = 0;

  // Known Brands to look for as headers
  const KNOWN_BRANDS = [
    'CHEVROLET',
    'FORD',
    'LINCOLN',
    'MERCURY',
    'CHRYSLER',
    'DODGE',
    'JEEP',
    'RAM',
    'GMC',
    'BUICK',
    'CADILLAC',
    'PONTIAC',
    'SATURN',
    'HUMMER',
    'OLDSMOBILE',
    'HONDA',
    'ACURA',
    'TOYOTA',
    'LEXUS',
    'SCION',
    'NISSAN',
    'INFINITI',
    'MAZDA',
    'HYUNDAI',
    'KIA',
    'VOLKSWAGEN',
    'AUDI',
    'SEAT',
    'BMW',
    'MINI',
    'MERCEDES',
    'SMART',
    'FIAT',
    'ALFA ROMEO',
    'SUZUKI',
    'MITSUBISHI',
    'SUBARU',
    'LAND ROVER',
    'VOLVO',
    'JAGUAR',
  ];

  const db = [];

  // Regex patterns
  const indexRegex = /^(?:Í|I)NDICE\s+(.+)/i; // Relaxed: Matches "ÍNDICE ..." ignoring end constraints
  const modelYearRegex = /^([A-Za-z0-9\s\-/().]+)\s+(\d{4})[-–](\d{4})/;
  const singleYearRegex = /^([A-Za-z0-9\s\-/().]+)\s+(\d{4})/;
  const fccRegex = /FCC\s*ID:\s*([A-Za-z0-9\-_]+)/i;
  const freqRegex = /Freq[:.]\s*(\d{3}(?:\.\d+)?)\s*MHz/i;

  let currentEntry = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const upperLine = line.toUpperCase();

    // Skip empty lines or pure digits
    if (!line || /^\d+$/.test(line)) {continue;}

    // 1. Check for Explicit Brand Header
    // Pattern A: "ÍNDICE FORD" or "ÍNDICE CHRYSLER DODGE JEEP"
    const match = line.match(indexRegex);

    if (match) {
      const potentialMakeString = match[1].trim();
      const upperPotential = potentialMakeString.toUpperCase();

      // Check if this string contains ANY known brand
      const containsBrand = KNOWN_BRANDS.some((b) => upperPotential.includes(b));

      if (containsBrand) {
        currentMake = potentialMakeString;
        console.log(`[${i + 1}] Switching Make to: ${currentMake}`);
        currentModel = '';
        continue;
      } else {
        console.log(`DEBUG: Header found but no known brand in '${upperPotential}'`);
      }
    }

    // ... (Pattern B stays same) ...
    // ... (Rest of loop) ...

    // Check for FCC ID and other logic...
    // [Existing logic in loop is assumed to remain via replace_file_content context matching, but wait.]
    // replace_file_content replaces contiguous blocks. I need to be careful not to delete the loop body.
    // My start line is 33 (where regex definitions are).
    // I should only replace the Regex definition.
  }
  // ...

  // Correcting my instruction: I will replace just the Regex definition line.
  // And add the console.log at the end.

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const upperLine = line.toUpperCase();

    // Skip empty lines or pure digits
    if (!line || /^\d+$/.test(line)) {continue;}

    // 1. Check for Explicit Brand Header
    // Pattern A: "ÍNDICE FORD" or "ÍNDICE CHRYSLER DODGE JEEP"
    let match = line.match(indexRegex);

    // DEBUG: Trace Ford Line
    if (upperLine.includes('FORD') && upperLine.length < 50) {
      console.log(`DEBUG: Line match? ${!!match} | Content: '${line}'`);
    }

    if (match) {
      const potentialMakeString = match[1].trim();
      const upperPotential = potentialMakeString.toUpperCase();

      // Check if this string contains ANY known brand
      const containsBrand = KNOWN_BRANDS.some((b) => upperPotential.includes(b));

      if (containsBrand) {
        currentMake = potentialMakeString;
        console.log(`[${i + 1}] Switching Make to: ${currentMake}`);
        currentModel = '';
        continue;
      } else {
        console.log(`DEBUG: Header found but no known brand in '${upperPotential}'`);
      }
    }

    // Pattern B: Just "FORD" or "CHRYSLER" alone on a line
    // Also check for composite "CHRYSLER DODGE JEEP" on one line
    if (upperLine.length < 50 && KNOWN_BRANDS.some((b) => upperLine.includes(b))) {
      // Heuristic: If it matches a known brand EXACTLY or contains explicit separators?
      // Actually, single line "FORD" is safe. "CHRYSLER DODGE JEEP" is also safe if it's short.
      // But valid model names might contain brands? e.g. "Ford Expedition"
      // Typically headers are UPPERCASE. Models might be mixed.
      // Let's strictly check if the line IS a known brand OR strictly matches a composite string we trust.
      // For now, let's rely on pattern A mostly. Pattern B only for exact matches.

      if (KNOWN_BRANDS.includes(upperLine)) {
        currentMake = upperLine.charAt(0).toUpperCase() + upperLine.slice(1).toLowerCase();
        console.log(`[${i + 1}] Switching Make to: ${currentMake}`);
        currentModel = '';
        continue;
      }
    }

    // 2. Check for Model Header
    match = line.match(modelYearRegex);
    if (match) {
      // If we have a pending entry with an FCC ID, save it (though usually FCC comes after)
      // But actually, we are resetting for a new block
      currentModel = match[1].trim();
      startYear = parseInt(match[2]);
      endYear = parseInt(match[3]);

      // Reset entry
      currentEntry = {
        make: currentMake,
        model: currentModel,
        startYear: startYear,
        endYear: endYear,
        fccId: null,
        freq: null,
      };
      continue;
    }

    // Check for single year (e.g., "Blazer 1997")
    match = line.match(singleYearRegex);
    if (match && !line.includes('FCC ID')) {
      // Avoid matching FCC lines if they look like years
      // Only if it looks like a header (e.g. short line)
      if (line.length < 50) {
        currentModel = match[1].trim();
        startYear = parseInt(match[2]);
        endYear = parseInt(match[2]); // Same year

        currentEntry = {
          make: currentMake,
          model: currentModel,
          startYear: startYear,
          endYear: endYear,
          fccId: null,
          freq: null,
        };
        continue;
      }
    }

    // Check for FCC ID
    match = line.match(fccRegex);
    if (match) {
      if (currentEntry.model) {
        currentEntry.fccId = match[1].trim();
      }
    }

    // Check for Freq
    match = line.match(freqRegex);
    if (match) {
      if (currentEntry.model) {
        currentEntry.freq = match[1].trim() + ' MHz';

        // If we have both, verify if we should save.
        // Usually FCC comes first, then Freq.
        // We should push to DB when we encounter a NEW header or end of file?
        // Actually, let's just push when we have FCC ID effectively, or wait?
        // The structure is loose. Let's push when we find FCC ID, and if Freq is found later, update it?
        // Better: The block structure seems to be Header -> Info -> FCC -> Freq.
        // We can construct the object and push it when we hit the NEXT header or just keep updating the current 'block' object
        // and push it to a list.
        // But one header might have multiple keys? Rare in this format.

        // Let's modify logic:
        // We always have a 'currentContext' of model/year.
        // When we find an FCC ID, we create a record.
      }
    }

    // Strategy B:
    // When we find an FCC ID, we assume it belongs to the most recently seen Model Header.
    // We add it to the DB immediately.
    // If Freq is found shortly after, we append it to the LAST added entry.

    if ((match = line.match(fccRegex))) {
      if (currentModel) {
        db.push({
          make: currentMake,
          model: currentModel,
          startYear: startYear,
          endYear: endYear,
          fccId: match[1].trim(),
          freq: null, // Placeholder
        });
      }
    }

    if ((match = line.match(freqRegex))) {
      // Add freq to the last added entry if it matches context
      if (db.length > 0) {
        // Heuristic: only add if the last entry was added "recently" (e.g. within this block)
        // For simplicity, just add to the last one.
        db[db.length - 1].freq = match[1].trim() + ' MHz';
      }
    }
  }

  console.log(`Parsed ${db.length} entries.`);
  const uniqueMakes = [...new Set(db.map((e) => e.make))];
  console.log(`Unique Makes Found: ${uniqueMakes.join(', ')}`);
  fs.writeFileSync(outputFile, JSON.stringify(db, null, 2));

  // Print first 5 for verification
  console.log(JSON.stringify(db.slice(0, 5), null, 2));
} catch (err) {
  console.error('Error parsing:', err);
}
