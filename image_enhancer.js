/**
 * Image Enhancer Module
 * Uses Google Gemini to enhance product images for UGC-style videos
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const logger = require('./logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Download image from URL and convert to base64
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data).toString('base64');

    // Detect mime type from headers or URL
    let mimeType = response.headers['content-type'] || 'image/jpeg';
    if (imageUrl.includes('.png')) mimeType = 'image/png';
    if (imageUrl.includes('.webp')) mimeType = 'image/webp';

    return { base64, mimeType };
  } catch (error) {
    logger.error(`Error downloading image: ${error.message}`);
    throw error;
  }
}

/**
 * Enhance image using Gemini's vision capabilities
 * Generates a professional UGC-style description for image-to-image enhancement
 * @param {string} imageUrl - URL of the original image
 * @param {string} context - Context about the product (e.g., "BMW key fob")
 * @returns {Promise<{enhancedPrompt: string, analysis: string}>}
 */
async function analyzeImageForEnhancement(imageUrl, context = '') {
  try {
    logger.info('🔍 Analizando imagen con Gemini...');

    const { base64, mimeType } = await downloadImageAsBase64(imageUrl);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `Eres un director de fotografía especializado en contenido UGC (User Generated Content) para redes sociales.

Analiza esta imagen de un producto automotriz y genera:

1. **ANÁLISIS**: Describe qué ves en la imagen (producto, estado, calidad de foto)

2. **PROMPT DE MEJORA**: Escribe un prompt detallado para regenerar esta imagen con estilo profesional UGC:
   - Iluminación cinematográfica suave
   - Fondo limpio de taller automotriz profesional
   - El producto debe verse premium y de alta calidad
   - Estilo "behind the scenes" de un técnico profesional
   - Formato vertical (9:16) ideal para TikTok/Reels

3. **ELEMENTOS CLAVE**: Lista los elementos que deben mantenerse del producto original

Contexto adicional: ${context || 'Producto de cerrajería automotriz para Programming Car Miami'}

Responde en formato JSON:
{
  "analysis": "descripción de lo que ves",
  "enhancedPrompt": "prompt detallado para mejorar la imagen",
  "keyElements": ["elemento1", "elemento2"],
  "productType": "tipo de producto detectado"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse JSON from response
    let parsed;
    try {
      // Clean markdown fences if present
      const cleanJson = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      logger.warn('⚠️ No se pudo parsear JSON de Gemini, usando texto raw');
      parsed = {
        analysis: responseText,
        enhancedPrompt: responseText,
        keyElements: [],
        productType: 'automotive key',
      };
    }

    logger.info(`✅ Imagen analizada: ${parsed.productType || 'producto'}`);
    return parsed;
  } catch (error) {
    logger.error(`❌ Error analizando imagen: ${error.message}`);
    throw error;
  }
}

/**
 * Generate enhanced image using Gemini Imagen 3
 * Note: This requires the Imagen API which may need separate setup
 * For now, we'll use the analysis to improve the Sora prompt
 * @param {string} imageUrl - Original image URL
 * @param {string} context - Product context
 * @returns {Promise<{originalUrl: string, enhancedPrompt: string, analysis: object}>}
 */
async function enhanceImageForVideo(imageUrl, context = '') {
  try {
    logger.info('🎨 Procesando imagen para video UGC...');

    // Analyze the image
    const analysis = await analyzeImageForEnhancement(imageUrl, context);

    // For now, we return the analysis which will be used to improve the Sora prompt
    // The original image will still be used, but with a much better prompt
    return {
      originalUrl: imageUrl,
      enhancedPrompt: analysis.enhancedPrompt,
      analysis: analysis,
      productType: analysis.productType,
    };
  } catch (error) {
    logger.error(`❌ Error mejorando imagen: ${error.message}`);
    // Return original on error
    return {
      originalUrl: imageUrl,
      enhancedPrompt: null,
      analysis: null,
      productType: 'automotive product',
    };
  }
}

/**
 * Upload image to Cloudinary for permanent URL
 * @param {string} imageUrl - Temporary image URL (from WhatsApp)
 * @returns {Promise<string>} - Permanent Cloudinary URL
 */
async function uploadToCloudinary(imageUrl) {
  try {
    const cloudinary = require('cloudinary').v2;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'ugc-auto/source-images',
    });

    logger.info(`☁️ Imagen subida a Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    logger.error(`❌ Error subiendo a Cloudinary: ${error.message}`);
    return imageUrl; // Return original if upload fails
  }
}

module.exports = {
  analyzeImageForEnhancement,
  enhanceImageForVideo,
  uploadToCloudinary,
  downloadImageAsBase64,
};
