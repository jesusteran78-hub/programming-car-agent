/**
 * Test command routing
 */
require('dotenv').config();

const { routeCommand } = require('./src/agents/command-router');

async function main() {
  console.log('\n=== TESTING COMMAND ROUTING ===\n');

  const testCommands = [
    'help',
    'mkt ugc programación de radio mercedes benz E-Clase',
    'ugc programación de radio mercedes',
  ];

  for (const cmd of testCommands) {
    console.log(`\n--- Testing: "${cmd}" ---`);
    try {
      const result = await routeCommand(cmd);
      console.log('Success:', result.success);
      console.log('Agent:', result.agent);
      console.log('Message:', result.message?.substring(0, 200) + '...');
    } catch (e) {
      console.log('ERROR:', e.message);
      console.log(e.stack);
    }
  }
}

main().catch(console.error);
