const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { launchBrowser } = require("../../browser");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const path = require("path");
const os = require("os");
const fs = require("fs");

const TARGET_URL = 'http://localhost:20128/';
const OPENROUTER_URL = 'https://openrouter.ai';
const PROVIDER_SELECTOR = 'a[href="/dashboard/providers"]';

// Persistent profile directory for OpenRouter automation
const PERSISTENT_PROFILE_DIR = path.join(os.tmpdir(), 'openrouter_chrome_profile');

class OpenRouterWorker extends BaseWorker {
    constructor(isSetupMode = false) {
        super({
            automationName: isSetupMode ? 'OpenRouter Setup' : 'OpenRouter',
            automationType: 'openrouter',
            workerLabel: isSetupMode ? "Setup W" : "OpenRouter W",
            removeAccountOnSuccess: true,
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: false,
            useProxyPool: false,
            maxWorkers: 1, // For now: 1 worker until we fix blank tab issue
        });
        this.isSetupMode = isSetupMode;
    }

    async launchPersistentBrowser(browserArgsIndex, workerIndex, proxy, log) {
        const puppeteer = require("puppeteer-extra");
        const StealthPlugin = require("puppeteer-extra-plugin-stealth");
        
        // Use stealth with all evasions enabled
        const stealth = StealthPlugin();
        stealth.enabledEvasions.delete('iframe.contentWindow'); // This can cause issues
        stealth.enabledEvasions.delete('navigator.plugins'); // This can cause issues
        puppeteer.use(stealth);
        
        const config = getConfig();
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        
        // Get Chrome profile path from env or auto-detect
        let realChromeProfile = process.env.CHROME_PROFILE_PATH || '';
        
        if (!realChromeProfile) {
            // Auto-detect: Windows default Chrome profile
            realChromeProfile = path.join(
                os.homedir(), 
                'AppData', 
                'Local', 
                'Google', 
                'Chrome', 
                'User Data'
            );
        }
        
        // Check if real Chrome profile exists
        if (!fs.existsSync(realChromeProfile)) {
            throw new Error(
                `Chrome profile not found at: ${realChromeProfile}\n\n` +
                `Please either:\n` +
                `1. Install Chrome and login to Google manually, OR\n` +
                `2. Set CHROME_PROFILE_PATH in .env to your Chrome User Data directory\n\n` +
                `See OPENROUTER_SETUP.md for detailed instructions.`
            );
        }
        
        // Use a separate profile directory to avoid conflicts with running Chrome
        const profileName = 'OpenRouterBot';
        
        const extraArgs = [
            "--start-maximized", 
            "--window-size=1920,1080",
            `--profile-directory=${profileName}`, // Use separate profile to avoid lock
            "--disable-blink-features=AutomationControlled", // Hide automation
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-web-security", // Help with CAPTCHA loading
            "--disable-features=VizDisplayCompositor",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
        ];
        
        log(`Using Chrome profile: ${realChromeProfile}\\${profileName}`);
        
        const browser = await puppeteer.launch({
            headless: false, // MUST be visible
            slowMo: config.slowMo,
            executablePath: config.chromeExecutablePath,
            defaultViewport: null,
            args: [...config.browserArgsSets[browserArgsIndex], ...extraArgs],
            userDataDir: realChromeProfile, // Use REAL Chrome data
            ignoreDefaultArgs: ["--enable-automation", "--enable-blink-features=AutomationControlled"],
        });
        
        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        
        // Enhanced anti-detection measures
        await page.evaluateOnNewDocument(() => {
            // Override navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Mock chrome object
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {},
            };
            
            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Override plugins to look more real
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });
        
