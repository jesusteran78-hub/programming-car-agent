/**
 * Marketing Agent
 * Handles social media publishing via Blotato API
 * Includes video generation via KIE (Sora 2)
 */
const logger = require('../logger');
require('dotenv').config();

const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;

// Video generation status tracking
const videoJobs = new Map();
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

    const response = await fetch('https://api.blotato.com/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOTATO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
    const response = await fetch('https://api.blotato.com/v1/posts?status=scheduled', {
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
 * @param {string} idea - Video idea/concept
 * @returns {Promise<{success: boolean, message: string, jobId?: string}>}
 */
async function generateVideo(idea) {
  try {
    const { generateViralVideo } = require('../video_engine');
    const jobId = Date.now().toString();
    const title = idea.substring(0, 50);

    // Track job
    videoJobs.set(jobId, { status: 'processing', idea, startedAt: new Date() });

    logger.info(`🎬 Video job ${jobId} started: ${title}`);

    // Start async generation (don't await - let it run in background)
    (async () => {
      try {
        const result = await generateViralVideo(title, idea);
        videoJobs.set(jobId, {
          status: 'completed',
          result,
          completedAt: new Date()
        });
        logger.info(`✅ Video job ${jobId} completed`);
      } catch (error) {
        videoJobs.set(jobId, {
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        });
        logger.error(`❌ Video job ${jobId} failed: ${error.message}`);
      }
    })();

    return {
      success: true,
      message: `🎬 Video en proceso (#${jobId})\nIdea: "${title}..."\n\n⏳ Generando con IA (3-5 min).\nUsa \`mkt video status\` para ver progreso.`,
      jobId,
    };
  } catch (error) {
    logger.error(`Video generation error: ${error.message}`);
    return { success: false, message: `❌ Error: ${error.message}` };
  }
}

/**
 * Get video jobs status
 * @returns {string}
 */
function getVideoJobsStatus() {
  if (videoJobs.size === 0) {
    return '📹 No hay videos en proceso.';
  }

  let status = '🎬 **VIDEOS EN PROCESO**\n\n';

  for (const [jobId, job] of videoJobs) {
    const emoji = job.status === 'completed' ? '✅' :
                  job.status === 'failed' ? '❌' : '⏳';
    status += `${emoji} #${jobId}: ${job.status}\n`;

    if (job.status === 'completed' && job.result?.video) {
      status += `   📹 ${job.result.video.substring(0, 50)}...\n`;
    }
    if (job.status === 'failed') {
      status += `   ❌ ${job.error}\n`;
    }
  }

  return status;
}

/**
 * Process marketing command from owner
 * @param {string} command - Command after "marketing"
 * @returns {Promise<string>}
 */
async function processMarketingCommand(command) {
  const lowerCmd = command.toLowerCase().trim();

  // Status command
  if (lowerCmd === 'status' || lowerCmd === '') {
    const scheduled = await getScheduledPosts();
    const videoStatus = videoJobs.size > 0 ? `\n\n${getVideoJobsStatus()}` : '';

    return `📱 **MARKETING STATUS**\n\n` +
      `Plataformas: ${Object.keys(BLOTATO_ACCOUNTS).filter(k => BLOTATO_ACCOUNTS[k]).join(', ')}\n` +
      `Posts programados: ${scheduled.length}${videoStatus}\n\n` +
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
      return getVideoJobsStatus();
    }

    // Generate new video
    const result = await generateVideo(subCmd);
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
