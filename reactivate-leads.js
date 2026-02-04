/**
 * Lead Reactivation Script
 * Sends follow-up messages to leads that didn't convert
 *
 * Run: node reactivate-leads.js [limit]
 * Example: node reactivate-leads.js 5  (sends to 5 leads)
 */
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const WHAPI_URL = 'https://gate.whapi.cloud/messages/text';

// Reactivation messages based on what they were looking for
const MESSAGES = {
  tcm: `Hola! Soy Alex de Programming Car.

Vi que preguntaste por un TCM hace unos días.

Tenemos TCM 6L80/6L90 programados a $500 con envío GRATIS y 1 año de garantía.

¿Todavía lo necesitas?`,

  transmission: `Hola! Soy Alex de Programming Car.

Vi que preguntaste por una transmisión 6L80.

La tenemos remanufacturada completa a $2,500 con TCM nuevo incluido, envío gratis y 1 año de garantía.

¿Te interesa?`,

  keys: `Hola! Soy Alex de Programming Car.

Vi que preguntaste por llaves hace unos días.

¿Pudiste resolver? Si todavía necesitas ayuda, estoy aquí.`,

  general: `Hola! Soy Alex de Programming Car.

Te escribí hace unos días sobre tu vehículo.

¿Pudiste resolver lo que necesitabas? Si no, estoy aquí para ayudarte.`
};

/**
 * Detects what the lead was looking for based on conversation
 */
async function detectLeadIntent(leadId) {
  const { data: convos } = await supabase
    .from('conversations')
    .select('content')
    .eq('lead_id', leadId)
    .eq('role', 'user')
    .order('created_at', { ascending: true })
    .limit(5);

  if (!convos || convos.length === 0) return 'general';

  const allText = convos.map(c => c.content?.toLowerCase() || '').join(' ');

  if (allText.includes('tcm') || allText.includes('modulo') || allText.includes('6l80') || allText.includes('6l90')) {
    return 'tcm';
  }
  if (allText.includes('transmision') || allText.includes('transmission') || allText.includes('caja')) {
    return 'transmission';
  }
  if (allText.includes('llave') || allText.includes('key') || allText.includes('perdida') || allText.includes('lost')) {
    return 'keys';
  }

  return 'general';
}

/**
 * Sends WhatsApp message via Whapi
 */
async function sendWhatsApp(phone, message) {
  try {
    const response = await axios.post(WHAPI_URL, {
      to: phone,
      body: message
    }, {
      headers: {
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return { success: true, messageId: response.data?.message?.id };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
}

/**
 * Main reactivation function
 */
async function reactivateLeads(limit = 5, dryRun = true) {
  console.log(`\n=== LEAD REACTIVATION ${dryRun ? '(DRY RUN)' : '(LIVE)'} ===\n`);

  // Get leads that are still in NUEVO or COTIZANDO status
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, phone, name, make, model, year, pipeline_status, created_at')
    .in('pipeline_status', ['NUEVO', 'COTIZANDO'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log(`Found ${leads.length} leads to reactivate\n`);

  const results = [];

  for (const lead of leads) {
    const intent = await detectLeadIntent(lead.id);
    const message = MESSAGES[intent];
    const phone = lead.phone;

    console.log('━'.repeat(50));
    console.log(`📱 ${phone}`);
    console.log(`🚗 ${lead.year || '?'} ${lead.make || '?'} ${lead.model || '?'}`);
    console.log(`🎯 Intent: ${intent}`);
    console.log(`📝 Message preview: ${message.substring(0, 100)}...`);

    if (dryRun) {
      console.log(`⏸️  DRY RUN - Message NOT sent`);
      results.push({ phone, intent, status: 'dry_run' });
    } else {
      const result = await sendWhatsApp(phone, message);
      if (result.success) {
        console.log(`✅ Message sent!`);

        // Log to conversations
        await supabase.from('conversations').insert({
          lead_id: lead.id,
          role: 'assistant',
          content: `[REACTIVATION] ${message}`
        });

        results.push({ phone, intent, status: 'sent' });
      } else {
        console.log(`❌ Failed: ${result.error}`);
        results.push({ phone, intent, status: 'failed', error: result.error });
      }

      // Wait 2 seconds between messages to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n━'.repeat(50));
  console.log('SUMMARY:');
  console.log(`Total: ${results.length}`);
  console.log(`Sent: ${results.filter(r => r.status === 'sent').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);
  console.log(`Dry Run: ${results.filter(r => r.status === 'dry_run').length}`);

  return results;
}

// Parse command line args
const args = process.argv.slice(2);
const limit = parseInt(args[0]) || 5;
const dryRun = !args.includes('--live');

if (!dryRun) {
  console.log('\n⚠️  LIVE MODE - Messages will be sent!\n');
  console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');
  setTimeout(() => {
    reactivateLeads(limit, false).catch(console.error);
  }, 3000);
} else {
  console.log('\n📋 DRY RUN MODE - No messages will be sent\n');
  console.log('To send real messages, add --live flag:\n');
  console.log('  node reactivate-leads.js 5 --live\n');
  reactivateLeads(limit, true).catch(console.error);
}
