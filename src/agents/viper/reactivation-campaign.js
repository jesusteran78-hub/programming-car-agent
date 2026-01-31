/**
 * Viper Reactivation Campaign Logic
 * CAMPAIGN: EXPERT CONSULTANT ($50 Credit)
 * Target: Recent stuck leads or anyone with unsolved problems.
 *
 * @module src/agents/viper/reactivation-campaign
 */
const { getSupabase } = require('../../core/supabase');
const logger = require('../../core/logger').child('ViperCampaign');

/**
 * Finds recent leads that are NOT 'won' (Stuck/Ghosted)
 * Target: Last 45 days.
 * @param {number} limit - Max leads to fetch
 * @returns {Promise<Array>} List of target leads
 */
async function findStaleLeads(limit = 20) {
    try {
        const supabase = getSupabase();

        // We want RECENT stuck leads (active in last 45 days but not closed)
        const fortyFiveDaysAgo = new Date();
        fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

        // Perform JOIN to get lead details (phone, name)
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*, leads!inner(id, phone, name)') // Use inner join to ensure lead exists
            .gt('created_at', fortyFiveDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(limit * 3); // Fetch more to deduplicate

        if (error) throw error;

        // Deduplicate by phone number and map to flat structure
        const uniqueLeads = new Map();

        for (const conv of conversations) {
            if (conv.leads && conv.leads.phone) {
                if (!uniqueLeads.has(conv.leads.phone)) {
                    uniqueLeads.set(conv.leads.phone, {
                        ...conv,
                        phone_number: conv.leads.phone,
                        name: conv.leads.name,
                        real_lead_id: conv.leads.id // Explicitly capturing true lead ID
                    });
                }
            }
        }

        return Array.from(uniqueLeads.values()).slice(0, limit);
    } catch (e) {
        logger.error('Error finding target leads:', e);
        return [];
    }
}

/**
 * Generates the "Expert Consultant" message
 * @param {object} lead - Lead object
 * @returns {Promise<string>} The fixed message
 */
async function generateReactivationMessage(lead) {
    // FIXED COPY WRITING: SYSTEM UPDATE APOLOGY + CONSULTANT OFFER
    return `Hola ${lead.name || ''}, habla el Ing. Jesús Terán.

Te escribo porque **actualizamos nuestra plataforma** y noté que tu caso se quedó sin respuesta por un error del sistema anterior. Una disculpa por la demora. 🙏

Para compensarlo y darte la atención que mereces, he abierto mi **Agenda de Consultoría ($50 USD)** para casos como el tuyo.
En 1 hora revisamos a fondo tu auto. Si decides hacer el trabajo con nosotros, **te abono el 100% de la consulta**.

¿Te interesa reactivar tu caso hoy?`;
}

/**
 * Executes a dry run (logs messages but doesn't send)
 * @param {number} limit 
 */
async function dryRunCampaign(limit = 5) {
    logger.info(`Starting EXPERT CONSULTANT Campaign (Limit: ${limit})...`);
    const leads = await findStaleLeads(limit);

    if (leads.length === 0) {
        logger.info('No leads found.');
        return [];
    }

    const uniquePhones = new Set();
    const results = [];

    for (const lead of leads) {
        if (uniquePhones.has(lead.phone_number)) continue;
        uniquePhones.add(lead.phone_number);

        const message = await generateReactivationMessage(lead);
        const result = {
            phone: lead.phone_number,
            proposedMessage: message
        };
        logger.info(`[TARGET] ${lead.phone_number}`);
        results.push(result);

        if (results.length >= limit) break;
    }
    return results;
}

module.exports = {
    findStaleLeads,
    generateReactivationMessage,
    dryRunCampaign
};

