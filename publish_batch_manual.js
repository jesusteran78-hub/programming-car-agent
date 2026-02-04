require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const videoGenerator = require('./src/agents/marcus/video-generator');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function publishPendingVideos() {
    console.log('🚀 Starting Manual Publish for recent retry jobs...');

    // 1. Fetch completed retry jobs
    // We look for jobs created in the last 1 hour that are 'completed'
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: jobs, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('status', 'completed')
        .gt('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching jobs:', error.message);
        return;
    }

    if (!jobs || jobs.length === 0) {
        console.log('⚠️ No recent completed jobs found to publish.');
        return;
    }

    console.log(`📋 Found ${jobs.length} completed jobs.`);

    // 2. Publish each
    for (const job of jobs) {
        console.log(`\n📤 Publishing Job: ${job.job_id} (${job.title})`);

        // Check if already published (if captions exist, likely published or attempted)
        if (job.captions) {
            console.log('   ⚠️ Job has captions, checking if we should republish...');
            // In this manual script, maybe we force it or ask? 
            // For now, let's assume if user asked, we do it.
        }

        try {
            const { captions, results } = await videoGenerator.publishToBlotato(
                job.job_id,
                job.video_url,
                job.title,
                job.prompt // We need the prompt for captions
            );

            console.log('   ✅ Publish Results:', JSON.stringify(results, null, 2));

            // Update DB
            await supabase
                .from('video_jobs')
                .update({
                    captions: captions,
                    // We could store detailed results if we had a column
                })
                .eq('job_id', job.job_id);

            console.log('   💾 DB Updated.');

        } catch (e) {
            console.error(`   ❌ Failed to publish: ${e.message}`);
        }
    }

    console.log('\n🏁 Manual Publish Process Completed.');
}

publishPendingVideos();
