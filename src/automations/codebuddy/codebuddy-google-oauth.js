const { getConfig } = require("../../config");
const { sleep } = require("../../utils");
const { launchBrowser, setupConditionalProxyInterception } = require("../../browser");
const { completeGoogleLogin } = require("../../providers/google/login");
const { createRouter } = require("../../providers/router");
const { createFileLogger } = require("../../utils");
const path = require("path"); // PERBAIKAN: Tambah path untuk fleksibel directory

/**
 * CodeBuddy Google OAuth Automation
 * Separate implementation from GitHub OAuth to avoid conflicts during maintenance
 */

/** Parse hostname safely — never match query params */
function getHostname(url) {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch (_) {
        return "";
    }
}

function isCodebuddyHost(url) {
    const h = getHostname(url);
    return h === "codebuddy.ai" || h.endsWith(".codebuddy.ai") || h.includes("codebuddy");
}

function isGoogleHost(url) {
    const h = getHostname(url);
    return h.includes("google.com") || h.includes("googleusercontent.com");
}

/**
 * Get device code from 9Router API
 */
async function getCodebuddyDeviceCode(log) {
    const { ok, router, error } = await createRouter("codebuddy-intl", log);
    if (!ok) throw new Error(`Router ${error}`);

    log("[API] Requesting device code from router...");
    const data = await router.deviceCode();
    log(`[API] Device code received: ${data.device_code}`);
    return { ...data, _router: router };
}

/**
 * Poll for OAuth completion
 */
async function pollCodebuddyCompletion(router, deviceCode, codeVerifier, log) {
    const startTime = Date.now();
    const timeout = 120000; // 2 minutes
    const pollInterval = 3000;

    log(`[API] Starting OAuth polling (timeout: ${timeout / 1000}s)`);

    while (Date.now() - startTime < timeout) {
        try {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            log(`[API] Polling... (elapsed: ${elapsed}s)`);
            
            // PERBAIKAN: Gunakan router.poll() yang benar
            const result = await router.poll(deviceCode, codeVerifier);
            
            log(`[API] Poll response: success=${result.success}, pending=${result.pending}`);
            
            if (result.success && result.data) {
                log(`[API] ✅ OAuth completed successfully!`);
                log(`[API] Data received from 9Router backend`);
                return { success: true, data: result.data };
            } else if (result.pending) {
                log(`[API] Still pending authorization...`);
            } else if (result.error) {
                log(`[API] Poll error: ${result.error}`);
            } else {
                log(`[API] Unexpected response: ${JSON.stringify(result).substring(0, 150)}`);
            }
        } catch (err) {
            log(`[API] Poll exception: ${err.message}`);
        }

        await sleep(pollInterval);
    }

    log(`[API] ❌ Polling timeout after ${timeout / 1000} seconds`);
    throw new Error("Polling timeout after 120 seconds");
}

/**
 * Click element in iframe (with fallback across frames)
 */
async function clickInFrames(page, selectors, timeout = 15000, delayBeforeClick = 2000, log = () => {}) {
    const startTime = Date.now();
    const list = Array.isArray(selectors) ? selectors : [selectors];

    while (Date.now() - startTime < timeout) {
        // Prefer auth iframe first
        const ordered = [
            ...page.frames().filter((f) => f.name() === "auth"),
            ...page.frames().filter((f) => f.name() !== "auth"),
        ];

        for (const frame of ordered) {
            for (const selector of list) {
                try {
                    // CSS only for waitForSelector
                    if (selector.includes("::-p-text") || selector.includes(":contains")) continue;

                    const element = await frame.waitForSelector(selector, {
                        visible: true,
                        timeout: 800,
                    });
                    if (!element) continue;

                    await sleep(delayBeforeClick);
                    await frame.evaluate((el) => el.click(), element);
                    return {
                        clicked: true,
                        frameName: frame.name() || "unnamed",
                        selector,
                    };
                } catch (_) {}
            }
        }

        // Text-based fallback across frames
        for (const frame of ordered) {
            try {
                const clicked = await frame.evaluate((needles) => {
                    const els = Array.from(
                        document.querySelectorAll("a, button, input[type='submit'], div[role='button']"),
                    );
                    for (const el of els) {
                        const text = (el.textContent || el.value || "").trim().toLowerCase();
                        const href = (el.getAttribute && el.getAttribute("href")) || "";
                        for (const n of needles) {
                            if (text.includes(n) || href.includes(n)) {
                                el.click();
                                return n;
                            }
                        }
                    }
                    return null;
                }, list.map((s) => {
                    if (s.includes("google")) return "google";
                    if (s.toLowerCase().includes("confirm")) return "confirm";
                    if (s.toLowerCase().includes("continue")) return "continue";
                    return null;
                }).filter(Boolean));

                if (clicked) {
                    await sleep(delayBeforeClick);
                    return {
                        clicked: true,
                        frameName: frame.name() || "unnamed",
                        selector: `text:${clicked}`,
                    };
                }
            } catch (_) {}
        }

        await sleep(400);
    }

    throw new Error(`Selectors not found in any frame after ${timeout}ms: ${list.join(", ")}`);
}

