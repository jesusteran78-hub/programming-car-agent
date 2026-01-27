/**
 * Image Upscaler Service
 * Uses Replicate's Real-ESRGAN to enhance images before video generation
 *
 * @module src/services/image-upscaler
 */
const Replicate = require('replicate');
const logger = require('../core/logger').child('ImageUpscaler');

// Initialize Replicate client
let replicate = null;

/**
 * Gets Replicate client (lazy initialization)
 * @returns {Replicate}
 */
function getReplicateClient() {
  if (!replicate) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }
    replicate = new Replicate({ auth: token });
  }
  return replicate;
}

/**
 * Upscales an image using Real-ESRGAN
 * @param {string} imageUrl - URL of the image to upscale
 * @param {object} options - Upscaling options
 * @param {number} options.scale - Scale factor (2 or 4, default 4)
 * @param {boolean} options.faceEnhance - Enhance faces (default true)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function upscaleImage(imageUrl, options = {}) {
  const { scale = 4, faceEnhance = true } = options;

  try {
    logger.info(`Upscaling image: ${imageUrl.substring(0, 50)}...`);
    const startTime = Date.now();

    const client = getReplicateClient();

    // Use predictions API to get the actual URL
    const prediction = await client.predictions.create({
      version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
      input: {
        image: imageUrl,
        scale: scale,
        face_enhance: faceEnhance,
      },
    });

    // Wait for completion
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise((r) => setTimeout(r, 1000));
      result = await client.predictions.get(prediction.id);
    }

    const processingTime = Date.now() - startTime;

    if (result.status === 'failed') {
      // Check for authentication error in the error message
      const errorMessage = result.error || 'Prediction failed';
      if (errorMessage.includes('Unauthenticated') || errorMessage.includes('401')) {
        logger.warn('Replicate authentication failed (Image Upscaler). Continuing with original image.');
        return { success: false, error: 'Replicate authentication failed', originalUrl: imageUrl };
      }
      throw new Error(errorMessage);
    }

    // Output is the URL string
    const outputUrl = result.output;
    logger.info(`Image upscaled in ${processingTime}ms`);

    if (outputUrl && typeof outputUrl === 'string') {
      return {
        success: true,
        url: outputUrl,
        originalUrl: imageUrl,
        processingTime,
      };
    }

    return { success: false, error: 'No output URL from Replicate' };
  } catch (error) {
    logger.error(`Upscale failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      originalUrl: imageUrl,
    };
  }
}

/**
 * Checks if upscaling is available (token configured)
 * @returns {boolean}
 */
function isUpscalingAvailable() {
  return !!process.env.REPLICATE_API_TOKEN;
}

/**
 * Upscales image if available, otherwise returns original
 * @param {string} imageUrl - Image URL
 * @returns {Promise<string>} - Upscaled URL or original
 */
async function upscaleIfAvailable(imageUrl) {
  if (!isUpscalingAvailable()) {
    logger.info('Upscaling not available (no REPLICATE_API_TOKEN)');
    return imageUrl;
  }

  const result = await upscaleImage(imageUrl);
  if (result.success) {
    logger.info(`Image enhanced: ${result.url}`);
    return result.url;
  }

  logger.warn(`Upscale failed, using original: ${result.error}`);
  return imageUrl;
}

module.exports = {
  upscaleImage,
  upscaleIfAvailable,
  isUpscalingAvailable,
};
