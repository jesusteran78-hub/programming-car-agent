const { getSupabase } = require('../../core/supabase');
const { processKaiMessage } = require('./kai_agent');
const logger = require('../../core/logger').child({ module: 'KaiAgent' });

async function processOwnerCommand(command, messageBody) {
    try {
        // Basic routing for Kai
        // If command starts with !auto or !hub or !vender

        const action = command.split(' ')[0].toLowerCase();

        switch (action) {
            case '!vender':
            case '!sell':
                return await handleSellCommand(messageBody);
            case '!inventario':
            case '!stock':
                return await handleStockCommand();
            default:
                // Default to AI conversational mode for sales
                return await processKaiMessage(messageBody);
        }
    } catch (error) {
        logger.error('Error in Kai agent:', error);
        return '⚠️ Error en Auto Hub. Intenta de nuevo.';
    }
}

async function handleStockCommand() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('auto_hub_inventory')
        .select('*')
        .eq('status', 'available')
        .limit(5);

    if (error) {
        logger.error('Database error:', error);
        return 'Error consultando el inventario.';
    }

    if (!data || data.length === 0) {
        return '🚗 *Inventario Auto Hub*\n\nNo tengo autos registrados en este momento. Usa `!vender` para agregar uno.';
    }

    let response = '🚗 *Inventario Disponible*\n\n';
    data.forEach(car => {
        response += `• *${car.year} ${car.model} ${car.trim || ''}*\n  💰 $${car.price_export} (Export)\n`;
    });

    return response;
}

async function handleSellCommand(details) {
    // Basic stub for adding cars manually via WhatsApp
    // Format: !vender Toyota Tundra 2025 Blanca 85000
    // reliable parsing would happen here or via AI extraction.
    return "📝 *Nuevo Ingreso*\n\nPara agregar un auto, por ahora necesito que lo hagas en la base de datos o usemos un formato estricto.\n\nPronto podré leer fotos.";
}

module.exports = { processOwnerCommand };
