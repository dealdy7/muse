const { runCodebuddyGoogleAutomation } = require('./src/automations/codebuddy/codebuddy-google-oauth');

console.log('=== DEBUG INFO ===');
console.log('process.cwd():', process.cwd());
console.log('__dirname:', __dirname);

const path = require('path');
const { ROOT_DIR } = require('./src/config');
console.log('ROOT_DIR:', ROOT_DIR);

const { createFileLogger } = require('./src/utils');
console.log('Testing createFileLogger...');
try {
  const logger = createFileLogger();
  logger.log('Test');
  console.log('✅ Logger OK');
} catch (err) {
  console.error('❌ Logger Error:', err.message);
  console.error(err.stack);
}

console.log('\nTesting runCodebuddyGoogleAutomation...');
console.log('Function loaded:', typeof runCodebuddyGoogleAutomation);
console.log('✅ Module loads without error');
