// key_finder.js
const fs = require('fs');
const path = require('path');

// Load databases
let customDatabase = [];

function loadDatabases() {
    // 1. Load Custom JSON (Sole Source of Truth)
    try {
        const customPath = path.join(__dirname, 'custom_key_db.json');
        if (fs.existsSync(customPath)) {
            const data = fs.readFileSync(customPath, 'utf8');
            customDatabase = JSON.parse(data);
            console.log(`Loaded ${customDatabase.length} entries from Custom Book.`);
        }
    } catch (error) {
        console.error('Error loading Custom DB:', error);
    }
}

// Initialize on load
loadDatabases();

/**
 * Finds key details (FCC ID) for a given vehicle.
 * USES ONLY CUSTOM BOOK.
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

    // Search Custom Database
    // Custom DB structure: { make, model, startYear, endYear, fccId, freq }
    const customMatches = customDatabase.filter(entry => {
        const entryMake = entry.make.toLowerCase();
        const entryModel = entry.model.toLowerCase();

        // Check Make
        if (!entryMake.includes(searchMake) && !searchMake.includes(entryMake)) return false;

        // Check Model (fuzzy match)
        if (!entryModel.includes(searchModel) && !searchModel.includes(entryModel)) return false;

        // Check Year Range
        if (searchYear >= entry.startYear && searchYear <= entry.endYear) return true;

        return false;
    });

    customMatches.forEach(match => {
        // Avoid duplicates
        if (!results.some(r => r.fccId === match.fccId)) {
            results.push({
                fccId: match.fccId,
                frequency: match.freq,
                source: 'Libro Maestro (Exclusivo)',
                note: `Rango: ${match.startYear}-${match.endYear}`
            });
        }
    });

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
    const query = `${year} ${make} ${model} ${fccId || ''}`.trim();
    const encodedQuery = encodeURIComponent(query);

    return [
        {
            name: 'UHS Hardware',
            url: `https://www.uhs-hardware.com/pages/search-results-page?q=${encodedQuery}`
        },
        {
            name: 'Locksmith Keyless',
            url: `https://www.locksmithkeyless.com/pages/search-results-page?q=${encodedQuery}`
        }
    ];
}

module.exports = {
    findKeyDetails,
    getSupplierLinks
};
