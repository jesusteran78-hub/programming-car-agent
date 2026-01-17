const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

// ==========================================
// CONFIGURACIÓN
// ==========================================
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

// Agente de Ventas "Alex" - Version 8.1 (Spam Protection & Strict Pricing)
const BASE_SYSTEM_PROMPT = `
## 🎯 TU MISIÓN
Eres Alex, el cerebro de ventas de "Programming Car".
HOY ES: {{CURRENT_DATE}} (Asegúrate de usar esta fecha como referencia actual).

Tu objetivo es CATEGORIZAR, DIAGNOSTICAR y CERRAR.

## 📊 ESTADO DEL CRM
Tu cliente tiene el siguiente perfil (si tienes datos, ÚSALOS):
- VIN: {{VIN}}
- Vehículo: {{YEAR}} {{MAKE}} {{MODEL}} {{ENGINE}}
- Estado Actual: {{STATUS}}

## ⚠️ REGLAS DE ORO
1. **PRIMERO, IDENTIFICA EL AUTO**: No busques llaves ni piezas sin saber qué auto es.
   - **SI RECIBES UNA IMAGEN**: Tu prioridad #1 es VERLA y buscar un VIN (17 caracteres). Si lo encuentras, EJECUTA \`lookup_vin\` INMEDIATAMENTE. ¡No preguntes el VIN si ya está en la foto!
   - Si falta información, PREGUNTA: "¿Podrías darme el VIN o el Año, Marca y Modelo?"
   - **UBICACIÓN**: 
   - Miami/Broward: Servicio móvil ($150 diagnóstico).
   - USA/Internacional: Envío o Soporte Remoto ($100/hora).

2. **ANTI-SPAM Y PACIENCIA**:
   - Si el usuario envía mensajes repetidos (ej. "Hola", "Hola", "Hola"), NO respondas a cada uno. Ignora los repetidos o responde UNA sola vez diciendo: "Ya te leí, dame un segundo...".

## 🛠️ SERVICIOS Y PRECIOS (ESTRICTO)
### 1. TRANSMISIONES
- **TEHCM ($500)**: Programada, calibrada, envío gratis USA.
- **TRANSMISIÓN COMPLETA ($2,500)**: Instalación local o envío.

### 2. LLAVES (PROTOCOLO OBLIGATORIO)
CUANDO EL CLIENTE PIDA UNA LLAVE, SIGUE ESTOS PASOS EXACTOS:
   1. **Identifica** el Vehículo (VIN o Año/Marca/Modelo).
   2. Usa \`lookup_key_info\` para encontrar el FCC ID y frecuencia.
   3. **CRÍTICO**: ANTES de dar cualquier enlace o precio, EL EJECUTAR \`check_internal_key_cost\` ES OBLIGATORIO.
      - Debes buscar el precio interno en la base de datos o proveedores.
      - **NUNCA envíes enlaces crudos de UHS o Locksmith Keyless al cliente** a menos que 'check_internal_key_cost' falle totalmente.
      - Tu trabajo es VENDER la llave, no mandar al cliente a comprarla a otro lado.
   4. **COTIZACIÓN**: Toma el precio de COSTO que te da la herramienta y MULTIPLÍCALO x2 (o x3 si es rara) para dar el PRECIO FINAL al cliente.

## 🧠 GESTIÓN DE ESTADO (CRM)
Tú decides cuándo cambiar el estado del cliente.
- **COTIZANDO**: Si le diste precio.
- **PROGRAMADO**: Si aceptó la cita.
- **COMPLETADO**: Si ya se hizo el trabajo.
`;

