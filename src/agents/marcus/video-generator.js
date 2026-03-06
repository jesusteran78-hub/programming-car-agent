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
const BLOTATO_API_URL = 'https://backend.blotato.com/v2/posts';

// Default image for video generation
const DEFAULT_IMAGE = 'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';

/**
 * ============================================================
 * 🎬 PROGRAMMING CAR - VIRAL VIDEO FACTORY
 * ============================================================
 * SUPER BOWL HALFTIME LEVEL | NETFLIX ORIGINAL QUALITY
 * Automotive Key Programming & Locksmith - Miami, Florida
 * ============================================================
 */

/**
 * DEFAULT BRANDING (Programming Car)
 */
const DEFAULT_BRANDING = {
  name: "Programming Car Miami",
  phone: "786-478-2531",
  expert: "Jesús Terán",
  location: "Miami, Florida",
  website: "programmingcar.com",
  context: `
### PROGRAMMING CAR - BRAND DNA
**WHO:** Elite automotive key programming specialists in Miami
**WHAT:** High-tech car key programming, emergency lockouts, smart key cloning, transponder programming, proximity key solutions
**WHERE:** Miami, Florida - serving all of South Florida 24/7
**VIBE:** Tech wizard meets street savior. The guy you call at 3AM when you're locked out of your Porsche in South Beach.

### VISUAL SIGNATURES
- **The Tools:** AUTEL diagnostic tablets, XTOOL programmers, Flipper Zero, oscilloscopes, soldering stations
- **The Keys:** Smart keys, proximity fobs, transponder chips, emergency blades
- **The Cars:** Luxury vehicles (BMW, Mercedes, Porsche, Tesla, Lexus), but also everyday heroes (Toyota, Honda, Ford)
- **The Setting:** Miami streets at night, parking garages, upscale neighborhoods, the van/mobile workshop

### THE HERO
A skilled technician with steady hands and confident movements. NOT a locksmith from the 90s - a TECH SPECIALIST who looks like he could hack NASA but chooses to save stranded drivers instead.
`
};

/**
 * Generates BRAND CONTEXT based on configuration
 */
const getBrandContext = (branding) => {
  const b = { ...DEFAULT_BRANDING, ...branding };
  return `
### ${b.name.toUpperCase()} - BRAND DNA
${b.context}
**PHONE:** ${b.phone}
**EXPERT:** ${b.expert}
`;
};

/**
 * STYLE GENERATORS
 */
