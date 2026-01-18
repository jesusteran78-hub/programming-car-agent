// 🎬 MOTOR DE VÍDEO VIRAL (REEMPLAZO DE N8N)
// Workflow: OpenAI (Idea) -> KIE (Sora 2 Video) -> TTS Audio -> FFmpeg -> Blotato (Posting)
// VERSION: 2.9 - Alex en audio y captions (wa.me/17864782531)

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

// Log version on load
console.log('🎬 video_engine.js v2.9 loaded - Alex en audio y captions');

// Owner phone for notifications
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

// Configurable URLs (can be overridden in .env)
const KIE_DEFAULT_IMAGE = process.env.KIE_DEFAULT_IMAGE || 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';
// NOTA: Ya no hay video fallback - si KIE falla, el job falla y se notifica al owner

// SYSTEM PROMPT MAESTRO - Formato seguro para Sora 2 (evita filtros de contenido)
const SORA_SYSTEM_PROMPT = `
### Role
You are an **AI video director and cinematographer** crafting **short, cinematic UGC-style selfie videos** for **OpenAI Sora 2**.  
Your task is to generate a **realistic first-person or selfie-style video prompt** using:  
- The **Product Name**  
- The **Product Description**  
- The **Scene**  
- The **Ideal Customer (ICP)**  
- An optional **Reference Image**

The goal is to produce a **natural, handheld, authentic video** that feels as if filmed directly by the creator on their smartphone. The subject holds the phone in one hand and the product in the other, speaking naturally to the camera. The tone is casual, human, and visually grounded.  

---

### Video Requirements

#### 🎬 Subject & Composition
- The creator is **visible and centered in the frame**, looking directly at the camera while naturally interacting with the product.  
- Filmed **selfie-style or first-person**, handheld with slight movement, subtle camera shake, and realistic micro-adjustments.  
- The creator **holds or uses the product with their free hand** — no phone or reflection visible.  
- Background environment matches the setting (e.g., bathroom, kitchen, gym, garden).  
- Only one continuous shot — no cuts or transitions.  

#### 🌅 Visual Style
- Match the **lighting, product appearance, and color tone** to the reference image if provided.  
- Use **natural or realistic ambient lighting** (e.g., daylight through a window, soft indoor ambient).  
- Emphasize tactile realism — reflections, slight grain, natural shadows, realistic hand and skin detail.  
- Maintain a **vertical 9:16** aspect ratio for social-style output.  

#### 🎭 Tone & Delivery
- The creator talks directly to camera for 1–2 short sentences **in Spanish (Latin American)** about the product, expressing a genuine, conversational reaction.  
- Speech feels spontaneous — "real-talk" tone, not rehearsed or ad-like.  
- **Language: Spanish** — natural, colloquial, Miami Latino accent.
- Include small gestures, smiles, or head movement for authenticity.
- **MANDATORY BRANDING:** The creator MUST say "Programming Car" and "786-816-4874" clearly in the audio.

#### ⚙️ Technical Specs
- **Duration:** 15 seconds  
- **Orientation:** Vertical (9:16)  
- **Lighting:** Natural or ambient realism  
- **Audio:** Light environmental tone — no background music  
- **Reference Image:** Used for appearance and color consistency only  

---

### Prompt Construction Instructions
When generating a Sora 2 prompt:
- Explicitly state that the **camera is handheld selfie-style** and the creator **records themselves** using a phone at arm’s length.  
- Focus on **realistic motion and micro-details** — shifting weight, natural breathing, subtle focus change.  
- Keep under **300 words**; prioritize **visual realism** over narration.  
- Mention **environment context**, **lighting mood**, and **creator-product interaction**.  
- Ensure camera never shows the phone, only the creator and product in frame.  

---

### INPUT
Product: {{product}}
Context: {{context}}

### OUTPUT FORMAT
Generate a prompt following this safe template:

"A vertical, handheld selfie-style video filmed by a creator in a [SETTING]. They hold [PRODUCT DESCRIPTION] in one hand and the phone in the other, speaking casually to camera. Natural lighting and soft reflections highlight the product details. The creator smiles, mentioning how they use it. The handheld camera moves subtly with natural shake. Duration ≈ 15 seconds, ambient noise, no overlays or music.
**Audio:** Spanish (Latin American). Creator must mention 'Programming Car' and '786-816-4874' in dialogue."
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
        // NO usar fallback - notificar error y abortar
        await notifyFallbackUsed(internalJobId, kieErrorMsg);
        await updateVideoJobFailed(internalJobId, `KIE Error: ${kieErrorMsg}`);
        throw new Error(`KIE falló: ${kieErrorMsg}. No se generó video.`);
      }
    } else {
      logger.error('❌ FALTA KIE_API_KEY - No se puede generar video');
      await updateVideoJobFailed(internalJobId, 'Falta KIE_API_KEY');
      throw new Error('KIE_API_KEY no configurada. No se puede generar video.');
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
              headers: {
                'Content-Type': 'application/json',
                'blotato-api-key': process.env.BLOTATO_API_KEY,
              },
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
// Documentación: https://docs.kie.ai/market/common/get-task-detail
// States: waiting, queuing, generating, success, fail
// Video URL está en resultJson (string JSON) -> resultUrls (array)
async function pollKieTask(taskId) {
  const maxAttempts = 120; // 10 minutos (120 * 5s) - aumentado para videos largos
  const interval = 5000; // 5 segundos

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${KIE_GET_TASK_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${process.env.KIE_API_KEY}` },
      });

      const taskData = response.data?.data || response.data;

      // Debug: Log full response structure on first poll
      if (i === 0) {
        logger.info(`🔍 KIE Response structure: ${JSON.stringify(response.data).substring(0, 800)}`);
      }

      // KIE uses 'state' field with values: waiting, queuing, generating, success, fail
      const state = taskData?.state || 'unknown';
      logger.info(`⏳ [v2.1] Polling KIE (${i + 1}/${maxAttempts}): State "${state}"`);

      // Check for success
      if (state === 'success') {
        // resultJson is a STRING that needs to be parsed to get resultUrls array
        let videoUrl = null;

        if (taskData.resultJson) {
          try {
            const resultData = typeof taskData.resultJson === 'string'
              ? JSON.parse(taskData.resultJson)
              : taskData.resultJson;

            if (resultData.resultUrls && resultData.resultUrls.length > 0) {
              videoUrl = resultData.resultUrls[0];
            }
          } catch (parseError) {
            logger.warn(`⚠️ Error parsing resultJson: ${parseError.message}`);
          }
        }

        // Fallback checks for other possible field locations
        if (!videoUrl) {
          videoUrl = taskData.videoUrl || taskData.video_url ||
            taskData.result?.videoUrl || taskData.result?.video_url ||
            taskData.output?.video;
        }

        if (videoUrl && typeof videoUrl === 'string') {
          logger.info(`✅ KIE Video URL found: ${videoUrl.substring(0, 80)}...`);
          return videoUrl;
        }

        logger.warn(`⚠️ Success state but no URL found. Full data: ${JSON.stringify(taskData).substring(0, 500)}`);
        throw new Error('KIE returned success but no video URL found');
      }

      // Check for failure
      if (state === 'fail') {
        const errorMsg = taskData.failMsg || taskData.failCode || 'Unknown error';
        throw new Error(`KIE Task Failed: ${errorMsg}`);
      }

      // Still processing (waiting, queuing, generating)
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (e) {
      // Don't retry on known failures
      if (e.message.includes('KIE Task Failed') || e.message.includes('no video URL found')) {
        throw e;
      }
      logger.warn(`⚠️ Error polling KIE (intento ${i + 1}):`, e.message);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error('Timeout waiting for KIE video generation (10 min)');
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
              * "WhatsApp Alex: wa.me/17864782531"
            - El CTA va ANTES de los hashtags

            REGLAS ESTRICTAS DE HASHTAGS:
            - SIEMPRE incluir EXACTAMENTE 5 hashtags en CADA plataforma
            - Los hashtags van AL FINAL del texto (después del CTA)
            - Formato: #Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5
            - Hashtags recomendados: #ProgrammingCar #MiamiLocksmith #CarKeys #AllKeysLost #LostCarKeys #AutoKeys #KeyFob #MiamiAuto

            Reglas del Negocio:
            - Asistente: Alex (responde por WhatsApp 24/7)
            - WhatsApp de Alex: wa.me/17864782531
            - Ubicación: Miami-Dade & Broward
            - Servicio MÓVIL - vamos a donde está el cliente
            - Tono: Profesional pero cercano, estilo Miami`,
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
 * Generar script de audio para el video usando GPT-4o
 * El script es corto (15 seg), natural, y SIEMPRE menciona la marca y teléfono
 */
async function generateAudioScript(title, idea) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un copywriter para videos de TikTok/Reels de Programming Car Miami.

REGLAS ESTRICTAS:
1. El script debe durar MÁXIMO 15 segundos al hablarse
2. SIEMPRE empieza con un saludo local: "¡Hola Miami!" o "¿Qué tal Miami?" o "Miami, ¿qué lo qué?"
3. Después del saludo, menciona "Programming Car"
4. SIEMPRE menciona a "Alex" como el asistente que responde: "Escríbele a Alex" o "Alex te atiende"
5. SIEMPRE termina invitando a escribir a Alex por WhatsApp
6. Tono: Confiado, profesional, Miami latino
7. NO uses emojis ni hashtags (esto es para TTS)
8. Escribe en español Miami (puedes mezclar inglés si suena natural)

ESTRUCTURA:
[Saludo Miami] + [Programming Car + servicio] + [Escríbele a Alex por WhatsApp]

FORMATO:
[Solo el texto del script, nada más]`,
        },
        {
          role: 'user',
          content: `Título: ${title}\nContexto: ${idea}\n\nGenera el script de voz para este video de 15 segundos.`,
        },
      ],
      max_tokens: 150,
    });

    const script = response.choices[0].message.content.trim();
    logger.info(`📝 Script TTS generado: "${script.substring(0, 50)}..."`);
    return script;
  } catch (e) {
    logger.warn(`⚠️ Error generando script con GPT, usando fallback: ${e.message}`);
    // Fallback simple con saludo Miami y Alex
    return `¡Hola Miami! Aquí Programming Car, tu solución en llaves de auto. Escríbele a Alex por WhatsApp y te atiende al momento.`;
  }
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
 * Combinar video y audio con FFmpeg + MARCA DE AGUA
 * @param {string} videoUrl - URL del video sin audio
 * @param {string} audioPath - Ruta del archivo de audio local
 * @returns {Promise<string>} - URL del video final (subido a Cloudinary)
 */
