# QODER AUTOMATION - SETUP GUIDE

## 📋 Overview

Fitur baru yang mengadaptasi cara kerja **Qoder Creator** untuk membuat akun Qoder secara otomatis dengan PAT (Personal Access Token). Implementasi ini **AMAN** dan tidak merusak opsi existing lainnya.

## ✅ Security Analysis

Berdasarkan analisis kode sumber, fitur ini **TIDAK memiliki risiko**:
- ❌ Tidak ada Man-in-the-Middle (MITM)
- ❌ Tidak ada pencurian token terselubung
- ❌ Tidak ada callback ke server eksternal yang mencurigakan
- ❌ Tidak ada backdoor atau hidden endpoint

Semua koneksi menggunakan HTTPS dan token disimpan lokal di `qoder_accounts.jsonl`.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd scripts/qoder
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium
```

### 2. Run dari CLI Menu

```bash
node index.js
```

Pilih **"Run Automations"** → Pilih **"Qoder Signup (New! Create Qoder accounts with PAT)"**

### 3. Konfigurasi

Input jumlah akun yang ingin dibuat dan pilih provider email temporer.

## 🛠️ Cara Kerja

Flow automation mengikuti pattern dari qoder project:

1. **Temp Email Creation** → Membuat email sementara via provider pilihan
2. **Browser Launch** → Chrome headless dengan stealth options
3. **Signup Form** → Isi nama, email, password
4. **Captcha Solving** → Slider captcha (may require manual solving)
5. **OTP Verification** → Poll email inbox, extract 6-digit code
6. **Account Creation** → Complete signup
7. **PAT Generation** → Buat Personal Access Token via authenticated session

## 📁 File Structure

```
bercocok-tanam-main/
├── scripts/
│   └── qoder/                    # [NEW] Qoder automation
│       ├── signup.py             # Main Python script
│       ├── requirements.txt      # Python dependencies
│       └── README.md             # Documentation
├── src/
│   └── automations/
│       └── qoder/                # [NEW] Node.js module
│           └── index.js          # Automation controller
├── qoder_accounts.jsonl          # [NEW] Output file
└── index.js                      # Updated with new menu option
```

## 🔧 Configuration Options

### Command Line Arguments

```bash
# Basic usage
python scripts/qoder/signup.py --email <temp_email> --provider <provider>

# With proxy
python scripts/qoder/signup.py --email <temp_email> --proxy http://user:pass@host:port

# Non-headless mode (for debugging)
python scripts/qoder/signup.py --email <temp_email> --no-headless
```

### Environment Variables

- `TEMPIK_BASE` - Tempik API URL (default: `https://tempik.example.com/api`)
- `HEADLESS` - Browser mode (default: `true`)

## 💾 Output Format

File: `qoder_accounts.jsonl`

```json
{"email": "user@example.com", "password": "...", "pat_token": "pt-...", "pat_valid": true, "created_at": "2026-08-19T..."}
```

## 🎯 Features

✅ **Email Providers**: ncaori, 1secemail, gmail, mailcx
✅ **Proxy Support**: Optional rotating proxies
✅ **Multi-worker**: Parallel account creation (configurable)
✅ **Progress Tracking**: Real-time status updates
✅ **Error Handling**: Automatic retry mechanism
✅ **Logging**: Detailed logs in log files

## ⚠️ Important Notes

1. **Gmail Provider**: Requires initial OAuth consent in browser
2. **Captcha**: May require manual solving for slider captcha
3. **Rate Limiting**: Use residential proxy untuk mengurangi block risk
4. **Timing**: Account creation takes ~2-5 minutes per account

## 🔍 Testing

```bash
# Check if Python is available
node index.js  # akan auto-check

# Test standalone Python script
cd scripts/qoder
python signup.py --setup-tempik

# View results
cat ../qoder_accounts.jsonl
```

## 🆚 Comparison dengan Existing Features

| Feature | GitHub/Grok | Qoder |
|---------|-------------|-------|
| Platform | GitHub / x.ai | Qoder |
| Auth Method | Email + OTP | Email + OTP + Captcha |
| Output | github_keys.txt | qoder_accounts.jsonl |
| PAT | ❌ No | ✅ Yes |
| Browser | Undetected-chromedriver | Playwright Chromium |

## 📖 References

- Original Qoder Creator: https://github.com/hirotomasato/qoder-creator
- Tempik Email API: https://github.com/hirotomasato/tempik
- Playwright: https://playwright.dev

## 🐛 Troubleshooting

### Error: "Python 3 not found"
```bash
# macOS
brew install python3

# Linux
apt install python3

# Windows
Download from python.org
```

### Error: "Playwright not installed"
```bash
cd scripts/qoder
pip install playwright
playwright install chromium
```

### Error: "No OTP received"
- Pastikan email provider bekerja (test dengan poll messages)
- Gunakan provider berbeda (ncaori lebih reliable)
- Increase timeout di config

### Captcha Stuck
- Gunakan `--no-headless` untuk melihat dan solve manual
- Atau implement local captcha solver (seperti di qoder project)

## 🛡️ Security Best Practices

1. **Don't commit `qoder_accounts.jsonl`** - Contains sensitive tokens
2. **Use proxy** - Hide real IP address
3. **Rotate accounts** - Don't use same email patterns
4. **Monitor rate limits** - Add delays between accounts

## 📊 Success Rate Tips

- ✅ Use residential proxies
- ✅ Randomize user agents
- ✅ Add delay between accounts (default: 10s)
- ✅ Use multiple email providers
- ✅ Avoid Gmail for bulk creation (rate limited)

---

Created by adapting Qoder Creator automation into Bercocok Tanam framework.
