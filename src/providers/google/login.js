const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { clickSelector, typeIntoSelector, clickFirstVisibleSelector } = require("../../browser/helpers");

const GOOGLE_SELECTORS = {
    emailInput: "#identifierId",
    emailNext: "#identifierNext",
    passwordInput: 'input[type="password"]',
    passwordNext: "#passwordNext",
};

async function completeGoogleLogin(page, account, log) {
    log(`🚀 OPTIMIZED Google login starting (v2 - fast typing)`);
    log(`Typing email: ${account.email}`);
    
    // Wait for email input
    await page.waitForSelector(GOOGLE_SELECTORS.emailInput, { timeout: 10000, visible: true });
    
    // Fast type email (direct implementation)
    await page.click(GOOGLE_SELECTORS.emailInput);
    const emailStartTime = Date.now();
    await page.keyboard.type(account.email, { delay: 5 }); // SUPER FAST: 5ms per char
    log(`⚡ Email typed in ${Date.now() - emailStartTime}ms`);
    
    log("Clicking Next (email)...");
    await sleep(300); // Small delay
    await page.click(GOOGLE_SELECTORS.emailNext);
    
    log("Waiting for password field...");
    await sleep(1000);
    
    // Try to type password
    try {
        await page.waitForSelector(GOOGLE_SELECTORS.passwordInput, { 
            timeout: 30000, 
            visible: true 
        });
        
        // Fast type password (direct implementation)
        await page.click(GOOGLE_SELECTORS.passwordInput);
        const passStartTime = Date.now();
        await page.keyboard.type(account.password, { delay: 5 }); // SUPER FAST: 5ms per char
        log(`⚡ Password typed in ${Date.now() - passStartTime}ms`);
        
    } catch (e) {
        log(`Password field not found immediately: ${e.message}. Trying alternative...`);
        
        // Alternative: password field exists but not visible
        const passwordInput = await page.$('input[type="password"]');
        if (passwordInput) {
            log("Found password field (not visible), filling it...");
            await page.focus('input[type="password"]');
            const passStartTime = Date.now();
            await page.keyboard.type(account.password, { delay: 5 });
            log(`⚡ Password (alt method) typed in ${Date.now() - passStartTime}ms`);
        } else {
            log("No password field found. Continuing...");
        }
    }

    log("Clicking Next (password)...");
    await sleep(300);
    try {
        await page.click(GOOGLE_SELECTORS.passwordNext);
    } catch (e) {
        log(`Password Next button not found: ${e.message}. Continuing...`);
    }

    log("Waiting for OAuth consent or recovery prompts...");
    for (let i = 0; i < 20; i++) {
        await sleep(500);
        try {
            // Check if page closed
            if (page.isClosed()) {
                log("Google tab closed, login complete.");
                break;
            }

            // Check if URL changed to destination
            const currentUrl = page.url();
            try {
                const urlObj = new URL(currentUrl);
                if (urlObj.hostname.includes('kimi.com') || 
                    urlObj.hostname.includes('localhost') || 
                    urlObj.hostname.includes('127.0.0.1') || 
                    urlObj.hostname.includes('openrouter.ai')) {
                    log(`URL changed to destination (${urlObj.hostname}), login complete.`);
                    break;
                }
            } catch(e) {}

            // Handle OAuth consent buttons
            const consentBtns = await page.$$('button::-p-text(Continue), button::-p-text(Lanjutkan), button::-p-text(Allow), button::-p-text(Izinkan), button::-p-text(Login), button::-p-text(Masuk), button::-p-text(Continue to app), div[role="button"]::-p-text(Continue), div[role="button"]::-p-text(Lanjutkan)');
            if (consentBtns.length > 0) {
                log("Found OAuth consent button, clicking...");
                await consentBtns[consentBtns.length - 1].click();
                await sleep(1000);
                continue;
            }
            
            // Handle Recovery skip buttons
            const skipBtns = await page.$$('::-p-text(Not now), ::-p-text(Lain kali), ::-p-text(Jangan sekarang)');
            if (skipBtns.length > 0) {
                log("Found recovery skip button, clicking...");
                await skipBtns[skipBtns.length - 1].click();
                await sleep(1000);
                continue;
            }
        } catch (e) {
            // Ignore errors here
        }
    }
}

module.exports = {
    completeGoogleLogin,
};
