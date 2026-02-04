const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkPrices() {
  // Check service_prices table
  const { data: prices, error } = await supabase
    .from('service_prices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('=== PRECIOS GUARDADOS EN service_prices ===');
  console.log('Total:', prices?.length || 0);

  if (prices && prices.length > 0) {
    prices.forEach(p => {
      console.log(`${p.make} ${p.model} (${p.year_start}-${p.year_end}) - ${p.service_type}: $${p.price}`);
    });
  } else {
    console.log('(No hay precios guardados)');
  }
}

checkPrices();
