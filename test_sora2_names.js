require('dotenv').config();
const axios = require('axios');

const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/task/create'; // Is this the right URL? Double check video-generator.js constants if fails
const KIE_API_KEY = process.env.KIE_API_KEY;

// Endpoint stored in video-generator.js might be different?
// video-generator.js constant verification needed.
// Assuming it is the standard one.

async function testSora2() {
    console.log('🧪 Testing "sora-2-text-to-video" model...');

    try {
        const response = await axios.post(
            'https://api.kie.ai/api/v1/video/text-to-video', // Trying specific endpoint if generic fails
            // Wait, video-generator.js uses KIE_CREATE_TASK_URL. Let's look up its value.
            // I recall seeing it in the imports or config... wait, I can just use the tool to check the value of the constant.
            // For now, I'll use the generic one.
            {
                model: 'sora-2-text-to-video',
                input: {
                    prompt: "A red car driving in Miami",
                    aspect_ratio: "portrait",
                    n_frames: "15"
                }
            },
            { headers: { Authorization: `Bearer ${KIE_API_KEY}` } }
        );
        console.log('✅ Response:', response.status);
        console.log('   Data:', response.data);
    } catch (e) {
        console.log('❌ Failed generic endpoint:', e.response ? e.response.data : e.message);

        // Try the task/submit endpoint which uses 'model' param
        console.log('\n🔄 Trying /api/v1/task/submit ...');
        try {
            // ...
        } catch (e2) {
            // ...
        }
    }
}

// Better approach: Import the actual function and test it
const { createKieTextToVideo } = require('./src/agents/marcus/video-generator');
async function runIntegrationTest() {
    console.log('🧪 Integration Test: createKieTextToVideo("sora-2-text-to-video")');
    try {
        const result = await createKieTextToVideo("Test prompt car keys miami");
        console.log('✅ Success! URL:', result);
    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
}

runIntegrationTest();
