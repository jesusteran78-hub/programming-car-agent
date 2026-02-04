require('dotenv').config();
const axios = require('axios');
const videoGenerator = require('./src/agents/marcus/video-generator');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const KIE_API_KEY = process.env.KIE_API_KEY;

async function publishKieVideo(taskId, customTitle = 'Video Viral') {
    console.log(`\n🔍 Fetching KIE Task: ${taskId}...`);

    try {
        // 1. Get Video URL from KIE
        const response = await axios.get(KIE_GET_TASK_URL, {
            params: { taskId },
            headers: { Authorization: `Bearer ${KIE_API_KEY}` }
        });

        const data = response.data.data;
        if (!data) {
            console.error('❌ Task not found in KIE.');
            return;
        }

        console.log(`   Status: ${data.status}`);

        let videoUrl = null;
        // Check where the video URL is in the response (adapt based on debug knowledge)
        let resultObj = data.result || data.resultJson;

        if (typeof resultObj === 'string') {
            try {
                resultObj = JSON.parse(resultObj);
            } catch (e) {
                console.error('   ⚠️ Failed to parse result string:', e.message);
            }
        }

        if (resultObj) {
            if (resultObj.videoUrl) videoUrl = resultObj.videoUrl;
            else if (resultObj.url) videoUrl = resultObj.url;
            else if (resultObj.resultUrls && Array.isArray(resultObj.resultUrls) && resultObj.resultUrls.length > 0) {
                videoUrl = resultObj.resultUrls[0];
            }
        }

        if (!videoUrl && data.generations && data.generations[0]) videoUrl = data.generations[0].videoUrl || data.generations[0].url;

        if (!videoUrl) {
            console.error('❌ No video URL found in task result.', JSON.stringify(data, null, 2));
            return;
        }

        console.log(`   📹 Video URL: ${videoUrl}`);

        // 2. Publish to Blotato
        console.log('🚀 Publishing to Blotato (Audio Original)...');

        // Use the title/prompt from KIE if available, or generic
        const prompt = data.prompt || 'Auto Key Service Miami';

        const { results } = await videoGenerator.publishToBlotato(
            taskId, // Use KIE ID as Job ID
            videoUrl,
            customTitle,
            prompt
        );

        console.log('   ✅ Publish Results:', JSON.stringify(results, null, 2));

        // 3. Save to DB for record
        await supabase.from('video_jobs').upsert({
            job_id: taskId,
            status: 'completed',
            title: customTitle,
            video_url: videoUrl,
            prompt: prompt,
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
        });
        console.log('   💾 Saved to local DB.');

    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
        if (e.response) console.error('   API Response:', e.response.data);
    }
}

// Allow running from command line: node publish_from_kie_id.js [TASK_ID] [TITLE]
const args = process.argv.slice(2);
if (args.length > 0) {
    const taskId = args[0];
    const title = args[1] || 'Programming Car Video';
    publishKieVideo(taskId, title);
} else {
    console.log('Usage: node publish_from_kie_id.js <KIE_TASK_ID> [TITLE]');
}
