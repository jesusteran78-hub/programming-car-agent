const { generateViralVideo } = require('./video_engine');

async function testFactory() {
    console.log("🧪 INICIANDO PRUEBA DE FÁBRICA DE VIDEO...");
    console.log("------------------------------------------------");

    const mockData = {
        title: "Llave de Mercedes Perdida",
        idea: "Cliente perdió llave de su C300 en la playa. Fuimos y la hicimos en 30 mins.",
        image: "https://example.com/mercedes.jpg"
    };

    try {
        const result = await generateViralVideo(mockData.title, mockData.idea, mockData.image);
        console.log("------------------------------------------------");
        console.log("✅ PRUEBA EXITOSA. RESULTADO:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ PRUEBA FALLIDA:", error);
    }
}

testFactory();
