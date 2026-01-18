
require('dotenv').config();
const { createPriceRequest } = require('./price_request_manager');

// Real WhatsApp Sender (using WHAPI if available)
const realSendWhatsApp = async (chatId, text) => {
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    const CHANNEL_ID = 'ROCKET-KT8RB';

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
            // Try in body
            channel_id: CHANNEL_ID
        }),
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log('[REAL WHATSAPP] Response:', JSON.stringify(data));
        return data;
    } catch (e) {
        console.error('[REAL WHATSAPP] Error:', e);
    }
};

async function runTest() {
    console.log('--- Testing Price Request Notification (Body Param) ---');
    console.log('Sending to OWNER_PHONE:', process.env.OWNER_PHONE);

    const result = await createPriceRequest(
        realSendWhatsApp,
        '1234567890@s.whatsapp.net', // Client
        'Toyota', 'Corolla', 2020, // Car
        'Lost All', 'HYQ12BDM', // Service
        'VIN12345678901234', // VIN
        [{ name: 'Test Supplier', url: 'http://example.com' }] // Links
    );

    console.log('Result:', result);
}

runTest();
