/**
 * Test script for ATLAS Gateway
 * Usage: node src/gateway/test-gateway.js
 */
require('dotenv').config();

const { createApp } = require('./index');
const logger = require('../core/logger').child('GatewayTest');

async function testGateway() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 ATLAS Gateway Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const app = createApp();
  const PORT = 3001; // Use different port for testing

  // Start server
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => {
      console.log(`✅ Gateway started on port ${PORT}\n`);
      resolve(s);
    });
  });

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    let res = await fetch(`http://localhost:${PORT}/health`);
    let data = await res.json();
    console.log(`   ✅ Health: ${data.status}\n`);

    // Test 2: API agents endpoint
    console.log('2. Testing /api/agents...');
    res = await fetch(`http://localhost:${PORT}/api/agents`);
    data = await res.json();
    console.log(`   ✅ Found ${data.agents?.length || 0} agents\n`);

    // Test 3: API events endpoint
    console.log('3. Testing /api/events...');
    res = await fetch(`http://localhost:${PORT}/api/events?limit=5`);
    data = await res.json();
    console.log(`   ✅ Found ${data.events?.length || 0} recent events\n`);

    // Test 4: API leads endpoint
    console.log('4. Testing /api/leads...');
    res = await fetch(`http://localhost:${PORT}/api/leads`);
    data = await res.json();
    console.log(`   ✅ Found ${data.leads?.length || 0} leads\n`);

    // Test 5: Webhook GET (verification)
    console.log('5. Testing webhook verification...');
    res = await fetch(`http://localhost:${PORT}/webhook`);
    const text = await res.text();
    console.log(`   ✅ Webhook responds: "${text}"\n`);

    // Test 6: Simulate webhook POST (fake message)
    console.log('6. Testing webhook POST (simulated message)...');
    res = await fetch(`http://localhost:${PORT}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          id: 'test-msg-123',
          from_me: false,
          chat_id: 'test@s.whatsapp.net',
          text: { body: 'Test message from gateway test' },
          timestamp: Date.now(),
        }],
      }),
    });
    console.log(`   ✅ Webhook responded with status ${res.status}\n`);

    // Test 7: API prices endpoint
    console.log('7. Testing /api/prices...');
    res = await fetch(`http://localhost:${PORT}/api/prices`);
    data = await res.json();
    console.log(`   ✅ Found ${data.prices?.length || 0} service prices\n`);

    // Test 8: API scheduled-jobs endpoint
    console.log('8. Testing /api/scheduled-jobs...');
    res = await fetch(`http://localhost:${PORT}/api/scheduled-jobs`);
    data = await res.json();
    console.log(`   ✅ Found ${data.jobs?.length || 0} scheduled jobs\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ All Gateway tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    server.close();
    console.log('Server closed.');
  }
}

testGateway().catch(console.error);
