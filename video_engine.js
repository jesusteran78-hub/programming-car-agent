// 🎬 MOTOR DE VÍDEO VIRAL (REEMPLAZO DE N8N)
// Workflow: OpenAI (Idea) -> KIE (Sora 2 Video) -> TTS Audio -> FFmpeg -> Blotato (Posting)

const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();
const logger = require('./logger');
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Owner phone for notifications
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

// Configurable URLs (can be overridden in .env)
const KIE_DEFAULT_IMAGE = process.env.KIE_DEFAULT_IMAGE || 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';
const KIE_FALLBACK_VIDEO = process.env.KIE_FALLBACK_VIDEO || 'https://res.cloudinary.com/dtfbdf4dn/video/upload/v1767949970/ugc-watermarked/hiu2w9fv9ksvnhrzcvgp.mp4';

// SYSTEM PROMPT MAESTRO (Afinado con el "Silverado Protocol")
const SORA_SYSTEM_PROMPT = `
### Role
You are an **AI video director** crafting **short, cinematic selfie-style videos** for **OpenAI Sora 2**.
Your task is to generate a prompt for a video that looks like a high-end commercial filmed on a phone.

### The "Programming Car" Aesthetic (Strict Rules)
1.  **Subject**: A **professional Latino technician** (male).
2.  **Attire**: Clean, elegant plain shirt (no logos). looks professional.
3.  **Setting**: A clean, well-lit **automotive workshop** or driveway with a specific car in background.
4.  **Action**: Holding the **automotive part/tool** firmly in one hand, phone in the other (Selfie Mode).
5.  **Camera**: Handheld, subtle shake, micro-focus adjustments (Authentic Feel).
6.  **Audio/Dialogue**: Speaking **ONLY IN SPANISH** with a **Miami Latino accent**. Casual but authoritative.

### Mandatory Branding (Audio)
The prompt MUST specify that the creator says: "Programming Car" and "786-816-4874" clearly.

### AUDIO INSTRUCTIONS (CRITICAL)
- The generated prompt MUST explicitly state: "The audio features the man speaking in clear Spanish."
- Any dialogue lines included in the prompt description MUST be written in Spanish.
- Example: "He looks at the camera and says in Spanish: 'Aquí tenemos la solución'."

### Input Data
Product: {{product}}
Problem: {{context}}

### Output Goal
Write a dense, descriptive prompt (approx 150 words) that includes the visual description AND the specific Spanish audio instructions.
`;

// CONFIGURACIÓN EXACTA DE LA FÁBRICA (Basado en tus screenshots)
// CONFIGURACIÓN EXACTA DE LA FÁBRICA
// Endpoint oficial según documentación del usuario (Sora 2 Image-to-Video)
const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo'; // Confirmed general endpoint
const BLOTATO_API_URL = 'https://backend.blotato.com/v2/posts';

