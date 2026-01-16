const fs = require('fs');
const csv = require('csv-parser');
const { format } = require('@fast-csv/format');

// ==========================================
// CONFIGURACIÓN (¡EDITA ESTO!)
// ==========================================
// ==========================================
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const CHANNEL_ID = 'ROCKET-KT8RB'; // <--- ID DEL CANAL DETECTADO
const INPUT_FILE = 'sms_targets.csv';
const MESSAGE_TEMPLATE = `Hi {Name}, saw you work on GM transmissions.
We have **Sonnax Remanufactured TEHCMs (6L80/6L90)** in stock.
✅ **$500 USD** - Plug & Play (VIN Programmed + Calibrated).
✅ **Free Shipping** & **1 Year Warranty**.
🔄 **Core Exchange**: Warranty activates when you return the old core in the provided box.
Interested in grabbing one?`;

const DELAY_SECONDS = 60;

// Volvemos a la URL simple, sin channel_id, confiando en que el Token lo resuelva
const API_URL = 'https://gate.whapi.cloud/messages/text';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMessage(phone, name) {
    // Basic cleaning: remove + or spaces if whapi needs clean numbers, 
    // but usually Whapi accepts international format like 1786... or 1234...
    // Let's ensure it has no + just in case, based on Whapi docs usually strictly numerical.
    const cleanPhone = phone.replace(/\D/g, '');

    // Personalize message
    const body = MESSAGE_TEMPLATE.replace('{Name}', name || 'Amigo');

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Bearer ${WHAPI_TOKEN}`
        },
        body: JSON.stringify({
            typing_time: 0,
            to: cleanPhone,
            body: body
        })
    };

    try {
        const response = await fetch(API_URL, options);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function processCampaign() {
    if (WHAPI_TOKEN === 'AQUI_VA_TU_TOKEN_LARGO') {
        console.error('❌ ERROR: No has puesto tu API Token.');
        console.error('Abre el archivo whapi_sender.js y pega tu token en la línea 7.');
        return;
    }

    console.log('🚀 Iniciando Campaña de WhatsApp...');
    console.log(`Mensaje: "${MESSAGE_TEMPLATE}"`);
    console.log(`Velocidad: 1 mensaje cada ${DELAY_SECONDS} segundos.`);
    console.log('-------------------------------------------');

    let rows = [];

    fs.createReadStream(INPUT_FILE)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', async () => {
            console.log(`Cargados ${rows.length} contactos.`);

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const name = row.Name || row.name || 'Colega';
                const phone = row.CLEAN_PHONE || row.Phone; // Usamos el teléfono limpio del script anterior

                if (!phone) {
                    console.log(`[${i + 1}/${rows.length}] ❌ Saltando: Sin número válido.`);
                    continue;
                }

                process.stdout.write(`[${i + 1}/${rows.length}] Enviando a ${name} (${phone})... `);

                const result = await sendMessage(phone, name);

                if (result.success) {
                    console.log('✅ ENVIADO');
                } else {
                    console.log(`❌ ERROR: ${JSON.stringify(result.data || result.error)}`);
                }

                if (i < rows.length - 1) {
                    process.stdout.write(`   Esperando ${DELAY_SECONDS}s para el siguiente...\n`);
                    await sleep(DELAY_SECONDS * 1000);
                }
            }

            console.log('-------------------------------------------');
            console.log('🏁 Campaña Finalizada.');
        });
}

processCampaign();