/**
 * Prepare auth iframe: click Sign up tab and check ToS
 */
async function prepareAuthIframe(page, log) {
    const frames = page.frames();
    const authFrame =
        frames.find((f) => f.name() === "auth") ||
        frames.find((f) => f !== page.mainFrame());
    if (!authFrame) {
        log("No auth iframe found for prep");
        return;
    }

    log(`Preparing auth iframe: ${authFrame.name() || "unnamed"}`);

    // 1) Click "Sign up" tab if present
    try {
        const tabClicked = await authFrame.evaluate(() => {
            const candidates = Array.from(document.querySelectorAll("a, button, div, span"));
            const tab = candidates.find((el) => {
                const t = (el.textContent || "").trim().toLowerCase();
                const href = el.getAttribute && (el.getAttribute("href") || "");
                return (
                    t === "sign up" ||
                    t === "signup" ||
                    href.includes("#signup") ||
                    href.includes("signup")
                );
            });
            if (tab) {
                tab.click();
                return true;
            }
            return false;
        });
        if (tabClicked) {
            log("Clicked Sign up tab in iframe");
            await sleep(1000);
        }
    } catch (err) {
        log(`Sign up tab: ${err.message}`);
    }

    // 2) Check ToS checkboxes
    try {
        const tosIds = ["agree-policy-sso", "agree-policy", "agree-policy-account"];
        for (const id of tosIds) {
            try {
                const checkbox = await authFrame.$(`#${id}`);
                if (!checkbox) continue;

                const isChecked = await authFrame.evaluate((el) => el.checked, checkbox);
                if (!isChecked) {
                    await authFrame.evaluate((el) => el.click(), checkbox);
                    log(`Checked ToS: #${id}`);
                    await sleep(800);
                    break;
                } else {
                    log(`ToS already checked: #${id}`);
                    break;
                }
            } catch (_) {}
        }
    } catch (err) {
        log(`ToS prep error: ${err.message}`);
    }
}

/**
 * Handle Confirm button after clicking Google SSO
 */
