# OpenRouter API Key Integration Guide

## Overview

Fitur OpenRouter Integration memungkinkan Anda untuk secara otomatis menambahkan OpenRouter API Keys ke 9Router dengan menggunakan browser automation. Ini mengotomatisasi proses login dan konfigurasi API key.

## Prerequisites

1. **OpenRouter Account**: Pastikan Anda memiliki akun OpenRouter dan API key yang valid
   - Buat akun di: https://openrouter.ai
   - Dapatkan API key dari dashboard

2. **9Router Instance**: Router lokal harus berjalan di `http://localhost:20128/`
   - Pastikan 9Router sudah dikonfigurasi dan dapat diakses

3. **Account File**: File `accounts.txt` dengan format: `email|password`
   - Akun-akun ini akan digunakan untuk login ke sistem (jika diperlukan)

4. **Browser & Chrome**: Puppeteer akan menggunakan Chrome untuk automation

## Fitur-Fitur

### ✨ Automated API Key Addition
- Membuka UI 9Router dan navigasi ke provider OpenRouter
- Memasukkan API key secara otomatis
- Memverifikasi bahwa key telah ditambahkan ke sistem
- Rename koneksi berdasarkan email akun

### 🔄 Error Handling & Retry
- Automatic retry untuk akun yang gagal
- Comprehensive logging untuk debugging
- Failed accounts disimpan di error account file

### 📊 Progress Tracking
- Real-time progress display
- Success/failure count per worker
- Detailed logging untuk setiap akun

### 🌐 Proxy Support
- Optional proxy pool integration
- Proxy rotation untuk setiap akun

## Usage

### Via CLI Menu

1. **Start aplikasi**:
   ```bash
   npm start
   ```

2. **Pilih "Run Automations"** dari menu utama

3. **Pilih "OpenRouter API Key (Add to 9Router)"** dari checkbox list

4. **Masukkan OpenRouter API Key** saat diminta:
   - Gunakan password input untuk keamanan
   - API key akan di-trim dari whitespace

5. **Pilih proxy setting** jika proxy pool tersedia

6. **Automasi akan berjalan**:
   - Browser akan membuka untuk setiap akun
   - API key akan ditambahkan ke 9Router
   - Koneksi akan di-rename dan diverifikasi

### Configuration

#### Environment Variable

Anda dapat mengset OpenRouter API key via environment variable:
```bash
set OPENROUTER_API_KEY=sk-or-xxx...
```

#### API Key Format

OpenRouter API keys biasanya dimulai dengan:
- `sk-or-` (production keys)
- `sk-free-` (free tier keys)

## How It Works

### Automation Flow

```
1. Launch Browser
   ↓
2. Navigate to 9Router (http://localhost:20128/)
   ↓
3. Click Provider Menu → OpenRouter
   ↓
4. Click "Add" button
   ↓
5. Enter API Key
   ↓
6. Click Save/Confirm button
   ↓
7. Verify connection was added to 9Router API
   ↓
8. Rename connection to email prefix
   ↓
9. Mark account as completed
```

### Browser Automation Details

- **Headless Mode**: false (browser window visible untuk debugging)
- **Timeout**: 30s untuk navigation, 10s untuk element selection
- **Retry Logic**: Cek API hingga 6 kali setiap 5 detik
- **Screenshot on Error**: Error screenshots disimpan sebagai `error_openrouter_*.png`

## File Structure

```
src/automations/openrouter/
├── index.js                 # Main automation entry point
├── OpenRouterWorker.js      # Browser automation logic
```

### Key Files Modified

- `index.js` - Added OpenRouter import and menu option
- `.env` - (Optional) Set OPENROUTER_API_KEY

## Error Handling

### Common Issues

#### 1. "Could not find API Key input field"
- **Cause**: 9Router UI layout mungkin berubah
- **Solution**: Update selector di `OpenRouterWorker.js`

#### 2. "Connection did not appear in 9Router API"
- **Cause**: API key invalid atau timeout saat menunggu konfirmasi
- **Solution**: 
  - Verify API key format
  - Increase timeout di `OpenRouterWorker.js`
  - Check 9Router logs

#### 3. "Browser timeout during navigation"
- **Cause**: Network issue atau 9Router tidak responsif
- **Solution**:
  - Pastikan 9Router berjalan
  - Check internet connection
  - Increase timeout value

### Logging

Logs disimpan di folder `logs/`:
- Timestamp: `YYYY-MM-DDTHH-mm-ss-ZZZZ.log`
- Mencakup: browser actions, API responses, errors
- Format: Plain text dengan timestamps

## Advanced Usage

### Via Code

```javascript
const { runOpenRouterAutomation } = require('./src/automations/openrouter');

// Dengan opsi
const result = await runOpenRouterAutomation(
    sharedProgress,    // Progress manager (optional)
    true,              // Use proxy (optional)
    {
        apiKey: 'sk-or-xxx...',  // API key
    }
);

console.log(`Success: ${result.successCount}, Failed: ${result.failedCount}`);
```

### Proxy Configuration

Jika Anda memiliki proxy pool:

1. Set `PROXY_POOL_FILE` di `.env`:
   ```
   PROXY_POOL_FILE=proxies.txt
   ```

2. Format proxies.txt:
   ```
   127.0.0.1:8080
   https://user:pass@proxy.com:3128
   ```

3. Opsi untuk gunakan proxy saat menjalankan automation

## Troubleshooting

### Enable Debug Logging

Tambahkan ke `OpenRouterWorker.js` untuk verbose logging:
```javascript
log('DEBUG: ' + JSON.stringify(responseData, null, 2));
```

### Check Browser Console

Browser automation akan menampilkan console logs. Pastikan tidak ada error di browser console.

### Verify 9Router API

Test koneksi ke 9Router API:
```bash
curl http://localhost:20128/api/providers
```

## Security Notes

⚠️ **API Key Handling**:
- API key di-input via password field (masked)
- Tidak disimpan di file kecuali di logs
- Logs harus dijaga keamanannya
- Jangan commit `.env` file dengan API key real

## Performance Tips

1. **Parallel Processing**: Automation berjalan per-worker (default: based on config)
2. **Delay Configuration**: Atur delay antar akun di `.env`:
   ```
   DELAY_BETWEEN_ACCOUNTS=2000
   ```

3. **Browser Pool**: Reuse browser instances untuk performa lebih baik

## Support & Debugging

Untuk debugging issues:

1. **Check logs**: `logs/` folder
2. **Check error screenshots**: `error_openrouter_*.png`
3. **Review account file**: `accounts.txt` (accounts still to process)
4. **Check error accounts**: `error_accounts.txt` (failed accounts)

## Related Features

- **9Router**: https://github.com/9Router/9Router
- **OpenRouter**: https://openrouter.ai
- **Other Automations**: Kiro, Cloudflare, Codebuddy, etc.

## Changelog

### Version 1.0.0
- Initial OpenRouter integration
- API key addition automation
- Connection verification & renaming
- Error handling & retry logic
- Proxy support
