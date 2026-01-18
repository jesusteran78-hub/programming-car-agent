
require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // FORCE IPv4

async function checkChannels() {
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    const url = 'https://gate.whapi.cloud/channels';

    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${WHAPI_TOKEN}`,
        }
    };

    try {
        console.log('Checking channels (IPv4 forced) with token:', WHAPI_TOKEN.substring(0, 5) + '...');
        const response = await fetch(url, options);
        const data = await response.json();
        console.log('Channels Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

checkChannels();