async function generateViralVideo(title, idea, imageUrl, jobId = null) {
  // Generar jobId si no se proporciona (para tracking)
  const internalJobId = jobId || Date.now().toString();
  logger.info(`🏭 FABRICA INICIADA: ${title} (Job #${internalJobId})`);

  // Guardar en Supabase al inicio
  await saveVideoJob(internalJobId, title, idea);

  let usedFallback = false;
  let kieErrorMsg = null;
  let finalImageUrl = imageUrl || KIE_DEFAULT_IMAGE;
  let enhancedPromptFromGemini = null;

  try {
    // PASO 0: MEJORAR IMAGEN CON GEMINI (si hay imagen del usuario)
    if (imageUrl && process.env.GEMINI_API_KEY) {
      logger.info('🎨 0. Analizando imagen con Gemini para mejora UGC...');
      try {
        const { enhanceImageForVideo, uploadToCloudinary } = require('./image_enhancer');

        // Subir imagen a Cloudinary para URL permanente
        finalImageUrl = await uploadToCloudinary(imageUrl);

        // Analizar y obtener prompt mejorado
        const enhancement = await enhanceImageForVideo(finalImageUrl, idea);
        if (enhancement.enhancedPrompt) {
          enhancedPromptFromGemini = enhancement.enhancedPrompt;
          logger.info(`✅ Gemini analizó: ${enhancement.productType || 'producto'}`);
        }
      } catch (geminiError) {
        logger.warn(`⚠️ Gemini falló, usando imagen original: ${geminiError.message}`);
        finalImageUrl = imageUrl;
      }
    }

    // PASO 1: GENERAR PROMPT CINEMATOGRÁFICO (OpenAI)
    logger.info('🧠 1. Diseñando Escena Cinematic (GPT-4o)...');
    let soraPrompt = await generateSoraPrompt(title, idea);

    // Si Gemini dio un prompt mejorado, combinarlo
    if (enhancedPromptFromGemini) {
      soraPrompt = `${soraPrompt}\n\nADDITIONAL VISUAL CONTEXT FROM IMAGE ANALYSIS:\n${enhancedPromptFromGemini}`;
      logger.info('✅ Prompt enriquecido con análisis de Gemini');
    }

    logger.info(`✅ Prompt de Dirección: "${soraPrompt.substring(0, 50)}..."`);

    // PASO 2: VIDEO (KIE / SORA 2)
    logger.info(`🎨 2. Renderizando en KIE API (Sora 2 Async)...`);
    let videoUrl;

    if (process.env.KIE_API_KEY) {
      try {
        // 2.1 CREAR TAREA (ASYNC)
        const createResponse = await axios.post(
          KIE_CREATE_TASK_URL,
          {
            model: 'sora-2-image-to-video',
            input: {
              prompt: soraPrompt,
              image_urls: [finalImageUrl],
              aspect_ratio: 'portrait',
              n_frames: '15',
              size: 'standard',
              remove_watermark: true,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.KIE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const taskId = createResponse.data.data?.taskId;

        if (!taskId) {
          throw new Error('No Video Task ID received from KIE.');
        }
        logger.info(`⏳ Tarea KIE Iniciada. ID: ${taskId}. Esperando renderizado...`);

        // 2.2 POLLING (Esperar a que termine) - Timeout aumentado a 10 min
        videoUrl = await pollKieTask(taskId);
      } catch (kieError) {
        kieErrorMsg = kieError.response?.data?.message || kieError.message;
        logger.error(
          '❌ ERROR EN KIE API:',
          kieError.response?.status,
          kieError.response?.data || kieError.message
        );
        logger.info('⚠️ KIE falló. Usando video de respaldo.');
        videoUrl = KIE_FALLBACK_VIDEO;
        usedFallback = true;
      }
    } else {
      logger.info('⚠️ MODO SIMULACIÓN (Falta API Key de KIE)');
      videoUrl = KIE_FALLBACK_VIDEO;
      usedFallback = true;
    }

    // Notificar si usó fallback
    if (usedFallback && kieErrorMsg) {
      await notifyFallbackUsed(internalJobId, kieErrorMsg);
    }

    // PASO 2.5: AGREGAR AUDIO TTS
    logger.info('🔊 2.5. Generando audio TTS...');
    try {
      const audioScript = await generateAudioScript(title, idea);
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const audioPath = path.join(tempDir, `audio_${internalJobId}.mp3`);

      const audioFile = await generateTTSAudio(audioScript, audioPath);
      if (audioFile) {
        videoUrl = await mergeVideoWithAudio(videoUrl, audioFile);
        logger.info('✅ Audio agregado al video');
      }
    } catch (ttsError) {
      logger.warn(`⚠️ TTS falló, video sin audio: ${ttsError.message}`);
    }

    logger.info('✅ Video URL Final:', videoUrl);

    // PASO 3: PUBLICACIÓN (BLOTATO)
    logger.info('📡 3. Distribuyendo a Redes (Blotato)...');

    // 3.1 Generar Caption Viral
    logger.info('✍️ Redactando Copy para Redes...');
    const viralCaption = await generateViralCaption(title, soraPrompt);

    // Parse the JSON (handling potential markdown fences)
    let captions;
    try {
      const cleanJson = viralCaption
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      captions = JSON.parse(cleanJson);
      logger.info(`✅ Copy Generado (Main: TikTok): "${captions.tiktok.substring(0, 30)}..."`);
    } catch (e) {
      logger.warn('⚠️ Falló el parseo JSON de captions, usando texto crudo como fallback.');
      captions = { tiktok: viralCaption };
    }

    let postResults = {};

    if (process.env.BLOTATO_API_KEY) {
      // Definimos los objetivos de publicación disponibles
      const targets = [
        { id: process.env.BLOTATO_ACCOUNT_ID, platform: 'tiktok', caption: captions.tiktok },
        {
          id: process.env.BLOTATO_INSTAGRAM_ID,
          platform: 'instagram',
          caption: captions.instagram,
        },
        { id: process.env.BLOTATO_YOUTUBE_ID, platform: 'youtube', caption: captions.youtube }, // Usually YouTube logic is slightly diff, but Blotato unifies it.
        { id: process.env.BLOTATO_TWITTER_ID, platform: 'twitter', caption: captions.twitter },
        { id: process.env.BLOTATO_FACEBOOK_ID, platform: 'facebook', caption: captions.facebook },
      ].filter((t) => t.id); // Solo los que tengan ID configurado

      if (targets.length === 0) {
        logger.warn('⚠️ No hay IDs de Blotato configurados para publicar.');
      }

      for (const target of targets) {
        try {
          logger.info(`📡 Publicando en ${target.platform.toUpperCase()}...`);

          let targetPayload = {};

          // BUILD PLATFORM-SPECIFIC TARGET OBJECT
          switch (target.platform) {
            case 'tiktok':
              targetPayload = {
                targetType: 'tiktok',
                platform: 'tiktok',
                privacyLevel: 'PUBLIC_TO_EVERYONE',
                disabledComments: false,
                disabledDuet: false,
                disabledStitch: false,
                isYourBrand: false,
                isAiGenerated: true,
                isBrandedContent: false,
              };
              break;
            case 'youtube':
              targetPayload = {
                targetType: 'youtube',
                platform: 'youtube',
                title: title || 'Programming Car Video',
                privacyStatus: 'public',
                shouldNotifySubscribers: true,
              };
              break;
            case 'instagram':
              targetPayload = { targetType: 'instagram', platform: 'instagram' };
              break;
            case 'twitter':
              targetPayload = { targetType: 'twitter', platform: 'twitter' };
              break;
            case 'facebook':
              // Facebook requires both Account ID (in target.id) and Page ID (in payload)
              targetPayload = {
                targetType: 'facebook',
                platform: 'facebook',
                pageId: process.env.BLOTATO_FACEBOOK_PAGE_ID,
              };
              break;
            default:
              targetPayload = { targetType: target.platform, platform: target.platform };
          }

          const blotatoResponse = await axios.post(
            BLOTATO_API_URL,
            {
              post: {
                accountId: target.id,
                content: {
                  text: target.caption || captions.tiktok, // Fallback to main if specific missing
                  mediaUrls: [videoUrl],
                  platform: target.platform,
                },
                target: targetPayload,
              },
            },
            {
              headers: { Authorization: `Bearer ${process.env.BLOTATO_API_KEY}` },
            }
          );

          logger.info(`✅ Publicado en ${target.platform}:`, blotatoResponse.data?.id || 'OK');
          postResults[target.platform] = { status: 'success', data: blotatoResponse.data };
        } catch (blotatoError) {
          logger.error(
            `❌ ERROR en ${target.platform}:`,
            blotatoError.response?.data || blotatoError.message
          );
          postResults[target.platform] = { status: 'failed', error: blotatoError.message };
        }
      }
    } else {
      logger.info('⚠️ MODO SIMULACIÓN (Falta API Key de Blotato)');
      postResults = { status: 'posted_simulated' };
      await new Promise((r) => setTimeout(r, 1000));
    }

    logger.info('✅ FLUJO FINALIZADO.');

    // Actualizar job en Supabase
    await updateVideoJobComplete(internalJobId, videoUrl, soraPrompt, captions);

    // Notificar al owner por WhatsApp
    await notifyVideoComplete(internalJobId, videoUrl, postResults);

    return {
      status: 'success',
      jobId: internalJobId,
      video: videoUrl,
      prompt: soraPrompt,
      captions: captions,
      deployment: postResults,
    };
  } catch (error) {
    logger.error('❌ ERROR CRÍTICO EN LA FÁBRICA:', error.message);
    // Marcar job como fallido en DB
    await updateVideoJobFailed(internalJobId, error.message);
    throw error;
  }
}

// Función auxiliar para esperar a KIE (Polling)
async function pollKieTask(taskId) {
  const maxAttempts = 120; // 10 minutos (120 * 5s) - aumentado para videos largos
  const interval = 5000; // 5 segundos

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${KIE_GET_TASK_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${process.env.KIE_API_KEY}` },
      });

      const taskData = response.data.data;
      // Estado puede variar según API, asumimos 'status' field: 0=pending, 1=processing, 2=success, 3=failed (O similar)
      // KIE doc usually returns 'status' as string or int.
      // Si status es success/completed
      // Nota: En la doc de user no especificaron los estados, pero es estándar.
      // Investigando KIE responses patterns: status usually 1 (waiting), 2 (running), 3 (success), 4 (failed).
      // O texto: "SUCCEEDED", "FAILED".

      // Asumiremos que el campo 'url' o 'result' existe cuando termina.

      logger.info(`⏳ Polling KIE (${i + 1}/${maxAttempts}): Status ${taskData?.status}`);

      if (
        taskData?.status === 3 ||
        taskData?.status === 'SUCCEEDED' ||
        taskData?.status === 'completed' ||
        (taskData?.result && taskData?.result.video_url)
      ) {
        // Success!
        const finalUrl = taskData.result?.video_url || taskData.url || taskData.result;
        // Adjust based on actual response structure. Typically nested in result.
        // User doc didn't show GET response schema fully, so being defensive.
        if (!finalUrl) {
          // Maybe in a list?
          if (Array.isArray(taskData.result)) {
            return taskData.result[0];
          }
        }
        return finalUrl;
      }

      if (taskData?.status === 4 || taskData?.status === 'FAILED') {
        throw new Error(`KIE Task Failed: ${JSON.stringify(taskData)}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (e) {
      logger.warn(`⚠️ Error polling KIE (intento ${i}):`, e.message);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error('Timeout waiting for KIE video generation');
}

async function generateSoraPrompt(title, idea) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: SORA_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Product/Service: Automotive Key Programming.\nTitle: ${title}\nContext: ${idea}`,
      },
    ],
  });
  return response.choices[0].message.content;
}

async function generateViralCaption(title, script) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Eres un experto Social Media Manager. Tu único trabajo es generar los textos (captions) perfectos para cada plataforma.
            
            Debes devolver la respuesta estrictamente en formato JSON válido.
            
            Estructura esperada:
            {
                "tiktok": "Texto corto, emojis, hashtags virales",
                "instagram": "Texto estético, hashtags separados, llamado al link en bio",
                "facebook": "Texto más informativo, tono profesional de servicio, link directo",
                "youtube": "Título SEO + Descripción larga con keywords",
                "twitter": "Texto muy corto (max 280 caracteres), hashtags clave, urgente"
            }

            Reglas del Negocio:
            - Teléfono: 786-816-4874
            - Ubicación: Miami-Dade & Broward
            - Hashtags base: #AllKeysLost #LostCarKeys #ProgrammingCar #MiamiLocksmith`,
      },
      {
        role: 'user',
        content: `Título del video: ${title}\nContexto Visual: ${script}`,
      },
    ],
  });
  return response.choices[0].message.content;
}

