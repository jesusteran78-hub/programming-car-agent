/**
 * ATLAS Agent: Marcus (Marketing)
 * Video Generator - KIE/Sora 2 Integration
 *
 * @module src/agents/marcus/video-generator
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const { getOpenAI } = require('../../core/openai');
const { getSupabase } = require('../../core/supabase');
const { config } = require('../../core/config');
const logger = require('../../core/logger').child('VideoGen');

// KIE API Endpoints
const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// Default image for video generation
const DEFAULT_IMAGE = 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';

/**
 * System prompt for Sora 2 video generation
 */
const SORA_SYSTEM_PROMPT = `
### Role
You are an **AI video director and cinematographer** crafting **short, cinematic UGC-style selfie videos** for **OpenAI Sora 2**.
Your task is to generate a **realistic first-person or selfie-style video prompt** using:
- The **Product Name**
- The **Product Description**
- The **Scene**
- The **Ideal Customer (ICP)**
- An optional **Reference Image**

The goal is to produce a **natural, handheld, authentic video** that feels as if filmed directly by the creator on their smartphone.

---

### Video Requirements

#### 🎬 Subject & Composition
- **STYLE: POV / HANDS-ONLY / OVER-THE-SHOULDER** (To match voiceover audio perfectly).
- **Scene**: A pair of professional hands holding or working on the product securely.
- **Action**: The technician turns the product to show details, buttons, or connectors.
- **Avoid showing the technician's moving mouth** to prevent lip-sync mismatch.
- Background: Partial view of a modern workshop, diagnostic tools, or a car interior.

#### 🌅 Visual Style
- **Focus**: 80% on the Product, 20% on the context/technician.
- Match the **lighting, product appearance, and color tone**.
- Use **natural or realistic ambient lighting**.
- Maintain a **vertical 9:16** aspect ratio.

#### ⚙️ Technical Specs
- **Duration:** 15 seconds
- **Orientation:** Vertical (9:16)
- **Lighting:** Natural or ambient realism
- **Audio:** AMBIENT NOISE ONLY. NO SPEECH. (Voiceover will be added in post-production).

---

### OUTPUT FORMAT
Generate a prompt following this safe template:

"A vertical POV video in a modern workshop. Professional hands holding [PRODUCT DESCRIPTION], turning it slowly to show details. Soft natural lighting reflects off the surface. Background shows a blurred [CAR BRAND] vehicle or diagnostic tool. The technician (visible only in partial profile or hands) gestures confidently with the product. High-quality textures, realistic shadows. Duration 15s. Ambient sound."
`;

/**
 * Generates a cinematic prompt for Sora 2
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @returns {Promise<string>}
 */
