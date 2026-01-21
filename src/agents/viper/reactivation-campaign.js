/**
 * Viper Reactivation Campaign Logic
 * Locates stale leads and generates re-engagement messages
 *
 * @module src/agents/viper/reactivation-campaign
 */
const { getSupabase } = require('../../core/supabase');
const { getOpenAI } = require('../../core/openai');
const logger = require('../../core/logger').child('ViperCampaign');

/**
 * Finds leads that have gone cold (no interaction for > 30 days)
 * @param {number} limit - Max leads to fetch
 * @returns {Promise<Array>} List of stale leads
 */
async function findStaleLeads(limit = 5) {
    try {
        const supabase = getSupabase();

        // Logic:
        // 1. Created more than 30 days ago
        // 2. Status is NOT 'won' (we don't want to bug happy customers yet)
        // 3. Status is NOT 'lost' (unless we want to try to win them back, but let's start with stalled ones)
        // 4. Ideally, we'd check last_interaction, but for now we'll use created_at as a proxy if interaction log isn't robust

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .lt('created_at', thirtyDaysAgo.toISOString())
            .neq('status', 'won')
            .neq('status', 'lost') // Optional: remove this if you want to reactivate lost leads
            .order('created_at', { ascending: false }) // Newest "old" leads first
            .limit(limit);

        if (error) throw error;

        return leads || [];
    } catch (e) {
        logger.error('Error finding stale leads:', e);
        return [];
    }
}

/**
 * Generates a personalized reactivation message using GPT-4o
 * @param {object} lead - Lead object
 * @returns {Promise<string>} The generated message
 */
async function generateReactivationMessage(lead) {
    try {
        const openai = getOpenAI();
        const carInfo = lead.vehicle_year && lead.vehicle_model
            ? `${lead.vehicle_year} ${lead.vehicle_make} ${lead.vehicle_model}`
            : 'su auto';

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are Viper, a helpful automotive locksmith assistant.
Your goal: Re-engage a customer who asked about a key months ago but stopped replying.
Tone: Casual, friendly, short (WhatsApp style). "Did you ever fix this?" approach.
Language: Spanish (Latin American).
Constraints:
- Mention the specific car if known (${carInfo}).
- DO NOT sound like a sales bot. Sound like a human checking in.
- Max 2 sentences.
- End with a low-pressure question.`
                },
                {
                    role: 'user',
                    content: `Customer Name: ${lead.name || 'Amigo'}\nCar: ${carInfo}\nOriginal Request: ${lead.notes || 'Car key quote'}`
                }
            ],
            max_tokens: 100
        });

        return response.choices[0].message.content.trim();
    } catch (e) {
        logger.error('Error generating reactivation message:', e);
        return `Hola ${lead.name || ''}, ¿cómo estás? Quería saber si lograste resolver lo de la llave de ${lead.vehicle_make || 'tu auto'}. Avisame si necesitas ayuda todavía.`;
    }
}

/**
 * Executes a dry run (logs messages but doesn't send)
 * @param {number} limit 
 */
async function dryRunCampaign(limit = 5) {
    logger.info(`Starting DRY RUN campaign (Limit: ${limit})...`);
    const leads = await findStaleLeads(limit);

    if (leads.length === 0) {
        logger.info('No stale leads found.');
        return [];
    }

    const results = [];
    for (const lead of leads) {
        const message = await generateReactivationMessage(lead);
        const result = {
            phone: lead.phone,
            name: lead.name,
            car: `${lead.vehicle_year || ''} ${lead.vehicle_make || ''} ${lead.vehicle_model || ''}`,
            proposedMessage: message
        };
        logger.info(`[DRY RUN] Would send to ${lead.phone}: "${message}"`);
        results.push(result);
    }
    return results;
}

module.exports = {
    findStaleLeads,
    generateReactivationMessage,
    dryRunCampaign
};
