const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");

class FreeModelWorker extends BaseWorker {
    constructor() {
        super({
            automationName: 'FreeModel.dev Signup',
            automationType: 'freemodel',
            workerLabel: "FreeModel W",
            removeAccountOnSuccess: false, // Keep accounts
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: false,
            useProxyPool: true,
            maxWorkers: 4,
        });
    }

    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        const config = getConfig();
        
        if (!account.email || !account.password) {
            throw new Error("Account must have email and password");
        }

        if (!config.inviteUrl) {
            throw new Error("INVITE_URL not set! Please set it in Settings menu.");
        }

        const { proxy, poolProxy } = await this.acquireProxyForAccount(
            account,
            log,
            updateProgress,
            useProxy,
        );

        updateProgress({ step: STEPS.LAUNCHING, email: account.email });
        log(`Launching browser for ${account.email}`);

        const { browser, page } = await this.launchBrowser(
            browserArgsIndex,
            workerIndex,
            proxy,
            log
        );

        try {
            // STEP 1: Navigate to invite URL
            updateProgress({ step: STEPS.NAVIGATING });
            log(`Step 1: Navigating to ${config.inviteUrl}...`);
            
            await page.goto(config.inviteUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            });
            await sleep(2000);

            // STEP 2: Click Sign in with Google
            updateProgress({ step: STEPS.GOOGLE_LOGIN });
            log('Step 2: Looking for Google Sign In button...');
            
            await sleep(1500);
            
            // Try multiple selectors for Google button (button or link)
            log('Step 2: Looking for Google Sign In button...');
            await sleep(1500);
            
            // Use page.click() with Promise.all for navigation
            const googleButtonSelector = 'a.btn-google, a[href*="google"], button:has-text("Google")';
            
            try {
                // Wait for button to be visible
                await page.waitForSelector(googleButtonSelector, { timeout: 5000 });
                
                log('✅ Found Google button, clicking and waiting for navigation...');
                
                // Click and wait for navigation simultaneously
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
                    page.click(googleButtonSelector)
                ]);
                
                log('✅ Navigation completed after click');
            } catch (error) {
                log(`❌ Failed to click or navigate: ${error.message}`);
                throw new Error(`Google button click failed: ${error.message}`);
            }
            
            await sleep(2000);

            // STEP 3: Handle Google Login
            log('Step 3: Handling Google login...');
            await sleep(1500);
            
            const pageUrl = page.url();
            log(`Current URL: ${pageUrl}`);
            
            if (pageUrl.includes('accounts.google.com')) {
                // Use fast Google login helper
                const { completeGoogleLogin } = require("../../providers/google/login");
                await completeGoogleLogin(page, account, log);
                
                log('✅ Google login completed');
                await sleep(3000);
            } else if (pageUrl === 'https://freemodel.dev/#' || pageUrl === 'https://freemodel.dev/') {
                // NOT redirected - Google button click failed!
                throw new Error('Google OAuth redirect failed - still on FreeModel homepage. Button click may not have worked.');
            } else {
                log('⚠️ Unexpected URL - checking if already logged in...');
            }

            // STEP 4: Wait for redirect back to FreeModel
            log('Step 4: Waiting for redirect to FreeModel dashboard...');
            await sleep(5000);
            
            const finalUrl = page.url();
            log(`Final URL: ${finalUrl}`);
            
            if (finalUrl.includes('freemodel.dev')) {
                log('✅ Successfully signed up to FreeModel.dev!');
                
                // Take screenshot
                await page.screenshot({ path: `freemodel_${Date.now()}.png` });
                
                // Wait a bit to ensure session is saved
                await sleep(3000);
                
                // STEP 5: Extract API key from FreeModel dashboard
                log('Step 5: Extracting API key from FreeModel...');
                const apiKey = await page.evaluate(() => {
                    // Try to find API key in page (check various selectors)
                    const codeElements = document.querySelectorAll('code, pre, input[type="text"], input[type="password"]');
                    for (const el of codeElements) {
                        const text = el.value || el.textContent || '';
                        // FreeModel API keys typically start with 'sk-' or similar
                        if (text.match(/sk-[a-zA-Z0-9_-]{32,}/)) {
                            return text.trim();
                        }
                    }
                    
                    // Check localStorage
                    try {
                        const stored = localStorage.getItem('apiKey') || localStorage.getItem('freemodel_api_key');
                        if (stored) return stored;
                    } catch (e) {}
                    
                    return null;
                });
                
                if (!apiKey) {
                    log('⚠️ Could not extract API key automatically. Manual extraction needed.');
                } else {
                    log(`✅ API Key extracted: ${apiKey.substring(0, 15)}...`);
                    
                    // STEP 6: Add to 9Router
                    log('Step 6: Adding FreeModel API key to 9Router...');
                    await this.registerToRouter(account.email, apiKey, log);
                }
                
                this.onAccountSuccess(account, log);
            } else {
                throw new Error(`Unexpected final URL: ${finalUrl}`);
            }

        } catch (error) {
            this.onAccountFailure(account, error, log);
            throw error;
        } finally {
            this.releaseProxyForAccount(poolProxy, log);
            const { closeBrowserSafely } = require("../../browser");
            await closeBrowserSafely(browser, log);
        }
    }

    async registerToRouter(accountEmail, apiKey, log) {
        const { createRouter } = require("../../providers/router");
        
        const { ok, router, error } = await createRouter(null, log);
        if (!ok) { 
            log(`⚠️ Router connection failed: ${error}`);
            return;
        }

        try {
            log("Step 6.1: Ensuring FreeModel provider node in 9Router...");
            const providerNodeId = await router.ensureProviderNode(
                "FreeModel",
                "openai-tf-sg",
                "chat",
                "https://api.freemodel.dev/v1",
                "openai-compatible",
            );
            log(`✅ FreeModel provider node: ${providerNodeId}`);

            log("Step 6.2: Registering API key to 9Router...");
            await router.importProvider(
                providerNodeId,
                `freemodel`,
                apiKey,
                { defaultModel: "gpt-4o" },
            );

            log(`✅ FreeModel key for ${accountEmail} successfully added to 9Router!`);
        } catch (error) {
            log(`⚠️ Failed to add to 9Router: ${error.message}`);
        }
    }

    async launchBrowser(browserArgsIndex, workerIndex, proxy, log) {
        const puppeteer = require("puppeteer-extra");
        const StealthPlugin = require("puppeteer-extra-plugin-stealth");
        puppeteer.use(StealthPlugin());
        
        const config = getConfig();
        
        const extraArgs = [
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
        ];
        
        if (proxy) {
            extraArgs.push(`--proxy-server=${proxy}`);
            log(`Using proxy: ${proxy}`);
        }
        
        const browser = await puppeteer.launch({
            headless: false, // ← PERBAIKAN: VISIBLE untuk debug
            slowMo: config.slowMo,
            executablePath: config.chromeExecutablePath,
            defaultViewport: null,
            args: [...config.browserArgsSets[browserArgsIndex], ...extraArgs],
            ignoreDefaultArgs: ["--enable-automation"],
        });
        
        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        
        // Anti-detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            window.chrome = { runtime: {} };
        });
        
        return { browser, page };
    }
}

module.exports = FreeModelWorker;
