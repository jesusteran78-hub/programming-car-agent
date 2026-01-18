
require('dotenv').config();

// Real WhatsApp Sender (using WHAPI if available)
const realSendWhatsApp = async (chatId, text) => {
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

    if (!WHAPI_TOKEN) {
        console.error('No WHAPI_TOKEN found');
        return;
    }

    const url = 'https://gate.whapi.cloud/messages/text';

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Bearer ${WHAPI_TOKEN}`,
        },
        body: JSON.stringify({
            to: chatId,
            body: text,
        }),
    };

    try {
        console.log(`Sending to ${chatId}...`);
        const response = await fetch(url, options);
        const data = await response.json();
        console.log(`Response: ${data?.error?.code || 'Success'} - ${data?.error?.message || 'OK'}`);
    } catch (e) {
        console.error('Error:', e);
    }
};

async function runTest() {
    console.log('--- Testing Token & Phone Formats ---');
    const owner = process.env.OWNER_PHONE;
    if (!owner) { console.log('Owner phone not found in env'); return; }

    // 1. As is
    await realSendWhatsApp(owner, 'Test 1: Full ID');

    // 2. Pure number
    const pure = owner.replace('@s.whatsapp.net', '');
    await realSendWhatsApp(pure, 'Test 2: Pure Number');

    // 3. Dummy
    await realSendWhatsApp('1234567890', 'Test 3: Dummy');
}

runTest();
