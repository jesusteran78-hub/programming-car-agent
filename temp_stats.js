require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getStats() {
    try {
        const { count: leadCount, error: leadError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true });

        const { count: msgCount, error: msgError } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true });

        const { data: statusCounts, error: statusError } = await supabase
            .from('leads')
            .select('status');

        if (leadError) console.error('Lead Error:', leadError);
        if (msgError) console.error('Msg Error:', msgError);

        const statusMap = {};
        if (statusCounts) {
            statusCounts.forEach(row => {
                statusMap[row.status] = (statusMap[row.status] || 0) + 1;
            });
        }

        console.log('\n--- ALEX PERFORMANCE STATS ---');
        console.log(`Total Leads (Potential Clients): ${leadCount}`);
        console.log(`Total Messages Exchanged: ${msgCount}`);
        console.log('Leads by Status:');
        console.table(statusMap);

    } catch (err) {
        console.error('Script Error:', err);
    }
}

getStats();
