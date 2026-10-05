---
inclusion: auto
---

# 🔒 ORIGINAL CODE PROTECTION RULES

## CRITICAL: AI MODIFICATION RESTRICTIONS

The following files are ORIGINAL SYSTEM CODE and MUST NOT be modified by AI agents under any circumstances:

### 🚫 PROTECTED FILES (AI CANNOT EDIT):
```
src/automations/kiro/
src/automations/cloudflare/
src/automations/github/
src/automations/tokengo/
src/automations/livrouter/
src/automations/codebuddy/
src/automations/grok/
src/automations/proxy/
src/providers/google/login.js
src/browser/
src/config/
src/utils/
src/cli/
```

### ✅ ALLOWED FILES (AI CAN EDIT/IMPROVE):
```
src/automations/router/ (Kimi, Antigravity, Gemini)
src/automations/openrouter/
docs/
README.md
*.md files
.env (headless settings only)
```

## RULES FOR AI AGENTS:

### 1. **NEVER MODIFY ORIGINAL AUTOMATIONS**
- Kiro, Cloudflare, GitHub, TokenGo are LOCKED
- These run headless/background mode
- Any user request to "fix" these → respond: "Original automations are protected. Only manual editing allowed."

### 2. **BROWSER MODE RULES**
- Original automations: ALWAYS headless (`PW_HEADLESS=1`)
- New automations: Can use UI mode for debug

### 3. **ERROR HANDLING**
- If original automation fails → investigate external causes (network, accounts, service down)
- DO NOT modify the automation code
- Suggest manual fixes or account changes only

### 4. **USER REQUESTS**
When user asks to "fix Kiro/Cloudflare":
- ❌ Don't edit the automation files
- ✅ Check accounts.txt, .env, network issues
- ✅ Compare with ori tanam for reference
- ✅ Suggest manual solutions only

### 5. **BACKUP REFERENCE**
- Use `L:\Personal Project\Repo github\ori tanam` as reference
- Never copy from ori tanam to override (user manages manually)
- Only compare for analysis

## VIOLATION CONSEQUENCES

If AI modifies protected files:
1. User loses trusted working automation
2. May break production workflows  
3. Difficult to revert to working state

## EMERGENCY OVERRIDE

Only the human user can override this protection by:
1. Explicitly stating: "Override protection, modify [filename]"
2. Taking full responsibility for consequences
3. Having backup of working code

---

**Status**: 🔒 ACTIVE PROTECTION  
**Enforcement**: STRICT - NO EXCEPTIONS  
**Last Updated**: 2026-08-16