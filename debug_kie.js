const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.KIE_API_KEY;
// Base configuration from User's OpenAPI Spec
const CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const PAYLOAD = {
    model: "sora-2-image-to-video",
    input: {
        prompt: "A vertical selfie-style video filmed by a Latino locksmith technician inside a real automotive key workshop. The creator wears a plain shirt with no logos, holding a BMW Smart Key replica clearly in one hand at chest level while filming themselves with their phone held at arm’s length. The background shows an authentic workbench with programming tools. The handheld camera gently shifts.",
        image_urls: ["https://res.cloudinary.com/dtfbdf4dn/image/upload/v1767016335/ugc-auto/efkofwjq0zydbz9c3ul7.png"],
        aspect_ratio: "portrait",
        n_frames: "15",
        size: "standard", // Included from user log, though not in spec enum? Spec says n_frames enum is string.
        remove_watermark: true
    }
};

async function debugKie() {
    console.log("🐛 INICIANDO DEBUG DE KIE API...");
    console.log(`🔑 API KEY: ${API_KEY ? "Cargada (" + API_KEY.substring(0, 5) + "...)" : "❌ FALTANTE"}`);
    console.log(`🔗 URL: ${CREATE_TASK_URL}`);
    console.log(`📦 PAYLOAD:`, JSON.stringify(PAYLOAD, null, 2));

    try {
        console.log("\n🚀 Enviando Petición...");
        const response = await axios.post(CREATE_TASK_URL, PAYLOAD, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("\n✅ RESPUESTA EXITOSA (200 OK):");
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.data && response.data.data.taskId) {
            console.log(`\n🆔 TASK ID RECIBIDO: ${response.data.data.taskId}`);
            console.log("🎉 CONEXIÓN CONFIRMADA. EL ENDPOINT ES CORRECTO.");
        } else {
            console.warn("\n⚠️ OJO: Respuesta 200 pero no veo 'taskId' en data.data.");
        }

    } catch (error) {
        console.error("\n❌ ERROR DE CONEXIÓN:");
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
            console.error("Headers:", JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            // The request was made but no response was received
            console.error("No se recibió respuesta del servidor (Network Error).");
            console.error(error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error Config:", error.message);
        }
    }
}

debugKie();
