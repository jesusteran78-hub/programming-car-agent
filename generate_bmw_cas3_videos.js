const { generateViralVideo } = require('./video_engine');

// 8 videos de BMW CAS3+ - diferentes modelos y situaciones
const bmwCas3Videos = [
  {
    title: 'BMW 3 Series 2010 - Copia de Llave',
    idea: 'Cliente con BMW 328i 2010 necesita una copia de llave. Sistema CAS3+, programación rápida en 20 minutos. Precio especial: $200.',
  },
  {
    title: 'BMW X5 2012 - Llave Adicional',
    idea: 'Dueño de BMW X5 2012 quiere llave extra para su esposa. Sistema CAS3+, sin necesidad de ir al dealer. Solo $200 la copia.',
  },
  {
    title: 'BMW X6 2011 - Nueva Llave Smart Key',
    idea: 'BMW X6 2011 con sistema CAS3+. Cliente feliz porque hicimos su llave en el parqueo de su trabajo. Servicio móvil Miami.',
  },
  {
    title: 'BMW 1 Series 2009 - Copia Express',
    idea: 'BMW 128i 2009, sistema CAS3+. Llave hecha en 15 minutos, cliente impresionado por el servicio rápido. $200 garantizado.',
  },
  {
    title: 'BMW Z4 2015 - Llave de Repuesto',
    idea: 'BMW Z4 convertible 2015 con CAS3+. Llave programada mientras el cliente tomaba café. Servicio premium, precio justo.',
  },
  {
    title: 'BMW X1 2014 - Segunda Llave',
    idea: 'BMW X1 2014 modelo SUV compacto. Sistema CAS3+, cliente necesitaba llave para su hijo. Programación perfecta, $200.',
  },
  {
    title: 'BMW 5 Series 2009 - Llave Comfort Access',
    idea: 'BMW 535i 2009 con Comfort Access. Sistema CAS3+, programamos la llave con todas las funciones originales. Miami-Dade.',
  },
  {
    title: 'BMW 6 Series 2010 - Copia Smart Key',
    idea: 'BMW 650i Coupe 2010, cliente ejecutivo necesitaba llave extra. Sistema CAS3+, servicio en su oficina de Brickell.',
  },
];

async function generateAll() {
  console.log('🚗 GENERANDO 8 VIDEOS DE BMW CAS3+');
  console.log('===================================');
  console.log(`Hora inicio: ${new Date().toLocaleString()}`);
  console.log('');

  const results = [];

  for (let i = 0; i < bmwCas3Videos.length; i++) {
    const video = bmwCas3Videos[i];
    console.log(`\n📹 [${i + 1}/8] ${video.title}`);
    console.log(`   Idea: ${video.idea.substring(0, 50)}...`);

    try {
      const result = await generateViralVideo(video.title, video.idea);
      results.push({ ...video, success: true, result });
      console.log(`   ✅ Job iniciado: ${result.jobId || 'OK'}`);
    } catch (error) {
      results.push({ ...video, success: false, error: error.message });
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Pequeña pausa entre videos para no saturar la API
    if (i < bmwCas3Videos.length - 1) {
      console.log('   ⏳ Esperando 5 segundos...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log('\n===================================');
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Exitosos: ${results.filter((r) => r.success).length}`);
  console.log(`   ❌ Fallidos: ${results.filter((r) => !r.success).length}`);
  console.log(`   Hora fin: ${new Date().toLocaleString()}`);
  console.log('\n💡 Los videos se procesarán en background.');
  console.log('   Usa "mkt video status" para ver el progreso.');
}

generateAll();
