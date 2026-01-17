const fs = require('fs');

try {
  const data = fs.readFileSync('libro_de_llave', 'utf8');
  const lines = data.split('\n');
  console.log(`Total lines: ${lines.length}`);

  // Look for major brands
  const brands = [
    'FORD',
    'NISSAN',
    'TOYOTA',
    'VOLKSWAGEN',
    'VW',
    'HONDA',
    'CHRYSLER',
    'DODGE',
    'JEEP',
    'MAZDA',
    'RENAULT',
    'PEUGEOT',
    'FIAT',
    'SUZUKI',
    'HYUNDAI',
    'KIA',
  ];

  lines.forEach((line, index) => {
    const upper = line.trim().toUpperCase();

    // Check for loose match of "INDICE [BRAND]"
    if (upper.includes('INDICE') && upper.length < 30) {
      console.log(`[${index + 1}] INDICE LINE: ${line.trim()}`);
    }

    brands.forEach((brand) => {
      // Check for exact match or "BRAND INDICE" or "INDICE BRAND" or just "BRAND"
      // Also check if line consists of just the brand and page number or dots
      if (upper.includes(brand)) {
        // Heuristic: Line is short (< 40 chars) and contains Brand
        if (upper.length < 40) {
          console.log(`[${index + 1}] POSSIBLE HEADER (${brand}): ${line.trim()}`);
        }
      }
    });
  });
} catch (err) {
  console.error(err);
}
