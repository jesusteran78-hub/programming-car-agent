/**
 * ATLAS Integration Test
 * Verifies all components are working together
 *
 * Usage: node src/test-atlas.js
 */
require('dotenv').config();

const logger = require('./core/logger').child('Test');

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 ATLAS Full Integration Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Core modules
  console.log('1. Core Modules...');
  try {
    const { config } = require('./core/config');
    const { getSupabase } = require('./core/supabase');
    const { getOpenAI } = require('./core/openai');
    const eventBus = require('./core/event-bus');

    if (config.supabaseUrl && getSupabase() && getOpenAI() && eventBus.EVENT_TYPES) {
      console.log('   ✅ All core modules loaded');
      passed++;
    } else {
      throw new Error('Missing core module');
    }
  } catch (e) {
    console.log(`   ❌ Core modules failed: ${e.message}`);
    failed++;
  }

  // Test 2: Event Bus
  console.log('\n2. Event Bus...');
  try {
    const eventBus = require('./core/event-bus');
    const pubResult = await eventBus.publishEvent(
      eventBus.EVENT_TYPES.AGENT_HEARTBEAT,
      'test-runner',
      { test: true }
    );
    if (pubResult.success) {
      console.log('   ✅ Event publishing works');
      passed++;
    } else {
      throw new Error(pubResult.error);
    }
  } catch (e) {
    console.log(`   ❌ Event Bus failed: ${e.message}`);
    failed++;
  }

  // Test 3: Gateway
  console.log('\n3. Gateway...');
  try {
    const { createApp } = require('./gateway');
    const app = createApp();
    if (app && app.listen) {
      console.log('   ✅ Gateway creates Express app');
      passed++;
    } else {
      throw new Error('Invalid app');
    }
  } catch (e) {
    console.log(`   ❌ Gateway failed: ${e.message}`);
    failed++;
  }

  // Test 4: Alex Agent
  console.log('\n4. Alex Agent...');
  try {
    const alex = require('./agents/alex');
    const { getPrompt } = require('./agents/alex/prompts');
    const { getTools } = require('./agents/alex/tools');
    const { executeTool } = require('./agents/alex/handlers');

    if (alex.AGENT_ID && getPrompt && getTools && executeTool) {
      console.log('   ✅ Alex agent modules loaded');
      passed++;
    } else {
      throw new Error('Missing Alex module');
    }
  } catch (e) {
    console.log(`   ❌ Alex Agent failed: ${e.message}`);
    failed++;
  }

  // Test 5: Marcus Agent
  console.log('\n5. Marcus Agent...');
  try {
    const marcus = require('./agents/marcus');
    if (marcus.AGENT_ID === 'marcus') {
      console.log('   ✅ Marcus agent loaded');
      passed++;
    } else {
      throw new Error('Invalid agent ID');
    }
  } catch (e) {
    console.log(`   ❌ Marcus Agent failed: ${e.message}`);
    failed++;
  }

  // Test 6: Diego Agent
  console.log('\n6. Diego Agent...');
  try {
    const diego = require('./agents/diego');
    if (diego.AGENT_ID === 'diego') {
      console.log('   ✅ Diego agent loaded');
      passed++;
    } else {
      throw new Error('Invalid agent ID');
    }
  } catch (e) {
    console.log(`   ❌ Diego Agent failed: ${e.message}`);
    failed++;
  }

  // Test 7: Sofia Agent
  console.log('\n7. Sofia Agent...');
  try {
    const sofia = require('./agents/sofia');
    if (sofia.AGENT_ID === 'sofia') {
      console.log('   ✅ Sofia agent loaded');
      passed++;
    } else {
      throw new Error('Invalid agent ID');
    }
  } catch (e) {
    console.log(`   ❌ Sofia Agent failed: ${e.message}`);
    failed++;
  }

  // Test 8: Viper Agent
  console.log('\n8. Viper Agent...');
  try {
    const viper = require('./agents/viper');
    if (viper.AGENT_ID === 'viper') {
      console.log('   ✅ Viper agent loaded');
      passed++;
    } else {
      throw new Error('Invalid agent ID');
    }
  } catch (e) {
    console.log(`   ❌ Viper Agent failed: ${e.message}`);
    failed++;
  }

  // Test 9: Database Tables
  console.log('\n9. Database Tables...');
  try {
    const { getSupabase } = require('./core/supabase');
    const supabase = getSupabase();

    const tables = ['events', 'agents', 'leads', 'conversations', 'service_prices', 'scheduled_jobs'];
    let allExist = true;

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code === '42P01') {
        console.log(`   ❌ Table missing: ${table}`);
        allExist = false;
      }
    }

    if (allExist) {
      console.log('   ✅ All required tables exist');
      passed++;
    } else {
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ Database check failed: ${e.message}`);
    failed++;
  }

  // Test 10: Agents Registry
  console.log('\n10. Agents Registry...');
  try {
    const { getSupabase } = require('./core/supabase');
    const supabase = getSupabase();

    const { data: agents } = await supabase.from('agents').select('id, name, status');

    if (agents && agents.length >= 6) {
      console.log(`   ✅ ${agents.length} agents registered`);
      agents.forEach(a => console.log(`      - ${a.id}: ${a.name} (${a.status})`));
      passed++;
    } else {
      throw new Error('Not enough agents registered');
    }
  } catch (e) {
    console.log(`   ❌ Agents Registry failed: ${e.message}`);
    failed++;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed === 0) {
    console.log('✨ ATLAS is fully operational!\n');
    console.log('📁 New Architecture:');
    console.log('   src/core/        - Shared infrastructure');
    console.log('   src/gateway/     - API entry point');
    console.log('   src/agents/alex/ - Sales agent (fully migrated)');
    console.log('   src/agents/marcus/ - Marketing (placeholder)');
    console.log('   src/agents/diego/ - Operations (placeholder)');
    console.log('   src/agents/sofia/ - Finance (placeholder)');
    console.log('   src/agents/viper/ - Outreach (placeholder)\n');
  } else {
    console.log('⚠️ Some tests failed. Review errors above.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
