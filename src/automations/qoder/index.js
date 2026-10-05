/**
 * Qoder Signup Automation (Bercocok Tanam)
 * Adapted from Qoder Creator project
 * 
 * Flow: Temp mail -> Signup -> Captcha -> OTP -> PAT
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { getConfig } = require("../../config");
const {
    sleep,
    createFileLogger,
    formatDuration,
    acquireProxy,
    releaseProxy,
} = require("../../utils");
const { STEPS, createProgressManager } = require("../../cli/progress");
const { printReport } = require("../../cli/reporter");
const { createTempEmail } = require("../../providers/email");

const PROJECT_ROOT = path.join(__dirname, '../../..');
const PYTHON_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'qoder', 'signup.py');

function getPythonPath() {
    const winPath = path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe');
    const unixPath = path.join(PROJECT_ROOT, 'venv', 'bin', 'python3');
    
    if (fs.existsSync(winPath)) return winPath;
    if (fs.existsSync(unixPath)) return unixPath;
    return 'python'; // fallback
}

const PYTHON_VENV_PATH = getPythonPath();

/**
 * Check if Python is available
 */
async function checkPythonAvailable() {
    return new Promise((resolve) => {
        const pythonPath = PYTHON_VENV_PATH;
        const python = spawn(pythonPath, ['--version']);
        
        python.on('close', (code) => {
            resolve(code === 0);
        });
        
        python.on('error', () => {
            resolve(false);
        });
        
        setTimeout(() => {
            python.kill();
            resolve(false);
        }, 3000);
    });
}

/**
 * Create Qoder account via Python script
 */
