/**
 * Create Outreach Tables via Supabase HTTP API
 * Run: node src/services/create-tables-http.js
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function createTablesViaDashboard() {
  console.log('Creating outreach tables...\n');

  // Since we can\'t execute raw SQL via REST API directly,
  // let\'s use the Supabase client to create a simple function-based approach

  // First, let\'s check if we have a service role key
  const { createClient } = require('@supabase/supabase-js');

  // Try with service role key (full access)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // Test connection
  console.log('Testing connection...');
  const { data: testData, error: testError } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  if (testError && testError.code !== 'PGRST116') {
    console.log(`Connection test: ${testError.message}`);
  } else {
    console.log('Connection successful!');
  }

  // Try to create table via RPC if available
  console.log('\nAttempting to create table via exec_sql RPC...');

  const createTableSQL = `
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
      last_contact_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Try RPC approach (if a function exists)
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
    sql_query: createTableSQL,
  });

  if (rpcError) {
    if (rpcError.message.includes('does not exist')) {
      console.log('exec_sql function not available.');
      console.log('\nCreating exec_sql function first...');

      // We need to create this function in Supabase
      // This requires dashboard access
      console.log('\n========================================');
      console.log('QUICK SETUP - Copy this SQL to Supabase:');
      console.log('========================================\n');

      console.log(`
-- Go to: https://supabase.com/dashboard/project/fqzhajwnnkrkuktqquuj/sql/new
-- Paste this SQL and click "Run":

-- 1. Create outreach_leads table
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
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_outreach_leads_email ON outreach_leads(email);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_status ON outreach_leads(status);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_state ON outreach_leads(state);

-- 3. Create outreach_sequences table
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES outreach_leads(id) ON DELETE CASCADE,
  campaign_id UUID,
  current_step INT DEFAULT 1,
  status TEXT DEFAULT 'active',
  next_action_at TIMESTAMPTZ,
  next_action_type TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create outreach_touches table
CREATE TABLE IF NOT EXISTS outreach_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES outreach_leads(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  direction TEXT DEFAULT 'outbound',
  content TEXT,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  external_id TEXT,
  external_status TEXT,
  replied_at TIMESTAMPTZ,
  reply_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Done! Tables created successfully.
      `);

      console.log('\n========================================');
      console.log('After running the SQL, come back here.');
      console.log('========================================\n');

    } else {
      console.log(`RPC Error: ${rpcError.message}`);
    }
  } else {
    console.log('Table created via RPC!');
  }

  // Let's also try direct insert to check if table exists now
  console.log('\nChecking if table exists...');
  const { data: checkData, error: checkError } = await supabase
    .from('outreach_leads')
    .select('id')
    .limit(1);

  if (checkError) {
    if (checkError.message.includes('does not exist') || checkError.message.includes('not found')) {
      console.log('Table NOT found. Please run the SQL above in Supabase dashboard.');
    } else {
      console.log(`Check error: ${checkError.message}`);
    }
  } else {
    console.log('SUCCESS! Table exists and is ready to use!');
  }
}

createTablesViaDashboard().catch(console.error);
