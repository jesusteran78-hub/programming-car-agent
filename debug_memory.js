require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuración directa para testear (usando lo que ya sabemos)
const supabaseUrl = process.env.SUPABASE_URL || 'https://fqzhajwnnkrkuktqquuj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_secret_I-WDDGh2jIYgkHwk0naeHw_S-RM1GZp';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMemory() {
  console.log('🕵️‍♂️ Iniciando Diagnóstico de Memoria...');
  const testPhone = '1234567890'; // Un numero fake para probar

  try {
    // 1. Intentar buscar/crear usuario
    console.log('1. Buscando usuario...');
    const { data: lead, error: searchError } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', testPhone)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('❌ Error Buscando Usuario:', searchError);
    }

    let leadId;
    if (!lead) {
      console.log('   Usuario no existe. Intentando crear...');
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert([{ phone: testPhone, name: 'Test User' }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error Creando Usuario:', createError);
        return;
      }
      leadId = newLead.id;
      console.log('✅ Usuario Creado:', leadId);
    } else {
      leadId = lead.id;
      console.log('✅ Usuario Encontrado:', leadId);
    }

    // 2. Intentar guardar conversación
    console.log('2. Guardando mensaje de prueba...');
    const { error: msgError } = await supabase.from('conversations').insert({
      lead_id: leadId,
      role: 'user',
      content: 'Hola desde el Debugger',
    });

    if (msgError) {
      console.error('❌ Error Guardando Mensaje:', msgError);
    } else {
      console.log('✅ Mensaje Guardado Correctamente');
    }
  } catch (e) {
    console.error('🔥 EXCEPCIÓN FATAL:', e);
  }
}

testMemory();
