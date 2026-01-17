const fs = require('fs');

try {
  const db = require('./custom_key_db.json');
  console.log(`Total Entries: ${db.length}`);

  // Normalize makes
  const makes = db.map((e) => e.make.trim());
  const uniqueMakes = [...new Set(makes)];

  console.log(`\nUnique Makes Found (${uniqueMakes.length}):`);
  uniqueMakes.sort().forEach((m) => console.log(` - ${m}`));

  // Check specific targets
  const targets = ['FORD', 'NISSAN', 'CHRYSLER', 'TOYOTA', 'VOLKSWAGEN', 'KIA'];
  console.log('\nTarget Check:');
  targets.forEach((t) => {
    const found = uniqueMakes.some((m) => m.toUpperCase().includes(t));
    console.log(` - ${t}: ${found ? '✅ FOUND' : '❌ MISSING'}`);
  });
} catch (err) {
  console.error('Error reading DB:', err);
}
