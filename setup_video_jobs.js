/**
 * Setup script for video_jobs table in Supabase
 * Run once: node setup_video_jobs.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function setupVideoJobsTable() {
  console.log('🎬 Creando tabla video_jobs en Supabase...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS video_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'processing',
        idea TEXT,
        title TEXT,
        video_url TEXT,
        prompt TEXT,
        captions JSONB,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_video_jobs_job_id ON video_jobs(job_id);
      CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
    `,
  });

  if (error) {
    // Si no existe la función exec_sql, intentamos con SQL directo via REST
    console.log('⚠️ RPC no disponible, creando tabla manualmente...');

    // Intentar crear registro dummy para verificar si tabla existe
    const { error: insertError } = await supabase.from('video_jobs').insert({
      job_id: 'test_setup_' + Date.now(),
      status: 'test',
      idea: 'Setup test',
    });

    if (insertError && insertError.code === '42P01') {
      console.log('❌ La tabla no existe. Por favor, crea la tabla manualmente en Supabase SQL Editor:');
      console.log(`
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'processing',
  idea TEXT,
  title TEXT,
  video_url TEXT,
  prompt TEXT,
  captions JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_video_jobs_job_id ON video_jobs(job_id);
CREATE INDEX idx_video_jobs_status ON video_jobs(status);
      `);
      return;
    }

    if (!insertError || insertError.code !== '42P01') {
      // Tabla existe o fue creada, eliminar registro de prueba
      await supabase.from('video_jobs').delete().eq('job_id', 'test_setup_' + Date.now());
      console.log('✅ Tabla video_jobs ya existe o fue creada.');
    }
  } else {
    console.log('✅ Tabla video_jobs creada exitosamente.');
  }

  // Verificar
  const { data, error: selectError } = await supabase
    .from('video_jobs')
    .select('*')
    .limit(1);

  if (selectError) {
    console.log('❌ Error verificando tabla:', selectError.message);
  } else {
    console.log('✅ Verificación exitosa. Tabla lista para uso.');
  }
}

setupVideoJobsTable().catch(console.error);
