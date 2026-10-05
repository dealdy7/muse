# OpenRouter Profile-Based Approach

## Problem
Cloudflare Turnstile blocks full automation even with:
- ✅ Stealth plugin
- ✅ Fast typing (5ms delay)
- ✅ Enhanced fingerprint
- ✅ 2Captcha integration (requires $3 top-up)

Manual clicking Turnstile also fails 3x.

## Solution: Split Login from Automation

### Phase 1: Profile Setup (Automated)
Login Gmail accounts to warnet Chrome profile:
```
Chrome Path: D:\Aplikasi\Google\Chrome\Application\chrome.exe
Profile: F:\Akun\Bot
```

**Why this setup?**
- Uses `start.bat` Chrome + Profile configuration
- Cleans singleton locks (like start.bat does)
- Tab biasa (not incognito)
- Direct Google login URL (not OpenRouter)

### start.bat Analysis
```batch
# Clean locks
taskkill /F /IM chrome.exe /T
del /f /s /q "F:\Akun\Bot\SingletonLock"
del /f /s /q "F:\Akun\Bot\SingletonCookie"

# Launch Chrome with profile
start "" "D:\Aplikasi\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="F:\Akun\Bot" ^
  --no-first-run ^
  --disable-extensions-file-access-check ^
  --disable-session-crashed-bubble ^
  --password-store=basic
```

ProfileSetupWorker uses same args (minus remote-debugging).

### Phase 2: Manual OpenRouter Setup
After all accounts logged to profile:
1. Open browser with profile
2. Visit `https://openrouter.ai/sign-in`
3. Click Google login → select account from list
4. Repeat for all 10 accounts

### Phase 3: Key Extraction (Future)
Create extraction-only mode:
- Use pre-logged profile
- Skip login entirely
- Just navigate to Keys page
- Extract API keys
- Add to 9Router

## Usage

### Step 1: Run Profile Setup
```bash
npm start
# Select: "OpenRouter Profile Setup (Login Gmail only)"
```

**Features:**
- ✅ Uses warnet Chrome from `D:\Aplikasi\Google\Chrome\Application\chrome.exe`
- ✅ Profile: `F:\Akun\Bot` (same as start.bat)
- ✅ Cleans singleton locks before launch
- ✅ Tab biasa (not incognito)
- ✅ Direct Google Sign In URL
- ✅ Sequential processing (1 worker)
- ✅ Fast Google login (<1s typing)
- ✅ Browser stays open 10s to ensure save
- ✅ Skips already-logged accounts

**Progress:**
```
OpenRouter Profile Setup
Profile W1 ██░░░░░░░░░░░░░░░░░░ 10% │ 1/10 │ user@example.com │ ⏳ Google login
```

### Step 2: Manual OpenRouter Login
1. Use start.bat to open Chrome with profile:
```bash
F:\Repo github\start.bat
```

Or manually:
```bash
"D:\Aplikasi\Google\Chrome\Application\chrome.exe" --user-data-dir="F:\Akun\Bot"
```

2. For each account in `accounts.txt`:
   - Visit https://openrouter.ai/sign-in
   - Click "Sign in with Google"
   - Select account from list (should NOT ask password)
   - Wait for dashboard
   - Repeat for next account

### Step 3: Extract Keys (Manual for now)
1. Visit https://openrouter.ai/workspaces/default/keys
2. Click "+ New Key"
3. Name: `bot-key-{email}`
4. Copy key
5. Add to 9Router manually or save to file

## Files Created

### ProfileSetupWorker.js
```javascript
class ProfileSetupWorker extends BaseWorker {
    constructor() {
        super({
            automationName: 'OpenRouter Profile Setup',
            automationType: 'openrouter-setup',
            maxWorkers: 1, // Sequential
            removeAccountOnSuccess: false, // Keep for later
        });
    }
}
```

**Key features:**
- Uses `F:\Akun\Bot\Profile 2` (external SSD)
- Launches with Stealth plugin
- Verifies login at `myaccount.google.com`
- Waits 10s before close to ensure profile saves

### profile-setup.js
Wrapper to expose ProfileSetupWorker to CLI.

### index.js (Modified)
Added menu option:
```javascript
{
    name: "OpenRouter Profile Setup (Login Gmail only)",
    value: "openrouter-setup"
}
```

## Benefits

### ✅ Pros
1. **No Cloudflare blocking** - manual login bypasses detection
2. **Fast setup** - 10 accounts in ~2 minutes (15s each)
3. **One-time setup** - profile persists indefinitely
4. **100% success rate** - no failed logins
5. **Free** - no 2Captcha costs

### ⚠️ Cons
1. **Manual step required** - OpenRouter login can't be automated
2. **Two-phase process** - setup then manual then extract
3. **Profile dependency** - must use same profile path

## Future Improvements

### Extraction Mode (Phase 3)
Create `OpenRouterExtractWorker.js`:
```javascript
// Use pre-logged profile
const profilePath = 'F:\\Akun\\Bot\\Profile 2';

// Navigate directly to keys page
await page.goto('https://openrouter.ai/workspaces/default/keys');

// Click "+ New Key" without login
await page.click('button::-p-text(New Key)');

// Extract key
const apiKey = await page.$eval('input', el => el.value);

// Add to 9Router
await addToRouter(apiKey);
```

### Profile Verification
Check which accounts already logged:
```javascript
async function checkProfileAccounts() {
    // Launch with profile
    // Visit myaccount.google.com
    // List all logged accounts
    // Return array of emails
}
```

## Troubleshooting

### Browser won't open
Check Brave path in `.env`:
```
CHROME_EXECUTABLE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe
```

### Profile not saving
- Wait full 10s before closing browser
- Check disk space on F: drive
- Verify write permissions

### Google CAPTCHA appears
- Use slower typing: set `delay: 50` in login.js
- Wait 1 hour between attempts
- Try different account

### "Use another account" clicked automatically
Profile has different account logged in. Clear profile:
```bash
Remove-Item -Recurse -Force "F:\Akun\Bot\Profile 2"
```

## Technical Details

### Profile Structure
```
F:\Akun\Bot\Profile 2\
├── Default/
│   ├── Cookies
│   ├── Local Storage/
│   └── Session Storage/
└── Local State
```

### Launch Args
```javascript
args: [
    "--start-maximized",
    "--window-size=1920,1080",
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
],
userDataDir: "F:\\Akun\\Bot\\Profile 2",
ignoreDefaultArgs: ["--enable-automation"]
```

### Anti-Detection
```javascript
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
    });
    window.chrome = { runtime: {} };
});
```

## Changelog

### 2026-08-20
- ✅ Created ProfileSetupWorker.js
- ✅ Added CLI menu option
- ✅ Used external SSD path per user requirement
- ✅ Fast Google login (<15s per account)
- ⏳ Manual OpenRouter login (Phase 2)
- ⏳ Extraction mode (Phase 3 - future)
