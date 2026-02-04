/**
 * Test UGC Selfie Style (Proven Viral)
 * Run: node test-ugc.js
 */
require('dotenv').config();

const { generateSoraPrompt } = require('./src/agents/marcus/video-generator');

async function test() {
  console.log('\n📱 TESTING UGC SELFIE STYLE (PROVEN VIRAL)\n');
  console.log('='.repeat(60));

  const title = 'Acabo de programar esta llave BMW';
  const idea = 'Cliente perdio su llave BMW en South Beach. Llegue a las 2am y en 15 minutos tenia llave nueva funcionando.';
  const style = 'ugc';

  console.log(`Title: ${title}`);
  console.log(`Idea: ${idea}`);
  console.log(`Style: ${style}\n`);

  console.log('Generating UGC selfie prompt...\n');

  try {
    const prompt = await generateSoraPrompt(title, idea, style);
    console.log('Generated Prompt:');
    console.log('-'.repeat(60));
    console.log(prompt);
    console.log('-'.repeat(60));
    console.log('\n✅ UGC style working!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test().catch(console.error);
