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

// Agente de Ventas "Alex" - Version 7.0 (Global & Pricing)
const SYSTEM_PROMPT = `
## 🎯 TU MISIÓN
Eres Alex, el cerebro de ventas de "Programming Car". Administras el negocio digital con autoridad. Tu objetivo es CATEGORIZAR y CERRAR.

## ⚠️ REGLAS DE ORO
1. **PIDE EL VIN**: Sin VIN no hay diagnóstico preciso.
2. **UBICACIÓN**: 
   - Miami/Broward: Servicio móvil.
   - USA/Internacional: Envío o Soporte Remoto.

## 🛠️ SERVICIOS Y PRECIOS (No dudes en cobrar)

### 1. TRANSMISIONES
- **TEHCM ($500)**: Programada, calibrada y con envío gratis en USA. 1 año de garantía.
- **TRANSMISIÓN COMPLETA ($2,500)**: Instalación local o envío nacional.

### 2. DIAGNÓSTICOS (Valor de experto)
- **PRESENCIAL (Miami/Broward)**: **$150 USD**. Incluye escaneo profesional con equipo original.
- **REMOTO (Internacional/USA)**: **$100 USD por HORA**. Requiere Laptop + J2534 + Internet.

### 3. LLAVES Y MÓDULOS
- **Copias/Perdidas**: Consulta VIN para precio. Solo local.
- **Programación de Módulos**: Puede ser remota si tienen el equipo.

## 💬 DINÁMICA DE VENTA
- **Venta local**: "El diagnóstico presencial de Jesus son $150. Él va con equipo original y te dice exactamente qué tiene el auto. Pásame el VIN para agendarlo."
- **Venta remota**: "Podemos programar tu módulo ahora mismo por $100 la hora de soporte remoto. Necesitas una laptop y J2534. ¿Me das el VIN?"
- **Transmisión**: "La solución definitiva es la TEHCM por $500. Se paga por Zelle al 7868164874 y te la envío hoy."
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

        // 🧠 PENSAR (Consultar a OpenAI)
        // Pasamos tanto texto como imagen a la función
        const aiResponse = await getAIResponse(userText, senderNumber, userImage);
        console.log(`🤖 Agente: ${aiResponse}`);

        // 🗣️ RESPONDER (Enviar a Whapi)
        const sentResult = await sendToWhapi(senderNumber, aiResponse);
        console.log('📤 Resultado envío Whapi:', JSON.stringify(sentResult));

        // 📝 AUDITAR (Guardar para revisión de Jesus y Antigravity)
        const logEntry = `[${new Date().toLocaleString()}] CLIENTE (${senderNumber}): ${userText}\n` +
            `[${new Date().toLocaleString()}] AGENTE ALEX: ${aiResponse}\n` +
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

async function getAIResponse(userMessage, senderNumber, userImage = null) {
    try {
        // 1. Identificar al CLiente (Lead)
        let leadId;

        // Buscar si ya existe (Usamos limit(1) por si hay duplicados en la tabla antigua)
        let { data: leadsFound, error } = await supabase
            .from('leads')
            .select('id, name')
            .eq('phone', senderNumber)
            .limit(1);

        if (leadsFound && leadsFound.length > 0) {
            leadId = leadsFound[0].id; // Usamos el primero que encontremos
        } else {
            // Si no existe, crearlo
            const { data: newLead, error: createError } = await supabase
                .from('leads')
                .insert([{ phone: senderNumber, name: "WhatsApp User" }])
                .select()
                .single();

            if (createError) throw createError;
            leadId = newLead.id;
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
        let messagesForAI = [
            { role: "system", content: SYSTEM_PROMPT },
            ...dbHistory.map(msg => ({ role: msg.role, content: msg.content }))
        ];

        // Añadimos el mensaje actual
        const currentUserMsg = userImage ?
            {
                role: "user",
                content: [
                    { type: "text", text: userMessage || "Aquí está la foto de mi VIN/Auto. Analízala y decodifica el VIN si es visible." },
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

                    // Respondemos con el resultado
                    messagesForAI.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "lookup_vin",
                        content: JSON.stringify(vinData)
                    });
                }
            }
            // El bucle continuará y OpenAI verá el resultado de la herramienta en la siguiente iteración
        }

        // 5. Guardar respuesta FINAL del AGENTE en la BBDD
        await supabase.from('conversations').insert({
            lead_id: leadId,
            role: 'assistant',
            content: finalReply
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
            authorization: `Bearer ${WHAPI_TOKEN}`
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

    console.log(`🎬 JOB ${jobId} STARTED: ${title}`);

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
            console.error(`❌ JOB ${jobId} FAILED:`, error);
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
    console.log(`🚀 Agente de Ventas escuchando en puerto ${PORT}`);
    console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
});