async function handleConfirmButton(page, log) {
    log("Waiting for Confirm button in Codebuddy iframe...");

    // Already navigated to Google host? skip confirm
    try {
        if (isGoogleHost(page.url())) {
            log("Already on Google host, skip Confirm");
            return false;
        }
    } catch (_) {}

    const start = Date.now();
    const timeout = 12000;

    while (Date.now() - start < timeout) {
        // Only search Codebuddy/auth frames — never Google frames
        const frames = page.frames().filter((f) => {
            try {
                const u = f.url() || "";
                if (u.includes("google.com")) return false;
                return (
                    f.name() === "auth" ||
                    u.includes("codebuddy") ||
                    u.includes("broker") ||
                    u === "" ||
                    u === "about:blank" ||
                    f !== page.mainFrame()
                );
            } catch (_) {
                return f.name() === "auth";
            }
        });

        // Prefer auth iframe first
        const ordered = [
            ...frames.filter((f) => f.name() === "auth"),
            ...frames.filter((f) => f.name() !== "auth"),
        ];

        for (const frame of ordered) {
            try {
                const clicked = await frame.evaluate(() => {
                    const buttons = Array.from(
                        document.querySelectorAll("button, input[type='submit'], a.ui-button"),
                    );
                    // ONLY exact "Confirm" — never "Continue"
                    const btn = buttons.find((el) => {
                        const text = (el.textContent || el.value || "").trim().toLowerCase();
                        const type = el.getAttribute("data-type") || "";
                        if (text.includes("google") || text.includes("apple") || text.includes("github")) {
                            return false;
                        }
                        return text === "confirm" || (type === "success" && text.length < 20);
                    });
                    if (btn) {
                        btn.click();
                        return (btn.textContent || btn.value || "confirm").trim();
                    }
                    return null;
                });

                if (clicked) {
                    log(`Clicked Confirm in frame '${frame.name() || "unnamed"}': ${clicked}`);
                    await sleep(2000);
                    return true;
                }
            } catch (_) {}
        }

        // If main page already on Google host, stop looking for confirm
        try {
            if (isGoogleHost(page.url())) {
                log("Navigated to Google host during Confirm wait, skip");
                return false;
            }
        } catch (_) {}

        await sleep(400);
    }

    log("No Confirm button found, continuing...");
    return false;
}

/**
 * Wait for Google OAuth page to open (same tab or popup)
 */
async function waitForGooglePage(browser, currentPage, log, timeout = 45000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const pages = await browser.pages();

        // Prefer newest page with google.com
        for (let i = pages.length - 1; i >= 0; i--) {
            const p = pages[i];
            try {
                const url = p.url();
                if (url.includes("google.com") && url.includes("accounts.google.com")) {
                    if (p !== currentPage) {
                        log(`Switched to Google page/popup: ${url}`);
                    } else {
                        log(`Google opened in same tab: ${url}`);
                    }
                    return p;
                }
            } catch (_) {}
        }

        // Same tab navigated?
        try {
            const url = currentPage.url();
            if (url.includes("google.com") && url.includes("accounts.google.com")) {
                log(`Google URL on current page: ${url}`);
                return currentPage;
            }
        } catch (_) {}

        await sleep(500);
    }

    throw new Error("Google OAuth page not opened after Codebuddy Google/Confirm click");
}

/**
 * Click Google SSO button in Codebuddy iframe
 */
async function handleCodebuddyGoogleButton(page, log) {
    const config = getConfig();
    const browser = page.browser();

    log("Waiting for Codebuddy login page...");
    await page.waitForFunction(() => window.location.href.includes("codebuddy.ai/login"), {
        timeout: config.timeouts.navigation,
    });
    log(`Login page loaded: ${page.url()}`);

    try {
        await page.waitForNetworkIdle({ timeout: 10000 });
        log("Network idle");
    } catch (_) {
        log("Network idle timeout, continuing...");
    }

    try {
        await page.waitForFunction(
            () => {
                const loading = document.querySelector(".auth-loading");
                return !loading || loading.style.display === "none" || !loading.offsetParent;
            },
            { timeout: 10000 },
        );
        log("Loading overlay gone");
    } catch (_) {
        log("Loading overlay still present, continuing...");
    }

    log("Waiting 4s for iframe interactive...");
    await sleep(4000);

    // iframe prep: Sign up tab + ToS
    await prepareAuthIframe(page, log);

    // Click Google SSO button in iframe
    log("Searching Sign in with Google button...");
    const googleSelectors = [
        "a#social-google",
        'a[href*="google/login"]',
        'a[href*="broker/google"]',
        'a.sp-button[href*="google"]',
        'a[href*="google"]',
    ];

    let googleClicked = false;
    try {
        const result = await clickInFrames(page, googleSelectors, 15000, 2000, log);
        log(`Clicked Google button in frame '${result.frameName}' (${result.selector})`);
        googleClicked = true;
    } catch (err) {
        // text fallback
        for (const frame of page.frames()) {
            try {
                const ok = await frame.evaluate(() => {
                    const els = Array.from(document.querySelectorAll("a, button"));
                    const el = els.find((e) => {
                        const t = (e.textContent || "").toLowerCase();
                        const h = e.getAttribute("href") || "";
                        return h.includes("google") || t.includes("google");
                    });
                    if (el) {
                        el.click();
                        return true;
                    }
                    return false;
                });
                if (ok) {
                    log(`Clicked Google via text in frame '${frame.name() || "unnamed"}'`);
                    googleClicked = true;
                    break;
                }
            } catch (_) {}
        }
    }

    if (!googleClicked) {
        throw new Error("Google signup button not found in any iframe");
    }

    // Confirm dialog in iframe after Google click
    await sleep(2000);
    await handleConfirmButton(page, log);

    // Wait for Google OAuth page (same tab or popup)
    log("Waiting for Google OAuth page after Confirm...");
    const googlePage = await waitForGooglePage(browser, page, log, 45000);
    return googlePage;
}

