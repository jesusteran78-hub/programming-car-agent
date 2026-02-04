require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findVideo() {
    console.log('🔍 Searching for video from 2026-01-27 17:12:19...');

    // Search for any timestamp containing the time part or date part
    const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .gte('created_at', '2026-01-26T00:00:00')
        .lt('created_at', '2026-01-29T00:00:00')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${data.length} videos from that day.`);

    // Filter locally for the specific time "17:12:19"
    const target = data.filter(j =>
        (j.created_at && j.created_at.includes('17:12:19')) ||
        (j.completed_at && j.completed_at.includes('17:12:19'))
    );

    if (target.length > 0) {
        console.log('\n✅ FOUND MATCHES:');
        target.forEach(t => {
            console.log(`ID: ${t.job_id}`);
            console.log(`Title: ${t.title}`);
            console.log(`URL: ${t.video_url}`);
            console.log(`Created: ${t.created_at}`);
            console.log(`Completed: ${t.completed_at}`);
            console.log('-------------------');
        });
    } else {
        console.log('\n❌ No exact time match found. Listing all from that day for manual check:');
        data.forEach(t => {
            console.log(`[${t.created_at}] ID: ${t.job_id} | Title: ${t.title}`);
        });
    }
}

findVideo();
