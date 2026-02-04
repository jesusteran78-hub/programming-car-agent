/**
 * Import Apollo CSV Leads into Supabase
 * Run: node src/services/import-apollo-leads.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { getSupabase } = require('../core/supabase');

async function importApolloLeads() {
  const supabase = getSupabase();

  console.log('Importing Apollo leads into Supabase...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '../../apollo_leads.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} leads in CSV\n`);

  // Transform and insert
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records) {
    try {
      // Skip if no email
      if (!record['Email']) {
        skipped++;
        continue;
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from('outreach_leads')
        .select('id')
        .eq('email', record['Email'])
        .single();

      if (existing) {
        console.log(`Skip (exists): ${record['Email']}`);
        skipped++;
        continue;
      }

      // Build lead object
      const lead = {
        contact_name: [record['First Name'], record['Last Name']].filter(Boolean).join(' ') || null,
        business_name: record['Company Name'] || record['Company Name for Emails'] || 'Unknown',
        email: record['Email'],
        phone: record['Mobile Phone'] || record['Work Direct Phone'] || record['Corporate Phone'] || null,
        website: record['Website'] || null,
        city: record['City'] || null,
        state: record['State'] || null,
        country: record['Country'] || 'United States',
        title: record['Title'] || null,
        linkedin_url: record['Person Linkedin Url'] || null,
        source: 'apollo',
        status: 'new',
        apollo_id: record['Apollo Contact Id'] || null,
        tags: ['transmission', 'florida', 'apollo-import'],
        raw_data: record,
      };

      // Insert
      const { error } = await supabase
        .from('outreach_leads')
        .insert(lead);

      if (error) {
        console.log(`Error: ${record['Email']} - ${error.message}`);
        errors++;
      } else {
        console.log(`Imported: ${lead.contact_name} (${lead.business_name})`);
        imported++;
      }
    } catch (e) {
      console.log(`Exception: ${e.message}`);
      errors++;
    }
  }

  console.log('\n========================================');
  console.log('IMPORT COMPLETE');
  console.log('========================================');
  console.log(`Total records: ${records.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('========================================\n');
}

importApolloLeads().catch(console.error);