async function mergeVideoWithAudio(videoUrl, audioPath) {
  try {
    logger.info('🎞️ Combinando video + audio + marca de agua con FFmpeg...');

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `final_${Date.now()}.mp4`);
    // Use forward slashes AND escape the colon for FFmpeg filter syntax
    const fontPath = 'C\\:/Windows/Fonts/arial.ttf';

    // Descargar video
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(videoPath, videoResponse.data);

    // Filtro de Marca de Agua: FLOTANTE / MOVIMIENTOS SUAVES (Estilo DVD Screensaver elegante)
    // Se mueve suavemente alrededor del centro para no tapar siempre lo mismo, pero siempre visible.
    // x = centro + oscilación horizontal
    // y = centro + oscilación vertical
    const watermarkText = 'PROGRAMMING CAR | 786-478-2531';

    // Expression explanation:
    // (w-text_w)/2 : Center X
    // (h-text_h)/2 : Center Y
    // sin(t/1.5)*100 : Move 100px Left/Right every ~3 seconds
    // cos(t/1.8)*150 : Move 150px Up/Down (slower period)
    const vfFilter = `drawtext=fontfile='${fontPath}':text='${watermarkText}':fontcolor=white@0.8:fontsize=24:x='(w-text_w)/2+sin(t/1.5)*100':y='(h-text_h)/2+cos(t/1.8)*150':box=1:boxcolor=black@0.5:boxborderw=5`;

    // Combinar video + audio + watermark
    // -vf applies the filter graph
    // USE LOCAL FFMPEG IF AVAILABLE
    const localFfmpeg = path.join(__dirname, 'ffmpeg.exe');
    const ffmpegBin = fs.existsSync(localFfmpeg) ? `"${localFfmpeg}"` : 'ffmpeg';

    const ffmpegCmd = `${ffmpegBin} -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 23 -vf "${vfFilter}" -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${outputPath}"`;

    await execPromise(ffmpegCmd);
    logger.info('✅ Video + audio + marca de agua generados');

    // Subir a Cloudinary
    const finalUrl = await uploadToCloudinary(outputPath);

    // Limpiar archivos temporales
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    fs.unlinkSync(outputPath);

    return finalUrl;
  } catch (e) {
    logger.error(`❌ Error combinando video/audio/watermark: ${e.message}`);
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
  mergeVideoWithAudio,
};
// Force rebuild v2.5-safe-prompt
