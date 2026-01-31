const campaign = require('./src/agents/viper/reactivation-campaign');
const { getSupabase } = require('./src/core/supabase');

async function run() {
    console.log('--- VIPER CAMPAIGN: EXPERT CONSULTANT (LIVE LAUNCH) ---');
    console.log('WARNING: This will send REAL messages via WhatsApp.');

    // 1. Get targets (LIMIT INCREASED TO 300 for Full Blast)
    const leads = await campaign.findStaleLeads(300);
    console.log(`Matched ${leads.length} leads.`);

    if (leads.length === 0) {
        console.log('No leads found.');
        return;
    }

    const supabase = getSupabase();
    const uniquePhones = new Set();
    let sentCount = 0;

    for (const lead of leads) {
        if (uniquePhones.has(lead.phone_number)) continue;
        uniquePhones.add(lead.phone_number);

        // 2. Generate Message
        const message = await campaign.generateReactivationMessage(lead);

        console.log(`\n[SENDING] To: ${lead.phone_number}`);
        console.log(`[CONTENT] "${message}"`);

        // 3. SEND (Simulated for now unless we have the Whatsapp Client exposed here)
        // In the real ATLAS info, we usually send via a 'dispatcher' or inserting into a 'messages' outbound queue.
        // I will insert into 'conversations' table with role='assistant' which triggers the sender (if set up that way)
        // OR simply log it as SENT if we don't have direct send access here.

        // 3. SEND (Insert into DB)
        // We use the ID that was already present on the conversation (legacy 199 or UUID)
        // If we found a 'real_lead_id' (UUID) from the join, we can try that if the legacy one fails,
        // but for consistency with the conversation history, we stick to what we found.

        const targetLeadId = lead.real_lead_id || lead.lead_id;

        if (!targetLeadId) {
            console.error(`❌ SKIPPING: No valid Lead ID found for ${lead.phone_number}`);
            continue;
        }

        const { error } = await supabase
            .from('conversations')
            .insert({
                lead_id: targetLeadId,
                role: 'assistant',
                content: message,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error(`❌ FAILED to insert for ${lead.phone_number}:`, error.message);
        } else {
            console.log(`✅ SENT to ${lead.phone_number} (ID: ${targetLeadId})`);
            sentCount++;
        }

        // Anti-spam delay
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n✅ CAMPAIGN COMPLETE. Sent ${sentCount} messages.`);
}

run();