// ==========================================
// PERSISTENCIA EN SUPABASE
// ==========================================

/**
 * Guardar nuevo job en Supabase
 */
async function saveVideoJob(jobId, title, idea) {
  try {
    const { error } = await supabase.from('video_jobs').insert({
      job_id: jobId,
      status: 'processing',
      title,
      idea,
    });
    if (error) throw error;
    logger.info(`💾 Job ${jobId} guardado en DB`);
  } catch (e) {
    logger.error(`❌ Error guardando job: ${e.message}`);
  }
}

/**
 * Actualizar job completado
 */
async function updateVideoJobComplete(jobId, videoUrl, prompt, captions) {
  try {
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'completed',
        video_url: videoUrl,
        prompt,
        captions,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);
    if (error) throw error;
    logger.info(`✅ Job ${jobId} marcado completado en DB`);
  } catch (e) {
    logger.error(`❌ Error actualizando job: ${e.message}`);
  }
}

/**
 * Actualizar job fallido
 */
async function updateVideoJobFailed(jobId, errorMsg) {
  try {
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        error: errorMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);
    if (error) throw error;
    logger.info(`❌ Job ${jobId} marcado fallido en DB`);
  } catch (e) {
    logger.error(`❌ Error actualizando job fallido: ${e.message}`);
  }
}