if (!OPENAI_API_KEY || !WHAPI_TOKEN) {
  logger.error('❌ ERROR: Faltan las claves en el archivo .env');
  logger.error('Asegúrate de tener OPENAI_API_KEY y WHAPI_TOKEN configurados.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
    if (!messages || messages.length === 0) {return res.sendStatus(200);}

    const incomingMsg = messages[0];
    if (incomingMsg.from_me) {return res.sendStatus(200);} // Ignorar nuestros propios mensajes

    const senderNumber = incomingMsg.chat_id; // ID del chat (ej: 1786...@s.whatsapp.net)
    const userText = incomingMsg.text?.body || '';
    const userImage = incomingMsg.image?.link || null; // Link a la imagen de Whapi

    if (!userText && !userImage) {return res.sendStatus(200);}

    logger.info(`💬 Cliente(${senderNumber}): ${userText || '[IMAGEN RECIBIDA]'}`);

    // --- OWNER PRICE RESPONSE FLOW ---
    if (isOwner(senderNumber) && userText) {
      const priceHandled = await handleOwnerResponse(sendToWhapi, userText);
      if (priceHandled.handled) {
        logger.info('✅ Owner price response processed');
        return res.sendStatus(200);
      }
      // If not a price response, continue normal flow (owner can also chat with Alex)
    }

    // --- MODO ENTRENAMIENTO (Training Mode) ---
    if (userText && userText.toLowerCase().startsWith('aprende:')) {
      logger.info(`🎓 Modo Entrenamiento Detectado: ${userText}`);
      const learnResult = await learnNewPrice(userText);
      await sendToWhapi(senderNumber, learnResult.message);
      return res.sendStatus(200);
    }

    // 🧠 PENSAR (Consultar a OpenAI)
    // Pasamos tanto texto como imagen a la función
    const aiResponse = await getAIResponse(userText, senderNumber, userImage);
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

// Función para hablar con GPT-4o con MEMORIA PERSISTENTE (Supabase)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const { decodeVIN } = require('./vin_decoder');
const { findKeyDetails, getSupplierLinks } = require('./key_finder');
const { checkInternalPrices } = require('./price_checker');
const { getStoredPrice, learnNewPrice } = require('./price_manager');
const { createPriceRequest, handleOwnerResponse, isOwner } = require('./price_request_manager');

// --- AI MEMORY FUNCTION ---
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {return null;}
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    });
    return response.data[0].embedding;
  } catch (e) {
    logger.error('Error generando embedding:', e.message);
    return null; // Fail gracefully
  }
}

