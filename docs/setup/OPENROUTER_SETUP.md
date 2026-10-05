# OpenRouter Automation Setup Guide

## Overview

OpenRouter automation menggunakan **Chrome profile yang persisten** untuk menghindari Cloudflare anti-bot detection. Dengan setup ini, Anda hanya perlu login Google **SEKALI**, lalu bot akan reuse session tersebut untuk semua akun.

---

## 🚀 Quick Setup (Recommended)

### Step 1: Install Chrome (jika belum)

Download dan install Google Chrome dari: https://www.google.com/chrome/

### Step 2: Login Google Account di Chrome

1. Buka Chrome biasa
2. Login ke akun Google pertama Anda
3. (Optional) Add multiple Google accounts di Chrome
   - Klik profile icon (kanan atas)
   - "Add" → Login akun kedua, ketiga, dst.

### Step 3: Jalankan Bot

```bash
npm start
```

Pilih: **"OpenRouter API Key (Add to 9Router)"**

Bot akan otomatis:
- ✅ Menggunakan Chrome profile Anda
- ✅ Detect akun Google yang sudah login
- ✅ Create API key tanpa CAPTCHA
- ✅ Paste ke 9Router

---

## 🏢 Setup untuk Warnet / Komputer Publik

### Jika Chrome profile di lokasi non-standard:

1. **Cari lokasi Chrome profile Anda:**
   
   **Windows:**
   - Tekan `Win + R`
   - Ketik: `%LOCALAPPDATA%\Google\Chrome\User Data`
   - Copy path yang muncul

   **Atau cari manual:**
   - `C:\Users\YourUsername\AppData\Local\Google\Chrome\User Data`
   - `D:\ChromeProfile\User Data` (custom install)

2. **Set di file `.env`:**

   Buka `.env` dan edit line:
   ```env
   CHROME_PROFILE_PATH=D:\ChromeProfile\User Data
   ```

   Contoh untuk warnet:
   ```env
   CHROME_PROFILE_PATH=E:\PortableChrome\User Data
   ```

3. **Jalankan bot:**
   ```bash
   npm start
   ```

---

## 📋 Cara Kerja

### Phase 1: Login Google (Manual - 1x aja)
1. Buka Chrome
2. Login semua akun Google yang akan digunakan
3. Chrome menyimpan session di profile

### Phase 2: Bot Automation (Otomatis)
1. Bot buka Chrome dengan profile yang sama
2. Navigate ke `accounts.google.com` → sudah login ✅
3. Navigate ke OpenRouter → klik Google sign-in
4. Auto-redirect tanpa password (pakai session)
5. Create API key
6. Paste ke 9Router
7. Logout → ulangi untuk akun berikutnya

---

## 🛠️ Troubleshooting

### Error: "Chrome profile not found"

**Solusi:**
1. Pastikan Chrome sudah terinstall
2. Atau set manual di `.env`:
   ```env
   CHROME_PROFILE_PATH=C:\Path\To\Chrome\User Data
   ```

### Error: "Profile is locked" / Chrome sudah berjalan

**Penyebab:** Chrome utama sedang berjalan dengan profile yang sama.

**Solusi:**
Bot menggunakan profile terpisah bernama **"OpenRouterBot"** untuk menghindari conflict. Ini normal dan tidak perlu close Chrome utama.

### Cloudflare CAPTCHA masih muncul

**Penyebab:** Bot detection masih aktif.

**Solusi:**
1. Pastikan menggunakan real Chrome profile (bukan Playwright/Puppeteer)
2. Login manual ke Google di Chrome dulu
3. Jalankan bot dengan `PW_HEADLESS=0` (dengan UI)
4. Solve CAPTCHA manual 1x, session akan tersimpan

### Bot tidak bisa klik tombol / stuck

**Solusi:**
1. Check log untuk lihat error detail
2. Pastikan `PW_HEADLESS=0` di `.env` (bot harus visible)
3. Lihat browser yang terbuka untuk debug

---

## 🔧 Advanced Configuration

### Menggunakan Multiple Chrome Profiles

Edit di `OpenRouterWorker.js` line yang set `profileName`:

```javascript
const profileName = 'OpenRouterBot'; // Ganti dengan nama profile custom
```

### Custom Browser Args

Edit di `.env`:

```env
BROWSER_ARGS_SETS=[["--disable-blink-features=AutomationControlled","--disable-features=IsolateOrigins"]]
```

---

## 📊 Expected Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. Bot Launch Chrome (OpenRouterBot profile)       │
│    Uses: CHROME_PROFILE_PATH/OpenRouterBot         │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 2. Navigate to accounts.google.com                  │
│    Status: Already logged in ✅ (from manual setup) │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 3. Login with Email/Password                        │
│    (only if not already logged in)                  │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 4. Navigate to openrouter.ai/sign-in                │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 5. Click "Sign in with Google"                      │
│    → Auto-redirects (no password needed)            │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 6. Click "Continue" on consent page                 │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 7. Navigate to API Keys page                        │
│    https://openrouter.ai/settings/keys              │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 8. Click "New Key" → Create API key                 │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 9. Copy API key (sk-or-v1-...)                      │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 10. Navigate to 9Router                             │
│     http://localhost:20128/dashboard/providers/...  │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 11. Paste API key with 5-letter name (from email)  │
│     Example: kazim.abc@domain.com → "kazim"         │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 12. Logout from OpenRouter                          │
│     (prepare for next account)                      │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 13. Repeat for next account                         │
│     (Session persists in Chrome profile)            │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits

✅ **No CAPTCHA** - Cloudflare tidak detect bot karena pakai real Chrome  
✅ **Fast** - Reuse Google session, tidak perlu login berulang  
✅ **Reliable** - Persistent profile, session tidak hilang  
✅ **Flexible** - Support warnet, portable Chrome, custom paths  

---

## 📝 Notes

- Bot menggunakan **profile terpisah** (`OpenRouterBot`) untuk menghindari conflict
- Google session **tersimpan** di Chrome profile, tidak perlu login ulang
- Cloudflare **tidak detect** karena menggunakan real Chrome fingerprint
- Support **multiple accounts** - bot akan loop semua akun di `accounts.txt`

---

## 🆘 Support

Jika ada masalah, check:
1. File log di `logs/` folder
2. Browser window yang terbuka (lihat error messages)
3. `.env` configuration

Atau buka issue di GitHub repository.