/**
 * Handle Google OAuth login
 */
async function handleGoogleOAuthLogin(page, account, log) {
    const config = getConfig();

    log("Waiting for Google OAuth page...");
    await page.waitForFunction(
        () => {
            try {
                const h = window.location.hostname.toLowerCase();
                return h.includes("google.com") || h.includes("codebuddy");
            } catch (_) {
                return false;
            }
        },
        { timeout: config.timeouts.navigation },
    );

    let currentUrl = page.url();
    log(`Google OAuth page: ${currentUrl}`);

    // Already authorized and back on Codebuddy?
    if (isCodebuddyHost(currentUrl)) {
        log("Already authorized, back on Codebuddy host");
        return;
    }

    if (!isGoogleHost(currentUrl)) {
        throw new Error(`Expected Google host, got: ${getHostname(currentUrl)}`);
    }

    await sleep(2000);
    currentUrl = page.url();
    log(`Google OAuth login page: ${currentUrl}`);

    // Use existing Google login helper
    log("Starting Google OAuth login...");
    await completeGoogleLogin(page, account, log);

    log("Google login completed, waiting for redirect...");
    await sleep(3000);
    
    // PERBAIKAN: Handle Google Workspace for Education consent screens
    currentUrl = page.url();
    log(`After login URL: ${currentUrl}`);
    
    // Check for Workspace Education privacy notice / welcome screen
    if (currentUrl.includes("speedbump") || currentUrl.includes("workspace") || currentUrl.includes("termsofservice")) {
        log("⚠️ Google Workspace for Education consent screen detected");
        
        try {
            // Scroll down untuk memastikan semua konten visible
            log("Scrolling down to view all content...");
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await sleep(2000);
            
            // Click "I understand" button
            log("Looking for 'I understand' button...");
            const understood = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
                const btn = buttons.find(b => {
                    const text = (b.textContent || b.value || '').toLowerCase();
                    return text.includes('i understand') || text.includes('understand');
                });
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            
            if (understood) {
                log("✅ Clicked 'I understand' button");
                await sleep(3000);
            } else {
                log("⚠️ Could not find 'I understand' button");
            }
            
            // Check for Welcome / Continue screen
            currentUrl = page.url();
            if (currentUrl.includes("workspace") || currentUrl.includes("welcome")) {
                log("Google Workspace welcome screen detected");
                
                // Scroll down again
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await sleep(2000);
                
                // Click Continue button
                log("Looking for 'Continue' button...");
                const continued = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
                    const btn = buttons.find(b => {
                        const text = (b.textContent || b.value || '').toLowerCase();
                        return text.includes('continue') || text.includes('next') || text.includes('proceed');
                    });
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                });
                
                if (continued) {
                    log("✅ Clicked 'Continue' button");
                    await sleep(3000);
                } else {
                    log("⚠️ Could not find 'Continue' button");
                }
            }
        } catch (err) {
            log(`⚠️ Error handling Workspace consent: ${err.message}`);
        }
    }
    
    // PERBAIKAN: Handle "Sign in with Google" / OAuth consent untuk codebuddy.ai
    currentUrl = page.url();
    if (currentUrl.includes("oauth") && currentUrl.includes("consent")) {
        log("OAuth consent screen detected (Sign in to codebuddy.ai)");
        
        try {
            // Scroll down
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await sleep(2000);
            
            // Click Continue button
            log("Looking for 'Continue' button on OAuth consent...");
            const clicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"]'));
                const btn = buttons.find(b => {
                    const text = (b.textContent || b.value || '').toLowerCase();
                    return text.includes('continue') || text.includes('allow') || text.includes('accept');
                });
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            
            if (clicked) {
                log("✅ Clicked 'Continue' on OAuth consent");
                await sleep(3000);
            } else {
                log("⚠️ Could not find Continue button on OAuth consent");
            }
        } catch (err) {
            log(`⚠️ Error handling OAuth consent: ${err.message}`);
        }
    }
    
    log("Waiting for final redirect after consent...");
    await sleep(3000);
}

