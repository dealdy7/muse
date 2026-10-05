// Test file write operations to diagnose UNKNOWN error
const fs = require('fs');
const path = require('path');
const { createFileLogger } = require('./src/utils');
const { markAccountCompleted, loadHistory } = require('./src/utils/history');

console.log('🧪 Testing File Write Operations\n');

// Test 1: Logger
console.log('Test 1: File Logger');
try {
    const logger = createFileLogger();
    logger.log('Test log message 1');
    logger.log('Test log message 2');
    logger.log('Test log message 3');
    logger.close();
    console.log(`✅ Logger test passed`);
    console.log(`   Log file: ${logger.logFile}\n`);
} catch (error) {
    console.error(`❌ Logger test failed: ${error.message}\n`);
}

// Test 2: History
console.log('Test 2: History Write');
try {
    const before = loadHistory();
    console.log('   History before:', JSON.stringify(before).slice(0, 100) + '...');
    
    markAccountCompleted('test', 'test@example.com');
    
    const after = loadHistory();
    console.log('   History after:', JSON.stringify(after).slice(0, 100) + '...');
    
    console.log('✅ History test passed\n');
} catch (error) {
    console.error(`❌ History test failed: ${error.message}\n`);
}

// Test 3: Multiple concurrent writes (simulating parallel workers)
console.log('Test 3: Concurrent Writes (simulating 4 workers)');
const promises = [];
for (let i = 0; i < 4; i++) {
    promises.push((async () => {
        try {
            const logger = createFileLogger();
            for (let j = 0; j < 5; j++) {
                logger.log(`Worker ${i} - Message ${j}`);
                await new Promise(r => setTimeout(r, 10));
            }
            logger.close();
            console.log(`✅ Worker ${i} completed`);
        } catch (error) {
            console.error(`❌ Worker ${i} failed: ${error.message}`);
        }
    })());
}

Promise.all(promises).then(() => {
    console.log('\n🎉 All file write tests completed!');
    console.log('\n💡 If all tests passed, you can run the automation safely.');
    console.log('   If any test failed, check:');
    console.log('   1. Disk space (df -h or Get-PSDrive)');
    console.log('   2. File permissions on logs/ and output/ folders');
    console.log('   3. Antivirus settings (might block rapid file writes)');
    console.log('   4. Close any files open in editor (history.json, log files)');
}).catch(error => {
    console.error('\n❌ Concurrent write test failed:', error);
});
