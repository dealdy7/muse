const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { launchBrowser } = require("../../browser");
const { completeGoogleLogin } = require("../../providers/google/login");
const { STEPS } = require("../../cli/progress");
const BaseWorker = require("../base/BaseWorker");
const { clickSelector } = require("../../browser/helpers");
// Use more robust selectors that are less likely to break
const PROVIDER_SELECTOR = 'a[href="/dashboard/providers"]';

const ANTIGRAVITY_SELECTOR =
  "body > div.flex.h-screen.w-full.overflow-hidden.bg-bg > main > div.flex-1.overflow-y-auto.custom-scrollbar.p-6.lg\\:p-10 > div > div > div:nth-child(2) > div.grid.grid-cols-1.gap-3.sm\\:grid-cols-2.sm\\:gap-4.lg\\:grid-cols-3.xl\\:grid-cols-4 > a:nth-child(2) > div > div > div.flex.min-w-0.items-center.gap-3 > div.min-w-0 > h3";

const ADD_SELECTOR = "body > div.flex.h-screen.w-full.overflow-hidden.bg-bg > main > div.flex-1.overflow-y-auto.custom-scrollbar.p-6.lg\\:p-10 > div > div > div:nth-child(3) > div.mt-4.grid.grid-cols-1.gap-2.sm\\:flex > button";
const CONFIRM_SELECTOR = "div.fixed.z-50 button.bg-red-500, div.fixed.z-50 button.bg-red-600";

const I_UNDERSTAND_SELECTOR = "#gaplustosNext > div > button > div.VfPpkd-RLmnJb";
const LOGIN_SELECTOR = "#submit_approve_access > div > button > div.VfPpkd-RLmnJb";

class RouterWorker extends BaseWorker {
    constructor(providerMode = 'antigravity') {
        super({
            automationName: `9Router (${providerMode})`,
            workerLabel: providerMode === 'antigravity' ? "AntiGrav W" : 
                         providerMode === 'gemini' ? "Gemini W" : 
                         providerMode === 'kimi' ? "Kimi W" : "Router W",
            removeAccountOnSuccess: true,
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: true,
            useProxyPool: true,
        });
        this.providerMode = providerMode;
    }

    async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
        const config = getConfig();
        const TARGET_URL = config.routerUrl || 'http://localhost:20128/';
        
        log(`Using 9Router URL: ${TARGET_URL}`);
        
        const { proxy, poolProxy } = await this.acquireProxyForAccount(
            account,
            log,
            updateProgress,
            useProxy,
        );

        updateProgress({ step: STEPS.LAUNCHING, email: account.email });
        log(`Launching browser for ${account.email}`);

        const { browser, page } = await launchBrowser(
            browserArgsIndex,
            workerIndex,
            proxy,
            { forceHeadless: false } // Use browser with UI for debugging (Incognito mode for clean sessions)
        );

