const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const path = require("path");

class ProfileSetupWorker extends BaseWorker {
    constructor() {
        super({
            automationName: 'OpenRouter Profile Setup',
            automationType: 'openrouter-setup',
            workerLabel: "Profile W",
            removeAccountOnSuccess: false, // Keep accounts for later
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: false,
            useProxyPool: false,
            maxWorkers: 1,
        });
    }

    async launchProfileBrowser(browserArgsIndex, workerIndex, proxy, log) {
        const puppeteer = require("puppeteer-extra");
        const StealthPlugin = require("puppeteer-extra-plugin-stealth");
        puppeteer.use(StealthPlugin());
        
        const fs = require("fs");
        
        // Use user's warnet Chrome setup from start.bat
        const chromePath = 'D:\\Aplikasi\\Google\\Chrome\\Application\\chrome.exe';
        const profilePath = 'F:\\Akun\\Bot';
        
        // Check if Chrome exists at D: first
        if (!fs.existsSync(chromePath)) {
            throw new Error(`Chrome not found at ${chromePath}. Check start.bat setup!`);
        }
        
        log(`Using Chrome: ${chromePath}`);
        log(`Using profile: ${profilePath}`);
        
        // Clean singleton locks (like start.bat does)
        try {
            const singletonLock = path.join(profilePath, 'SingletonLock');
            const singletonCookie = path.join(profilePath, 'SingletonCookie');
            if (fs.existsSync(singletonLock)) fs.unlinkSync(singletonLock);
            if (fs.existsSync(singletonCookie)) fs.unlinkSync(singletonCookie);
            log('Cleaned singleton locks');
        } catch (e) {
            log(`Could not clean locks: ${e.message}`);
        }
        
        // Use start.bat args but without remote debugging
        const extraArgs = [
            "--start-maximized",
            "--no-first-run",
            "--disable-extensions-file-access-check",
            "--disable-session-crashed-bubble",
            "--password-store=basic",
            "--disable-blink-features=AutomationControlled",
        ];
        
        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 0, // No slowmo
            executablePath: chromePath,
            defaultViewport: null,
            args: extraArgs,
            userDataDir: profilePath,
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

    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        const config = getConfig();
        
        if (!account.email || !account.password) {
            throw new Error("Account must have email and password");
        }

        updateProgress({ step: STEPS.LAUNCHING, email: account.email });
        log(`Setting up profile for ${account.email}`);

        const { browser, page } = await this.launchProfileBrowser(
            browserArgsIndex,
            workerIndex,
            null,
            log
        );

        try {
            // Navigate directly to Google Sign In (not OpenRouter!)
            updateProgress({ step: STEPS.NAVIGATING });
            log('Navigating to Google Sign In...');
            
            const googleSignInUrl = 'https://accounts.google.com/v3/signin/identifier?continue=https://myaccount.google.com/?hl%3Did%26pli%3D1&hl=id&flowName=GlifWebSignIn&flowEntry=AddSession';
            
            await page.goto(googleSignInUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            });
            await sleep(2000);

            // Check if already logged in
            const pageText = await page.evaluate(() => document.body.innerText);
            
            if (pageText.includes(account.email)) {
                log(`✅ ${account.email} already logged in!`);
                this.onAccountSuccess(account, log);
                return;
            }

            // Login process
            updateProgress({ step: STEPS.GOOGLE_LOGIN });
            log('Logging in to Google...');
            
            const { completeGoogleLogin } = require("../../providers/google/login");
            await completeGoogleLogin(page, account, log);
            
            log('✅ Google login completed!');
            await sleep(3000);
            
            // Verify login success
            await page.goto('https://myaccount.google.com', { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
            await sleep(2000);
            
            const verifyText = await page.evaluate(() => document.body.innerText);
            if (verifyText.includes(account.email) || verifyText.includes('Google Account')) {
                log(`✅ ${account.email} successfully saved to profile!`);
                log('');
                log('═══════════════════════════════════════════════════════');
                log('⚠️  IMPORTANT: DO NOT CLOSE THIS BROWSER WINDOW YET!');
                log('Browser will stay open for 10 seconds to ensure profile saves.');
                log('═══════════════════════════════════════════════════════');
                log('');
                
                // Wait to ensure profile is saved
                await sleep(10000);
                
                this.onAccountSuccess(account, log);
            } else {
                throw new Error('Login verification failed');
            }

        } catch (error) {
            this.onAccountFailure(account, error, log);
            throw error;
        } finally {
            const { closeBrowserSafely } = require("../../browser");
            await closeBrowserSafely(browser, log);
        }
    }
}

module.exports = ProfileSetupWorker;
