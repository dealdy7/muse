---
title: Browser Path Detection Fix
category: fixes
created: 2026-08-20
status: COMPLETED
priority: HIGH
---

# ✅ Browser Path Detection Fix

## 🔍 Problem

After implementing performance fixes, all automations failed immediately (< 2s) with error:

```
Error: Browser was not found at the configured executablePath 
(/Volumes/StorageTeamGroup/Browser/Google Chrome.app/Contents/MacOS/Google Chrome)
```

**Root Cause:**
- `findAvailableChromePath()` was falling back to **Mac path** when browser not found
- Brave Browser installed at `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`
- Brave was **NOT** in the search list
- Fallback defaulted to non-existent Mac path on Windows system

---

## 🔧 Fix Applied

**File:** `src/config/index.js`

**Changes:**

### 1. Added Brave Browser to Search Paths

```javascript
function findAvailableChromePath() {
    const possiblePaths = [
        // Windows - Chrome
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        
        // Windows - Brave (ADDED)
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        
        // Windows - Edge as fallback
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", 
        // ... rest of paths
    ];
    
    // ... detection logic
}
```

### 2. Changed Fallback Behavior

**Before:**
```javascript
// Return fallback path for macOS (original default)
return "/Volumes/StorageTeamGroup/Browser/Google Chrome.app/Contents/MacOS/Google Chrome";
```

**After:**
```javascript
// Return empty - let Puppeteer/Playwright find browser
return "";
```

**Rationale:**
- Returning empty string allows Puppeteer/Playwright to use **their own browser detection**
- Safer than hardcoded fallback to non-existent path
- Works across platforms

---

## 📊 Impact

### Before Fix:
- ❌ **All automations failed** immediately
- ❌ Error: Browser not found at Mac path
- ❌ Duration: 2s (instant failure)
- ❌ Success rate: 0%

### After Fix:
- ✅ **Brave Browser detected** correctly
- ✅ Chrome path: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`
- ✅ Ready for automation testing
- ✅ Cross-platform compatibility improved

---

## 🧪 Verification

```bash
node -e "const {getConfig}=require('./src/config');console.log('Chrome Path:',getConfig().chromeExecutablePath)"
```

**Output:**
```
Chrome Path: C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe
```

✅ **Verified:** Brave Browser correctly detected!

---

## 🎯 Browser Detection Priority

Updated search order:
1. **Chrome** (Windows, macOS, Linux)
2. **Brave** ← ADDED (Windows, both Program Files locations)
3. **Edge** (Windows fallback)
4. **Chromium** (Windows)
5. **macOS** Chrome/Chromium apps
6. **Linux** Chrome/Chromium binaries
7. **Playwright** downloaded Chromium
8. **Empty** (let Puppeteer find it)

---

## 📝 Related Issues

This fix was discovered during performance fix testing:
- **Performance fixes:** [PERFORMANCE_FIX_IMPLEMENTATION.md](./PERFORMANCE_FIX_IMPLEMENTATION.md)
- **Original issue:** Performance fixes implemented but automation failed on browser launch

---

## ✅ Status

**FIXED** - Brave Browser now detected correctly on Windows

**Ready for:** Performance testing with actual automation run

---

**Fixed Date:** 2026-08-20  
**Fixed By:** Kiro AI Agent  
**Verified:** ✅ Browser path detection working