async function createQoderAccountViaPython(accountIndex, useProxy, log, updateProgress, tempEmailProvider = null, options = {}) {
    const config = getConfig();
    
    let poolProxy = null;
    let proxyUrl = null;

    if (config.proxyPoolFile && useProxy) {
        poolProxy = await acquireProxy(log, updateProgress);
        proxyUrl = poolProxy;
    }

    updateProgress({ step: STEPS.LAUNCHING, email: "Creating temp email..." });
    log("Creating temporary email...");
    
    // For percentage mode, we load existing accounts and process them directly
    // This bypasses the normal email creation flow
    if (options.percentage && options.percentage > 0) {
        log(`Running in SECURITY MODE with ${options.percentage}% selection`);
        log(`Loading from ${config.accountFile || 'accounts.txt'}`);
    }
    
    const provider = tempEmailProvider || config.tempEmailProvider || "auto";
    const tempEmail = await createTempEmail(accountIndex, log, provider);

    if (tempEmail.provider === "gmail") {
        log("Pre-authenticating Gmail API (first run needs browser consent)...");
        const { getGmailClient } = require("../../providers/email/gmail-helper");
        await getGmailClient(log);
        log("Gmail API ready");
    }

    log(`Temporary email created: ${tempEmail.email}`);
    updateProgress({ step: STEPS.LAUNCHING, email: tempEmail.email });
    
    return new Promise((resolve, reject) => {
        const args = [
            '-u',  // Unbuffered output for real-time logs
            PYTHON_SCRIPT,
            '--email', tempEmail.email,
            '--provider', tempEmail.provider,
        ];
        
        // Pass csrf-token and cookies for stateful providers (1secemail)
        if (tempEmail.csrfToken && tempEmail.cookies) {
            args.push('--csrf-token', tempEmail.csrfToken);
            args.push('--cookies', tempEmail.cookies);
        }
        
        if (proxyUrl) {
            args.push('--proxy', proxyUrl);
        }
        
        if (config.headless) {
            args.push('--headless');
        } else {
            args.push('--no-headless');
        }
        
        const chromeBinary = config.chromeExecutablePath || 
                           '/Volumes/StorageTeamGroup/Browser/Google Chrome.app/Contents/MacOS/Google Chrome';
        args.push('--chrome-binary', chromeBinary);
        
        // Pass Node binary + gmail OTP CLI path for gmail provider
        if (tempEmail.provider === "gmail") {
            // Note: This would require implementing a callback CLI in Node.js
            log("WARNING: Gmail OTP requires additional setup - using non-Gmail provider recommended");
        }

        if (tempEmail.provider === "mailcx" && tempEmail.apiToken) {
            args.push('--api-token', tempEmail.apiToken);
        }
                            
        // Pass percentage and accounts-file for security mode
        if (options.percentage && options.percentage > 0) {
            args.push('--percentage', options.percentage.toString());
            args.push('--accounts-file', config.accountFile || 'accounts.txt');
        }
        
        log(`Executing Python script with email: ${tempEmail.email} (provider: ${tempEmail.provider})`);
        if (proxyUrl) log(`Using proxy: ${proxyUrl.split('@')[1] || proxyUrl}`);
        
        const python = spawn(PYTHON_VENV_PATH, args, { shell: process.platform === 'win32' });
        
        let output = '';
        let errorOutput = '';
        let lastLogTime = Date.now();
        
        python.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            const lines = text.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                log(`[Python] ${line}`);
                
                // Parse detailed status from Python logs
                if (line.includes('Launching browser')) {
                    updateProgress({ step: STEPS.LAUNCHING, email: "Launching browser..." });
                } else if (line.includes('Opening Qoder signup page')) {
                    updateProgress({ step: STEPS.NAVIGATING, email: "Opening Qoder..." });
                } else if (line.includes('Filling signup form')) {
                    updateProgress({ step: STEPS.NAVIGATING, email: "Typing form..." });
                } else if (line.includes('Captcha detected')) {
                    updateProgress({ step: STEPS.WAITING, email: "Solving captcha manually..." });
                } else if (line.includes('Waiting for OTP email')) {
                    updateProgress({ step: STEPS.WAITING, email: "Waiting for OTP email..." });
                } else if (line.includes('OTP received')) {
                    const otpMatch = line.match(/received:\s*([^\s]+)/);
                    if (otpMatch) {
                        updateProgress({ step: STEPS.WAITING, email: `OTP received: ${otpMatch[1]}` });
                    }
                } else if (line.includes('Creating PAT')) {
                    updateProgress({ step: STEPS.WAITING, email: "Creating PAT..." });
                } else if (line.includes('ACCOUNT CREATED SUCCESSFULLY')) {
                    updateProgress({ step: STEPS.DONE, email: tempEmail.email });
                }
            });
            
            lastLogTime = Date.now();
        });
        
        python.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            
            if (!text.includes('DevTools') && !text.includes('deprecated')) {
                log(`[Python Error] ${text.trim()}`);
            }
        });
        
        python.on('error', (error) => {
            log(`[Error] Failed to spawn Python: ${error.message}`);
            console.log(`\n❌ [PYTHON ERROR] Spawn failed: ${error.message}`);
            if (poolProxy) releaseProxy(poolProxy);
            reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });
        
        python.on('close', (code) => {
            if (poolProxy) {
                releaseProxy(poolProxy);
                log(`[Proxy] Released: ${poolProxy.split(':')[0]}`);
            }
            
            if (code === 0) {
                log('Python process completed successfully');
                const accountData = parseAccountFromOutput(output);
                if (accountData) {
                    // Save to qoder_accounts.jsonl
                    const accountsFile = path.join(PROJECT_ROOT, 'qoder_accounts.jsonl');
                    const accountLine = JSON.stringify(accountData) + '\n';
                    try {
                        fs.appendFileSync(accountsFile, accountLine, 'utf8');
                        log(`Account saved to ${accountsFile}`);
                    } catch (err) {
                        log(`Warning: Could not save to file: ${err.message}`);
                    }
                    
                    resolve({
                        success: true,
                        account: accountData
                    });
                } else {
                    reject(new Error('Failed to parse account data from output'));
                }
            } else {
                log(`Python process exited with code ${code}`);
                console.log(`\n❌ [PYTHON EXITED] Code: ${code}`);
                if (errorOutput.trim()) {
                    console.log(`\nSTDERR Output:`);
                    console.log(errorOutput);
                }
                reject(new Error(`Python exited with code ${code}: ${errorOutput || 'No error details'}`));
            }
        });
        
        const timeout = setTimeout(() => {
            log('⏰ Python process timeout (10 minutes), killing...');
            python.kill('SIGKILL');
            if (poolProxy) releaseProxy(poolProxy);
            reject(new Error('Python process timeout (10 minutes)'));
        }, 10 * 60 * 1000);
        
        python.on('close', () => {
            clearTimeout(timeout);
        });
        
        const heartbeatCheck = setInterval(() => {
            if (Date.now() - lastLogTime > 2 * 60 * 1000) {
                log('⚠️  No output from Python for 2 minutes, might be stuck');
                clearInterval(heartbeatCheck);
            }
        }, 30000);
        
        python.on('close', () => {
            clearInterval(heartbeatCheck);
        });
    });
}

