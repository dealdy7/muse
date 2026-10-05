# 📦 Background Automations vs Browser-Visible Automations

## Overview

Script telah dipisahkan menjadi **DUA KELOMPOK UTAMA** berdasarkan mode eksekusinya:

---

## ⚙️ BACKGROUND MODE (Headless - No Browser Visible)

Automations ini berjalan di **background tanpa membuka browser Chrome**. Ideal untuk production environment atau ketika Anda tidak ingin browser terbuka.

### ✅ Automations yang Termasuk:

1. **Kiro Automation** 
   - Fungsi: Generate refresh tokens untuk Kiro AI
   - Mode: Always Headless (force enabled)
   - Output: `output/keys/kiro_keys.txt`

2. **Cloudflare Automation**
   - Fungsi: Generate API tokens untuk Cloudflare AI
   - Mode: Always Headless (force enabled)  
   - Output: `output/keys/cloudflare_keys.txt`

### 🔧 Technical Details:

- Menggunakan Puppeteer dengan `headless: true` parameter
- Browser Chrome berjalan di background tanpa UI
- Resource usage lebih rendah
- Tidak memerlukan monitoring manual
- Log tersedia di terminal output

---

## 💻 BROWSER VISIBLE MODE (Interactive)

Automations ini memerlukan **Chrome window yang terlihat** karena berinteraksi dengan captchas, OTP, atau form login yang kompleks.

### ❗ Automations yang Termasuk:

1. **OpenRouter Automation**
   - Fungsi: Generate OpenRouter API keys via 9Router
   - Notes: Persistent session required

2. **Qoder Signup**
   - Fungsi: Create Qoder accounts with Personal Access Token
   - Features: Percentage-based selection security mode

3. **Antigravity & Gemini CLI (9Router)**
   - Fungsi: Register via 9Router proxy
   - Required: Browser interaction for anti-bot detection

4. **Kimi Automation (9Router)**
   - Fungsi: Register Kimi account via 9Router
   - Required: Browser interaction

5. **TokenGo Automation**
   - Fungsi: GitHub OAuth to TokenGo
   - Cooldown: 30-90s with proxy rotation
   - Notes: Residential proxy recommended

6. **Grok Signup**
   - Fungsi: Create new Grok/x.ai accounts
   - Temp email support: ncaori, 1secemail, gmail, mail.cx

7. **Codebuddy Automation**
   - Fungsi: GitHub OAuth to Codebuddy
   - Modes: Use existing keys or create-new+login
   - Notes: Residential proxy recommended

8. **LivRouter Automation**
   - Fungsi: GitHub OAuth + affiliate chaining
   - Modes: Existing, Create, Pool-create, Pool-existing
   - Expected credits: Workers × 3

9. **GitHub Signup**
   - Fungsi: Create new GitHub accounts
   - Temp email support: ncaori, 1secemail, gmail, mail.cx
   - Used as prerequisite for above automations

---

## 🎯 How to Use

### Running Only Background Automations (Recommended for Production):

```bash
node index.js
# Pilih: Kiro Automation AND/OR Cloudflare Automation
```

**Result**: No Chrome window will appear. All processing happens in background.

### Running Browser-Visible Automations:

```bash
node index.js
# Pilih automation yang memerlukan browser visible
```

**Result**: Chrome window(s) will open and be visible during execution.

### Running Mixed (Both Types Together):

```bash
node index.js
# Pilih BOTH Kiro/Cloudflare AND browser-visible automations
```

**Result**:
- Kiro/Cloudflare run silently in background
- Other automations show Chrome windows
- Console displays separate status for each group

---

## 📊 Visual Indicators

When running mixed automations, you'll see:

```
🔵 Automations starting...

📦 BACKGROUND MODE (2):
   └ Kiro Automation
   └ Cloudflare Automation

💻 BROWSER VISIBLE MODE (1):
   └ TokenGo
      Note: Chrome window(s) will be shown
```

---

## 🔒 Security & Safety

### Background Mode Benefits:
- ✅ No manual captcha solving needed
- ✅ Lower resource consumption
- ✅ Can run on headless server/remote desktop
- ✅ Cleaner execution logs
- ✅ Better for bulk operations

### Browser Mode Considerations:
- ⚠️ May require captcha solving
- ⚠️ Higher resource usage
- ⚠️ Requires active desktop session
- ⚠️ Anti-bot protection may trigger
- ⚠️ Residential proxies recommended

---

## ⚡ Performance Tips

### For Maximum Efficiency:

1. **Separate Background Runs** from Browser Runs
   ```
   Batch 1: Run only Kiro + Cloudflare (fast, headless)
   Batch 2: Run browser-visible automations separately
   ```

2. **Use Proxy Rotation**
   - Background: Standard proxy pool works fine
   - Browser: Consider residential proxies

3. **Batch Similar Automations**
   - Don't mix heavy browser tasks with background tasks
   - Group by similar temp email providers

4. **Monitor System Resources**
   - Background: Low RAM/CPU usage
   - Browser: Multiple Chrome instances = high RAM usage

---

## 🔧 Configuration

### Force Headless Settings

In `/src/automations/kiro/KiroWorker.js`:
```javascript
const { browser, page } = await launchBrowser(
    browserArgsIndex,
    workerIndex,
    proxy,
    { forceHeadless: true }, // Always background mode
);
```

In `/src/automations/cloudflare/CloudflareWorker.js`:
```javascript
const { browser, page } = await launchBrowser(
    browserArgsIndex,
    workerIndex,
    proxy,
    { forceHeadless: true }, // Always background mode
);
```

These overrides ensure Kiro and Cloudflare ALWAYS run in background, regardless of other settings.

---

## 🐛 Troubleshooting

### Issue: Chrome still opens for Kiro/Cloudflare

**Solution**: 
- Ensure you're using the updated code (this commit)
- Check if `{ forceHeadless: true }` is present in Worker files
- Clear any cached configs: `npm run reload-config`

### Issue: Browser-visible automations failing

**Possible causes**:
- Captcha blocking → Try residential proxy
- Session conflicts → Close all Chrome before running
- Network issues → Verify proxy configuration

### Issue: Too many Chrome windows opening

**Solution**:
- Reduce browser count in `.env`: `BROWSER_COUNT=1`
- Run automations sequentially (not parallel)
- Separate heavy browser tasks into different batches

---

## 📝 Best Practices

1. **Production Environment**: Use ONLY background automations
2. **Testing/QA**: Can use browser-visible for debugging
3. **Bulk Operations**: Split between background vs browser modes
4. **Proxy Strategy**: Different proxies for each category
5. **Monitoring**: Background = automated logging, Browser = manual oversight

---

## 🎉 Summary

Script sekarang memiliki pemisahan yang JELAS antara:
- **Background (Kiro, Cloudflare)** → Selalu headless, aman untuk production
- **Browser-visible (Others)** → Memerlukan Chrome visible, interaktif

Dengan struktur baru ini:
- ✅ Kiro/Cloudflare tidak terpengaruh oleh fix pada automations lain
- ✅ Lebih aman untuk testing (jika satu gagal, yang lain tetap jalan)
- ✅ Easier maintenance dan debugging
- ✅ Clear separation of concerns
- ✅ Optimized for different use cases

---

**Last Updated**: August 19, 2026
**Version**: Background Isolation Update
