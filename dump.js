const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('http://localhost:20128/');
    await new Promise(r => setTimeout(r, 2000));
    const fs = require('fs');
    fs.writeFileSync('9router_html.txt', await page.content());
    
    // Login if needed
    try {
        await page.type('input[type="password"]', 'Aldyarif12');
        await page.click('button');
        await new Promise(r => setTimeout(r, 2000));
        fs.writeFileSync('9router_html_loggedin.txt', await page.content());
        
        // Go to Kimi provider page
        await page.click('::-p-text(Kimi)');
        await new Promise(r => setTimeout(r, 2000));
        fs.writeFileSync('9router_html_kimi.txt', await page.content());
    } catch(e) {}
    
    await browser.close();
}
run();
