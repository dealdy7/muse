# FreeBuff Auto Login

Automation untuk menambahkan Google accounts ke FreeBuff proxy secara otomatis.

## Persyaratan

1. **FreeBuff proxy harus running** di `http://127.0.0.1:3457`
2. **Password admin**: `Aldyarif12`
3. **File accounts.txt** berisi Google accounts (format: `email|password`)

## Cara Menggunakan

### 1. Jalankan FreeBuff Proxy

Pastikan FreeBuff proxy sudah running di port 3457:

```bash
# Jalankan FreeBuff proxy terlebih dahulu
freebuff-proxy
# atau sesuai cara menjalankan FreeBuff proxy kamu
```

### 2. Siapkan File Accounts

Edit file `accounts.txt` dengan format:

```
email1@sendang.space|Password123
email2@sendang.space|Password456
email3@sendang.space|Password789
```

### 3. Jalankan Automation

```bash
npm start
```

Pilih menu:
1. **Run Automations**
2. Centang **FreeBuff Auto Login (Add accounts to local FreeBuff proxy)**
3. Tekan Enter

## Alur Kerja Automation

1. **Buka FreeBuff admin page** (`http://127.0.0.1:3457/admin#tokens`)
2. **Input password** admin (`Aldyarif12`) + Tab
3. **Navigasi ke tab Tokens**
4. **Klik tombol "Open in New Tab"** (tombol hijau untuk device login)
5. **Google login popup** akan muncul
6. **Login otomatis** dengan email & password dari `accounts.txt`
7. **Verifikasi** token berhasil ditambahkan
8. **Selesai** - account ditambahkan ke FreeBuff

## Troubleshooting

### FreeBuff tidak running
```
Error: Device Login button tidak ditemukan
```
**Solusi**: Pastikan FreeBuff proxy sudah running di `http://127.0.0.1:3457`

### Password salah
```
Error: Token verification failed
```
**Solusi**: Cek password di `accounts.txt` sudah benar

### Google login gagal
```
Error: Google login popup tidak muncul
```
**Solusi**: 
- Pastikan internet stabil
- Cek apakah Google memblokir login (2FA, captcha, dll)
- Gunakan account yang sudah verify

## Catatan

- **Sequential processing**: Accounts diproses satu per satu untuk menghindari rate limit
- **Browser visible**: Browser akan muncul (tidak headless) untuk memudahkan debugging
- **No proxy**: Automation ini tidak menggunakan proxy pool
- **Auto cleanup**: Browser akan ditutup otomatis setelah selesai

## File Terkait

- `src/automations/freebuff/index.js` - Entry point
- `src/automations/freebuff/FreebuffWorker.js` - Worker logic
- `src/providers/google/login.js` - Google login helper
- `accounts.txt` - Account list (format: email|password)

## Contoh Output

```
🎯 FreeBuff Auto Login - Processing 3 account(s)

FreeBuff W1 | Processing account: email1@sendang.space
FreeBuff W1 | Step 1: Membuka FreeBuff admin page...
FreeBuff W1 | Step 2: Memasukkan password admin...
FreeBuff W1 | ✅ Password entered and Tab pressed
FreeBuff W1 | Step 4: Memastikan di tab Tokens...
FreeBuff W1 | Step 5: Mencari tombol untuk login device...
FreeBuff W1 | Found button with selector: button::-p-text(Open in New Tab)
FreeBuff W1 | Step 6: Klik Device Login button...
FreeBuff W1 | Step 7: Menunggu Google login popup/tab...
FreeBuff W1 | ✅ Google login page opened
FreeBuff W1 | Step 8: Login Google dengan email1@sendang.space...
FreeBuff W1 | 🚀 OPTIMIZED Google login starting (v2 - fast typing)
FreeBuff W1 | ⚡ Email typed in 45ms
FreeBuff W1 | ⚡ Password typed in 38ms
FreeBuff W1 | Step 9: Menunggu OAuth callback...
FreeBuff W1 | ✅ Kembali ke FreeBuff admin page
FreeBuff W1 | ✅ Success indicator found: ACTIVE
FreeBuff W1 | ✅ Account email1@sendang.space berhasil ditambahkan ke FreeBuff

═══════════════════════════════════════════════════════════════════════
Automation Complete

  FreeBuff Auto Login: 3 success 0 failed

  Duration: 2m 15s
═══════════════════════════════════════════════════════════════════════
```
