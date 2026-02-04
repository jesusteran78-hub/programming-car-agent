/**
 * Test Apollo API Connection
 * Run: node src/services/test-apollo.js
 */
require('dotenv').config();

const apollo = require('./apollo');

async function testApollo() {
  console.log('Testing Apollo API...\n');

  // Test 1: Get saved lists
  console.log('1. Getting saved lists...');
  const listsResult = await apollo.getSavedLists();
  if (listsResult.success) {
    console.log(`   Found ${listsResult.lists.length} lists`);
    listsResult.lists.forEach((list) => {
      console.log(`   - ${list.name} (${list.cached_count || 0} contacts)`);
    });
  } else {
    console.log(`   Error: ${listsResult.error}`);
  }

  console.log('');

  // Test 2: Search for transmission shops in Florida
  console.log('2. Searching for transmission shops in Florida...');
  const searchResult = await apollo.searchTransmissionShops('Florida', 5);
  if (searchResult.success) {
    console.log(`   Found ${searchResult.total} total results`);
    console.log(`   Showing first ${searchResult.people.length}:`);
    searchResult.people.forEach((person) => {
      const lead = apollo.transformToLead(person);
      console.log(`   - ${lead.contact_name} @ ${lead.business_name}`);
      console.log(`     Email: ${lead.email || 'N/A'}`);
      console.log(`     Phone: ${lead.phone || 'N/A'}`);
      console.log(`     Location: ${lead.city}, ${lead.state}`);
      console.log('');
    });
  } else {
    console.log(`   Error: ${searchResult.error}`);
  }

  console.log('\nApollo test complete!');
}

testApollo().catch(console.error);
