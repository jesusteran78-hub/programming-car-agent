// Native fetch
async function testWebhook() {
    console.log("🚀 Testing Local Webhook with Image...");

    const payload = {
        messages: [
            {
                chat_id: "1786TESTCHAT",
                from_me: false,
                text: { body: "" }, // Empty text, just image
                image: {
                    link: "https://s3.eu-central-1.wasabisys.com/in-files/17864782531/jpeg-2a433b09198f3bcb51a9-80b60429068f0a.jpeg"
                }
            }
        ]
    };

    try {
        const res = await fetch('http://localhost:3000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Response: ${res.status} ${res.statusText}`);
    } catch (e) {
        console.error("❌ Error hitting webhook:", e.message);
    }
}

testWebhook();
