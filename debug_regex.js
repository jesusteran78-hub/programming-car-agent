const fs = require('fs');

const line = "Astra 2000-2003";
const line2 = "Astro 1997-1999";
const line3 = "Camaro 2010-2015";

const regex = /^\s*([A-Z0-9\s\(\)\/-]+?)\s+(\d{4}(?:\s*-\s*\d{2,4})?)\s*$/i;
const regexRelaxed = /^\s*([A-Z0-9\s\(\)\/-]+?)\s+(\d{4}(?:\s*-\s*\d{2,4})?)/i;

console.log("Original Regex Test:");
console.log(`"${line}":`, line.match(regex));

console.log("\nRelaxed Regex Test:");
console.log(`"${line}":`, line.match(regexRelaxed));
console.log(`"${line2}":`, line2.match(regexRelaxed));

// Test de lectura real de unas líneas del archivo
try {
    const content = fs.readFileSync('libros_marcas/libro_maestro_gm.txt', 'utf8');
    const lines = content.split('\n').filter(l => l.includes('Astra 2000-2003'));
    console.log("\nReal File Line:");
    console.log(JSON.stringify(lines[0])); // Para ver caracteres ocultos
    if (lines[0]) console.log("Match Real:", lines[0].match(regexRelaxed));
} catch (e) {
    console.log("Error reading file:", e.message);
}
