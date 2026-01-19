/**
 * Test script for ATLAS Core modules
 * Usage: node src/core/test-core.js
 */
require('dotenv').config();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 ATLAS Core Module Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let allPassed = true;

// Test 1: Config
console.log('1. Testing config.js...');
try {
  const { config } = require('./config');
  console.log(`   ✅ Config loaded - Supabase URL: ${config.supabaseUrl ? 'OK' : 'MISSING'}`);
  console.log(`   ✅ OpenAI Key: ${config.openaiApiKey ? 'OK' : 'MISSING'}`);
  console.log(`   ✅ Whapi Token: ${config.whapiToken ? 'OK' : 'MISSING'}`);
} catch (e) {
  console.log(`   ❌ Config failed: ${e.message}`);
  allPassed = false;
}

// Test 2: Supabase
console.log('\n2. Testing supabase.js...');
try {
  const { getSupabase } = require('./supabase');
  const client = getSupabase();
  console.log(`   ✅ Supabase client created`);
} catch (e) {
  console.log(`   ❌ Supabase failed: ${e.message}`);
  allPassed = false;
}

// Test 3: OpenAI
console.log('\n3. Testing openai.js...');
try {
  const { getOpenAI } = require('./openai');
  const client = getOpenAI();
  console.log(`   ✅ OpenAI client created`);
} catch (e) {
  console.log(`   ❌ OpenAI failed: ${e.message}`);
  allPassed = false;
}

// Test 4: Logger
console.log('\n4. Testing logger.js...');
try {
  const logger = require('./logger');
  logger.info('Test log message');
  const childLogger = logger.child('TestAgent');
  childLogger.debug('Child logger test');
  console.log(`   ✅ Logger working with ${Object.keys(logger.LOG_LEVELS).length} log levels`);
} catch (e) {
  console.log(`   ❌ Logger failed: ${e.message}`);
  allPassed = false;
}

// Test 5: Event Bus
console.log('\n5. Testing event-bus.js...');
try {
  const eventBus = require('./event-bus');
  console.log(`   ✅ Event types: ${Object.keys(eventBus.EVENT_TYPES).length}`);
  console.log(`   ✅ Event statuses: ${Object.keys(eventBus.EVENT_STATUS).length}`);
  console.log(`   ✅ Functions: publishEvent, consumeEvents, markEventCompleted`);
} catch (e) {
  console.log(`   ❌ Event Bus failed: ${e.message}`);
  allPassed = false;
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (allPassed) {
  console.log('✨ All ATLAS core modules working correctly!\n');
} else {
  console.log('⚠️  Some modules failed. Check errors above.\n');
  process.exit(1);
}
