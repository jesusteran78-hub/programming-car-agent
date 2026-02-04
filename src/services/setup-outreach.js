/**
 * Setup Outreach Tables in Supabase
 * Run: node src/services/setup-outreach.js
 */
require('dotenv').config();

const { getSupabase } = require('../core/supabase');

async function setupOutreachTables() {
  const supabase = getSupabase();
  console.log('Setting up outreach tables...\n');

  // Create outreach_leads table using raw SQL via RPC or direct insert test
  // Since Supabase JS client doesn't support CREATE TABLE, we'll check if tables exist
  // and create them via the REST API if needed

  // First, let's check if the table exists by trying to query it
  console.log('1. Checking if outreach_leads table exists...');
  const { data: existingData, error: checkError } = await supabase
    .from('outreach_leads')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.log('   Table does not exist. Creating via SQL...');

    // Use the Supabase SQL endpoint
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS outreach_leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_name TEXT,
            business_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            website TEXT,
            city TEXT,
            state TEXT,
            country TEXT DEFAULT 'United States',
            title TEXT,
            linkedin_url TEXT,
            source TEXT DEFAULT 'manual',
            status TEXT DEFAULT 'new',
            apollo_id TEXT,
            instantly_id TEXT,
            tags TEXT[],
            notes TEXT,
            raw_data JSONB,
            last_contact_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }),
    });

    if (!response.ok) {
      console.log('   Could not create via RPC. Trying direct table creation...');

      // Alternative: Try to insert a test row to trigger table auto-creation (won't work for non-existing tables)
      // Let's just insert data and see if the table was already created
      console.log('   NOTE: You need to create the table manually in Supabase SQL Editor.');
      console.log('   Copy and paste the SQL from: src/services/outreach-schema.sql');
    } else {
      console.log('   Table created successfully!');
    }
  } else if (checkError) {
    console.log(`   Error checking table: ${checkError.message}`);
  } else {
    console.log('   Table already exists!');
  }

  // Test insert
  console.log('\n2. Testing table with sample insert...');
  const { data: insertData, error: insertError } = await supabase
    .from('outreach_leads')
    .insert({
      business_name: 'Test Business',
      contact_name: 'Test Contact',
      email: 'test@example.com',
      source: 'test',
      status: 'new',
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '42P01') {
      console.log('   TABLE DOES NOT EXIST!');
      console.log('\n   ========================================');
      console.log('   MANUAL STEP REQUIRED:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Open your project');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Copy and paste the SQL from:');
      console.log('      src/services/outreach-schema.sql');
      console.log('   5. Run the SQL');
      console.log('   6. Then run this script again');
      console.log('   ========================================\n');
    } else {
      console.log(`   Insert error: ${insertError.message}`);
    }
  } else {
    console.log(`   Test insert successful! ID: ${insertData.id}`);

    // Clean up test data
    await supabase.from('outreach_leads').delete().eq('id', insertData.id);
    console.log('   Test data cleaned up.');
  }

  console.log('\nSetup complete!');
}

setupOutreachTables().catch(console.error);
