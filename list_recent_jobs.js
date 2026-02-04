require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listRecent() {
    console.log('🔍 Listing last 20 video jobs...');

    const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    data.forEach(t => {
        console.log(`[${t.created_at}] ID: ${t.job_id}`);
        console.log(`   Title: ${t.title}`);
        console.log(`   Model: ${t.idea ? 'Check Idea' : 'N/A'}`);
    });
}

listRecent();
