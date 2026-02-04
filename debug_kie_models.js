require('dotenv').config();
const axios = require('axios');

const KIE_API_KEY = process.env.KIE_API_KEY;

async function listModels() {
    console.log('🔍 Listing KIE Models...');
    // Try common endpoint patterns
    const endpoints = [
        'https://api.kie.ai/api/v1/models',
        'https://api.kie.ai/api/v1/jobs/models', // some APIs nest it here
    ];

    for (const url of endpoints) {
        try {
            console.log(`Trying ${url}...`);
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${KIE_API_KEY}` }
            });
            console.log(`✅ Success from ${url}:`);
            console.log(JSON.stringify(response.data, null, 2));
            return;
        } catch (error) {
            console.log(`❌ Failed ${url}: ${error.response?.status || error.message}`);
        }
    }
}

listModels();