const STYLES = {
  cinematic: (b) => `
${getBrandContext(b)}

You are a **Hollywood Director of Photography** who just wrapped a James Bond film.

CREATE a **15-second vertical cinematic MASTERPIECE (9:16)** for ${b.name}.

### THE VISION - AUTOMOTIVE TECH THRILLER
This is not a service video. This is a **TECH HEIST MOVIE** where the hero SAVES the day.

### SHOT BREAKDOWN
**0-2s COLD OPEN:** Macro shot INSIDE a car lock mechanism - pins dropping, tumblers rotating, the internal ballet of security being defeated. Metallic textures, shallow depth of field, light catching chrome.

**2-5s THE CALL:** A distressed driver's reflection in a car window. Miami skyline glowing behind. The phone lights up - "${b.name}" on screen. Hope arrives.

**5-10s THE WORK:** Cinematic sequence of high-tech tools meeting luxury vehicle. AUTEL tablet screen reflecting in technician's glasses. Sparks of data flowing. Macro of transponder chip being programmed. The satisfying CLICK of a new key being cut.

**10-13s THE MOMENT:** Slow motion - key sliding into ignition. Dashboard lights awakening like a spaceship coming online. Engine ROARS to life.

**13-15s THE HERO:** Wide shot pullback. Miami night. Job done. The van drives off into neon-lit streets. ${b.name.toUpperCase()}.

### CINEMATOGRAPHY
- **Lighting:** Blade Runner meets Michael Mann's Miami Vice
- **Color:** Teal shadows, orange highlights, neon accents
- **Camera:** Steadicam flows, macro inserts, dramatic crane pullbacks
- **Texture:** Metal, glass, leather, circuits, screens

Generate a DETAILED 250-word prompt. Every frame should be POSTER-WORTHY.
`,

  viral: (b) => `
${getBrandContext(b)}

You are the **VIRAL CONTENT GOD** - every video you touch hits 100M views.

CREATE a **15-second vertical video (9:16)** that will BREAK THE ALGORITHM for ${b.name}.

### THE HOOK FORMULA - AUTOMOTIVE EDITION
**0-2s PATTERN INTERRUPT:**
Options (pick the most shocking for the context):
- Car alarm BLARING, red lights flashing, then SILENCE as the master arrives
- Close-up of a $200,000 car key - "This costs more than some cars"
- POV: Locked out, rain pouring, hope fading... then headlights appear
- Macro: Inside the lock mechanism, like a heist movie
- Text overlay: "3AM. South Beach. Client locked out of their Lambo."

**2-8s BUILD TENSION:**
- Quick cuts of tools, screens, precision movements
- ASMR-worthy sounds implied through visuals (clicks, beeps, mechanical precision)
- Show the PROCESS - the tech magic happening
- Oddly satisfying: key cutting, chip programming, code scrolling

**8-13s THE PAYOFF:**
- The MOMENT of success - engine starts, lights flash, smile appears
- Satisfying resolution that triggers DOPAMINE
- Before/after in same frame if possible

**13-15s LOOP POINT:**
- End on something that makes them watch AGAIN
- Unanswered question or return to opening shot

### PSYCHOLOGICAL TRIGGERS
- Curiosity Gap: "How does he do that?"
- Oddly Satisfying: Precision movements, perfect fits
- Transformation: Locked out → Driving away
- ASMR: Close-up textures, mechanical sounds

Generate a DETAILED 250-word prompt with EXACT shot-by-shot timing.
`,

  luxury: (b) => `
${getBrandContext(b)}

You are the **Creative Director for Bentley and Patek Philippe**.

CREATE a **15-second vertical video (9:16)** that positions ${b.name} as a LUXURY CONCIERGE service.

### THE LUXURY AUTOMOTIVE EXPERIENCE
This isn't a locksmith. This is a **BESPOKE KEY ARTISAN** serving Miami's elite.

### VISUAL LANGUAGE
**PACE:** Slow. Deliberate. Every movement has PURPOSE.
**LIGHTING:** Soft key light, deep shadows, reflections dancing on polished surfaces
**TEXTURE:** Macro shots of:
- Brushed aluminum key fobs
- Leather steering wheels
- Carbon fiber dashboards
- Diamond-cut key blades
- Circuit boards like jewelry

### SHOT PROGRESSION
**0-4s THE VEHICLE:** Porsche 911 GT3 / Mercedes AMG / BMW M8 in pristine condition. Camera glides over curves. Paint so deep you could swim in it.

**4-8s THE CRAFT:** Hands in black gloves handling the key like a Rolex. Tools laid out like surgical instruments. The AUTEL tablet glowing like mission control.

**8-12s THE PRECISION:** Extreme macro of key programming. Data flowing. Chip being seated. The millimeter-perfect alignment of technology.

**12-15s THE DELIVERY:** Key presented on a leather tray. Client's hand receiving it. Engine purrs to life. Nod of satisfaction.

### PRODUCTION VALUE
Every frame is a PHOTOGRAPH. Every movement is INTENTIONAL.
Color palette: Black, gold, deep midnight blue, silver
No rushed cuts. Let the luxury BREATHE.

Generate a DETAILED 250-word prompt. This should feel like a $10 MILLION commercial.
`,

  story: (b) => `
${getBrandContext(b)}

You are a **Sundance Award-Winning Director** making a 15-second short film.

CREATE a **15-second vertical MINI-MOVIE (9:16)** with a complete EMOTIONAL ARC for ${b.name}.

### THE STORY: "STRANDED"
A real human moment. Fear to relief. Darkness to light. Problem to solution.

### THREE-ACT STRUCTURE

**ACT 1 - THE CRISIS (0-4s)**
WIDE SHOT: Miami parking garage at night. A single figure stands by a luxury car. Alone.
CLOSE-UP: Worried face, phone light illuminating desperation. Keys nowhere.
The universal nightmare: LOCKED OUT.
Mood: Isolation, vulnerability, that sinking feeling.

**ACT 2 - THE HERO ARRIVES (4-10s)**
Headlights sweep across the garage. The ${b.name} van arrives like cavalry.
MEDIUM SHOT: Technician steps out, toolkit in hand. Confident stride.
CLOSE-UPS: Tools being deployed. Screen lighting up with diagnostics. Skilled hands moving with PURPOSE.
The tension builds but hope is rising. This person KNOWS what they're doing.
Mood: Competence, progress, relief building.

**ACT 3 - THE TRIUMPH (10-15s)**
The CLICK. That satisfying moment.
CLOSE-UP: Key turns. Dashboard awakens. Engine BREATHES.
WIDE SHOT: Client's face transforms - relief, gratitude, maybe even a laugh.
The technician nods - just another night saving someone's world.
FINAL FRAME: Car drives away. Miami lights. Life continues.
Mood: Victory, gratitude, trust established.

### EMOTIONAL BEATS
- Design shots to hit on imaginary EPIC MUSIC beats
- Use EYE CONTACT at key emotional moments
- CONTRAST: Dark/light, fear/relief, problem/solution

Generate a DETAILED 250-word prompt with EMOTIONAL BEATS clearly marked.
`,

  hypebeast: (b) => `
${getBrandContext(b)}

You are the **Director of Travis Scott and Nike commercials** shooting in MIAMI.

CREATE a **15-second vertical video (9:16)** with RAW MIAMI ENERGY for ${b.name}.

### THE MIAMI VIBE
Late night. Neon reflections on wet streets. Bass in the air. The city that never sleeps calling for help at 3AM.

### VISUAL AESTHETIC
- **COLOR:** Electric pink, cyan, purple - the Miami Vice palette cranked to 11
- **LIGHTING:** Neon signs, LED strips, car headlights, phone flashlights
- **TEXTURE:** Rain on pavement, reflections everywhere, chrome catching light
- **ENERGY:** Fast cuts mixed with slow-mo money shots

### SHOT LIST

**0-3s MIAMI NIGHT:**
Drone diving through Brickell at night. Glass towers reflecting neon.
Cut to: Ocean Drive, art deco hotels glowing.
Cut to: A luxury car with hazards on. Our hero.

**3-8s THE WORK:**
QUICK CUTS synced to imaginary bass drops:
- Tool bag unzipping
- AUTEL screen booting (code reflecting in glasses)
- Hands working, LED flashlight between teeth
- Key blade being cut, sparks flying
- Close-up of transponder chip like it's a diamond

**8-12s THE FLEX:**
SLOW MOTION: Key entering ignition.
The BASS DROP moment: Engine starts, headlights BLAST on.
Neon reflections dancing on fresh paint.

**12-15s THE PULLBACK:**
Wide shot: Job done. Fist bump with the client.
The van pulls away into Miami night.
City lights blur. ${b.name.toUpperCase()}.

### TECHNICAL STYLE
- Whip pans between shots
- Lens flares hitting camera
- RGB split on transitions
- Intentional motion blur

Generate a DETAILED 250-word prompt with MIAMI LOCATIONS and STREET ENERGY.
`,

  pov: (b) => `
${getBrandContext(b)}

You are creating a **FIRST-PERSON EXPERIENCE** - the viewer IS the technician.

CREATE a **15-second vertical video (9:16)** from the ${b.name} TECHNICIAN'S POV.

### THE CONCEPT
Put the viewer IN THE DRIVER'S SEAT. They ARE the hero. They have the skills. They save the day.

### POV RULES
- Camera = technician's EYES
- Hands enter frame naturally from bottom
- Subtle head movements (looking around, focusing)
- Viewer sees EXACTLY what the expert sees

### SHOT PROGRESSION

**0-3s THE APPROACH:**
POV: Walking across parking lot toward distressed client.
Your reflection in the car window as you approach.
The client's relieved face as you arrive.
Your hand reaches out - confident handshake.

**3-6s THE ASSESSMENT:**
POV: Looking at the vehicle. Scanning the lock. Checking the VIN.
Pull out the AUTEL tablet. Screen fills your vision.
Data populating. Vehicle identified. Solution loading.

**6-11s THE WORK:**
POV of PRECISION:
- Your hands selecting the right tool
- Inserting the programmer into the OBD port
- Watching the screen - codes flowing, key programming
- The key cutter spinning, blade emerging perfect
- Your thumb pressing buttons, making it happen

**11-15s THE VICTORY:**
POV: Handing the fresh key to the client.
Their face lights up with gratitude.
You look down at the key - YOUR creation.
Turn to walk away. Miami skyline ahead. Another save.

### IMMERSION TECHNIQUES
- Shallow depth of field (focus follows your attention)
- Natural breathing motion in camera
- Reflections showing "you" subtly

Generate a DETAILED 250-word prompt that makes viewer FEEL like the hero.
`,

  tech: (b) => `
${getBrandContext(b)}

You are the **Director of MR. ROBOT and TRON: LEGACY**.

CREATE a **15-second vertical video (9:16)** that shows ${b.name} as HIGH-TECH WIZARDRY.

### THE CONCEPT: AUTOMOTIVE HACKING
This isn't key cutting. This is DIGITAL WARFARE against locked doors.

### VISUAL AESTHETIC
- **SCREENS:** Code scrolling, data visualizations, hex editors, signal analyzers
- **TOOLS:** AUTEL tablets, oscilloscopes, Flipper Zero, SDR devices, soldering stations
- **LIGHTING:** Screen glow in dark environments, LED accents, matrix-style green tints
- **MOOD:** Cyberpunk meets automotive. The hacker who chose to help people.

### SHOT PROGRESSION

**0-3s THE MATRIX:**
Macro of circuit board inside a car key. Traces like city streets from above.
Data visualization overlays - the KEY's DNA revealed.
Pull back to reveal: technician's glasses reflecting CODE.

**3-8s THE HACK:**
Quick cuts of TECH WIZARDRY:
- AUTEL tablet: Vehicle architecture loading like a blueprint
- Oscilloscope: Signal patterns dancing
- Hands typing: Rapid commands
- Screen: "Key Programming... 47%... 89%... COMPLETE"
- Soldering iron: Micro-surgery on transponder
- Flipper scanning: Capturing signals from thin air

**8-12s THE CREATION:**
The NEW KEY emerges. Fresh cut. Programmed. ALIVE.
Data overlay shows: "AUTHENTICATED" "SYNCED" "READY"
Like a digital weapon being armed.

**12-15s THE PROOF:**
Key enters ignition. The car's computer ACCEPTS it.
Dashboard lights up like a spaceship.
HUD-style overlay: "ACCESS GRANTED"
${b.name.toUpperCase()} logo glitches onto screen.

Generate a DETAILED 250-word prompt with TECH ELEMENTS and CYBERPUNK AESTHETIC.
`,

  emergency: (b) => `
${getBrandContext(b)}

You are directing a **24-HOUR EMERGENCY RESPONSE** documentary.

CREATE a **15-second vertical video (9:16)** showing ${b.name} as MIAMI'S 24/7 HERO.

### THE CONCEPT: 3AM RESCUE
When everyone else is sleeping, ${b.name} is SAVING LIVES.

### DRAMATIC TENSION
- Someone NEEDS help NOW
- Time is CRITICAL
- The hero RESPONDS
- Problem SOLVED

### SHOT PROGRESSION

**0-3s THE CRISIS:**
TITLE CARD: "3:47 AM - SOUTH BEACH"
Distressed person by their car. Empty street. Rain starting.
Phone screen: "Calling ${b.name}..."
Their face: worry, desperation, hope.

**3-7s THE RESPONSE:**
VAN TIRES splash through puddles - URGENT.
Headlights cutting through Miami rain.
INTERCUT: Technician driving, focused, professional.
GPS screen: "Arriving in 2 minutes"

**7-11s THE RESCUE:**
Van arrives. Door slides open. Hero emerges.
FAST but PRECISE movements:
- Tools deploying
- Lock engaging
- Key programming
- Problem SOLVING

**11-15s THE SAVE:**
CLICK. Engine starts. RELIEF floods the client's face.
Wide shot: Rain continuing, but the crisis is OVER.
Technician nods - just another night.
TEXT OVERLAY: "24/7 EMERGENCY - ${b.name.toUpperCase()} - ${b.phone}"

### DOCUMENTARY STYLE
- Handheld urgency
- Available light (street lamps, phone lights, van headlights)
- Real moments, real emotions
- The drama of being someone's HERO at 3AM

Generate a DETAILED 250-word prompt with EMERGENCY ENERGY and DOCUMENTARY REALISM.
`,

  satisfying: (b) => `
${getBrandContext(b)}

You create **ODDLY SATISFYING** content with 500M+ cumulative views.

CREATE a **15-second vertical video (9:16)** that is PURE VISUAL ASMR for car key lovers.

### THE CONCEPT
No story. No drama. Just PURE SATISFACTION. The kind of video people watch 47 times.

### SATISFYING ELEMENTS IN AUTOMOTIVE KEY PROGRAMMING
- Key blade being CUT - metal shavings curling perfectly
- Transponder chip CLICKING into place
- Key FOB shell SNAPPING together
- Programming COMPLETE bar filling to 100%
- Key sliding into ignition SMOOTHLY
- Engine starting on FIRST try
- LED lights SYNCHRONIZING

### SHOT PROGRESSION (All EXTREME CLOSE-UP)

**0-3s THE CUT:**
Macro of key blank entering cutter.
Blade spinning.
Metal curling away in PERFECT spirals.
The edge emerging: SHARP. PRECISE. BEAUTIFUL.

**3-6s THE CHIP:**
Transponder chip hovering over slot.
CLICK - it seats perfectly.
Micro-soldering: tin flowing like liquid silver.
Connections made. SATISFYING.

**6-10s THE PROGRAM:**
Screen: Progress bar filling.
27%... 58%... 83%... 100%
"KEY PROGRAMMED SUCCESSFULLY"
The data flowing like digital water.

**10-13s THE TEST:**
Key sliding into ignition in SLOW MOTION.
The PERFECT fit.
Turning... click... VROOM.
Dashboard lights cascading on.

**13-15s THE REVEAL:**
Pull back: The finished key in palm.
PERFECT. FUNCTIONAL. BEAUTIFUL.
Quick flash of before/after.

### TECHNICAL
- Extreme macro lenses
- 120fps slow motion
- Shallow depth of field
- ASMR-inducing precision

Generate a DETAILED 250-word prompt focused on PURE VISUAL SATISFACTION.
`,

  ugc: (b) => `
You are an **AI video director and cinematographer** crafting **short, cinematic UGC-style selfie videos** for **OpenAI Sora 2**.

Your task is to generate a **realistic first-person or selfie-style video prompt** using:
- The **Product** shown in the reference image
- The **Scene** context provided
- The **Ideal Customer (ICP)** context

The goal is to produce a **natural, handheld, authentic video** that feels as if filmed directly by the creator on their smartphone. The subject holds the phone in one hand and **THE PRODUCT FROM THE REFERENCE IMAGE** in the other, speaking naturally to the camera. The tone is casual, human, and visually grounded.

---

### Video Requirements

#### 🎬 Subject & Composition
- The creator is **visible and centered in the frame**, looking directly at the camera while naturally interacting with the product.
- Filmed **selfie-style or first-person**, handheld with slight movement, subtle camera shake, and realistic micro-adjustments.
- The creator **holds or shows THE PRODUCT FROM THE REFERENCE IMAGE with their free hand** — no phone or reflection visible.
- Background environment matches the setting (workshop, parking lot, van, client location).
- Only one continuous shot — no cuts or transitions.

#### 🖼️ Reference Image (CRITICAL)
- **THE REFERENCE IMAGE DETERMINES THE PRODUCT** — whatever object/product is shown in the reference image MUST appear in the creator's hand.
- Match the **exact appearance, shape, color, and details** of the product from the reference image.
- If the reference shows a TCM module, show a TCM module. If it shows a key, show a key. If it shows a transmission, show a transmission.
- **DO NOT substitute or replace** the product with something else.

#### 🌅 Visual Style
- Match the **lighting, product appearance, and color tone** to the reference image if provided.
- Use **natural or realistic ambient lighting** (e.g., Miami sunlight, workshop lights, parking garage).
- Emphasize tactile realism — reflections, slight grain, natural shadows, realistic hand and skin detail.
- Maintain a **vertical 9:16** aspect ratio for social-style output.

#### 🎭 Tone & Delivery
- The creator talks directly to camera for 1–2 short sentences **in Spanish (Latin American)** about the product, expressing a genuine, conversational reaction.
- Speech feels spontaneous — "real-talk" tone, not rehearsed or ad-like.
- **Language: Spanish** — natural, colloquial, Miami Latino accent.
- Include small gestures, smiles, or head movement for authenticity.
- **MANDATORY BRANDING:** The creator MUST say "${b.name}" and "${b.phone}" clearly.

#### ⚙️ Technical Specs
- **Duration:** 15 seconds
- **Orientation:** Vertical (9:16)
- **Lighting:** Natural or ambient realism
- **Audio:** Light environmental tone — no background music
- **Reference Image:** Used for product appearance - THE PRODUCT IN THE IMAGE IS WHAT THE CREATOR HOLDS

---

### Prompt Construction Instructions
When generating a Sora 2 prompt:
- Explicitly state that the **camera is handheld selfie-style** and the creator **records themselves** using a phone at arm's length.
- **DESCRIBE THE PRODUCT FROM THE REFERENCE IMAGE** in detail and ensure it appears in the creator's hand.
- Focus on **realistic motion and micro-details** — shifting weight, natural breathing, subtle focus change.
- Keep under **300 words**; prioritize **visual realism** over narration.
- Mention **environment context**, **lighting mood**, and **creator-product interaction**.
- Ensure camera never shows the phone, only the creator and product in frame.

---

### Example Output Prompt (for Sora 2)
> "A vertical selfie-style video filmed by a technician in a workshop. They hold **the product from the reference image** in one hand and the phone in the other, speaking casually to camera. Natural workshop lighting and soft reflections highlight the product details matching the reference image exactly. The creator smiles slightly, mentioning ${b.name}. The handheld camera moves subtly with natural shake. Duration ≈ 15 seconds, ambient workshop noise, no overlays or music.
>
> **Audio:** Spanish (Latin American). Creator must mention "${b.name}" and "${b.phone}" in dialogue."

Generate a DETAILED selfie-style UGC prompt under 300 words. THE PRODUCT FROM THE REFERENCE IMAGE is what the creator holds.
`
};

