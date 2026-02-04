/**
 * Test Sora 2 Video Generation
 * Run: node test-sora2.js
 */
require('dotenv').config();

const { generateSoraPrompt, createKieVideo, generateVideo } = require('./src/agents/marcus/video-generator');

const TEST_STYLES = ['cinematic', 'viral', 'luxury', 'tech', 'emergency', 'satisfying'];

async function testPromptGeneration() {
  console.log('='.repeat(60));
  console.log('TEST 1: Prompt Generation (No API cost)');
  console.log('='.repeat(60));

  const title = 'BMW Key Rescue at South Beach';
  const idea = 'A client lost their BMW key at 2AM in South Beach. Our technician arrives and programs a new key in 15 minutes.';
  const style = 'cinematic';

  console.log(`\nGenerating ${style.toUpperCase()} prompt for: "${title}"`);
  console.log('Idea:', idea);
  console.log('\nCalling GPT-4o to generate Sora 2 prompt...\n');

  try {
    const prompt = await generateSoraPrompt(title, idea, style);
    console.log('Generated Prompt:');
    console.log('-'.repeat(40));
    console.log(prompt);
    console.log('-'.repeat(40));
    console.log('\n✅ Prompt generation SUCCESS\n');
    return prompt;
  } catch (error) {
    console.error('❌ Prompt generation FAILED:', error.message);
    return null;
  }
}

async function testVideoGeneration(prompt) {
  console.log('='.repeat(60));
  console.log('TEST 2: KIE/Sora 2 Video Generation');
  console.log('='.repeat(60));

  if (!process.env.KIE_API_KEY) {
    console.log('❌ KIE_API_KEY not configured in .env');
    return null;
  }

  console.log('\nSubmitting to KIE API (Sora 2)...');
  console.log('This will take 2-5 minutes...\n');

  try {
    const videoUrl = await createKieVideo(prompt);
    console.log('\n✅ Video generation SUCCESS!');
    console.log('Video URL:', videoUrl);
    return videoUrl;
  } catch (error) {
    console.error('❌ Video generation FAILED:', error.message);
    return null;
  }
}

async function testFullPipeline() {
  console.log('='.repeat(60));
  console.log('TEST 3: Full Video Pipeline (Prompt + Video + TTS + Cloudinary)');
  console.log('='.repeat(60));

  const title = 'Tesla Key Emergency';
  const idea = 'Client stranded with their Tesla at night. Programming Car saves the day.';
  const style = 'viral';

  console.log(`\nGenerating full ${style.toUpperCase()} video: "${title}"`);
  console.log('This includes: Prompt + Sora 2 + TTS + Watermark + Cloudinary upload');
  console.log('Expected time: 5-10 minutes\n');

  try {
    const result = await generateVideo(title, idea, null, { style, jobId: `test_${Date.now()}` });
    console.log('\n✅ Full pipeline SUCCESS!');
    console.log('Job ID:', result.jobId);
    console.log('Final Video:', result.videoUrl);
    return result;
  } catch (error) {
    console.error('❌ Full pipeline FAILED:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n🎬 SORA 2 VIDEO GENERATOR TEST\n');
  console.log('Available styles:', TEST_STYLES.join(', '));

  // Check environment
  console.log('\nEnvironment check:');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- KIE_API_KEY:', process.env.KIE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');

  // Parse command line args
  const args = process.argv.slice(2);
  const testMode = args[0] || 'prompt'; // prompt, video, full

  if (testMode === 'prompt') {
    // Test 1: Just prompt generation (free, fast)
    await testPromptGeneration();
  } else if (testMode === 'video') {
    // Test 2: Prompt + Video generation
    const prompt = await testPromptGeneration();
    if (prompt) {
      await testVideoGeneration(prompt);
    }
  } else if (testMode === 'full') {
    // Test 3: Full pipeline
    await testFullPipeline();
  } else {
    console.log('\nUsage:');
    console.log('  node test-sora2.js prompt  - Test prompt generation only (fast, free)');
    console.log('  node test-sora2.js video   - Test prompt + video generation');
    console.log('  node test-sora2.js full    - Test full pipeline with TTS and watermark');
  }

  console.log('\nDone!');
}

main().catch(console.error);
