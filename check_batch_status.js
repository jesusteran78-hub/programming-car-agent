
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkStatus() {
    console.log('🔍 Checking recent video jobs...');
    const { data, error } = await supabase
        .from('video_jobs')
        .select('job_id, title, status, error, created_at, video_url')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching jobs:', error.message);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkStatus();
