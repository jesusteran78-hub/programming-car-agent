require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const videoGenerator = require('./src/agents/marcus/video-generator');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function monitorAndPublish() {
    console.log('👀 Monitoring Mercedes-Benz Jobs for Auto-Publishing...');

    const processedIds = new Set();

    setInterval(async () => {
        // Last 30 mins
        const timeWindow = new Date(Date.now() - 30 * 60 * 1000).toISOString();

        const { data: jobs, error } = await supabase
            .from('video_jobs')
            .select('*')
            .like('job_id', 'mercedes-%') // Filter for our batch
            .eq('status', 'completed')
            .gt('created_at', timeWindow);

        if (error) {
            console.error('Error polling DB:', error.message);
            return;
        }

        for (const job of jobs) {
            if (processedIds.has(job.job_id)) continue;

            // If already has captions, skip (it's published)
            if (job.captions) {
                processedIds.add(job.job_id);
                continue;
            }

            console.log(`\n✨ New Completed Job Found: ${job.job_id}`);
            console.log(`   🚀 Auto-publishing to Blotato...`);

            try {
                const { results } = await videoGenerator.publishToBlotato(
                    job.job_id,
                    job.video_url,
                    job.title,
                    job.prompt || job.idea
                );

                console.log('   ✅ Published!');

                // Update DB to mark as published (by saving captions)
                await supabase
                    .from('video_jobs')
                    .update({ captions: results }) // Just storing something to mark it
                    .eq('job_id', job.job_id);

                processedIds.add(job.job_id);

            } catch (e) {
                console.error(`   ❌ Failed to publish: ${e.message}`);
            }
        }
    }, 15000); // Check every 15s
}

monitorAndPublish();
