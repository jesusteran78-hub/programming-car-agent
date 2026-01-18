
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Mock specific internal functions to test only mergeVideoWithAudio
// We need to 'require' the real file but since it's a module, we can import it.
// However, the function `mergeVideoWithAudio` is not exported purely for standalone testing easily 
// unless we require the file. 

// Let's copy the function logic or require the module. 
// Since we modified video_engine.js, `mergeVideoWithAudio` IS exported. Perfect.

const { mergeVideoWithAudio } = require('./video_engine');

async function runTest() {
    console.log('🧪 Iniciando prueba de Marca de Agua...');

    // Use existing files from temp
    const videoName = 'video_1768653810749.mp4';
    const audioName = 'audio_1768653613716.mp3';

    // We need to mock axios.get because mergeVideoWithAudio expects a URL and tries to download it.
    // Instead of mocking a whole HTTP request, let's create a local test wrapper function
    // OR we can just use a file:// URL if axios supports it, but axios usually does http.

    // Hack: We will modify the test to use a local file copy instead of downloading
    // BUT we can't easily modify the imported function logic.

    // Alternative: We can spin up a quick local server to serve the file?
    // Or just create a "test_video_engine.js" that duplicates the logic? No that's bad.

    // Let's serve the file locally.
    const express = require('express');
    const app = express();
    const port = 3001;

    const tempDir = path.join(__dirname, 'temp');
    app.use('/temp', express.static(tempDir));

    const server = app.listen(port, async () => {
        console.log(`🔌 Servidor de archivos local iniciado en port ${port}`);

        const videoUrl = `http://localhost:${port}/temp/${videoName}`;
        const audioPath = path.join(tempDir, audioName);

        try {
            console.log(`🎞️ Procesando video: ${videoUrl}`);
            const finalUrl = await mergeVideoWithAudio(videoUrl, audioPath);
            console.log(`✅ Resultado Final: ${finalUrl}`);
        } catch (e) {
            console.error('❌ Error en prueba:', e);
        } finally {
            server.close();
            console.log('🔌 Servidor cerrado');
        }
    });
}

runTest();
