
require('dotenv').config();

async function checkHealth() {
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    console.log('Token check:', WHAPI_TOKEN?.substring(0, 10) + '...');

    try {
        // 1. Check Profile/Limit
        const profile = await fetch('https://gate.whapi.cloud/users/profile', {
            headers: { authorization: `Bearer ${WHAPI_TOKEN}` }
        });
        console.log('Profile Status:', profile.status);
        const profileData = await profile.json();
        console.log('Profile Data:', JSON.stringify(profileData, null, 2));

        // 2. Check Health/State
        const health = await fetch('https://gate.whapi.cloud/health', {
            headers: { authorization: `Bearer ${WHAPI_TOKEN}` }
        });
        console.log('Health Status:', health.status);
        const healthData = await health.json();
        console.log('Health Data:', JSON.stringify(healthData, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}

checkHealth();
