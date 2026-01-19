-- ATLAS Migration 002: Fix scheduled_jobs table
-- The foreign key constraint was failing due to type mismatch

-- Create scheduled_jobs without foreign key constraint first
-- We'll use lead_id as reference but without strict FK
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_agent ON scheduled_jobs(agent_id);

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for scheduled_jobs" ON scheduled_jobs;
CREATE POLICY "Enable all for scheduled_jobs" ON scheduled_jobs FOR ALL USING (true);

SELECT 'ATLAS Migration 002 Complete - scheduled_jobs fixed' as status;