// Aliases
STYLES.product = STYLES.cinematic;
STYLES.selfie = STYLES.ugc;

/**
 * Generates a VIRAL cinematic prompt for Sora 2
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @param {string} style - 'cinematic', 'viral', 'luxury', 'story', 'hypebeast', 'pov', 'ugc', 'selfie'
 * @param {object} branding - Branding override
 * @returns {Promise<string>}
 */
async function generateSoraPrompt(title, idea, style = 'cinematic', branding = {}) {
  const openai = getOpenAI();
  const b = { ...DEFAULT_BRANDING, ...branding };

  // Resolve system prompt function or string
  const styleFn = STYLES[style] || STYLES.cinematic;
  const systemPrompt = typeof styleFn === 'function' ? styleFn(b) : styleFn; // Handle legacy strings if any

  logger.info(`Generating ${style.toUpperCase()} style prompt for: ${title}`);

  // For UGC/selfie, emphasize reference image as the product source
  const isUgcStyle = style === 'ugc' || style === 'selfie';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `
### THE BRIEF
**Business:** ${b.name} - ${b.context ? 'Elite automotive services' : 'Elite automotive electronics & key programming'}
**Service:** ${b.context ? 'Automotive sales and export' : 'Automotive programming, TCM, ECM, keys, transmissions, diagnostics'}
**Location:** ${b.location}
**Brand Vibe:** ${b.name.includes('Toyota') ? 'Professional, reliable, direct' : 'Premium tech meets street credibility'}

### INPUT DATA
Video Title: "${title}"
Video Idea: "${idea}"

### MANDATORY REQUIREMENTS
1. **PHONE NUMBER:** The video (if it contains text or audio) MUST display/say exactly: "${b.phone}". NO OTHER NUMBER.
2. **BRAND:** "${b.name}"

### GENERATE THE PROMPT
Create an EPIC, VIRAL-WORTHY video prompt that will make this 15-second video unforgettable.
${isUgcStyle ? `The product from the reference image MUST be held/shown by the creator throughout the video.` : ''}
IMPORTANT: Keep the prompt CONCISE and EFFICIENT (under 40 words) to optimize generation costs. Focus on the core visual elements only.
`,
      },
    ],
    max_tokens: 500,
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
      const safeTaskId = String(taskId).trim();
      let realKey = '';
      if (process.env.KIE_API_KEY) realKey = process.env.KIE_API_KEY.trim();
      else if (config.kieApiKey) realKey = config.kieApiKey.trim();

      const response = await axios.get(`${KIE_GET_TASK_URL}?taskId=${safeTaskId}`, {
        headers: {
          'Authorization': `Bearer ${realKey}`,
          'Content-Type': 'application/json'
        },
      });
      logger.info(`Polling KIE with Key: ${realKey.substring(0, 5)}...`); // DEBUG

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
      if (e.response) {
        logger.warn(`Response output: ${JSON.stringify(e.response.data)}`); // DEBUG
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error('Timeout waiting for KIE video generation (10 min)');
}

