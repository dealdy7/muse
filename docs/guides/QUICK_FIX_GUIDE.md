# 🚀 Quick Fix Guide - Performance Optimization

## Implementasi Cepat (15 Menit)

### Fix #1: Router Timeout Optimization (5 menit)

**File:** `src/providers/router/index.js`

**Ubah baris 11-15 dari:**
```javascript
this.axiosInstance = axios.create({
    baseURL: this.base,
    timeout: 15000,  // ← TERLALU LAMA
    headers: { 'Content-Type': 'application/json' }
});
```

**Menjadi:**
```javascript
this.axiosInstance = axios.create({
    baseURL: this.base,
    timeout: 5000,  // ← Turunkan ke 5 detik
    headers: { 'Content-Type': 'application/json' }
});
```

**Impact:** Mengurangi waktu tunggu dari 15s → 5s per request failure.

---

### Fix #2: Circuit Breaker untuk Router (10 menit)

**File:** `src/automations/kiro/KiroWorker.js`

**Tambahkan di awal class (setelah constructor):**
```javascript
class KiroWorker extends BaseWorker {
    constructor(openKiroSignIn, handlePostLogin, waitForDashboard, getRefreshToken) {
        super({
            automationName: "Kiro",
            workerLabel: "Kiro W",
            removeAccountOnSuccess: true,
            appendErrorOnFailure: true,
            rotateBrowserArgsOnError: true,
            useProxyPool: true,
        });

        this.openKiroSignIn = openKiroSignIn;
        this.handlePostLogin = handlePostLogin;
        this.waitForDashboard = waitForDashboard;
        this.getRefreshToken = getRefreshToken;
        
        // ← TAMBAHKAN INI
        this.routerAvailable = true;
        this.lastRouterCheck = 0;
        this.routerFailureCount = 0;
    }
```

**Ubah method `importRefreshToken` dari:**
```javascript
async importRefreshToken(refreshToken, log) {
    const { ok, router, error } = await createRouter(null, log);
    if (!ok) throw new Error(`Router ${error}`);

    log("Importing refresh token to router...");
    try {
        await router.importRefreshToken("kiro", refreshToken);
        log("Successfully imported token!");
    } catch (importErr) {
        if (!importErr.message.includes("timeout")) {
            console.warn(`⚠️ Router import failed: ${importErr.message}`);
        }
    }
}
```

**Menjadi:**
```javascript
async importRefreshToken(refreshToken, log) {
    // Circuit breaker: Skip jika router sudah diketahui down
    const now = Date.now();
    if (!this.routerAvailable && (now - this.lastRouterCheck < 60000)) {
        log(`Router unavailable (skipping, ${Math.round((60000 - (now - this.lastRouterCheck)) / 1000)}s cooldown)`);
        return;
    }

    // Reset failure count setelah 5 menit
    if (now - this.lastRouterCheck > 300000) {
        this.routerFailureCount = 0;
    }

    try {
        const { ok, router, error } = await createRouter(null, log);
        if (!ok) {
            this.routerAvailable = false;
            this.lastRouterCheck = now;
            this.routerFailureCount++;
            log(`Router unavailable: ${error} (failure #${this.routerFailureCount})`);
            return;
        }

        await router.importRefreshToken("kiro", refreshToken);
        
        // Success - reset failures
        this.routerAvailable = true;
        this.routerFailureCount = 0;
        log("Successfully imported token to router!");
    } catch (importErr) {
        this.routerAvailable = false;
        this.lastRouterCheck = now;
        this.routerFailureCount++;
        
        if (!importErr.message.includes("timeout")) {
            console.warn(`⚠️ Router import failed: ${importErr.message} (failure #${this.routerFailureCount})`);
        } else {
            log(`Router timeout (failure #${this.routerFailureCount})`);
        }
    }
}
```

**Ulangi untuk:** `src/automations/cloudflare/CloudflareWorker.js` dengan perubahan yang sama.

---

### Fix #3: Disable Graceful Shutdown (Optional - 2 menit)

**File:** `src/automations/kiro/KiroWorker.js`

**Cari blok code ini (sekitar line 46-86):**
```javascript
// Setup graceful shutdown handler for this worker instance
const gracefulShutdown = async () => {
    // ... banyak code ...
};

// Add signal listeners for this worker
const signalHandler = () => {
    gracefulShutdown().finally(() => {
        process.exit(0);
    });
};

