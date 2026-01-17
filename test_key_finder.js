const keyFinder = require('./key_finder');

console.log('Testing Key Finder with Custom DB...');

// Test Case 1: Acura MDX 2012 (Should be in acura-honda.txt)
// Expecting FCC ID N5F0602A1A (or similar from the file)
const car1 = { year: 2012, make: 'Acura', model: 'MDX' };
const results1 = keyFinder.findKeyDetails(car1.year, car1.make, car1.model);
console.log(`\nResults for ${car1.year} ${car1.make} ${car1.model}:`);
console.log(JSON.stringify(results1, null, 2));

// Test Case 2: Honda Civic 2008
const car2 = { year: 2008, make: 'Honda', model: 'Civic' };
const results2 = keyFinder.findKeyDetails(car2.year, car2.make, car2.model);
console.log(`\nResults for ${car2.year} ${car2.make} ${car2.model}:`);
console.log(JSON.stringify(results2, null, 2));

// Test Case 3: Random Make (Not in custom DB, checks generic fallback)
const car3 = { year: 2015, make: 'Toyota', model: 'Camry' }; // Assuming Toyota file parsed OR fallback
const results3 = keyFinder.findKeyDetails(car3.year, car3.make, car3.model);
console.log(`\nResults for ${car3.year} ${car3.make} ${car3.model}:`);
console.log(JSON.stringify(results3, null, 2));
