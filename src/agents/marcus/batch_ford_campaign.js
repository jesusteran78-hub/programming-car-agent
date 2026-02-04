
const { generateTextToVideo } = require('./video-generator');
const logger = require('../../core/logger');

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

async function runBatch() {
    console.log('🚀 Starting FORD TOP 10 Batch Campaign (Text-to-Video)...');

    for (const model of FORD_MODELS) {
        const title = `Llaves para ${model} Miami`;
        // SAFE PROMPT: Emphasize "Certified Service" and "Owner" to avoid "Illegal Act" safety trigger
        // Avoid "Copying key" (Ambiguous). Use "Programming new key for owner".
        const idea = `POV Selfie Style: A certified technician in Miami holding a new remote fob for a ${model}. He is talking to the camera in Spanish. "Si necesitas llaves para tu ${model}, somos cerrajeros certificados en Miami". Background: Professional service van.`;

        console.log(`\n🎬 Generating: ${model}...`);

        try {
            // Using 'viral' style as it works best for T2V social content
            // 'ugc' style enforces image input which we don't have here
            const result = await generateTextToVideo(title, idea, {
                jobId: `ford-${model.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                style: 'viral'
            });

            console.log(`✅ Started: ${result.jobId}`);
        } catch (error) {
            console.error(`❌ Failed ${model}:`, error.message);
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✨ Batch Campaign Initiated!');
}

runBatch();
