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
 * Pending video jobs waiting for photos
 * Map of ownerId -> { jobId, idea, timestamp }
 */
const pendingPhotoJobs = new Map();

/**
 * Timeout for pending photo requests (5 minutes)
 */
const PHOTO_TIMEOUT_MS = 5 * 60 * 1000;

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
  const { jobId, title, idea, image, style } = payload;
  logger.info(`Video request: ${title || idea} (Job #${jobId}, Style: ${style || 'product'})`);

  try {
    // Step 1: Generate video
    logger.info(`Step 1: Generating video (${style || 'product'})...`);
    const videoResult = await generateVideo(title, idea, image, { jobId, style });

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

/**
 * Gets video job status from database
 * @returns {Promise<object>}
 */
async function getVideoStatus() {
  const { getSupabase } = require('../../core/supabase');
  const supabase = getSupabase();

  try {
    const { data: jobs, error } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      jobs: jobs || [],
      total: jobs?.length || 0,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Formats video status for WhatsApp
 * @param {object} status - Status data
 * @returns {string}
 */
function formatVideoStatus(status) {
  if (!status.success) {
    return `❌ Error: ${status.error}`;
  }

  if (!status.jobs || status.jobs.length === 0) {
    return '📹 No hay videos recientes.\n\nUsa: mkt video [idea] para crear uno.';
  }

  let msg = '**Marcus (Marketing) - Videos Recientes**\n\n';

  for (const job of status.jobs) {
    const statusIcon = job.status === 'completed' ? '✅' : job.status === 'processing' ? '⏳' : '❌';
    const date = new Date(job.created_at).toLocaleDateString('es-ES');
    msg += `${statusIcon} **${job.title || 'Sin título'}**\n`;
    msg += `   Estado: ${job.status} | ${date}\n`;
    if (job.video_url) {
      msg += `   🔗 ${job.video_url.substring(0, 50)}...\n`;
    }
    msg += '\n';
  }

  return msg.trim();
}

/**
 * Processes owner commands for Marcus
 * @param {string} command - Command string (without prefix)
 * @returns {Promise<object>}
 */
async function processOwnerCommand(command) {
  const cmd = command.trim().toLowerCase();
  const parts = cmd.split(/\s+/);
  const action = parts[0];
  const args = parts.slice(1).join(' ');

  logger.info(`Processing command: ${cmd}`);

  switch (action) {
    case 'status':
    case 'estado': {
      const status = await getVideoStatus();
      return {
        success: true,
        message: formatVideoStatus(status),
      };
    }

    case 'selfie':
    case 'viral':
    case 'video': {
      const isSelfie = action === 'selfie' || action === 'viral';
      const style = isSelfie ? 'selfie' : 'product';

      if (!args) {
        return {
          success: false,
          message:
            `❌ Falta la idea del ${isSelfie ? 'selfie' : 'video'}.\n\n` +
            '**Uso:**\n' +
            '• mkt video [idea] - Video de producto (Manos)\n' +
            '• mkt selfie [idea] - Video viral (Tu cara hablando)\n' +
            '• mkt selfie [idea] | default - Usa imagen por defecto\n' +
            '• mkt selfie [idea] | [url_imagen] - Usa tu imagen\n\n' +
            '**Ejemplos:**\n' +
            '• mkt video llave toyota camry 2020\n' +
            '• mkt selfie explicando la oferta del mes',
        };
      }

      // Check if user provided an image URL or "default" (separated by |)
      let idea = args;
      let imageUrl = null;
      let useDefault = false;

      if (args.includes('|')) {
        const parts = args.split('|').map((p) => p.trim());
        idea = parts[0];
        const imageParam = parts[1] || '';

        if (imageParam.toLowerCase() === 'default' || imageParam.toLowerCase() === 'defecto') {
          useDefault = true;
        } else if (imageParam.startsWith('http')) {
          imageUrl = imageParam;
        }
      }

      // If no | separator, ask for photo first
      if (!args.includes('|')) {
        const jobId = Date.now().toString();

        // Store pending job waiting for photo
        pendingPhotoJobs.set('owner', {
          jobId,
          jobId,
          idea,
          style, // Store style
          timestamp: Date.now(),
        });

        logger.info(`Pending video job ${jobId} waiting for photo: ${idea}`);

        // Set timeout to auto-cancel after 5 minutes
        setTimeout(() => {
          const pending = pendingPhotoJobs.get('owner');
          if (pending && pending.jobId === jobId) {
            pendingPhotoJobs.delete('owner');
            logger.info(`Pending job ${jobId} expired (no photo received)`);
          }
        }, PHOTO_TIMEOUT_MS);

        return {
          success: true,
          message:
            `📸 **Envíame la foto para el video**\n\n` +
            `📝 Idea: ${idea}\n\n` +
            `Tienes 5 minutos para enviar la foto.\n\n` +
            `💡 Opciones:\n` +
            `• Envía una foto ahora\n` +
            `• Escribe "mkt usar default" para imagen por defecto\n` +
            `• Escribe "mkt cancelar" para cancelar`,
        };
      }

      // Start video generation in background (with provided image or default)
      const jobId = Date.now().toString();
      logger.info(`Starting video job ${jobId}: ${idea} (image: ${imageUrl || 'default'})`);

      // Don't await - let it run in background
      handleVideoRequest({
        jobId,
        title: idea,
        idea: idea,
        image: imageUrl,
        style, // Pass style
      }).catch((e) => logger.error(`Video job ${jobId} failed: ${e.message}`));

      return {
        success: true,
        message:
          `🎬 **Video #${jobId} iniciado**\n\n` +
          `📝 Idea: ${idea}\n` +
          `🖼️ Imagen: ${imageUrl ? 'Personalizada' : 'Por defecto'}\n` +
          `🎭 Estilo: ${isSelfie ? '🤳 Viral / Selfie' : '🛠️ Producto / Manos'}\n\n` +
          `⏳ Proceso:\n` +
          `1. Generando prompt cinematográfico...\n` +
          `2. Creando video con Sora 2...\n` +
          `3. Agregando voz y watermark...\n` +
          `4. Publicando en 5 redes...\n\n` +
          `Te notificaré cuando esté listo.`,
      };
    }

    case 'usar': {
      // "mkt usar default" - use default image for pending job
      const pending = pendingPhotoJobs.get('owner');
      if (!pending) {
        return {
          success: false,
          message: '❌ No hay video pendiente esperando foto.\n\nUsa: mkt video [idea]',
        };
      }

      // Clear pending job
      pendingPhotoJobs.delete('owner');

      // Start video with default image
      logger.info(`Starting pending video job ${pending.jobId} with default image: ${pending.idea}`);

      handleVideoRequest({
        jobId: pending.jobId,
        title: pending.idea,
        idea: pending.idea,
        image: null, // Will use default
        style: pending.style || 'product',
      }).catch((e) => logger.error(`Video job ${pending.jobId} failed: ${e.message}`));

      return {
        success: true,
        message:
          `🎬 **Video #${pending.jobId} iniciado**\n\n` +
          `📝 Idea: ${pending.idea}\n` +
          `🖼️ Imagen: Por defecto\n` +
          `🎭 Estilo: ${pending.style === 'selfie' ? '🤳 Viral / Selfie' : '🛠️ Producto / Manos'}\n\n` +
          `⏳ Proceso:\n` +
          `1. Generando prompt cinematográfico...\n` +
          `2. Creando video con Sora 2...\n` +
          `3. Agregando voz y watermark...\n` +
          `4. Publicando en 5 redes...\n\n` +
          `Te notificaré cuando esté listo.`,
      };
    }

    case 'cancelar':
    case 'cancel': {
      const pending = pendingPhotoJobs.get('owner');
      if (!pending) {
        return {
          success: false,
          message: '❌ No hay video pendiente para cancelar.',
        };
      }

      pendingPhotoJobs.delete('owner');
      logger.info(`Video job ${pending.jobId} cancelled by owner`);

      return {
        success: true,
        message: `✅ Video #${pending.jobId} cancelado.\n\nIdea: ${pending.idea}`,
      };
    }

    case 'pendiente':
    case 'pending': {
      const pending = pendingPhotoJobs.get('owner');
      if (!pending) {
        return {
          success: true,
          message: '📭 No hay videos pendientes esperando foto.',
        };
      }

      const elapsed = Math.floor((Date.now() - pending.timestamp) / 1000);
      const remaining = Math.max(0, Math.floor((PHOTO_TIMEOUT_MS - (Date.now() - pending.timestamp)) / 1000));

      return {
        success: true,
        message:
          `📸 **Video pendiente esperando foto**\n\n` +
          `📝 Idea: ${pending.idea}\n` +
          `🆔 Job: #${pending.jobId}\n` +
          `⏱️ Tiempo restante: ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}\n\n` +
          `💡 Opciones:\n` +
          `• Envía una foto ahora\n` +
          `• "mkt usar default" para imagen por defecto\n` +
          `• "mkt cancelar" para cancelar`,
      };
    }

    case 'help':
    case 'ayuda':
    default: {
      return {
        success: true,
        message:
          '**Marcus (Marketing) Commands:**\n\n' +
          '• mkt video [idea] - Video Producto (Manos)\n' +
          '• mkt selfie [idea] - Video Selfie (Viral)\n' +
          '• mkt video [idea] | default - Usa imagen por defecto\n' +
          '• mkt video [idea] | [url] - Usa tu imagen URL\n' +
          '• mkt status - Ver videos recientes\n' +
          '• mkt pendiente - Ver si hay video esperando foto\n' +
          '• mkt usar default - Usar imagen default para video pendiente\n' +
          '• mkt cancelar - Cancelar video pendiente\n\n' +
          '**Ejemplos:**\n' +
          '• mkt video llave bmw serie 3\n' +
          '• mkt video llave toyota | default\n' +
          '• mkt video llave toyota | https://url.com/foto.jpg',
      };
    }
  }
}

/**
 * Handles incoming photo from owner
 * If there's a pending video job, uses the photo for that job
 * @param {string} imageUrl - URL of the received image
 * @returns {Promise<object>}
 */
async function handleIncomingPhoto(imageUrl) {
  const pending = pendingPhotoJobs.get('owner');

  if (!pending) {
    // No pending job - just acknowledge the photo
    return {
      handled: false,
      message: null,
    };
  }

  // Clear pending job
  pendingPhotoJobs.delete('owner');

  logger.info(`Received photo for pending video job ${pending.jobId}: ${imageUrl}`);

  // Start video with the provided image
  handleVideoRequest({
    jobId: pending.jobId,
    title: pending.idea,
    idea: pending.idea,
    image: imageUrl,
    style: pending.style || 'product',
  }).catch((e) => logger.error(`Video job ${pending.jobId} failed: ${e.message}`));

  return {
    handled: true,
    message:
      `🎬 **Video #${pending.jobId} iniciado con tu foto!**\n\n` +
      `📝 Idea: ${pending.idea}\n` +
      `🖼️ Imagen: Tu foto\n` +
      `🎭 Estilo: ${pending.style === 'selfie' ? '🤳 Viral / Selfie' : '🛠️ Producto / Manos'}\n\n` +
      `⏳ Proceso:\n` +
      `1. Generando prompt cinematográfico...\n` +
      `2. Creando video con Sora 2...\n` +
      `3. Agregando voz y watermark...\n` +
      `4. Publicando en 5 redes...\n\n` +
      `Te notificaré cuando esté listo.`,
  };
}

/**
 * Checks if there's a pending video job waiting for a photo
 * @returns {boolean}
 */
function hasPendingPhotoJob() {
  return pendingPhotoJobs.has('owner');
}

module.exports = {
  AGENT_ID,
  startEventLoop,
  handleVideoRequest,
  handleSocialPublish,
  generateViralVideo, // Legacy compatibility
  processOwnerCommand, // Owner commands
  getVideoStatus,
  handleIncomingPhoto, // Photo handler
  hasPendingPhotoJob, // Check for pending job
};
