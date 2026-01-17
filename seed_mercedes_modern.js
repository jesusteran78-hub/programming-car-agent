const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
  console.log('Seeding Modern Mercedes Prices (2015-2026)...');

  const prices = [
    {
      make: 'Mercedes Benz',
      model: 'General', // Applies to all models for this era (FBS4)
      year_start: 2015,
      year_end: 2026,
      service_type: 'copy',
      price: 1200,
      description: 'FBS4 System (Manual Entry)',
    },
    {
      make: 'Mercedes Benz',
      model: 'General',
      year_start: 2015,
      year_end: 2026,
      service_type: 'lost_all',
      price: 1300,
      description: 'FBS4 System (Manual Entry)',
    },
  ];

  const { error } = await supabase.from('service_prices').insert(prices);

  if (error) {console.error('Error:', error);}
  else {console.log('Success! Added Mercedes 2015-2026 prices.');}
}

seed();
