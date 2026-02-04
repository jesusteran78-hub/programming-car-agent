/**
 * Manual Test Script for Video Generation
 * Usage: node src/agents/marcus/test-video.js
 */
const { generateVideo } = require('./video-generator');
const logger = require('../../core/logger');

async function runTest() {
    console.log('🎬 Starting Manul Video Generation Test...');

    try {
        const title = "Test Video " + Date.now();
        const idea = "A technician programming a BMW key in a dark parking lot at night. Rain is falling.";

        console.log(`Title: ${title}`);
        console.log(`Idea: ${idea}`);

        const result = await generateVideo(title, idea);

        console.log('\n✅ Video Generation Successful!');
        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('\n❌ Video Generation Failed!');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

runTest();