async function getAIResponse(userMessage, senderNumber, userImage = null) {
  let leadId;
  try {
    // 1. Identificar al CLiente (Lead)
    // Recuperar datos completos del Lead para contexto
    const { data: leadsFound } = await supabase
      .from('leads')
      .select('id, name, vin, make, model, year, engine, pipeline_status')
      .eq('phone', senderNumber)
      .limit(1);

    let currentLeadData;
    if (leadsFound && leadsFound.length > 0) {
      leadId = leadsFound[0].id;
      // Inject knowledge of the car into the prompt context later
      currentLeadData = leadsFound[0];
    } else {
      // Si no existe, crearlo con status NUEVO
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert([
          {
            phone: senderNumber,
            name: 'WhatsApp User',
            pipeline_status: 'NUEVO',
          },
        ])
        .select()
        .single();

      if (createError) {throw createError;}
      leadId = newLead.id;
      currentLeadData = { pipeline_status: 'NUEVO' };
    }

    // --- SPAM CHECK (Deduplication) ---
    if (userMessage) {
      const { data: lastUserMsg } = await supabase
        .from('conversations')
        .select('content, created_at')
        .eq('lead_id', leadId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastUserMsg && lastUserMsg.content === userMessage) {
        const timeDiff = new Date() - new Date(lastUserMsg.created_at);
        if (timeDiff < 60000) {
          // < 60 seconds
          logger.info(`🚫 SPAM DETECTADO (Ignorando): ${userMessage}`);
          return null; // Return null to signal "No Reply"
        }
      }
    }

    // 2. Guardar el mensaje del USUARIO en la BBDD
    await supabase.from('conversations').insert({
      lead_id: leadId,
      role: 'user',
      content: userMessage || `[ENVIÓ UNA FOTO: ${userImage || 'Sin Link'}]`,
    });

    // 3. Recuperar Historial Reciente (Últimos 11 mensajes para descartar el actual)
    const { data: historyData } = await supabase
      .from('conversations')
      .select('role, content')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(11);

    // DESCARTAMOS el mensaje más reciente (index 0) porque es el que acabamos de insertar
    // y lo vamos a añadir manualmente con la imagen abajo.
    const cleanHistory = historyData ? historyData.slice(1) : [];
    const dbHistory = cleanHistory.reverse();

    // Construimos el array para OpenAI (System Prompt + Historia)
    // Inject dynamic data into prompt
    const dynamicPrompt = BASE_SYSTEM_PROMPT.replace(
      '{{CURRENT_DATE}}',
      new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    )
      .replace('{{VIN}}', currentLeadData.vin || 'NO DISPONIBLE')
      .replace('{{YEAR}}', currentLeadData.year || '')
      .replace('{{MAKE}}', currentLeadData.make || '')
      .replace('{{MODEL}}', currentLeadData.model || '')
      .replace('{{ENGINE}}', currentLeadData.engine || '')
      .replace('{{STATUS}}', currentLeadData.pipeline_status || 'NUEVO');

    const messagesForAI = [
      { role: 'system', content: dynamicPrompt },
      ...dbHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    // Añadimos el mensaje actual
    const currentUserMsg = userImage
      ? {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                userMessage ||
                'Esta es una foto de mi vehículo o del VIN. TU TAREA PRINCIPAL ES: \n1. Examinar la imagen buscando un código de 17 caracteres (VIN).\n2. Si lo encuentras, EJECUTA INMEDIATAMENTE la herramienta `lookup_vin` con ese código.\n3. Si no es legible, dímelo.',
            },
            { type: 'image_url', image_url: { url: userImage } },
          ],
        }
      : { role: 'user', content: userMessage };

    messagesForAI.push(currentUserMsg);

    // --- DEFINICIÓN DE HERRAMIENTAS (TOOLS) ---
    const tools = [
      {
        type: 'function',
        function: {
          name: 'lookup_vin',
          description:
            'Busca detalles técnicos de un vehículo (Año, Marca, Modelo, Motor) usando su VIN. Úsalo SIEMPRE que identifiques un VIN.',
          parameters: {
            type: 'object',
            properties: {
              vin: {
                type: 'string',
                description: 'El número de identificación del vehículo (17 caracteres).',
              },
            },
            required: ['vin'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lookup_key_info',
          description:
            'Busca información de llaves (FCC ID) y enlaces de compra para un auto específico. Úsalo cuando el cliente pregunte por llaves o copias.',
          parameters: {
            type: 'object',
            properties: {
              year: { type: 'string', description: 'Año del auto (ej: 2019)' },
              make: { type: 'string', description: 'Marca del auto (ej: Toyota)' },
              model: { type: 'string', description: 'Modelo del auto (ej: Corolla)' },
            },
            required: ['year', 'make', 'model'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_internal_key_cost',
          description:
            'Busca el COSTO REAL de una llave en proveedores (UHS/Locksmith Keyless) usando el FCC ID. USAR SOLO PARA USO INTERNO.',
          parameters: {
            type: 'object',
            properties: {
              fcc_id: { type: 'string', description: 'El FCC ID de la llave (ej: HYQ12BDM)' },
              make: { type: 'string', description: 'Marca del auto' },
              model: { type: 'string', description: 'Modelo del auto' },
              year: { type: 'integer', description: 'Año del auto' },
            },
            required: ['fcc_id'],
          },
        },
      },
    ];

    // --- BUCLE DE RAZONAMIENTO (TOOL CALLING LOOP) ---
    let finalReply = '';
    let steps = 0;
    const MAX_STEPS = 5; // Evitar bucles infinitos

    while (steps < MAX_STEPS) {
      steps++;

      // Llamada a OpenAI
      // DEBUG: Log last message payload to DB to see what AI gets
      const lastMsg = messagesForAI[messagesForAI.length - 1];
      if (lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
        await supabase.from('conversations').insert({
          lead_id: leadId,
          role: 'system',
          content: `🔍 DEBUG PAYLOAD: ${JSON.stringify(lastMsg.content)}`,
        });
      }

      const completion = await openai.chat.completions.create({
        messages: messagesForAI,
        model: 'gpt-4o',
        tools: tools,
        tool_choice: 'auto',
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Si el modelo quiere hablar (finalizar), rompemos el bucle
      if (!message.tool_calls) {
        finalReply = message.content;
        break;
      }

      // Si el modelo quiere usar herramientas
      messagesForAI.push(message); // Agregamos la intención de llamada al historial

      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'lookup_vin') {
          const args = JSON.parse(toolCall.function.arguments);
          logger.info(`🔧 GPT Tool Call: lookup_vin(${args.vin})`);

          // EJECUTAR LA HERRAMIENTA
          const vinData = await decodeVIN(args.vin);

          // --- ACTUALIZAR CRM (Supabase) ---
          if (vinData && vinData.year) {
            const { error: updateError } = await supabase
              .from('leads')
              .update({
                vin: args.vin,
                year: parseInt(vinData.year) || null,
                make: vinData.make,
                model: vinData.model,
                engine: vinData.engine,
                pipeline_status: 'COTIZANDO', // Si ya tenemos VIN, pasamos a cotizar
              })
              .eq('id', leadId);

            if (updateError) {logger.error('Error actualizando CRM:', updateError);}
            else {logger.info('CRM Actualizado con datos del Vehículo');}
          }

          // Respondemos con el resultado
          messagesForAI.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: 'lookup_vin',
            content: JSON.stringify(vinData),
          });
        } else if (toolCall.function.name === 'lookup_key_info') {
          const args = JSON.parse(toolCall.function.arguments);
          logger.info(`🔧 GPT Tool Call: lookup_key_info(${args.year} ${args.make} ${args.model})`);

          const keyResults = await findKeyDetails(args.year, args.make, args.model);

          // If fallback to web, formatting for GPT
          let contentPayload = keyResults;

          // If we have the special "db_miss" flag or just want to ensure links are visible
          if (keyResults.length > 0 && keyResults[0].db_miss) {
            const links = getSupplierLinks(args.make, args.model, args.year);
            contentPayload = {
              message: 'No encontrado en libros internos. Usar enlaces externos.',
              search_links: links,
            };
          }

          messagesForAI.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: 'lookup_key_info',
            content: JSON.stringify(contentPayload),
          });
        } else if (toolCall.function.name === 'check_internal_key_cost') {
          const args = JSON.parse(toolCall.function.arguments);
          logger.info(`[GPT Tool Call] check_internal_key_cost(${args.fcc_id})`);

          // 1. Check Database First (Fixed Prices)
          // We use year from args or currentLeadData context if available
          // Note: accessing currentLeadData here requires it to be in scope or passed.
          // Since it's block-scoped above, we might need to rely on args or default.
          // For now, let's rely on args provided by GPT (we added 'year' to tool def).

          let priceData = null;
          if (args.make && args.model && args.year) {
            const dbPrice = await getStoredPrice(args.make, args.model, parseInt(args.year));
            if (dbPrice) {
              priceData = {
                source: 'INTERNAL_DB',
                price: dbPrice.price,
                description: dbPrice.description,
                note: 'PRECIO FIJO/APRENDIDO',
              };
              logger.info(`✅ Precio encontrado en DB: $${dbPrice.price}`);
            }
          }

          // 2. If no DB hit, use Scraping
          if (!priceData) {
            priceData = await checkInternalPrices(args.fcc_id, args.make, args.model);
          }

          // 3. If still no price, request from owner
          const hasValidPrice = priceData && (
            (Array.isArray(priceData) && priceData.some(p => p.price)) ||
            (!Array.isArray(priceData) && priceData.price)
          );

          if (!hasValidPrice && args.make && args.model && args.year) {
            // Request price from owner via WhatsApp
            const requestResult = await createPriceRequest(
              sendToWhapi,
              senderNumber,
              args.make,
              args.model,
              args.year,
              'copy',
              args.fcc_id
            );

            if (requestResult.success) {
              priceData = {
                source: 'PENDING_OWNER_APPROVAL',
                message: `Precio solicitado al supervisor (#${requestResult.code}). El cliente recibirá respuesta pronto.`,
                status: 'pending',
                note: 'Dile al cliente que estás consultando el precio y que le avisarás en breve.',
              };
              logger.info(`📤 Price request #${requestResult.code} created for ${args.make} ${args.model}`);
            }
          }

          messagesForAI.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: 'check_internal_key_cost',
            content: JSON.stringify(priceData),
          });
        }
      }
      // El bucle continuará y OpenAI verá el resultado de la herramienta en la siguiente iteración
    }

    // 5. Guardar respuesta FINAL del AGENTE en la BBDD
    const agentEmbedding = await generateEmbedding(finalReply);

    await supabase.from('conversations').insert({
      lead_id: leadId,
      role: 'assistant',
      content: finalReply,
      embedding: agentEmbedding,
    });

    return finalReply;
  } catch (e) {
    logger.error('Error Critical (Supabase/OpenAI):', e);
    const errorDetail = e.response ? JSON.stringify(e.response.data) : e.message;

    // LOG ERROR TO DB SO WE CAN SEE IT (only if leadId was set)
    if (leadId) {
      await supabase.from('conversations').insert({
        lead_id: leadId,
        role: 'system',
        content: `❌ SYSTEM ERROR: ${errorDetail}`,
      });
    }

    return 'Dame un segundo, estoy actualizando mi base de datos...';
  }
}

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
