/**
 * Test Google Places API
 * Run: node src/services/test-google-places.js
 */
require('dotenv').config();

const places = require('./google-places');

async function test() {
  console.log('Testing Google Places API...\n');

  // Test 1: Search transmission shops in Miami
  console.log('1. Searching transmission shops in Miami, Florida...');
  const result = await places.searchTransmissionShops('Miami', 'Florida');

  if (!result.success) {
    console.log('   Error:', result.error);
    return;
  }

  console.log('   Found:', result.total, 'shops\n');

  // Show first 5 results
  result.places.slice(0, 5).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.business_name}`);
    console.log(`      ${p.address}`);
    console.log(`      Rating: ${p.rating || 'N/A'} (${p.total_ratings || 0} reviews)\n`);
  });

  // Test 2: Get details for first result
  if (result.places.length > 0) {
    console.log('2. Getting details for first result...');
    const details = await places.getPlaceDetails(result.places[0].place_id);

    if (details.success) {
      const p = details.place;
      console.log(`   Name: ${p.business_name}`);
      console.log(`   Phone: ${p.phone || 'N/A'}`);
      console.log(`   Website: ${p.website || 'N/A'}`);
      console.log(`   Address: ${p.address}`);
    } else {
      console.log('   Error:', details.error);
    }
  }

  console.log('\nDone!');
}

test().catch(console.error);
