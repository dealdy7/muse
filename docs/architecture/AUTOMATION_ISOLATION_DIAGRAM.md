---
title: Automation Isolation Diagram
category: architecture
created: 2026-08-20
---

# 🏗️ Automation Isolation - Visual Diagram

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SHARED COMPONENTS (Safe Base)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ BaseWorker   │  │ Config       │  │ Browser      │             │
│  │ (Abstract)   │  │ (Global)     │  │ (Launch)     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         ▲                 ▲                 ▲                       │
│         │                 │                 │                       │
│         │                 │                 │                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          │                 │                 │
          ├─────────────────┴─────────────────┴─────────────┐
          │                                                   │
          │                                                   │
┌─────────▼───────────┐                          ┌───────────▼──────────┐
│  GROUP A: ROUTER    │                          │  GROUP B: NO ROUTER  │
│  (Uses 9Router)     │                          │  (Independent)       │
├─────────────────────┤                          ├──────────────────────┤
│                     │                          │                      │
│  ┌───────────────┐  │                          │  ┌────────────────┐ │
│  │ KiroWorker    │  │                          │  │ OpenRouter     │ │
│  │ ✅ Isolated   │  │                          │  │ Worker         │ │
│  │               │  │                          │  │ ✅ Isolated    │ │
│  │ - Circuit     │  │                          │  │                │ │
│  │   breaker     │  │                          │  │ - Setup mode   │ │
│  │ - Router      │  │                          │  │ - No router    │ │
│  │   import      │  │                          │  └────────────────┘ │
│  └───────────────┘  │                          │                      │
│                     │                          │  ┌────────────────┐ │
│  ┌───────────────┐  │                          │  │ QoderWorker    │ │
│  │ Cloudflare    │  │                          │  │ ✅ Isolated    │ │
│  │ Worker        │  │                          │  │                │ │
│  │ ✅ Isolated   │  │                          │  │ - Browser      │ │
│  │               │  │                          │  │   based        │ │
│  │ - Circuit     │  │                          │  │ - No router    │ │
│  │   breaker     │  │                          │  └────────────────┘ │
│  │ - Router      │  │                          │                      │
│  │   validation  │  │                          │  ┌────────────────┐ │
│  └───────────────┘  │                          │  │ Codebuddy      │ │
│                     │                          │  │ ✅ Isolated    │ │
│  ┌───────────────┐  │                          │  └────────────────┘ │
│  │ 9Router       │  │                          │                      │
│  │ Automations   │  │                          │  ┌────────────────┐ │
│  │ ✅ Isolated   │  │                          │  │ TokenGo        │ │
│  │               │  │                          │  │ ✅ Isolated    │ │
│  │ - Kimi        │  │                          │  └────────────────┘ │
│  │ - Antigravity │  │                          │                      │
│  │ - Gemini CLI  │  │                          │  ┌────────────────┐ │
│  └───────────────┘  │                          │  │ LivRouter      │ │
│                     │                          │  │ ✅ Isolated    │ │
└─────────────────────┘                          │  └────────────────┘ │
                                                 │                      │
                                                 │  ┌────────────────┐ │
                                                 │  │ GitHub Signup  │ │
                                                 │  │ ✅ Isolated    │ │
                                                 │  └────────────────┘ │
                                                 │                      │
                                                 │  ┌────────────────┐ │
                                                 │  │ Grok Signup    │ │
                                                 │  │ ✅ Isolated    │ │
                                                 │  └────────────────┘ │
                                                 └──────────────────────┘
```

---

## 🔗 Dependency Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                     OPTIONAL DEPENDENCIES                         │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Router Provider     │ ◄────── │  Kiro & Cloudflare  │
│  (9Router API)       │         │  (Optional import)   │
│                      │         └──────────────────────┘
│  - Timeout: 5s       │
│  - Circuit breaker   │         ┌──────────────────────┐
│    handled by        │ ◄────── │  9Router Automations │
│    workers           │         │  (Kimi/Anti/Gemini)  │
└──────────────────────┘         └──────────────────────┘
                                           
                                 ┌──────────────────────┐
                                 │  OpenRouter, Qoder   │
                                 │  (NO router import)  │
                                 │  ✅ Completely       │
                                 │     independent      │
                                 └──────────────────────┘
```

