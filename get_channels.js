require('dotenv').config();
const token = process.env.WHAPI_TOKEN;

async function listChannels() {
  console.log('🕵️ Asking API for Channels...');
  try {
    const response = await fetch('https://gate.whapi.cloud/channels?limit=10', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
listChannels();