        try {
            updateProgress({ step: STEPS.NAVIGATING });
            log(`Navigating to ${TARGET_URL}`);
            
            // Add page error logging
            page.on('pageerror', err => log(`Page error: ${err.message}`));
            page.on('requestfailed', req => log(`Request failed: ${req.url()}`));
            await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Get initial connections to verify later
            let initialConnections = [];
            try {
                const initialProvidersData = await page.evaluate(async () => {
                    const res = await fetch('/api/providers');
                    return await res.json();
                });
                initialConnections = initialProvidersData.connections || [];
            } catch(e) {
                log('Warning: Could not fetch initial connections: ' + e.message);
            }

            log('Clicking Provider menu...');
            try {
                await page.waitForSelector(PROVIDER_SELECTOR, { timeout: 10000 });
                await page.click(PROVIDER_SELECTOR);
                log('Provider menu clicked successfully.');
            } catch (e) {
                log(`ERROR: Provider menu not found: ${e.message}`);
                throw new Error(`Failed to find Provider menu. Page might not have loaded correctly.`);
            }

            if (this.providerMode === 'kimi') {
                log('Clicking Kimi card...');
                await page.waitForSelector('::-p-text(Kimi)', { timeout: 10000 });
                await page.click('::-p-text(Kimi)');
            
                log('Clicking Kimi Coding OAuth button...');
                await page.waitForSelector('::-p-text(Kimi Coding OAuth)', { timeout: 10000 });
                await page.click('::-p-text(Kimi Coding OAuth)');

                log('Waiting for Kimi Connect modal to appear...');
                await sleep(3000);
            } else if (this.providerMode === 'gemini') {
                log('Clicking Gemini CLI card...');
                try {
                    await page.waitForSelector('::-p-text(Gemini CLI)', { timeout: 10000 });
                    await page.click('::-p-text(Gemini CLI)');
                    log('Gemini CLI card clicked.');
                    await sleep(2000); // Give page time to transition
                } catch (e) {
                    log(`ERROR: Gemini CLI card not found: ${e.message}`);
                    throw new Error('Gemini CLI card not found on providers page');
                }
            
                log('Clicking Add button...');
                try {
                    await page.waitForSelector(ADD_SELECTOR, { timeout: 10000 });
                    log('Add button found, clicking via JS...');
                    await page.evaluate((sel) => {
                        const btn = document.querySelector(sel);
                        if (btn) {
                            console.log('Add button element:', btn);
                            btn.click();
                            return true;
                        }
                        return false;
                    }, ADD_SELECTOR);
                    log('Add button clicked.');
                    await sleep(3000); // Give more time for OAuth popup to trigger
                } catch (e) {
                    log(`ERROR: Add button not found: ${e.message}`);
                    // Try alternative: look for any button with "Add" text
                    log('Trying alternative: looking for any Add button...');
                    try {
                        await page.waitForSelector('button::-p-text(Add)', { timeout: 5000 });
                        await page.click('button::-p-text(Add)');
                        log('Clicked Add button via text selector.');
                        await sleep(3000);
                    } catch (e2) {
                        log(`Alternative Add button also not found: ${e2.message}`);
                        throw new Error('Add button not found for Gemini CLI (tried both selectors)');
                    }
                }
            
                log('Checking for Confirm (I Understand) modal...');
                try {
                    await page.waitForSelector(CONFIRM_SELECTOR, { timeout: 3000 });
                    await page.click(CONFIRM_SELECTOR);
                    log('Clicked Confirm.');
                    await sleep(2000); // Wait for popup to trigger after confirm
                } catch (e) {
                    log('No Confirm modal appeared, skipping.');
                }
            } else {
                log('Clicking Antigravity card...');
                try {
                    await page.waitForSelector('::-p-text(Antigravity)', { timeout: 10000 });
                    await page.click('::-p-text(Antigravity)');
                    log('Antigravity card clicked.');
                    await sleep(2000); // Give page time to transition
                } catch (e) {
                    log(`ERROR: Antigravity card not found: ${e.message}`);
                    throw new Error('Antigravity card not found on providers page');
                }
            
                log('Clicking Add button...');
                try {
                    await page.waitForSelector(ADD_SELECTOR, { timeout: 10000 });
                    log('Add button found, clicking via JS...');
                    await page.evaluate((sel) => {
                        const btn = document.querySelector(sel);
                        if (btn) {
                            console.log('Add button element:', btn);
                            btn.click();
                            return true;
                        }
                        return false;
                    }, ADD_SELECTOR);
                    log('Add button clicked.');
                    await sleep(3000); // Give more time for OAuth popup to trigger
                } catch (e) {
                    log(`ERROR: Add button not found: ${e.message}`);
                    // Try alternative: look for any button with "Add" text
                    log('Trying alternative: looking for any Add button...');
                    try {
                        await page.waitForSelector('button::-p-text(Add)', { timeout: 5000 });
                        await page.click('button::-p-text(Add)');
                        log('Clicked Add button via text selector.');
                        await sleep(3000);
                    } catch (e2) {
                        log(`Alternative Add button also not found: ${e2.message}`)
                        throw new Error('Add button not found for Antigravity (tried both selectors)');
                    }
                }
            
                log('Checking for Confirm (I Understand) modal...');
                try {
                    await page.waitForSelector(CONFIRM_SELECTOR, { timeout: 3000 });
                    await page.click(CONFIRM_SELECTOR);
                    log('Clicked Confirm.');
                    await sleep(2000); // Wait for popup to trigger after confirm
                } catch (e) {
                    log('No Confirm modal appeared, skipping.');
                }
            }

            let newTab = null;
            if (this.providerMode === 'kimi') {
                log('Extracting Kimi OAuth URL from modal...');
                // Get the URL from the Open button or the text
                const kimiUrl = await page.evaluate(() => {
                    // Look for the "Open" button link
                    const a = Array.from(document.querySelectorAll('a')).find(el => el.href.includes('authorize_device'));
                    if (a) return a.href;
                    // Look for any element containing the URL
                    const el = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('authorize_device') && el.children.length === 0);
                    if (el) return el.textContent.trim();
                    return null;
                });

                if (kimiUrl) {
                    log(`Extracted Kimi URL: ${kimiUrl}`);
                    newTab = await browser.newPage();
                    // Use domcontentloaded instead of networkidle2 to avoid 30s timeouts on slow proxies
                    await newTab.goto(kimiUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                } else {
                    log('Could not find Kimi URL in modal. Falling back to waiting for tab.');
                }
            }

            if (!newTab) {
                log('Waiting for new OAuth tab to open...');
                // Wait up to 10 seconds for the new tab to be created
                for (let i = 0; i < 20; i++) {
                    await sleep(500);
                    const pages = await browser.pages();
                    log(`Tab check ${i + 1}/20: ${pages.length} tabs open`);
                    if (pages.length > 1) {
                        newTab = pages[pages.length - 1];
                        log(`New tab detected! URL: ${newTab.url()}`);
                        break;
                    }
                }
                
                if (!newTab) {
                    log('ERROR: No new tab opened after 10 seconds.');
                    log('Taking screenshot for debugging...');
                    try {
                        // Try to take an error screenshot
                        const pages = await browser.pages();
                        if (pages.length > 0) {
                            const screenshotPath = `error_${this.providerMode}_${Date.now()}.png`;
                            const screenshotPromise = pages[pages.length - 1].screenshot({ 
                                path: screenshotPath,
                                fullPage: true
                            });
                            
                            const timeoutPromise = new Promise((_, reject) => {
                                setTimeout(() => reject(new Error('Screenshot timeout')), 10000);
                            });
                            
                            await Promise.race([screenshotPromise, timeoutPromise]);
                            log(`Screenshot saved: ${screenshotPath}`);
                        }
                    } catch (screenshotError) {
                        log('Screenshot failed: ' + screenshotError.message);
                    }
                    
                    throw new Error(`OAuth popup did not open. This usually means:
1. The Add button didn't trigger the OAuth flow
2. The 9Router backend is not responding
3. A popup blocker is preventing the new tab
Check the screenshot error_${this.providerMode}_*.png for the current page state.`);
                }
            }
            
            await newTab.bringToFront();

            if (this.providerMode === 'kimi') {
                log('Waiting for Kimi page to load...');
                await sleep(5000); // Give Kimi page time to render
                log('Clicking Continue with Google on Kimi page...');
                try {
                    await newTab.waitForSelector('::-p-text(Google)', { timeout: 15000 });
                    const googleBtns = await newTab.$$('::-p-text(Google)');
                    if (googleBtns.length > 0) {
                        await googleBtns[googleBtns.length - 1].click();
                    } else {
                        await newTab.click('::-p-text(Google)');
                    }
                } catch (err) {
                    try {
                        const screenshotPromise = newTab.screenshot({ 
                            path: `kimi_error_${Date.now()}.png`, 
                            fullPage: true 
                        });
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Screenshot timeout')), 10000);
                        });
                        await Promise.race([screenshotPromise, timeoutPromise]);
                    } catch (e) {}
                    throw new Error('Google button not found. Screenshot saved.');
                }
                await sleep(3000);
            }

            updateProgress({ step: STEPS.GOOGLE_LOGIN });
            
            let googleTab = newTab;
            if (this.providerMode === 'kimi') {
                log('Waiting for Google Login popup...');
                for (let i = 0; i < 20; i++) {
                    await sleep(500);
                    const pages = await browser.pages();
                    if (pages.length > 2) {
                        googleTab = pages[pages.length - 1];
                        break;
                    }
                }
                await googleTab.bringToFront();
            }

            // The completeGoogleLogin expects a `page` which is our `newTab` (or popup)
            await completeGoogleLogin(googleTab, account, log);

            // Handle Post Login Confirmation logic for ALL providers (Google Consent)
            updateProgress({ step: STEPS.WAITING });
            try {
                log('Checking for OAuth consent screens (optional)...');
                for (let i = 0; i < 3; i++) {
                    if (googleTab.isClosed()) break;
                    
                    const consentBtns = await googleTab.$$('button::-p-text(Continue), button::-p-text(Lanjutkan), button::-p-text(Allow), button::-p-text(Izinkan), button::-p-text(Login), button::-p-text(Masuk), button::-p-text(Continue to app), div[role="button"]::-p-text(Continue), div[role="button"]::-p-text(Lanjutkan)');
                    if (consentBtns.length > 0) {
                        log("Found OAuth consent button by text, clicking...");
                        await consentBtns[consentBtns.length - 1].click();
                        await sleep(2000);
                    }
                    
                    // Also try the old strict selectors just in case
                    try {
                        const btn1 = await googleTab.$(I_UNDERSTAND_SELECTOR);
                        if (btn1) { await btn1.click(); await sleep(2000); }
                    } catch(e) {}
                    try {
                        const btn2 = await googleTab.$(LOGIN_SELECTOR);
                        if (btn2) { await btn2.click(); await sleep(2000); }
                    } catch(e) {}
                    
                    await sleep(1500);
                }
            } catch (error) {
                log('OAuth consent screen check finished or skipped.');
            }

            if (this.providerMode === 'kimi') {
                log('Checking for Kimi device authorization confirmation button...');
                // Wait for the Kimi page to load the authorization prompt
                await sleep(5000);
                
                try {
                    // Try to find any confirmation button on the Kimi page (newTab)
                    const confirmBtns = await newTab.$$('button::-p-text(Confirm), button::-p-text(Authorize), button::-p-text(Approve), button::-p-text(Allow), button::-p-text(Setuju), button::-p-text(Konfirmasi), button::-p-text(Login), button::-p-text(Masuk), div[role="button"]::-p-text(Login)');
                    if (confirmBtns.length > 0) {
                        log('Found Kimi authorization button, clicking it!');
                        await confirmBtns[confirmBtns.length - 1].click();
                        await sleep(5000); // Wait for Kimi to process the authorization
                    } else {
                        log('No explicit Kimi authorization button found. It might be auto-authorized.');
                    }
                } catch (e) {
                    log('Error checking Kimi authorization button: ' + e.message);
                }
            }

            // Verify connection was actually added and rename it
            log('Verifying if connection was added to 9Router API...');
            let newConnectionId = null;
            let currentConnections = [];
            
            // Extended polling: 12 attempts x 5s = 60 seconds (was 6 attempts x 5s = 30s)
            for (let i = 0; i < 12; i++) {
                try {
                    const currentProvidersData = await page.evaluate(async () => {
                        const res = await fetch('/api/providers');
                        return await res.json();
                    });
                    currentConnections = currentProvidersData.connections || [];
                    const newConns = currentConnections.filter(c => !initialConnections.find(ic => ic.id === c.id) && c.provider === this.providerMode);
                    if (newConns.length > 0) {
                        newConnectionId = newConns[0].id;
                        log(`Connection found after ${(i + 1) * 5} seconds!`);
                        break;
                    }
                    log(`Polling attempt ${i + 1}/12: No new connection yet...`);
                } catch(e) {
                    log(`Polling error: ${e.message}`);
                }
                await sleep(5000);
            }

            if (newConnectionId) {
                log('Connection verified in API! ID: ' + newConnectionId);
                
                // Get the first name part of the email, max 5 chars or full first name
                const emailPrefix = account.email.split('@')[0];
                const renameTo = emailPrefix.substring(0, 5);
                log('Renaming connection to: ' + renameTo);

                await page.bringToFront();
                
                // Reload the providers page
                await page.goto(`${TARGET_URL}providers/${this.providerMode}`, { waitUntil: 'networkidle2' });
                await sleep(3000);
                
                // Get the current name from API
                const currentProvidersData = await page.evaluate(async () => {
                    const res = await fetch('/api/providers');
                    return await res.json();
                });
                const addedConn = (currentProvidersData.connections || []).find(c => c.id === newConnectionId);
                
                if (addedConn) {
                    const currentName = addedConn.name;
                    log('Current name is: ' + currentName);
                    
                    const renameResult = await page.evaluate(async (cName, newName) => {
                        let nameEl = null;
                        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                        let node;
                        while ((node = walker.nextNode())) {
                            if (node.nodeValue.trim() === cName) {
                                nameEl = node.parentElement;
                                break;
                            }
                        }
                        
                        if (!nameEl) return 'nameEl not found for: ' + cName;
                        
                        // Traverse up to find the row container that has a button
                        let row = nameEl;
                        let editBtn = null;
                        while (row && row !== document.body) {
                            editBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Edit') || (b.title && b.title.includes('Edit')));
                            if (editBtn) break;
                            row = row.parentElement;
                        }
                        
                        if (!editBtn) return 'editBtn not found';
                        
                        editBtn.click();
                        
                        await new Promise(r => setTimeout(r, 1000));
                        
                        const nameInput = document.querySelector('input[placeholder="Account name"], input[name="name"]');
                        if (!nameInput) return 'nameInput not found';
                        
                        try {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(nameInput, newName);
                            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        } catch(e) {
                            return 'React setter failed: ' + e.message;
                        }
                        
                        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Save' || b.textContent.trim() === 'Update');
                        if (!saveBtn) return 'saveBtn not found';
                        
                        saveBtn.click();
                        await new Promise(r => setTimeout(r, 1000));
                        return 'SUCCESS';
                    }, currentName, renameTo);
                    
                    if (renameResult === 'SUCCESS') {
                        log('Successfully renamed connection to: ' + renameTo);
                    } else {
                        log('Failed to rename connection via UI. Reason: ' + renameResult);
                    }
                }
                
                // Mark account success to trigger removal from accounts.txt
                this.onAccountSuccess(account, log);
            } else {
                throw new Error("Connection did not appear in 9Router API (Add failed). Google/Provider flow may have been interrupted.");
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

module.exports = RouterWorker;
