/**
 * ATLAS CHRONOS: Daily Activity Report
 * Sends a nightly summary to the owner about Alex's activity
 *
 * @module src/chronos/daily_report
 */
require('dotenv').config();
const { getSupabase } = require('../core/supabase');
const { config } = require('../core/config');
const logger = require('../core/logger').child('Chronos');

async function sendWhatsApp(to, message) {
    if (!config.whapiToken) return;

    const axios = require('axios');
    try {
        await axios.post(
            'https://gate.whapi.cloud/messages/text',
            { to, body: message },
            { headers: { Authorization: `Bearer ${config.whapiToken}` } }
        );
    } catch (e) {
        logger.error(`Failed to send report: ${e.message}`);
    }
}

async function runDailyReport() {
    logger.info('Generating daily activity report...');
    const supabase = getSupabase();

    // Time range: Last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const since = yesterday.toISOString();

    // 1. New Leads
    const { data: leads } = await supabase
        .from('leads')
        .select('pipeline_status')
        .gt('created_at', since);

    const newLeads = leads?.length || 0;
    const international = leads?.filter(l => l.pipeline_status === 'INTERNATIONAL').length || 0;
    const validLeads = newLeads - international;

    // 2. Active Conversations
    const { data: msgs } = await supabase
        .from('conversations')
        .select('id')
        .gt('created_at', since)
        .eq('role', 'user');

    // Approximation of active chats
    const activeChats = msgs?.length || 0;

    // 3. Construct Report
    const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const report = `📊 **REPORTE DIARIO DE ALEX**
📅 ${dateStr}

👤 **Leads Nuevos:** ${validLeads}
🌍 **Tráfico Int. (ignorado):** ${international}
💬 **Mensajes Recibidos:** ${activeChats}

${validLeads === 0 && activeChats === 0 ? "⚠️ *Día tranquilo. Recomiendo subir historias de Instagram para generar tráfico.*" : "✅ *Sistema activo.*"}

_Alex está monitoreando 24/7._`;

    // 4. Send to Owner
    await sendWhatsApp(config.ownerPhone, report);
    logger.info('Daily report sent');
}

// Allow standalone execution
if (require.main === module) {
    runDailyReport();
}

module.exports = { runDailyReport };
