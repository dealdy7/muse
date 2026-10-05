const { runRouterAutomation } = require('./index');

/**
 * Gemini CLI OAuth automation via 9Router
 * 
 * Adds Google accounts to 9Router as Gemini CLI provider connections.
 * Uses headless stealth mode (puppeteer-extra with stealth plugin).
 * 
 * @param {Object} sharedProgress - Progress manager instance (optional)
 * @param {boolean} useProxy - Enable proxy usage
 * @returns {Promise<Object>} { successCount, failedCount, results }
 */
async function runGeminiAutomation(sharedProgress = null, useProxy = true) {
    return runRouterAutomation(sharedProgress, useProxy, 'gemini');
}

module.exports = {
    runGeminiAutomation,
};