async function generateSoraPrompt(title, idea) {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SORA_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Product/Service: Automotive Key Programming.\nTitle: ${title}\nContext: ${idea}`,
      },
    ],
  });

  return response.choices[0].message.content;
}

/**
 * Polls KIE API for task completion
 * @param {string} taskId - KIE task ID
 * @returns {Promise<string>} - Video URL
 */
async function pollKieTask(taskId) {
  const maxAttempts = 120; // 10 minutes
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${KIE_GET_TASK_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${config.kieApiKey}` },
      });

      const taskData = response.data?.data || response.data;
      const state = taskData?.state || 'unknown';

      logger.info(`Polling KIE (${i + 1}/${maxAttempts}): State "${state}"`);

      if (state === 'success') {
        let videoUrl = null;

        if (taskData.resultJson) {
          try {
            const resultData =
              typeof taskData.resultJson === 'string'
                ? JSON.parse(taskData.resultJson)
                : taskData.resultJson;

            if (resultData.resultUrls && resultData.resultUrls.length > 0) {
              videoUrl = resultData.resultUrls[0];
            }
          } catch (parseError) {
            logger.warn(`Error parsing resultJson: ${parseError.message}`);
          }
        }

        if (!videoUrl) {
          videoUrl =
            taskData.videoUrl ||
            taskData.video_url ||
            taskData.result?.videoUrl ||
            taskData.output?.video;
        }

        if (videoUrl) {
          logger.info(`KIE Video URL: ${videoUrl.substring(0, 80)}...`);
          return videoUrl;
        }

        throw new Error('KIE returned success but no video URL found');
      }

      if (state === 'fail') {
        throw new Error(`KIE Task Failed: ${taskData.failMsg || 'Unknown'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (e) {
      if (e.message.includes('KIE Task Failed') || e.message.includes('no video URL')) {
        throw e;
      }
      logger.warn(`Error polling KIE (attempt ${i + 1}): ${e.message}`);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error('Timeout waiting for KIE video generation (10 min)');
}

/**
 * Creates video using KIE/Sora 2 API
 * @param {string} prompt - Video prompt
 * @param {string} imageUrl - Reference image URL
 * @returns {Promise<string>} - Video URL
 */
async function createKieVideo(prompt, imageUrl = DEFAULT_IMAGE) {
  if (!config.kieApiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  logger.info('Creating KIE task...');

  const response = await axios.post(
    KIE_CREATE_TASK_URL,
    {
      model: 'sora-2-image-to-video',
      input: {
        prompt,
        image_urls: [imageUrl],
        aspect_ratio: 'portrait',
        n_frames: '15',
        size: 'standard',
        remove_watermark: true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${config.kieApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const taskId = response.data.data?.taskId;
  if (!taskId) {
    throw new Error('No Task ID received from KIE');
  }

  logger.info(`KIE Task created: ${taskId}`);
  return pollKieTask(taskId);
}

/**
 * Generates TTS audio script
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @returns {Promise<string>}
 */
async function generateAudioScript(title, idea) {
  const openai = getOpenAI();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un copywriter para videos de TikTok/Reels de Programming Car Miami.

REGLAS ESTRICTAS:
1. El script debe durar MÁXIMO 15 segundos al hablarse
2. SIEMPRE empieza con un saludo local: "¡Hola Miami!" o "¿Qué tal Miami?"
3. Después del saludo, menciona "Programming Car"
4. SIEMPRE menciona a "Alex" como el asistente que responde
5. SIEMPRE termina invitando a escribir a Alex por WhatsApp
6. Tono: Confiado, profesional, Miami latino
7. NO uses emojis ni hashtags (esto es para TTS)
8. IDIOMA: 100% ESPAÑOL LATINO

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

    return response.choices[0].message.content.trim();
  } catch (e) {
    logger.warn(`Error generating script: ${e.message}`);
    return `¡Hola Miami! Aquí Programming Car, tu solución en llaves de auto. Escríbele a Alex por WhatsApp y te atiende al momento.`;
  }
}

/**
 * Generates TTS audio file
 * @param {string} text - Text to convert
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>}
 */
async function generateTTSAudio(text, outputPath) {
  const openai = getOpenAI();

  logger.info('Generating TTS audio...');

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'onyx',
    input: text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  logger.info(`TTS audio saved: ${outputPath}`);
  return outputPath;
}

/**
 * Merges video with audio using FFmpeg
 * @param {string} videoUrl - Video URL
 * @param {string} audioPath - Audio file path
 * @param {string} title - Video title for watermark
 * @returns {Promise<string>} - Final video URL
 */
async function mergeVideoWithAudio(videoUrl, audioPath, title = '') {
  const tempDir = path.join(__dirname, '..', '..', '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
  const outputPath = path.join(tempDir, `final_${Date.now()}.mp4`);

  // Font path for watermark
  const fontPathRaw = path.join(__dirname, '..', '..', '..', 'assets', 'arial.ttf');
  const fontPath = fontPathRaw.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Download video
  logger.info('Downloading video for processing...');
  const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(videoPath, videoResponse.data);

  // Watermark filter
  const watermarkText = 'PROGRAMMING CAR | 786-478-2531';
  const watermarkFilter = `drawtext=fontfile='${fontPath}':text='${watermarkText}':fontcolor=white@0.8:fontsize=24:x='(w-text_w)/2+sin(t/1.5)*100':y='(h-text_h)/2+cos(t/1.8)*150':box=1:boxcolor=black@0.5:boxborderw=5`;

  // Title filter
  const cleanTitle = (title || '').replace(/:/g, '\\:').replace(/'/g, '');
  const titleFilter = `drawtext=fontfile='${fontPath}':text='${cleanTitle}':fontcolor=yellow:fontsize=48:x=(w-text_w)/2:y=100:box=1:boxcolor=black@0.6:boxborderw=10:shadowx=2:shadowy=2`;

  const vfFilter = `${watermarkFilter},${titleFilter}`;

  // FFmpeg binary
  const localFfmpeg = path.join(__dirname, '..', '..', '..', 'ffmpeg.exe');
  const ffmpegBin = fs.existsSync(localFfmpeg) ? `"${localFfmpeg}"` : 'ffmpeg';

  logger.info(`Using FFmpeg: ${ffmpegBin}`);

  const ffmpegCmd = `${ffmpegBin} -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 23 -vf "${vfFilter}" -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${outputPath}"`;

  await execPromise(ffmpegCmd);
  logger.info('Video processed with watermark + audio');

  // Upload to Cloudinary
  const finalUrl = await uploadToCloudinary(outputPath);

  // Cleanup
  fs.unlinkSync(videoPath);
  fs.unlinkSync(audioPath);
  fs.unlinkSync(outputPath);

  return finalUrl;
}

/**
 * Uploads video to Cloudinary
 * @param {string} filePath - Local file path
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadToCloudinary(filePath) {
  const cloudinary = require('cloudinary').v2;

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: 'ugc-auto',
  });

  logger.info(`Uploaded to Cloudinary: ${result.secure_url}`);
  return result.secure_url;
}

/**
 * Main video generation function
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @param {string} imageUrl - Reference image
 * @param {string} jobId - Job ID for tracking
 * @returns {Promise<object>}
 */
async function generateVideo(title, idea, imageUrl = null, jobId = null) {
  const internalJobId = jobId || Date.now().toString();
  const supabase = getSupabase();

  logger.info(`Starting video generation: ${title} (Job #${internalJobId})`);

  // Save job to database
  await supabase.from('video_jobs').insert({
    job_id: internalJobId,
    status: 'processing',
    title,
    idea,
  });

  try {
    // Step 1: Generate Sora prompt
    logger.info('Step 1: Generating cinematic prompt...');
    const soraPrompt = await generateSoraPrompt(title, idea);

    // Step 2: Create video with KIE
    logger.info('Step 2: Creating video with KIE/Sora 2...');
    let videoUrl = await createKieVideo(soraPrompt, imageUrl || DEFAULT_IMAGE);

    // Step 3: Generate audio
    logger.info('Step 3: Generating TTS audio...');
    const tempDir = path.join(__dirname, '..', '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const audioPath = path.join(tempDir, `audio_${internalJobId}.mp3`);

    const audioScript = await generateAudioScript(title, idea);
    await generateTTSAudio(audioScript, audioPath);

    // Step 4: Merge video + audio
    logger.info('Step 4: Merging video with audio and watermark...');
    videoUrl = await mergeVideoWithAudio(videoUrl, audioPath, title);

    // Update job as complete
    await supabase
      .from('video_jobs')
      .update({
        status: 'completed',
        video_url: videoUrl,
        prompt: soraPrompt,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', internalJobId);

    logger.info(`Video generation complete: ${videoUrl}`);

    return {
      success: true,
      jobId: internalJobId,
      videoUrl,
      prompt: soraPrompt,
    };
  } catch (error) {
    logger.error(`Video generation failed: ${error.message}`);

    await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', internalJobId);

    throw error;
  }
}

module.exports = {
  generateVideo,
  generateSoraPrompt,
  createKieVideo,
  generateAudioScript,
  generateTTSAudio,
  mergeVideoWithAudio,
  uploadToCloudinary,
};