/**
 * Obtener todos los jobs (para status)
 */
async function getVideoJobs(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    logger.error(`❌ Error obteniendo jobs: ${e.message}`);
    return [];
  }
}

// ==========================================
// NOTIFICACIONES WHATSAPP
// ==========================================

/**
 * Enviar WhatsApp al owner
 */
async function sendOwnerWhatsApp(message) {
  if (!WHAPI_TOKEN) {
    logger.warn('⚠️ WHAPI_TOKEN no configurado, no se puede enviar WhatsApp');
    return;
  }

  try {
    await axios.post(
      'https://gate.whapi.cloud/messages/text',
      {
        to: OWNER_PHONE,
        body: message,
      },
      {
        headers: { Authorization: `Bearer ${WHAPI_TOKEN}` },
      }
    );
    logger.info(`📱 WhatsApp enviado al owner`);
  } catch (e) {
    logger.error(`❌ Error enviando WhatsApp: ${e.message}`);
  }
}

/**
 * Notificar video completado
 */
async function notifyVideoComplete(jobId, videoUrl, platforms) {
  const platformList = Object.keys(platforms)
    .filter((p) => platforms[p]?.status === 'success')
    .join(', ');

  const message =
    `🎬 *Video #${jobId} completado!*\n\n` +
    `📹 ${videoUrl}\n\n` +
    `✅ Publicado en: ${platformList || 'Ninguna (error)'}`;

  await sendOwnerWhatsApp(message);
}

