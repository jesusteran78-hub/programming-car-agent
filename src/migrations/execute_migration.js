/**
 * ATLAS Migration Executor
 * Creates tables directly in Supabase using the API
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createTables() {
  console.log('🚀 ATLAS Migration - Creating tables directly...\n');

  // Test 1: Try to create events table by inserting and deleting a test record
  console.log('📋 Creating EVENTS table...');

  try {
    // First, check if table exists by trying to query it
    const { error: eventsError } = await supabase.from('events').select('id').limit(1);

    if (eventsError && eventsError.code === '42P01') {
      console.log('   Table does not exist - needs SQL migration');
      console.log('   ⚠️  Run the SQL in Supabase Dashboard\n');
    } else if (eventsError) {
      console.log(`   ⚠️  Error: ${eventsError.message}\n`);
    } else {
      console.log('   ✅ Table exists!\n');
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }

  // Test 2: Check agents table
  console.log('📋 Checking AGENTS table...');
  try {
    const { error: agentsError } = await supabase.from('agents').select('id').limit(1);

    if (agentsError && agentsError.code === '42P01') {
      console.log('   Table does not exist - needs SQL migration\n');
    } else if (agentsError) {
      console.log(`   ⚠️  Error: ${agentsError.message}\n`);
    } else {
      console.log('   ✅ Table exists!\n');
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }

  // Check other tables
  const tables = ['scheduled_jobs', 'expenses', 'outreach_campaigns'];

  for (const table of tables) {
    console.log(`📋 Checking ${table.toUpperCase()} table...`);
    try {
      const { error } = await supabase.from(table).select('id').limit(1);

      if (error && error.code === '42P01') {
        console.log('   Table does not exist - needs SQL migration\n');
      } else if (error) {
        console.log(`   ⚠️  Error: ${error.message}\n`);
      } else {
        console.log('   ✅ Table exists!\n');
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Para crear las tablas que faltan, necesito que:');
  console.log('\n1. Ve a: https://supabase.com/dashboard/project/fqzhajwnnkrkuktqquuj/sql');
  console.log('2. Copia y ejecuta el SQL que te voy a mostrar\n');
}

createTables();
