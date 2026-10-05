const { getConfig, getResultFile } = require("../../config");
const { sleep, ensureFileExists } = require("../../utils");
const { launchBrowser } = require("../../browser");
const { completeGoogleLogin } = require("../../providers/google/login");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const fs = require("fs");
const { createRouter } = require("../../providers/router");
const { markAccountCompleted } = require("../../utils/history");

const MODELS = '["@cf/zai-org/glm-5.2","@cf/deepseek-ai/deepseek-r1-distill-qwen-32b","@cf/meta/llama-3.3-70b-instruct-fp8-fast","@cf/qwen/qwen2.5-coder-32b-instruct","@cf/qwen/qwq-32b"]';

class CloudflareWorker extends BaseWorker {
    constructor(openCFSignIn, handlePostLogin, waitForDashboard, harvestToken) {
        super({
            automationName: "Cloudflare",
            workerLabel: "Cloudflare W",
            removeAccountOnSuccess: true,
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: true,
            useProxyPool: true,
        });

        this.openCFSignIn = openCFSignIn;
        this.handlePostLogin = handlePostLogin;
        this.waitForDashboard = waitForDashboard;
        this.harvestToken = harvestToken;
        
        // Circuit breaker for router availability
        this.routerAvailable = true;
        this.lastRouterCheck = 0;
        this.routerFailureCount = 0;
    }

    saveToken(accountId, token, log) {
        const resultFile = getResultFile("cloudflare");
        const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;

        ensureFileExists(resultFile);

        fs.appendFileSync(
            resultFile,
            `cloudflare_${accountId.slice(0, 6)}|${baseUrl}|${token}|${MODELS}\n`,
        );

        log(`Token saved to ${resultFile}`);
    }

    async validateAndImport(apiKey, accountId, log) {
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

            log("Validating provider...");
            await router.validateProvider("cloudflare-ai", apiKey, { accountId });
            log("Validation OK");
            
            const connectionName = `cloudflare_${accountId.slice(0, 6)}`;
            log(`Importing as "${connectionName}"...`);
            await router.importProvider("cloudflare-ai", connectionName, apiKey, { providerSpecificData: { accountId } });
            
            // Success - reset circuit breaker
            this.routerAvailable = true;
            this.routerFailureCount = 0;
            log("Successfully imported to router!");
        } catch (valErr) {
            this.routerAvailable = false;
            this.lastRouterCheck = now;
            this.routerFailureCount++;
            
            if (!valErr.message.includes("timeout")) {
                log(`Router validation/import failed: ${valErr.message} (failure #${this.routerFailureCount}, cooldown 60s)`);
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
            { forceHeadless: true }, // Force background mode for Cloudflare
        );

        let accountId = null;
        let token = null;
        let tokenSaved = false;

        try {
            updateProgress({ step: STEPS.NAVIGATING });
            await this.openCFSignIn(page, log);

            updateProgress({ step: STEPS.GOOGLE_LOGIN });
            await completeGoogleLogin(page, account, log);
            await this.handlePostLogin(page, log);

            updateProgress({ step: STEPS.WAITING });
            await this.waitForDashboard(page, log);

            updateProgress({ step: STEPS.HARVESTING });
            const harvestResult = await this.harvestToken(page, log);
            accountId = harvestResult.accountId;
            token = harvestResult.token;
            
            this.saveToken(accountId, token, log);
            tokenSaved = true;

            updateProgress({ step: STEPS.VALIDATING });
            try {
                await this.validateAndImport(token, accountId, log);
            } catch (importErr) {
                log(`Router import failed (continuing): ${importErr.message}`);
            }

            // Mark account as completed in history
            markAccountCompleted("cloudflare", account.email);
            log(`✅ Account completed: ${account.email}`);

            await sleep(config.delays.beforeBrowserClose);
        } catch (error) {
            // If error occurred after token was extracted, try to save it
            if (accountId && token && !tokenSaved) {
                log('🚨 Error occurred but token exists - attempting to save...');
                try {
                    this.saveToken(accountId, token, log);
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

module.exports = CloudflareWorker;
