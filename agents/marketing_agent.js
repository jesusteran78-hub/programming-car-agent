/**
 * Marketing Agent
 * Handles social media publishing via Blotato API
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
 * Process marketing command from owner
 * @param {string} command - Command after "marketing"
 * @returns {Promise<string>}
 */
async function processMarketingCommand(command) {
  const lowerCmd = command.toLowerCase().trim();

  // Status command
  if (lowerCmd === 'status' || lowerCmd === '') {
    const scheduled = await getScheduledPosts();
    return `📱 **MARKETING STATUS**\n\n` +
      `Plataformas configuradas: ${Object.keys(BLOTATO_ACCOUNTS).filter(k => BLOTATO_ACCOUNTS[k]).join(', ')}\n` +
      `Posts programados: ${scheduled.length}\n\n` +
      `Comandos:\n` +
      `• \`marketing publica [texto]\` - Publicar en todas las redes\n` +
      `• \`marketing tiktok [texto]\` - Solo TikTok\n` +
      `• \`marketing instagram [texto]\` - Solo Instagram`;
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
  processMarketingCommand,
};
