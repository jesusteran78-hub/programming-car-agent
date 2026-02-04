
const { generateTextToVideo } = require('./video-generator');
const logger = require('../../core/logger');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Top 10 Ford Models 2024
const FORD_MODELS = [
    'Ford F-150',
    'Ford Explorer',
    'Ford Transit',
    'Ford Escape',
    'Ford Maverick',
    'Ford Bronco Sport',
    'Ford Bronco',
    'Ford Expedition',
    'Ford Edge',
    'Ford Mustang Mach-E'
];

async function checkCompletion(model) {
    const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .ilike('title', `%${model}%`)
        .eq('status', 'completed')
        .limit(1);

    if (error) {
        console.error(`Error checking DB for ${model}:`, error.message);
        return false;
    }
    return data && data.length > 0;
}

async function runInfiniteAudit() {
    console.log('∞ STARTING INFINITE AUDIT LOOP: FORD CAMPAIGN ∞');
    console.log('Target: 10 UGC Videos (Spanish/Miami)');

    let pendingModels = [...FORD_MODELS];

    while (pendingModels.length > 0) {
        console.log(`\n📋 Pending Models: ${pendingModels.length}`);

        // Use a for...of loop to process sequentially and allow modifying the list for next pass
        const nextPending = [];

        for (const model of pendingModels) {
            // 1. Audit: Check if already done
            const isDone = await checkCompletion(model);
            if (isDone) {
                console.log(`✅ ${model}: COMPLETED. Skipping.`);
                continue;
            }

            console.log(`⏳ ${model}: MISSING. Starting Generation...`);

            // 2. Execution
            const title = `Llaves para ${model} Miami`;
            // Safe UGC-style prompt (Text-to-Video)
            const idea = `POV Selfie Style: A certified technician in Miami holding a new remote fob for a ${model}. He is talking to the camera in Spanish. "Si necesitas llaves para tu ${model}, somos cerrajeros certificados en Miami". Background: Professional service van. Natural lighting.`;

            try {
                const result = await generateTextToVideo(title, idea, {
                    jobId: `ford-${model.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                    style: 'viral' // Mapped to UGC-simulation in prompt engineering
                });

                console.log(`🚀 Started Job: ${result.jobId}`);
                // We assume it started successfully. The next loop pass (audit) will verify completion.
                // But since generation takes time, we effectively move it to "wait list".
                // Actually, let's keep it in pending until PROVEN complete in DB.
                nextPending.push(model);

            } catch (error) {
                console.error(`❌ Failed start for ${model}:`, error.message);
                nextPending.push(model); // Keep trying

                // If API is overloaded, wait a bit longer
                if (error.message.includes('429') || error.message.includes('500')) {
                    console.log('⚠️ API Pressure. Pausing 60s...');
                    await new Promise(r => setTimeout(r, 60000));
                }
            }

            // Pacing delay between requests
            await new Promise(r => setTimeout(r, 10000));
        }

        pendingModels = nextPending;

        if (pendingModels.length > 0) {
            console.log('\n💤 Sleeping 2 minutes before next Audit Scan...');
            await new Promise(r => setTimeout(r, 120000));
        }
    }

    console.log('\n🎉🎉🎉 ALL 10 VIDEOS CONFIRMED COMPLETE! Exiting Loop.');
}

runInfiniteAudit();
