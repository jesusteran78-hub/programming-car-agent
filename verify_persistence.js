
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TEST_PHONE = '9999999999@s.whatsapp.net';

async function verifyPersistence() {
    console.log('--- STARTING PERSISTENCE CHECK ---');

    // 1. Get initial count
    const { count: startCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
    console.log('Initial Conversation Count:', startCount);

    // 2. Simulate Webhook
    const payload = {
        messages: [{
            from_me: false,
            chat_id: TEST_PHONE,
            text: { body: 'Hola, esto es una prueba de base de datos' },
            type: 'text',
            timestamp: Date.now() / 1000
        }]
    };

    try {
        console.log('Inyecting webhook...');
        await fetch('http://localhost:3000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Wait for async save
        console.log('Waiting for DB save...');
        await new Promise(r => setTimeout(r, 4000));

        // 3. Get final count
        const { count: endCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
        console.log('Final Conversation Count:', endCount);

        if (endCount > startCount) {
            console.log('✅ SUCCESS: Messages persisted!');

            // Show the messages
            const { data } = await supabase
                .from('conversations')
                .select('*, leads(phone)')
                .order('created_at', { ascending: false })
                .limit(2);
            console.log('Recent Messages:', JSON.stringify(data, null, 2));

        } else {
            console.error('❌ FAILURE: No new messages found.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

verifyPersistence();
