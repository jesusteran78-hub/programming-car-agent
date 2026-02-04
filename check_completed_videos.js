require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function findCompletedVideos() {
    console.log('🔍 Checking for ANY completed videos in last 24h...');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Select completed jobs
    const { data: jobs, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('status', 'completed')
        .gt('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching jobs:', error.message);
        return;
    }

    if (jobs.length === 0) {
        console.log('⚠️ No completed videos found in the last 24h.');
        return;
    }

    console.table(jobs.map(j => ({
        id: j.job_id,
        title: j.title ? j.title.substring(0, 20) : 'N/A',
        video_url: j.video_url ? '✅ Yes' : '❌ No',
        captions: j.captions ? '✅ Yes' : '❌ No', // If captions exist, it was likely published
        created: new Date(j.created_at).toLocaleString()
    })));
}

findCompletedVideos();
