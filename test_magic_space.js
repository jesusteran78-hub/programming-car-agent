
require('dotenv').config();
const { createPriceRequest } = require('./price_request_manager');

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
            // MAGIC SPACE HERE
            authorization: `Bearer ${WHAPI_TOKEN} `,
        },
        body: JSON.stringify({
            to: chatId,
            body: text,
        }),
    };

    try {
        console.log(`Sending to ${chatId} (With Magic Space)...`);
        const response = await fetch(url, options);
        const data = await response.json();
        console.log(`Response: ${data?.error?.code || 'Success'} - ${data?.error?.message || 'OK'}`);
        console.log('Full Data:', JSON.stringify(data));
    } catch (e) {
        console.error('Error:', e);
    }
};

async function runTest() {
    console.log('--- Testing Magic Space Theory ---');
    const owner = process.env.OWNER_PHONE;
    if (owner) {
        await realSendWhatsApp(owner, 'Test: Magic Space in Auth Header');
    }
}

runTest();
