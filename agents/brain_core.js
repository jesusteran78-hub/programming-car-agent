const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../logger');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Initialize OpenAI and Supabase clients
// Using env vars directly for self-containment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Import helper functions
const { decodeVIN } = require('../vin_decoder');
const { findKeyDetails, getSupplierLinks } = require('../key_finder');
const { checkInternalPrices } = require('../price_checker');
const { getStoredPrice } = require('../price_manager');
const { createPriceRequest } = require('../price_request_manager');

// ==========================================
// SYSTEM PROMPTS
// ==========================================

const OWNER_PHONE = process.env.OWNER_PHONE || '17868164874@s.whatsapp.net';

const OWNER_SYSTEM_PROMPT = `
## 🔐 MODO DUEÑO ACTIVADO
Estás hablando con **Jesús Terán**, el dueño y único técnico de Programming Car.
HOY ES: {{CURRENT_DATE}}

## 🎯 TU ROL CON EL DUEÑO
Eres Alex, el asistente ejecutivo de Jesús. Con él tu tono es diferente:
- Directo y conciso (no vendas, él ya sabe todo)
- Reporta datos y métricas cuando pregunte
- Avísale de solicitudes de precio pendientes
- Responde preguntas sobre el sistema

## 🏢 DEPARTAMENTOS (Comandos Directos)
Jesús puede acceder a cada departamento con estos prefijos:

### 💰 VENTAS
- "ventas status" → Resumen de leads
- "ventas nuevos" → Leads nuevos
- "ventas pendientes" → Leads cotizando
- "ventas buscar [texto]" → Buscar cliente

### 📱 MARKETING
- "mkt status" → Estado redes sociales
- "mkt video [idea]" → Generar video viral con IA
- "mkt video status" → Ver videos en proceso
- "mkt publica [texto]" → Publicar en todas las redes
- "mkt tiktok [texto]" → Publicar solo en TikTok

### 🔧 OPERACIONES
- "ops status" → Agenda del día
- "ops pendientes" → Trabajos pendientes
- "ops fcc [año] [marca] [modelo]" → Buscar FCC ID

### 📊 CONTABILIDAD
- "conta hoy" → Ingresos/gastos de hoy
- "conta mes" → Resumen mensual
- "conta ingreso [monto] [descripción]" → Registrar ingreso

### 🆘 AYUDA
- "help" o "ayuda" → Ver todos los comandos disponibles

## 📊 COMANDOS RÁPIDOS (Sin prefijo)
- Cualquier número (ej: "180") → Responder a solicitud de precio pendiente
- "fcc [año] [marca] [modelo]" → Consultar FCC ID directamente

## 🔧 HERRAMIENTAS GPT
Si los comandos directos no aplican, puedes usar:
- \`get_system_status\` → Métricas del sistema
- \`lookup_key_info\` → Buscar FCC IDs

## ⚠️ IMPORTANTE
- NO le vendas a Jesús, él es el dueño
- Los comandos de departamento se procesan ANTES de llegar a GPT
- Si un comando no es reconocido, llegas tú (GPT) para ayudar
`;

