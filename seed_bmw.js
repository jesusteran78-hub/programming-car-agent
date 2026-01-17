const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
  console.log('Seeding BMW Prices (CAS/FEM/BDC)...');
  const make = 'BMW';

  // Helper to generate IDs
  const entry = (model, start, end, type, copyPrice, lostPrice, desc) => {
    // Handle "2019+" logic by setting end year to 2026
    const endYear = end === '+' ? 2026 : end;
    return [
      {
        make,
        model,
        year_start: start,
        year_end: endYear,
        service_type: 'copy',
        price: copyPrice,
        description: desc,
      },
      {
        make,
        model,
        year_start: start,
        year_end: endYear,
        service_type: 'lost_all',
        price: lostPrice,
        description: desc,
      },
    ];
  };

  const prices = [];

  // --- CAS 1 ($200/$300) ---
  const pCas1_Copy = 200;
  const pCas1_Lost = 300;
  const dCas1 = 'CAS1 System';
  prices.push(...entry('7 Series', 2001, 2008, 'CAS1', pCas1_Copy, pCas1_Lost, dCas1));

  // --- CAS 2 ($200/$300) ---
  const pCas2_Copy = 200;
  const pCas2_Lost = 300;
  const dCas2 = 'CAS2 System';
  prices.push(...entry('1 Series', 2004, 2006, 'CAS2', pCas2_Copy, pCas2_Lost, dCas2));
  prices.push(...entry('3 Series', 2005, 2006, 'CAS2', pCas2_Copy, pCas2_Lost, dCas2));
  prices.push(...entry('5 Series', 2004, 2006, 'CAS2', pCas2_Copy, pCas2_Lost, dCas2));
  prices.push(...entry('6 Series', 2004, 2007, 'CAS2', pCas2_Copy, pCas2_Lost, dCas2));

  // --- CAS 3 ($200/$300) ---
  // Simplified: Grouping strict CAS3 lists
  const pCas3_Copy = 200;
  const pCas3_Lost = 300;
  const dCas3 = 'CAS3 System';
  prices.push(...entry('1 Series', 2007, 2007, 'CAS3', pCas3_Copy, pCas3_Lost, dCas3));
  prices.push(...entry('3 Series', 2007, 2007, 'CAS3', pCas3_Copy, pCas3_Lost, dCas3));
  prices.push(...entry('5 Series', 2007, 2007, 'CAS3', pCas3_Copy, pCas3_Lost, dCas3));
  prices.push(...entry('6 Series', 2008, 2008, 'CAS3', pCas3_Copy, pCas3_Lost, dCas3));
  prices.push(...entry('X5', 2007, 2007, 'CAS3', pCas3_Copy, pCas3_Lost, dCas3));

  // --- CAS 3+ ($200/$300) ---
  // Note: User set same price as CAS1/2/3
  const pCas3P_Copy = 200;
  const pCas3P_Lost = 300;
  const dCas3P = 'CAS3+ System';
  prices.push(...entry('1 Series', 2008, 2011, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('3 Series', 2008, 2012, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('5 Series', 2008, 2010, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('6 Series', 2009, 2010, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('X1', 2010, 2015, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('X5', 2008, 2013, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('X6', 2008, 2014, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));
  prices.push(...entry('Z4', 2009, 2016, 'CAS3+', pCas3P_Copy, pCas3P_Lost, dCas3P));

  // --- CAS 4 ($300/$400) ---
  const pCas4_Copy = 300;
  const pCas4_Lost = 400;
  const dCas4 = 'CAS4 System';
  prices.push(...entry('5 Series', 2010, 2018, 'CAS4', pCas4_Copy, pCas4_Lost, dCas4));
  prices.push(...entry('6 Series', 2010, 2018, 'CAS4', pCas4_Copy, pCas4_Lost, dCas4));
  prices.push(...entry('7 Series', 2009, 2015, 'CAS4', pCas4_Copy, pCas4_Lost, dCas4));
  prices.push(...entry('X3', 2011, 2018, 'CAS4', pCas4_Copy, pCas4_Lost, dCas4));
  prices.push(...entry('X4', 2014, 2018, 'CAS4', pCas4_Copy, pCas4_Lost, dCas4));

  // --- FEM / BDC ($400/$500) ---
  const currentYear = new Date().getFullYear();
  const pFem_Copy = 400;
  const pFem_Lost = 500;
  const dFem = 'FEM/BDC System';
  prices.push(...entry('1 Series', 2012, 2019, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('2 Series', 2013, 2019, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('3 Series', 2013, 2019, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('4 Series', 2013, 2020, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('X1', 2016, 2019, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('X2', 2017, 2019, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('X5', 2014, 2018, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));
  prices.push(...entry('X6', 2014, 2018, 'FEM/BDC', pFem_Copy, pFem_Lost, dFem));

  // --- BDC2 ($500/$800) [2018+] ---
  const pBdc2_Copy = 500;
  const pBdc2_Lost = 800;
  const dBdc2 = 'BDC2 System';
  // Using '+' implies up to current/future (setting to 2026)
  prices.push(...entry('3 Series', 2019, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('4 Series', 2020, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('5 Series', 2018, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('6 Series', 2018, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('7 Series', 2016, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('X3', 2018, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('X4', 2018, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('X5', 2018, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('X7', 2019, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));
  prices.push(...entry('Z4', 2018, '+', 'BDC2', pBdc2_Copy, pBdc2_Lost, dBdc2));

  const { error } = await supabase.from('service_prices').insert(prices);

  if (error) {console.error('Error:', error);}
  else {console.log(`Success! Added ${prices.length} BMW pricing rules.`);}
}

seed();
