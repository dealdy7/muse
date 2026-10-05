// Quick browser launch test to diagnose timeout issues
const { launchBrowser } = require('./src/browser');
const { getConfig } = require('./src/config');

async function testBrowserLaunch() {
    console.log('🧪 Testing browser launch...\n');
    
    const config = getConfig();
    console.log(`📋 Config:`);
    console.log(`   - Headless: ${config.headless}`);
    console.log(`   - Browser Count: ${config.browserCount}`);
    console.log(`   - Navigation Timeout: ${config.timeouts.navigation}ms`);
    console.log(`   - Chrome Path: ${config.chromeExecutablePath || 'auto-detect'}\n`);

    let browser, page;
    
    try {
        console.log('⏳ Launching browser (headless mode)...');
        const startLaunch = Date.now();
        
        ({ browser, page } = await launchBrowser(0, 0, null));
        
        const launchTime = Date.now() - startLaunch;
        console.log(`✅ Browser launched successfully in ${launchTime}ms\n`);

        console.log('⏳ Testing navigation to Kiro...');
        const startNav = Date.now();
        
        await page.goto('https://app.kiro.dev/signin/', {
            waitUntil: 'networkidle2',
            timeout: config.timeouts.navigation
        });
        
        const navTime = Date.now() - startNav;
        console.log(`✅ Navigation successful in ${navTime}ms\n`);

        const url = page.url();
        const title = await page.title();
        console.log(`📄 Page info:`);
        console.log(`   - URL: ${url}`);
        console.log(`   - Title: ${title}\n`);

        console.log('⏳ Testing navigation to Cloudflare...');
        const startNav2 = Date.now();
        
        await page.goto('https://dash.cloudflare.com/login', {
            waitUntil: 'networkidle2',
            timeout: config.timeouts.navigation
        });
        
        const navTime2 = Date.now() - startNav2;
        console.log(`✅ Cloudflare navigation successful in ${navTime2}ms\n`);

        console.log('🎉 All tests passed! Browser automation is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`\n🔍 Diagnosis:`);
        
        if (error.message.includes('timeout') || error.message.includes('ERR_TIMED_OUT')) {
            console.error('   - Navigation timeout detected');
            console.error('   - Possible causes:');
            console.error('     1. Network connectivity issue');
            console.error('     2. Browser launch arguments incompatible');
            console.error('     3. System resources exhausted');
            console.error('     4. Firewall/antivirus blocking Chromium');
        } else if (error.message.includes('ERR_SOCKET_NOT_CONNECTED') || error.message.includes('ERR_CONNECTION_RESET')) {
            console.error('   - Connection error detected');
            console.error('   - Possible causes:');
            console.error('     1. Proxy configuration issue');
            console.error('     2. Network instability');
            console.error('     3. ISP blocking automated browsers');
        } else if (error.message.includes('Failed to launch')) {
            console.error('   - Browser launch failed');
            console.error('   - Possible causes:');
            console.error('     1. Chrome/Chromium not installed correctly');
            console.error('     2. Missing dependencies');
            console.error('     3. Insufficient permissions');
        }
        
        console.error('\n💡 Suggested fixes:');
        console.error('   1. Try running with GUI mode: set PW_HEADLESS=0 in .env');
        console.error('   2. Reduce BROWSER_COUNT to 1 in .env');
        console.error('   3. Increase TIMEOUT_NAVIGATION_MS to 120000 in .env');
        console.error('   4. Check if another automation is running');
        console.error('   5. Restart your computer to free up resources');
        
    } finally {
        if (browser) {
            console.log('\n🧹 Cleaning up...');
            await browser.close();
            console.log('✅ Browser closed.\n');
        }
    }
}

testBrowserLaunch().catch(console.error);
