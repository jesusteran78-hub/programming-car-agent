require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const videoGenerator = require('./src/agents/marcus/video-generator');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function retryFailedVideos() {
    console.log('🚀 Starting Retry Process for last 6 failed jobs...');

    // 1. Fetch failing jobs
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

    if (!jobs || jobs.length === 0) {
        console.log('⚠️ No failed jobs found to retry.');
        return;
    }

    console.log(`📋 Found ${jobs.length} jobs to retry.`);

    // 2. Iterate and Retry
    for (const job of jobs) {
        const resetJobId = `${job.job_id}_retry_${Date.now()}`;
        console.log(`\n🔄 Retrying Job: ${job.job_id}`);
        console.log(`   New Job ID: ${resetJobId}`);
        console.log(`   Title: ${job.title}`);

        try {
            // Using generateVideo with null image (falls back to default branded image)
            // This logic is safer than text-to-video for consistency
            const result = await videoGenerator.generateVideo(
                job.title,
                job.idea,
                null, // No image available, use default
                resetJobId
            );

            console.log(`   ✅ Success! Video Status: ${result.success ? 'Generated' : 'Unknown'}`);
            if (result.videoUrl) console.log(`   📹 Video: ${result.videoUrl}`);

        } catch (e) {
            console.error(`   ❌ Retry Failed: ${e.message}`);
        }
    }

    console.log('\n🏁 Retry Process Completed.');
}

retryFailedVideos();
