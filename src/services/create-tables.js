/**
 * Create Outreach Tables via Supabase SQL API
 * Run: node src/services/create-tables.js
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function executeSql(sql) {
  // Supabase doesn't have a direct SQL execution endpoint in the REST API
  // We need to use the postgres connection or create an RPC function
  // For now, let's use the pg library directly

  const { Pool } = require('pg');

  // Extract the connection details from SUPABASE_URL
  // Format: https://[project-ref].supabase.co
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

  const pool = new Pool({
    connectionString: `postgres://postgres.${projectRef}:${SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    const result = await client.query(sql);
    client.release();
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    await pool.end();
  }
}

async function createTables() {
  console.log('Creating outreach tables in Supabase...\n');

  const sql = `
    -- Table: outreach_leads
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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_email ON outreach_leads(email);
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_status ON outreach_leads(status);
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_source ON outreach_leads(source);
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_state ON outreach_leads(state);

    -- Table: outreach_sequences
    CREATE TABLE IF NOT EXISTS outreach_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES outreach_leads(id) ON DELETE CASCADE,
      campaign_id UUID,
      current_step INT DEFAULT 1,
      status TEXT DEFAULT 'active',
      next_action_at TIMESTAMP WITH TIME ZONE,
      next_action_type TEXT,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_outreach_sequences_lead ON outreach_sequences(lead_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_sequences_status ON outreach_sequences(status);

    -- Table: outreach_touches
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
      replied_at TIMESTAMP WITH TIME ZONE,
      reply_content TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_outreach_touches_lead ON outreach_touches(lead_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_touches_channel ON outreach_touches(channel);
  `;

  const result = await executeSql(sql);

  if (result.success) {
    console.log('Tables created successfully!');
  } else {
    console.log(`Error: ${result.error}`);
    console.log('\nTrying alternative method...');

    // If pg doesn't work, output instructions
    if (result.error.includes('pg')) {
      console.log('\nInstalling pg module...');
    }
  }
}

// Check if pg is installed
try {
  require('pg');
  createTables().catch(console.error);
} catch (e) {
  console.log('pg module not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install pg', { stdio: 'inherit' });
  createTables().catch(console.error);
}
