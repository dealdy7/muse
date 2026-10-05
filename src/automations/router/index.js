const { getConfig } = require("../../config");
const {
    readAccounts,
    chunkAccounts,
    createFileLogger,
    formatDuration,
} = require("../../utils");
const { createProgressManager } = require("../../cli/progress");
const { printReport } = require("../../cli/reporter");
const RouterWorker = require("./RouterWorker");

async function runRouterAutomation(sharedProgress = null, useProxy = true, providerMode = 'antigravity') {
    const config = getConfig();
    const logger = createFileLogger();
    const accounts = readAccounts();

    if (accounts.length === 0) {
        if (!sharedProgress) { console.log("No accounts found in accounts.txt. Format: email|password"); }
        logger.close();
        return null;
    }

    const startedAt = Date.now();
    const chunks = chunkAccounts(accounts, config.routerBrowserCount);

    const progress =
        sharedProgress ||
        createProgressManager(
            `🌐 9Router (${providerMode}) Automation — ${accounts.length} accounts, ${chunks.length} workers`,
        );

    const worker = new RouterWorker(providerMode);

    chunks.forEach((chunk, i) => {
        progress.addWorker(`router-${providerMode}-${i}`, chunk.length, `${worker.workerLabel}${i + 1}`);
    });

    const results = await Promise.all(
        chunks.map((chunk, i) => {
            const browserArgsIndex = i % config.browserArgsSets.length;
            return worker.run(
                chunk,
                `router-${providerMode}-${i}`,
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
        printReport(`🌐 9ROUTER (${providerMode.toUpperCase()}) REPORT`, results, totalDuration);
        console.log(`📄 Log: ${logger.logFile}`);
        console.log("");
    } else {
        const duration = formatDuration(totalDuration);
        logger.log(
            `9Router finished. Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}`,
        );
    }

    logger.close();

    return { successCount, failedCount, results };
}

module.exports = {
    runRouterAutomation,
};