/**
 * Wait for final redirect to /started
 */
async function handleRegionSelectionAndWaitForSuccess(page, log) {
    const config = getConfig();

    log("Waiting for redirect after Google OAuth...");
    await sleep(3000);

    let currentUrl = page.url();
    log(`Current URL: ${currentUrl}`);

    // Check for domain restriction
    if (currentUrl.includes("/login-actions/first-broker-login")) {
        log("Domain restriction detected - Google domain is blocked by Codebuddy");
        throw new Error("Domain restricted: Google email domain is not allowed on Codebuddy");
    }

    if (isGoogleHost(currentUrl)) {
        log("Still on Google host, waiting redirect to codebuddy host...");
        await page.waitForFunction(
            () => {
                try {
                    const h = window.location.hostname.toLowerCase();
                    return h.includes("codebuddy");
                } catch (_) {
                    return false;
                }
            },
            { timeout: 30000 },
        );
        currentUrl = page.url();
        log(`Redirected to: ${currentUrl}`);

        if (currentUrl.includes("/login-actions/first-broker-login")) {
            log("Domain restriction detected after redirect");
            throw new Error("Domain restricted: Google email domain is not allowed on Codebuddy");
        }
    }

    const isIntermediatePage = (url) => {
        if (url.includes("/login-actions/first-broker-login")) {
            return false;
        }
        return url.includes("/login/select") || url.includes("/login-actions/");
    };

    if (isIntermediatePage(currentUrl)) {
        log("On intermediate page, waiting final redirect...");
        await page.waitForFunction(
            () => {
                const url = window.location.href;
                const intermediate =
                    url.includes("/login/select") ||
                    url.includes("/login-actions/first-broker-login") ||
                    url.includes("/login-actions/first-broker-lo");
                return (
                    !intermediate &&
                    (url.includes("/register/user/complete") || url.includes("/started"))
                );
            },
            { timeout: config.timeouts.navigation },
        );
        currentUrl = page.url();
        log(`Redirected to: ${currentUrl}`);
    }

    if (currentUrl.includes("/started")) {
        log("On /started, OAuth flow complete!");
        return;
    }

    if (currentUrl.includes("/register/user/complete")) {
        log("On region selection page, skipping for now (can be added later)");
        // Region selection logic can be copied from GitHub OAuth version if needed
        return;
    }

    log(`Final URL: ${currentUrl}`);
}

/**
 * Main function: CodeBuddy Google OAuth automation (single account)
 */
