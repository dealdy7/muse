const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { launchBrowser } = require("../../browser");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const path = require("path");
const fs = require("fs");
const { completeGoogleLogin } = require("../../providers/google/login");

// FreeBuff proxy local URL
const FREEBUFF_ADMIN_URL = 'http://127.0.0.1:3457/admin#tokens';
const FREEBUFF_BASE_URL = 'http://127.0.0.1:3457';

class FreebuffWorker extends BaseWorker {
    constructor() {
        super({
            automationName: 'FreeBuff Auto Login',
            automationType: 'freebuff',
            workerLabel: "FreeBuff W",
            removeAccountOnSuccess: true,
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: false,
            useProxyPool: false,
            maxWorkers: 1, // Sequential processing
        });
    }

    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        log(`Processing account: ${account.email}`);

        if (!account.email || !account.password) {
            throw new Error("Account must have email and password");
        }

        updateProgress({ step: STEPS.BROWSER });

        // Get proxy if needed
        const { proxy, poolProxy } = await this.acquireProxyForAccount(
            account,
            log,
            updateProgress,
            useProxy
        );

        let browser = null;
        let page = null;

        try {
            // Launch browser
            log("Launching browser...");
            const result = await launchBrowser(browserArgsIndex, workerIndex, proxy, log);
            browser = result.browser;
            page = result.page;

            updateProgress({ step: STEPS.LOGIN });

            // Step 1: Buka FreeBuff admin page
            log("Step 1: Membuka FreeBuff admin page...");
            await page.goto(FREEBUFF_ADMIN_URL, { 
                waitUntil: "domcontentloaded", 
                timeout: 30000 
            });
            await sleep(3000);

            // Step 2: Input password Aldyarif12 (jika ada password field)
            log("Step 2: Memasukkan password admin (jika diperlukan)...");
            try {
                const passwordInput = await page.$('input[type="password"]');
                if (passwordInput) {
                    await passwordInput.click();
                    await page.keyboard.type("Aldyarif12", { delay: 50 });
                    await sleep(500);
                    
                    // Press Tab to move to next field or submit
                    await page.keyboard.press("Tab");
                    await sleep(2000);
                    log("✅ Password entered and Tab pressed");
                } else {
                    log("⚠️  Password input not found, mungkin sudah login");
                }
            } catch (e) {
                log(`Password input skipped: ${e.message}`);
            }

            // Step 3: Tunggu halaman Tokens muncul
            log("Step 3: Menunggu halaman Tokens...");
            await sleep(2000);

            // Step 4: Klik tab/menu "Tokens" jika belum aktif
            log("Step 4: Memastikan di tab Tokens...");
            try {
                // Cari link Tokens di sidebar
                const tokensSelectors = [
                    'a[href*="tokens"]',
                    'button::-p-text(Tokens)',
                    'a::-p-text(Tokens)',
                    '.tokens',
                    '[data-tab="tokens"]'
                ];

                for (const selector of tokensSelectors) {
                    try {
                        const tokensLink = await page.$(selector);
                        if (tokensLink) {
                            await tokensLink.click();
                            await sleep(1500);
                            log("✅ Clicked Tokens tab");
                            break;
                        }
                    } catch (e) {
                        // Try next selector
                    }
                }
            } catch (e) {
                log(`Tokens tab click skipped: ${e.message}`);
            }

            updateProgress({ step: STEPS.PROCESSING });

            // Step 5: Klik "Device Login" atau tombol hijau untuk OAuth
            log("Step 5: Mencari tombol untuk login device...");
            await sleep(2000);

            // Cari tombol dengan berbagai selector
            const deviceLoginSelectors = [
                'button::-p-text(Open in New Tab)', // Tombol hijau di screenshot
                'a::-p-text(Open in New Tab)',
                'button::-p-text(Device Login)',
                'button::-p-text(device login)',
                'a::-p-text(Device Login)',
                'button::-p-text(Sign in)',
                'button::-p-text(Add Token)',
            ];

            let deviceLoginBtn = null;
            for (const selector of deviceLoginSelectors) {
                try {
                    const btns = await page.$$(selector);
                    if (btns.length > 0) {
                        deviceLoginBtn = btns[0];
                        log(`Found button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            if (!deviceLoginBtn) {
                // Fallback: cari tombol hijau atau button dengan class tertentu
                log("Trying fallback: looking for green/primary buttons...");
                const fallbackSelectors = [
                    'button[class*="green"]',
                    'button[class*="primary"]',
                    'a[class*="green"]',
                    'button[class*="btn"]',
                    'a.button'
                ];

                for (const selector of fallbackSelectors) {
                    const buttons = await page.$$(selector);
                    if (buttons.length > 0) {
                        deviceLoginBtn = buttons[0];
                        log(`Found button via fallback: ${selector}`);
                        break;
                    }
                }
            }

            if (!deviceLoginBtn) {
                throw new Error("Device Login button tidak ditemukan. Pastikan FreeBuff sudah running di http://127.0.0.1:3457");
            }

            // Step 6: Klik tombol Device Login
            log("Step 6: Klik Device Login button...");
            
            // Set up listener for new page BEFORE clicking
            const newPagePromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout waiting for Google login popup"));
                }, 15000);

                const listener = async (target) => {
                    if (target.type() === 'page') {
                        clearTimeout(timeout);
                        browser.removeListener('targetcreated', listener);
                        resolve(target);
                    }
                };

                browser.on('targetcreated', listener);
            });

            // Click button
            await deviceLoginBtn.click();
            log("Button clicked, waiting for new tab...");

            // Step 7: Tunggu popup OAuth atau tab baru Google login
            log("Step 7: Menunggu Google login popup/tab...");
            
            const newTarget = await newPagePromise;
            const googlePage = await newTarget.page();
            await sleep(2000);

            log("✅ Google login page opened");

            // Step 8: Login via Google menggunakan account dari txt
            log(`Step 8: Login Google dengan ${account.email}...`);
            await completeGoogleLogin(googlePage, account, log);

            // Step 9: Tunggu OAuth selesai
            log("Step 9: Menunggu OAuth callback...");
            await sleep(5000);

            // Check if token added successfully
            await page.bringToFront();
            
            // Tunggu sampai halaman kembali ke admin tokens atau ada perubahan
            log("Checking result...");
            for (let i = 0; i < 15; i++) {
                await sleep(1000);
                
                // Check if we're back at FreeBuff admin
                try {
                    const currentUrl = page.url();
                    if (currentUrl.includes('127.0.0.1:3457') || currentUrl.includes('localhost:3457')) {
                        log("✅ Kembali ke FreeBuff admin page");
                        break;
                    }
                } catch (e) {
                    // Continue waiting
                }
            }

            await sleep(3000);

            // Verify token added by checking page content
            log("Verifying token addition...");
            const pageContent = await page.content();
            
            // Check for success indicators
            const successIndicators = [
                'ACTIVE',
                'active',
                'token',
                'Total:',
                account.email.split('@')[0], // Check username part
            ];

            let success = false;
            let foundIndicator = null;
            for (const indicator of successIndicators) {
                if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
                    log(`✅ Success indicator found: ${indicator}`);
                    foundIndicator = indicator;
                    success = true;
                    break;
                }
            }

            if (success) {
                log(`✅ Account ${account.email} berhasil ditambahkan ke FreeBuff`);
                updateProgress({ step: STEPS.DONE });
            } else {
                throw new Error("Token verification failed - success indicator not found in page");
            }

        } catch (error) {
            log(`❌ Error: ${error.message}`);
            throw error;
        } finally {
            // Cleanup
            if (browser) {
                try {
                    await browser.close();
                    log("Browser closed");
                } catch (e) {
                    log(`Error closing browser: ${e.message}`);
                }
            }

            this.releaseProxyForAccount(poolProxy, log);
        }
    }
}

async function runFreebuffAutomation(accounts, sharedProgress = null, useProxy = false) {
    const worker = new FreebuffWorker();
    const results = await worker.run(accounts, sharedProgress, useProxy);

    return results;
}

module.exports = {
    FreebuffWorker,
    runFreebuffAutomation,
};