function parseAccountFromOutput(output) {
    // Parse JSONL format
    const emailMatch = output.match(/Email:\s*([^\s]+)/);
    const passwordMatch = output.match(/Password:\s*([^\s]+)/);
    
    if (emailMatch && passwordMatch) {
        const patMatch = output.match(/PAT Token:\s*([^\s]+)/);
        const validMatch = output.match(/Status: ([^\s]+)/);
        
        return {
            email: emailMatch[1],
            password: passwordMatch[1],
            pat_token: patMatch ? patMatch[1].replace('...', '') : null,
            pat_valid: validMatch && validMatch[1].toLowerCase() === 'valid',
            created_at: new Date().toISOString()
        };
    }
    
    return null;
}

/**
 * Run Qoder worker for multiple accounts
 */
async function runQoderWorker(
    accountCount,
    workerId,
    workerIndex,
    total,
    progress,
    log,
    useProxy = true,
    tempEmailProvider = null,
) {
    const config = getConfig();
    
    let successCount = 0;
    let failedCount = 0;
    let processedCount = 0;
    
    const accountStats = [];
    
    for (let i = 0; i < accountCount; i++) {
        const updateProgress = (payload) => {
            progress.updateWorker(workerId, {
                ...payload,
                success: successCount,
                failed: failedCount,
                current: processedCount,
            });
        };
        
        const startTime = Date.now();
        let accountSuccess = false;
        let accountError = null;
        let accountEmail = "processing";
        let accountData = null;
        
        try {
            updateProgress({ step: STEPS.LAUNCHING, email: "Creating account..." });
            
            const result = await createQoderAccountViaPython(
                workerIndex * accountCount + i,
                useProxy,
                log,
                updateProgress,
                tempEmailProvider,
                {
                    percentage: options && options.percentage ? options.percentage : null,
                },
            );
            
            if (result.success && result.account) {
                accountData = result.account;
                accountEmail = accountData.email;
                accountSuccess = true;
                successCount += 1;
                processedCount += 1;
                
                accountStats.push({
                    email: accountData.email,
                    rawLine: `${accountData.email}:${accountData.password}`,
                    success: true,
                    duration: Date.now() - startTime,
                    error: null,
                    accountData: accountData
                });
                
                progress.updateWorker(workerId, {
                    step: STEPS.DONE,
                    email: accountEmail,
                    success: successCount,
                    failed: failedCount,
                    current: processedCount,
                });
            } else {
                throw new Error('No account created');
            }
        } catch (error) {
            accountSuccess = false;
            accountError = error.message;
            failedCount += 1;
            processedCount += 1;
            
            log(`[${workerId}] Error: ${error.message}`);
            
            progress.updateWorker(workerId, {
                step: STEPS.ERROR,
                email: accountEmail,
                success: successCount,
                failed: failedCount,
                current: processedCount,
            });
            
            accountStats.push({
                email: accountEmail,
                rawLine: `failed-${i+1}`,
                success: false,
                duration: Date.now() - startTime,
                error: accountError,
            });
        }
        
        if (i < accountCount - 1) {
            progress.updateWorker(workerId, { step: STEPS.WAITING });
            await sleep(config.delays.betweenAccounts || 10000);
        }
    }
    
    progress.updateWorker(workerId, {
        step: STEPS.DONE,
        email: "Done",
        success: successCount,
        failed: failedCount,
        current: accountCount,
    });
    
    return {
        successCount,
        failedCount,
        accounts: accountStats,
        label: `Qoder W${workerIndex + 1}`,
    };
}

