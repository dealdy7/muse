const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const colors = require("ansi-colors");
const fs = require("fs");
const path = require("path");
const { getConfig } = require("../../config");

puppeteer.use(StealthPlugin());

async function runAddKeysTo9Router(sharedProgress = null, useProxy = false) {
    console.log("");
    console.log(colors.cyan("═".repeat(70)));
    console.log(colors.cyan.bold("  Add OpenRouter Keys to 9Router"));
    console.log(colors.cyan("═".repeat(70)));
    console.log("");
    
    const apiRouterPath = path.join(process.cwd(), 'apirouter.txt');
    
    if (!fs.existsSync(apiRouterPath)) {
        console.error(colors.red(`\n❌ Error: apirouter.txt not found at ${apiRouterPath}`));
        console.log(colors.yellow("Please create the file with API keys:"));
        console.log(colors.white("  Format: name|apikey"));
        console.log(colors.white("  Example: bot-key-1|sk-or-v1-abc123"));
        console.log(colors.white("  Or just: sk-or-v1-abc123 (auto-named by index)"));
        return;
    }
    
    const content = fs.readFileSync(apiRouterPath, 'utf-8');
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    
    if (lines.length === 0) {
        console.error(colors.red("\n❌ Error: apirouter.txt is empty!"));
        return;
    }
    
    const keys = lines.map((line, index) => {
        if (line.includes('|')) {
            const [name, apikey] = line.split('|').map(s => s.trim());
            return { name, apikey };
        } else {
            return {
                name: `openrouter-key-${index + 1}`,
                apikey: line.trim()
            };
        }
    });
    
    console.log(colors.green(`✅ Found ${keys.length} API key(s) in apirouter.txt`));
    console.log("");
    
    const config = getConfig();
    let browser;
    let successCount = 0;
    let failCount = 0;
    
    try {
        console.log(colors.yellow("🌐 Launching browser..."));
        
        browser = await puppeteer.launch({
            headless: false,
            executablePath: config.chromeExecutablePath,
            args: ['--start-maximized'],
            defaultViewport: null,
        });
        
        const page = await browser.newPage();
        
        console.log(colors.yellow("📡 Navigating to 9Router OpenRouter dashboard..."));
        const dashboardUrl = 'http://localhost:20128/dashboard/providers/openrouter';
        
        try {
            await page.goto(dashboardUrl, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
        } catch (e) {
            console.error(colors.red("\n❌ Error: Cannot reach 9Router at http://localhost:20128"));
            console.log(colors.yellow("Please make sure 9Router is running!"));
            console.log(colors.white("Start 9Router first, then run this automation again."));
            return;
        }
        
        await page.waitForTimeout(2000);
        
        console.log(colors.yellow(`\n🔑 Adding ${keys.length} key(s)...`));
        console.log(colors.cyan("═".repeat(70)));
        
        for (let i = 0; i < keys.length; i++) {
            const { name, apikey } = keys[i];
            
            try {
                console.log(colors.white(`\n[${i + 1}/${keys.length}] Adding key: ${name}`));
                
                // Click "Add OpenRouter API Key" button
                await page.waitForSelector('button:has-text("Add OpenRouter API Key"), button:has-text("Add Key")', { timeout: 5000 });
                await page.click('button:has-text("Add OpenRouter API Key"), button:has-text("Add Key")');
                await page.waitForTimeout(1000);
                
                // Check if Bulk Add tab exists and is preferred
                const bulkTabExists = await page.$('button:has-text("Bulk Add")');
                
                if (bulkTabExists) {
                    // Use Bulk Add format: name|apikey
                    console.log(colors.gray("  Using Bulk Add mode..."));
                    
                    await page.click('button:has-text("Bulk Add")');
                    await page.waitForTimeout(500);
                    
                    // Find textarea and input
                    const textarea = await page.$('textarea');
                    if (textarea) {
                        await textarea.click();
                        await textarea.type(`${name}|${apikey}`, { delay: 10 });
                    }
                } else {
                    // Use Single mode
                    console.log(colors.gray("  Using Single Add mode..."));
                    
                    // Click Single tab if exists
                    const singleTab = await page.$('button:has-text("Single")');
                    if (singleTab) {
                        await singleTab.click();
                        await page.waitForTimeout(500);
                    }
                    
                    // Fill Name field
                    const nameInput = await page.$('input[placeholder*="Name"], input[name="name"]');
                    if (nameInput) {
                        await nameInput.click();
                        await nameInput.type(name, { delay: 10 });
                    }
                    
                    // Fill API Key field
                    await page.waitForTimeout(300);
                    const keyInput = await page.$('input[placeholder*="API Key"], input[name="apiKey"]');
                    if (keyInput) {
                        await keyInput.click();
                        await keyInput.type(apikey, { delay: 10 });
                    }
                }
                
                await page.waitForTimeout(500);
                
                // Click Save or Add button
                const saveBtn = await page.$('button:has-text("Save"), button:has-text("Add All Keys")');
                if (saveBtn) {
                    await saveBtn.click();
                    await page.waitForTimeout(2000);
                    
                    console.log(colors.green(`  ✅ Key added successfully!`));
                    successCount++;
                } else {
                    console.log(colors.red(`  ❌ Could not find Save button`));
                    failCount++;
                }
                
            } catch (error) {
                console.log(colors.red(`  ❌ Error: ${error.message}`));
                failCount++;
                
                // Try to close any open dialogs
                try {
                    const cancelBtn = await page.$('button:has-text("Cancel")');
                    if (cancelBtn) await cancelBtn.click();
                } catch (e) {
                    // Ignore
                }
            }
            
            await page.waitForTimeout(1000);
        }
        
        console.log("");
        console.log(colors.cyan("═".repeat(70)));
        console.log(colors.green(`✅ Success: ${successCount} key(s)`));
        if (failCount > 0) {
            console.log(colors.red(`❌ Failed: ${failCount} key(s)`));
        }
        console.log(colors.cyan("═".repeat(70)));
        console.log("");
        
        console.log(colors.yellow("Browser will close in 5 seconds..."));
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error(colors.red(`\n❌ Error: ${error.message}`));
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // Return result with counts
    return { successCount, failedCount };
}

module.exports = { runAddKeysTo9Router };
