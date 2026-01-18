require('dotenv').config();
const { createPriceRequest } = require('./price_request_manager');
const logger = require('./logger');

// Mock sendToWhapi using real API if token present, or log
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';

async function sendToWhapi(chatId, text) {
    console.log(`[TEST] Sending to ${chatId}: ${text}`);
    if (!WHAPI_TOKEN) {
        console.log('[TEST] No WHAPI_TOKEN, skipping real send.');
        return { simulated: true };
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
        if (!global.fetch) throw new Error('No global fetch available (Node < 18?)');

        const response = await fetch(url, options);
        const data = await response.json();
        console.log('[TEST] Response:', JSON.stringify(data));
        return data;
    } catch (e) {
        console.error('[TEST] Error sending:', e);
        throw e;
    }
}

async function runTest() {
    console.log('--- STARTING OWNER NOTIFICATION TEST ---');
    console.log('OWNER_PHONE:', OWNER_PHONE);

    const result = await createPriceRequest(
        sendToWhapi,
        '50432175088@s.whatsapp.net', // Fake client
        'Chevrolet',
        'Silverado',
        2023,
        'copy',
        'DEBUG-TEST-FCC'
    );

    console.log('Result:', result);

    if (result.success) {
        console.log('✅ Function reported success');
    } else {
        console.error('❌ Function reported failure');
    }
}

runTest();
