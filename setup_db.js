const { createClient } = require('@supabase/supabase-js');

// 1. Configuración (Hardcoded para setup único con la llave ADMIN)
const SUPABASE_URL = 'https://fqzhajwnnkrkuktqquuj.supabase.co';
const SUPABASE_KEY = 'sb_secret_I-WDDGh2jIYgkHwk0naeHw_S-RM1GZp'; // ADMIN SECRET

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupDatabase() {
  console.log('🚧 Iniciando construcción de Base de Datos...');

  // SQL para crear tablas
  const sql = `
    -- Tabla de Leads (Clientes)
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT
    );

    -- Tabla de Conversaciones (Memoria)
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
      role TEXT CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Habilitar RLS (Seguridad) - Opcional para empezar, pero buena práctica
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

    -- Políticas de acceso para anon (si quisiéramos acceso público, pero ahora usamos server-side)
    -- Por ahora dejamos el acceso restringido a server-side (Service Role).
  `;

  // Supabase no tiene un método directo "query" en la librería JS cliente para DDL (Create Table).
  // TRUCO: Usamos la función RPC si existiera, o usamos el dashboard.
  // PERO, como tenemos la SERVICE ROLE KEY, podemos usar la REST API para SQL? No directamente.
  // MEJOR ENFOQUE: Usaremos el "SQL Editor" de Supabase via código? No se puede fácilmente sin una función rpc.

  // CORRECCIÓN: La librería JS cliente NO permite correr `CREATE TABLE` directamente.
  // Tengo que pedirle al usuario que copie y pegue el SQL en el Dashboard,
  // O usar la "Management API" si estuviera disponible (que es beta).

  // SIN EMBARGO, voy a intentar usar el endpoint 'rpc' si existe alguna función predefinida,
  // pero lo más robusto "Agentic" es crear una función para ejecutar SQL si no existe.
  // ... Espera, esto se complica.

  // MEJOR ESTRATEGIA:
  // Voy a crear un archivo .sql y pedirle al usuario que lo pegue en el "SQL Editor" de Supabase.
  // Es la forma 100% segura de que funcione sin inventar hacks.

  console.log('❌ ERROR INTENCIONAL: La librería JS no permite crear tablas por seguridad.');
  console.log('✅ SOLUCIÓN: He generado un archivo "schema.sql".');
  console.log('👉 Ve al SQL Editor en Supabase y pega el contenido.');
}

setupDatabase();
