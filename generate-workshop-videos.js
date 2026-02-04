/**
 * Workshop Video Generator - TEXT TO VIDEO
 * Generates 10 viral videos for targeting workshops in Miami/Broward
 * Uses Sora 2 TEXT-TO-VIDEO (no image required)
 *
 * Price: $250 for programming services for workshops
 * Focus: American brands (GM, Ford, Stellantis)
 *
 * Run: node generate-workshop-videos.js
 */
require('dotenv').config();

const axios = require('axios');
const { getSupabase } = require('./src/core/supabase');
const logger = require('./src/core/logger').child('WorkshopVideos');

// KIE API Configuration
const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_CREATE_TASK_URL = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_GET_TASK_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo';

/**
 * 10 Video Ideas for Workshops - TEXT-TO-VIDEO PROMPTS
 * Target: Talleres in Miami/Broward
 * Price: $250 per programming job
 * Focus: American brands (GM, Ford, Stellantis)
 */
const WORKSHOP_VIDEOS = [
  {
    id: 1,
    title: 'El TCM que el dealer cobra 800',
    prompt: `POV video: Professional Latino technician's hands holding a GM 6L80 TCM transmission control module, showing it to camera in a clean automotive workshop. The module has visible connectors and "ACDelco" branding. Workshop has AUTEL diagnostic equipment in background. Miami Florida setting, natural lighting, professional atmosphere. The technician rotates the module confidently, demonstrating expertise. 15 seconds, vertical format, cinematic quality.`,
  },
  {
    id: 2,
    title: 'Dueños de taller dejen de perder dinero',
    prompt: `Cinematic video: Latino auto technician sitting frustrated at a workshop desk, looking at a laptop showing diagnostic error codes. The workshop has a car on a lift in the background. Then his phone rings, his face changes to relief as help arrives. Cut to: another technician arriving with a diagnostic case. Miami automotive workshop, natural lighting, storytelling mood. 15 seconds, vertical format.`,
  },
  {
    id: 3,
    title: 'Programacion a domicilio YO VOY A TI',
    prompt: `Cinematic establishing shot: A professional service van arrives at an automotive workshop in Miami. A confident Latino technician steps out carrying an AUTEL diagnostic tablet and tool case. Walking toward the workshop entrance with purpose. Bright Miami sunlight, palm trees visible, professional demeanor. The workshop owner greets him. 15 seconds, vertical format, cinematic quality.`,
  },
  {
    id: 4,
    title: 'El secreto de los talleres que mas facturan',
    prompt: `Close-up satisfying video: Hands counting US dollar bills on a workshop desk. Stack of cash being organized. In the background: invoices, car keys, and diagnostic tools visible. The hands fan out the money professionally. Clean workshop office setting. Business success concept, money counting scene. Miami workshop vibes. 15 seconds, vertical format, hypebeast aesthetic.`,
  },
  {
    id: 5,
    title: 'Ford F-150 BCM en 30 minutos',
    prompt: `Tech-style video: Close-up of a technician connecting a J2534 VCI diagnostic adapter to a Ford F-150's OBD-II port under the dashboard. The tablet screen shows "Vehicle Connected - Ford F-150". Hands working precisely. Dashboard cluster visible. Screen reflections on technician's face. Cyberpunk color grading, tech wizard aesthetic. 15 seconds, vertical format.`,
  },
  {
    id: 6,
    title: 'Jeep Dodge RAM Ya no rechaces estos trabajos',
    prompt: `Dramatic video: A Jeep Grand Cherokee dashboard cluster lighting up, all indicator lights illuminating sequentially. Camera slowly pulls back to reveal a technician with a diagnostic tablet watching the successful programming complete. "Programming Complete" visible on screen. Workshop setting, dramatic lighting, moment of triumph. 15 seconds, vertical format, viral hook style.`,
  },
  {
    id: 7,
    title: 'Antes mandabas al dealer ahora me llamas a mi',
    prompt: `Split-screen concept video: Left side shows empty dealer waiting room with "Wait time: 3 hours" sign. Right side shows mobile technician arriving at customer location with laptop, programming a car on-site. Quick resolution. Happy customer driving away. Before/after comparison, savings concept. Miami setting. 15 seconds, vertical format, story-driven.`,
  },
  {
    id: 8,
    title: 'Tu taller puede ofrecer programacion HOY',
    prompt: `UGC selfie-style video: Latino workshop owner pointing at a service menu board on the wall. "MODULE PROGRAMMING" highlighted as new service. Clean organized shop behind him. Speaking directly to camera with enthusiasm. Gesturing to equipment and price list. Authentic, approachable feel. Miami workshop. 15 seconds, vertical format.`,
  },
  {
    id: 9,
    title: 'Silverado Sierra El trabajo mas comun',
    prompt: `Satisfying ASMR-style video: Extreme close-up of a brand new GM 6L80 TCM module being carefully unboxed. Packaging material being removed. The shiny new module with ACDelco branding revealed. Connectors inspected. Placed next to programming equipment. Clean product photography aesthetic, satisfying unboxing. 15 seconds, vertical format.`,
  },
  {
    id: 10,
    title: 'Alianza con talleres Asi trabajo yo',
    prompt: `Luxury brand aesthetic video: Two professionals in an upscale automotive workshop - a technician and a shop owner - shaking hands firmly. Partnership agreement moment. Modern equipment visible. Both wearing professional attire. Warm lighting, business success vibes. Trust and collaboration concept. Miami setting. 15 seconds, vertical format, premium quality.`,
  },
];

