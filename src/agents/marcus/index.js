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

const { generateVideo, generateTextToVideo } = require('./video-generator');
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
 * @param {string} imageUrl - Optional image URL attached to command
 * @returns {Promise<object>}
 */
async function processOwnerCommand(command, imageUrl = null) {
  const cmd = command.trim().toLowerCase();
  const parts = cmd.split(/\s+/);
  const action = parts[0];
  const args = parts.slice(1).join(' ');

  logger.info(`Processing command: ${cmd} ${imageUrl ? '(with image)' : ''}`);

  switch (action) {
    case 'status':
    case 'estado': {
      const status = await getVideoStatus();
      return {
        success: true,
        message: formatVideoStatus(status),
      };
    }

    // 10 SUPER BOWL LEVEL STYLES (including UGC - proven viral)
    case 'cinematic':
    case 'luxury':
    case 'story':
    case 'hypebeast':
    case 'pov':
    case 'selfie':
    case 'ugc':
    case 'viral':
    case 'tech':
    case 'emergency':
    case 'satisfying':
    case 'video': {
      // Map action to style
      const styleMap = {
        video: 'cinematic',      // Default = Netflix quality
        cinematic: 'cinematic',  // Hollywood blockbuster
        viral: 'viral',          // TikTok algorithm crusher
        luxury: 'luxury',        // Rolex/Mercedes aesthetic
        story: 'story',          // Mini-movie with narrative
        hypebeast: 'hypebeast',  // Miami street culture
        pov: 'pov',              // First-person immersion
        selfie: 'ugc',           // Now uses PROVEN UGC prompt
        ugc: 'ugc',              // PROVEN VIRAL - Selfie UGC style
        tech: 'tech',            // Mr. Robot / Tron cyberpunk
        emergency: 'emergency',  // 3AM rescue documentary
        satisfying: 'satisfying', // ASMR / oddly satisfying
      };
      const style = styleMap[action] || 'cinematic';

      if (!args) {
        return {
          success: false,
          message:
            `❌ Falta la idea del video.\n\n` +
            '**🎬 10 ESTILOS SUPER BOWL LEVEL:**\n\n' +
            '• **mkt ugc [idea]** - 📱 UGC Selfie (VIRAL PROBADO)\n' +
            '• **mkt video [idea]** - 🎥 Cinematico (Netflix)\n' +
            '• **mkt viral [idea]** - 🔥 Hook viral (100M views)\n' +
            '• **mkt luxury [idea]** - 💎 Premium (Rolex)\n' +
            '• **mkt story [idea]** - 🎭 Mini-pelicula\n' +
            '• **mkt hypebeast [idea]** - 🌴 Miami Street\n' +
            '• **mkt pov [idea]** - 👁️ Primera persona\n' +
            '• **mkt tech [idea]** - 🤖 Cyberpunk/Hacker\n' +
            '• **mkt emergency [idea]** - 🚨 Rescate 3AM\n' +
            '• **mkt satisfying [idea]** - 😌 ASMR/Satisfactorio\n\n' +
            '**USO:**\n' +
            '• mkt ugc [idea] → Te pide foto\n' +
            '• mkt ugc [idea] | [url] → Usa esa imagen\n\n' +
            '**EJEMPLOS:**\n' +
            '• mkt ugc acabo de programar llave bmw\n' +
            '• mkt viral llave bmw perdida a las 3am\n' +
            '• mkt tech hackeando el sistema de un tesla',
        };
      }

      // Check if user provided an image URL (separated by |) OR passed as argument
      let idea = args;
      let targetImageUrl = imageUrl; // Use passed image by default

      // Explicit URL in text overrides passed image
      if (args.includes('|')) {
        const parts = args.split('|').map((p) => p.trim());
        idea = parts[0];
        const imageParam = parts[1] || '';

        if (imageParam.startsWith('http')) {
          targetImageUrl = imageParam;
        }
      }

      // If we have an image (either passed or parsed), start immediately
      if (targetImageUrl) {
        const jobId = Date.now().toString();
        logger.info(`Starting video job ${jobId}: ${idea} (image: ${targetImageUrl})`);

        handleVideoRequest({
          jobId,
          title: idea,
          idea: idea,
          image: targetImageUrl,
          style,
        }).catch((e) => logger.error(`Video job ${jobId} failed: ${e.message}`));

        const styleNames = {
          ugc: '📱 UGC Selfie (VIRAL PROBADO)',
          cinematic: '🎥 Cinematico (Netflix)',
          viral: '🔥 Viral (100M views)',
          luxury: '💎 Luxury (Rolex)',
          story: '🎭 Story (Mini-pelicula)',
          hypebeast: '🌴 Hypebeast (Miami)',
          pov: '👁️ POV (Primera persona)',
          tech: '🤖 Tech (Cyberpunk)',
          emergency: '🚨 Emergency (Rescate)',
          satisfying: '😌 Satisfying (ASMR)',
        };

        return {
          success: true,
          message:
            `🎬 **Video #${jobId} iniciado**\n` +
            (imageUrl ? `(Imagen recibida de adjunto)\n` : ``) +
            `\n📝 Idea: ${idea}\n` +
            `🎭 Estilo: ${styleNames[style] || style}\n\n` +
            `⏳ Proceso:\n` +
            `1. Generando prompt cinematográfico...\n` +
            `2. Creando video con Sora 2...\n` +
            `3. Agregando voz y watermark...\n` +
            `4. Publicando en 5 redes...\n\n` +
            `Te notificaré cuando esté listo.`,
        };
      }

      // No image provided - ALWAYS wait for photo
      const jobId = Date.now().toString();

      pendingPhotoJobs.set('owner', {
        jobId,
        idea,
        style,
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
          `📸 **ENVÍA LA FOTO para el video**\n\n` +
          `📝 Idea: ${idea}\n` +
          `🎭 Estilo: ${style}\n\n` +
          `⏳ Tienes 5 minutos para enviar la foto.\n\n` +
          `💡 Opciones:\n` +
          `• Envía una foto por WhatsApp\n` +
          `• O usa: mkt ${action} [idea] | [URL de imagen]\n` +
          `• Escribe "mkt cancelar" para cancelar`,
      };
    }

    // TEXT-TO-VIDEO: No photo required - generates from text only
    case 'txt':
    case 'txt2vid':
    case 'texto': {
      if (!args) {
        return {
          success: false,
          message:
            `❌ Falta la idea del video.\n\n` +
            '**🎬 TEXT-TO-VIDEO (Sin foto)**\n\n' +
            '• **mkt txt [idea]** - Video desde texto\n\n' +
            '**EJEMPLOS:**\n' +
            '• mkt txt tecnico programando TCM en taller miami\n' +
            '• mkt txt manos sosteniendo llave ford f150\n' +
            '• mkt txt van de servicio llegando a parking\n\n' +
            '**NOTA:** Este modo NO requiere foto.\n' +
            'Para videos con TU foto real, usa:\n' +
            '• mkt ugc [idea] → Te pide foto por WhatsApp',
        };
      }

      const jobId = `txt2vid-${Date.now()}`;
      logger.info(`Starting TEXT-TO-VIDEO job ${jobId}: ${args}`);

      // Start text-to-video generation (no photo needed)
      generateTextToVideo(args, args, { jobId, style: 'cinematic' })
        .then((result) => {
          if (result.success) {
            notifyOwner(
              `🎬 **Video TXT2VID #${jobId} completado!**\n\n` +
              `📝 Idea: ${args}\n` +
              `📹 ${result.videoUrl}\n\n` +
              `✅ Generado desde TEXTO (sin foto)`
            );
          }
        })
        .catch((e) => {
          logger.error(`Text-to-video job ${jobId} failed: ${e.message}`);
          notifyOwner(
            `❌ **Video TXT2VID #${jobId} falló**\n\n` +
            `Error: ${e.message}`
          );
        });

      return {
        success: true,
        message:
          `🎬 **Video TEXT-TO-VIDEO iniciado**\n\n` +
          `🆔 Job: #${jobId}\n` +
          `📝 Idea: ${args}\n` +
          `🖼️ Modo: Sin foto (texto puro)\n\n` +
          `⏳ Proceso:\n` +
          `1. Generando prompt cinematográfico...\n` +
          `2. Creando video con Sora 2 TEXT-TO-VIDEO...\n` +
          `3. Agregando watermark...\n` +
          `4. Publicando en redes...\n\n` +
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
          '🎬 **VIRAL VIDEO FACTORY - Marcus**\n\n' +
          '**DOS MODOS DE GENERACION:**\n\n' +
          '**📸 CON FOTO (Image-to-Video):**\n' +
          '• mkt ugc [idea] - 📱 UGC Selfie (pide foto)\n' +
          '• mkt video [idea] - 🎥 Cinematico\n' +
          '• mkt viral [idea] - 🔥 Hook viral\n' +
          '• mkt luxury [idea] - 💎 Premium\n' +
          '• mkt [estilo] [idea] | [url] - Con URL imagen\n\n' +
          '**📝 SIN FOTO (Text-to-Video):**\n' +
          '• mkt txt [idea] - 🎬 Video desde TEXTO\n\n' +
          '**COMANDOS:**\n' +
          '• mkt status - Videos recientes\n' +
          '• mkt pendiente - Video esperando foto\n' +
          '• mkt cancelar - Cancelar pendiente\n\n' +
          '**EJEMPLOS:**\n' +
          '• mkt ugc acabo de programar llave → Te pide foto\n' +
          '• mkt txt tecnico sosteniendo TCM miami → Sin foto\n' +
          '• mkt viral rescate 3am | http://imagen.jpg → Con URL',
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

  // Style display names for photo handler
  const styleNamesPhoto = {
    ugc: '📱 UGC Selfie (VIRAL PROBADO)',
    cinematic: '🎥 Cinematico (Netflix)',
    viral: '🔥 Viral (100M views)',
    luxury: '💎 Luxury (Rolex)',
    story: '🎭 Story (Mini-pelicula)',
    hypebeast: '🌴 Hypebeast (Miami)',
    pov: '👁️ POV (Primera persona)',
    tech: '🤖 Tech (Cyberpunk)',
    emergency: '🚨 Emergency (Rescate)',
    satisfying: '😌 Satisfying (ASMR)',
  };

  return {
    handled: true,
    message:
      `🎬 **Video #${pending.jobId} iniciado con tu foto!**\n\n` +
      `📝 Idea: ${pending.idea}\n` +
      `🖼️ Imagen: Tu foto\n` +
      `🎭 Estilo: ${styleNamesPhoto[pending.style] || pending.style}\n\n` +
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
