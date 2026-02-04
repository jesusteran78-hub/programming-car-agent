/**
 * Generate 4 UGC videos for TCM Mercedes
 * Run: node generate-tcm-videos.js
 */
require('dotenv').config();

const { generateVideo } = require('./src/agents/marcus/video-generator');

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

async function generateAll() {
  console.log('🎬 Generating 4 UGC videos for TCM Mercedes...\n');
  console.log(`📷 Using image: ${TCM_IMAGE}\n`);

  const results = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`\n${'━'.repeat(50)}`);
    console.log(`📹 Video ${i + 1}/4: ${video.title}`);
    console.log(`💡 Idea: ${video.idea}`);
    console.log(`${'━'.repeat(50)}`);

    try {
      const result = await generateVideo(
        video.title,
        video.idea,
        TCM_IMAGE,
        { style: 'ugc', jobId: `tcm-mercedes-${i + 1}-${Date.now()}` }
      );

      console.log(`✅ Video ${i + 1} complete!`);
      console.log(`🔗 URL: ${result.videoUrl}`);
      results.push({ ...video, success: true, url: result.videoUrl });
    } catch (error) {
      console.error(`❌ Video ${i + 1} failed: ${error.message}`);
      results.push({ ...video, success: false, error: error.message });
    }
  }

  console.log('\n\n' + '═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));

  results.forEach((r, i) => {
    if (r.success) {
      console.log(`\n✅ Video ${i + 1}: ${r.title}`);
      console.log(`   ${r.url}`);
    } else {
      console.log(`\n❌ Video ${i + 1}: ${r.title}`);
      console.log(`   Error: ${r.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n📈 Total: ${successCount}/${results.length} videos generated`);
}

generateAll().catch(console.error);
