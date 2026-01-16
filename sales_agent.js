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

        if (!userText) return res.sendStatus(200);

        console.log(`💬 Cliente(${senderNumber}): ${userText}`);

        // 🧠 PENSAR (Consultar a OpenAI)
        const aiResponse = await getAIResponse(userText);
        console.log(`🤖 Agente: ${aiResponse}`);

        // 🗣️ RESPONDER (Enviar a Whapi)
        await sendToWhapi(senderNumber, aiResponse);

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

// Función para hablar con GPT-4o
async function getAIResponse(userMessage) {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            model: "gpt-4o",
        });

        return completion.choices[0].message.content;
    } catch (e) {
        console.error("Error OpenAI:", e);
        return "Disculpa, estoy revisando el inventario. Te escribo en un momento.";
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

app.listen(PORT, () => {
    console.log(`🚀 Agente de Ventas escuchando en puerto ${PORT}`);
    console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
});
