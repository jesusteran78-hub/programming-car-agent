require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const videoGenerator = require('./src/agents/marcus/video-generator');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function retryFailedVideos() {
    console.log('🚀 Starting Retry Process (FORCE UGC/ORIGINAL AUDIO)...');

    // 1. Fetch failing jobs
    // We fetch again. The previous script might have created some, but if they failed or are stuck, we pick up where left off.
    // Actually, checking "failed" status again ensures we only retry what's broken.
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
        console.log('   Style: FORCED UGC (Preserve Audio)');

        try {
            // Force strict UGC style object to ensure audio is kept
            const options = {
                jobId: resetJobId,
                style: 'ugc' // This triggers the "preserve original audio" path in video-generator.js
            };

            const result = await videoGenerator.generateVideo(
                job.title,
                job.idea,
                null, // Use default image
                options // Pass options object instead of string ID
            );

            console.log(`   ✅ Success! Video Status: ${result.success ? 'Generated' : 'Unknown'}`);
            if (result.videoUrl) console.log(`   📹 Video: ${result.videoUrl}`);

            // New: Auto-publish since we updated the code
            if (result.videoUrl) {
                console.log('   🚀 Auto-publishing to Blotato...');
                const { results } = await videoGenerator.publishToBlotato(
                    resetJobId,
                    result.videoUrl,
                    job.title,
                    result.prompt
                );
                console.log('   📡 Publish Result:', JSON.stringify(results));
            }

        } catch (e) {
            console.error(`   ❌ Retry Failed: ${e.message}`);
        }
    }

    console.log('\n🏁 Retry Process Completed.');
}

retryFailedVideos();
