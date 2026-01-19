/**
 * ATLAS Agent: Sofia (Finance)
 * Handles expenses, invoices, and financial tracking
 *
 * STATUS: Placeholder with basic expense tracking
 *
 * @module src/agents/sofia
 */
require('dotenv').config();

const logger = require('../../core/logger').child('Sofia');
const { getSupabase } = require('../../core/supabase');
const {
  consumeEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  registerHeartbeat,
  EVENT_TYPES,
} = require('../../core/event-bus');

const AGENT_ID = 'sofia';

/**
 * Events that Sofia listens to
 */
const SUBSCRIBED_EVENTS = [
  EVENT_TYPES.PAYMENT_RECEIVED,
  EVENT_TYPES.INVOICE_CREATED,
  EVENT_TYPES.EXPENSE_RECORDED,
];

/**
 * Expense categories
 */
const EXPENSE_CATEGORIES = {
  parts: 'Partes y Refacciones',
  fuel: 'Combustible',
  tools: 'Herramientas',
  marketing: 'Marketing',
  office: 'Oficina',
  software: 'Software/Subscripciones',
  labor: 'Mano de Obra',
  other: 'Otros',
};

/**
 * Records an expense
 * @param {object} expense - Expense data
 * @returns {Promise<object>}
 */
async function recordExpense(expense) {
  const supabase = getSupabase();
  const { category, amount, description, receipt_url } = expense;

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        category,
        amount: parseFloat(amount),
        description,
        receipt_url,
        created_by: AGENT_ID,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info(`Expense recorded: $${amount} - ${category}`);
    return { success: true, expense: data };
  } catch (e) {
    logger.error('Error recording expense:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Gets today's expenses
 * @returns {Promise<object>}
 */
async function getTodayExpenses() {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return { expenses: [], error: error.message };
    }

    return { expenses: expenses || [], success: true };
  } catch (e) {
    logger.error('Error fetching today expenses:', e);
    return { expenses: [], error: e.message };
  }
}

/**
 * Gets monthly expenses summary
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<object>}
 */
async function getMonthlyExpenses(month = null, year = null) {
  const supabase = getSupabase();

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 1);

  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return { expenses: [], error: error.message };
    }

    // Calculate totals by category
    const byCategory = {};
    let total = 0;

    (expenses || []).forEach((e) => {
      const amount = parseFloat(e.amount) || 0;
      total += amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + amount;
    });

    return {
      expenses: expenses || [],
      total,
      byCategory,
      month: targetMonth,
      year: targetYear,
      success: true,
    };
  } catch (e) {
    logger.error('Error fetching monthly expenses:', e);
    return { expenses: [], error: e.message };
  }
}

/**
 * Formats expense summary for WhatsApp
 * @param {object} summary - Expense summary
 * @returns {string}
 */
function formatExpenseSummary(summary) {
  const { expenses, total, byCategory, month, year } = summary;

  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];

  let response = `**FINANZAS - Sofia**\n`;
  response += `**${monthNames[month - 1]} ${year}**\n\n`;

  response += `**Total Gastos:** $${total.toFixed(2)}\n\n`;

  if (Object.keys(byCategory).length > 0) {
    response += `**Por Categoria:**\n`;
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        const catName = EXPENSE_CATEGORIES[cat] || cat;
        response += `- ${catName}: $${amount.toFixed(2)}\n`;
      });
    response += '\n';
  }

  if (expenses.length > 0) {
    response += `**Ultimos gastos (${expenses.length}):**\n`;
    expenses.slice(0, 5).forEach((e) => {
      const date = new Date(e.created_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
      });
      response += `- ${date}: $${e.amount} - ${e.description || e.category}\n`;
    });
  }

  return response.trim();
}

/**
 * Parses expense input string
 * @param {string} input - Raw input (e.g., "50 fuel gas station")
 * @returns {object}
 */
function parseExpenseInput(input) {
  const parts = input.trim().split(/\s+/);

  if (parts.length < 2) {
    return {
      valid: false,
      error: 'Formato: [monto] [categoria] [descripcion]\nEjemplo: 50 fuel Pemex',
    };
  }

  const amount = parseFloat(parts[0]);

  if (isNaN(amount) || amount <= 0) {
    return {
      valid: false,
      error: 'El monto debe ser un numero positivo',
    };
  }

  const category = parts[1].toLowerCase();
  const description = parts.slice(2).join(' ') || category;

  // Validate category
  if (!EXPENSE_CATEGORIES[category]) {
    const validCats = Object.keys(EXPENSE_CATEGORIES).join(', ');
    return {
      valid: false,
      error: `Categoria invalida. Usa: ${validCats}`,
    };
  }

  return {
    valid: true,
    amount,
    category,
    description,
  };
}

