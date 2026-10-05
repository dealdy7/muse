// Test actual automation flow with ONLY 2 accounts to verify it works
const { runKiroAutomation } = require('./src/automations/kiro');
const { runCloudflareAutomation } = require('./src/automations/cloudflare');
const fs = require('fs');
const path = require('path');

async function testRealAutomation() {
    console.log('🧪 Testing Real Automation Flow\n');
    console.log('⚠️  This will test with the FIRST 2 accounts only\n');
    
    // Backup original accounts
    const accountsPath = path.join(__dirname, 'accounts.txt');
    const backupPath = path.join(__dirname, 'accounts.txt.test-backup');
    
    const originalAccounts = fs.readFileSync(accountsPath, 'utf-8');
    fs.writeFileSync(backupPath, originalAccounts);
    console.log('✅ Backed up accounts.txt to accounts.txt.test-backup\n');
    
    // Take only first 2 accounts for testing
    const lines = originalAccounts.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const testAccounts = lines.slice(0, 2).join('\n');
    fs.writeFileSync(accountsPath, testAccounts);
    console.log(`✅ Testing with 2 accounts:\n${testAccounts}\n`);
    
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌱 Testing Kiro Automation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const kiroResult = await runKiroAutomation(null, true);
        
        if (kiroResult) {
            console.log('\n✅ Kiro Automation Test Result:');
            console.log(`   Success: ${kiroResult.successCount}`);
            console.log(`   Failed: ${kiroResult.failedCount}`);
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('☁️  Testing Cloudflare Automation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const cfResult = await runCloudflareAutomation(null, true);
        
        if (cfResult) {
            console.log('\n✅ Cloudflare Automation Test Result:');
            console.log(`   Success: ${cfResult.successCount}`);
            console.log(`   Failed: ${cfResult.failedCount}`);
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        if (kiroResult && cfResult) {
            const totalSuccess = kiroResult.successCount + cfResult.successCount;
            const totalFailed = kiroResult.failedCount + cfResult.failedCount;
            
            console.log(`   Total Success: ${totalSuccess}`);
            console.log(`   Total Failed: ${totalFailed}`);
            
            if (totalFailed === 0) {
                console.log('\n🎉 PERFECT! All tests passed!');
                console.log('\n💡 Next steps:');
                console.log('   1. Restore full accounts.txt: copy accounts.txt.test-backup to accounts.txt');
                console.log('   2. Run full automation with npm start');
            } else {
                console.log('\n⚠️  Some accounts failed. Check logs/ directory for details.');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error(error);
    } finally {
        // Restore original accounts
        console.log('\n🔄 Restoring original accounts.txt...');
        fs.writeFileSync(accountsPath, originalAccounts);
        console.log('✅ Restored original accounts.txt\n');
    }
}

testRealAutomation().catch(console.error);
