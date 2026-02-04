-- =============================================
-- VIPER OUTREACH TABLES
-- Run this in Supabase SQL Editor
-- =============================================

-- Table: outreach_leads
-- Stores all leads for cold outreach campaigns
CREATE TABLE IF NOT EXISTS outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact Info
  contact_name TEXT,
  business_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Location
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'United States',

  -- Professional Info
  title TEXT,
  linkedin_url TEXT,

  -- Tracking
  source TEXT DEFAULT 'manual',  -- manual, apollo, google_places, csv
  status TEXT DEFAULT 'new',     -- new, contacted, interested, partner, rejected, unsubscribed

  -- External IDs
  apollo_id TEXT,
  instantly_id TEXT,

  -- Tags/Keywords
  tags TEXT[],

  -- Metadata
  notes TEXT,
  raw_data JSONB,

  -- Timestamps
  last_contact_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_outreach_leads_email ON outreach_leads(email);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_status ON outreach_leads(status);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_source ON outreach_leads(source);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_state ON outreach_leads(state);

-- Table: outreach_sequences
-- Tracks where each lead is in the outreach sequence
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES outreach_leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE CASCADE,

  current_step INT DEFAULT 1,
  status TEXT DEFAULT 'active',  -- active, paused, completed, stopped

  next_action_at TIMESTAMP WITH TIME ZONE,
  next_action_type TEXT,  -- email, sms, call

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_sequences_lead ON outreach_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_campaign ON outreach_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_status ON outreach_sequences(status);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_next_action ON outreach_sequences(next_action_at);

-- Table: outreach_touches
-- Log of all contact attempts (email, sms, call)
CREATE TABLE IF NOT EXISTS outreach_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES outreach_leads(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,

  channel TEXT NOT NULL,      -- email, sms, call, whatsapp
  direction TEXT DEFAULT 'outbound',  -- outbound, inbound

  content TEXT,
  subject TEXT,  -- for emails

  status TEXT DEFAULT 'sent',  -- sent, delivered, opened, clicked, replied, failed, bounced

  -- External tracking
  external_id TEXT,           -- ID from Instantly/Twilio
  external_status TEXT,

  -- Response tracking
  replied_at TIMESTAMP WITH TIME ZONE,
  reply_content TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_touches_lead ON outreach_touches(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_touches_channel ON outreach_touches(channel);
CREATE INDEX IF NOT EXISTS idx_outreach_touches_status ON outreach_touches(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to outreach_leads
DROP TRIGGER IF EXISTS update_outreach_leads_updated_at ON outreach_leads;
CREATE TRIGGER update_outreach_leads_updated_at
  BEFORE UPDATE ON outreach_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to outreach_sequences
DROP TRIGGER IF EXISTS update_outreach_sequences_updated_at ON outreach_sequences;
CREATE TRIGGER update_outreach_sequences_updated_at
  BEFORE UPDATE ON outreach_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'outreach_%';
