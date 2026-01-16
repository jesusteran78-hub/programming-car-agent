require('dotenv').config();
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const POSSIBLE_IDS = ['ROCKET-KT8RB', '17864782531', '7864782531'];

async function checkChannels() {
    console.log('🕵️ Probando IDs posibles...');

    for (const id of POSSIBLE_IDS) {
        console.log(`\n👉 Intentando con ID: ${id}`);
        try {
            const response = await fetch(`https://gate.whapi.cloud/settings?channel_id=${id}`, {
                method: 'GET',
                headers: {
                    authorization: `Bearer ${WHAPI_TOKEN}`
                }
            });
            const data = await response.json();
            console.log('Respuesta:', JSON.stringify(data).substring(0, 100));
            if (!data.error) {
                console.log('✅ ¡EXITO! Este es el ID correcto.');
                break;
            }
        } catch (error) {
            console.error('Error al conectar:', error.message);
        }
    }
}

checkChannels();