/**
 * Main automation runner
 */
async function runQoderSignupAutomation(accountCount = 1, sharedProgress = null, useProxy = true, tempEmailProvider = null) {
    const config = getConfig();
    const logger = createFileLogger();
    
    const pythonAvailable = await checkPythonAvailable();
    if (!pythonAvailable) {
        const errorMsg = "❌ Python 3 not found! Please install Python 3 to use Qoder signup.";
        logger.log(errorMsg);
        if (!sharedProgress) {
            console.log("");
            console.log(errorMsg);
            console.log("   Install: brew install python3 (macOS) or apt install python3 (Linux)");
            console.log("");
        }
        logger.close();
        return null;
    }
    
    if (accountCount <= 0) {
        if (!sharedProgress) { console.log("Account count must be greater than 0"); }
        logger.close();
        return null;
    }
    
    if (!sharedProgress) {
        console.log("");
        console.log("💻 Qoder Signup Automation (Python + Playwright)");
        console.log(`   Creating ${accountCount} Qoder account(s)`);
        console.log("   Flow: Email → Signup → Captcha → OTP → PAT");
        console.log("");
    }
    
    const startedAt = Date.now();
    const workerCount = Math.min(config.browserCount, accountCount);
    const accountsPerWorker = Math.ceil(accountCount / workerCount);
    
    const progress =
        sharedProgress ||
        createProgressManager(
            `💻 Qoder Signup — ${accountCount} accounts, ${workerCount} workers`,
        );
    
    for (let i = 0; i < workerCount; i++) {
        progress.addWorker(`qoder-${i}`, accountsPerWorker, `Qoder W${i + 1}`);
    }
    
    const results = await Promise.all(
        Array.from({ length: workerCount }, (_, i) => {
            const workerAccounts = Math.min(accountsPerWorker, accountCount - (i * accountsPerWorker));
            
            return runQoderWorker(
                workerAccounts,
                `qoder-${i}`,
                i,
                accountCount,
                progress,
                logger.log,
                useProxy,
                tempEmailProvider,
            );
        }),
    );
    
    if (!sharedProgress) {
        progress.stop();
    }
    
    const successCount = results.reduce((sum, r) => sum + r.successCount, 0);
    const failedCount = results.reduce((sum, r) => sum + r.failedCount, 0);
    const totalDuration = Date.now() - startedAt;
    
    if (!sharedProgress) {
        printReport("💻 QODER SIGNUP AUTOMATION REPORT", results, totalDuration);
        console.log(`📄 Log: ${logger.logFile}`);
        console.log("");
        console.log(`💾 Output: ${path.join(PROJECT_ROOT, 'qoder_accounts.jsonl')}`);
        console.log("");
    } else {
        const duration = formatDuration(totalDuration);
        logger.log(
            `Qoder Signup finished. Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}`,
        );
    }
    
    logger.close();
    
    return { successCount, failedCount, results };
}

module.exports = {
    runQoderSignupAutomation,
    createQoderAccountViaPython,
    checkPythonAvailable,
};
