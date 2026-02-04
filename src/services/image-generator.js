/**
 * AI Image Generator Service
 * Generates images using DALL-E 3 for video reference images
 *
 * @module src/services/image-generator
 */
const { getOpenAI } = require('../core/openai');
const logger = require('../core/logger').child('ImageGen');

/**
 * Brand context for consistent imagery
 */
const BRAND_CONTEXT = `
Programming Car Miami - Elite automotive key programming specialists
- Tools: AUTEL diagnostic tablets, key programmers, J2534 adapters, oscilloscopes
- Keys: Smart keys, proximity fobs, transponder chips, emergency blades
- Cars: American brands - Chevrolet, GMC, Ford, Lincoln, Jeep, Dodge, RAM, Chrysler
- Setting: Miami workshops, parking lots, mobile service vans
- Vibe: Professional technician, high-tech equipment, problem-solving
`;

/**
 * Style-specific image prompts
 */
const IMAGE_STYLES = {
  // POV style - hands only, first person perspective
  pov: `
First-person POV photograph, technician's hands visible from bottom of frame.
Professional automotive workshop setting.
High-quality realistic photography, sharp focus on hands and tools.
NO faces, NO full body, ONLY hands and arms visible.
Dramatic lighting, slight depth of field blur in background.
`,

  // UGC/Selfie style - selfie perspective with product
  ugc: `
Selfie-style photograph, Latino technician holding product/tool toward camera.
Miami workshop or parking lot background.
Natural lighting, authentic feel, smartphone camera quality.
Professional but casual, confident expression.
Product clearly visible in hand.
`,

  // Cinematic - movie poster quality
  cinematic: `
Cinematic photography, Hollywood movie poster quality.
Dramatic lighting with teal and orange color grading.
Wide angle or medium shot.
Professional automotive setting, Miami vibes.
High contrast, deep shadows, neon accents.
`,

  // Viral - attention-grabbing, social media optimized
  viral: `
Eye-catching social media photograph.
Bold composition, product/tool prominently displayed.
Bright, contrasty lighting.
Clean background or blurred workshop setting.
Professional but engaging, scroll-stopping quality.
`,

  // Luxury - premium brand aesthetic
  luxury: `
Luxury brand photography, Rolex/Mercedes aesthetic.
Soft key lighting, deep shadows.
Product displayed elegantly, like jewelry.
Black, gold, silver color palette.
Every detail perfect, premium feel.
`,

  // Tech - cyberpunk/hacker aesthetic
  tech: `
Cyberpunk technology photograph.
Screens, code reflections, LED accents.
Matrix-style green tints, dark environment.
High-tech equipment prominently featured.
Futuristic automotive hacking vibe.
`,

  // Emergency - dramatic rescue scene
  emergency: `
Documentary-style photograph, dramatic lighting.
Night scene, car headlights, street lamps.
Urgency conveyed through composition.
Rain or wet streets for drama.
Hero arriving to save the day.
`,

  // Satisfying - ASMR/detail shot
  satisfying: `
Extreme macro photography, product detail shot.
Sharp focus on textures and precision.
Shallow depth of field.
Satisfying symmetry or perfect alignment.
Professional product photography quality.
`,

  // Hypebeast - Miami street culture
  hypebeast: `
Miami street style photography.
Neon reflections, wet streets, urban setting.
Electric pink, cyan, purple color palette.
Night scene with city lights.
Street culture energy, Travis Scott music video vibe.
`,

  // Story - narrative scene
  story: `
Narrative photography, telling a story.
Character visible, showing emotion.
Environmental context (parking garage, street, workshop).
Cinematic composition, movie still quality.
Before/during/after a key moment.
`,
};

/**
 * Generates an image based on video idea using DALL-E 3
 * @param {string} idea - Video concept/idea
 * @param {string} style - Visual style (pov, ugc, cinematic, etc.)
 * @returns {Promise<string>} - Image URL
 */
