// key_finder.js
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse'); // We'll need to install this or use simple split if no dependency desired. Let's use simple split for zero-dep.

// Cargar la base de datos en memoria al iniciar (es pequeña)
let keyDatabase = [];

function loadDatabase() {
    try {
        const csvPath = path.join(__dirname, 'fcc_db.csv');
        if (!fs.existsSync(csvPath)) {
            console.error("❌ Error: mcc_db.csv no encontrado.");
            return;
        }

        const fileContent = fs.readFileSync(csvPath, 'utf8');
        // Simple CSV parser logic (assuming standard format without tricky quotes)
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Indices
        const yearIdx = headers.indexOf('year');
        const makeIdx = headers.indexOf('make');
        const modelIdx = headers.indexOf('model');
        const fccIdx = headers.indexOf('fccid');

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim());
            if (row.length < 4) continue;

            keyDatabase.push({
                year: row[yearIdx],
                make: row[makeIdx]?.toLowerCase(),
                model: row[modelIdx]?.toLowerCase(),
                fcc: row[fccIdx]
            });
        }
        console.log(`🔑 Key Database loaded: ${keyDatabase.length} entries.`);

    } catch (e) {
        console.error("Error loading Key DB:", e);
    }
}

// Inicializar
loadDatabase();

async function findKeyDetails(year, make, model) {
    if (!year || !make || !model) return { error: "Faltan datos (Año, Marca o Modelo)" };

    const searchMake = make.toLowerCase();
    const searchModel = model.toLowerCase();
    const searchYear = year.toString();

    // Filtrar coincidencias
    const matches = keyDatabase.filter(k =>
        k.make === searchMake &&
        k.model === searchModel &&
        k.year === searchYear
    );

    // Eliminar duplicados de FCC ID
    const uniqueFCCs = [...new Set(matches.map(m => m.fcc).filter(f => f && f !== ''))];

    const supplierLinks = getSupplierLinks(`${year} ${make} ${model} Key`);

    return {
        found: uniqueFCCs.length > 0,
        fcc_ids: uniqueFCCs,
        supplier_links: supplierLinks
    };
}

function getSupplierLinks(query) {
    const encoded = encodeURIComponent(query);
    return {
        uhs_hardware: `https://www.uhs-hardware.com/collections/shop?q=${encoded}`,
        locksmith_keyless: `https://www.locksmithkeyless.com/search?q=${encoded}`
    };
}

module.exports = { findKeyDetails };
