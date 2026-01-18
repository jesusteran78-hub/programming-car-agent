const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();
const logger = require('./logger');

// Importar el CEREBRO CENTRAL (Brain Core)
const { getAIResponse, generateEmbedding } = require('./agents/brain_core');
const { learnNewPrice } = require('./price_manager');
const { handleOwnerResponse, isOwner } = require('./price_request_manager');
const { processOwnerCommand } = require('./agents/dispatcher');

const app = express();
app.use(bodyParser.json());

// ==========================================
// CONFIGURACIÓN
// ==========================================
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

// Agente de Ventas "Alex" - Version 8.2 (Owner Recognition + Strict Pricing)
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';


// (Prompts movidos a agents/brain_core.js)


if (!OPENAI_API_KEY || !WHAPI_TOKEN) {
  logger.error('❌ ERROR: Faltan las claves en el archivo .env');
  logger.error('Asegúrate de tener OPENAI_API_KEY y WHAPI_TOKEN configurados.');
  process.exit(1);
}



// ==========================================
// RUTAS
// ==========================================

// Webhook verification (GET probe for Whapi/Providers)
app.get('/webhook', (req, res) => res.send('Webhook Active'));
app.get('/', (req, res) => res.send('Sales Agent Active'));

// Webhook que recibe mensajes de Whapi
app.post('/webhook', async (req, res) => {
  logger.info('📩 Webhook recibido:', JSON.stringify(req.body, null, 2));

  try {
    const messages = req.body.messages;
    if (!messages || messages.length === 0) { return res.sendStatus(200); }

    const incomingMsg = messages[0];
    if (incomingMsg.from_me) { return res.sendStatus(200); } // Ignorar nuestros propios mensajes

    const senderNumber = incomingMsg.chat_id; // ID del chat (ej: 1786...@s.whatsapp.net)
    const userText = incomingMsg.text?.body || '';
    const userImage = incomingMsg.image?.link || null; // Link a la imagen de Whapi
    const userAudio = incomingMsg.voice?.link || incomingMsg.audio?.link || null; // Link al audio/nota de voz

    if (!userText && !userImage && !userAudio) { return res.sendStatus(200); }

    logger.info(`💬 Cliente(${senderNumber}): ${userText || (userAudio ? '[AUDIO]' : '[IMAGEN]')}`);

    // --- OWNER COMMAND ROUTING (Multi-Agent Dispatcher) ---
    if (isOwner(senderNumber)) {
      // 1. Check if it's a price response first (e.g., "180" or "#abc123 180")
      if (userText) {
        const priceHandled = await handleOwnerResponse(sendToWhapi, userText);
        if (priceHandled.handled) {
          logger.info('✅ Owner price response processed');
          return res.sendStatus(200);
        }
      }

      // 2. Route through department dispatcher (ventas, marketing, operaciones, contabilidad)
      // IMPORTANTE: También procesar imágenes solas (para flujo de video pendiente)
      const dispatchResult = await processOwnerCommand(userText, userImage);
      if (dispatchResult.handled) {
        logger.info(`📬 Routed to ${dispatchResult.department}: "${userText?.substring(0, 30) || '[MEDIA]'}..."`);
        await sendToWhapi(senderNumber, dispatchResult.response);
        return res.sendStatus(200);
      }

      // 3. If not handled by dispatcher, continue to GPT for general chat
    }

    // --- MODO ENTRENAMIENTO (Training Mode) ---
    if (userText && userText.toLowerCase().startsWith('aprende:')) {
      logger.info(`🎓 Modo Entrenamiento Detectado: ${userText}`);
      const learnResult = await learnNewPrice(userText);
      await sendToWhapi(senderNumber, learnResult.message);
      return res.sendStatus(200);
    }

    // 🧠 PENSAR (Consultar a OpenAI)
    // Pasamos tanto texto, imagen y AUDIO a la función, Y el callback para notificar
    // Firma: getAIResponse(userMessage, senderNumber, userImage, notificationCallback, userAudio)
    const aiResponse = await getAIResponse(userText, senderNumber, userImage, sendToWhapi, userAudio);
    logger.info(`🤖 Agente: ${aiResponse} `);

    // 🗣️ RESPONDER (Enviar a Whapi)
    // 🗣️ RESPONDER (Enviar a Whapi)
    if (aiResponse) {
      const sentResult = await sendToWhapi(senderNumber, aiResponse);
      logger.info('📤 Resultado envío Whapi:', JSON.stringify(sentResult));

      // 📝 AUDITAR (Guardar para revisión)
      const logEntry =
        `[${new Date().toLocaleString()}]CLIENTE(${senderNumber}): ${userText} \n` +
        `[${new Date().toLocaleString()}] AGENTE ALEX: ${aiResponse} \n` +
        `--------------------------------------------------\n`;
      fs.appendFileSync('audit.log', logEntry);
    } else {
      logger.info('🤐 Silencio (Spam ignorado o respuesta vacía)');
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error procesando webhook:', error);
    res.sendStatus(500);
  }
});



// Función para enviar mensaje a Whapi
async function sendToWhapi(chatId, text) {
  const url = 'https://gate.whapi.cloud/messages/text';

  // NOTA: Aquí podríamos necesitar channel_id si el token es admin,
  // pero idealmente usaremos un token de canal directo.

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${WHAPI_TOKEN} `,
    },
    body: JSON.stringify({
      to: chatId,
      body: text,
    }),
  };

  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}

// API Endpoint for Dashboard
// --- JOB SYSTEM FOR VIDEO GEN (To avoid timeouts) ---
const jobs = new Map();

app.post('/api/video/start', (req, res) => {
  logger.info('🎬 Solicitud de video recibida del Dashboard:', req.body);
  const { title, idea, image } = req.body;
  const jobId = Date.now().toString(); // Simple ID

  // Initial State
  jobs.set(jobId, { status: 'processing', steps: ['Iniciando...'], result: null });

  logger.info(`🎬 JOB ${jobId} STARTED: ${title} `);

  // Start background process (Fire & Forget)
  (async () => {
    try {
      const { generateViralVideo } = require('./video_engine');

      // Step updates could be implemented in video_engine if passed a callback,
      // but for now we just wait for final result.

      const result = await generateViralVideo(title, idea, image);
      jobs.set(jobId, { status: 'completed', steps: ['Done'], result: result });
      logger.info(`✅ JOB ${jobId} COMPLETED`);
    } catch (error) {
      logger.error(`❌ JOB ${jobId} FAILED: `, error);
      jobs.set(jobId, { status: 'failed', error: error.message });
    }
  })();

  res.json({ success: true, jobId });
});

app.get('/api/video/status/:id', (req, res) => {
  const jobId = req.params.id;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, job });
});
// ----------------------------------------------------

// ----------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 Agente de Ventas escuchando en puerto ${PORT} `);
    logger.info(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
  });
}

module.exports = {
  app,
  getAIResponse,
  generateEmbedding,
};
