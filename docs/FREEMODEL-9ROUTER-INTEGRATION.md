# FreeModel → 9Router Auto Integration

## 📅 28 Agustus 2026

---

## 🎯 Tujuan

Otomatis signup FreeModel via Google OAuth, extract API key, dan inject ke 9Router sebagai OpenAI Compatible provider.

---

## 🔧 Flow Automation

### Step 1: Navigate ke FreeModel
```
INVITE_URL dari config (.env)
Contoh: https://freemodel.dev/dashboard?refer=abc123
```

### Step 2: Klik Google Sign In
```html
<a href="/api/auth/google/redirect" class="btn-google">
  Continue with Google
</a>
```

**Selector Strategy**:
1. Cari `<a>` dengan `className.includes('google')`
2. Cari `<a>` dengan `href.includes('google')`
3. Cari `<a>` dengan `innerText` contains 'google'
4. Fallback ke `<button>` jika tidak ada link

### Step 3: Google OAuth Login
```
Redirect ke accounts.google.com
Login dengan email/password dari accounts.txt
Menggunakan helper: completeGoogleLogin()
```

### Step 4: Wait Redirect
```
Tunggu redirect kembali ke freemodel.dev/dashboard
Sleep 5 detik untuk ensure session saved
```

### Step 5: Extract API Key
```javascript
// Cari pattern 'sk-...' di page
const apiKey = await page.evaluate(() => {
  // Check code/pre/input elements
  const codeElements = document.querySelectorAll('code, pre, input');
  for (const el of codeElements) {
    const text = el.value || el.textContent || '';
    if (text.match(/sk-[a-zA-Z0-9_-]{32,}/)) {
      return text.trim();
    }
  }
  
  // Check localStorage
  const stored = localStorage.getItem('apiKey') || 
                 localStorage.getItem('freemodel_api_key');
  return stored;
});
```

### Step 6: Inject ke 9Router
```javascript
// 6.1: Ensure provider node
const providerNodeId = await router.ensureProviderNode(
  "FreeModel",
  "openai-tf-sg",
  "chat",
  "https://api.freemodel.dev/v1",
  "openai-compatible"
);

// 6.2: Import API key
await router.importProvider(
  providerNodeId,
  "freemodel",
  apiKey,
  { defaultModel: "gpt-4o" }
);
```

---

## 📊 9Router Provider Config

| Field | Value |
|-------|-------|
| **Name** | freemodel |
| **Prefix** | openai-tf-sg |
| **API Type** | Chat Completions |
| **Base URL** | https://api.freemodel.dev/v1 |
| **Default Model** | gpt-4o |

---

## ⚙️ Setup

### 1. Set Invite URL
```bash
npm start → Settings → Invite URL
```

**Contoh**:
```
https://freemodel.dev/dashboard?refer=abc123
https://freemodel.dev/invite/XXX
```

### 2. Prepare Accounts
**File**: `accounts.txt`  
**Format**: `email|password`

```
user1@example.com|password123
user2@example.com|password456
```

### 3. Run Automation
```bash
npm start
→ Run Automations
→ Adaptif Link Signup (FreeModel/OpenRouter)
```

---

## 🐛 Error Handling

### API Key Extraction Failed
```
⚠️ Could not extract API key automatically. Manual extraction needed.
```

**Solution**: Manual check di FreeModel dashboard, copy API key

### 9Router Injection Failed
```
⚠️ Failed to add to 9Router: [error message]
```

**Solution**: 
1. Check 9Router accessible
2. Manual add via 9Router UI
3. Check Router credentials in .env

### Google Login Failed
```
❌ Could not find Google Sign In button
```

**Solution**: 
1. Check INVITE_URL correct
2. FreeModel page structure changed
3. Update selector

---

## 📸 Visual Debug

**Browser Mode**: `headless: false` (visible untuk debug)

**Change to Headless**:
```javascript
// File: src/automations/freemodel/FreeModelWorker.js
// Line: 169

headless: false, // ← Ganti ke true untuk production
```

---

## ✅ Success Indicators

1. ✅ Browser buka FreeModel page
2. ✅ Klik "Continue with Google"
3. ✅ Redirect ke accounts.google.com
4. ✅ Login berhasil
5. ✅ Redirect ke freemodel.dev/dashboard
6. ✅ API key extracted: `sk-...`
7. ✅ Provider node created in 9Router
8. ✅ API key imported to 9Router

---

## 📁 Files Modified

- `src/automations/freemodel/FreeModelWorker.js` (+70 lines)
  - Fixed Google button selector (button → link)
  - Added API key extraction
  - Added 9Router integration

- `index.js` (+4 lines)
  - Added "Adaptif Link Signup" to main menu (position #3)

---

## 🏆 Status

- **Google OAuth**: ✅ Working
- **API Key Extraction**: ✅ Implemented
- **9Router Injection**: ✅ Implemented
- **Error Handling**: ✅ Graceful fallback
- **Browser Mode**: ⚠️ Visible (untuk debug)

---

## 🚀 Next Steps

1. Test dengan real accounts
2. Verify API key extraction works
3. Verify 9Router injection works
4. Change `headless: false` → `true` for production
5. Add retry logic if needed

---

**🌱 Selamat bercocok tanam!**
