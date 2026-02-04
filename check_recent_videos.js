require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRecentVideos() {
    console.log('🔍 Checking last 6 failed video jobs...');

    // Select last 10 jobs
    const { data: jobs, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(6);

    if (error) {
        console.error('❌ Error fetching jobs:', error.message);
        return;
    }

    if (jobs.length === 0) {
        console.log('⚠️ No failed jobs found.');
        return;
    }

    jobs.forEach(j => {
        console.log(`\n🆔 Job: ${j.job_id}`);
        console.log(`   Title: ${j.title}`);
        console.log(`   Idea: ${j.idea}`); // print full idea to check for URLs
        console.log(`   Status: ${j.status}`);
    });
}

checkRecentVideos();
