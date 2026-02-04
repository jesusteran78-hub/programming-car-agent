require('dotenv').config();
const axios = require('axios');

const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const KIE_API_KEY = process.env.KIE_API_KEY;
const TEST_ID = 'ca9c10541fc2840ba55abcec535a0e73';

async function debugKieResponse() {
    console.log(`🔍 Inspecting Task: ${TEST_ID}...`);
    try {
        const response = await axios.get(KIE_GET_TASK_URL, {
            params: { taskId: TEST_ID },
            headers: { Authorization: `Bearer ${KIE_API_KEY}` }
        });

        // Dump FULL data depth
        console.dir(response.data, { depth: null, colors: true });

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.dir(e.response.data, { depth: null });
    }
}

debugKieResponse();
