const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
  console.log('Seeding Mercedes Prices...');

  const prices = [
    {
      make: 'Mercedes Benz',
      model: 'General', // Applies to generic models in this range
      year_start: 1997,
      year_end: 2014,
      service_type: 'copy',
      price: 200,
      description: 'FBS3 System (Manual Entry)',
    },
    {
      make: 'Mercedes Benz',
      model: 'General',
      year_start: 1997,
      year_end: 2014,
      service_type: 'lost_all',
      price: 300,
      description: 'FBS3 System (Manual Entry)',
    },
  ];

  const { error } = await supabase.from('service_prices').insert(prices);

  if (error) {console.error('Error:', error);}
  else {console.log('Success! Added Mercedes 1997-2014 prices.');}
}

seed();
