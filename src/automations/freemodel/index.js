const { getConfig } = require("../../config");
const {
    readAccounts,
    chunkAccounts,
    createFileLogger,
    formatDuration,
} = require("../../utils");
const { createProgressManager } = require("../../cli/progress");
const { printReport } = require("../../cli/reporter");
const FreeModelWorker = require("./FreeModelWorker");

async function runFreeModelAutomation(sharedProgress = null, useProxy = true) {
    const config = getConfig();
    
    if (!config.inviteUrl) {
        console.log("");
        console.log("❌ Error: INVITE_URL not set!");
        console.log("Please set your FreeModel.dev invite URL in Settings.");
        console.log("Example: https://freemodel.dev/dashboard?refer=abc123");
        console.log("");
        return { successCount: 0, failedCount: 0 };
    }
    
    const logger = createFileLogger();
    const accounts = readAccounts();

    if (accounts.length === 0) {
        if (!sharedProgress) { 
            console.log("No accounts found in accounts.txt. Format: email|password"); 
        }
        logger.close();
        return { successCount: 0, failedCount: 0 };
    }

    const startedAt = Date.now();
    const chunks = chunkAccounts(accounts, config.browserCount);

    const progress =
        sharedProgress ||
        createProgressManager(
            `🆓 FreeModel.dev Signup — ${accounts.length} accounts, ${chunks.length} workers`,
        );

    const worker = new FreeModelWorker();

    chunks.forEach((chunk, i) => {
        progress.addWorker(`freemodel-${i}`, chunk.length, `FreeModel W${i + 1}`);
    });

    const results = await Promise.all(
        chunks.map((chunk, i) => {
            const browserArgsIndex = i % config.browserArgsSets.length;
            return worker.run(
                chunk,
                `freemodel-${i}`,
                browserArgsIndex,
                i,
                accounts.length,
                progress,
                logger.log,
                useProxy,
            );
        }),
    );

    if (!sharedProgress) {
        progress.stop();
    }

    const successCount = results.reduce((sum, r) => sum + r.successCount, 0);
    const failedCount = results.reduce((sum, r) => sum + r.failedCount, 0);
    const totalDuration = Date.now() - startedAt;

    if (!sharedProgress) {
        printReport(`🆓 FREEMODEL.DEV SIGNUP REPORT`, results, totalDuration);
        console.log(`📄 Log: ${logger.logFile}`);
        console.log("");
    } else {
        const duration = formatDuration(totalDuration);
        logger.log(
            `FreeModel.dev finished. Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}`,
        );
    }

    logger.close();

    return { successCount, failedCount, results };
}

module.exports = {
    runFreeModelAutomation,
    FreeModelWorker,
};
