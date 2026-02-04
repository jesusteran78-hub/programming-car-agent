/**
 * VIDEO FACTORY - Complete UGC Video Pipeline
 * Mirrors the Google Sheets system with proven viral prompts
 *
 * @module src/services/video-factory
 */
require('dotenv').config();

const axios = require('axios');
const { getOpenAI } = require('../core/openai');
const { getSupabase } = require('../core/supabase');
const { config } = require('../core/config');
const logger = require('../core/logger').child('VideoFactory');

// KIE API
const KIE_CREATE_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_STATUS_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

// Default reference image
const DEFAULT_IMAGE = 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';

/**
 * ============================================================
 * PROVEN VIRAL UGC PROMPT SYSTEM
 * This exact format has generated viral videos
 * ============================================================
 */
const UGC_SYSTEM_PROMPT = `You are an **AI video director and cinematographer** crafting **short, cinematic UGC-style selfie videos** for **OpenAI Sora 2**.

Your task is to generate a **realistic first-person or selfie-style video prompt** using:
- The **Product Name**
- The **Product Description**
- The **Scene**
- The **Ideal Customer (ICP)**
- An optional **Reference Image**

The goal is to produce a **natural, handheld, authentic video** that feels as if filmed directly by the creator on their smartphone. The subject holds the phone in one hand and the product in the other, speaking naturally to the camera. The tone is casual, human, and visually grounded.

---

### Video Requirements

#### Subject & Composition
- The creator is **visible and centered in the frame**, looking directly at the camera while naturally interacting with the product.
- Filmed **selfie-style or first-person**, handheld with slight movement, subtle camera shake, and realistic micro-adjustments.
- The creator **holds or uses the product with their free hand** — no phone or reflection visible.
- Background environment matches the setting (e.g., bathroom, kitchen, gym, garden).
- Only one continuous shot — no cuts or transitions.

#### Visual Style
- Match the **lighting, product appearance, and color tone** to the reference image if provided.
- Use **natural or realistic ambient lighting** (e.g., daylight through a window, soft indoor ambient).
- Emphasize tactile realism — reflections, slight grain, natural shadows, realistic hand and skin detail.
- Maintain a **vertical 9:16** aspect ratio for social-style output.

#### Tone & Delivery
- The creator talks directly to camera for 1–2 short sentences **in Spanish (Latin American)** about the product, expressing a genuine, conversational reaction.
- Speech feels spontaneous — "real-talk" tone, not rehearsed or ad-like.
- **Language: Spanish** — natural, colloquial, Miami Latino accent.
- Include small gestures, smiles, or head movement for authenticity.
- **MANDATORY BRANDING:** The creator MUST say "Programming Car" and "786-478-2531" clearly in the audio.

#### Technical Specs
- **Duration:** 15 seconds
- **Orientation:** Vertical (9:16)
- **Lighting:** Natural or ambient realism
- **Audio:** Light environmental tone — no background music
- **Reference Image:** Used for appearance and color consistency only

---

### Prompt Construction Instructions
When generating a Sora 2 prompt:
- Explicitly state that the **camera is handheld selfie-style** and the creator **records themselves** using a phone at arm's length.
- Focus on **realistic motion and micro-details** — shifting weight, natural breathing, subtle focus change.
- Keep under **300 words**; prioritize **visual realism** over narration.
- Mention **environment context**, **lighting mood**, and **creator-product interaction**.
- Ensure camera never shows the phone, only the creator and product in frame.

Generate a DETAILED selfie-style UGC prompt under 300 words. Make it feel REAL and AUTHENTIC.`;

/**
 * Creates a new video job in the factory
 * @param {object} input - Video input parameters
 * @returns {Promise<object>}
 */
