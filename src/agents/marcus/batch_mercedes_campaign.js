
const { generateTextToVideo } = require('./video-generator');
const logger = require('../../core/logger');

// Top 5 Mercedes-Benz Models (USA 2024/2025 Volume)
const MERCEDES_MODELS = [
    'Mercedes-Benz GLE',
    'Mercedes-Benz GLC',
    'Mercedes-Benz C-Class',
    'Mercedes-Benz GLS',
    'Mercedes-Benz GLA'
];

async function runBatch() {
    console.log('🚀 Starting MERCEDES-BENZ TOP 5 Batch Campaign (Text-to-Video)...');

    for (const model of MERCEDES_MODELS) {
        // "genera 1 video por modelo en español de llaves perdidas en miami"
        const title = `Llaves perdidas para ${model} Miami`;

        // Prompt engineered for "Lost Keys" theme + Miami + Spanish
        const idea = `POV Selfie Style: A certified technician in Miami holding a new remote fob for a ${model}. He is talking to the camera in Spanish. "Si perdiste las llaves de tu ${model}, no te preocupes. Somos cerrajeros certificados en Miami y vamos a donde estés". Background: Professional service van, sunny Miami street.`;

        console.log(`\n🎬 Generating: ${model}...`);

        try {
            // Using 'viral' style (Preserves Original Audio per user request)
            const result = await generateTextToVideo(title, idea, {
                jobId: `mercedes-${model.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
                style: 'viral'
            });

            console.log(`✅ Started: ${result.jobId}`);
        } catch (error) {
            console.error(`❌ Failed ${model}:`, error.message);
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✨ Mercedes Batch Campaign Initiated!');
}

runBatch();
