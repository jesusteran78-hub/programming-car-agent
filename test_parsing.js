
const { handleOwnerResponse, createPriceRequest, OWNER_PHONE } = require('./price_request_manager');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Mock dependencies
const mockSendWhatsApp = async (phone, msg) => console.log(`\n📱 SIMULATED WHATSAPP to ${phone}:\n${msg}\n`);

// Mock Text that the Owner would send (Using Strict Terms)
const TEST_INPUT = "Tengo estas: 320 OEM, 250 refurb y 180 la generica";

async function runTest() {
    console.log("🧪 STARTING INTEGRATION TEST...");

    // 1. Create a Dummy Request
    const testPhone = '1234567890@s.whatsapp.net';
    console.log("Creating dummy request...");
    const { success, code } = await createPriceRequest(
        mockSendWhatsApp,
        testPhone,
        'TEST_MAKE',
        'TEST_MODEL',
        2024,
        'copy',
        'TEST_FCC',
        'TEST_VIN',
        []
    );

    if (!success) {
        console.error("❌ Failed to create setup request.");
        return;
    }
    console.log(`✅ Setup Request Created: ${code}`);

    // 2. Run the Handler
    console.log(`\n📥 Simulating Owner Input: "${TEST_INPUT}"`);
    const result = await handleOwnerResponse(mockSendWhatsApp, TEST_INPUT);

    if (result.handled) {
        console.log("✅ TEST PASSED: Input handled successfully.");
    } else {
        console.error("❌ TEST FAILED: Result:", result);
    }

    // 3. Cleanup (Optional, but good manners)
    // We leave it to see in the Dashboard potentially?
    // console.log("Cleaning up...");
    // await supabase.from('price_requests').delete().eq('request_code', code);
}

runTest();
