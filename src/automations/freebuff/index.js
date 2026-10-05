const { getConfig } = require("../../config");
const { readAccounts } = require("../../utils");
const { runFreebuffAutomation } = require("./FreebuffWorker");

async function runFreebuffLoginAutomation(sharedProgress = null, useProxy = false) {
    const config = getConfig();
    const accounts = readAccounts();

    if (accounts.length === 0) {
        console.log("⚠️  No accounts found in accounts.txt");
        return {
            successCount: 0,
            failedCount: 0,
            totalCount: 0,
        };
    }

    console.log(`\n🎯 FreeBuff Auto Login - Processing ${accounts.length} account(s)\n`);

    const result = await runFreebuffAutomation(accounts, sharedProgress, useProxy);

    return result;
}

module.exports = {
    runFreebuffLoginAutomation,
};
