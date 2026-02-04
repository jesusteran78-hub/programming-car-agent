/**
 * Analyze Alex's conversations
 * Run: node analyze-alex.js
 */
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function main() {
  console.log('\n=== ALEX CONVERSATION ANALYSIS ===\n');

  // Get recent leads with conversations
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, name, phone, make, model, year, pipeline_status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
    return;
  }

  console.log(`Found ${leads.length} recent leads\n`);

  // For each lead, get their conversation
  for (const lead of leads) {
    const { data: convos } = await supabase
      .from('conversations')
      .select('role, content, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true })
      .limit(30);

    if (!convos || convos.length === 0) continue;

    console.log('━'.repeat(60));
    console.log(`📱 LEAD: ${lead.phone?.replace('@s.whatsapp.net', '')}`);
    console.log(`🚗 Vehicle: ${lead.year || '?'} ${lead.make || '?'} ${lead.model || '?'}`);
    console.log(`📊 Status: ${lead.pipeline_status}`);
    console.log(`📅 Created: ${new Date(lead.created_at).toLocaleDateString()}`);
    console.log('━'.repeat(60));

    for (const msg of convos) {
      const role = msg.role === 'user' ? '👤 CLIENTE' : '🤖 ALEX';
      const content = msg.content?.substring(0, 300) || '';
      console.log(`\n${role}:`);
      console.log(content);
      if (msg.content?.length > 300) console.log('...(truncated)');
    }

    console.log('\n');
  }

  // Get pipeline stats
  const { data: stats } = await supabase
    .from('leads')
    .select('pipeline_status');

  const statusCounts = {};
  (stats || []).forEach(l => {
    const status = l.pipeline_status || 'NUEVO';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('━'.repeat(60));
  console.log('📊 PIPELINE STATS:');
  console.log('━'.repeat(60));
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

main().catch(console.error);