/**
 * Notificar fallback usado
 */
async function notifyFallbackUsed(jobId, errorMsg) {
  const message =
    `⚠️ *Video #${jobId} usó fallback*\n\n` +
    `❌ KIE falló: ${errorMsg}\n\n` +
    `📹 Se usó video genérico de respaldo.`;

  await sendOwnerWhatsApp(message);
}

// ==========================================
// AUDIO TTS (OpenAI)
// ==========================================

/**
 * Generar script de audio para el video
 */
async function generateAudioScript(title, idea) {
  // Script fijo + contexto dinámico
  const contextPart = idea.length > 100 ? idea.substring(0, 100) + '...' : idea;
  return `Programming Car, tu solución en llaves de auto. ${contextPart}. Llámanos al 786-816-4874.`;
}

/**
 * Generar audio con OpenAI TTS
 * @param {string} text - Texto a convertir
 * @param {string} outputPath - Ruta de salida del MP3
 */
async function generateTTSAudio(text, outputPath) {
  try {
    logger.info('🔊 Generando audio TTS (voz: onyx)...');

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx', // Voz masculina profunda
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    logger.info(`✅ Audio TTS guardado: ${outputPath}`);
    return outputPath;
  } catch (e) {
    logger.error(`❌ Error generando TTS: ${e.message}`);
    return null;
  }
}

/**
 * Combinar video y audio con FFmpeg
 * @param {string} videoUrl - URL del video sin audio
 * @param {string} audioPath - Ruta del archivo de audio local
 * @returns {Promise<string>} - URL del video final (subido a Cloudinary)
 */
async function mergeVideoWithAudio(videoUrl, audioPath) {
  try {
    logger.info('🎞️ Combinando video + audio con FFmpeg...');

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `final_${Date.now()}.mp4`);

    // Descargar video
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(videoPath, videoResponse.data);

    // Combinar con FFmpeg
    const ffmpegCmd = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${outputPath}"`;

    await execPromise(ffmpegCmd);
    logger.info('✅ Video + audio combinados');

    // Subir a Cloudinary
    const finalUrl = await uploadToCloudinary(outputPath);

    // Limpiar archivos temporales
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    fs.unlinkSync(outputPath);

    return finalUrl;
  } catch (e) {
    logger.error(`❌ Error combinando video/audio: ${e.message}`);
    return videoUrl; // Devolver video original si falla
  }
}

/**
 * Subir video a Cloudinary
 */
async function uploadToCloudinary(filePath) {
  try {
    const cloudinary = require('cloudinary').v2;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'ugc-auto',
    });

    logger.info(`☁️ Video subido a Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (e) {
    logger.error(`❌ Error subiendo a Cloudinary: ${e.message}`);
    throw e;
  }
}

module.exports = {
  generateViralVideo,
  getVideoJobs,
  saveVideoJob,
  updateVideoJobComplete,
  updateVideoJobFailed,
  sendOwnerWhatsApp,
};
