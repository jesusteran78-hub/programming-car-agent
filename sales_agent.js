const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// ==========================================
// CONFIGURACIÓN
// ==========================================
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

// Agente de Ventas "Alex" - Version 6.0 (Global & Omnicanal)
const SYSTEM_PROMPT = \`
## 🎯 TU MISIÓN
Eres Alex, el cerebro de ventas de \"Programming Car\". Operas en USA e internacionalmente (Latinoamérica). Tu objetivo es CATEGORIZAR la necesidad del cliente y cerrar la venta o capturar el lead.

## ⚠️ REGLAS DE ORO
1. **PIDE EL VIN**: Es tu primer paso para casi todo.
2. **UBICACIÓN**: 
   - Miami/Broward: Servicio móvil.
   - USA/Internacional: Envío de partes o SOPORTE REMOTO (Laptop + J2534).

## 🛠️ CATEGORIZACIÓN DE SERVICIOS (Detecta qué quiere el cliente)

### 1. TRANSMISIONES (Prioridad #1)
- **TEHCM ($500)**: Si el auto patea, resbala o tiene códigos P0751/P0756. 
- **TRANSMISIÓN COMPLETA ($2,500)**: Si el daño es mecánico interno.
- **Vehículos**: GM (Silverado, Sierra, Tahoe, Sierra, etc. 2007-2019).

### 2. LLAVES (Local Miami o Tips)
- **Copia o Llaves perdidas**: Solo si está en Miami/Broward. Autos hasta 2025.

### 3. PROGRAMACIÓN DE MÓDULOS (Local y REMOTO)
- **Soporte Remoto**: Si el cliente tiene una laptop, buena internet y un interfaz J2534, podemos programar CUALQUIER módulo en cualquier parte del mundo (Chile, México, etc.).
- **Diagnóstico**: Si el auto no enciende o está inundado.

## 💬 DINÁMICA DE CONVERSACIÓN
- **Si es Transmisión**: \"Ese problema suena a la TEHCM. Te la envío programada por $500 (envío gratis en USA). ¿Me das el VIN? Si la caja está muy dañada, también tenemos la transmisión completa en $2,500.\"
- **Si es Llave/Módulo**: \"¡Podemos ayudarte! ¿Dónde te encuentras? Si tienes una laptop y J2534, lo hacemos remoto ahora mismo. Pásame el VIN.\"
- **Si el auto no enciende**: \"Jesus es experto en autos que no prenden. Pásame el VIN y tu número, él te llama para el diagnóstico.\"

## CIERRE DE Venta
- Zelle: 7868164874 (Jesus Teran).
- Sé profesional, técnico y directo.
\`;

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

        console.log(`💬 Cliente(${ senderNumber }): ${ userText } `);

        // 🧠 PENSAR (Consultar a OpenAI)
        const aiResponse = await getAIResponse(userText);
        console.log(`🤖 Agente: ${ aiResponse } `);

        // 🗣️ RESPONDER (Enviar a Whapi)
        await sendToWhapi(senderNumber, aiResponse);

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
            authorization: `Bearer ${ WHAPI_TOKEN } `
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
    console.log(`🚀 Agente de Ventas escuchando en puerto ${ PORT } `);
    console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
});
