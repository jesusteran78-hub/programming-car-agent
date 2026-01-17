const fs = require('fs');
const csv = require('csv-parser');

const INPUT_CSV = 'sms_targets.csv';
const OUTPUT_JSON = 'leads_n8n.json';

const results = [];

console.log('📦 Convirtiendo CSV a formato n8n...');

fs.createReadStream(INPUT_CSV)
  .pipe(csv())
  .on('data', (data) => {
    // Formateamos para que n8n lo lea fácil
    if (data.CLEAN_PHONE) {
      results.push({
        phone: data.CLEAN_PHONE,
        name: data.Name || 'Amigo',
        company: data.Company || 'Taller',
        message_type: 'offer_tehcm',
      });
    }
  })
  .on('end', () => {
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2));
    console.log(`✅ ¡Listo! Archivo creado: ${OUTPUT_JSON}`);
    console.log(`🔹 Total de leads: ${results.length}`);
    console.log(
      'Carga este archivo en n8n usando el nodo "Read/Write Files from Disk" o copia el contenido.'
    );
  });