        return { browser, page };
    }

    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        const config = getConfig();
        
        if (!account.email || !account.password) {
            throw new Error("Account must have email and password for OpenRouter login");
        }
        
        const { proxy, poolProxy } = await this.acquireProxyForAccount(
            account,
            log,
            updateProgress,
            useProxy,
        );

        updateProgress({ step: STEPS.LAUNCHING, email: account.email });
        log(`Launching PERSISTENT browser for ${account.email}`);

        const { browser, page } = await this.launchPersistentBrowser(
            browserArgsIndex,
            workerIndex,
            proxy,
            log
        );

        try {
            // STEP 1: Navigate to OpenRouter sign-in
            updateProgress({ step: STEPS.NAVIGATING });
            log('Step 1: Navigating to OpenRouter sign-in...');
            
            const openRouterSignInUrl = 'https://openrouter.ai/sign-in?redirect_url=https%3A%2F%2Fopenrouter.ai%2Fworkspaces%2Fdefault%2Fkeys';
            await page.goto(openRouterSignInUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            log('On OpenRouter sign-in page');

            // STEP 2: Click Google button (OPTIMIZED - no excessive waits)
            updateProgress({ step: STEPS.GOOGLE_LOGIN });
            log('Step 2: Clicking Google button...');
            
            await sleep(1500); // Minimal wait for page render
            
            // Direct click - no waitForSelector
            const googleClicked = await page.evaluate(() => {
                const googleBtn = document.querySelector('button.cl-socialButtonsIconButton__google');
                if (googleBtn) {
                    googleBtn.click();
                    return true;
                }
                // Fallback: second SVG button
                const svgButtons = Array.from(document.querySelectorAll('button')).filter(b => b.querySelector('svg'));
                if (svgButtons[1]) {
                    svgButtons[1].click();
                    return true;
                }
                return false;
            });
            
            if (!googleClicked) {
                throw new Error('Google button not found');
            }
            
            log('✅ Google button clicked');
            await sleep(2000);

            // STEP 3: Handle Cloudflare Turnstile (if present)
            const turnstilePresent = await page.evaluate(() => {
                return document.querySelector('input[aria-label*="Verify you are human"]') !== null ||
                       Array.from(document.querySelectorAll('iframe')).some(i => i.src.includes('cloudflare'));
            });
            
            if (turnstilePresent) {
                log('⚠️ Cloudflare detected! Please click "Verify you are human" manually (20s window)');
                await sleep(20000);
                log('Resuming after Turnstile window');
            }

            // STEP 4: FAST Google login
            log('Step 4: Handling Google login...');
            await sleep(1500);
            
            const pageUrl = page.url();
            log(`Current URL: ${pageUrl}`);
            
            if (pageUrl.includes('accounts.google.com')) {
                // Check for "Choose account" page
                const pageText = await page.evaluate(() => document.body.innerText);
                
                if (pageText.includes('Choose an account')) {
                    const emailPresent = await page.evaluate((email) => {
                        return document.body.innerText.includes(email);
                    }, account.email);
                    
                    if (emailPresent) {
                        log(`Clicking account ${account.email}...`);
                        await page.evaluate((email) => {
                            const divs = Array.from(document.querySelectorAll('div'));
                            for (const div of divs) {
                                if (div.textContent.includes(email)) {
                                    div.click();
                                    break;
                                }
                            }
                        }, account.email);
                        await sleep(1500);
                    } else {
                        log('Clicking "Use another account"...');
                        try {
                            await page.click('text/Use another account');
                            await sleep(1500);
                        } catch (e) {
                            log('Could not find "Use another account"');
                        }
                    }
                }
                
                // FAST LOGIN: Direct typing without helper function
                await sleep(1000);
                const currentUrl = page.url();
                
                if (currentUrl.includes('accounts.google.com')) {
                    log('⚡ FAST LOGIN: Typing email...');
                    
                    try {
                        // Email field
                        await page.waitForSelector('#identifierId', { timeout: 10000, visible: true });
                        await page.click('#identifierId');
                        await page.keyboard.type(account.email, { delay: 3 }); // SUPER FAST
                        log(`✅ Email typed (${account.email})`);
                        
                        // Next button
                        await sleep(200);
                        await page.click('#identifierNext');
                        log('Clicked Next (email)');
                        
                        // Password field
                        await sleep(1500);
                        await page.waitForSelector('input[type="password"]', { timeout: 30000, visible: true });
                        await page.click('input[type="password"]');
                        await page.keyboard.type(account.password, { delay: 3 }); // SUPER FAST
                        log('✅ Password typed');
                        
                        // Next button (password)
                        await sleep(200);
                        await page.click('#passwordNext');
                        log('Clicked Next (password)');
                        
                        await sleep(2000);
                        
                    } catch (e) {
                        log(`Error during fast login: ${e.message}`);
                    }
                }
                
                // Handle Continue button (OAuth consent)
                await sleep(1500);
                const continueBtn = await page.$('button::-p-text(Continue)');
                if (continueBtn) {
                    log('Clicking Continue...');
                    await continueBtn.click();
                    await sleep(1500);
                }
                
            } else {
                log('Not on Google page, may already be logged in');
            }

            // STEP 5: Wait for redirect to OpenRouter (with retry on navigation errors)
            log('Step 5: Waiting for redirect to OpenRouter...');
            await sleep(4000);
            
            let finalUrl = '';
            let retries = 0;
            const maxRetries = 3;
            
            while (retries < maxRetries) {
                try {
                    finalUrl = page.url();
                    log(`Current URL: ${finalUrl}`);
                    
                    // Check for OpenRouter errors
                    if (finalUrl.includes('openrouter.ai')) {
                        try {
                            const pageText = await page.evaluate(() => document.body.innerText);
                            
                            if (pageText.includes('External Account was not found') || 
                                pageText.includes('not found') ||
                                pageText.includes('Sign In')) {
                                log('⚠️ OpenRouter Error or Still on Sign In page!');
                                log('Possible issues:');
                                log('1. Account not registered with OpenRouter yet');
                                log('2. Google OAuth failed');
                                log('3. Still processing redirect');
                                
                                // Wait a bit more and retry
                                if (retries < maxRetries - 1) {
                                    log(`Waiting 5s more... (retry ${retries + 1}/${maxRetries})`);
                                    await sleep(5000);
                                    retries++;
                                    continue;
                                } else {
                                    await page.screenshot({ path: `openrouter_error_${Date.now()}.png` });
                                    throw new Error('OpenRouter: Still on sign-in page or account not found. May need manual setup.');
                                }
                            }
                        } catch (evalError) {
                            log(`Could not evaluate page (page might be navigating): ${evalError.message}`);
                            await sleep(3000);
                            retries++;
                            continue;
                        }
                    }
                    
                    if (!finalUrl.includes('openrouter.ai')) {
                        log('⚠️ Not on OpenRouter yet, waiting more...');
                        await sleep(4000);
                        retries++;
                        continue;
                    }
                    
                    // Success - on OpenRouter
                    break;
                    
                } catch (e) {
                    log(`Error checking URL (attempt ${retries + 1}/${maxRetries}): ${e.message}`);
                    if (e.message.includes('Execution context was destroyed') || 
                        e.message.includes('Cannot find context')) {
                        log('Page navigated, waiting for it to stabilize...');
                        await sleep(3000);
                        retries++;
                        continue;
                    }
                    throw e;
                }
            }
            
            log(`Final URL: ${finalUrl}`);

            // STEP 6: Navigate to API Keys page
            log('Step 6: Navigating to API Keys page...');
            await page.goto('https://openrouter.ai/settings/keys', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await sleep(1500);

            // STEP 7: Click "New Key" button
            log('Step 7: Clicking "New Key"...');
            await page.waitForSelector('button::-p-text(New Key), button::-p-text(+ New Key)', { timeout: 10000 });
            const newKeyButtons = await page.$$('button::-p-text(New Key), button::-p-text(+ New Key)');
            if (newKeyButtons.length === 0) {
                throw new Error('"New Key" button not found');
            }
            await newKeyButtons[0].click();
            await sleep(1500);

            // STEP 8: Extract API key
            log('Step 8: Extracting API key...');
            await sleep(1500);
            
            const apiKey = await page.evaluate(() => {
                const textNodes = document.evaluate(
                    "//text()[contains(., 'sk-or-')]",
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                
                for (let i = 0; i < textNodes.snapshotLength; i++) {
                    const text = textNodes.snapshotItem(i).textContent.trim();
                    const match = text.match(/sk-or-v1-[a-zA-Z0-9]{50,}/);
                    if (match) return match[0];
                }
                
                const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
                for (const input of inputs) {
                    if (input.value && input.value.startsWith('sk-or-')) {
                        return input.value;
                    }
                }
                
                return null;
            });

            if (!apiKey) {
                throw new Error('Could not extract API key');
            }
            
            log('✅ API key extracted: ' + apiKey.substring(0, 20) + '...');

            // STEP 9: Add to 9Router
            log('Step 9: Adding to 9Router...');
            await page.goto(`${TARGET_URL}dashboard/providers/openrouter`, { waitUntil: 'networkidle2', timeout: 30000 });
            await sleep(1500);

            // Open modal
            const getKeyButton = await page.$('button::-p-text(Get API Key)');
            if (getKeyButton) {
                await getKeyButton.click();
                await sleep(1200);
            }

            // Fill modal
            await page.waitForSelector('input', { timeout: 5000 });
            await sleep(600);
            
            const inputs = await page.$$('input[type="text"], input[type="password"]');
            if (inputs.length < 2) {
                throw new Error('Not enough input fields in modal');
            }
            
            const keyName = account.email.substring(0, 5);
            log(`Setting key name: ${keyName}`);
            await inputs[0].click();
            await page.keyboard.type(keyName, { delay: 5 });
            
            log('Pasting API key...');
            await inputs[1].click();
            await page.keyboard.type(apiKey, { delay: 3 });
            
            await sleep(600);
            
            const saveButtons = await page.$$('button::-p-text(Save)');
            if (saveButtons.length > 0) {
                log('Clicking Save...');
                await saveButtons[0].click();
                await sleep(2000);
            }

            // STEP 10: Verify
            log('Step 10: Verifying...');
            updateProgress({ step: STEPS.WAITING });
            
            let newConnectionId = null;
            let verifyAttempts = 0;
            const maxVerifyAttempts = 10;
            
            while (verifyAttempts < maxVerifyAttempts && !newConnectionId) {
                await sleep(1200);
                verifyAttempts++;
                
                try {
                    const providersData = await page.evaluate(async () => {
                        const res = await fetch('/api/providers');
                        return await res.json();
                    });
                    
                    const connections = providersData.connections || [];
                    const openRouterConnections = connections.filter(c => 
                        c.provider === 'openrouter' || 
                        (c.name && c.name.toLowerCase().includes('openrouter'))
                    );
                    
                    if (openRouterConnections.length > 0) {
                        const newestConnection = openRouterConnections.sort((a, b) => b.id - a.id)[0];
                        newConnectionId = newestConnection.id;
                        log(`✅ Found OpenRouter connection! ID: ${newConnectionId}, Name: ${newestConnection.name}`);
                        break;
                    } else {
                        log(`Attempt ${verifyAttempts}/${maxVerifyAttempts}: No OpenRouter connection found yet...`);
                    }
                } catch (e) {
                    log(`Attempt ${verifyAttempts}/${maxVerifyAttempts}: Error checking connections: ${e.message}`);
                }
            }

            if (newConnectionId) {
                log('✅ OpenRouter API Key successfully added to 9Router! ID: ' + newConnectionId);
                this.onAccountSuccess(account, log);
            } else {
                throw new Error("OpenRouter API Key did not appear in 9Router API");
            }

        } catch (error) {
            this.onAccountFailure(account, error, log);
            throw error;
        } finally {
            const { closeBrowserSafely } = require("../../browser");
            await closeBrowserSafely(browser, log);
            this.releaseProxyForAccount(poolProxy, log);
        }
    }
}

module.exports = OpenRouterWorker;
