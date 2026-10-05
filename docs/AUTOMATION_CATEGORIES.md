# Automation Categories & Rules

## 🔒 CATEGORY A: ORIGINAL SYSTEM (PROTECTED)

**Automations:**
- Kiro
- Cloudflare  
- GitHub
- TokenGo
- LiveRouter
- CodeBuddy
- Grok
- Proxy

**Rules:**
- ✅ Headless mode only (`PW_HEADLESS=1`)
- ✅ Background operation (no Chrome UI)
- ❌ AI cannot modify code
- ❌ No debugging UI mode
- ✅ Human manual edit only

**Files:**
```
src/automations/kiro/
src/automations/cloudflare/
src/automations/github/
src/automations/tokengo/
src/automations/livrouter/
src/automations/codebuddy/
src/automations/grok/
src/automations/proxy/
```

---

## ⚡ CATEGORY B: ADDITIONAL FEATURES (MODIFIABLE)

**Automations:**
- Antigravity (9Router)
- Kimi (9Router)
- Gemini (9Router)  
- OpenRouter
- Qoder

**Rules:**
- ✅ AI can modify/improve
- ✅ Can use UI mode for debugging
- ✅ Can add new features
- ✅ Flexible headless settings

**Files:**
```
src/automations/router/ (handles Kimi, Antigravity, Gemini)
src/automations/openrouter/
```

---

## BROWSER MODE CONFIGURATION

### Category A (Original):
```javascript
// ALWAYS use default (headless from .env)
const { browser, page } = await launchBrowser(
    browserArgsIndex,
    workerIndex,
    proxy,
);
```

### Category B (Additional):
```javascript
// CAN use forceHeadless override for debugging
const { browser, page } = await launchBrowser(
    browserArgsIndex,
    workerIndex,
    proxy,
    { forceHeadless: false } // Only in Category B
);
```

---

## TROUBLESHOOTING APPROACH

### If Category A Fails:
1. ❌ Don't modify automation code
2. ✅ Check accounts.txt format
3. ✅ Check .env settings
4. ✅ Check network/service status
5. ✅ Compare with ori tanam reference
6. ✅ Manual investigation only

### If Category B Fails:
1. ✅ AI can debug and modify
2. ✅ Add logging and error handling
3. ✅ Improve UI flow
4. ✅ Test with UI mode if needed

---

## PROTECTION ENFORCEMENT

- Kiro steering file prevents AI modification
- Clear separation of responsibilities
- User maintains control of critical automations
- AI assists with new features only

**Status**: ✅ ACTIVE SEPARATION  
**Date**: 2026-08-16