async function runCodebuddyGoogleOAuthSingle(account, log) {
    const config = getConfig();

    log(`═══════════════════════════════════════════`);
    log(`CodeBuddy Google OAuth Automation`);
    log(`Account: ${account.email}`);
    log(`═══════════════════════════════════════════`);

    log(`Getting device code from 9Router API...`);
    const deviceCodeData = await getCodebuddyDeviceCode(log);
    const { device_code, verification_uri, codeVerifier, _router: router } = deviceCodeData;

    log(`Launching browser...`);
    const { browser, page } = await launchBrowser(0, 0, null, {
        conditionalProxy: false,
        forceHeadless: false, // ← PERBAIKAN #1: PAKSA VISIBLE (override config.headless)
    });

    try {
        // Start polling in background
        const pollingPromise = pollCodebuddyCompletion(
            router,
            device_code,
            codeVerifier,
            log,
        ).catch((err) => {
            log(`[API] Polling failed: ${err.message}`);
            return { success: false, error: err.message };
        });
        log(`[API] Polling started in background`);

        // PERBAIKAN #2: Buka via 9Router URL, bukan verification_uri langsung
        const routerUrl = `https://9router-production-6273.up.railway.app/dashboard/providers/codebuddy-intl`;
        log(`Opening 9Router dashboard: ${routerUrl}`);
        await page.goto(routerUrl, {
            waitUntil: "networkidle2",
            timeout: config.timeouts.navigation,
        });
        
        log(`Waiting for OAuth button on 9Router page...`);
        await sleep(2000);
        
        // Click OAuth button di 9Router dashboard
        try {
            await page.waitForSelector('button:has-text("OAuth"), button[class*="oauth" i], a:has-text("OAuth")', { timeout: 10000 });
            log(`Clicking OAuth button...`);
            
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const oauthBtn = buttons.find(btn => {
                    const text = (btn.textContent || '').toLowerCase();
                    const classes = (btn.className || '').toLowerCase();
                    return text.includes('oauth') || classes.includes('oauth');
                });
                if (oauthBtn) oauthBtn.click();
            });
            
            log(`OAuth button clicked, waiting for popup/redirect...`);
            await sleep(3000);
        } catch (err) {
            log(`⚠️ Could not find OAuth button: ${err.message}`);
            log(`Trying to navigate directly to verification URI: ${verification_uri}`);
            await page.goto(verification_uri, {
                waitUntil: "networkidle2",
                timeout: config.timeouts.navigation,
            });
        }

        // Get active page (might be popup or redirect)
        let activePage = page;
        try {
            const pages = await browser.pages();
            if (pages.length > 1) {
                activePage = pages[pages.length - 1]; // Latest popup/tab
                log(`Switched to new page: ${activePage.url()}`);
            }
        } catch (_) {}

        // 2) Click Google button in iframe + Confirm
        activePage = await handleCodebuddyGoogleButton(activePage, log);

        // 3) Google OAuth login
        await handleGoogleOAuthLogin(activePage, account, log);

        // Re-resolve page after OAuth redirect
        try {
            const pages = await browser.pages();
            const cb = [...pages].reverse().find((p) => {
                try {
                    return p.url().includes("codebuddy.ai");
                } catch (_) {
                    return false;
                }
            });
            if (cb) activePage = cb;
        } catch (_) {}

        // 4) Handle region selection and wait for /started
        await handleRegionSelectionAndWaitForSuccess(activePage, log);

        // 5) Wait for polling to complete
        log("Waiting for OAuth polling to complete...");
        const pollResult = await pollingPromise;

        if (!pollResult || !pollResult.success) {
            throw new Error(`OAuth polling failed: ${pollResult?.error || "unknown"}`);
        }

        log("✅ CodeBuddy Google OAuth successful!");
        log(`Account added to 9Router: ${account.email}`);

        // PERBAIKAN #2: Tunggu lebih lama sebelum close browser
        // Beri waktu untuk konfirmasi visual bahwa sudah masuk 9Router
        log("⏳ Menunggu 5 detik untuk konfirmasi visual...");
        await sleep(5000);

        await browser.close();
        return { success: true, account };
    } catch (error) {
        log(`❌ Error: ${error.message}`);
        await browser.close();
        throw error;
    }
}

/**
 * Main function: CodeBuddy Google OAuth automation
 * Wrapper for integration with main CLI (uses accounts.txt)
 */
