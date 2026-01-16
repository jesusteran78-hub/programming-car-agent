const axios = require('axios');
require('dotenv').config();

// Recuparamos la API Key que estaba mal puesta en ACCOUNT_ID o la que esté disponible
// En el paso anterior vi que estaba en ACCOUNT_ID en el archivo .env
const MISPLACED_KEY = process.env.BLOTATO_ACCOUNT_ID;
const REAL_API_KEY = process.env.BLOTATO_API_KEY || MISPLACED_KEY;

// Endpoint descubierto en la búsqueda
const ACCOUNTS_ENDPOINT = "https://backend.blotato.com/v2/users/me/accounts";

async function getBlotatoAccounts() {
    console.log("🥔 INICIANDO DEBUG DE BLOTATO...");
    console.log(`🔑 Probando con API KEY: ${REAL_API_KEY ? REAL_API_KEY.substring(0, 5) + "..." : "❌ FALTANTE"}`);

    if (!REAL_API_KEY) {
        console.error("❌ No hay API Key disponible para probar.");
        return;
    }

    try {
        console.log(`🚀 Consultando cuentas en: ${ACCOUNTS_ENDPOINT}`);
        const response = await axios.get(ACCOUNTS_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${REAL_API_KEY}`
            }
        });

        console.log("\n✅ RESPUESTA EXITOSA (200 OK):");
        console.log(JSON.stringify(response.data, null, 2));

        const accounts = response.data; // Según docs devuelve una lista
        if (Array.isArray(accounts) && accounts.length > 0) {
            console.log("\n🆔 Cuentas Encontradas:");
            accounts.forEach(acc => {
                console.log(`- [${acc.platform}] ${acc.fullname} (@${acc.username}) -> ID: ${acc.id}`);
            });
            console.log(`\n👉 USA ESTE ID EN .env: ${accounts[0].id}`);
        } else {
            console.warn("\n⚠️ No se encontraron cuentas conectadas.");
        }

    } catch (error) {
        console.error("\n❌ ERROR DE CONEXIÓN:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
    }
}

getBlotatoAccounts();
