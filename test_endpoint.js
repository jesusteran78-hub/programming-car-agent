const axios = require('axios');

async function testEndpoint() {
  console.log('🧪 PROBANDO ENDPOINT /api/video...');
  try {
    const response = await axios.post('http://localhost:3000/api/video', {
      title: 'Test Video',
      idea: 'Test Idea',
      image: '',
    });
    console.log('✅ ÉXITO:', response.data);
  } catch (error) {
    console.error('❌ ERROR:', error.response ? error.response.status : error.message);
    if (error.response) {console.error('Data:', error.response.data);}
  }
}

testEndpoint();