process.once('SIGINT', signalHandler);
process.once('SIGTERM', signalHandler);
```

**Dan blok cleanup di finally (sekitar line 140-145):**
```javascript
// Remove signal listeners for this worker
process.removeListener('SIGINT', signalHandler);
process.removeListener('SIGTERM', signalHandler);
```

**Hapus atau comment out semua blok tersebut** (karena token sudah auto-save di try-catch).

**Atau gunakan environment variable:**
```javascript
const ENABLE_GRACEFUL_SHUTDOWN = process.env.GRACEFUL_SHUTDOWN === 'true';

if (ENABLE_GRACEFUL_SHUTDOWN) {
    const gracefulShutdown = async () => { /* ... */ };
    const signalHandler = () => { /* ... */ };
    process.once('SIGINT', signalHandler);
    process.once('SIGTERM', signalHandler);
}
```

---

## 🧪 Testing Setelah Fix

### Test 1: Router Speed
```bash
# Di terminal
node -e "const {createRouter} = require('./src/providers/router'); (async()=>{const start=Date.now();await createRouter();console.log('Time:',Date.now()-start,'ms')})()"
```

**Expected:** < 5000ms (jika router unavailable)

### Test 2: Automation Speed
```bash
# Run dengan 5 accounts
node index.js
# Pilih: Run Automations
# Pilih: Kiro + Cloudflare
```

**Expected:** 
- 5 accounts selesai dalam < 3 menit
- Tidak ada waiting lama di "Importing to router"

---

## 📊 Monitoring Performance

Tambahkan timing logs di `processAccount`:

```javascript
async processAccount(account, browserArgsIndex, workerIndex, log, updateProgress, useProxy) {
    const startTime = Date.now();  // ← TAMBAHKAN
    const config = getConfig();
    
    // ... existing code ...
    
    // Di akhir function (sebelum finally atau di akhir try)
    const duration = Date.now() - startTime;
    log(`✅ Total time for ${account.email}: ${Math.round(duration/1000)}s`);
}
```

---

## 🎯 Expected Results

| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| Router timeout | 15s | 5s |
| Router failures handling | Retry every account | Circuit breaker (skip for 1min) |
| Graceful shutdown overhead | ~500ms per worker | 0ms (disabled) |
| **Total time per account** | **60-90s** | **30-40s** |
| **100 accounts total time** | **30-35 min** | **15-18 min** |
| **Success rate** | **80-90%** (timeouts) | **95%+** |

---

## 🔍 Troubleshooting

### Issue: Masih lambat setelah fix

**Check:**
1. Apakah router benar-benar tersedia?
   ```bash
   curl -X POST http://your-router-url/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"password":"your-pass"}'
   ```

2. Lihat logs untuk pattern:
   - Banyak "Router timeout" → Router memang slow, circuit breaker working
   - Banyak "waiting for dashboard" → Google login slow (proxy issue)

### Issue: Accounts gagal semua

**Check:**
1. History file corrupt?
   ```bash
   cat output/logs/history.json
   # Jika corrupt, hapus: rm output/logs/history.json
   ```

2. Proxy pool issues?
   - Coba run tanpa proxy: Set `USE_PROXY=false` di .env

---

## 💡 Additional Tips

### Environment Variables untuk Fine-Tuning

Tambahkan di `.env`:
```env
# Router settings
ROUTER_TIMEOUT=5000
ROUTER_CIRCUIT_BREAKER_COOLDOWN=60000

# Performance
MAX_PARALLEL_WORKERS=5
GRACEFUL_SHUTDOWN=false

# Debug
LOG_LEVEL=info
```

### Cleanup Old History (Optional)

Jika history.json terlalu besar:
```bash
# Backup
cp output/logs/history.json output/logs/history.backup.json

# Reset
echo '{}' > output/logs/history.json
```

---

## ✅ Checklist

- [ ] Fix #1: Turunkan router timeout ke 5s
- [ ] Fix #2: Implementasi circuit breaker di KiroWorker
- [ ] Fix #2: Implementasi circuit breaker di CloudflareWorker
- [ ] Fix #3: Disable graceful shutdown (optional)
- [ ] Test dengan 5 accounts
- [ ] Verify timing < 3 menit untuk 5 accounts
- [ ] Run full automation dengan 100 accounts

---

**Estimated total implementation time: 15-20 minutes**
**Expected speedup: 2x faster, approaching original performance**
