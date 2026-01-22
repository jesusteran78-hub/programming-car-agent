-- ============================================================
-- VIDEO FACTORY - Supabase Schema
-- Mirrors the Google Sheets UGC Video System
-- ============================================================

-- Drop existing table if needed (comment out in production)
-- DROP TABLE IF EXISTS video_factory;

CREATE TABLE IF NOT EXISTS video_factory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- INPUT FIELDS (from Google Sheets)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating_prompt', 'generating_video', 'processing', 'completed', 'failed', 'published')),
  product_name TEXT NOT NULL,           -- "BMW Key Programming"
  description TEXT,                      -- "Emergency key replacement at 3AM"
  scene TEXT,                           -- "South Beach parking lot at night"
  ideal_customer TEXT,                  -- "Luxury car owner locked out"
  photo_link TEXT,                      -- Reference image URL
  video_style TEXT DEFAULT 'ugc',       -- ugc, cinematic, viral, luxury, etc.

  -- PROCESSING FIELDS
  video_model TEXT DEFAULT 'sora-2-pro-image-to-video',
  task_id TEXT,                         -- KIE task ID
  generated_prompt TEXT,                -- The actual prompt sent to Sora 2

  -- OUTPUT FIELDS
  video_link TEXT,                      -- Final video URL (Cloudinary)
  raw_video_link TEXT,                  -- Original KIE video URL
  failure_message TEXT,                 -- Error details if failed

  -- SOCIAL CAPTIONS (auto-generated)
  tiktok_caption TEXT,
  instagram_caption TEXT,
  youtube_title TEXT,
  youtube_description TEXT,
  twitter_caption TEXT,
  facebook_caption TEXT,

  -- PUBLISHING STATUS
  published_tiktok BOOLEAN DEFAULT FALSE,
  published_instagram BOOLEAN DEFAULT FALSE,
  published_youtube BOOLEAN DEFAULT FALSE,
  published_twitter BOOLEAN DEFAULT FALSE,
  published_facebook BOOLEAN DEFAULT FALSE,

  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- OWNER
  created_by TEXT DEFAULT 'system'
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_video_factory_status ON video_factory(status);
CREATE INDEX IF NOT EXISTS idx_video_factory_created ON video_factory(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_video_factory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_factory_updated ON video_factory;
CREATE TRIGGER video_factory_updated
  BEFORE UPDATE ON video_factory
  FOR EACH ROW
  EXECUTE FUNCTION update_video_factory_timestamp();

-- Example insert
-- INSERT INTO video_factory (product_name, description, scene, ideal_customer, photo_link, video_style)
-- VALUES (
--   'BMW Key Programming',
--   'Cliente perdio su llave BMW en South Beach a las 2am',
--   'Parking lot de South Beach, noche, luces de neon',
--   'Dueno de BMW bloqueado fuera de su carro',
--   'https://example.com/photo.jpg',
--   'ugc'
-- );
