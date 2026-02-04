const campaign = require('./src/agents/viper/reactivation-campaign');

async function debug() {
    console.log('--- DEBUGGING LEAD DATA ---');
    const leads = await campaign.findStaleLeads(5);

    if (leads.length > 0) {
        console.log('First lead found:');
        const firstLead = leads[0];
        console.dir(firstLead, { depth: null });

        console.log('\nChecking keys for ID:');
        console.log('lead.lead_id:', firstLead.lead_id);
        console.log('lead.leads?.id:', firstLead.leads?.id);
    } else {
        console.log('No leads found to debug.');
    }
}

debug();
