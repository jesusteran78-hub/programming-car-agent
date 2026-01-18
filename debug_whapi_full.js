
const fs = require('fs');
require('dotenv').config();

async function debugWhapi() {
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    const logFile = 'whapi_debug.log';

    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    fs.writeFileSync(logFile, `--- WHAPI DEBUG ${new Date().toISOString()} ---\n`);

    try {
        // 1. Profile
        log('Fetching /users/profile...');
        const profile = await fetch('https://gate.whapi.cloud/users/profile', {
            headers: { authorization: `Bearer ${WHAPI_TOKEN}` }
        });
        const profileData = await profile.json();
        log(`Profile HTTP: ${profile.status}`);
        log('Profile JSON:');
        log(JSON.stringify(profileData, null, 2));

        // 2. Health
        log('\nFetching /health...');
        const health = await fetch('https://gate.whapi.cloud/health', {
            headers: { authorization: `Bearer ${WHAPI_TOKEN}` }
        });
        const healthData = await health.json();
        log(`Health HTTP: ${health.status}`);
        log('Health JSON:');
        log(JSON.stringify(healthData, null, 2));

    } catch (e) {
        log('ERROR: ' + e.message);
    }
}

debugWhapi();
