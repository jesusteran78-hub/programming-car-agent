/**
 * Marketing Agent
 * Handles social media publishing via Blotato API
 * Includes video generation via KIE (Sora 2)
 * Jobs now persisted in Supabase (no memory loss on restart)
 */
const logger = require('../logger');
require('dotenv').config();

const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;
const BLOTATO_ACCOUNTS = {
  tiktok: process.env.BLOTATO_ACCOUNT_ID,
  instagram: process.env.BLOTATO_INSTAGRAM_ID,
  youtube: process.env.BLOTATO_YOUTUBE_ID,
  twitter: process.env.BLOTATO_TWITTER_ID,
  facebook: process.env.BLOTATO_FACEBOOK_ID,
};

/**
 * Publish content to social media via Blotato
 * @param {string} platform - Platform name (tiktok, instagram, etc.)
 * @param {string} content - Text content to post
 * @param {string} mediaUrl - Optional media URL
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function publishToSocial(platform, content, mediaUrl = null) {
  try {
    const accountId = BLOTATO_ACCOUNTS[platform.toLowerCase()];
    if (!accountId) {
      return { success: false, message: `Plataforma "${platform}" no configurada` };
    }

    const payload = {
      account_id: accountId,
      text: content,
    };

    if (mediaUrl) {
      payload.media_url = mediaUrl;
    }

    const response = await fetch('https://backend.blotato.com/v2/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOTATO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post: {
          accountId: accountId,
          content: {
            text: content,
            mediaUrls: mediaUrl ? [mediaUrl] : [],
            platform: platform.toLowerCase(),
          },
          target: {
            targetType: platform.toLowerCase(),
            platform: platform.toLowerCase(),
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Blotato error: ${error}`);
      return { success: false, message: `Error publicando en ${platform}: ${error}` };
    }

    const result = await response.json();
    logger.info(`✅ Published to ${platform}: ${result.id || 'OK'}`);
    return { success: true, message: `✅ Publicado en ${platform}`, postId: result.id };
  } catch (error) {
    logger.error(`Marketing agent error: ${error.message}`);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Publish to all configured platforms
 * @param {string} content - Text content
 * @param {string} mediaUrl - Optional media URL
 * @returns {Promise<Array>}
 */
async function publishToAll(content, mediaUrl = null) {
  const results = [];
  for (const platform of Object.keys(BLOTATO_ACCOUNTS)) {
    if (BLOTATO_ACCOUNTS[platform]) {
      const result = await publishToSocial(platform, content, mediaUrl);
      results.push({ platform, ...result });
    }
  }
  return results;
}

/**
 * Get scheduled posts
 * @returns {Promise<Array>}
 */
