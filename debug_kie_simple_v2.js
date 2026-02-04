require('dotenv').config();
const axios = require('axios');

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';

async function testKie() {
    console.log('🔍 Testing KIE API Connection...');
    console.log('API Key present:', !!KIE_API_KEY);

    try {
        // Trying a different model or just testing the connection
        const payload = {
            model: 'kling-v1', // Trying a fallback common model first to check connectivity
            input: {
                prompt: "Test video",
                image_urls: ["https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png"],
            },
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2));

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
