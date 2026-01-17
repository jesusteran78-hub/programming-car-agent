/**
 * Setup script for price_requests table in Supabase
 * Run this once to create the table: node setup_price_requests.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function setup() {
  console.log('🔧 Setting up price_requests table...');

  // Check if table exists by trying to query it
  const { data, error } = await supabase.from('price_requests').select('id').limit(1);

  if (error && error.code === '42P01') {
    console.log('❌ Table does not exist. Please run this SQL in Supabase Dashboard:');
    console.log(`
-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS price_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT UNIQUE NOT NULL,
  client_phone TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  service_type TEXT DEFAULT 'copy',
  fcc_id TEXT,
  status TEXT DEFAULT 'pending',
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

ALTER TABLE price_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service" ON price_requests FOR ALL USING (true);
    `);
    return;
  }

  if (error) {
    console.log('⚠️ Error checking table:', error.message);
    return;
  }

  console.log('✅ price_requests table exists!');

  // Also check service_prices
  const { error: spError } = await supabase.from('service_prices').select('id').limit(1);

  if (spError && spError.code === '42P01') {
    console.log('❌ service_prices table does not exist. Please also run this SQL:');
    console.log(`
CREATE TABLE IF NOT EXISTS service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_start INTEGER NOT NULL,
  year_end INTEGER NOT NULL,
  service_type TEXT DEFAULT 'copy',
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service" ON service_prices FOR ALL USING (true);
    `);
    return;
  }

  if (spError) {
    console.log('⚠️ Error checking service_prices:', spError.message);
    return;
  }

  console.log('✅ service_prices table exists!');
  console.log('\n🎉 All tables are ready!');
}

setup();
