require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const videoGenerator = require('./src/agents/marcus/video-generator');

const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const KIE_API_KEY = process.env.KIE_API_KEY;

const TARGET_VIDEOS = [
    { id: 'ca9c10541fc2840ba55abcec535a0e73', title: 'Llaves para Ford Bronco Sport Miami' },
    { id: '88c614a637de41f581c0e3d3f8717102', title: 'Llaves para Ford Maverick Miami' },
    { id: 'ee3c152eaeccf315d9768d587cd748a4', title: 'Llaves para Ford Escape Miami' },
    { id: '4eaaba13dddeeea6aadbf640be028e9b', title: 'Llaves para Ford Transit Miami' },
    { id: 'd06b546a41d6bcc57cea33de76b80e14', title: 'Llaves para Ford Explorer Miami' }
];

async function publishBatch() {
    console.log(`🚀 Starting Batch Publish for ${TARGET_VIDEOS.length} videos...`);

    for (const video of TARGET_VIDEOS) {
        console.log(`\n---------------------------------------------------`);
        console.log(`🎬 Processing: ${video.title} (${video.id})`);

        try {
            // 1. Fetch info from KIE
            const response = await axios.get(KIE_GET_TASK_URL, {
                params: { taskId: video.id },
                headers: { Authorization: `Bearer ${KIE_API_KEY}` }
            });

            const data = response.data.data;
            if (!data) {
                console.error('   ❌ Task not found in KIE.');
                continue;
            }

            // Find video URL
            let resultObj = data.result || data.resultJson;
            console.log('   🔍 Data keys:', Object.keys(data));
            console.log('   🔍 Result type:', typeof resultObj);

            if (typeof resultObj === 'string') {
                try {
                    resultObj = JSON.parse(resultObj);
                    console.log('   🔍 Parsed result:', JSON.stringify(resultObj));
                } catch (e) {
                    console.error('   ⚠️ Failed to parse result string:', e.message);
                }
            } else {
                console.log('   🔍 Result object:', JSON.stringify(resultObj));
            }

            let videoUrl = null;
            if (resultObj) {
                if (resultObj.videoUrl) videoUrl = resultObj.videoUrl;
                else if (resultObj.url) videoUrl = resultObj.url;
                else if (resultObj.resultUrls && Array.isArray(resultObj.resultUrls) && resultObj.resultUrls.length > 0) {
                    videoUrl = resultObj.resultUrls[0];
                }
            }
            if (!videoUrl && data.generations && data.generations[0]) {
                videoUrl = data.generations[0].videoUrl || data.generations[0].url;
            }

            if (!videoUrl) {
                console.error('   ❌ No video URL found in KIE response.');
                console.log('   🔍 Result structure:', JSON.stringify(resultObj));
                continue;
            }
            console.log(`   📹 URL: ${videoUrl}`);

            // 2. Publish
            // Use prompt from KIE if available
            const prompt = data.prompt || video.title;

            const { results } = await videoGenerator.publishToBlotato(
                video.id,
                videoUrl,
                video.title,
                prompt
            );

            console.log('   ✅ Published to Blotato.');
            console.log('   📊 Results:', Object.keys(results).map(p => `${p}: ${results[p].status}`).join(', '));

        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}`);
        }

        // Small delay to be safe
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n🏁 Batch completed.`);
}

publishBatch();