---

## 🛡️ Isolation Boundaries

### ✅ SAFE TO MODIFY (Won't affect others):

```
src/automations/
├── kiro/
│   └── KiroWorker.js          ✅ Modify safely
├── cloudflare/
│   └── CloudflareWorker.js    ✅ Modify safely
├── openrouter/
│   └── OpenRouterWorker.js    ✅ Modify safely
├── qoder/
│   └── QoderWorker.js         ✅ Modify safely
├── router/
│   └── index.js               ✅ Modify safely (only affects Kimi/Anti/Gemini)
└── [any other automation]/
    └── *Worker.js             ✅ Modify safely
```

### ⚠️ CAUTION (Affects multiple automations):

```
src/
├── automations/
│   └── base/
│       └── BaseWorker.js      ⚠️ Affects ALL (test all after changes)
├── config/
│   └── index.js               ⚠️ Affects ALL (test multiple)
├── providers/
│   └── router/
│       └── index.js           ⚠️ Affects Group A only (Kiro, CF, 9Router)
├── browser/
│   └── index.js               ⚠️ Affects ALL (test multiple)
└── utils/
    └── *.js                   ⚠️ Affects ALL (depending on usage)
```

---

## 📈 Recent Fixes Impact Map

### Performance Fixes (2026-08-20):

```
Fix #1: Router Timeout (15s → 5s)
└─ File: src/providers/router/index.js
   ├─ ✅ Kiro (affected, improved)
   ├─ ✅ Cloudflare (affected, improved)
   ├─ ✅ Kimi/Antigravity/Gemini (affected, improved)
   ├─ ❌ OpenRouter (NOT affected, no router)
   ├─ ❌ Qoder (NOT affected, no router)
   └─ ❌ Others (NOT affected, no router)

Fix #2: Circuit Breaker
└─ Files: 
   ├─ src/automations/kiro/KiroWorker.js
   │  └─ ✅ Kiro ONLY (completely isolated)
   │
   └─ src/automations/cloudflare/CloudflareWorker.js
      └─ ✅ Cloudflare ONLY (completely isolated)
   
   ❌ OpenRouter, Qoder, Others: NOT affected

Fix #3: Graceful Shutdown Removal
└─ Same as Fix #2 (Kiro & Cloudflare only)

Fix #4: Browser Path Detection
└─ File: src/config/index.js
   ├─ ✅ ALL automations benefit (Brave + warnet paths)
   ├─ ✅ Backward compatible
   └─ ✅ No breaking changes
```

---

## 🎯 Testing Strategy

### Scenario 1: Fix Bug in Kiro
```
1. Modify: src/automations/kiro/KiroWorker.js
2. Test: Kiro automation only
3. Result: ✅ Safe, others unaffected
```

### Scenario 2: Fix Bug in OpenRouter
```
1. Modify: src/automations/openrouter/OpenRouterWorker.js
2. Test: OpenRouter automation only
3. Result: ✅ Safe, others unaffected
```

### Scenario 3: Modify BaseWorker
```
1. Modify: src/automations/base/BaseWorker.js
2. Test: 
   - ✅ Kiro (Group A)
   - ✅ OpenRouter (Group B)
   - ✅ Qoder (Group B)
3. Result: ⚠️ Test multiple, affects all
```

---

## ✅ Conclusion

**Isolation Level: EXCELLENT ✅**

1. **Each automation is independent** - separate Worker files
2. **Shared components are safe** - well-designed with inheritance
3. **Recent fixes were isolated** - only affected specific automations
4. **Bug fixes in one automation won't break others** ✅

**Your concern is VALID and the architecture handles it well!** 🎉

---

**See Also:**
- [CODE_ISOLATION_ANALYSIS.md](./CODE_ISOLATION_ANALYSIS.md) - Detailed analysis
- [RESTRUCTURE-PLAN.md](../RESTRUCTURE-PLAN.md) - Project structure plan
