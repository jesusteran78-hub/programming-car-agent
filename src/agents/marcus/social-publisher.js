/**
 * ATLAS Agent: Marcus (Marketing)
 * Social Media Publisher - Blotato Integration
 *
 * @module src/agents/marcus/social-publisher
 */
const axios = require('axios');

const { getOpenAI } = require('../../core/openai');
const { config } = require('../../core/config');
const logger = require('../../core/logger').child('SocialPub');

const BLOTATO_API_URL = 'https://backend.blotato.com/v2/posts';

/**
 * Platform configurations for Blotato
 */
const PLATFORMS = {
  tiktok: {
    id: () => process.env.BLOTATO_ACCOUNT_ID,
    targetType: 'tiktok',
    config: {
      privacyLevel: 'PUBLIC_TO_EVERYONE',
      disabledComments: false,
      disabledDuet: false,
      disabledStitch: false,
      isYourBrand: false,
      isAiGenerated: true,
      isBrandedContent: false,
    },
  },
  instagram: {
    id: () => process.env.BLOTATO_INSTAGRAM_ID,
    targetType: 'instagram',
    config: {},
  },
  youtube: {
    id: () => process.env.BLOTATO_YOUTUBE_ID,
    targetType: 'youtube',
    config: {
      privacyStatus: 'public',
      shouldNotifySubscribers: true,
    },
  },
  twitter: {
    id: () => process.env.BLOTATO_TWITTER_ID,
    targetType: 'twitter',
    config: {},
  },
  facebook: {
    id: () => process.env.BLOTATO_FACEBOOK_ID,
    targetType: 'facebook',
    config: {
      pageId: process.env.BLOTATO_FACEBOOK_PAGE_ID,
    },
  },
};

/**
 * Generates viral captions for all platforms
 * @param {string} title - Video title
 * @param {string} context - Video context/script
 * @returns {Promise<object>}
 */
async function generateCaptions(title, context) {
  const openai = getOpenAI();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un experto Social Media Manager. Tu único trabajo es generar los textos (captions) perfectos para cada plataforma.

Debes devolver la respuesta estrictamente en formato JSON válido.

Estructura esperada:
{
    "tiktok": "Texto corto + CTA + EXACTAMENTE 5 hashtags",
    "instagram": "Texto estético + CTA + EXACTAMENTE 5 hashtags",
    "facebook": "Texto informativo + CTA + EXACTAMENTE 5 hashtags",
    "youtube": "Título SEO + Descripción + CTA + EXACTAMENTE 5 hashtags",
    "twitter": "Texto corto (max 280 chars) + CTA + EXACTAMENTE 5 hashtags"
}

REGLAS DE CTA (CALL TO ACTION) - OBLIGATORIO:
- SIEMPRE mencionar a "Alex" como el asistente que responde por WhatsApp
- SIEMPRE incluir el link de WhatsApp: wa.me/17864782531
- Ejemplos de CTA:
  * "Escríbele a Alex: wa.me/17864782531"
  * "Alex te atiende al momento: wa.me/17864782531"
  * "Cotiza con Alex: wa.me/17864782531"
- El CTA va ANTES de los hashtags

REGLAS ESTRICTAS DE HASHTAGS:
- SIEMPRE incluir EXACTAMENTE 5 hashtags en CADA plataforma
- Los hashtags van AL FINAL del texto
- Hashtags recomendados: #ProgrammingCar #MiamiLocksmith #CarKeys #AllKeysLost #LostCarKeys

Reglas del Negocio:
- Asistente: Alex (responde por WhatsApp 24/7)
- WhatsApp de Alex: wa.me/17864782531
- Ubicación: Miami-Dade & Broward
- Servicio MÓVIL - vamos a donde está el cliente
- Tono: Profesional pero cercano, estilo Miami`,
        },
        {
          role: 'user',
          content: `Título del video: ${title}\nContexto Visual: ${context}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (e) {
    logger.warn(`Error generating captions: ${e.message}`);
    const defaultCaption = `${title}\n\nEscríbele a Alex: wa.me/17864782531\n\n#ProgrammingCar #MiamiLocksmith #CarKeys #AllKeysLost #AutoKeys`;
    return {
      tiktok: defaultCaption,
      instagram: defaultCaption,
      facebook: defaultCaption,
      youtube: defaultCaption,
      twitter: defaultCaption.substring(0, 280),
    };
  }
}

/**
 * Publishes content to a single platform
 * @param {string} platform - Platform name
 * @param {string} videoUrl - Video URL
 * @param {string} caption - Caption text
 * @param {string} title - Video title (for YouTube)
 * @returns {Promise<object>}
 */
async function publishToPlatform(platform, videoUrl, caption, title = '') {
  const platformConfig = PLATFORMS[platform];

  if (!platformConfig) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }

  const accountId = platformConfig.id();
  if (!accountId) {
    return { success: false, error: `No account ID configured for ${platform}` };
  }

  if (!config.blotatoApiKey) {
    return { success: false, error: 'BLOTATO_API_KEY not configured' };
  }

  try {
    logger.info(`Publishing to ${platform.toUpperCase()}...`);

    const targetPayload = {
      targetType: platformConfig.targetType,
      platform: platformConfig.targetType,
      ...platformConfig.config,
    };

    if (platform === 'youtube' && title) {
      targetPayload.title = title;
    }

    const response = await axios.post(
      BLOTATO_API_URL,
      {
        post: {
          accountId,
          content: {
            text: caption,
            mediaUrls: [videoUrl],
            platform: platformConfig.targetType,
          },
          target: targetPayload,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'blotato-api-key': config.blotatoApiKey,
        },
      }
    );

    logger.info(`Published to ${platform}: ${response.data?.id || 'OK'}`);
    return { success: true, platform, data: response.data };
  } catch (error) {
    logger.error(`Error publishing to ${platform}:`, error.response?.data || error.message);
    return { success: false, platform, error: error.message };
  }
}

/**
 * Publishes video to all configured platforms
 * @param {string} videoUrl - Video URL
 * @param {object} captions - Platform-specific captions
 * @param {string} title - Video title
 * @returns {Promise<object>}
 */
async function publishToAllPlatforms(videoUrl, captions, title = '') {
  const results = {};

  for (const [platform, platformConfig] of Object.entries(PLATFORMS)) {
    const accountId = platformConfig.id();
    if (!accountId) {
      results[platform] = { success: false, error: 'Not configured' };
      continue;
    }

    const caption = captions[platform] || captions.tiktok;
    results[platform] = await publishToPlatform(platform, videoUrl, caption, title);
  }

  return results;
}

/**
 * Gets list of successful platforms from results
 * @param {object} results - Publish results
 * @returns {string[]}
 */
function getSuccessfulPlatforms(results) {
  return Object.entries(results)
    .filter(([_, result]) => result.success)
    .map(([platform]) => platform);
}

/**
 * Gets list of failed platforms from results
 * @param {object} results - Publish results
 * @returns {object[]}
 */
function getFailedPlatforms(results) {
  return Object.entries(results)
    .filter(([_, result]) => !result.success)
    .map(([platform, result]) => ({ platform, error: result.error }));
}

module.exports = {
  generateCaptions,
  publishToPlatform,
  publishToAllPlatforms,
  getSuccessfulPlatforms,
  getFailedPlatforms,
  PLATFORMS,
};
