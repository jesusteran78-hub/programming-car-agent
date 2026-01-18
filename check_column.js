
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('price_requests').select('price_data').limit(1);
    if (error) {
        console.log('❌ Column likely missing:', error.message);
    } else {
        console.log('✅ Column exists!');
    }
}
check();
