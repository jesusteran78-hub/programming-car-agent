/**
 * ATLAS OpenAI Client
 * Singleton pattern - single client instance for the entire application
 *
 * @module src/core/openai
 */
const OpenAI = require('openai');
const { config } = require('./config');

/** @type {OpenAI|null} */
let openaiInstance = null;

/**
 * Gets or creates the OpenAI client instance
 * @returns {OpenAI}
 */
function getOpenAI() {
  if (!openaiInstance) {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key must be configured');
    }

    openaiInstance = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  return openaiInstance;
}

/**
 * Creates a chat completion
 * @param {object} options - Chat completion options
 * @param {Array} options.messages - Messages array
 * @param {string} [options.model='gpt-4o'] - Model to use
 * @param {Array} [options.tools] - Tools/functions to provide
 * @param {number} [options.temperature=0.7] - Temperature
 * @param {number} [options.maxTokens] - Max tokens
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function chat(options) {
  try {
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: options.model || 'gpt-4o',
      messages: options.messages,
      tools: options.tools,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    });

    return { success: true, data: completion };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Creates a chat completion with JSON response format
 * @param {object} options - Chat completion options
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function chatJSON(options) {
  try {
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: options.model || 'gpt-4o-mini',
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Transcribes audio using Whisper
 * @param {Buffer|ReadStream} audioFile - Audio file buffer or stream
 * @param {string} [language='es'] - Language code
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
async function transcribe(audioFile, language = 'es') {
  try {
    const openai = getOpenAI();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language,
    });

    return { success: true, data: transcription.text };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Generates text-to-speech audio
 * @param {string} text - Text to convert
 * @param {string} [voice='onyx'] - Voice to use
 * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
 */
async function textToSpeech(text, voice = 'onyx') {
  try {
    const openai = getOpenAI();

    const response = await openai.audio.speech.create({
      model: 'tts-1-hd', // Premium voice quality
      voice,
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return { success: true, data: buffer };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Generates embeddings for text
 * @param {string} text - Text to embed
 * @param {string} [model='text-embedding-3-small'] - Embedding model
 * @returns {Promise<{success: boolean, data?: number[], error?: string}>}
 */
async function createEmbedding(text, model = 'text-embedding-3-small') {
  try {
    const openai = getOpenAI();

    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    return { success: true, data: response.data[0].embedding };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Analyzes an image using GPT-4 Vision
 * @param {string} imageUrl - URL of the image
 * @param {string} prompt - Analysis prompt
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
async function analyzeImage(imageUrl, prompt) {
  try {
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 500,
    });

    return { success: true, data: completion.choices[0]?.message?.content };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getOpenAI,
  chat,
  chatJSON,
  transcribe,
  textToSpeech,
  createEmbedding,
  analyzeImage,
};
