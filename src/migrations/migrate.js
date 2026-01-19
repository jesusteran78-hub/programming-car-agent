/**
 * ATLAS Database Migration Script
 * Executes SQL migrations directly via Supabase Management API
 *
 * Usage: node src/migrations/migrate.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Supabase Management API credentials
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_341e2d8c50b0059c624089e2f1b4bbdd5c229b93';
const PROJECT_REF = 'fqzhajwnnkrkuktqquuj';

/**
 * Executes SQL via Supabase Management API
 * @param {string} sql - SQL to execute
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function executeSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Runs all pending migrations
 */
async function runMigrations() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ATLAS Database Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find all migration files
  const migrationsDir = __dirname;
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found.');
    return;
  }

  console.log(`📋 Found ${migrationFiles.length} migration file(s):\n`);

  for (const file of migrationFiles) {
    console.log(`\n📄 Running: ${file}`);
    console.log('─'.repeat(50));

    const sqlPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split into individual statements (handling multi-line statements)
    const statements = splitSQLStatements(sql);

    console.log(`   Found ${statements.length} statement(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      // Get a preview of the statement
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ').trim();

      process.stdout.write(`   [${i + 1}/${statements.length}] ${preview}... `);

      const result = await executeSQL(stmt);

      if (result.success) {
        console.log('✅');
        successCount++;
      } else {
        // Check if error is "already exists" type - those are OK
        if (
          result.error.includes('already exists') ||
          result.error.includes('duplicate key')
        ) {
          console.log('⏭️  (exists)');
          successCount++;
        } else {
          console.log('❌');
          console.log(`      Error: ${result.error.substring(0, 100)}`);
          errorCount++;
        }
      }
    }

    console.log(`\n   Summary: ${successCount} succeeded, ${errorCount} failed`);
  }

  // Verify tables exist
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Verifying tables...\n');

  const tablesToCheck = [
    'events',
    'agents',
    'scheduled_jobs',
    'expenses',
    'outreach_campaigns',
    'leads',
    'conversations',
    'price_requests',
    'service_prices',
    'video_jobs',
  ];

  for (const table of tablesToCheck) {
    const result = await executeSQL(
      `SELECT COUNT(*) as count FROM ${table} LIMIT 1`
    );

    if (result.success) {
      console.log(`   ✅ ${table}`);
    } else {
      console.log(`   ❌ ${table} - ${result.error.substring(0, 50)}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Migration complete!\n');
}

/**
 * Splits SQL text into individual statements
 * Handles multi-line statements, comments, and preserves semicolons in strings
 * @param {string} sql - Raw SQL text
 * @returns {string[]} Array of SQL statements
 */
function splitSQLStatements(sql) {
  // First, remove single-line comments but preserve line structure
  const lines = sql.split('\n');
  const cleanedLines = lines.map((line) => {
    const commentIndex = line.indexOf('--');
    if (commentIndex === -1) return line;
    // Check if -- is inside a string (simplified check)
    const beforeComment = line.substring(0, commentIndex);
    const singleQuotes = (beforeComment.match(/'/g) || []).length;
    if (singleQuotes % 2 === 0) {
      // Not inside string, remove comment
      return line.substring(0, commentIndex);
    }
    return line;
  });

  const cleanedSQL = cleanedLines.join('\n');

  const statements = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < cleanedSQL.length; i++) {
    const char = cleanedSQL[i];
    const nextChar = cleanedSQL[i + 1];

    // Handle string literals (single quotes only in SQL)
    if (char === "'" && cleanedSQL[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
      } else {
        // Check for escaped quote ('')
        if (nextChar === "'") {
          current += char;
          i++; // Skip next quote
        } else {
          inString = false;
        }
      }
    }

    // Handle statement termination
    if (char === ';' && !inString) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Handle last statement without semicolon
  const lastStmt = current.trim();
  if (lastStmt.length > 0) {
    statements.push(lastStmt);
  }

  return statements;
}

// Run migrations
runMigrations().catch(console.error);