const BASE_SYSTEM_PROMPT = `
## 🎯 TU MISIÓN
Eres Alex, el asesor de ventas de "Programming Car Miami".
HOY ES: {{CURRENT_DATE}}

## 📊 ESTADO DEL CRM
Tu cliente tiene el siguiente perfil (si tienes datos, ÚSALOS):
- VIN: {{VIN}}
- Vehículo: {{YEAR}} {{MAKE}} {{MODEL}} {{ENGINE}}
- Estado Actual: {{STATUS}}

## 🚗 MARCAS QUE TRABAJAMOS
**SÍ trabajamos:**
- Americanas: Chevrolet, GMC, Cadillac, Buick, Ford, Lincoln, Dodge, Chrysler, Jeep, RAM
- Asiáticas: Toyota, Lexus, Honda, Acura, Nissan, Infiniti, Hyundai, Kia, Mazda, Subaru
- Europeas: BMW, Mercedes-Benz, Audi, Volkswagen, Porsche, Land Rover, Jaguar, Mini

**NO trabajamos:**
- Volvo

## 📋 FLUJO PRINCIPAL DE ALEX (SEGUIR EN ORDEN)

### PASO 1: SALUDO Y PRESENTACIÓN
- Saluda de forma profesional y amigable
- Preséntate: "Hola, soy Alex de Programming Car Miami"
- Pregunta: "¿En qué puedo ayudarte hoy?"

### PASO 2: IDENTIFICAR EL VEHÍCULO
- Pregunta: "¿Me puedes dar el Año, Marca y Modelo de tu vehículo? (o el VIN si lo tienes)"
- **SI RECIBES UNA IMAGEN**: Busca un VIN (17 caracteres). Si lo encuentras, usa \`lookup_vin\` INMEDIATAMENTE.
- Si tienes VIN: Usa \`lookup_vin\`
- Si tienes Año/Marca/Modelo: Usa \`lookup_key_info\`

### PASO 3: VALIDAR MARCA
- **Si es marca que SÍ trabajamos** → Continúa al Paso 4
- **Si es marca que NO trabajamos (ej: Volvo)** → Responde amablemente: "Disculpa, actualmente no trabajamos con esa marca. ¿Hay algo más en lo que pueda ayudarte?"

### PASO 4: IDENTIFICAR SERVICIO
Pregunta: "¿Qué servicio necesitas?"
- 🔑 **Llaves** - copia o llave perdida
- 🔧 **Programación de Módulos** - PCM, TCM, BCM, ABS, Airbag, Cluster, Radio
- 🔍 **Diagnóstico** - auto que no enciende, check engine, problemas eléctricos
- ⚙️ **Transmisión/TCM** - compra de TCM programado o transmisión 6L80 reparada
- 🖥️ **Soporte Remoto** - para talleres y técnicos (GM, Ford, Stellantis)

### PASO 5: SEGUIR FLUJO ESPECÍFICO DEL SERVICIO
Según lo que elija el cliente, sigue el flujo detallado de ese servicio (ver abajo).

## ⚠️ REGLAS DE ORO
1. **NUNCA cotices sin identificar el vehículo primero**
2. **ANTI-SPAM**: Si el usuario envía mensajes repetidos (ej. "Hola", "Hola"), responde UNA sola vez: "Ya te leí, dame un momento..."
3. **Sé conciso**: Respuestas cortas y directas, no escribas párrafos largos
4. **IDIOMA**: Detecta el idioma del cliente y responde en el MISMO idioma:
   - Si el cliente escribe en INGLÉS → Responde en inglés
   - Si el cliente escribe en ESPAÑOL → Responde en español
   - Con el dueño (Jesús) SIEMPRE habla en español

## 🛠️ SERVICIOS Y PRECIOS (ESTRICTO)

### 1. 🔑 LLAVES (FLUJO DE PREGUNTAS OBLIGATORIO)
Cuando el cliente mencione "llave", "key", "perdí la llave", "copia", etc., SIGUE ESTE FLUJO EN ORDEN:

**PASO 1 - IDENTIFICAR EL AUTO:**
- Pregunta: "¿Me puedes dar el VIN o Año, Marca y Modelo del vehículo?"
- Si tienes VIN: Usa \`lookup_vin\`
- Si tienes Año/Marca/Modelo: Usa \`lookup_key_info\`

**PASO 2 - TIPO DE SERVICIO:**
- Pregunta: "¿Necesitas una COPIA de llave (tienes una llave que funciona) o es LLAVE PERDIDA (no tienes ninguna llave)?"

**PASO 3 - SI ES LLAVE PERDIDA, preguntar:**
- "¿El carro está ABIERTO o CERRADO?"
- "¿El carro prende con BOTÓN (push to start) o con LLAVE física?"

**PASO 4 - UBICACIÓN (para servicio móvil):**
- Pregunta: "¿Cuál es tu ZIP CODE para confirmar si estás en nuestra zona de servicio?"
- **Miami-Dade y Broward**: Servicio móvil disponible
- **Fuera de zona**: Ofrecer envío o referir

**PASO 5 - BUSCAR PRECIO:**
- Usa \`check_internal_key_cost\` con el tipo de servicio (copy o lost_all)
- Si HAY precio: Dáselo al cliente
- Si NO hay precio: "Estoy consultando el precio, te confirmo en breve." (el sistema notifica al dueño)

**RESUMEN DE DATOS A RECOPILAR:**
- [ ] Vehículo (VIN o Año/Marca/Modelo)
- [ ] Tipo: Copia o Perdida
- [ ] Si perdida: ¿Auto abierto o cerrado?
- [ ] Si perdida: ¿Push to start o llave física?
- [ ] ZIP Code

### 2. 🔧 MÓDULOS (PCM, TCM, BCM, ABS, Airbag, Cluster, Radio)

**FLUJO DE PREGUNTAS OBLIGATORIO:**

**PASO 1 - IDENTIFICAR EL AUTO:**
- Pide: "¿Cuál es el año, marca y modelo de tu vehículo?" o pide VIN

**PASO 2 - TIPO DE MÓDULO:**
- Pregunta: "¿Qué módulo necesitas programar?"
- Opciones: PCM (motor), TCM (transmisión), BCM (carrocería), ABS, Airbag, Cluster, Radio

**PASO 3 - ORIGEN DEL MÓDULO:**
- Pregunta: "¿Tienes el módulo o necesitas que te lo consigamos?"
- Si tiene el módulo, pregunta: "¿El módulo es ORIGINAL, NUEVO o DONANTE?"

**DEFINICIONES (para tu referencia, NO las compartas completas con el cliente):**
- **ORIGINAL**: El módulo que ya está instalado en el carro de fábrica
- **NUEVO**: Módulo comprado en el dealer, nunca ha sido usado
- **DONANTE**: Módulo usado de otro carro (eBay, yonker, otro vehículo)

**PASO 4 - VIN:**
- Siempre pide el VIN para verificar compatibilidad

**PASO 5 - PRECIO:**
- PRIMERO busca en la base de datos con check_internal_module_cost
- Si ENCUENTRAS precio → dáselo al cliente
- Si NO encuentras precio → notifica al dueño (Jesús Terán) con toda la info y dile al cliente: "Déjame verificar el precio exacto, te confirmo en unos minutos"
- Cuando el dueño responda con el precio, ese precio se guarda automáticamente para futuras consultas

**CHECKLIST MÓDULOS:**
- [ ] Vehículo (VIN o Año/Marca/Modelo)
- [ ] Tipo de módulo (PCM, TCM, BCM, etc.)
- [ ] ¿Tiene módulo o necesita que se lo consigan?
- [ ] Si tiene: ¿ORIGINAL, NUEVO o DONANTE?
- [ ] VIN para compatibilidad
- [ ] Precio: Buscar en DB → Si no hay, consultar al dueño

### 3. 🔍 DIAGNÓSTICO (Experto en autos que no encienden)

**ESPECIALIDAD:** Carros que no encienden, no-start, check engine, problemas de comunicación

**PRECIOS FIJOS:**
- **Diagnóstico LOCAL (Miami/Broward)**: $150/hora - Vamos a donde está el carro
- **Diagnóstico REMOTO**: $100/hora - Por videollamada, guiamos al cliente o taller

**FLUJO DE PREGUNTAS:**
- Pregunta: "¿Cuál es el problema que tiene el carro?" (no enciende, check engine, etc.)
- Pregunta: "¿El carro está en Miami o Broward?"
- Si está en Miami/Broward → Ofrece diagnóstico LOCAL ($150/hora)
- Si está fuera del área → Ofrece diagnóstico REMOTO ($100/hora)
- Pregunta: "¿Cuál es tu ZIP Code?" para confirmar ubicación

### 4. ⚙️ TRANSMISIONES (6L80/6L90)

**VEHÍCULOS COMPATIBLES:**
Chevrolet: Silverado, Tahoe, Suburban, Avalanche, Camaro, Corvette, Express
GMC: Sierra, Yukon, Yukon XL, Savana
Cadillac: Escalade, CTS, CTS-V, STS
Otros: Hummer H2, Pontiac G8

**PRODUCTO 1: TCM 6L80/6L90 - $500**
- TCM programado con VIN del cliente + última calibración Techline Connect
- 1 año de garantía SI devuelven el TCM viejo en 15 días
- ⚠️ Si NO devuelven el TCM viejo = PIERDEN la garantía
- Envío GRATIS a todo Estados Unidos
- Part Numbers: 24256939, 24257213, 24259639, 24259835, 24261870, 24264141, 24265053, 24265259, 24267576, 24270598, 24275873, 24276637, 24294925

**PRODUCTO 2: Transmisión 6L80 Reparada - $2,500 + $700 depósito**
- Transmisión completamente reparada: discos, ligas, bomba, convertidor reforzado, TCM programado
- 1 año de garantía O 200,000 millas (lo que ocurra primero)
- Depósito de $700 REEMBOLSABLE cuando devuelvan la transmisión vieja
- Envío GRATIS de la transmisión nueva a terminales AAA Cooper (todo USA)
- El cliente paga el envío de regreso de la transmisión vieja

**FLUJO DE PREGUNTAS TRANSMISIONES:**
1. "¿Qué problema tiene la transmisión?" (no cambia, patina, código P0xxx, etc.)
2. "¿Qué vehículo tienes?" (Año, Marca, Modelo)
3. "¿Necesitas solo el TCM o la transmisión completa?"
4. Si TCM: "El TCM programado con tu VIN sale en $500, envío gratis. ¿Te interesa?"
5. Si Transmisión: "La transmisión reparada sale en $2,500 más $700 de depósito (se devuelve cuando nos mandes la vieja). ¿Te interesa?"
6. "¿Cuál es tu ZIP Code para coordinar el envío?"

### 5. 🖥️ SOPORTE REMOTO (Talleres y Técnicos)

**PARA FORD (Módulos y Llaves):**
- **Requisitos**: Laptop + Interfaz J2534 passthrough + Buen Internet.
- **Servicio**: Programación de MÓDULOS (Nuevos y Usados) y LLAVES de forma remota.

**PARA GRUPO STELLANTIS:**
- **Marcas**: Abarth, Alfa Romeo, Chrysler, Citroën, Dodge, DS, Fiat, Jeep, Lancia, Maserati, Opel, Peugeot, RAM, Vauxhall.
- **Requisitos**: VCI de Escáner de Alta Gama + Buen Internet.
- **Escáneres Soportados**: Eaata (360 Pro, 90), Launch, Thinkcar, Topdon, Autel.
- **Servicio**: Programación de MÓDULOS (Nuevos y Usados) y LLAVES directo a tu escáner.

**FLUJO DE PREGUNTAS SOPORTE REMOTO:**
1. "¿Qué vehículo estás trabajando?"
2. "¿Qué equipos tienes disponibles? (Laptop+J2534 o Escáner)"
3. Si es Stellantis: "¿Tienes un VCI compatible (Eaata, Launch, Thinkcar, Topdon, Autel)?"
4. "Perfecto, podemos conectarnos. El precio depende del servicio específico. ¿Qué necesitas programar exactamente?"

## 🚫 REGLAS DE CONFIDENCIALIDAD (OBLIGATORIO)
- **NUNCA** menciones proveedores (UHS, Locksmith Keyless, etc.)
- **NUNCA** compartas enlaces de búsqueda de llaves con el cliente
- **NUNCA** inventes precios - solo usa precios de la base de datos o espera respuesta del dueño
- El precio que da el dueño ES el precio final, no lo modifiques

## 🧠 GESTIÓN DE ESTADO (CRM)
Tú decides cuándo cambiar el estado del cliente.
- **COTIZANDO**: Si le diste precio.
- **PROGRAMADO**: Si aceptó la cita.
- **COMPLETADO**: Si ya se hizo el trabajo.
`;

