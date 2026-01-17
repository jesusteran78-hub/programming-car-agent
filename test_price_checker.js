const { checkInternalPrices } = require('./price_checker');

async function test() {
  console.log('Checking price for Chevrolet Silverado 2015...');
  const results = await checkInternalPrices('HYQ1AA', 'Chevrolet', 'Silverado', 2015);
  console.log(JSON.stringify(results, null, 2));
}

test();
