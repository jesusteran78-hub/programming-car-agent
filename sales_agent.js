const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();
const logger = require('./logger');

// ==========================================
// ATLAS FEATURE FLAG
// Set USE_ATLAS=true in .env to use new modular system
// ==========================================
const USE_ATLAS = process.env.USE_ATLAS === 'true';

// ATLAS Imports (new modular system)
let atlasAlex, atlasCommandRouter, atlasEventBus, atlasMarcus;
if (USE_ATLAS) {
  logger.info('🚀 ATLAS Mode Enabled');
  atlasAlex = require('./src/agents/alex');
  atlasCommandRouter = require('./src/agents/command-router');
  atlasEventBus = require('./src/core/event-bus');
  atlasMarcus = require('./src/agents/marcus');
}

// Legacy Imports (original system)
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
const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';

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
app.get('/', (req, res) => res.send(`Sales Agent Active ${USE_ATLAS ? '(ATLAS)' : '(Legacy)'}`));

// Health check for ATLAS
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: USE_ATLAS ? 'ATLAS' : 'Legacy',
    timestamp: new Date().toISOString(),
  });
});

// Webhook que recibe mensajes de Whapi
app.post('/webhook', async (req, res) => {
  logger.info('📩 Webhook recibido:', JSON.stringify(req.body, null, 2));

  try {
    const messages = req.body.messages;
    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const incomingMsg = messages[0];
    if (incomingMsg.from_me) {
      return res.sendStatus(200);
    }

    const senderNumber = incomingMsg.chat_id;
    const userText = incomingMsg.text?.body || '';
    const userImage = incomingMsg.image?.link || null;
    const userAudio = incomingMsg.voice?.link || incomingMsg.audio?.link || null;

    if (!userText && !userImage && !userAudio) {
      return res.sendStatus(200);
    }

    logger.info(`💬 Cliente(${senderNumber}): ${userText || (userAudio ? '[AUDIO]' : '[IMAGEN]')}`);

    // ==========================================
    // ATLAS MODE - Use new modular system
    // ==========================================
    if (USE_ATLAS) {
      // Publish event to Event Bus
      await atlasEventBus.publishEvent(atlasEventBus.EVENT_TYPES.MESSAGE_RECEIVED, 'gateway', {
        chatId: senderNumber,
        text: userText,
        image: userImage,
        audio: userAudio,
        isOwner: isOwner(senderNumber),
      });

      // --- OWNER COMMAND ROUTING (ATLAS) ---
      if (isOwner(senderNumber)) {
        // 0. Check if owner sent a photo while Marcus is waiting for one
        if (userImage && atlasMarcus.hasPendingPhotoJob()) {
          logger.info('📸 Owner sent photo, Marcus has pending job');
          const photoResult = await atlasMarcus.handleIncomingPhoto(userImage);
          if (photoResult.handled) {
            logger.info('📬 Photo routed to Marcus for video generation');
            await sendToWhapi(senderNumber, photoResult.message);
            return res.sendStatus(200);
          }
        }

        // Continue only if there's text
        if (!userText) {
          return res.sendStatus(200);
        }

        // 1. Check if it's a price response first
        const priceHandled = await handleOwnerResponse(sendToWhapi, userText);
        if (priceHandled.handled) {
          logger.info('✅ Owner price response processed');
          return res.sendStatus(200);
        }

        // 2. Check if it's an ATLAS command
        const isAtlasCmd = atlasCommandRouter.isOwnerCommand(userText);
        logger.info(`🔍 ATLAS Command Check: "${userText}" => ${isAtlasCmd}`);
        if (isAtlasCmd) {
          const result = await atlasCommandRouter.routeCommand(userText);
          logger.info(`📬 ATLAS Routed to ${result.agent}: "${userText.substring(0, 30)}..."`);
          await sendToWhapi(senderNumber, result.message);
          return res.sendStatus(200);
        }

        // 3. Try legacy dispatcher for non-ATLAS commands (video, etc.)
        logger.info(`🔄 Trying legacy dispatcher for: "${userText}"`);
        const dispatchResult = await processOwnerCommand(userText, userImage);
        if (dispatchResult.handled) {
          logger.info(`📬 Legacy Routed to ${dispatchResult.department}: "${userText?.substring(0, 30) || '[MEDIA]'}..."`);
          await sendToWhapi(senderNumber, dispatchResult.response);
          return res.sendStatus(200);
        }
      }

      // --- CUSTOMER CONVERSATION (ATLAS) ---
      if (userText) {
        saveConversation(senderNumber, 'user', userText).catch((e) => logger.error('DbSaveError', e));
      }

      // Use ATLAS Alex for AI response
      const aiResponse = await atlasAlex.getAIResponse(userText, senderNumber, userImage, sendToWhapi, userAudio);

      if (aiResponse) {
        await sendToWhapi(senderNumber, aiResponse);
        saveConversation(senderNumber, 'assistant', aiResponse).catch((e) => logger.error('DbSaveError', e));

        const logEntry =
          `[${new Date().toLocaleString()}] CLIENTE(${senderNumber}): ${userText}\n` +
          `[${new Date().toLocaleString()}] AGENTE ALEX (ATLAS): ${aiResponse}\n` +
          `--------------------------------------------------\n`;
        fs.appendFileSync('audit.log', logEntry);
      }

      return res.sendStatus(200);
    }

    // ==========================================
    // LEGACY MODE - Original system
    // ==========================================

    // --- OWNER COMMAND ROUTING (Legacy) ---
    if (isOwner(senderNumber)) {
      if (userText) {
        const priceHandled = await handleOwnerResponse(sendToWhapi, userText);
        if (priceHandled.handled) {
          logger.info('✅ Owner price response processed');
          return res.sendStatus(200);
        }
      }

      const dispatchResult = await processOwnerCommand(userText, userImage);
      if (dispatchResult.handled) {
        logger.info(`📬 Routed to ${dispatchResult.department}: "${userText?.substring(0, 30) || '[MEDIA]'}..."`);
        await sendToWhapi(senderNumber, dispatchResult.response);
        return res.sendStatus(200);
      }
    }

    // --- TRAINING MODE ---
    if (userText && userText.toLowerCase().startsWith('aprende:')) {
      logger.info(`🎓 Modo Entrenamiento Detectado: ${userText}`);
      const learnResult = await learnNewPrice(userText);
      await sendToWhapi(senderNumber, learnResult.message);
      return res.sendStatus(200);
    }

    // Save user message
    if (userText) {
      saveConversation(senderNumber, 'user', userText).catch((e) => logger.error('DbSaveError', e));
    }

    // Get AI response (Legacy)
    const aiResponse = await getAIResponse(userText, senderNumber, userImage, sendToWhapi, userAudio);
    logger.info(`🤖 Agente: ${aiResponse}`);

    if (aiResponse) {
      const sentResult = await sendToWhapi(senderNumber, aiResponse);
      logger.info('📤 Resultado envío Whapi:', JSON.stringify(sentResult));

      saveConversation(senderNumber, 'assistant', aiResponse).catch((e) => logger.error('DbSaveError', e));

      const logEntry =
        `[${new Date().toLocaleString()}] CLIENTE(${senderNumber}): ${userText}\n` +
        `[${new Date().toLocaleString()}] AGENTE ALEX: ${aiResponse}\n` +
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

// ==========================================
// WHATSAPP SENDER
// ==========================================
async function sendToWhapi(chatId, text) {
  const url = 'https://gate.whapi.cloud/messages/text';

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${WHAPI_TOKEN}`,
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

// ==========================================
// VIDEO API (Dashboard)
// ==========================================
const jobs = new Map();

app.post('/api/video/start', (req, res) => {
  logger.info('🎬 Solicitud de video recibida del Dashboard:', req.body);
  const { title, idea, image } = req.body;
  const jobId = Date.now().toString();

  jobs.set(jobId, { status: 'processing', steps: ['Iniciando...'], result: null });
  logger.info(`🎬 JOB ${jobId} STARTED: ${title}`);

  (async () => {
    try {
      // Use ATLAS Marcus if enabled, otherwise legacy
      let result;
      if (USE_ATLAS) {
        const marcus = require('./src/agents/marcus');
        result = await marcus.generateViralVideo(title, idea, image);
      } else {
        const { generateViralVideo } = require('./video_engine');
        result = await generateViralVideo(title, idea, image);
      }

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

// ==========================================
// SUPERVISOR API
// ==========================================
app.post('/api/supervisor/train', async (req, res) => {
  const { phone } = req.body;
  logger.info(`👨‍🏫 Supervisor invocado manualmente para: ${phone || 'Último Chat'}`);

  const { exec } = require('child_process');
  const scriptPath = require('path').join(__dirname, 'agents', 'supervisor.js');
  const cmd = `node "${scriptPath}" ${phone || ''}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Supervisor Error: ${error.message}`);
      return res.json({ success: false, error: error.message });
    }
    logger.info(`👨‍🏫 Resultado Supervisor:\n${stdout}`);

    const approved = stdout.includes('Estado: APROBADO');
    const improving = stdout.includes('Estado: MEJORAR');

    res.json({
      success: true,
      status: approved ? 'APROBADO' : improving ? 'MEJORANDO' : 'UNKNOWN',
      logs: stdout,
    });
  });
});

// ==========================================
// ATLAS API ENDPOINTS
// ==========================================
if (USE_ATLAS) {
  // Agent status
  app.get('/api/atlas/status', async (req, res) => {
    try {
      const status = await atlasCommandRouter.getAllAgentStatus();
      res.json({ success: true, mode: 'ATLAS', agents: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Diego operations
  app.get('/api/atlas/ops/today', async (req, res) => {
    try {
      const diego = require('./src/agents/diego');
      const result = await diego.getTodaysJobs();
      res.json({ success: true, jobs: result.jobs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Sofia finance
  app.get('/api/atlas/finance/monthly', async (req, res) => {
    try {
      const sofia = require('./src/agents/sofia');
      const result = await sofia.getMonthlyExpenses();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Viper campaigns
  app.get('/api/atlas/outreach/campaigns', async (req, res) => {
    try {
      const viper = require('./src/agents/viper');
      const result = await viper.getCampaigns();
      res.json({ success: true, campaigns: result.campaigns });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ==========================================
// START SERVER
// ==========================================
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 Agente de Ventas escuchando en puerto ${PORT}`);
    logger.info(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
    logger.info(`📦 Mode: ${USE_ATLAS ? 'ATLAS (Modular)' : 'Legacy'}`);

    if (USE_ATLAS) {
      logger.info('🤖 ATLAS Agents: Alex, Marcus, Diego, Sofia, Viper');
    }
  });
}

module.exports = {
  app,
  getAIResponse,
  generateEmbedding,
};

// ==========================================
// PERSISTENCE LAYER (Supabase)
// ==========================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function saveConversation(chatId, role, content) {
  try {
    let leadId;
    const { data: existingLead, error: findError } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', chatId)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({ phone: chatId, status: 'new' })
        .select('id')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const { data: retryLead } = await supabase.from('leads').select('id').eq('phone', chatId).single();
          if (retryLead) leadId = retryLead.id;
        } else {
          logger.error('Error creating lead:', createError);
          return;
        }
      } else {
        leadId = newLead.id;
      }
    }

    if (!leadId) return;

    const { error: msgError } = await supabase.from('conversations').insert({
      lead_id: leadId,
      role: role,
      content: content,
    });

    if (msgError) logger.error('Error saving message:', msgError);
  } catch (e) {
    logger.error('Persistence Error:', e);
  }
}
