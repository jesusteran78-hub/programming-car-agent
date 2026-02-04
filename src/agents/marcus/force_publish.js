const { getSupabase } = require('../../core/supabase');
const { publishToAllPlatforms, generateCaptions } = require('./social-publisher');
const logger = require('../../core/logger');

async function forcePublish(jobIDs) {
    const supabase = getSupabase();

    if (!jobIDs || jobIDs.length === 0) {
        console.log("Usage: node force_publish.js <jobId1> <jobId2> ...");
        return;
    }

    console.log(`Searching for jobs: ${jobIDs.join(', ')}...`);

    const { data: jobs, error } = await supabase
        .from('video_jobs')
        .select('*')
        .in('job_id', jobIDs);

    if (error) {
        console.error('Database Error:', error);
        return;
    }

    if (!jobs || jobs.length === 0) {
        console.log("No jobs found with those IDs.");
        return;
    }

    for (const job of jobs) {
        console.log(`\n-----------------------------------`);
        console.log(`Processing Job ${job.job_id}`);
        console.log(`Title: ${job.title}`);
        console.log(`Video: ${job.video_url}`);

        if (!job.video_url) {
            console.log("❌ No video URL found using internal data, skipping.");
            continue;
        }

        console.log("Generating captions...");
        const captions = await generateCaptions(job.title, job.idea || job.title);

        console.log("Publishing to all platforms...");
        const results = await publishToAllPlatforms(job.video_url, captions, job.title);

        console.log("Results:", JSON.stringify(results, null, 2));
    }
}

// Get args from command line
const args = process.argv.slice(2);
forcePublish(args);
