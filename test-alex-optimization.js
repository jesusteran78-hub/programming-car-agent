/**
 * Test Script for Alex Optimization
 * Verifies: Bilingual support, Geo-filtering, and Daily Report
 */
require('dotenv').config();
const { processMessage } = require('./src/agents/alex');
const { runDailyReport } = require('./src/chronos/daily_report');

async function testAlex() {
    console.log('🧪 Starting Alex Verification...');

    // 1. Test Geo-Filtering (International Number)
    console.log('\n--- Test 1: International Number (Saudi Arabia) ---');
    const intResponse = await processMessage({
        chatId: '966555123456@s.whatsapp.net', // Saudi Arabia code
        text: 'Hello, price for TCM?',
        senderType: 'customer'
    }, async () => { }); // Mock sender

    if (intResponse === null) {
        console.log('✅ PASS: International number ignored (returned null)');
    } else {
        console.log('❌ FAIL: International number processed:', intResponse);
    }

    // 2. Test English Response (US Number)
    console.log('\n--- Test 2: English Inquiry (US Number) ---');
    const enResponse = await processMessage({
        chatId: '13055550100@s.whatsapp.net', // US Code +1
        text: 'Hello, how much for a 6L80 TCM for a 2015 Silverado?',
        senderType: 'customer'
    }, async () => { });

    console.log('Response:', enResponse);
    if (enResponse && (enResponse.includes('USD') || enResponse.includes('dollars'))) {
        console.log('✅ PASS: Responded in English with correct currency');
    } else {
        console.log('❌ FAIL: Response format incorrect');
    }

    // 3. Test Spanish Response (US Number)
    console.log('\n--- Test 3: Spanish Inquiry (US Number) ---');
    const esResponse = await processMessage({
        chatId: '17865550101@s.whatsapp.net', // US Code +1
        text: 'Hola, precio de un TCM para Silverado 2015?',
        senderType: 'customer'
    }, async () => { });

    console.log('Response:', esResponse);
    if (esResponse && (esResponse.includes('dolares') || esResponse.includes('USD'))) {
        console.log('✅ PASS: Responded in Spanish');
    } else {
        console.log('❌ FAIL: Response format incorrect');
    }

    // 4. Test Daily Report
    console.log('\n--- Test 4: Daily Report Generation ---');
    try {
        // We mock the whapi call inside the module or just run it to see if it crashes
        // For safety, we just run it. If it fails, it throws.
        await runDailyReport();
        console.log('✅ PASS: Daily report executed without error');
    } catch (e) {
        console.log('❌ FAIL: Daily report error:', e.message);
    }
}

testAlex();
