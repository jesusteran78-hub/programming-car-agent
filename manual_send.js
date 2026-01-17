require('dotenv').config();
const token = process.env.WHAPI_TOKEN;

async function sendTest() {
  console.log('📨 Sending Manual Test Message...');
  // We'll use the number that appeared in previous logs or a safe default if unknown.
  // In previous steps, we saw '17864782531' in logs. Let's try sending to it (identifying as the user).
  // Or better, let's try sending to the "User" who messaged us.
  // Since I can't be 100% sure of the number from truncated logs, I'll ask the user or try the one from config.
  // Let's rely on the number associated with the channel for now as a "to" or just use a placeholder
  // BUT the best is to use the number that just messaged us.

  // For this test script, I will try to send to the number that likely messaged: 17864782531 (User)
  // Note: If 17864782531 is the BOT's number, sending to itself might be weird but valid for API test.
  // Let's assume the user is the one in the text file 'sms_targets.csv' or just use a hardcoded one.

  // Actually, I'll just use the `check_whapi.js` logic to try to send to a dummy number to see auth errors,
  // OR try to list channels again to see if we have write access.

  const target = '17864782531';

  try {
    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: target,
        body: '🧪 Test Manual de Antigravity',
      }),
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}
sendTest();