/**
 * Creates a text-to-video task with KIE/Sora 2
 * @param {string} prompt - Video prompt
 * @returns {Promise<string>} - Task ID
 */
async function createTextToVideoTask(prompt) {
  console.log('   Creating KIE text-to-video task...');

  const response = await axios.post(
    KIE_CREATE_TASK_URL,
    {
      model: 'sora-2-pro-text-to-video',
      input: {
        prompt,
        aspect_ratio: 'portrait',
        n_frames: '15',
        size: 'standard',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const taskId = response.data.data?.taskId;
  if (!taskId) {
    throw new Error('No Task ID received from KIE');
  }

  console.log(`   Task ID: ${taskId}`);
  return taskId;
}

/**
 * Polls KIE for task completion
 * @param {string} taskId - KIE task ID
 * @returns {Promise<string>} - Video URL
 */
async function pollKieTask(taskId) {
  const maxAttempts = 120; // 10 minutes
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${KIE_GET_TASK_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      });

      const taskData = response.data?.data || response.data;
      const state = taskData?.state || 'unknown';

      // Show progress every 10 polls
      if (i % 10 === 0) {
        console.log(`   Polling (${i + 1}/${maxAttempts}): ${state}`);
      }

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
            console.log(`   Warning: Error parsing resultJson`);
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
      console.log(`   Retry (${i + 1}): ${e.message}`);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error('Timeout waiting for KIE video generation (10 min)');
}

/**
 * Generates a single video
 * @param {object} video - Video config
 * @param {number} index - Video number
 */
async function generateVideo(video, index) {
  const totalVideos = WORKSHOP_VIDEOS.length;
  const jobId = `workshop-txt2vid-${Date.now()}-${video.id}`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📹 VIDEO ${index + 1}/${totalVideos}: ${video.title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🆔 Job ID: ${jobId}`);
  console.log(`📝 Prompt: ${video.prompt.substring(0, 100)}...`);

  try {
    // Step 1: Create text-to-video task
    console.log(`\n⏳ Step 1: Creating Sora 2 text-to-video task...`);
    const taskId = await createTextToVideoTask(video.prompt);

    // Step 2: Poll for completion
    console.log(`⏳ Step 2: Waiting for video generation...`);
    const videoUrl = await pollKieTask(taskId);

    console.log(`\n✅ VIDEO ${index + 1} COMPLETADO!`);
    console.log(`🔗 URL: ${videoUrl}`);

    // Save to database
    try {
      const supabase = getSupabase();
      await supabase.from('video_jobs').insert({
        job_id: jobId,
        title: video.title,
        idea: video.prompt,
        style: 'text-to-video',
        status: 'completed',
        video_url: videoUrl,
        completed_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.log(`   DB save warning: ${dbError.message}`);
    }

    return { success: true, video: video.title, url: videoUrl };
  } catch (error) {
    console.log(`\n❌ VIDEO ${index + 1} FALLÓ: ${error.message}`);
    return { success: false, video: video.title, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     WORKSHOP VIDEO GENERATOR - TEXT TO VIDEO                  ║
║                                                                ║
║     Target: Talleres in Miami/Broward                          ║
║     Price: 250 dolares por programación                        ║
║     Focus: GM, Ford, Stellantis                                ║
║                                                                ║
║     Model: Sora 2 Pro TEXT-TO-VIDEO (sin imagen)              ║
╚══════════════════════════════════════════════════════════════╝
`);

  console.log(`📊 Total videos a generar: ${WORKSHOP_VIDEOS.length}`);
  console.log(`⏱️  Tiempo estimado: ~${WORKSHOP_VIDEOS.length * 4} minutos\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < WORKSHOP_VIDEOS.length; i++) {
    const video = WORKSHOP_VIDEOS[i];
    const result = await generateVideo(video, i);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // Wait 10 seconds between videos to avoid rate limits
    if (i < WORKSHOP_VIDEOS.length - 1) {
      console.log(`\n⏳ Esperando 10 segundos antes del siguiente video...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN FINAL`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Exitosos: ${successCount}/${WORKSHOP_VIDEOS.length}`);
  console.log(`❌ Fallidos: ${failCount}/${WORKSHOP_VIDEOS.length}`);

  console.log(`\n📹 Videos completados:`);
  results
    .filter((r) => r.success)
    .forEach((r, i) => {
      console.log(`${i + 1}. ${r.video}`);
      console.log(`   📹 ${r.url}\n`);
    });

  if (failCount > 0) {
    console.log(`\n❌ Videos fallidos:`);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`- ${r.video}: ${r.error}`);
      });
  }

  console.log(`\n✅ Proceso completado!`);
  process.exit(0);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
