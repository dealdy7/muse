#!/usr/bin/env node

/**
 * Quick test to verify OpenRouter integration
 * This script tests that all imports and modules are correctly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 OpenRouter Integration Test\n');
console.log('═'.repeat(60));

// Test 1: Check if OpenRouter files exist
console.log('\n✓ Test 1: Checking if OpenRouter files exist...');
const openrouterDir = path.join(__dirname, 'src/automations/openrouter');
const indexFile = path.join(openrouterDir, 'index.js');
const workerFile = path.join(openrouterDir, 'OpenRouterWorker.js');

if (fs.existsSync(indexFile)) {
    console.log('  ✓ index.js exists');
} else {
    console.log('  ✗ index.js NOT found');
    process.exit(1);
}

if (fs.existsSync(workerFile)) {
    console.log('  ✓ OpenRouterWorker.js exists');
} else {
    console.log('  ✗ OpenRouterWorker.js NOT found');
    process.exit(1);
}

// Test 2: Try to require OpenRouter module
console.log('\n✓ Test 2: Testing module imports...');
try {
    const { runOpenRouterAutomation } = require('./src/automations/openrouter');
    console.log('  ✓ runOpenRouterAutomation imported successfully');
    console.log('  ✓ Type:', typeof runOpenRouterAutomation);
} catch (err) {
    console.log('  ✗ Failed to import runOpenRouterAutomation:', err.message);
    process.exit(1);
}

// Test 3: Check main index.js imports
console.log('\n✓ Test 3: Checking main index.js import...');
try {
    const mainIndexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf-8');
    if (mainIndexContent.includes('runOpenRouterAutomation')) {
        console.log('  ✓ runOpenRouterAutomation import found in index.js');
    } else {
        console.log('  ✗ runOpenRouterAutomation import NOT found in index.js');
        process.exit(1);
    }
} catch (err) {
    console.log('  ✗ Error reading index.js:', err.message);
    process.exit(1);
}

// Test 4: Check menu options
console.log('\n✓ Test 4: Checking menu options...');
try {
    const mainIndexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf-8');
    if (mainIndexContent.includes('openrouter')) {
        console.log('  ✓ "openrouter" option found in menu');
    } else {
        console.log('  ✗ "openrouter" option NOT found in menu');
        process.exit(1);
    }
    
    if (mainIndexContent.includes('OpenRouter API Key')) {
        console.log('  ✓ "OpenRouter API Key" description found');
    } else {
        console.log('  ✗ "OpenRouter API Key" description NOT found');
        process.exit(1);
    }
} catch (err) {
    console.log('  ✗ Error checking menu:', err.message);
    process.exit(1);
}

// Test 5: Check documentation
console.log('\n✓ Test 5: Checking documentation...');
const docFile = path.join(__dirname, 'docs/OPENROUTER-INTEGRATION.md');
if (fs.existsSync(docFile)) {
    console.log('  ✓ OPENROUTER-INTEGRATION.md found');
    const docContent = fs.readFileSync(docFile, 'utf-8');
    console.log('  ✓ Documentation size:', (docContent.length / 1024).toFixed(2) + ' KB');
} else {
    console.log('  ⚠ OPENROUTER-INTEGRATION.md NOT found (optional)');
}

// Test 6: Syntax validation
console.log('\n✓ Test 6: Syntax validation...');
const { execSync } = require('child_process');
try {
    execSync('node -c index.js', { stdio: 'pipe' });
    console.log('  ✓ index.js syntax is valid');
} catch (err) {
    console.log('  ✗ index.js has syntax errors:', err.message);
    process.exit(1);
}

try {
    execSync('node -c src/automations/openrouter/index.js', { stdio: 'pipe' });
    console.log('  ✓ openrouter/index.js syntax is valid');
} catch (err) {
    console.log('  ✗ openrouter/index.js has syntax errors:', err.message);
    process.exit(1);
}

try {
    execSync('node -c src/automations/openrouter/OpenRouterWorker.js', { stdio: 'pipe' });
    console.log('  ✓ OpenRouterWorker.js syntax is valid');
} catch (err) {
    console.log('  ✗ OpenRouterWorker.js has syntax errors:', err.message);
    process.exit(1);
}

console.log('\n' + '═'.repeat(60));
console.log('\n✅ All tests passed! OpenRouter integration is ready.\n');
console.log('📖 Next steps:');
console.log('  1. Run: npm start');
console.log('  2. Select "Run Automations"');
console.log('  3. Choose "OpenRouter API Key (Add to 9Router)"');
console.log('  4. Enter your OpenRouter API key when prompted');
console.log('\n📚 For more info, see: docs/OPENROUTER-INTEGRATION.md\n');
