
require('dotenv').config();

async function checkHealth() {
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    try {
        const profile = await fetch('https://gate.whapi.cloud/users/profile', {
            headers: { authorization: `Bearer ${WHAPI_TOKEN}` }
        });
        console.log('HTTP:', profile.status);
        if (profile.status !== 200) {
            console.log('Status: DISCONNECTED / ERROR');
            const txt = await profile.text();
            console.log('Body:', txt);
        } else {
            const data = await profile.json();
            console.log('Status:', data.status || 'ACTIVE (Assumed)');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}
checkHealth();
