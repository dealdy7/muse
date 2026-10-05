# CodeBuddy Google OAuth Automation

Automation untuk menambahkan akun CodeBuddy menggunakan **Google OAuth** ke 9Router proxy.

## 🎯 Fitur

- ✅ **Kode terpisah** dari GitHub OAuth (tidak akan rusak saat maintenance)
- ✅ Otomatis klik "Sign in with Google" di iframe CodeBuddy
- ✅ Otomatis handle dialog "Confirm" (Service Agreement)
- ✅ Otomatis login Google (email + password)
- ✅ Otomatis polling ke 9Router API untuk menunggu OAuth selesai
- ✅ Support batch processing dari file

## 📋 Prerequisites

1. **9Router** harus sudah running di `https://9router-production-6273.up.railway.app`
2. **Google account** yang valid (email + password)
3. Provider `codebuddy-intl` harus sudah dikonfigurasi di 9Router

## 🚀 Cara Pakai

### Single Account

```bash
node scripts/codebuddy-google.js your-email@gmail.com YourPassword123
```

### Batch Processing

Buat file `accounts.txt`:
```
email1@gmail.com:Password123
email2@gmail.com:AnotherPass456
# Komentar bisa pakai #
email3@gmail.com:SecurePass789
```

Jalankan:
```bash
node scripts/codebuddy-google.js --file accounts.txt
```

## 🔄 Workflow

1. **Device Code**: Minta device code dari 9Router API (`/api/oauth/codebuddy-intl/device-code`)
2. **Polling Start**: Mulai polling di background (interval 500ms, timeout 120s)
3. **Browser Launch**: Buka browser (non-headless untuk OAuth)
4. **Navigate**: Buka verification URI dari step 1
5. **Iframe Prep**: 
   - Tunggu login page load
   - Klik tab "Sign up" (jika ada)
   - Centang ToS checkbox
6. **Google Button**: Klik "Sign in with Google" di iframe
7. **Confirm Dialog**: Klik tombol "Confirm" (Service Agreement)
8. **Google OAuth**: 
   - Tunggu redirect ke `accounts.google.com`
   - Isi email + password
   - Klik Next/Continue
9. **Redirect**: Tunggu redirect kembali ke CodeBuddy (`/started`)
10. **Polling Complete**: Tunggu API polling selesai
11. **Done**: Akun berhasil ditambahkan ke 9Router

## 🔍 Troubleshooting

### Error: "Google signup button not found"
- Cek apakah iframe auth sudah load sempurna
- Coba tambah delay di `prepareAuthIframe()`

### Error: "Confirm button not found"
- Normal jika langsung redirect ke Google
- Script akan skip confirm jika sudah di Google host

### Error: "Domain restricted"
- Email domain tidak diizinkan CodeBuddy
- Ganti dengan email domain lain (contoh: Gmail)

### Error: "Polling timeout"
- OAuth flow memakan waktu > 120s
- Cek koneksi internet
- Cek apakah 9Router API response

### Browser tidak muncul
- Ubah `forceHeadless: false` di `runCodebuddyGoogleOAuth()`
- Atau tambahkan `headless: false` di config

## 📁 File Structure

```
src/automations/codebuddy/
├── index.js                      # GitHub OAuth (existing)
├── CodebuddyWorker.js            # Worker untuk GitHub OAuth
└── codebuddy-google-oauth.js     # ✨ NEW: Google OAuth (terpisah)

scripts/
└── codebuddy-google.js           # ✨ NEW: CLI entry point
```

## 🔐 Security Notes

- **JANGAN commit** file `accounts.txt` dengan password asli
- Password di-type langsung ke browser (tidak di-log)
- Session cookie disimpan di 9Router (tidak di local)

## 📊 Output

Console output:
```
═══════════════════════════════════════════
  CodeBuddy Google OAuth Automation
  Mode: batch
  Accounts: 3
═══════════════════════════════════════════

[1/3] Processing: email1@gmail.com
[API] Requesting device code from router...
[API] Device code received: abc123...
Launching browser...
Navigating to: https://codebuddy.ai/oauth/device?code=abc123...
Clicked Google button in frame 'auth' (a#social-google)
Clicked Confirm in frame 'auth': Confirm
Google OAuth page: https://accounts.google.com/...
Starting Google OAuth login...
⚡ Email typed in 45ms
⚡ Password typed in 38ms
Google login completed, waiting for redirect...
On /started, OAuth flow complete!
Waiting for OAuth polling to complete...
[API] Polling successful!
✅ CodeBuddy Google OAuth successful!
✅ Success: email1@gmail.com

[2/3] Processing: email2@gmail.com
...
```

Log file: `logs/<timestamp>.log`

## 🆚 Perbedaan dengan GitHub OAuth

| Aspek | GitHub OAuth | Google OAuth (NEW) |
|-------|-------------|-------------------|
| File | `index.js` | `codebuddy-google-oauth.js` |
| SSO Button | "Sign in with GitHub" | "Sign in with Google" |
| Login Method | GitHub email/password | Google email/password |
| Device OTP | Ya (GitHub device verification) | Tidak |
| Authorize Page | Ya (`button[name=authorize]`) | Tidak (auto redirect) |
| Maintenance Impact | Shared code | **Terpisah, tidak rusak** |

## 🛠️ Development

### Testing

```bash
# Dry run (jangan commit ke 9Router)
node scripts/codebuddy-google.js test@gmail.com TestPass123
```

### Debugging

Tambahkan log di `codebuddy-google-oauth.js`:
```javascript
log(`[DEBUG] Current URL: ${page.url()}`);
log(`[DEBUG] Frames count: ${page.frames().length}`);
```

### Headless Mode

Untuk production (headless):
```javascript
const { browser, page } = await launchBrowser(0, 0, null, {
    conditionalProxy: false,
    forceHeadless: true, // ← Change to true
});
```

## 📝 Changelog

### 2026-08-27
- ✨ Initial release
- ✅ Google OAuth flow complete
- ✅ Iframe click handling
- ✅ Confirm dialog detection
- ✅ CLI dengan batch support

## 🤝 Kontributor

- Aldy Arifyan (@aldyarifyan)

## 📄 License

MIT
