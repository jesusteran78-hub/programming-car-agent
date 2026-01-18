
async function sendTestWebhook() {
    const url = 'http://localhost:3000/webhook';
    const timestamp = new Date().toLocaleTimeString();

    const payload = {
        messages: [
            {
                from_me: false,
                chat_id: '1234567890@s.whatsapp.net', // Fake Client
                text: {
                    body: `Hola, precio llave perdida Toyota Corolla 2020, estoy en Miami - ${timestamp}`
                },
                type: 'text',
                timestamp: Date.now() / 1000
            }
        ]
    };

    try {
        console.log('Sending webhook to', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log('Status:', response.status);
        console.log('Text:', await response.text());
    } catch (e) {
        console.error('Error:', e);
    }
}

sendTestWebhook();
