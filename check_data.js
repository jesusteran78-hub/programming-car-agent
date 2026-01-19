
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    console.log("🔍 Checking Table Counts...");

    const { count: requestsCount, error: err1 } = await supabase
        .from('price_requests')
        .select('*', { count: 'exact', head: true });

    const { count: pricesCount, error: err2 } = await supabase
        .from('service_prices')
        .select('*', { count: 'exact', head: true });

    if (err1) console.error("❌ Error Requests:", err1);
    else console.log(`✅ Price Requests: ${requestsCount}`);

    if (err2) console.error("❌ Error Prices:", err2);
    else console.log(`✅ Service Prices: ${pricesCount}`);

    // Fetch top 1 just to be sure
    const { data } = await supabase.from('price_requests').select('*').limit(1);
    console.log("Sample Data:", data);
}

check();
