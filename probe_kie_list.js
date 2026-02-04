require('dotenv').config();
const axios = require('axios');

const KIE_API_KEY = process.env.KIE_API_KEY;
// Trying probable endpoints
const ENDPOINTS = [
    'https://api.kie.ai/api/v1/jobs/list',
    'https://api.kie.ai/api/v1/task/list',
    'https://api.kie.ai/api/v1/tasks',
    'https://api.kie.ai/api/v1/video/list'
];

async function probeList() {
    console.log('🕵️ probling KIE endpoints for task list...');

    for (const url of ENDPOINTS) {
        console.log(`\nTesting: ${url}`);
        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${KIE_API_KEY}` },
                params: { limit: 20, page: 1 } // Common params
            });
            console.log(`✅ SUCCESS (${response.status})`);
            console.log('Keys:', Object.keys(response.data));
            if (response.data.data) {
                console.log('Data Type:', Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
                if (Array.isArray(response.data.data) && response.data.data.length > 0) {
                    console.log('Sample Item:', JSON.stringify(response.data.data[0], null, 2));
                }
            }
        } catch (e) {
            console.log(`❌ Failed: ${e.response ? e.response.status : e.message}`);
        }
    }
}

probeList();
