const { sleep } = require('../utils');

async function closeBrowserSafely(browser, log = console.log) {
    if (!browser) return;
    
    try {
        await Promise.race([
            browser.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout closing browser')), 5000))
        ]);
        log("Browser closed safely.");
    } catch (e) {
        try {
            const browserProcess = browser.process();
            if (browserProcess) {
                browserProcess.kill('SIGKILL');
            }
            log("Browser closed.");
        } catch (killErr) {
            // Ignore
        }
    }
}

module.exports = { closeBrowserSafely };