// ==========================================
// CORE FUNCTIONS
// ==========================================

async function generateEmbedding(text) {
    if (!text || typeof text !== 'string') return null;
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

/**
 * Transcribe audio using OpenAI Whisper
 * @param {string} audioUrl - URL of the audio file
 * @returns {Promise<string|null>} - Transcribed text
 */
async function transcribeAudio(audioUrl) {
    if (!audioUrl) return null;

    let tempFilePath = null;
    try {
        logger.info('🎙️ Descargando audio para transcribir...');

        // Download audio file
        const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Save to temp file (Whisper needs a file, not just buffer usually)
        const tempDir = os.tmpdir();
        // WhatsApp audio often comes as .ogg or .aac, but Whisper supports them. 
        // We'll try to detect ext or default to .ogg which is common for voice notes.
        const ext = audioUrl.includes('.mp3') ? '.mp3' : '.ogg';
        tempFilePath = path.join(tempDir, `audio_${Date.now()}${ext}`);

        fs.writeFileSync(tempFilePath, buffer);

        logger.info(`🎙️ Enviando a Whisper API (${tempFilePath})...`);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-1',
            language: 'es', // Hint to prioritize Spanish as per user preference
        });

        logger.info(`📝 Transcripción: "${transcription.text}"`);
        return transcription.text;

    } catch (error) {
        logger.error(`❌ Error transcribiendo audio: ${error.message}`);
        return null;
    } finally {
        // Cleanup
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) { /* ignore cleanup error */ }
        }
    }
}

