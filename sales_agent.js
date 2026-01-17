const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// ==========================================
// CONFIGURACIÓN
// ==========================================
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

// Agente de Ventas "Alex" - Version 8.0 (CRM & AI Memory)
const BASE_SYSTEM_PROMPT = `
## 🎯 TU MISIÓN
Eres Alex, el cerebro de ventas de "Programming Car".
Tu objetivo es CATEGORIZAR, DIAGNOSTICAR y CERRAR.

## 📊 ESTADO DEL CRM
Tu cliente tiene el siguiente perfil (si tienes datos, ÚSALOS):
- VIN: {{VIN}}
- Vehículo: {{YEAR}} {{MAKE}} {{MODEL}} {{ENGINE}}
- Estado Actual: {{STATUS}}

## ⚠️ REGLAS DE ORO
1. **PRIMERO, IDENTIFICA EL AUTO**: No busques llaves ni piezas sin saber qué auto es.
   - Si falta información, PREGUNTA: "¿Podrías darme el VIN o el Año, Marca y Modelo?"
   - **UBICACIÓN**: 
   - Miami/Broward: Servicio móvil ($150 diagnóstico).
   - USA/Internacional: Envío o Soporte Remoto ($100/hora).

## 🛠️ SERVICIOS Y PRECIOS
### 1. TRANSMISIONES
- **TEHCM ($500)**: Programada, calibrada, envío gratis USA.
- **TRANSMISIÓN COMPLETA ($2,500)**: Instalación local o envío.

### 2. LLAVES
- **Procedimiento**: 
   1. Identifica el Vehículo (VIN o Año/Marca/Modelo).
   2. Usa herramienta 'lookup_key_info' para detalles (FCC ID).
   3. Usa herramienta 'check_internal_key_cost' para consultar COSTO INTERNO.
   4. **MUY IMPORTANTE**: Los precios que devuelve la herramienta son COSTO. Cárgale margen antes de dárselo al cliente.

## 🧠 GESTIÓN DE ESTADO (CRM)
Tú decides cuándo cambiar el estado del cliente. Si detectas un cambio, usa la herramienta explícita (simulada por ahora) o sugiérelo.
- **COTIZANDO**: Si le diste precio.
- **PROGRAMADO**: Si aceptó la cita.
- **COMPLETADO**: Si ya se hizo el trabajo.
`;


if (!OPENAI_API_KEY || !WHAPI_TOKEN) {
    console.error("❌ ERROR: Faltan las claves en el archivo .env");
    console.error("Asegúrate de tener OPENAI_API_KEY y WHAPI_TOKEN configurados.");
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
    console.log('📩 Webhook recibido:', JSON.stringify(req.body, null, 2));

    try {
        const messages = req.body.messages;
        if (!messages || messages.length === 0) return res.sendStatus(200);

        const incomingMsg = messages[0];
        if (incomingMsg.from_me) return res.sendStatus(200); // Ignorar nuestros propios mensajes

        const senderNumber = incomingMsg.chat_id; // ID del chat (ej: 1786...@s.whatsapp.net)
        const userText = incomingMsg.text?.body || "";
        const userImage = incomingMsg.image?.link || null; // Link a la imagen de Whapi

        if (!userText && !userImage) return res.sendStatus(200);

        console.log(`💬 Cliente(${senderNumber}): ${userText || '[IMAGEN RECIBIDA]'}`);

        // --- MODO ENTRENAMIENTO (Training Mode) ---
        if (userText && userText.toLowerCase().startsWith('aprende:')) {
            console.log(`🎓 Modo Entrenamiento Detectado: ${userText}`);
            const learnResult = await learnNewPrice(userText);
            await sendToWhapi(senderNumber, learnResult.message);
            return res.sendStatus(200);
        }

        // 🧠 PENSAR (Consultar a OpenAI)
        // Pasamos tanto texto como imagen a la función
        const aiResponse = await getAIResponse(userText, senderNumber, userImage);
        console.log(`🤖 Agente: ${aiResponse} `);

        // 🗣️ RESPONDER (Enviar a Whapi)
        const sentResult = await sendToWhapi(senderNumber, aiResponse);
        console.log('📤 Resultado envío Whapi:', JSON.stringify(sentResult));

        // 📝 AUDITAR (Guardar para revisión de Jesus y Antigravity)
        const logEntry = `[${new Date().toLocaleString()}]CLIENTE(${senderNumber}): ${userText} \n` +
            `[${new Date().toLocaleString()}] AGENTE ALEX: ${aiResponse} \n` +
            `--------------------------------------------------\n`;
        fs.appendFileSync('audit.log', logEntry);

        res.sendStatus(200);

    } catch (error) {
        console.error('Error procesando webhook:', error);
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

// --- AI MEMORY FUNCTION ---
async function generateEmbedding(text) {
    if (!text || typeof text !== 'string') return null;
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text.replace(/\n/g, ' ')
        });
        return response.data[0].embedding;
    } catch (e) {
        console.error("Error generando embedding:", e.message);
        return null; // Fail gracefully
    }
}

