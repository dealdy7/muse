const { getConfig, getResultFile } = require("../../config");
const { sleep, ensureFileExists } = require("../../utils");
const { launchBrowser } = require("../../browser");
const { completeGoogleLogin } = require("../../providers/google/login");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const fs = require("fs");
const { createRouter } = require("../../providers/router");
const { markAccountCompleted } = require("../../utils/history");

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
        
        // Circuit breaker for router availability
        this.routerAvailable = true;
        this.lastRouterCheck = 0;
        this.routerFailureCount = 0;
    }

    saveRefreshToken(email, refreshToken, log) {
        const resultFile = getResultFile("kiro");
        ensureFileExists(resultFile);
        fs.appendFileSync(resultFile, `${email}|${refreshToken}\n`);
        log(`Refresh token saved to ${resultFile}`);
    }

    async importRefreshToken(refreshToken, log) {
        // Circuit breaker: Skip if router is known to be down
        const now = Date.now();
        const cooldownRemaining = 60000 - (now - this.lastRouterCheck);
        
        if (!this.routerAvailable && cooldownRemaining > 0) {
            log(`Router unavailable (skipping, ${Math.round(cooldownRemaining / 1000)}s cooldown remaining)`);
            return;
        }

        // Reset failure count after 5 minutes
        if (now - this.lastRouterCheck > 300000) {
            this.routerFailureCount = 0;
        }

        try {
            const { ok, router, error } = await createRouter(null, log);
            if (!ok) {
                this.routerAvailable = false;
                this.lastRouterCheck = now;
                this.routerFailureCount++;
                log(`Router unavailable: ${error} (failure #${this.routerFailureCount}, cooldown 60s)`);
                return;
            }

            log("Importing refresh token to router...");
            await router.importRefreshToken("kiro", refreshToken);
            
            // Success - reset circuit breaker
            this.routerAvailable = true;
            this.routerFailureCount = 0;
            log("Successfully imported token to router!");
        } catch (importErr) {
            this.routerAvailable = false;
            this.lastRouterCheck = now;
            this.routerFailureCount++;
            
            if (!importErr.message.includes("timeout")) {
                log(`Router import failed: ${importErr.message} (failure #${this.routerFailureCount}, cooldown 60s)`);
            } else {
                log(`Router timeout (failure #${this.routerFailureCount}, cooldown 60s)`);
            }
        }
    }

    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        const config = getConfig();
        
        const { proxy, poolProxy } = await this.acquireProxyForAccount(
            account,
            log,
            updateProgress,
            useProxy,
        );

        updateProgress({ step: STEPS.LAUNCHING, email: account.email });
        log(`Launching browser for ${account.email} (HEADLESS MODE)`);

        const { browser, page } = await launchBrowser(
            browserArgsIndex,
            workerIndex,
            proxy,
            { forceHeadless: true }, // Force background mode for Kiro
        );

        let refreshToken = null;
        let tokenSaved = false;

        try {
            updateProgress({ step: STEPS.NAVIGATING });
            await this.openKiroSignIn(page, log);

            updateProgress({ step: STEPS.GOOGLE_LOGIN });
            await completeGoogleLogin(page, account, log);
            await this.handlePostLogin(page, log);

            updateProgress({ step: STEPS.WAITING });
            await this.waitForDashboard(page, log);

            updateProgress({ step: STEPS.GETTING_TOKEN });
            refreshToken = await this.getRefreshToken(page, log);
            this.saveRefreshToken(account.email, refreshToken, log);
            tokenSaved = true;

            updateProgress({ step: STEPS.IMPORTING });
            try {
                await this.importRefreshToken(refreshToken, log);
            } catch (importErr) {
                // Import failures handled internally - just continue
            }

            // Mark account as completed in history
            markAccountCompleted("kiro", account.email);
            log(`✅ Account completed: ${account.email}`);

            await sleep(config.delays.beforeBrowserClose);
        } catch (error) {
            // If error occurred after token was extracted, try to save it
            if (refreshToken && !tokenSaved) {
                log('🚨 Error occurred but token exists - attempting to save...');
                try {
                    this.saveRefreshToken(account.email, refreshToken, log);
                    tokenSaved = true;
                    log('✅ Token saved despite error');
                } catch (saveErr) {
                    log(`❌ Failed to save token after error: ${saveErr.message}`);
                }
            }
            throw error;
        } finally {
            await browser.close();
            log("Browser closed.");
            this.releaseProxyForAccount(poolProxy, log);
        }
    }
}

module.exports = KiroWorker;
