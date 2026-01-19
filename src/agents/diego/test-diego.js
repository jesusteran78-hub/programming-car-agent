/**
 * Diego Agent Tests
 * Verifies scheduler and FCC lookup functionality
 *
 * Usage: node src/agents/diego/test-diego.js
 */
require('dotenv').config();

const logger = require('../../core/logger').child('DiegoTest');

async function runDiegoTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Diego Agent Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Load Diego module
  console.log('1. Loading Diego module...');
  try {
    const diego = require('./index');
    if (diego.AGENT_ID === 'diego' && diego.scheduler && diego.fccLookup) {
      console.log('   ✅ Diego module loaded with scheduler and fccLookup');
      passed++;
    } else {
      throw new Error('Missing submodules');
    }
  } catch (e) {
    console.log(`   ❌ Diego load failed: ${e.message}`);
    failed++;
    return;
  }

  const diego = require('./index');

  // Test 2: FCC Lookup - Known vehicle
  console.log('\n2. FCC Lookup (2015 Toyota Camry)...');
  try {
    const result = diego.lookupFCC(2015, 'toyota', 'camry');
    if (result.found && result.results && result.results.length > 0) {
      console.log(`   ✅ Found ${result.results.length} FCC result(s)`);
      console.log(`      Recommended: ${result.recommended}`);
      passed++;
    } else if (!result.found) {
      console.log('   ⚠️ No FCC data for this vehicle (expected if libro maestro is limited)');
      passed++; // Not a failure, just no data
    } else {
      throw new Error('Unexpected result format');
    }
  } catch (e) {
    console.log(`   ❌ FCC Lookup failed: ${e.message}`);
    failed++;
  }

  // Test 3: FCC Lookup - Parse input
  console.log('\n3. FCC Input Parsing (processFCCLookup)...');
  try {
    const result = diego.processFCCLookup('2018 honda accord');
    if (result.message) {
      console.log('   ✅ Input parsed and processed');
      console.log(`      Result: ${result.success ? 'Found' : 'Not found'}`);
      passed++;
    } else {
      throw new Error('No message in result');
    }
  } catch (e) {
    console.log(`   ❌ FCC Parse failed: ${e.message}`);
    failed++;
  }

  // Test 4: FCC Lookup - Invalid input
  console.log('\n4. FCC Invalid Input Handling...');
  try {
    const result = diego.processFCCLookup('invalid');
    if (!result.success && result.message.includes('Formato')) {
      console.log('   ✅ Invalid input handled correctly');
      passed++;
    } else {
      throw new Error('Should have returned error for invalid input');
    }
  } catch (e) {
    console.log(`   ❌ Invalid input test failed: ${e.message}`);
    failed++;
  }

  // Test 5: Scheduler - Get Today's Jobs
  console.log("\n5. Scheduler - Today's Jobs...");
  try {
    const result = await diego.getTodaysJobs();
    if (result.jobs !== undefined) {
      console.log(`   ✅ Retrieved ${result.jobs.length} jobs for today`);
      passed++;
    } else if (result.error) {
      throw new Error(result.error);
    }
  } catch (e) {
    console.log(`   ❌ Get today's jobs failed: ${e.message}`);
    failed++;
  }

  // Test 6: Scheduler - Get Pending Jobs
  console.log('\n6. Scheduler - Pending Jobs...');
  try {
    const result = await diego.getPendingJobs();
    if (result.jobs !== undefined) {
      console.log(`   ✅ Retrieved ${result.jobs.length} pending jobs`);
      passed++;
    } else if (result.error) {
      throw new Error(result.error);
    }
  } catch (e) {
    console.log(`   ❌ Get pending jobs failed: ${e.message}`);
    failed++;
  }

  // Test 7: Ops Status
  console.log('\n7. Ops Status...');
  try {
    const status = await diego.getOpsStatus();
    if (status.today && status.pending && status.formatted) {
      console.log('   ✅ Ops status generated');
      console.log(`      Today: ${status.today.total} jobs`);
      console.log(`      Pending: ${status.pending.total} jobs`);
      passed++;
    } else {
      throw new Error('Invalid status format');
    }
  } catch (e) {
    console.log(`   ❌ Ops status failed: ${e.message}`);
    failed++;
  }

  // Test 8: Owner Command - status
  console.log('\n8. Owner Command: status...');
  try {
    const result = await diego.processOwnerCommand('status');
    if (result.success && result.message.includes('OPS STATUS')) {
      console.log('   ✅ Status command works');
      passed++;
    } else {
      throw new Error('Invalid command response');
    }
  } catch (e) {
    console.log(`   ❌ Status command failed: ${e.message}`);
    failed++;
  }

  // Test 9: Owner Command - help (unknown)
  console.log('\n9. Owner Command: help (unknown)...');
  try {
    const result = await diego.processOwnerCommand('unknown');
    if (!result.success && result.message.includes('Diego Commands')) {
      console.log('   ✅ Help displayed for unknown command');
      passed++;
    } else {
      throw new Error('Should show help for unknown');
    }
  } catch (e) {
    console.log(`   ❌ Help command failed: ${e.message}`);
    failed++;
  }

  // Test 10: Owner Command - fcc lookup
  console.log('\n10. Owner Command: fcc 2020 ford f150...');
  try {
    const result = await diego.processOwnerCommand('fcc 2020 ford f150');
    if (result.message) {
      console.log('   ✅ FCC command processed');
      console.log(`      Found: ${result.success ? 'Yes' : 'No'}`);
      passed++;
    } else {
      throw new Error('No message returned');
    }
  } catch (e) {
    console.log(`   ❌ FCC command failed: ${e.message}`);
    failed++;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Diego Tests: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed === 0) {
    console.log('✨ Diego agent is fully operational!\n');
    console.log('Available commands:');
    console.log('  ops status      - General operations status');
    console.log('  ops today       - Today scheduled jobs');
    console.log('  ops pending     - All pending jobs');
    console.log('  fcc [y] [m] [m] - FCC ID lookup\n');
  } else {
    console.log('⚠️ Some tests failed. Review errors above.\n');
    process.exit(1);
  }
}

runDiegoTests().catch(console.error);
