const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
  console.log('Actualizando Transmission Products con modelos específicos...');

  // 1. Eliminar entradas anteriores genéricas
  console.log('Eliminando entradas anteriores...');
  await supabase
    .from('service_prices')
    .delete()
    .in('service_type', ['tcm_programmed', 'transmission_rebuilt']);

  // Descripciones
  const tcmDesc = 'TCM programado con VIN + calibración Techline Connect. 1 año garantía SI devuelven TCM viejo en 15 días (si no, pierden garantía). Envío gratis USA. Part#: 24256939, 24257213, 24259639, 24259835, 24261870, 24264141, 24265053, 24265259, 24267576, 24270598, 24275873, 24276637, 24294925';

  const transDesc = 'Transmisión 6L80 reparada: discos, ligas, bomba, convertidor reforzado, TCM programado. 1 año garantía o 200k millas. Depósito $700 reembolsable al devolver trans vieja. Envío gratis a terminales AAA Cooper USA. Cliente paga envío de regreso.';

  const products = [];

  // Helper para agregar ambos productos (TCM + Trans) por modelo
  const addModel = (make, model, yearStart, yearEnd) => {
    products.push({
      make,
      model,
      year_start: yearStart,
      year_end: yearEnd,
      service_type: 'tcm_programmed',
      price: 500,
      description: tcmDesc,
    });
    products.push({
      make,
      model,
      year_start: yearStart,
      year_end: yearEnd,
      service_type: 'transmission_rebuilt',
      price: 2500,
      description: transDesc,
    });
  };

  // ==========================================
  // CHEVROLET - 6L80
  // ==========================================
  addModel('Chevrolet', 'Silverado 1500', 2009, 2021);
  addModel('Chevrolet', 'Tahoe', 2009, 2015);
  addModel('Chevrolet', 'Suburban', 2009, 2021);
  addModel('Chevrolet', 'Avalanche', 2008, 2013);
  addModel('Chevrolet', 'Camaro', 2009, 2015);
  addModel('Chevrolet', 'Corvette', 2006, 2014);
  addModel('Chevrolet', 'Caprice PPV', 2011, 2017);
  addModel('Chevrolet', 'SS', 2014, 2017);
  addModel('Chevrolet', 'Express 2500', 2010, 2020);
  addModel('Chevrolet', 'Express 3500', 2010, 2020);

  // CHEVROLET - 6L90 (Heavy Duty)
  addModel('Chevrolet', 'Silverado 2500HD', 2009, 2021);
  addModel('Chevrolet', 'Silverado 3500HD', 2009, 2021);
  addModel('Chevrolet', 'Suburban 2500', 2009, 2013);
  addModel('Chevrolet', 'Camaro ZL1', 2012, 2015);

  // ==========================================
  // GMC - 6L80
  // ==========================================
  addModel('GMC', 'Sierra 1500', 2009, 2021);
  addModel('GMC', 'Yukon', 2007, 2020);
  addModel('GMC', 'Yukon XL', 2007, 2020);
  addModel('GMC', 'Savana 2500', 2010, 2020);
  addModel('GMC', 'Savana 3500', 2010, 2020);

  // GMC - 6L90 (Heavy Duty)
  addModel('GMC', 'Sierra 2500HD', 2009, 2021);
  addModel('GMC', 'Sierra 3500HD', 2009, 2021);

  // ==========================================
  // CADILLAC - 6L80
  // ==========================================
  addModel('Cadillac', 'Escalade', 2007, 2015);
  addModel('Cadillac', 'Escalade ESV', 2007, 2015);
  addModel('Cadillac', 'Escalade EXT', 2007, 2013);
  addModel('Cadillac', 'CTS', 2008, 2013);
  addModel('Cadillac', 'STS', 2007, 2011);

  // CADILLAC - 6L90 (Heavy Duty)
  addModel('Cadillac', 'CTS-V', 2009, 2015);

  // ==========================================
  // OTROS
  // ==========================================
  addModel('Hummer', 'H2', 2008, 2009);
  addModel('Pontiac', 'G8', 2008, 2009);
  addModel('Isuzu', 'NPR', 2012, 2016);

  // Insertar todos
  const { error } = await supabase.from('service_prices').insert(products);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✅ Success! Added ${products.length} transmission pricing rules.`);
    console.log(`   - ${products.length / 2} modelos`);
    console.log(`   - TCM ($500) + Transmisión ($2500) por modelo`);
  }
}

seed();