async function runCodebuddyGoogleAutomation(sharedProgress, useProxy = true) {
    const config = getConfig();
    const logger = createFileLogger();
    const fs = require("fs");
    
    // PERBAIKAN #4: File untuk tracking progress (FLEKSIBEL - gunakan working directory)
    const progressFile = path.resolve(process.cwd(), "codebuddy_google_progress.json");
    const successFile = path.resolve(process.cwd(), "codebuddy_google_success.txt");
    
    // Read accounts from accounts.txt (email|password format)
    const accounts = [];
    const accountsFile = config.accountFile || "accounts.txt";
    
    if (!fs.existsSync(accountsFile)) {
        logger.log(`[CodeBuddy Google] accounts.txt not found`);
        return { successCount: 0, failedCount: 0 };
    }
    
    const lines = fs.readFileSync(accountsFile, "utf-8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        
        const parts = trimmed.split("|");
        if (parts.length >= 2) {
            accounts.push({
                email: parts[0].trim(),
                password: parts[1].trim(),
            });
        }
    }
    
    if (accounts.length === 0) {
        logger.log(`[CodeBuddy Google] No accounts found in ${accountsFile}`);
        return { successCount: 0, failedCount: 0 };
    }
    
    // PERBAIKAN #4: Load progress - skip yang sudah sukses
    let processedEmails = new Set();
    if (fs.existsSync(successFile)) {
        const successLines = fs.readFileSync(successFile, "utf-8").split(/\r?\n/);
        successLines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed) processedEmails.add(trimmed);
        });
        logger.log(`[CodeBuddy Google] Found ${processedEmails.size} already processed accounts`);
    }
    
    // Filter out already processed accounts
    const remainingAccounts = accounts.filter(acc => !processedEmails.has(acc.email));
    
    if (remainingAccounts.length === 0) {
        logger.log(`[CodeBuddy Google] All accounts already processed!`);
        return { successCount: processedEmails.size, failedCount: 0 };
    }
    
    logger.log(`[CodeBuddy Google] Total: ${accounts.length}, Already done: ${processedEmails.size}, Remaining: ${remainingAccounts.length}`);
    
    // PERBAIKAN #3: Parallel processing dengan concurrency limit
    const CONCURRENCY = config.browserCount || 4; // Dari config atau default 4
    logger.log(`[CodeBuddy Google] Running with ${CONCURRENCY} parallel browsers`);
    
    let successCount = processedEmails.size; // Start dengan yang sudah sukses
    let failedCount = 0;
    
    // Process in batches
    for (let i = 0; i < remainingAccounts.length; i += CONCURRENCY) {
        const batch = remainingAccounts.slice(i, i + CONCURRENCY);
        logger.log(`[CodeBuddy Google] ═══ Batch ${Math.floor(i / CONCURRENCY) + 1}: Processing ${batch.length} accounts ═══`);
        
        const promises = batch.map(async (account, idx) => {
            const accountNum = i + idx + 1;
            logger.log(`[${accountNum}/${remainingAccounts.length}] Starting: ${account.email}`);
            
            try {
                await runCodebuddyGoogleOAuthSingle(account, (msg) => {
                    logger.log(`[${accountNum}] ${msg}`);
                });
                
                // PERBAIKAN #4: Save success immediately
                fs.appendFileSync(successFile, `${account.email}\n`);
                
                successCount++;
                logger.log(`[${accountNum}] ✅ Success: ${account.email}`);
                return { success: true, email: account.email };
            } catch (error) {
                failedCount++;
                logger.log(`[${accountNum}] ❌ Failed: ${account.email} - ${error.message}`);
                return { success: false, email: account.email, error: error.message };
            }
        });
        
        // Wait for all in batch to complete
        const results = await Promise.allSettled(promises);
        
        logger.log(`[CodeBuddy Google] Batch ${Math.floor(i / CONCURRENCY) + 1} complete`);
        
        // Delay between batches (not between individual accounts)
        if (i + CONCURRENCY < remainingAccounts.length) {
            logger.log(`[CodeBuddy Google] ⏳ Waiting 10s before next batch...`);
            await sleep(10000);
        }
    }
    
    logger.log(`[CodeBuddy Google] ═══════════════════════════════════════════`);
    logger.log(`[CodeBuddy Google] 🎉 Complete: ${successCount} success, ${failedCount} failed`);
    logger.log(`[CodeBuddy Google] Progress saved to: ${successFile}`);
    logger.close();
    
    return { successCount, failedCount };
}

module.exports = {
    runCodebuddyGoogleAutomation,
};
