/**
 * Test Image Upscaler
 * Run: node test-upscaler.js
 */
require('dotenv').config();

// Set token for test
process.env.REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const { upscaleImage, isUpscalingAvailable } = require('./src/services/image-upscaler');

async function main() {
  console.log('\n=== IMAGE UPSCALER TEST ===\n');

  console.log('Token configured:', isUpscalingAvailable() ? 'YES' : 'NO');

  if (!isUpscalingAvailable()) {
    console.log('Add REPLICATE_API_TOKEN to .env');
    return;
  }

  // Test with a sample image
  const testImage = 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';

  console.log('\nTest image:', testImage);
  console.log('\nUpscaling (this takes 10-30 seconds)...\n');

  const result = await upscaleImage(testImage, {
    scale: 2,        // 2x for faster test
    faceEnhance: true,
  });

  if (result.success) {
    console.log('SUCCESS!');
    console.log('Original:', result.originalUrl);
    console.log('Upscaled:', result.url);
    console.log('Time:', result.processingTime, 'ms');
  } else {
    console.log('FAILED:', result.error);
  }
}

main().catch(console.error);
