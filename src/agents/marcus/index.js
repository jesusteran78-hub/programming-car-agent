/**
 * ATLAS Agent: Marcus (Marketing)
 * Handles video generation, social media publishing, and content creation
 *
 * @module src/agents/marcus
 */
require('dotenv').config();

const { config } = require('../../core/config');
const logger = require('../../core/logger').child('Marcus');
const { publishEvent, EVENT_TYPES } = require('../../core/event-bus');
const {
  consumeEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  registerHeartbeat,
} = require('../../core/event-bus');

const { generateVideo } = require('./video-generator');
const {
  generateCaptions,
  publishToAllPlatforms,
  getSuccessfulPlatforms,
  getFailedPlatforms,
} = require('./social-publisher');

const AGENT_ID = 'marcus';

/**
 * Events that Marcus listens to
 */
const SUBSCRIBED_EVENTS = [
  EVENT_TYPES.VIDEO_REQUESTED,
  EVENT_TYPES.SOCIAL_PUBLISH,
];

/**
 * Sends WhatsApp notification to owner
 * @param {string} message - Message text
 */
async function notifyOwner(message) {
  if (!config.whapiToken) {
    logger.warn('WHAPI_TOKEN not configured');
    return;
  }

  try {
    const axios = require('axios');
    await axios.post(
      'https://gate.whapi.cloud/messages/text',
      {
        to: config.ownerPhone,
        body: message,
      },
      {
        headers: { Authorization: `Bearer ${config.whapiToken}` },
      }
    );
    logger.info('Owner notification sent');
  } catch (e) {
    logger.error(`Error sending notification: ${e.message}`);
  }
}

/**
 * Handles video request event - Full workflow
 * @param {object} payload - Event payload
 * @returns {Promise<object>}
 */
async function handleVideoRequest(payload) {
  const { jobId, title, idea, image } = payload;
  logger.info(`Video request: ${title || idea} (Job #${jobId})`);

  try {
    // Step 1: Generate video
    logger.info('Step 1: Generating video...');
    const videoResult = await generateVideo(title, idea, image, jobId);

    if (!videoResult.success) {
      throw new Error('Video generation failed');
    }

    // Step 2: Generate captions
    logger.info('Step 2: Generating captions...');
    const captions = await generateCaptions(title, videoResult.prompt);

    // Step 3: Publish to all platforms
    logger.info('Step 3: Publishing to social media...');
    const publishResults = await publishToAllPlatforms(videoResult.videoUrl, captions, title);

    const successful = getSuccessfulPlatforms(publishResults);
    const failed = getFailedPlatforms(publishResults);

    // Publish completion event
    await publishEvent(
      EVENT_TYPES.VIDEO_COMPLETED,
      AGENT_ID,
      {
        jobId,
        videoUrl: videoResult.videoUrl,
        platforms: successful,
        failed,
      },
      null
    );

    // Notify owner
    const platformList = successful.join(', ') || 'Ninguna';
    await notifyOwner(
      `🎬 *Video #${jobId} completado!*\n\n` +
        `📹 ${videoResult.videoUrl}\n\n` +
        `✅ Publicado en: ${platformList}` +
        (failed.length > 0 ? `\n❌ Falló en: ${failed.map((f) => f.platform).join(', ')}` : '')
    );

    logger.info(`Video workflow complete. Published to: ${platformList}`);

    return {
      success: true,
      jobId,
      videoUrl: videoResult.videoUrl,
      captions,
      publishResults,
    };
  } catch (error) {
    logger.error(`Video workflow failed: ${error.message}`);

    // Publish failure event
    await publishEvent(
      EVENT_TYPES.VIDEO_FAILED,
      AGENT_ID,
      { jobId, error: error.message },
      null
    );

    // Notify owner of failure
    await notifyOwner(
      `❌ *Video #${jobId} falló*\n\n` +
        `Error: ${error.message}\n\n` +
        `Revisa los logs para más detalles.`
    );

    return { success: false, error: error.message };
  }
}

/**
 * Handles social publish event - Publish existing content
 * @param {object} payload - Event payload
 * @returns {Promise<object>}
 */
async function handleSocialPublish(payload) {
  const { videoUrl, caption, platforms, title } = payload;
  logger.info(`Social publish request: ${platforms?.join(', ') || 'all'}`);

  try {
    const captions = {
      tiktok: caption,
      instagram: caption,
      facebook: caption,
      youtube: caption,
      twitter: caption?.substring(0, 280),
    };

    const results = await publishToAllPlatforms(videoUrl, captions, title);
    const successful = getSuccessfulPlatforms(results);

    return {
      success: true,
      platforms: successful,
      results,
    };
  } catch (error) {
    logger.error(`Social publish failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Event consumer loop
 * @param {number} pollInterval - Milliseconds between polls
 */
async function startEventLoop(pollInterval = 10000) {
  logger.info('Starting Marcus event loop...');

  await registerHeartbeat(AGENT_ID, { status: 'running', version: '2.0.0' });

  const processEvents = async () => {
    try {
      const result = await consumeEvents(AGENT_ID, SUBSCRIBED_EVENTS, 1);

      if (!result.success || !result.data.length) {
        return;
      }

      for (const event of result.data) {
        logger.info(`Processing event: ${event.event_type} (${event.id})`);
        await markEventProcessing(event.id, AGENT_ID);

        try {
          let response;

          switch (event.event_type) {
            case EVENT_TYPES.VIDEO_REQUESTED:
              response = await handleVideoRequest(event.payload);
              break;
            case EVENT_TYPES.SOCIAL_PUBLISH:
              response = await handleSocialPublish(event.payload);
              break;
            default:
              response = { status: 'unknown_event' };
          }

          await markEventCompleted(event.id, AGENT_ID, response);
        } catch (error) {
          logger.error(`Error processing event ${event.id}:`, error);
          await markEventFailed(event.id, AGENT_ID, error.message);
        }
      }

      await registerHeartbeat(AGENT_ID, { lastProcessed: new Date().toISOString() });
    } catch (error) {
      logger.error('Event loop error:', error);
    }
  };

  await processEvents();
  setInterval(processEvents, pollInterval);
}

/**
 * Legacy compatibility - Direct video generation
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @param {string} imageUrl - Reference image
 * @returns {Promise<object>}
 */
async function generateViralVideo(title, idea, imageUrl = null) {
  const jobId = Date.now().toString();

  return handleVideoRequest({
    jobId,
    title,
    idea,
    image: imageUrl,
  });
}

module.exports = {
  AGENT_ID,
  startEventLoop,
  handleVideoRequest,
  handleSocialPublish,
  generateViralVideo, // Legacy compatibility
};
