-- ATLAS Migration 001: Event Bus Tables
-- Run this in Supabase SQL Editor

-- 1. Events Table (Core event bus for agent communication)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_agent TEXT NOT NULL,
  target_agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_agent);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Permissive policy (for now - tighten later)
DROP POLICY IF EXISTS "Enable all for events" ON events;
CREATE POLICY "Enable all for events" ON events FOR ALL USING (true);

-- 2. Agents Registry Table (Track active agents)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_heartbeat TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Permissive policy
DROP POLICY IF EXISTS "Enable all for agents" ON agents;
CREATE POLICY "Enable all for agents" ON agents FOR ALL USING (true);

-- 3. Insert default agents
INSERT INTO agents (id, name, status) VALUES
  ('gateway', 'Gateway', 'active'),
  ('alex', 'Alex (Sales)', 'active'),
  ('marcus', 'Marcus (Marketing)', 'active'),
  ('diego', 'Diego (Operations)', 'active'),
  ('sofia', 'Sofia (Finance)', 'inactive'),
  ('viper', 'Viper (Outreach)', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- 4. Add scheduled_jobs table for Diego
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agent_id TEXT DEFAULT 'diego',
  job_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  payload JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_time ON scheduled_jobs(scheduled_for);

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for scheduled_jobs" ON scheduled_jobs;
CREATE POLICY "Enable all for scheduled_jobs" ON scheduled_jobs FOR ALL USING (true);

-- 5. Add expenses table for Sofia
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'manual'
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for expenses" ON expenses;
CREATE POLICY "Enable all for expenses" ON expenses FOR ALL USING (true);

-- 6. Add outreach_campaigns table for Viper
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  target_list JSONB,
  template TEXT,
  sent_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for outreach_campaigns" ON outreach_campaigns;
CREATE POLICY "Enable all for outreach_campaigns" ON outreach_campaigns FOR ALL USING (true);

-- Done!
SELECT 'ATLAS Migration 001 Complete' as status;
