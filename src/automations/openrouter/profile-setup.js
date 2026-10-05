const { getConfig } = require("../../config");
const {
    readAccounts,
    chunkAccounts,
    createFileLogger,
    formatDuration,
} = require("../../utils");
const { createProgressManager } = require("../../cli/progress");
const { printReport } = require("../../cli/reporter");
const ProfileSetupWorker = require('./ProfileSetupWorker');

async function runProfileSetup(sharedProgress = null, useProxy = false) {
    const config = getConfig();
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
    // Profile setup is sequential (1 worker only) - one profile at a time
    const chunks = chunkAccounts(accounts, 1);

    const progress =
        sharedProgress ||
        createProgressManager(
            `🔐 OpenRouter Profile Setup — ${accounts.length} accounts, ${chunks.length} workers`,
        );

    const worker = new ProfileSetupWorker();

    chunks.forEach((chunk, i) => {
        progress.addWorker(`profile-${i}`, chunk.length, `Profile W${i + 1}`);
    });

    const results = await Promise.all(
        chunks.map((chunk, i) => {
            const browserArgsIndex = i % config.browserArgsSets.length;
            return worker.run(
                chunk,
                `profile-${i}`,
                browserArgsIndex,
                i,
                accounts.length,
                progress,
                logger.log,
                false, // no proxy for profile setup
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
        printReport(`🔐 OPENROUTER PROFILE SETUP REPORT`, results, totalDuration);
        console.log(`📄 Log: ${logger.logFile}`);
        console.log("");
    } else {
        const duration = formatDuration(totalDuration);
        logger.log(
            `Profile Setup finished. Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}`,
        );
    }

    logger.close();

    return { successCount, failedCount, results };
}

module.exports = {
    runProfileSetup,
    ProfileSetupWorker,
};
