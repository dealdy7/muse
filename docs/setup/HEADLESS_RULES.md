# Aturan Tampilan Browser (Headless Rules)

**PERINGATAN PENTING**: File ini adalah aturan mutlak mengenai jalannya otomatisasi browser di *project* `bercocok-tanam`.

## 1. Wajib Tampil (Headless: FALSE)
Hanya *automation* berikut yang **WAJIB** membuka tab/jendela browser secara kasat mata:
- **Kimi Automation (via 9Router)**
- **Antigravity Automation (via 9Router)**
- **Gemini CLI Automation (via 9Router)**

*Alasan*: 9Router membutuhkan interaksi UI tertentu atau rentan terhadap deteksi bot jika dijalankan murni di *background*. Semua pekerjaan `RouterWorker` (termasuk verifikasi API dan *rename*) dirancang untuk berjalan secara visual.

## 2. Wajib Latar Belakang (Headless: TRUE)
Semua *automation* lainnya harus berjalan **di balik layar (background / invisible)** agar tidak mengganggu aktivitas pengguna di layar komputer:
- **Kiro Automation**
- **Cloudflare Automation**
- **TokenGo Automation**
- **LivRouter Automation**
- **Codebuddy Automation**
- **Grok Signup**
- **GitHub Signup**

*Catatan untuk AI/Developer*: 
Jangan pernah menggunakan konfigurasi global `config.headless` secara buta untuk Kiro dan Cloudflare jika itu membuat browser terbuka. Selalu pastikan parameter `forceHeadless: true` disisipkan saat memanggil `launchBrowser()` untuk pekerjaan selain 9Router.