async function getScheduledPosts() {
  try {
    const response = await fetch('https://backend.blotato.com/v2/posts?status=scheduled', {
      headers: {
        'Authorization': `Bearer ${BLOTATO_API_KEY}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    logger.error(`Error fetching scheduled posts: ${error.message}`);
    return [];
  }
}

/**
 * Generate viral video using video_engine
 * Jobs are persisted in Supabase automatically by video_engine
 * @param {string} idea - Video idea/concept
 * @param {string|null} imageUrl - Optional image URL from WhatsApp
 * @returns {Promise<{success: boolean, message: string, jobId?: string}>}
 */
async function generateVideo(idea, imageUrl = null) {
  try {
    const { generateViralVideo } = require('../video_engine');
    const jobId = Date.now().toString();
    const title = idea.substring(0, 50);

    logger.info(`🎬 Video job ${jobId} started: ${title}`);
    if (imageUrl) {
      logger.info(`📸 Con imagen adjunta: ${imageUrl.substring(0, 50)}...`);
    }

    // Start async generation (don't await - let it run in background)
    // video_engine handles persistence, image enhancement, and notifications automatically
    (async () => {
      try {
        await generateViralVideo(title, idea, imageUrl, jobId);
        logger.info(`✅ Video job ${jobId} completed`);
      } catch (error) {
        logger.error(`❌ Video job ${jobId} failed: ${error.message}`);
      }
    })();

    const hasImage = imageUrl ? '\n📸 Imagen detectada - se mejorará con IA' : '';

    return {
      success: true,
      message: `🎬 Video en proceso (#${jobId})\nIdea: "${title}..."${hasImage}\n\n⏳ Generando con IA (5-10 min).\nRecibirás WhatsApp cuando termine.\nUsa \`mkt video status\` para ver progreso.`,
      jobId,
    };
  } catch (error) {
    logger.error(`Video generation error: ${error.message}`);
    return { success: false, message: `❌ Error: ${error.message}` };
  }
}

/**
 * Get video jobs status from Supabase
 * @returns {Promise<string>}
 */
async function getVideoJobsStatus() {
  try {
    const { getVideoJobs } = require('../video_engine');
    const jobs = await getVideoJobs(10);

    if (!jobs || jobs.length === 0) {
      return '📹 No hay videos recientes.';
    }

    let status = '🎬 **VIDEOS RECIENTES**\n\n';

    for (const job of jobs) {
      const emoji = job.status === 'completed' ? '✅' :
                    job.status === 'failed' ? '❌' : '⏳';
      status += `${emoji} #${job.job_id}: ${job.status}\n`;
      status += `   📝 ${job.title || job.idea?.substring(0, 30) || 'Sin título'}...\n`;

      if (job.status === 'completed' && job.video_url) {
        status += `   📹 ${job.video_url.substring(0, 50)}...\n`;
      }
      if (job.status === 'failed' && job.error) {
        status += `   ❌ ${job.error}\n`;
      }
      status += '\n';
    }

    return status;
  } catch (error) {
    logger.error(`Error getting video jobs: ${error.message}`);
    return '❌ Error obteniendo estado de videos.';
  }
}

/**
 * Process marketing command from owner
 * @param {string} command - Command after "marketing"
 * @param {string|null} imageUrl - Optional image URL from WhatsApp
 * @returns {Promise<string>}
 */
async function processMarketingCommand(command, imageUrl = null) {
  const lowerCmd = command.toLowerCase().trim();

  // Status command
  if (lowerCmd === 'status' || lowerCmd === '') {
    const scheduled = await getScheduledPosts();
    const videoStatus = await getVideoJobsStatus();

    return `📱 **MARKETING STATUS**\n\n` +
      `Plataformas: ${Object.keys(BLOTATO_ACCOUNTS).filter(k => BLOTATO_ACCOUNTS[k]).join(', ')}\n` +
      `Posts programados: ${scheduled.length}\n\n` +
      `${videoStatus}\n\n` +
      `Comandos:\n` +
      `• \`mkt video [idea]\` - Generar video con IA\n` +
      `• \`mkt video status\` - Ver videos en proceso\n` +
      `• \`mkt publica [texto]\` - Publicar en todas las redes\n` +
      `• \`mkt tiktok [texto]\` - Solo TikTok`;
  }

  // Video generation command
  if (lowerCmd.startsWith('video')) {
    const subCmd = command.substring(5).trim();

    // Video status
    if (subCmd.toLowerCase() === 'status' || subCmd === '') {
      return await getVideoJobsStatus();
    }

    // Generate new video (with optional image)
    const result = await generateVideo(subCmd, imageUrl);
    return result.message;
  }

  // Publish to specific platform
  for (const platform of Object.keys(BLOTATO_ACCOUNTS)) {
    if (lowerCmd.startsWith(platform)) {
      const content = command.substring(platform.length).trim();
      if (!content) {
        return `❌ Falta el contenido. Uso: \`marketing ${platform} [texto]\``;
      }
      const result = await publishToSocial(platform, content);
      return result.message;
    }
  }

  // Publish to all
  if (lowerCmd.startsWith('publica') || lowerCmd.startsWith('post')) {
    const content = command.replace(/^(publica|post)\s*/i, '').trim();
    if (!content) {
      return '❌ Falta el contenido. Uso: `marketing publica [texto]`';
    }
    const results = await publishToAll(content);
    const summary = results.map(r => `${r.platform}: ${r.success ? '✅' : '❌'}`).join('\n');
    return `📱 **PUBLICACIÓN MASIVA**\n\n${summary}`;
  }

  return '❓ Comando no reconocido. Usa `marketing status` para ver opciones.';
}

module.exports = {
  publishToSocial,
  publishToAll,
  getScheduledPosts,
  generateVideo,
  getVideoJobsStatus,
  processMarketingCommand,
};
