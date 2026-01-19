
// Using native fetch (Node 18+)
require('dotenv').config();

const TOKEN = 'sbp_341e2d8c50b0059c624089e2f1b4bbdd5c229b93';
const PROJECT_REF = 'fqzhajwnnkrkuktqquuj'; // Extracted from Supabase URL

async function getKeys() {
    console.log(`🚀 Fetching keys for project ${PROJECT_REF}...`);

    // Supabase Management API - Get API Keys
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('❌ Failed:', response.status, err);
        } else {
            const data = await response.json();
            // data is array: [{ name: 'anon', api_key: '...' }, { name: 'service_role', ... }]
            const anon = data.find(k => k.name === 'anon');
            const service = data.find(k => k.name === 'service_role');

            if (anon) {
                console.log(`✅ ANON_KEY found`);
                require('fs').writeFileSync('anon_key.txt', anon.api_key);
            }
            if (service) console.log(`🔐 SERVICE_KEY found`);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

getKeys();
