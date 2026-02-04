/**
 * Create Outreach Tables via Direct Postgres Connection
 * Run: node src/services/create-tables-pg.js
 */
require('dotenv').config();

const { Pool } = require('pg');

// Supabase connection details
const PROJECT_REF = 'fqzhajwnnkrkuktqquuj';

// Try different connection methods
async function createTables() {
  console.log('Creating outreach tables via Postgres...\n');

  // Connection strings to try
  const connectionStrings = [
    // Pooler connection (transaction mode)
    `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    // Direct connection
    `postgresql://postgres:${process.env.SUPABASE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    // Session mode pooler
    `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  ];

  const sql = `
    -- Create outreach_leads table
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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_email ON outreach_leads(email);
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_status ON outreach_leads(status);
    CREATE INDEX IF NOT EXISTS idx_outreach_leads_state ON outreach_leads(state);

    -- Create outreach_sequences table
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

    -- Create outreach_touches table
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
  `;

  for (let i = 0; i < connectionStrings.length; i++) {
    console.log(`Trying connection method ${i + 1}...`);

    const pool = new Pool({
      connectionString: connectionStrings[i],
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      const client = await pool.connect();
      console.log('Connected! Creating tables...');

      await client.query(sql);
      console.log('SUCCESS! Tables created!');

      client.release();
      await pool.end();

      // Verify
      console.log('\nVerifying tables...');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

      const { data, error } = await supabase
        .from('outreach_leads')
        .select('id')
        .limit(1);

      if (error) {
        console.log(`Verification: ${error.message}`);
      } else {
        console.log('Verification: Table accessible via Supabase client!');
      }

      return;
    } catch (e) {
      console.log(`Failed: ${e.message}`);
      await pool.end().catch(() => {});
    }
  }

  console.log('\nCould not connect directly to database.');
  console.log('Please provide your Supabase database password.');
  console.log('You can find it in: Supabase Dashboard > Project Settings > Database > Connection string');
}

createTables().catch(console.error);
