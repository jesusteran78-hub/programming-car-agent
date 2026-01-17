require('dotenv').config();
const token = process.env.WHAPI_TOKEN;

async function checkHealth() {
  console.log('🏥 Checking Whapi Health...');
  try {
    const response = await fetch('https://gate.whapi.cloud/health', {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
checkHealth();
