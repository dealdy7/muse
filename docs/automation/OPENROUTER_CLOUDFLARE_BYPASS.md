# OpenRouter Cloudflare Turnstile Bypass

## Problem
OpenRouter uses Cloudflare Turnstile to detect bots. Even manual clicking sometimes fails because Puppeteer fingerprint is detected.

## Solutions

### Option 1: 2Captcha Auto-Solve (Recommended)
**Cost**: ~$3 USD per 1000 solves (~$0.003 per account)

**Setup**:
1. Register at [2captcha.com](https://2captcha.com)
2. Add balance to your account ($3-10 minimum)
3. Copy your API key from dashboard
4. Add to `.env`:
   ```
   CAPTCHA_API_KEY=your_2captcha_api_key_here
   ```
5. Run automation - Turnstile will be solved automatically!

**How it works**:
- Bot detects Turnstile challenge
- Extracts sitekey from page
- Sends to 2Captcha API
- Receives solution token (~10-30s)
- Injects token and bypasses Turnstile

**Success rate**: ~95%

### Option 2: Manual Solving (Free, Default)
If no `CAPTCHA_API_KEY` is set, automation will:
- Detect Turnstile
- Pause for 20 seconds
- Wait for you to click "Verify you are human" checkbox manually
- Resume automation after 20s

**Success rate**: ~50-70% (depends on browser fingerprint detection)

### Option 3: Better Stealth (Experimental)
Already implemented in code:
- Enhanced `puppeteer-extra-plugin-stealth`
- Disabled automation flags
- Real Chrome profile usage
- Custom navigator properties

**Success rate improvement**: +10-20% for manual solving

## Current Implementation
File: `src/automations/openrouter/OpenRouterWorker.js`

Flow:
1. Navigate to OpenRouter sign-in
2. Click Google button (FAST - 3.5s)
3. **Check for Turnstile**:
   - If `CAPTCHA_API_KEY` exists → Auto-solve with 2Captcha
   - If no API key → Wait 20s for manual click
4. Continue with Google OAuth (FAST - <2s per field)
5. Extract API key
6. Add to 9Router

## Timing
**With auto-solve**:
- Detik 3: Browser ready
- Detik 5: Button clicked
- Detik 7: Turnstile detected
- Detik 17-37: Solving... (2Captcha: 10-30s)
- Detik 40: Username typed
- Detik 41: Password typed
- **Total: ~45s per account**

**With manual solve** (if you're fast):
- Detik 3: Browser ready
- Detik 5: Button clicked
- Detik 7: Turnstile detected → YOU CLICK NOW!
- Detik 10: Resumed
- Detik 12: Username typed
- Detik 13: Password typed
- **Total: ~20s per account** (if manual click succeeds)

## Alternative Services
If 2Captcha is slow or expensive:
- **Anti-Captcha**: https://anti-captcha.com (~$0.002 per solve)
- **CapSolver**: https://capsolver.com (~$0.0025 per solve)
- **CapMonster Cloud**: https://capmonster.cloud (~$0.0015 per solve)

To use different service, modify code at line ~235 in `OpenRouterWorker.js` to use their SDK.

## Troubleshooting

### "2Captcha failed: insufficient funds"
Add more balance to your 2Captcha account.

### "2Captcha failed: ERROR_TURNSTILE_NOT_FOUND"
OpenRouter changed their Turnstile implementation. Need to update sitekey extraction logic.

### Manual click still fails 3x in a row
Your browser fingerprint is too obvious. Solutions:
1. Use 2Captcha auto-solve (recommended)
2. Use undetected-chromedriver instead of Puppeteer
3. Use residential proxy
4. Use real Chrome browser with extensions disabled

### Auto-solve is slow (>60s)
2Captcha might be overloaded. Try:
1. Different time of day
2. Premium 2Captcha plan (faster workers)
3. Alternative service (Anti-Captcha, CapSolver)

## Cost Analysis
**100 accounts with 2Captcha**:
- Turnstile solves: 100 × $0.003 = $0.30
- Monthly (assuming daily): ~$9/month
- Yearly: ~$110/year

**vs Manual Labor**:
- 100 accounts × 5s manual click = 8 minutes of babysitting
- Success rate: 50-70% → need to retry 30-50 accounts
- Total time: ~15-20 minutes per 100 accounts

**Recommendation**: If you run >50 accounts/day, use 2Captcha. Otherwise manual is fine.
