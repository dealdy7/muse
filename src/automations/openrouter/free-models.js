const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const colors = require("ansi-colors");
const { getConfig } = require("../../config");

puppeteer.use(StealthPlugin());

async function runFreeModelsCheck(sharedProgress = null, useProxy = false) {
    console.log("");
    console.log(colors.cyan("═".repeat(70)));
    console.log(colors.cyan.bold("  OpenRouter Free Models Checker"));
    console.log(colors.cyan("═".repeat(70)));
    console.log("");
    
    const config = getConfig();
    let browser;
    
    try {
        console.log(colors.yellow("🌐 Launching browser..."));
        
        browser = await puppeteer.launch({
            headless: false,
            executablePath: config.chromeExecutablePath,
            args: ['--start-maximized'],
            defaultViewport: null,
        });
        
        const page = await browser.newPage();
        
        console.log(colors.yellow("📡 Navigating to OpenRouter models page..."));
        await page.goto('https://openrouter.ai/models', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        await page.waitForTimeout(3000);
        
        console.log(colors.yellow("🔍 Extracting free models..."));
        
        const freeModels = await page.evaluate(() => {
            const models = [];
            
            // Find all model cards
            const modelCards = document.querySelectorAll('[class*="model"]');
            
            modelCards.forEach(card => {
                const text = card.innerText || card.textContent;
                
                // Check if it's free (contains "$0" or "Free" or "free")
                if (text.includes('$0') || text.toLowerCase().includes('free')) {
                    // Extract model name (usually first line or largest text)
                    const lines = text.split('\n').filter(l => l.trim());
                    if (lines.length > 0) {
                        const modelName = lines[0];
                        const priceInfo = lines.find(l => l.includes('$') || l.toLowerCase().includes('free')) || 'Free';
                        
                        // Try to find limits
                        const limitInfo = lines.find(l => 
                            l.includes('request') || 
                            l.includes('limit') || 
                            l.includes('/day') ||
                            l.includes('/hour')
                        ) || 'No limit info';
                        
                        models.push({
                            name: modelName,
                            price: priceInfo,
                            limit: limitInfo
                        });
                    }
                }
            });
            
            return models;
        });
        
        console.log("");
        console.log(colors.green("✅ Free Models Found:"));
        console.log(colors.cyan("═".repeat(70)));
        
        if (freeModels.length === 0) {
            console.log(colors.yellow("⚠️  No free models detected. The page structure might have changed."));
            console.log(colors.yellow("Please check manually at: https://openrouter.ai/models"));
        } else {
            freeModels.forEach((model, i) => {
                console.log(colors.white.bold(`\n${i + 1}. ${model.name}`));
                console.log(colors.green(`   Price: ${model.price}`));
                console.log(colors.blue(`   Limit: ${model.limit}`));
            });
        }
        
        console.log("");
        console.log(colors.cyan("═".repeat(70)));
        console.log(colors.gray("💡 Tip: Free models may change. Check regularly!"));
        console.log(colors.cyan("═".repeat(70)));
        console.log("");
        
        console.log(colors.yellow("Browser will close in 10 seconds..."));
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error(colors.red(`\n❌ Error: ${error.message}`));
        console.log(colors.yellow("Please check manually at: https://openrouter.ai/models"));
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    // Return empty result (this automation doesn't process accounts)
    return { successCount: 0, failedCount: 0 };
}

module.exports = { runFreeModelsCheck };