async function getAIResponse(userMessage, senderNumber, userImage = null) {
    try {
        // 1. Identificar al CLiente (Lead)
        let leadId;
        // Recuperar datos completos del Lead para contexto
        let { data: leadsFound, error } = await supabase
            .from('leads')
            .select('id, name, vin, make, model, year, engine, pipeline_status')
            .eq('phone', senderNumber)
            .limit(1);

        if (leadsFound && leadsFound.length > 0) {
            leadId = leadsFound[0].id;
            // Inject knowledge of the car into the prompt context later
            var currentLeadData = leadsFound[0];
        } else {
            // Si no existe, crearlo con status NUEVO
            const { data: newLead, error: createError } = await supabase
                .from('leads')
                .insert([{
                    phone: senderNumber,
                    name: "WhatsApp User",
                    pipeline_status: 'NUEVO'
                }])
                .select()
                .single();

            if (createError) throw createError;
            leadId = newLead.id;
            var currentLeadData = { pipeline_status: 'NUEVO' };
        }

        // 2. Guardar el mensaje del USUARIO en la BBDD
        await supabase.from('conversations').insert({
            lead_id: leadId,
            role: 'user',
            content: userMessage || `[ENVIÓ UNA FOTO: ${userImage || 'Sin Link'}]`
        });

        // 3. Recuperar Historial Reciente (Últimos 10 mensajes para contexto)
        const { data: historyData } = await supabase
            .from('conversations')
            .select('role, content')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false }) // Traer los más nuevos primero
            .limit(10);

        // Ordenamos cronológicamente (antiguo -> nuevo) para GPT
        const dbHistory = historyData ? historyData.reverse() : [];

        // Construimos el array para OpenAI (System Prompt + Historia)
        // Construimos el array para OpenAI (System Prompt + Historia)
        // Inject dynamic data into prompt
        let dynamicPrompt = BASE_SYSTEM_PROMPT
            .replace('{{VIN}}', currentLeadData.vin || 'NO DISPONIBLE')
            .replace('{{YEAR}}', currentLeadData.year || '')
            .replace('{{MAKE}}', currentLeadData.make || '')
            .replace('{{MODEL}}', currentLeadData.model || '')
            .replace('{{ENGINE}}', currentLeadData.engine || '')
            .replace('{{STATUS}}', currentLeadData.pipeline_status || 'NUEVO');

        let messagesForAI = [
            { role: "system", content: dynamicPrompt },
            ...dbHistory.map(msg => ({ role: msg.role, content: msg.content }))
        ];

        // Añadimos el mensaje actual
        const currentUserMsg = userImage ?
            {
                role: "user",
                content: [
                    { type: "text", text: userText || "Esta es una foto de mi vehículo o del VIN. TU TAREA PRINCIPAL ES: \n1. Examinar la imagen buscando un código de 17 caracteres (VIN).\n2. Si lo encuentras, EJECUTA INMEDIATAMENTE la herramienta `lookup_vin` con ese código.\n3. Si no es legible, dímelo." },
                    { type: "image_url", image_url: { url: userImage } }
                ]
            } :
            { role: "user", content: userMessage };

        messagesForAI.push(currentUserMsg);

        // --- DEFINICIÓN DE HERRAMIENTAS (TOOLS) ---
        const tools = [
            {
                type: "function",
                function: {
                    name: "lookup_vin",
                    description: "Busca detalles técnicos de un vehículo (Año, Marca, Modelo, Motor) usando su VIN. Úsalo SIEMPRE que identifiques un VIN.",
                    parameters: {
                        type: "object",
                        properties: {
                            vin: {
                                type: "string",
                                description: "El número de identificación del vehículo (17 caracteres)."
                            }
                        },
                        required: ["vin"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "lookup_key_info",
                    description: "Busca información de llaves (FCC ID) y enlaces de compra para un auto específico. Úsalo cuando el cliente pregunte por llaves o copias.",
                    parameters: {
                        type: "object",
                        properties: {
                            year: { type: "string", description: "Año del auto (ej: 2019)" },
                            make: { type: "string", description: "Marca del auto (ej: Toyota)" },
                            model: { type: "string", description: "Modelo del auto (ej: Corolla)" }
                        },
                        required: ["year", "make", "model"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "check_internal_key_cost",
                    description: "Busca el COSTO REAL de una llave en proveedores (UHS/Locksmith Keyless) usando el FCC ID. USAR SOLO PARA USO INTERNO.",
                    parameters: {
                        type: "object",
                        properties: {
                            fcc_id: { type: "string", description: "El FCC ID de la llave (ej: HYQ12BDM)" },
                            make: { type: "string", description: "Marca del auto" },
                            model: { type: "string", description: "Modelo del auto" },
                            year: { type: "integer", description: "Año del auto" }
                        },
                        required: ["fcc_id"]
                    }
                }
            }
        ];

        // --- BUCLE DE RAZONAMIENTO (TOOL CALLING LOOP) ---
        let finalReply = "";
        let steps = 0;
        const MAX_STEPS = 5; // Evitar bucles infinitos

        while (steps < MAX_STEPS) {
            steps++;

            // Llamada a OpenAI
            const completion = await openai.chat.completions.create({
                messages: messagesForAI,
                model: "gpt-4o",
                tools: tools,
                tool_choice: "auto"
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
                    console.log(`🔧 GPT Tool Call: lookup_vin(${args.vin})`);

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
                                pipeline_status: 'COTIZANDO' // Si ya tenemos VIN, pasamos a cotizar
                            })
                            .eq('id', leadId);

                        if (updateError) console.error("Error actualizando CRM:", updateError);
                        else console.log("CRM Actualizado con datos del Vehículo");
                    }

                    // Respondemos con el resultado
                    messagesForAI.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "lookup_vin",
                        content: JSON.stringify(vinData)
                    });
                } else if (toolCall.function.name === 'lookup_key_info') {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log(`🔧 GPT Tool Call: lookup_key_info(${args.year} ${args.make} ${args.model})`);

                    const keyResults = await findKeyDetails(args.year, args.make, args.model);

                    // If fallback to web, formatting for GPT
                    let contentPayload = keyResults;

                    // If we have the special "db_miss" flag or just want to ensure links are visible
                    if (keyResults.length > 0 && keyResults[0].db_miss) {
                        const query = `${args.year} ${args.make} ${args.model} `;
                        const links = getSupplierLinks(args.make, args.model, args.year);
                        contentPayload = {
                            message: "No encontrado en libros internos. Usar enlaces externos.",
                            search_links: links
                        };
                    }

                    messagesForAI.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "lookup_key_info",
                        content: JSON.stringify(contentPayload)
                    });
                } else if (toolCall.function.name === 'check_internal_key_cost') {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log(`[GPT Tool Call] check_internal_key_cost(${args.fcc_id})`);

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
                                note: "PRECIO FIJO/APRENDIDO"
                            };
                            console.log(`✅ Precio encontrado en DB: $${dbPrice.price}`);
                        }
                    }

                    // 2. If no DB hit, use Scraping
                    if (!priceData) {
                        priceData = await checkInternalPrices(args.fcc_id, args.make, args.model);
                    }

                    messagesForAI.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "check_internal_key_cost",
                        content: JSON.stringify(priceData)
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
            embedding: agentEmbedding
        });

        return finalReply;

    } catch (e) {
        console.error("Error Critical (Supabase/OpenAI):", e);
        return "Dame un segundo, estoy actualizando mi base de datos...";
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
            authorization: `Bearer ${WHAPI_TOKEN} `
        },
        body: JSON.stringify({
            to: chatId,
            body: text
        })
    };

    const response = await fetch(url, options);
    const data = await response.json();
    return data;
}

// API Endpoint for Dashboard
// --- JOB SYSTEM FOR VIDEO GEN (To avoid timeouts) ---
const jobs = new Map();

app.post('/api/video/start', async (req, res) => {
    console.log("🎬 Solicitud de video recibida del Dashboard:", req.body);
    const { title, idea, image } = req.body;
    const jobId = Date.now().toString(); // Simple ID

    // Initial State
    jobs.set(jobId, { status: 'processing', steps: ['Iniciando...'], result: null });

    console.log(`🎬 JOB ${jobId} STARTED: ${title} `);

    // Start background process (Fire & Forget)
    (async () => {
        try {
            const { generateViralVideo } = require('./video_engine');

            // Step updates could be implemented in video_engine if passed a callback, 
            // but for now we just wait for final result.

            const result = await generateViralVideo(title, idea, image);
            jobs.set(jobId, { status: 'completed', steps: ['Done'], result: result });
            console.log(`✅ JOB ${jobId} COMPLETED`);

        } catch (error) {
            console.error(`❌ JOB ${jobId} FAILED: `, error);
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

app.listen(PORT, () => {
    console.log(`🚀 Agente de Ventas escuchando en puerto ${PORT} `);
    console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
});
