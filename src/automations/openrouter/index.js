const { getConfig } = require("../../config");
const {
    readAccounts,
    chunkAccounts,
    createFileLogger,
    formatDuration,
} = require("../../utils");
const { createProgressManager } = require("../../cli/progress");
const { printReport } = require("../../cli/reporter");
const OpenRouterWorker = require("./OpenRouterWorker");

async function runOpenRouterAutomation(sharedProgress = null, useProxy = true, openRouterOptions = {}) {
    const config = getConfig();
    const logger = createFileLogger();
    const accounts = readAccounts();

    if (accounts.length === 0) {
        if (!sharedProgress) { console.log("No accounts found in accounts.txt. Format: email|password"); }
        logger.close();
        return null;
    }

    const startedAt = Date.now();
    // OpenRouter uses PERSISTENT browser profile, so we need SEQUENTIAL processing (1 worker only)
    const chunks = chunkAccounts(accounts, 1); // Force 1 worker for persistent session

    const progress =
        sharedProgress ||
        createProgressManager(
            `🔑 OpenRouter Automation — ${accounts.length} accounts, ${chunks.length} workers`,
        );

    const worker = new OpenRouterWorker();

    chunks.forEach((chunk, i) => {
        progress.addWorker(`openrouter-${i}`, chunk.length, `OpenRouter W${i + 1}`);
    });

    const results = await Promise.all(
        chunks.map((chunk, i) => {
            const browserArgsIndex = i % config.browserArgsSets.length;
            return worker.run(
                chunk,
                `openrouter-${i}`,
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
        printReport(`🔑 OPENROUTER AUTOMATION REPORT`, results, totalDuration);
        console.log(`📄 Log: ${logger.logFile}`);
        console.log("");
    } else {
        const duration = formatDuration(totalDuration);
        logger.log(
            `OpenRouter finished. Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}`,
        );
    }

    logger.close();

    return { successCount, failedCount, results };
}

module.exports = {
    runOpenRouterAutomation,
};
