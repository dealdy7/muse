const { runRouterAutomation } = require('./index');

/**
 * Antigravity OAuth automation via 9Router
 * 
 * Adds Google accounts to 9Router as Antigravity provider connections.
 * Uses headless stealth mode (puppeteer-extra with stealth plugin).
 * 
 * @param {Object} sharedProgress - Progress manager instance (optional)
 * @param {boolean} useProxy - Enable proxy usage
 * @returns {Promise<Object>} { successCount, failedCount, results }
 */
async function runAntigravityAutomation(sharedProgress = null, useProxy = true) {
    return runRouterAutomation(sharedProgress, useProxy, 'antigravity');
}

module.exports = {
    runAntigravityAutomation,
};
