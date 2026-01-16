// No require needed for native fetch in Node 20+
require('dotenv').config();

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const NEW_URL = 'https://programming-car-agent-alex-agent.tojkrl.easypanel.host/webhook';

async function updateWebhook() {
    console.log(`Updating Whapi webhook to: ${NEW_URL}`);

    const settings = {
        webhooks: [
            {
                url: NEW_URL,
                events: [
                    { type: "messages", method: "post" }
                ],
                active: true
            }
        ]
    };

    const options = {
        method: 'PATCH',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Bearer ${WHAPI_TOKEN}`
        },
        body: JSON.stringify(settings)
    };

    try {
        const response = await fetch('https://gate.whapi.cloud/settings', options);
        const data = await response.json();
        console.log('Whapi Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error updating webhook:', error);
    }
}

updateWebhook();
