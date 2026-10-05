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
    await new Promise(r => setTimeout(r, 6000));
    const pages = await browser.pages();
    const newTab = pages[pages.length - 1];
    
    const buttonHtml = await newTab.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        let target = els.find(e => e.textContent && e.textContent.includes('Continue with Google') && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE' && e.children.length === 0);
        if (target) return target.outerHTML;
        
        target = Array.from(document.querySelectorAll('div, button, span')).find(e => e.textContent.trim() === 'Continue with Google');
        if (target) return target.outerHTML;
        
        // Find any element containing google
        target = Array.from(document.querySelectorAll('div, button, span')).find(e => e.textContent.toLowerCase().includes('google'));
        if (target) return target.outerHTML;

        return 'Not found';
    });
    console.log("BUTTON HTML:", buttonHtml);
    await browser.close();
})();
