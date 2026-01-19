/**
 * ATLAS Migration Runner
 * Executes database migrations against Supabase
 *
 * Usage: node src/migrations/run_atlas_migration.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting ATLAS Migration...\n');

  // Verify environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  // Read migration SQL
  const migrationPath = path.join(__dirname, '001_atlas_events.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });

      if (error) {
        // Try raw query as fallback
        // Note: Supabase doesn't support arbitrary SQL via JS client
        // We'll need to run this manually in Supabase SQL Editor
        console.log(`⚠️  Statement ${i + 1}: ${preview}...`);
        console.log(`   (Run manually in Supabase SQL Editor)\n`);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1}: ${preview}...`);
        successCount++;
      }
    } catch (e) {
      console.log(`⚠️  Statement ${i + 1}: ${preview}...`);
      errorCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Migration Summary:');
  console.log(`   Attempted: ${statements.length}`);
  console.log(`   Needs manual execution in Supabase SQL Editor`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 INSTRUCTIONS:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project: programming-car');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste the contents of:');
  console.log('   src/migrations/001_atlas_events.sql');
  console.log('5. Click "Run"\n');

  // Verify tables exist by querying them
  console.log('🔍 Verifying existing tables...\n');

  const tables = ['events', 'agents', 'scheduled_jobs', 'expenses', 'outreach_campaigns'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      console.log(`❌ Table '${table}': NOT FOUND (run migration first)`);
    } else {
      console.log(`✅ Table '${table}': EXISTS`);
    }
  }

  console.log('\n✨ Migration check complete!\n');
}

runMigration().catch(console.error);
