/**
 * ATLAS Supabase Client
 * Singleton pattern - single client instance for the entire application
 *
 * @module src/core/supabase
 */
const { createClient } = require('@supabase/supabase-js');
const { config } = require('./config');

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let supabaseInstance = null;

/**
 * Gets or creates the Supabase client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabase() {
  if (!supabaseInstance) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and Key must be configured');
    }

    supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseInstance;
}

/**
 * Executes a database query with error handling
 * @param {Function} queryFn - Function that receives supabase client and returns query
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function query(queryFn) {
  try {
    const supabase = getSupabase();
    const { data, error } = await queryFn(supabase);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Inserts a record into a table
 * @param {string} table - Table name
 * @param {object} record - Record to insert
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function insert(table, record) {
  return query(async (supabase) =>
    supabase.from(table).insert(record).select().single()
  );
}

/**
 * Updates records in a table
 * @param {string} table - Table name
 * @param {object} updates - Fields to update
 * @param {object} match - Where clause (eq conditions)
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function update(table, updates, match) {
  return query(async (supabase) => {
    let q = supabase.from(table).update(updates);
    for (const [key, value] of Object.entries(match)) {
      q = q.eq(key, value);
    }
    return q.select();
  });
}

/**
 * Selects records from a table
 * @param {string} table - Table name
 * @param {string} [columns='*'] - Columns to select
 * @param {object} [match={}] - Where clause (eq conditions)
 * @param {object} [options={}] - Additional options (limit, order, etc.)
 * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
 */
async function select(table, columns = '*', match = {}, options = {}) {
  return query(async (supabase) => {
    let q = supabase.from(table).select(columns);

    for (const [key, value] of Object.entries(match)) {
      q = q.eq(key, value);
    }

    if (options.order) {
      q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    if (options.limit) {
      q = q.limit(options.limit);
    }

    if (options.single) {
      return q.single();
    }

    return q;
  });
}

/**
 * Upserts a record (insert or update)
 * @param {string} table - Table name
 * @param {object} record - Record to upsert
 * @param {string} [onConflict] - Conflict column(s)
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function upsert(table, record, onConflict = undefined) {
  return query(async (supabase) =>
    supabase.from(table).upsert(record, { onConflict }).select().single()
  );
}

/**
 * Deletes records from a table
 * @param {string} table - Table name
 * @param {object} match - Where clause (eq conditions)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function remove(table, match) {
  return query(async (supabase) => {
    let q = supabase.from(table).delete();
    for (const [key, value] of Object.entries(match)) {
      q = q.eq(key, value);
    }
    return q;
  });
}

module.exports = {
  getSupabase,
  query,
  insert,
  update,
  select,
  upsert,
  remove,
};
