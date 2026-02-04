const { generateTextToVideo } = require('./video-generator');
const { generateCaptions, publishToAllPlatforms } = require('./social-publisher');
const logger = require('../../core/logger');

// VIDEO CONCEPTS
const CONCEPTS = [
    // Ford 2018+ Keys
    { title: "Ford F-150 2020 Key Copy", idea: "Technician programming a new smart key for a Ford F-150 2020. Close up of the key and the truck dashboard. Professional and fast service." },
    { title: "Ford Explorer 2021 Smart Key", idea: "Programming a new key fob for a Ford Explorer 2021. Showing the proximity unlock feature working perfectly. Miami context." },
    { title: "Ford Mustang 2019 Spare Key", idea: "Creating a spare key for a Ford Mustang 2019. Technician hands holding the new key with the Mustang logo visible. High value." },
    { title: "Ford Fusion 2018 Key Programming", idea: "OBD2 programming of a Ford Fusion 2018 key. Screen showing 'Success'. Technician gives thumbs up." },
    { title: "Ford Expedition 2022 Remote Start", idea: "Testing remote start on a Ford Expedition 2022 with a newly programmed key. Engine roars to life. Customer satisfaction." },

    // Lost Keys (Viral)
    { title: "Lost Keys BMW 3 Series Rescue", idea: "Emergency response for a BMW 3 Series with all keys lost. POV of technician opening the car and cutting a new key on site." },
    { title: "All Keys Lost Toyota Camry", idea: "Technician arriving at a parking lot to help a customer who lost all keys to a Toyota Camry. Cutting generic key and programming chip." },
    { title: "Honda Civic Keyless Rescue", idea: "Honda Civic 2020 cannot start. Technician programs new keyless remote from scratch. Engine starts. Relief." },
    { title: "Mercedes Benz All Keys Lost", idea: "Premium service: Mercedes Benz C300 with lost keys. Technician using specialized equipment to program new EIS key." },
    { title: "Nissan Rogue 2019 Emergency Key", idea: "Late night rescue. Nissan Rogue 2019 locked out. Technician picks lock and programs new intelligent key." }
];

async function runBatch() {
    console.log("🚀 STARTING INFINITE BATCH GENERATOR (10 VIDEOS)");
    console.log("ℹ️ Will retry indefinitely until KIE accepts the job.");

    for (let i = 0; i < CONCEPTS.length; i++) {
        const concept = CONCEPTS[i];
        console.log(`\n🎬 Processing Video ${i + 1}/10: "${concept.title}"`);

        let success = false;
        let attempts = 0;

        while (!success) {
            attempts++;
            try {
                console.log(`   🔄 Attempt ${attempts}...`);

                // 1. Generate Video (Text-to-Video mode since we have no user image)
                // This function handles the KIE generation.
                // If KIE throws 500, it will throw an error here.
                const result = await generateTextToVideo(concept.title, concept.idea, {
                    style: 'viral',
                    jobId: `batch-ford-${Date.now()}`
                });

                console.log(`   ✅ Video generated: ${result.videoUrl}`);

                // 2. Generate Captions
                console.log("   ✍️ Generating captions...");
                const captions = await generateCaptions(concept.title, result.prompt);

                // 3. Publish
                console.log("   📡 Publishing to Blotato...");
                const publishResult = await publishToAllPlatforms(result.videoUrl, captions, concept.title);
                console.log("   ✅ Published!", JSON.stringify(publishResult));

                success = true; // Exit loop for this video

            } catch (error) {
                console.error(`   ❌ Error (Attempt ${attempts}): ${error.message}`);

                // Check for "Heavy load" or 500 errors to decide wait time
                let waitTime = 60000; // Default 1 minute
                if (error.message.includes("500") || error.message.includes("load") || error.message.includes("capacity")) {
                    console.log("   ⚠️ Server overloaded. Waiting 5 minutes before retry...");
                    waitTime = 5 * 60 * 1000;
                }

                console.log(`   ⏳ Create task failed. Retrying in ${waitTime / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        console.log(`✅ Video ${i + 1} DONE. Moving to next...`);
    }

    console.log("\n🎉 ALL 10 VIDEOS GENERATED AND PUBLISHED!");
}

// Start the batch
runBatch();