/**
 * Creates video using KIE/Sora 2 API (IMAGE-TO-VIDEO)
 * @param {string} prompt - Video prompt
 * @param {string} imageUrl - Reference image URL
 * @returns {Promise<string>} - Video URL
 */
async function createKieVideo(prompt, imageUrl = DEFAULT_IMAGE) {
  if (!config.kieApiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  // ENSURE PUBLIC URL: If not Cloudinary, download and upload first
  // This fixes issues with private/temp WhatsApp URLs that KIE cannot access
  let publicImageUrl = imageUrl;
  if (imageUrl !== DEFAULT_IMAGE && !imageUrl.includes('cloudinary.com')) {
    logger.info('Image URL is not Cloudinary. Uploading to public storage for KIE access...');
    try {
      const tempDir = path.join(__dirname, '..', '..', '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, `upload_${Date.now()}.jpg`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      fs.writeFileSync(tempPath, response.data);

      publicImageUrl = await uploadToCloudinary(tempPath);
      logger.info(`Image verified public: ${publicImageUrl}`);

      fs.unlinkSync(tempPath);
    } catch (e) {
      logger.error(`Failed to process image: ${e.message}`);
      // CRITICAL FIX: If we can't make the image public, KIE/Sora CANNOT see it.
      // We must fail here rather than sending a broken private URL.
      if (fs.existsSync(path.join(__dirname, '..', '..', '..', 'temp', `upload_${Date.now()}.jpg`))) { // Clean up if exists
        // logic to clean up would be complex with dynamic name, skipping strict cleanup for now or rely on cron
      }
      throw new Error('No se pudo acceder a la imagen. Por favor envíala de nuevo.');
    }
  }

  // Upscale image if Replicate is available
  let finalImageUrl = publicImageUrl;
  try {
    const { upscaleIfAvailable } = require('../../services/image-upscaler');
    logger.info('Attempting to upscale image...');
    finalImageUrl = await upscaleIfAvailable(publicImageUrl);
    if (finalImageUrl !== publicImageUrl) {
      logger.info(`Image upscaled successfully`);
    }
  } catch (e) {
    logger.warn(`Upscaler not available: ${e.message}`);
  }

  logger.info('Creating KIE IMAGE-TO-VIDEO task...');

  const response = await axios.post(
    KIE_CREATE_TASK_URL,
    {
      model: 'sora-2-image-to-video', // User requested SORA 2 (Cheaper)
      input: {
        prompt,
        image_urls: [finalImageUrl],
        aspect_ratio: 'portrait',
        n_frames: '15',
        size: 'standard',
        remove_watermark: true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY ? process.env.KIE_API_KEY.trim() : config.kieApiKey.trim()}`,
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
 * Creates video using KIE/Sora 2 TEXT-TO-VIDEO (NO IMAGE REQUIRED)
 * @param {string} prompt - Video prompt (describes entire scene)
 * @returns {Promise<string>} - Video URL
 */
async function createKieTextToVideo(prompt) {
  if (!config.kieApiKey) {
    throw new Error('KIE_API_KEY not configured');
  }

  logger.info('Creating KIE TEXT-TO-VIDEO task...');

  const response = await axios.post(
    KIE_CREATE_TASK_URL,
    {
      model: prompt.includes('--model') ? prompt.split('--model')[1].trim().split(' ')[0] : 'hailuo-text-to-video', // Fallback to Hailuo
      input: {
        prompt: prompt.replace(/--model[\s\S]*?(?=\s|$)/g, '').trim(),
        aspect_ratio: 'portrait',
        n_frames: '15',
        size: 'standard',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY ? process.env.KIE_API_KEY.trim() : config.kieApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const taskId = response.data.data?.taskId;
  if (!taskId) {
    throw new Error('No Task ID received from KIE');
  }

  logger.info(`KIE Text-to-Video Task created: ${taskId}`);
  return pollKieTask(taskId);
}

/**
 * Generates TTS audio script
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @param {object} branding - Branding override
 * @returns {Promise<string>}
 */
async function generateAudioScript(title, idea, branding = {}) {
  const openai = getOpenAI();
  const b = { ...DEFAULT_BRANDING, ...branding };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un copywriter para videos de TikTok/Reels de ${b.name}.

REGLAS ESTRICTAS:
1. El script debe durar MÁXIMO 15 segundos al hablarse
2. SIEMPRE empieza con un saludo local: "¡Hola Miami!" o "¿Qué tal Venezuela?" (si menciona exportación)
3. Después del saludo, menciona "${b.name}"
4. MENCIONA a "${b.expert}" como el experto que realiza el trabajo
5. SIEMPRE termina invitando a escribir al WhatsApp de ${b.name}
6. Tono: Confiado, profesional, Miami latino
7. NO uses emojis ni hashtags (esto es para TTS)
8. IDIOMA: 100% ESPAÑOL LATINO

FORMATO:
[Solo el texto del script, nada más]`,
        },
        {
          role: 'user',
          content: `Título: ${title}\nContexto: ${idea}\n\nGenera el script de voz para este video de 15 segundos. Menciona que ${b.expert} hace el trabajo.`,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content.trim();
  } catch (e) {
    logger.warn(`Error generating script: ${e.message}`);
    return `¡Hola Miami! Aquí ${b.name}, tu solución experta. Escríbenos por WhatsApp y te atendemos al momento.`;
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
    model: 'tts-1-hd', // Premium voice quality for viral videos
    voice: 'onyx',
    input: text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  logger.info(`TTS audio saved: ${outputPath}`);
  return outputPath;
}

/**
 * Adds watermark ONLY to video, keeping original Sora 2 audio
 * @param {string} videoUrl - Video URL
 * @param {string} title - Video title for watermark
 * @param {object} branding - Branding override
 * @returns {Promise<string>} - Final video URL
 */
async function addWatermarkOnly(videoUrl, title = '', branding = {}) {
  const b = { ...DEFAULT_BRANDING, ...branding };
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
  logger.info('Downloading video for watermark processing...');
  const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(videoPath, videoResponse.data);

  // Watermark filter (animated floating text)
  // Watermark filter (animated floating text - "Rotating")
  // User request: "jesus teran toyota hollywood 7868164874 rotando"
  const watermarkText = `${b.name} ${b.phone.replace(/-/g, '')}`;
  // Wider rotation: 300px radius
  const watermarkFilter = `drawtext=fontfile='${fontPath}':text='${watermarkText}':fontcolor=white@0.9:fontsize=36:x='(w-text_w)/2+sin(t)*300':y='(h-text_h)/2+cos(t)*400':box=1:boxcolor=black@0.6:boxborderw=10`;

  // FFmpeg binary
  const localFfmpeg = path.join(__dirname, '..', '..', '..', 'ffmpeg.exe');
  const ffmpegBin = fs.existsSync(localFfmpeg) ? `"${localFfmpeg}"` : 'ffmpeg';

  logger.info(`Using FFmpeg: ${ffmpegBin}`);

  // Keep original audio (-c:a copy), only add watermark to video
  const ffmpegCmd = `${ffmpegBin} -i "${videoPath}" -c:v libx264 -preset fast -crf 23 -vf "${watermarkFilter}" -c:a copy -y "${outputPath}"`;

  await execPromise(ffmpegCmd);
  logger.info('Video processed with watermark (original audio preserved)');

  // Upload to Cloudinary
  const finalUrl = await uploadToCloudinary(outputPath);

  // Cleanup
  fs.unlinkSync(videoPath);
  fs.unlinkSync(outputPath);

  return finalUrl;
}

/**
 * Merges video with audio using FFmpeg
 * @param {string} videoUrl - Video URL
 * @param {string} audioPath - Audio file path
 * @param {string} title - Video title for watermark
 * @param {object} branding - Branding override
 * @returns {Promise<string>} - Final video URL
 */
async function mergeVideoWithAudio(videoUrl, audioPath, title = '', branding = {}) {
  const b = { ...DEFAULT_BRANDING, ...branding };
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

  // Watermark filter (animated floating text - "Rotating")
  const watermarkText = `${b.name} ${b.phone.replace(/-/g, '')}`;
  const watermarkFilter = `drawtext=fontfile='${fontPath}':text='${watermarkText}':fontcolor=white@0.9:fontsize=36:x='(w-text_w)/2+sin(t)*300':y='(h-text_h)/2+cos(t)*400':box=1:boxcolor=black@0.6:boxborderw=10`;

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
async function uploadToCloudinary(filePath, resourceType = 'video') {
  const cloudinary = require('cloudinary').v2;

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: resourceType,
    folder: 'ugc-auto',
  });

  logger.info(`Uploaded to Cloudinary: ${result.secure_url}`);
  return result.secure_url;
}

/**
 * Generates an image using DALL-E 3 and uploads to Cloudinary
 * @param {string} prompt - Image prompt
 * @returns {Promise<string>} - Cloudinary URL
 */
async function generateDalleImage(prompt) {
  const openai = getOpenAI();
  const tempDir = path.join(__dirname, '..', '..', '..', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const imgPath = path.join(tempDir, `dalle_${Date.now()}.png`);

  logger.info(`Generating DALL-E 3 image: ${prompt.substring(0, 50)}...`);

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1792", // Vertical for video
    quality: "standard",
    response_format: "b64_json"
  });

  const b64 = response.data[0].b64_json;
  fs.writeFileSync(imgPath, Buffer.from(b64, 'base64'));

  const url = await uploadToCloudinary(imgPath, 'image');
  fs.unlinkSync(imgPath);
  return url;
}

/**
 * Main video generation function
 * @param {string} title - Video title
 * @param {string} idea - Video concept
 * @param {string} imageUrl - Reference image
 * @param {string|object} jobId - Job ID for tracking, or object with options
 * @returns {Promise<object>}
 */
async function generateVideo(title, idea, imageUrl = null, jobId = null) {
  const internalJobId = jobId instanceof Object ? jobId.jobId : (jobId || Date.now().toString());
  const supabase = getSupabase();

  logger.info(`Starting video generation: ${title} (Job #${internalJobId})`);

  // Save job to database
  await supabase.from('video_jobs').insert({
    job_id: internalJobId,
    status: 'processing',
    title,
    idea,
    // style: jobId instanceof Object ? jobId.style : 'product', // Column missing in DB
  });

  const style = jobId instanceof Object ? jobId.style : 'product';
  const branding = jobId instanceof Object ? jobId.branding : {};

  try {
    // Step 1: Generate Sora prompt
    logger.info(`Step 1: Generating cinematic prompt (Style: ${style})...`);
    const soraPrompt = await generateSoraPrompt(title, idea, style, branding);

    // Step 2: Create video with KIE
    logger.info('Step 2: Creating video with KIE/Sora 2...');
    let videoUrl = await createKieVideo(soraPrompt, imageUrl || DEFAULT_IMAGE);

    // Step 3: Publish / Process Video
    if (style === 'selfie' || style === 'ugc' || style === 'viral' || (branding && branding.useKieAudio)) {
      // For Selfie/UGC/Viral OR Explicit Override: Add watermark but KEEP original Sora 2 audio (no TTS)
      logger.info('Style preserves audio (UGC/Viral/Override): Adding watermark, keeping original audio...');

      logger.info(`Pre-watermark video URL: ${videoUrl}`); // DEBUG

      // Add watermark only, preserve original audio
      try {
        videoUrl = await addWatermarkOnly(videoUrl, title, branding);
        logger.info(`Post-watermark video URL: ${videoUrl}`); // DEBUG
      } catch (wmError) {
        logger.error(`Watermark processing failed: ${wmError.message || wmError}`);
        throw wmError;
      }

    } else {
      // For Product: Generate TTS + Watermark
      logger.info('Style is Product: Generating TTS audio...');
      const tempDir = path.join(__dirname, '..', '..', '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const audioPath = path.join(tempDir, `audio_${internalJobId}.mp3`);

      let audioScript;
      if (branding.customScript) {
        logger.info('Using custom audio script from branding override.');
        audioScript = branding.customScript;
      } else {
        audioScript = await generateAudioScript(title, idea, branding);
      }

      await generateTTSAudio(audioScript, audioPath);

      // Step 4: Merge video + audio
      logger.info('Step 4: Merging video with audio and watermark...');
      videoUrl = await mergeVideoWithAudio(videoUrl, audioPath, title, branding);
    }

    // Step 5: Publish to Blotato
    logger.info('Step 5: Publishing to Blotato...');
    let captions = {};
    let postResults = {};
    try {
      const publishResult = await publishToBlotato(internalJobId, videoUrl, title, soraPrompt, branding);
      captions = publishResult.captions;
      postResults = publishResult.results;
    } catch (pubError) {
      logger.error(`Publishing failed: ${pubError.message}`);
      // Don't fail the whole job, just log it
    }

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

/**
 * Generates video using TEXT-TO-VIDEO (no image required)
 * For concept videos, ideas, promotional content
 * @param {string} title - Video title
 * @param {string} idea - Video concept/prompt
 * @param {object} options - Options (jobId, style, branding)
 * @returns {Promise<object>}
 */
async function generateTextToVideo(title, idea, options = {}) {
  const { jobId: inputJobId, style = 'cinematic', branding = {} } = options;
  const internalJobId = inputJobId || `txt2vid-${Date.now()}`;
  const supabase = getSupabase();

  logger.info(`Starting TEXT-TO-VIDEO generation: ${title} (Job #${internalJobId})`);

  // Save job to database
  const { error: dbError } = await supabase.from('video_jobs').insert({
    job_id: internalJobId,
    status: 'processing',
    title,
    idea,
    // style: `txt2vid-${style}`, // Column missing in DB
  });

  if (dbError) {
    logger.error(`DB INSERT FAILED: ${dbError.message}`, dbError);
    // process continues but at least we know
  }

  try {
    // Step 1: Generate Sora prompt for text-to-video
    logger.info(`Step 1: Generating text-to-video prompt (Style: ${style})...`);
    const soraPrompt = await generateSoraPrompt(title, idea, style, branding);

    // Step 2: Create video with KIE TEXT-TO-VIDEO
    logger.info('Step 2: Creating video with KIE/Sora 2 TEXT-TO-VIDEO...');
    let videoUrl = await createKieTextToVideo(soraPrompt);

    // Step 3: Add watermark only (no TTS for text-to-video)
    logger.info('Step 3: Adding watermark...');
    videoUrl = await addWatermarkOnly(videoUrl, title, branding);

    // Step 4: Publish to Blotato
    logger.info('Step 4: Publishing to Blotato...');
    let captions = {};
    let postResults = {};
    try {
      const publishResult = await publishToBlotato(internalJobId, videoUrl, title, soraPrompt, branding);
      captions = publishResult.captions;
      postResults = publishResult.results;
    } catch (pubError) {
      logger.error(`Publishing failed: ${pubError.message}`);
    }

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

    logger.info(`TEXT-TO-VIDEO generation complete: ${videoUrl}`);

    return {
      success: true,
      jobId: internalJobId,
      videoUrl,
      prompt: soraPrompt,
      mode: 'text-to-video',
    };
  } catch (error) {
    logger.error(`TEXT-TO-VIDEO generation failed: ${error.message}`);

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
  generateDalleImage,
  generateVideo,
  generateTextToVideo,  // NEW: Text-to-video (no image required)
  generateSoraPrompt,
  createKieVideo,
  createKieTextToVideo, // NEW: Direct KIE text-to-video
  generateAudioScript,
  generateTTSAudio,
  addWatermarkOnly,
  mergeVideoWithAudio,
  uploadToCloudinary,
  publishToBlotato, // Export for manual scripts
  generateViralCaption,
};

// ==========================================
// BLOTATO PUBLISHING
// ==========================================

async function generateViralCaption(title, script, branding = {}) {
  const openai = getOpenAI();
  const b = { ...DEFAULT_BRANDING, ...branding };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Eres un experto Social Media Manager para ${b.name}. Tu único trabajo es generar los textos (captions) perfectos para cada plataforma.
  
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
              - SIEMPRE mencionar a "${b.expert}" o "al asistente"
              - SIEMPRE incluir el link de WhatsApp: wa.me/${b.phone.replace(/-/g, '')}
              - Ejemplos de CTA:
                * "Contáctanos: wa.me/${b.phone.replace(/-/g, '')}"
                * "Tu solución experta: wa.me/${b.phone.replace(/-/g, '')}"
              - El CTA va ANTES de los hashtags
  
              REGLAS ESTRICTAS DE HASHTAGS:
              - SIEMPRE incluir EXACTAMENTE 5 hashtags en CADA plataforma
              - Los hashtags van AL FINAL del texto (después del CTA)
              - Formato: #Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5
              - Hashtags recomendados: #${b.name.replace(/\s+/g, '')} #Miami #AutoServices #{ModeloDelAuto}
  
              Reglas del Negocio:
              - Negocio: ${b.name}
              - WhatsApp: ${b.branding?.phone || b.phone}
              - Ubicación: ${b.location}
              - Vibe: ${b.name.includes('Toyota') ? 'Venta de Autos / Exportación' : 'Programación de Llaves / Cerrajería'}
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

async function publishToBlotato(jobId, videoUrl, title, prompt, branding = {}, platformFilter = null) {
  logger.info(`📡 Publishing Job ${jobId} to Blotato...`);

  // 1. Generate Captions
  const viralCaption = await generateViralCaption(title, prompt, branding);
  let captions;
  try {
    const cleanJson = viralCaption
      .replace(/\`\`\`json/g, '')
      .replace(/\`\`\`/g, '')
      .trim();
    captions = JSON.parse(cleanJson);
  } catch (e) {
    logger.warn('JSON parse failed for captions, using raw text');
    captions = { tiktok: viralCaption };
  }

  const postResults = {};
  const b = { ...DEFAULT_BRANDING, ...branding };
  const socialIds = b.socials || {};

  if (config.blotatoApiKey || process.env.BLOTATO_API_KEY) {
    const apiKey = config.blotatoApiKey || process.env.BLOTATO_API_KEY;

    // Define targets - Prioritize dynamic socialIds, fallback to ENV
    let targets = [
      { id: socialIds.tiktok || process.env.BLOTATO_ACCOUNT_ID, platform: 'tiktok', caption: captions.tiktok },
      { id: socialIds.instagram || process.env.BLOTATO_INSTAGRAM_ID, platform: 'instagram', caption: captions.instagram },
      { id: socialIds.youtube || process.env.BLOTATO_YOUTUBE_ID, platform: 'youtube', caption: captions.youtube },
      { id: socialIds.twitter || process.env.BLOTATO_TWITTER_ID, platform: 'twitter', caption: captions.twitter },
      { id: socialIds.facebook || process.env.BLOTATO_FACEBOOK_ID, platform: 'facebook', caption: captions.facebook },
    ].filter(t => t.id);

    // Apply Platform Filter
    if (platformFilter && Array.isArray(platformFilter)) {
      logger.info(`🔍 Filtering platforms: ${platformFilter.join(', ')}`);
      targets = targets.filter(t => platformFilter.includes(t.platform));
    }

    if (targets.length === 0) {
      logger.warn('No Blotato Target IDs configured.');
      return { captions, results: { error: 'No targets' } };
    }

    for (const target of targets) {
      try {
        logger.info(`🚀 Sending to ${target.platform} (ID: ${target.id})...`);

        let targetPayload = {};
        // Platform specific payloads
        switch (target.platform) {
          case 'tiktok':
            targetPayload = {
              targetType: 'tiktok', platform: 'tiktok',
              privacyLevel: 'PUBLIC_TO_EVERYONE', disabledComments: false,
              disabledDuet: false, disabledStitch: false,
              isYourBrand: false, isAiGenerated: true, isBrandedContent: false
            };
            break;
          case 'youtube':
            targetPayload = {
              targetType: 'youtube', platform: 'youtube',
              title: title || `${b.name} Video`,
              privacyStatus: 'public', shouldNotifySubscribers: true
            };
            break;
          case 'facebook':
            targetPayload = {
              targetType: 'facebook', platform: 'facebook',
              pageId: socialIds.facebookPageId || socialIds.facebook || process.env.BLOTATO_FACEBOOK_PAGE_ID
            };
            break;
          default:
            targetPayload = { targetType: target.platform, platform: target.platform };
        }

        const response = await axios.post(
          BLOTATO_API_URL,
          {
            post: {
              accountId: target.id,
              content: {
                text: target.caption || captions.tiktok,
                mediaUrls: [videoUrl],
                platform: target.platform
              },
              target: targetPayload
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'blotato-api-key': apiKey
            }
          }
        );

        logger.info(`✅ Published to ${target.platform}: ${response.data?.id}`);
        postResults[target.platform] = { status: 'success', data: response.data };

      } catch (error) {
        logger.error(`❌ Failed ${target.platform}: ${error.message}`);
        postResults[target.platform] = { status: 'failed', error: error.message };
      }
    }
  } else {
    logger.warn('⚠️ No Blotato API Key found.');
  }

  return { captions, results: postResults };
}
