require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect() {
  console.log('🔍 Inspeccionando Base de Datos...');

  // 1. Ver últimos LEADS
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (leadsError) {console.error('❌ Error Leads:', leadsError);}
  else {console.log('👤 Últimos Leads:', JSON.stringify(leads, null, 2));}

  // 2. Ver últimas CONVERSATIONS
  const { data: msgs, error: msgsError } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (msgsError) {console.error('❌ Error Conversations:', msgsError);}
  else {console.log('💬 Últimos Mensajes:', JSON.stringify(msgs, null, 2));}
}

inspect();