/**
 * Processes owner command for Sofia
 * @param {string} command - Command string
 * @returns {Promise<object>}
 */
async function processOwnerCommand(command) {
  const cmd = command.toLowerCase().trim();

  // fin status / finanzas
  if (cmd === 'status' || cmd === 'finanzas' || cmd === 'fin' || cmd === 'fin status') {
    const summary = await getMonthlyExpenses();
    if (summary.error) {
      return { success: false, message: `Error: ${summary.error}` };
    }
    return {
      success: true,
      message: formatExpenseSummary(summary),
      data: summary,
    };
  }

  // fin today
  if (cmd === 'today' || cmd === 'hoy') {
    const result = await getTodayExpenses();
    if (result.error) {
      return { success: false, message: `Error: ${result.error}` };
    }

    if (result.expenses.length === 0) {
      return { success: true, message: 'Sin gastos registrados hoy.' };
    }

    let msg = `**Gastos de Hoy (${result.expenses.length}):**\n`;
    result.expenses.forEach((e) => {
      msg += `- $${e.amount} - ${e.description || e.category}\n`;
    });
    return { success: true, message: msg.trim(), data: result.expenses };
  }

  // fin add [amount] [category] [description]
  if (cmd.startsWith('add ') || cmd.startsWith('gasto ')) {
    const input = cmd.replace(/^(add|gasto)\s+/, '');
    const parsed = parseExpenseInput(input);

    if (!parsed.valid) {
      return { success: false, message: parsed.error };
    }

    const result = await recordExpense(parsed);
    if (!result.success) {
      return { success: false, message: `Error: ${result.error}` };
    }

    return {
      success: true,
      message: `Gasto registrado: $${parsed.amount} - ${parsed.description}`,
      data: result.expense,
    };
  }

  // fin categories
  if (cmd === 'categorias' || cmd === 'cats') {
    let msg = '**Categorias de Gastos:**\n';
    Object.entries(EXPENSE_CATEGORIES).forEach(([key, name]) => {
      msg += `- ${key}: ${name}\n`;
    });
    return { success: true, message: msg.trim() };
  }

  // Unknown command
  return {
    success: false,
    message:
      '**Sofia Commands:**\n' +
      '- fin status - Resumen del mes\n' +
      '- fin today - Gastos de hoy\n' +
      '- fin add [monto] [cat] [desc] - Registrar gasto\n' +
      '- fin categorias - Ver categorias',
  };
}

/**
 * Event consumer loop
 * @param {number} pollInterval - Milliseconds between polls
 */
async function startEventLoop(pollInterval = 15000) {
  logger.info('Starting Sofia event loop...');

  await registerHeartbeat(AGENT_ID, { status: 'inactive', version: '1.0.0' });

  const processEvents = async () => {
    try {
      const result = await consumeEvents(AGENT_ID, SUBSCRIBED_EVENTS, 5);

      if (!result.success || !result.data.length) {
        return;
      }

      for (const event of result.data) {
        logger.info(`Processing event: ${event.event_type}`);
        await markEventProcessing(event.id, AGENT_ID);

        try {
          let response;

          switch (event.event_type) {
            case EVENT_TYPES.EXPENSE_RECORDED:
              response = await recordExpense(event.payload);
              break;
            default:
              response = { status: 'pending_implementation' };
          }

          await markEventCompleted(event.id, AGENT_ID, response);
        } catch (error) {
          logger.error(`Error processing event ${event.id}:`, error);
          await markEventFailed(event.id, AGENT_ID, error.message);
        }
      }

      await registerHeartbeat(AGENT_ID, { lastProcessed: new Date().toISOString() });
    } catch (error) {
      logger.error('Event loop error:', error);
    }
  };

  await processEvents();
  setInterval(processEvents, pollInterval);
}

module.exports = {
  AGENT_ID,
  startEventLoop,

  // Owner commands
  processOwnerCommand,

  // Finance functions
  recordExpense,
  getTodayExpenses,
  getMonthlyExpenses,
  formatExpenseSummary,
  parseExpenseInput,

  // Constants
  EXPENSE_CATEGORIES,
};
