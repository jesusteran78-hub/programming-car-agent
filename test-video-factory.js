/**
 * Test Video Factory
 * Run: node test-video-factory.js [mode]
 *
 * Modes:
 *   prompt  - Test prompt generation only (fast, no API cost)
 *   create  - Create a job without processing
 *   full    - Full pipeline test (5-10 minutes)
 */
require('dotenv').config();

const videoFactory = require('./src/services/video-factory');

async function testPromptGeneration() {
  console.log('='.repeat(60));
  console.log('TEST: Prompt Generation (No API cost)');
  console.log('='.repeat(60));

  const mockJob = {
    product_name: 'BMW Key Programming',
    description: 'Cliente perdio su llave BMW en South Beach a las 2am. Llegue en 15 minutos y le programe una llave nueva.',
    scene: 'Parking lot de South Beach, noche, luces de neon de fondo',
    ideal_customer: 'Dueno de BMW bloqueado fuera de su carro a las 2am',
    photo_link: null,
  };

  console.log('\nInput:');
  console.log('- Product:', mockJob.product_name);
  console.log('- Description:', mockJob.description);
  console.log('- Scene:', mockJob.scene);
  console.log('- ICP:', mockJob.ideal_customer);

  console.log('\nGenerating UGC viral prompt...\n');

  try {
    const prompt = await videoFactory.generateViralPrompt(mockJob);
    console.log('Generated Prompt:');
    console.log('-'.repeat(40));
    console.log(prompt);
    console.log('-'.repeat(40));
    console.log('\n✅ Prompt generation SUCCESS\n');
    return prompt;
  } catch (e) {
    console.error('❌ Failed:', e.message);
    return null;
  }
}

async function testCaptionGeneration() {
  console.log('='.repeat(60));
  console.log('TEST: Social Caption Generation');
  console.log('='.repeat(60));

  const mockJob = {
    product_name: 'Tesla Model 3 Key Replacement',
    description: 'Programacion de llave Tesla a domicilio en Brickell',
    scene: 'Brickell towers at sunset',
  };

  console.log('\nGenerating captions for all platforms...\n');

  try {
    const captions = await videoFactory.generateSocialCaptions(mockJob);
    console.log('TikTok:', captions.tiktok);
    console.log('\nInstagram:', captions.instagram);
    console.log('\nYouTube Title:', captions.youtube_title);
    console.log('\nYouTube Desc:', captions.youtube_description);
    console.log('\nTwitter:', captions.twitter);
    console.log('\nFacebook:', captions.facebook);
    console.log('\n✅ Caption generation SUCCESS\n');
    return captions;
  } catch (e) {
    console.error('❌ Failed:', e.message);
    return null;
  }
}

async function testCreateJob() {
  console.log('='.repeat(60));
  console.log('TEST: Create Job (Database)');
  console.log('='.repeat(60));

  const input = {
    productName: 'Mercedes Key Emergency',
    description: 'Cliente perdio llave de Mercedes en Wynwood',
    scene: 'Wynwood Walls, arte urbano de fondo, atardecer',
    idealCustomer: 'Artista con Mercedes C-Class',
    photoLink: null,
    videoStyle: 'ugc',
  };

  console.log('\nCreating job:', input.productName);

  try {
    const result = await videoFactory.createVideoJob(input);
    if (result.success) {
      console.log('✅ Job created:', result.job.id);
      console.log('Status:', result.job.status);
      return result.job;
    } else {
      console.log('❌ Failed:', result.error);
      return null;
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    return null;
  }
}

async function testFullPipeline() {
  console.log('='.repeat(60));
  console.log('TEST: Full Pipeline (5-10 minutes)');
  console.log('='.repeat(60));

  const input = {
    productName: 'Porsche Cayenne Key Clone',
    description: 'Programacion de llave duplicada Porsche en Miami Beach',
    scene: 'Miami Beach, palm trees, luxury vibe',
    idealCustomer: 'Dueno de Porsche necesita llave extra',
    photoLink: null,
    videoStyle: 'ugc',
  };

  console.log('\nStarting full pipeline for:', input.productName);
  console.log('This will take 5-10 minutes...\n');

  try {
    const result = await videoFactory.createAndProcess(input);

    if (result.success) {
      console.log('\n✅ FULL PIPELINE SUCCESS!');
      console.log('Video URL:', result.videoUrl);
      console.log('Processing Time:', Math.round(result.processingTime / 1000), 'seconds');
      console.log('\nCaptions:');
      console.log('- TikTok:', result.captions.tiktok);
      console.log('- Instagram:', result.captions.instagram?.substring(0, 100) + '...');
    } else {
      console.log('❌ Failed:', result.error);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

async function main() {
  console.log('\n🎬 VIDEO FACTORY TEST\n');

  // Environment check
  console.log('Environment:');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅' : '❌');
  console.log('- KIE_API_KEY:', process.env.KIE_API_KEY ? '✅' : '❌');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
  console.log('');

  const mode = process.argv[2] || 'prompt';

  switch (mode) {
    case 'prompt':
      await testPromptGeneration();
      await testCaptionGeneration();
      break;

    case 'create':
      await testCreateJob();
      break;

    case 'full':
      await testFullPipeline();
      break;

    default:
      console.log('Usage:');
      console.log('  node test-video-factory.js prompt  - Test prompt/caption generation');
      console.log('  node test-video-factory.js create  - Create job in database');
      console.log('  node test-video-factory.js full    - Full pipeline (5-10 min)');
  }

  console.log('\nDone!');
}

main().catch(console.error);
