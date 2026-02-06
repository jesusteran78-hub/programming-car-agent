CREATE TABLE IF NOT EXISTS auto_hub_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model TEXT NOT NULL,
    trim TEXT,
    year INTEGER,
    color TEXT,
    vin TEXT,
    price_local NUMERIC,
    price_export NUMERIC,
    status TEXT DEFAULT 'available',
    media_assets JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_hub_status ON auto_hub_inventory(status);
