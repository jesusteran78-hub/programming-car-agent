
// Using native fetch (Node 18+)
require('dotenv').config();

const TOKEN = 'sbp_341e2d8c50b0059c624089e2f1b4bbdd5c229b93';
const PROJECT_URL = process.env.SUPABASE_URL;
// Extract project ref from URL (e.g., https://tojkrl.supabase.co -> tojkrl)
const PROJECT_REF = PROJECT_URL.match(/https:\/\/([^.]+)\./)[1];

const SQL = `
ALTER TABLE price_requests ADD COLUMN IF NOT EXISTS price_data JSONB;
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS price_data JSONB;
`;

async function runMigration() {
    console.log(`🚀 Connecting to project ${PROJECT_REF}...`);

    // Supabase Management API SQL Endpoint
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({ query: SQL })
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('❌ Migration Failed:', err);
    } else {
        const result = await response.json();
        console.log('✅ Migration Successful!', result);
    }
}

runMigration();
