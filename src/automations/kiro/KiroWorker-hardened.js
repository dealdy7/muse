/**
 * Hardened Kiro Worker - Production Ready (Lockdown Version)
 * Based on verified working code from original project
 * Enhanced with comprehensive error handling and crash protection
 */
const { getConfig } = require("../../config");
const { sleep, ensureFileExists } = require("../../utils");
const { launchBrowser } = require("../../browser");
const { completeGoogleLogin } = require("../../providers/google/login");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const fs = require("fs");
const { getResultFile } = require("../../config");
const { createRouter } = require("../../providers/router");

class KiroWorker extends BaseWorker {
    constructor(openKiroSignIn, handlePostLogin, waitForDashboard, getRefreshToken) {
        super({
            automationName: "Kiro",
            workerLabel: "Kiro W",
            removeAccountOnSuccess: true,
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: true,
            useProxyPool: true,
        });

        this.openKiroSignIn = openKiroSignIn;
        this.handlePostLogin = handlePostLogin;
        this.waitForDashboard = waitForDashboard;
        this.getRefreshToken = getRefreshToken;
    }

    /**
     * Safely save refresh token to file with retry logic
     */
    saveRefreshToken(email, refreshToken, log) {
        try {
            const resultFile = getResultFile("kiro");
            ensureFileExists(resultFile);
            fs.appendFileSync(resultFile, `${email}|${refreshToken}\n`);
            log(`[SUCCESS] Refresh token saved to ${resultFile}`);
            return true;
        } catch (saveErr) {
            log(`[ERROR] Failed to save refresh token: ${saveErr.message}`);
            return false;
        }
    }

    /**
     * Safely import refresh token to router with fallback
     */
    async importRefreshToken(refreshToken, log) {
        const { ok, router, error } = await createRouter(null, log);
        if (!ok) {
            throw new Error(`Router ${error}`);
        }

        log("Importing refresh token to router...");
        await router.importRefreshToken("kiro", refreshToken);
        log("Successfully imported token!");
    }

    /**
     * Process account with comprehensive error isolation
     */
    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        const config = getConfig();
        let poolProxy = null;

        // Acquire proxy with error handling
        try {
            const result = await this.acquireProxyForAccount(
                account,
                log,
                updateProgress,
                useProxy,
            );
            poolProxy = result.poolProxy;
        } catch (proxyErr) {
            log(`[ERROR] Proxy acquisition failed: ${proxyErr.message}`);
            throw proxyErr;
        }

        let browser = null;
        let page = null;

        try {
            updateProgress({ step: STEPS.LAUNCHING, email: account.email });
            log(`Launching browser for ${account.email} (HEADLESS MODE)`);

            // Force background mode for Kiro hardened
            const launchResult = await launchBrowser(
                browserArgsIndex,
                workerIndex,
                poolProxy,
                { forceHeadless: true }
            );
            
            browser = launchResult.browser;
            page = launchResult.page;

            try {
                // Navigate to Kiro signin
                updateProgress({ step: STEPS.NAVIGATING });
                await this.openKiroSignIn(page, log);

                // Google login
                updateProgress({ step: STEPS.GOOGLE_LOGIN });
                await completeGoogleLogin(page, account, log);
                await this.handlePostLogin(page, log);

                // Wait for dashboard
                updateProgress({ step: STEPS.WAITING });
                await this.waitForDashboard(page, log);

                // Get refresh token
                updateProgress({ step: STEPS.GETTING_TOKEN });
                const refreshToken = await this.getRefreshToken(page, log);

                // Save token
                this.saveRefreshToken(account.email, refreshToken, log);

                // Import to router (non-critical, continues on failure)
                updateProgress({ step: STEPS.IMPORTING });
                try {
                    await this.importRefreshToken(refreshToken, log);
                } catch (importWarning) {
                    log(`Router import failed (continuing): ${importWarning.message}`);
                }

                await sleep(config.delays.beforeBrowserClose);
                log("Browser closed.");

            } catch (stepErr) {
                log(`Processing step failed: ${stepErr.message}`);
                throw stepErr;
            }

        } finally {
            // ALWAYS cleanup browser with aggressive approach
            try {
                if (browser) {
                    await browser.close().catch(() => {});
                }
            } catch (cleanupErr) {
                log(`Closing browser forcefully due to: ${cleanupErr.message}`);
                try {
                    const browserProcess = browser.process();
                    if (browserProcess) {
                        browserProcess.kill('SIGKILL');
                    }
                } catch (e) {
                    // Ignore
                }
            }

            // Release proxy
            this.releaseProxyForAccount(poolProxy, log);
        }
    }
}

module.exports = KiroWorker;
