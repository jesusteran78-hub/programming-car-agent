const { getSupabase } = require('../../core/supabase');
const logger = require('../../core/logger');

async function checkJobs() {
    const supabase = getSupabase();
    const { data: jobs, error } = await supabase
        .from('video_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }

    console.log('Recent Video Jobs:');
    jobs.forEach(job => {
        console.log(`\nID: ${job.job_id}`);
        console.log(`Title: ${job.title}`);
        console.log(`Status: ${job.status}`);
        console.log(`Video URL: ${job.video_url}`);
        console.log(`Created: ${job.created_at}`);
    });
}

checkJobs();