async function generateImage(idea, style = 'pov') {
  const openai = getOpenAI();

  // Get style-specific instructions
  const styleInstructions = IMAGE_STYLES[style] || IMAGE_STYLES.pov;

  // Build the full prompt
  const prompt = `
${BRAND_CONTEXT}

${styleInstructions}

SPECIFIC SCENE:
${idea}

REQUIREMENTS:
- Vertical orientation (portrait mode, 9:16 aspect ratio)
- High resolution, photorealistic quality
- NO text, NO watermarks, NO logos
- Focus on the main subject/product
- Professional automotive programming theme
- Miami, Florida setting when applicable

Generate a single, high-quality photograph that would work as a reference image for a viral video about automotive programming services.
`.trim();

  logger.info(`Generating ${style} image for: ${idea.substring(0, 50)}...`);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792', // Vertical/portrait for social media
      quality: 'hd',
      style: 'vivid',
    });

    const imageUrl = response.data[0].url;
    logger.info(`Image generated successfully: ${imageUrl.substring(0, 60)}...`);

    return imageUrl;
  } catch (error) {
    logger.error(`Image generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generates a product-focused image (for showing TCM, keys, etc.)
 * @param {string} productDescription - Description of the product
 * @returns {Promise<string>} - Image URL
 */
async function generateProductImage(productDescription) {
  const openai = getOpenAI();

  const prompt = `
Professional product photography for automotive electronics.

PRODUCT: ${productDescription}

STYLE:
- Clean white or dark gradient background
- Professional studio lighting
- Product centered and clearly visible
- High detail, sharp focus
- No hands, no people, just the product
- Vertical orientation (portrait mode)
- Premium e-commerce quality

Generate a professional product photograph suitable for social media marketing.
`.trim();

  logger.info(`Generating product image: ${productDescription.substring(0, 50)}...`);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792',
      quality: 'hd',
      style: 'vivid',
    });

    const imageUrl = response.data[0].url;
    logger.info(`Product image generated: ${imageUrl.substring(0, 60)}...`);

    return imageUrl;
  } catch (error) {
    logger.error(`Product image generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generates a workshop scene image
 * @param {string} sceneDescription - Description of the workshop scene
 * @returns {Promise<string>} - Image URL
 */
async function generateWorkshopImage(sceneDescription) {
  const openai = getOpenAI();

  const prompt = `
Professional automotive workshop photography.

SCENE: ${sceneDescription}

SETTING:
- Modern auto repair shop or mobile service van
- Professional diagnostic equipment visible (AUTEL tablets, computers)
- Clean, organized workspace
- Miami, Florida vibes
- Vertical orientation (portrait mode)
- Natural or professional lighting

VIBE:
- High-tech meets practical
- Professional but approachable
- The kind of shop you'd trust with your car

Generate a realistic photograph of this workshop scene.
`.trim();

  logger.info(`Generating workshop image: ${sceneDescription.substring(0, 50)}...`);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792',
      quality: 'hd',
      style: 'vivid',
    });

    const imageUrl = response.data[0].url;
    logger.info(`Workshop image generated: ${imageUrl.substring(0, 60)}...`);

    return imageUrl;
  } catch (error) {
    logger.error(`Workshop image generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generates an image with fallback to default
 * @param {string} idea - Video concept
 * @param {string} style - Visual style
 * @param {string} fallbackUrl - Fallback URL if generation fails
 * @returns {Promise<string>} - Image URL
 */
async function generateImageWithFallback(idea, style = 'pov', fallbackUrl = null) {
  const DEFAULT_FALLBACK =
    'https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767748438/ugc-auto/nbdfysted9kuvfcpgy28.png';

  try {
    return await generateImage(idea, style);
  } catch (error) {
    logger.warn(`Using fallback image due to: ${error.message}`);
    return fallbackUrl || DEFAULT_FALLBACK;
  }
}

module.exports = {
  generateImage,
  generateProductImage,
  generateWorkshopImage,
  generateImageWithFallback,
  IMAGE_STYLES,
};
