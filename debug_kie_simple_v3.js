require('dotenv').config();
const axios = require('axios');

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';

async function testKie() {
    console.log('🔍 Testing KIE API Connection...');

    try {
        // Testing the model name found in video_engine.js
        const modelName = 'sora-2-image-to-video';

        const payload = {
            model: modelName,
            input: {
                prompt: "Test video of a car key",
                image_urls: ["https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png"],
                aspect_ratio: 'portrait',
                n_frames: '15',
                size: 'standard',
                remove_watermark: true,
            },
        };

        console.log(`Sending payload with model: ${modelName}`);

        const response = await axios.post(
            KIE_CREATE_TASK_URL,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${KIE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('✅ Success! Full Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error calling KIE:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
}

testKie();
