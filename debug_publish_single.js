require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const KIE_API_KEY = process.env.KIE_API_KEY;

const VIDEO_ID = 'ca9c10541fc2840ba55abcec535a0e73';

async function debugSingle() {
    console.log(`🚀 Debugging Single Video: ${VIDEO_ID}`);

    try {
        const response = await axios.get(KIE_GET_TASK_URL, {
            params: { taskId: VIDEO_ID },
            headers: { Authorization: `Bearer ${KIE_API_KEY}` }
        });

        const data = response.data.data;
        if (!data) {
            console.error('❌ Data not found');
            return;
        }

        console.log('Keys:', Object.keys(data));

        // Check resultJson
        const resultRaw = data.result || data.resultJson;
        console.log('Result RAW Type:', typeof resultRaw);
        console.log('Result RAW Content:', resultRaw);

        if (typeof resultRaw === 'string') {
            try {
                const parsed = JSON.parse(resultRaw);
                console.log('Parsed Content:', JSON.stringify(parsed, null, 2));

                // Test Access
                console.log('Access url:', parsed.url);
                console.log('Access videoUrl:', parsed.videoUrl);

            } catch (e) {
                console.error('Parse Error:', e.message);
            }
        }

    } catch (e) {
        console.error('Req Failed:', e.message);
    }
}

debugSingle();
