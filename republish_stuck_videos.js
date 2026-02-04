require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { publishToBlotato } = require('./src/agents/marcus/video-generator');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function republishRecent() {
    console.log('🔄 Checking for stuck videos (Last 10 completed)...');

    // Fetch last 10 completed jobs
    const { data: jobs, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ DB Error:', error.message);
        return;
    }

    console.log(`Found ${jobs.length} completed jobs. Republishing to Blotato...`);

    for (const job of jobs) {
        if (!job.video_url) {
            console.log(`⚠️ Skipping Job ${job.job_id} (No Video URL)`);
            continue;
        }

        console.log(`\n🚀 Republishing Job: ${job.title} (${job.job_id})`);
        console.log(`   URL: ${job.video_url}`);

        try {
            await publishToBlotato(job.job_id, job.video_url, job.title, job.prompt || job.idea);
            console.log('   ✅ Published successfully');
        } catch (e) {
            console.error(`   ❌ Failed to publish: ${e.message}`);
        }
    }
}

republishRecent();
