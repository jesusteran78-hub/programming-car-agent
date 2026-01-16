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
