/**
 * Publish TCM Mercedes video to all social platforms
 * Run: node publish-tcm-video.js
 */
require('dotenv').config();

const { generateCaptions, publishToAllPlatforms, getSuccessfulPlatforms, getFailedPlatforms } = require('./src/agents/marcus/social-publisher');

const VIDEO_URL = 'https://res.cloudinary.com/dtfbdf4dn/video/upload/v1769088281/ugc-auto/wejyctc1msmpnpvo5mel.mp4';
const TITLE = 'TCM Mercedes 722.9 Programado';
const CONTEXT = 'Técnico de Programming Car Miami mostrando un TCM Mercedes 722.9 programado y listo para enviar. Video estilo UGC/selfie, español latino.';

async function main() {
  console.log('🚀 Publishing TCM Mercedes video to all platforms...\n');
  console.log(`📹 Video: ${VIDEO_URL}\n`);

  // Generate captions
  console.log('✍️ Generating captions for each platform...');
  const captions = await generateCaptions(TITLE, CONTEXT);

  console.log('\n📝 Generated captions:');
  Object.entries(captions).forEach(([platform, caption]) => {
    console.log(`\n--- ${platform.toUpperCase()} ---`);
    console.log(caption.substring(0, 200) + (caption.length > 200 ? '...' : ''));
  });

  // Publish to all platforms
  console.log('\n\n📤 Publishing to platforms...\n');
  const results = await publishToAllPlatforms(VIDEO_URL, captions, TITLE);

  // Summary
  const successful = getSuccessfulPlatforms(results);
  const failed = getFailedPlatforms(results);

  console.log('\n' + '═'.repeat(50));
  console.log('📊 PUBLISH RESULTS');
  console.log('═'.repeat(50));

  if (successful.length > 0) {
    console.log(`\n✅ SUCCESS (${successful.length}):`);
    successful.forEach(p => console.log(`   • ${p}`));
  }

  if (failed.length > 0) {
    console.log(`\n❌ FAILED (${failed.length}):`);
    failed.forEach(f => console.log(`   • ${f.platform}: ${f.error}`));
  }

  console.log(`\n📈 Total: ${successful.length}/${successful.length + failed.length} platforms`);
}

main().catch(console.error);
