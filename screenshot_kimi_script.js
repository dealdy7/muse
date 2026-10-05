const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
    const page = await browser.newPage();
    await page.goto('http://localhost:20128/');
    await page.waitForSelector('body > div.flex.h-screen.w-full.overflow-hidden.bg-bg > div.hidden.lg\\:flex > aside > nav > a:nth-child(2)');
    await page.click('body > div.flex.h-screen.w-full.overflow-hidden.bg-bg > div.hidden.lg\\:flex > aside > nav > a:nth-child(2)');
    await page.waitForSelector('::-p-text(Kimi)');
    await page.click('::-p-text(Kimi)');
    await page.waitForSelector('::-p-text(Kimi Coding OAuth)');
    await page.click('::-p-text(Kimi Coding OAuth)');
    await new Promise(r => setTimeout(r, 8000));
    const pages = await browser.pages();
    const newTab = pages[pages.length - 1];
    await newTab.screenshot({ path: 'kimi_popup.png', fullPage: true });
    await browser.close();
    console.log('Saved to kimi_popup.png');
})();
