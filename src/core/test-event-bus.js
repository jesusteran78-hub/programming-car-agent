/**
 * Test script for ATLAS Event Bus - Database Integration
 * Usage: node src/core/test-event-bus.js
 */
require('dotenv').config();

const eventBus = require('./event-bus');
const { getSupabase } = require('./supabase');

async function testEventBus() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 ATLAS Event Bus Integration Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Publish an event
  console.log('1. Publishing test event...');
  const publishResult = await eventBus.publishEvent(
    eventBus.EVENT_TYPES.AGENT_HEARTBEAT,
    'test-agent',
    { message: 'ATLAS integration test', timestamp: new Date().toISOString() },
    null
  );

  if (publishResult.success) {
    console.log(`   ✅ Event published: ${publishResult.data?.id}`);
  } else {
    console.log(`   ❌ Publish failed: ${publishResult.error}`);
    return;
  }

  // Test 2: Consume events
  console.log('\n2. Consuming events for test-agent...');
  const consumeResult = await eventBus.consumeEvents('test-agent', [], 5);

  if (consumeResult.success) {
    console.log(`   ✅ Found ${consumeResult.data.length} pending event(s)`);
  } else {
    console.log(`   ❌ Consume failed: ${consumeResult.error}`);
    return;
  }

  // Test 3: Mark event as completed
  if (consumeResult.data.length > 0) {
    const event = consumeResult.data[0];
    console.log(`\n3. Marking event ${event.id} as completed...`);

    const completeResult = await eventBus.markEventCompleted(
      event.id,
      'test-agent',
      { result: 'Test passed' }
    );

    if (completeResult.success) {
      console.log(`   ✅ Event marked as completed`);
    } else {
      console.log(`   ❌ Complete failed: ${completeResult.error}`);
    }
  }

  // Test 4: Register heartbeat
  console.log('\n4. Registering agent heartbeat...');
  const heartbeatResult = await eventBus.registerHeartbeat('test-agent', {
    version: '1.0.0',
    testRun: true,
  });

  if (heartbeatResult.success) {
    console.log(`   ✅ Heartbeat registered`);
  } else {
    console.log(`   ❌ Heartbeat failed: ${heartbeatResult.error}`);
  }

  // Test 5: Get recent events
  console.log('\n5. Fetching recent events...');
  const recentResult = await eventBus.getRecentEvents(10);

  if (recentResult.success) {
    console.log(`   ✅ Retrieved ${recentResult.data.length} recent event(s)`);
    if (recentResult.data.length > 0) {
      console.log(`   Last event: ${recentResult.data[0].event_type} from ${recentResult.data[0].source_agent}`);
    }
  } else {
    console.log(`   ❌ Fetch failed: ${recentResult.error}`);
  }

  // Verify agents table
  console.log('\n6. Checking agents registry...');
  const supabase = getSupabase();
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*');

  if (agentsError) {
    console.log(`   ❌ Agents query failed: ${agentsError.message}`);
  } else {
    console.log(`   ✅ Found ${agents.length} registered agent(s):`);
    agents.forEach((a) => {
      console.log(`      - ${a.id}: ${a.name} (${a.status})`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Event Bus integration test complete!\n');
}

testEventBus().catch(console.error);
