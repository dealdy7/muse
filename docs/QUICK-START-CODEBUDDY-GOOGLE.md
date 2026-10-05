# 🚀 Quick Start: CodeBuddy Google OAuth

Panduan cepat untuk menambahkan akun CodeBuddy via Google OAuth ke 9Router.

## ⚡ 5 Menit Setup

### Step 1: Siapkan Akun Google

Buat file `my-accounts.txt`:
```
your-email@gmail.com:YourPassword123
```

**Catatan**: Pastikan akun Google:
- ✅ Tidak pakai 2FA (atau gunakan app-specific password)
- ✅ Domain email diizinkan CodeBuddy (Gmail recommended)

### Step 2: Pastikan 9Router Running

Cek di browser:
```
https://9router-production-6273.up.railway.app/dashboard
```

Login dengan password 9Router Anda.

### Step 3: Jalankan Automation

```bash
# Single account
node scripts/codebuddy-google.js your-email@gmail.com YourPassword123

# Atau batch dari file
node scripts/codebuddy-google.js --file my-accounts.txt

# Atau via npm
npm run codebuddy:google -- --file my-accounts.txt
```

### Step 4: Tunggu Proses Selesai

Output yang baik:
```
[1/1] Processing: your-email@gmail.com
[API] Requesting device code from router...
[API] Device code received: abc123...
Launching browser...
Clicked Google button in frame 'auth'
Clicked Confirm in frame 'auth': Confirm
Google OAuth page: https://accounts.google.com/...
⚡ Email typed in 45ms
⚡ Password typed in 38ms
Google login completed, waiting for redirect...
On /started, OAuth flow complete!
[API] Polling successful!
✅ CodeBuddy Google OAuth successful!
```

### Step 5: Verifikasi di 9Router

1. Buka https://9router-production-6273.up.railway.app/dashboard/providers/codebuddy-intl
2. Scroll ke "Connections"
3. Cari akun Anda di list
4. Status harus **hijau (active)**

## 🎯 Yang Terjadi Behind The Scenes

```
┌──────────────┐
│  Your Script │
└──────┬───────┘
       │
       ├─[1]─> Request device code dari 9Router API
       │       Response: { device_code, verification_uri }
       │
       ├─[2]─> Start polling di background (500ms interval)
       │
       ├─[3]─> Launch browser → verification_uri
       │       https://codebuddy.ai/oauth/device?code=...
       │
       ├─[4]─> Click "Sign in with Google" (di iframe)
       │
       ├─[5]─> Click "Confirm" (Service Agreement dialog)
       │
       ├─[6]─> Redirect ke accounts.google.com
       │       ├─> Fill email
       │       ├─> Click Next
       │       ├─> Fill password
       │       └─> Click Next
       │
       ├─[7]─> Google redirect kembali ke CodeBuddy
       │       Callback: codebuddy.ai/oauth/callback?code=...
       │
       ├─[8]─> CodeBuddy redirect ke /started
       │
       └─[9]─> Polling complete! 
               9Router menerima OAuth token
               Akun berhasil ditambahkan
```

## ❓ Troubleshooting Cepat

### Browser tidak muncul
```javascript
// Edit di codebuddy-google-oauth.js line ~500
forceHeadless: false,  // ✅ Benar (browser visible)
forceHeadless: true,   // ❌ Salah (headless)
```

### Error: "Domain restricted"
Email domain tidak diizinkan CodeBuddy.
**Solusi**: Gunakan Gmail atau email domain publik lain.

### Error: "Polling timeout"
OAuth flow > 120 detik.
**Solusi**: 
- Cek koneksi internet
- Cek apakah 9Router API response (buka di browser)

### Error: "Google signup button not found"
Iframe belum load sempurna.
**Solusi**: Tambah delay di line ~350:
```javascript
await sleep(6000); // Dari 4000 jadi 6000
```

### Akun muncul tapi status merah/error
Kemungkinan:
1. OAuth token expired → Re-run automation
2. CodeBuddy API rate limit → Tunggu 5-10 menit
3. Account disabled di CodeBuddy → Cek login manual di codebuddy.ai

## 📊 Batch Processing Tips

Untuk multiple accounts:

```bash
# Buat file accounts.txt
cat > accounts.txt << EOF
email1@gmail.com:Pass123
email2@gmail.com:Pass456
email3@gmail.com:Pass789
EOF

# Run batch
node scripts/codebuddy-google.js --file accounts.txt
```

Output:
```
═══════════════════════════════════════════
  CodeBuddy Google OAuth Automation
  Mode: batch
  Accounts: 3
═══════════════════════════════════════════

[1/3] Processing: email1@gmail.com
✅ Success: email1@gmail.com

Waiting 5s before next account...

[2/3] Processing: email2@gmail.com
✅ Success: email2@gmail.com

Waiting 5s before next account...

[3/3] Processing: email3@gmail.com
✅ Success: email3@gmail.com

═══════════════════════════════════════════
  Results:
  ✅ Success: 3
  ❌ Failed: 0
  📊 Total: 3
═══════════════════════════════════════════
```

## 🔗 Next Steps

- 📖 Baca full documentation: [docs/CODEBUDDY-GOOGLE-OAUTH.md](./CODEBUDDY-GOOGLE-OAUTH.md)
- 🐛 Report issues: GitHub Issues
- 💡 Request features: GitHub Discussions

## 🆚 Kenapa Bukan GitHub OAuth?

| GitHub OAuth | Google OAuth |
|-------------|-------------|
| File: `index.js` | File: `codebuddy-google-oauth.js` |
| Butuh GitHub account | Butuh Google account |
| Device OTP required | No device OTP |
| **Shared code** → rusak saat maintenance | **Kode terpisah** → aman |

Google OAuth lebih **stabil** karena kodenya **tidak akan terpengaruh** saat GitHub OAuth di-maintenance.

## ✅ Checklist

Sebelum run automation, pastikan:

- [ ] 9Router sudah running & accessible
- [ ] Provider `codebuddy-intl` sudah ada di 9Router
- [ ] Google account siap (email + password)
- [ ] Google 2FA disabled (atau app password ready)
- [ ] File `accounts.txt` sudah dibuat (untuk batch mode)
- [ ] Node.js >= 16.0.0 installed
- [ ] Dependencies installed (`npm install`)

---

**Selamat bercocok tanam! 🌱**
