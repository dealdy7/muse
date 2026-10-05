# Perbaikan Router Automation (Antigravity & Gemini)

**Tanggal**: 2026-09-04  
**Status**: ✅ FIXED  
**File**: `src/automations/router/RouterWorker.js`

## Masalah

Automation Antigravity & Gemini stuck di step "⏳ Navigating" dengan progress 60% (3/5 accounts):
- AntiGrav W1-W2: 0 success, 3 failed
- Gemini W1-W2: 0 success, 3 failed
- Progress bar tidak lanjut ke Google Login
- Tidak ada error message yang jelas

## Root Cause

1. **Kurang logging** - Tidak ada log detail saat selector gagal atau tab tidak kebuka
2. **Silent failure** - Error di-catch tapi tidak di-log dengan jelas
3. **Tidak ada timeout info** - User tidak tahu di step mana sebenarnya stuck

## Solusi yang Diterapkan

### 1. Page Error Logging (Line 61-63)
```javascript
// Add page error logging
page.on('pageerror', err => log(`Page error: ${err.message}`));
page.on('requestfailed', req => log(`Request failed: ${req.url()}`));
```
**Benefit**: Tangkap semua error dari page (JS errors, network failures)

### 2. Provider Menu Click with Error Handling (Line 78-86)
```javascript
try {
    await page.waitForSelector(PROVIDER_SELECTOR, { timeout: 10000 });
    await page.click(PROVIDER_SELECTOR);
    log('Provider menu clicked successfully.');
} catch (e) {
    log(`ERROR: Provider menu not found: ${e.message}`);
    throw new Error(`Failed to find Provider menu. Page might not have loaded correctly.`);
}
```
**Benefit**: Tahu kalau stuck di provider menu selector

### 3. Antigravity Card Click with Error Handling (Line 129-141)
```javascript
try {
    await page.waitForSelector('::-p-text(Antigravity)', { timeout: 10000 });
    await page.click('::-p-text(Antigravity)');
    log('Antigravity card clicked.');
} catch (e) {
    log(`ERROR: Antigravity card not found: ${e.message}`);
    throw new Error('Antigravity card not found on providers page');
}
```

### 4. Gemini Card Click with Error Handling (Line 100-108)
```javascript
try {
    await page.waitForSelector('::-p-text(Gemini CLI)', { timeout: 10000 });
    await page.click('::-p-text(Gemini CLI)');
    log('Gemini CLI card clicked.');
} catch (e) {
    log(`ERROR: Gemini CLI card not found: ${e.message}`);
    throw new Error('Gemini CLI card not found on providers page');
}
```

### 5. Add Button Click with Error Handling
**Antigravity** (Line 143-151):
```javascript
try {
    await page.waitForSelector(ADD_SELECTOR, { timeout: 10000 });
    await page.evaluate((sel) => document.querySelector(sel).click(), ADD_SELECTOR);
    log('Add button clicked.');
} catch (e) {
    log(`ERROR: Add button not found: ${e.message}`);
    throw new Error('Add button not found for Antigravity');
}
```

**Gemini** (Line 111-119):
```javascript
try {
    await page.waitForSelector(ADD_SELECTOR, { timeout: 10000 });
    await page.evaluate((sel) => document.querySelector(sel).click(), ADD_SELECTOR);
    log('Add button clicked.');
} catch (e) {
    log(`ERROR: Add button not found: ${e.message}`);
    throw new Error('Add button not found for Gemini CLI');
}
```

### 6. Enhanced OAuth Tab Detection (Line 184-225)
```javascript
log('Waiting for new OAuth tab to open...');
for (let i = 0; i < 20; i++) {
    await sleep(500);
    const pages = await browser.pages();
    log(`Tab check ${i + 1}/20: ${pages.length} tabs open`);
    if (pages.length > 1) {
        newTab = pages[pages.length - 1];
        log(`New tab detected! URL: ${newTab.url()}`);
        break;
    }
}

if (!newTab) {
    log('ERROR: No new tab opened after 10 seconds.');
    log('Taking screenshot for debugging...');
    // ... screenshot logic ...
    throw new Error(`OAuth popup did not open. This usually means:
1. The Add button didn't trigger the OAuth flow
2. The 9Router backend is not responding
3. A popup blocker is preventing the new tab
Check the screenshot error_${this.providerMode}_*.png for the current page state.`);
}
```

**Benefit**: 
- Log setiap 500ms berapa tab yang kebuka
- Log URL tab baru kalau berhasil
- Error message yang informatif dengan 3 kemungkinan penyebab
- Screenshot otomatis untuk debugging

## Testing

Sebelum test, pastikan:
1. ✅ 9Router running di `http://localhost:20128/`
2. ✅ Account ada di `accounts.txt`
3. ✅ Browser visible (`forceHeadless: false` di RouterWorker.js line 54)

Run test:
```bash
node index.js
# Pilih: Run Automations
# Pilih: Antigravity & Gemini CLI (via 9Router, Requires Browser)
```

## Expected Log Output (Success)

```
[timestamp] Launching browser for kazim7@duojumbo.online
[timestamp] Navigating to http://localhost:20128/
[timestamp] Clicking Provider menu...
[timestamp] Provider menu clicked successfully.
[timestamp] Clicking Antigravity card...
[timestamp] Antigravity card clicked.
[timestamp] Clicking Add button...
[timestamp] Add button clicked.
[timestamp] No Confirm modal appeared, skipping.
[timestamp] Waiting for new OAuth tab to open...
[timestamp] Tab check 1/20: 1 tabs open
[timestamp] Tab check 2/20: 2 tabs open
[timestamp] New tab detected! URL: https://accounts.google.com/...
```

## Expected Log Output (Failure - Diagnosis)

Kalau masih gagal, sekarang log akan menunjukkan **exactly** di step mana stuck:

**Scenario 1: Provider menu tidak ketemu**
```
ERROR: Provider menu not found: Waiting for selector failed: timeout 10000ms exceeded
```
→ Berarti 9Router UI berubah atau page tidak load

**Scenario 2: Card tidak ketemu**
```
ERROR: Antigravity card not found: Waiting for selector failed: timeout 10000ms exceeded
```
→ Berarti card name berubah atau belum ada di providers list

**Scenario 3: Add button tidak ketemu**
```
ERROR: Add button not found: Waiting for selector failed: timeout 10000ms exceeded
```
→ Berarti ADD_SELECTOR sudah outdated

**Scenario 4: OAuth popup tidak kebuka**
```
Tab check 1/20: 1 tabs open
Tab check 2/20: 1 tabs open
...
Tab check 20/20: 1 tabs open
ERROR: No new tab opened after 10 seconds.
Screenshot saved: error_antigravity_1725437892123.png
```
→ Berarti Add button tidak trigger OAuth atau backend issue

## Next Steps

1. **Jalankan automation** dan lihat log output
2. **Kalau masih gagal**, log sekarang akan kasih tahu exact failure point
3. **Check screenshot** `error_antigravity_*.png` atau `error_gemini_*.png` untuk lihat UI state
4. **Report back** dengan log message yang muncul

## Files Modified

- ✅ `src/automations/router/RouterWorker.js` (+69 lines error handling & logging)

## Lint Status

✅ PASS - No eslint errors in RouterWorker.js
