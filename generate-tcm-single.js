/**
 * Generate TCM videos one at a time
 * Run: node generate-tcm-single.js [video_number]
 * Example: node generate-tcm-single.js 2
 */
require('dotenv').config();

const { generateVideo } = require('./src/agents/marcus/video-generator');
const { generateCaptions, publishToAllPlatforms } = require('./src/agents/marcus/social-publisher');

const TCM_IMAGE = 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1769087670/s-l1200_2_jr3hs8.jpg';

const videos = [
  {
    title: 'TCM Mercedes programado',
    idea: 'TCM Mercedes 722.9 programado - listo para instalar, envío a todo USA'
  },
  {
    title: 'Módulo de transmisión Mercedes',
    idea: 'Módulo de transmisión Mercedes programado con tu VIN - solución definitiva'
  },
  {
    title: 'TCM 722.9 Mercedes disponible',
    idea: 'TCM 722.9 Mercedes - programación profesional, envío gratis'
  },
  {
    title: 'Transmission Control Unit Mercedes',
    idea: 'Transmission Control Unit (VGS/EGS/TCU) Mercedes - programado y garantizado'
  }
];

async function generateSingle(videoNum) {
  const index = videoNum - 1;
  const video = videos[index];

  if (!video) {
    console.log('Video number must be 1-4');
    return;
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🎬 Generating Video ${videoNum}/4: ${video.title}`);
  console.log(`💡 Idea: ${video.idea}`);
  console.log(`📷 Image: ${TCM_IMAGE}`);
  console.log(`${'═'.repeat(50)}\n`);

  try {
    const result = await generateVideo(
      video.title,
      video.idea,
      TCM_IMAGE,
      { style: 'ugc', jobId: `tcm-single-${videoNum}-${Date.now()}` }
    );

    console.log(`\n✅ Video ${videoNum} complete!`);
    console.log(`🔗 URL: ${result.videoUrl}\n`);

    // Ask to publish
    console.log('📤 Publishing to all platforms...');
    const captions = await generateCaptions(video.title, video.idea);
    const publishResults = await publishToAllPlatforms(result.videoUrl, captions, video.title);

    const successful = Object.entries(publishResults).filter(([_, r]) => r.success).map(([p]) => p);
    console.log(`\n✅ Published to: ${successful.join(', ')}`);

    return result.videoUrl;
  } catch (error) {
    console.error(`\n❌ Video ${videoNum} failed: ${error.message}`);
    return null;
  }
}

// Parse command line
const videoNum = parseInt(process.argv[2]) || 2;
generateSingle(videoNum).catch(console.error);
