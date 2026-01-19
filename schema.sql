-- 1. Tabla de Clientes (Leads)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'new', -- new, qualified, closed_won, closed_lost
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 2. Tabla de Memoria (Conversaciones)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, -- Si borra lead, borra chat
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Seguridad (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 4. Políticas (Policies) - Permitir acceso total por ahora para pruebas (Service Role lo salta, pero esto ayuda si usas cliente anon)
-- OJO: Esto es permisivo. En producción idealmente restringimos más.
CREATE POLICY "Enable all for anon" ON leads FOR ALL USING (true);
CREATE POLICY "Enable all for anon" ON conversations FOR ALL USING (true);

-- 5. Tabla de Solicitudes de Precio (Owner-Approval Flow)
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
CREATE POLICY "Enable all for anon" ON price_requests FOR ALL USING (true);

-- 6. Tabla de Precios de Servicios
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
CREATE POLICY "Enable all for anon" ON service_prices FOR ALL USING (true);

-- 7. Tabla de Memoria de Agentes (Persistencia)
CREATE TABLE IF NOT EXISTS agent_memory (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON agent_memory FOR ALL USING (true);

-- 8. Tabla de Trabajos de Video (Video Jobs)
CREATE TABLE IF NOT EXISTS video_jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT,
  title TEXT,
  idea TEXT,
  prompt TEXT,
  captions JSONB,
  video_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON video_jobs FOR ALL USING (true);