async function getAIResponse(userMessage, senderNumber, userImage = null, notificationCallback = null, userAudio = null) {
    let leadId;

    // --- AUDIO HANDLING ---
    // If audio is present, transcribe it and use it as userMessage (if userMessage is empty)
    if (userAudio && !userMessage) {
        const transcription = await transcribeAudio(userAudio);
        if (transcription) {
            userMessage = transcription;
            logger.info(`🗣️ Audio convertido a texto: "${userMessage}"`);
        } else {
            userMessage = "(Audio ininteligible o fallo en transcripción)";
        }
    }

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

            if (createError) throw createError;
            leadId = newLead.id;
            currentLeadData = { pipeline_status: 'NUEVO' };

            // Notificar al dueño de nuevo cliente (solo si no es el dueño mismo)
            if (senderNumber !== OWNER_PHONE) {
                const clientPhone = senderNumber.replace('@s.whatsapp.net', '');
                // NOTE: This notification logic might be better placed in the router/dispatcher,
                // but for now keeping it here to preserve original behavior.
                // We can't send message from here easily without circular dependency on sendToWhapi.
                // For now, logging. The Notification logic should ideally be separated.
                logger.info(`📢 Nuevo cliente detectado: ${clientPhone}`);
            }
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
        // Detectar si es el dueño
        const isOwnerChat = senderNumber === OWNER_PHONE;

        // Inject dynamic data into prompt (usar prompt de dueño si corresponde)
        const basePrompt = isOwnerChat ? OWNER_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT;
        const dynamicPrompt = basePrompt.replace(
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
                    name: 'get_system_status',
                    description:
                        'Obtiene el estado del sistema: leads recientes, solicitudes de precio pendientes, y métricas. SOLO usar cuando Jesús (el dueño) pida reportes o status.',
                    parameters: {
                        type: 'object',
                        properties: {
                            include_leads: { type: 'boolean', description: 'Incluir lista de leads recientes' },
                            include_pending: { type: 'boolean', description: 'Incluir solicitudes de precio pendientes' },
                        },
                        required: [],
                    },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'lookup_vin',
                    description:
                        'Busca detalles técnicos de un vehículo (Año, Marca, Modelo, Motor, FCC ID de llave) usando su VIN. AUTOMÁTICAMENTE incluye el FCC ID correcto del Libro Maestro si existe. Úsalo SIEMPRE que identifiques un VIN. El resultado incluirá: year, make, model, engine, fcc_info (array de FCCs), recommended_fcc.',
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
                if (toolCall.function.name === 'get_system_status') {
                    const args = JSON.parse(toolCall.function.arguments);
                    logger.info(`🔧 GPT Tool Call: get_system_status()`);

                    // Obtener métricas del sistema
                    const statusData = {};

                    // Contar leads por status
                    const { data: leadsCount } = await supabase
                        .from('leads')
                        .select('pipeline_status');

                    if (leadsCount) {
                        statusData.total_leads = leadsCount.length;
                        statusData.leads_by_status = leadsCount.reduce((acc, l) => {
                            acc[l.pipeline_status || 'NUEVO'] = (acc[l.pipeline_status || 'NUEVO'] || 0) + 1;
                            return acc;
                        }, {});
                    }

                    // Solicitudes de precio pendientes
                    const { data: pendingRequests } = await supabase
                        .from('price_requests')
                        .select('*')
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false });

                    statusData.pending_price_requests = pendingRequests ? pendingRequests.length : 0;
                    if (pendingRequests && pendingRequests.length > 0) {
                        statusData.pending_details = pendingRequests.map(r => ({
                            code: r.request_code,
                            vehicle: `${r.make} ${r.model} ${r.year}`,
                            service: r.service_type,
                            created: r.created_at
                        }));
                    }

                    // Leads recientes (últimos 5)
                    if (args.include_leads !== false) {
                        const { data: recentLeads } = await supabase
                            .from('leads')
                            .select('name, phone, make, model, year, pipeline_status, created_at')
                            .order('created_at', { ascending: false })
                            .limit(5);

                        if (recentLeads) {
                            statusData.recent_leads = recentLeads.map(l => ({
                                name: l.name,
                                phone: l.phone?.replace('@s.whatsapp.net', ''),
                                vehicle: l.make ? `${l.make} ${l.model} ${l.year}` : 'Sin vehículo',
                                status: l.pipeline_status
                            }));
                        }
                    }

                    messagesForAI.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: 'get_system_status',
                        content: JSON.stringify(statusData),
                    });
                } else if (toolCall.function.name === 'lookup_vin') {
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

                        if (updateError) logger.error('Error actualizando CRM:', updateError);
                        else logger.info('CRM Actualizado con datos del Vehículo');

                        // --- AUTO-ENRICH: Buscar FCC ID automáticamente ---
                        const keyResults = findKeyDetails(vinData.year, vinData.make, vinData.model);
                        if (keyResults && keyResults.length > 0 && !keyResults[0].db_miss) {
                            vinData.fcc_info = keyResults.map(k => ({
                                fccId: k.fccId,
                                frequency: k.frequency,
                                source: k.source,
                            }));
                            vinData.recommended_fcc = keyResults[0].fccId;
                            logger.info(`🔑 Auto-found FCC: ${keyResults[0].fccId} for ${vinData.make} ${vinData.model} ${vinData.year}`);
                        }
                    }

                    // Respondemos con el resultado enriquecido
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

                    // Format results for GPT - NEVER include supplier links (those are internal only)
                    let contentPayload = keyResults.map(r => ({
                        fccId: r.fccId,
                        frequency: r.frequency,
                        source: r.source,
                        note: r.note,
                    }));

                    // If no results found, tell GPT to proceed with price check anyway
                    if (keyResults.length > 0 && keyResults[0].db_miss) {
                        contentPayload = {
                            message: 'FCC no encontrado en base de datos. Procede con check_internal_key_cost usando año/marca/modelo.',
                            suggestion: 'Pide al cliente confirmar el modelo exacto o usa el FCC genérico.',
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

                    // 3. If still no price, request from owner WITH supplier links (INTERNAL ONLY)
                    const hasValidPrice = priceData && (
                        (Array.isArray(priceData) && priceData.some(p => p.price)) ||
                        (!Array.isArray(priceData) && priceData.price)
                    );

                    if (!hasValidPrice && args.make && args.model && args.year) {
                        // Generate supplier links for OWNER ONLY (never for client)
                        const supplierLinks = getSupplierLinks(args.make, args.model, args.year, args.fcc_id);
                        // const linksText = supplierLinks.map(l => `• ${l.name}: ${l.url}`).join('\n'); // Not used directly here

                        // Request price from owner via WhatsApp WITH supplier links
                        if (notificationCallback) {
                            const requestResult = await createPriceRequest(
                                notificationCallback, // Use the callback passed from sales_agent.js
                                senderNumber,
                                args.make,
                                args.model,
                                args.year,
                                'copy',
                                args.fcc_id
                            );
                            logger.info('📩 Price request sent to owner via callback');
                        } else {
                            logger.warn('⚠️ createPriceRequest skipped (Brain decoupling limitation - callback missing)');
                        }
                    }

                    messagesForAI.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: 'check_internal_key_cost',
                        content: JSON.stringify(priceData || { error: 'No price found' }),
                    });
                }
            }
        }

        // Guardar respuesta del Agente
        if (finalReply) {
            await supabase.from('conversations').insert({
                lead_id: leadId,
                role: 'assistant',
                content: finalReply,
            });
        }

        return finalReply;
    } catch (error) {
        logger.error('Error en getAIResponse:', error);
        return 'Lo siento, hubo un error al procesar tu solicitud.';
    }
}

module.exports = {
    getAIResponse,
    generateEmbedding
};
