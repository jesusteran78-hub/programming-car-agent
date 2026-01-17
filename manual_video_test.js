const axios = require('axios');
require('dotenv').config();

const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const API_KEY = process.env.KIE_API_KEY;

async function testKie() {
  console.log('🧪 TESTING KIE API DIRECTLY...');
  console.log('🔑 API KEY:', API_KEY ? API_KEY.substring(0, 5) + '...' : 'MISSING');

  try {
    const payload = {
      model: 'sora-2-image-to-video',
      input: {
        prompt:
          "A professional Latino mechanic holding a car key in a modern workshop. He looks at the camera and says in Spanish: 'Aquí tenemos la solución'. Cinematic lighting, 8k.",
        image_urls: [
          'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png',
        ],
        aspect_ratio: 'portrait',
        n_frames: '15',
        size: 'standard',
        remove_watermark: true,
      },
    };

    console.log('📦 PAYLOAD:', JSON.stringify(payload, null, 2));

    const response = await axios.post(KIE_CREATE_TASK_URL, payload, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('\n✅ RESPONSE STATUS:', response.status);
    console.log('✅ RAW DATA:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.taskId) {
      console.log(`\n🆔 TASK ID: ${response.data.data.taskId}`);
      console.log('👉 CHECK KIE DASHBOARD FOR THIS ID.');
    } else {
      console.error('❌ NO TASK ID FOUND IN RESPONSE.');
    }
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testKie();
