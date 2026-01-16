const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

const KIE_GET_TASK_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const BLOTATO_API_URL = "https://backend.blotato.com/v2/posts";

// The Task ID from the user's previous successful generation
const TASK_ID = "2eafde054c79a5e0895715fcce224fc6";

async function runManualPublish() {
    console.log("🚀 INICIANDO PRUEBA MANUAL DE PUBLICACIÓN (BLOTATO)...");

    // 1. GET VIDEO URL FROM KIE
    console.log(`\n📥 Buscando video en KIE (Task: ${TASK_ID})...`);
    let videoUrl = null;

    try {
        const kieRes = await axios.get(KIE_GET_TASK_URL, {
            params: { taskId: TASK_ID },
            headers: { 'Authorization': `Bearer ${process.env.KIE_API_KEY}` }
        });

        const taskData = kieRes.data.data;
        console.log("Status KIE:", taskData.status);

        if (taskData.state === 'success' || taskData.status === 'success') {
            // HANDLE JSON STRING IN 'resultJson'
            if (taskData.resultJson) {
                try {
                    const parsedResult = JSON.parse(taskData.resultJson);
                    if (parsedResult.resultUrls && parsedResult.resultUrls.length > 0) {
                        videoUrl = parsedResult.resultUrls[0];
                    }
                } catch (e) {
                    console.error("Error parsing resultJson string:", e);
                }
            }

            // Fallback checks
            if (!videoUrl) {
                if (taskData.result && taskData.result.videoPaths && taskData.result.videoPaths.length > 0) {
                    videoUrl = taskData.result.videoPaths[0];
                } else if (taskData.videoUrl) {
                    videoUrl = taskData.videoUrl;
                }
            }
        }

        if (!videoUrl) {
            console.error("❌ No se encontró URL de video en la respuesta de KIE.");
            console.log("Data dump:", JSON.stringify(taskData, null, 2));
            return;
        }

        console.log("✅ VIDEO ENCONTRADO:", videoUrl);

    } catch (error) {
        console.error("❌ Error fetching from KIE:", error.message);
        return;
    }

    // 2. DEFINE PLATFORM CAPTIONS (Test Data)
    const captions = {
        tiktok: "Probando motor de viralidad #ProgrammingCar #Test 🛠️",
        instagram: "Prueba de sistema automatizado. 🤖 #Tech #Miami",
        facebook: "Verificación de sistemas de publicación automática. 786-816-4874",
        youtube: "Prueba de Carga - Programming Car OS",
        twitter: "System check. 🤖 #Marketing"
    };

    // 3. PUBLISH TO BLOTATO
    console.log("\n📡 ENVIANDO A REDES SOCIALES...");
    const targets = [
        { id: process.env.BLOTATO_ACCOUNT_ID, platform: 'tiktok', caption: captions.tiktok },
        { id: process.env.BLOTATO_INSTAGRAM_ID, platform: 'instagram', caption: captions.instagram },
        { id: process.env.BLOTATO_YOUTUBE_ID, platform: 'youtube', caption: captions.youtube },
        { id: process.env.BLOTATO_TWITTER_ID, platform: 'twitter', caption: captions.twitter },
        { id: process.env.BLOTATO_FACEBOOK_ID, platform: 'facebook', caption: captions.facebook }
    ].filter(t => t.id);

    console.log(`Found ${targets.length} targets configured.`);

    for (const target of targets) {
        try {
            console.log(`\n👉 Publicando en ${target.platform.toUpperCase()} (ID: ${target.id})...`);

            const payload = {
                accountId: target.id,
                content: {
                    text: target.caption,
                    mediaUrls: [videoUrl],
                    platform: target.platform
                },
                target: {
                    targetType: 'Account',
                    platform: target.platform
                }
            };

            // Console log payload for debugging
            // console.log("Payload:", JSON.stringify(payload, null, 2));

            const blotatoResponse = await axios.post(BLOTATO_API_URL, { post: payload }, {
                headers: { 'Authorization': `Bearer ${process.env.BLOTATO_API_KEY}` }
            });

            console.log(`✅ ÉXITO en ${target.platform}:`, blotatoResponse.data);

        } catch (blotatoError) {
            console.error(`❌ ERROR en ${target.platform}:`, blotatoError.response?.data || blotatoError.message);
        }
    }
}

runManualPublish();