async function createVideoJob(input) {
  const supabase = getSupabase();
  const {
    productName,
    description,
    scene,
    idealCustomer,
    photoLink,
    videoStyle = 'ugc',
  } = input;

  try {
    const { data, error } = await supabase
      .from('video_factory')
      .insert({
        product_name: productName,
        description,
        scene,
        ideal_customer: idealCustomer,
        photo_link: photoLink || DEFAULT_IMAGE,
        video_style: videoStyle,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Video job created: ${data.id}`);
    return { success: true, job: data };
  } catch (e) {
    logger.error(`Failed to create job: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Generates the UGC viral prompt for Sora 2
 * @param {object} job - Video job from database
 * @returns {Promise<string>}
 */
async function generateViralPrompt(job) {
  const openai = getOpenAI();

  const userPrompt = `
### VIDEO BRIEF

**Product Name:** ${job.product_name}
**Description:** ${job.description || 'Servicio de programacion de llaves de auto'}
**Scene:** ${job.scene || 'Miami, Florida - parking lot or driveway'}
**Ideal Customer:** ${job.ideal_customer || 'Car owner who needs key programming or lockout service'}
**Reference Image:** ${job.photo_link ? 'Provided - match appearance' : 'No reference - use default Miami setting'}

### BRAND CONTEXT
- **Business:** Programming Car Miami
- **Service:** High-tech car key programming, emergency lockout, key replacement
- **Location:** Miami, Florida - 24/7 service
- **Phone:** 786-478-2531
- **Vibe:** Tech expert meets street savior, friendly Miami Latino professional

### GENERATE THE PROMPT
Create a VIRAL-WORTHY selfie-style UGC video prompt.
The technician is showing their work, talking casually to camera.
Make it feel like a real person filming themselves after completing a job.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: UGC_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}

/**
 * Generates social media captions for all platforms
 * @param {object} job - Video job
 * @returns {Promise<object>}
 */
async function generateSocialCaptions(job) {
  const openai = getOpenAI();

  const prompt = `Generate viral social media captions for a Programming Car Miami video.

VIDEO CONTEXT:
- Product: ${job.product_name}
- Description: ${job.description}
- Scene: ${job.scene}

BRAND INFO:
- Business: Programming Car Miami
- Service: Car key programming, lockout service
- Phone: 786-478-2531
- Location: Miami, Florida 24/7

Generate captions in SPANISH (Miami Latino style) for each platform:

1. **TikTok** (max 150 chars, viral hooks, relevant hashtags)
2. **Instagram** (engaging caption with emojis, 5-10 hashtags)
3. **YouTube Title** (clickbait but honest, max 60 chars)
4. **YouTube Description** (SEO optimized, include phone number)
5. **Twitter/X** (max 280 chars, punchy)
6. **Facebook** (conversational, community-focused)

Return as JSON:
{
  "tiktok": "...",
  "instagram": "...",
  "youtube_title": "...",
  "youtube_description": "...",
  "twitter": "...",
  "facebook": "..."
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    logger.warn('Failed to parse captions JSON');
    return {
      tiktok: `${job.product_name} | Programming Car Miami 786-478-2531 #miami #carkeys #locksmith`,
      instagram: `${job.description} | Programming Car Miami 786-478-2531`,
      youtube_title: job.product_name,
      youtube_description: `${job.description}\n\nProgramming Car Miami\n786-478-2531`,
      twitter: `${job.product_name} | 786-478-2531 #Miami`,
      facebook: `${job.description} - Programming Car Miami`,
    };
  }
}

/**
 * Submits video to KIE/Sora 2
 * @param {string} prompt - Generated prompt
 * @param {string} imageUrl - Reference image
 * @returns {Promise<string>} Task ID
 */
async function submitToKie(prompt, imageUrl) {
  if (!config.kieApiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  const response = await axios.post(
    KIE_CREATE_URL,
    {
      model: 'sora-2-pro-image-to-video',
      input: {
        prompt,
        image_urls: [imageUrl || DEFAULT_IMAGE],
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
  if (!taskId) throw new Error('No task ID from KIE');

  return taskId;
}

/**
 * Polls KIE for video completion
 * @param {string} taskId - KIE task ID
 * @returns {Promise<string>} Video URL
 */
async function pollKieStatus(taskId) {
  const maxAttempts = 120;
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${KIE_STATUS_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${config.kieApiKey}` },
      });

      const data = response.data?.data || response.data;
      const state = data?.state || 'unknown';

      logger.info(`KIE Poll ${i + 1}/${maxAttempts}: ${state}`);

      if (state === 'success') {
        let videoUrl = null;

        if (data.resultJson) {
          try {
            const result = typeof data.resultJson === 'string'
              ? JSON.parse(data.resultJson)
              : data.resultJson;
            if (result.resultUrls?.length > 0) {
              videoUrl = result.resultUrls[0];
            }
          } catch {
            // Ignore parse error
          }
        }

        if (!videoUrl) {
          videoUrl = data.videoUrl || data.video_url || data.result?.videoUrl;
        }

        if (videoUrl) return videoUrl;
        throw new Error('KIE success but no video URL');
      }

      if (state === 'fail') {
        throw new Error(`KIE failed: ${data.failMsg || 'Unknown'}`);
      }

      await new Promise((r) => setTimeout(r, interval));
    } catch (e) {
      if (e.message.includes('KIE failed') || e.message.includes('no video')) {
        throw e;
      }
      logger.warn(`Poll error: ${e.message}`);
      await new Promise((r) => setTimeout(r, interval));
    }
  }

  throw new Error('KIE timeout (10 minutes)');
}

/**
 * Updates job status in database
 * @param {string} jobId - Job ID
 * @param {object} updates - Fields to update
 */
async function updateJob(jobId, updates) {
  const supabase = getSupabase();
  await supabase
    .from('video_factory')
    .update(updates)
    .eq('id', jobId);
}

/**
 * Processes a video job through the complete pipeline
 * @param {string} jobId - Job ID to process
 * @returns {Promise<object>}
 */
async function processVideoJob(jobId) {
  const supabase = getSupabase();
  const startTime = Date.now();

  // Get job
  const { data: job, error } = await supabase
    .from('video_factory')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return { success: false, error: 'Job not found' };
  }

  try {
    // Step 1: Generate viral prompt
    logger.info(`[${jobId}] Step 1: Generating viral UGC prompt...`);
    await updateJob(jobId, { status: 'generating_prompt' });

    const prompt = await generateViralPrompt(job);
    await updateJob(jobId, { generated_prompt: prompt });

    // Step 2: Submit to KIE
    logger.info(`[${jobId}] Step 2: Submitting to KIE/Sora 2...`);
    await updateJob(jobId, { status: 'generating_video' });

    const taskId = await submitToKie(prompt, job.photo_link);
    await updateJob(jobId, { task_id: taskId });

    // Step 3: Poll for completion
    logger.info(`[${jobId}] Step 3: Waiting for video generation...`);
    const rawVideoUrl = await pollKieStatus(taskId);
    await updateJob(jobId, { raw_video_link: rawVideoUrl });

    // Step 4: Upload to Cloudinary (optional, could add processing)
    logger.info(`[${jobId}] Step 4: Processing video...`);
    await updateJob(jobId, { status: 'processing' });

    // For now, use raw video URL. Could add watermarking/TTS here.
    const finalVideoUrl = rawVideoUrl;

    // Step 5: Generate social captions
    logger.info(`[${jobId}] Step 5: Generating social captions...`);
    const captions = await generateSocialCaptions(job);

    // Step 6: Complete
    const processingTime = Date.now() - startTime;
    await updateJob(jobId, {
      status: 'completed',
      video_link: finalVideoUrl,
      tiktok_caption: captions.tiktok,
      instagram_caption: captions.instagram,
      youtube_title: captions.youtube_title,
      youtube_description: captions.youtube_description,
      twitter_caption: captions.twitter,
      facebook_caption: captions.facebook,
      completed_at: new Date().toISOString(),
      processing_time_ms: processingTime,
    });

    logger.info(`[${jobId}] COMPLETE in ${Math.round(processingTime / 1000)}s`);

    return {
      success: true,
      jobId,
      videoUrl: finalVideoUrl,
      captions,
      processingTime,
    };
  } catch (e) {
    logger.error(`[${jobId}] FAILED: ${e.message}`);
    await updateJob(jobId, {
      status: 'failed',
      failure_message: e.message,
    });
    return { success: false, error: e.message };
  }
}

/**
 * Quick create and process - one function call
 * @param {object} input - Video input
 * @returns {Promise<object>}
 */
async function createAndProcess(input) {
  const createResult = await createVideoJob(input);
  if (!createResult.success) {
    return createResult;
  }

  return processVideoJob(createResult.job.id);
}

/**
 * Gets all jobs with optional filters
 * @param {object} filters - Filter options
 * @returns {Promise<object>}
 */
async function getJobs(filters = {}) {
  const supabase = getSupabase();
  const { status, limit = 50 } = filters;

  let query = supabase
    .from('video_factory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  return { success: true, jobs: data || [] };
}

/**
 * Gets pending jobs ready for processing
 * @returns {Promise<object>}
 */
async function getPendingJobs() {
  return getJobs({ status: 'pending' });
}

/**
 * Process all pending jobs
 * @returns {Promise<object>}
 */
async function processAllPending() {
  const { success, jobs } = await getPendingJobs();
  if (!success || !jobs?.length) {
    return { success: true, processed: 0 };
  }

  const results = [];
  for (const job of jobs) {
    const result = await processVideoJob(job.id);
    results.push({ jobId: job.id, ...result });
  }

  return {
    success: true,
    processed: results.length,
    results,
  };
}

module.exports = {
  // Core functions
  createVideoJob,
  processVideoJob,
  createAndProcess,

  // Query functions
  getJobs,
  getPendingJobs,
  processAllPending,

  // Internal (exported for testing)
  generateViralPrompt,
  generateSocialCaptions,
  submitToKie,
  pollKieStatus,
  updateJob,

  // Constants
  DEFAULT_IMAGE,
};
