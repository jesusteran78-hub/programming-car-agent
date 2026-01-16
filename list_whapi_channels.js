require('dotenv').config();
const token = process.env.WHAPI_TOKEN;

async function listChannels() {
    console.log('🕵️ Listando canales disponibles...');
    try {
        // Endpoint to get list of channels or current profile
        // According to Whapi docs, /users/profile might show the channel ID or /channels

        // Try getting profile (often contains channel info)
        console.log('--- PROFILE ---');
        const profile = await fetch('https://gate.whapi.cloud/users/profile', {
            headers: { authorization: `Bearer ${token}` }
        });
        console.log(await profile.text());

        console.log('\n--- SETTINGS ---');
        const settings = await fetch('https://gate.whapi.cloud/settings', {
            headers: { authorization: `Bearer ${token}` }
        });
        console.log(await settings.text());

    } catch (e) {
        console.error('Error:', e.message);
    }
}
listChannels();
