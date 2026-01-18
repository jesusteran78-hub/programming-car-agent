-- Tabla para Cuentas por Pagar (Gastos)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, -- e.g. "Pago de Tokens NASTF"
  supplier TEXT, -- e.g. "AutoCode"
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending', -- pending, paid, overdue
  category TEXT, -- software, hardware, office, salaries
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Habilitar seguridad (abierto para desarrollo)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anon" ON expenses FOR ALL USING (true);
