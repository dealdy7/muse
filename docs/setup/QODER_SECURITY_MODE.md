# QODER SECURITY MODE - PERCENTAGE SELECTION

## 🛡️ Keamanan Infrastruktur

Fitur baru **persentase-based selection** khusus untuk Qoder automation, dirancang untuk mengurangi risiko pemblokiran IP dari sisi platform Qoder.

---

## ⚠️ Mengapa Fitur Ini Penting?

### Risiko Pemblokiran/IP Blacklist

Dari sisi platform Qoder, penggunaan temp mail massal dan penyelesaian captcha otomatis memiliki risiko tinggi:

1. **IP Blacklist Detection**
   - Sistem anti-spam modern mendeteksi anomali trafik
   - Penggunaan temp mail dalam jumlah besar = pattern detection
   - IP address rumah/VPS bisa masuk blacklist

2. **Platform-Side Risk Analysis**
   ❌ **Tidak aman untuk jangka panjang:**
   - Traffic anomaly (mass signup patterns)
   - High-volume OTP requests
   - Captcha solving automation
   - Multiple accounts from same source

---

## ✅ Solusi: Percentage-Based Selection

Fitur ini memungkinkan Anda:
- ✅ Memproses hanya sebagian akun dari `accounts.txt`
- ✅ Random selection untuk menghindari pattern detection  
- ✅ Mengurangi footprint IP address
- ✅ Distribusi risiko lebih baik

---

## 🎯 Cara Kerja

### Normal Mode (Risiko Tinggi):
```
accounts.txt: 1000 accounts
↓
Process ALL → Same IP → All at once
↓
HIGH RISK of IP BLACKLIST
```

### Security Mode with Percentage (Aman):
```
accounts.txt: 1000 accounts
↓
Select 10% randomly = 100 accounts only
↓
Distributed over time + Limited footprint
↓
LOWER RISK of detection
```

---

## 🚀 Usage Guide

### From CLI Menu (Recommended)

1. Jalankan Bercocok Tanam:
   ```bash
   node index.js
   ```

2. Pilih "Run Automations"

3. Pilih checkbox **"Qoder Signup (New! Create Qoder accounts with PAT)"**

4. Masukkan jumlah akun (contoh: 50)

5. **PENTING!** Pertanyaan keamanan muncul:
   ```
   Use percentage-based selection from accounts.txt (recommended for bulk to reduce IP blacklist risk)? [Y/n]
   ```

6. Pilih **Y** untuk aktifkan security mode

7. Masukkan persentase (contoh: 10 untuk 10%)

8. System akan menampilkan:
   ```
   🛡️  [SECURITY MODE] Using percentage selection to reduce IP blacklist risk
   Processing 10% of accounts from accounts.txt
   ```

9. Process dimulai secara otomatis

---

### From Command Line (Standalone)

#### Mode 1: Normal (Single Account)
```bash
python scripts/qoder/signup.py --email your_temp@example.com --provider ncaori
```

#### Mode 2: Security Bulk Processing
```bash
python scripts/qoder/signup.py \
    --accounts-file accounts.txt \
    --percentage 10 \
    --proxy http://proxy:port \
    --headless
```

---

## 📊 Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--accounts-file` | string | `accounts.txt` | File containing email:password pairs |
| `--percentage` | float | 0 | Select this % of accounts (1-100) |
| `--account-count` | int | null | Override count prompts |
| `--proxy` | string | null | Proxy for anonymity |
| `--headless` | bool | true | Browser mode |

---

## 🔒 Security Best Practices

### 1. **Percentage Guidelines**

| Scenario | Recommended % | Max Accounts | Reason |
|----------|---------------|--------------|--------|
| Fresh VPS | 5-10% | 50 | Low reputation |
| Residential IP | 10-20% | 100 | Higher trust |
| Dedicated IP | 20-30% | 200 | Established |
| Daily limit | ≤10% | 100 | Avoid spikes |

### 2. **Timing Strategy**

❌ **Don't do this:**
```
1000 accounts in 1 hour = RED FLAG
```

✅ **Do this instead:**
```
Day 1: Process 5% (50 accounts)
Day 2: Process 5% (50 accounts)  
Day 3: Process 5% (50 accounts)
Total: 15% distributed = Safe pattern
```

### 3. **Proxy Rotation**

Use rotating residential proxies:
```bash
--proxy http://user:pass@residential-proxy:8080
```

### 4. **Email Provider Diversity**

Mix providers to avoid pattern:
```json
{
  "providers": ["ncaori", "1secemail", "gmail"],
  "distribution": {
    "ncaori": 50%,
    "1secemail": 30%,
    "gmail": 20%
  }
}
```

---

## 🧪 Example Scenarios

### Scenario A: Large Batch (10,000 accounts)
```bash
# Split into 10 runs of 10% each
# Run every few hours or daily

# Run 1 (Morning):
--percentage 10

# Run 2 (Afternoon):
--percentage 10

# Run 3 (Next day):
--percentage 10
```

### Scenario B: Testing New Environment
```bash
# Start small to test success rate
--percentage 5

# Monitor logs for failures
# Adjust if needed
```

### Scenario C: Production Deployment
```bash
# Residential proxy + steady rate
--percentage 15
--proxy http://residential:proxy
```

---

## 📁 Account File Format

File: `accounts.txt`

Format: `email:password[:extra_fields]`

Example:
```
user1@ncaori.my.id:SecurePass123!
user2@1secemail.com:P@ssw0rd!
user3@gmail.com:MyGmailPassword
```

Lines starting with `#` are ignored as comments:
```
# This is a comment
user4@example.com:Password1
```

---

## 💻 Output Format

File: `qoder_accounts.jsonl`

Each line contains:
```json
{
  "email": "selected_user@example.com",
  "password": "newly_generated_password",
  "pat_token": "pt-abc123...",
  "pat_valid": true,
  "created_at": "2026-08-19T10:30:00Z",
  "selection_mode": "security_percentage",
  "percentage_used": 10
}
```

---

## ⚡ Performance Impact

| Metric | Normal Mode | Security Mode |
|--------|-------------|---------------|
| Accounts/Run | All | Selected % |
| Risk Level | HIGH | LOW-MEDIUM |
| Processing Time | Long | Shorter |
| IP Footprint | Large | Reduced |
| Detection Risk | High | Lower |

---

## 🚨 Failure Handling

If processing fails:

1. **Check Logs:**
   ```bash
   tail -f data/qoder.log
   ```

2. **Adjust Percentage:**
   ```bash
   # Try smaller percentage
   --percentage 5
   ```

3. **Add Delays:**
   ```javascript
   // In config.js
   delays: {
     betweenAccounts: 30000  // 30s delay
   }
   ```

4. **Change Proxy:**
   ```bash
   --proxy http://different_proxy:port
   ```

---

## 🔍 Monitoring & Validation

### 1. Success Rate Check
```bash
# Count successful vs failed
grep '"pat_valid": true' qoder_accounts.jsonl | wc -l
grep '"pat_valid": false' qoder_accounts.jsonl | wc -l
```

### 2. IP Reputation Check
```bash
# Check if your IP is blacklisted
curl https://api.ip2proxy.io/YOUR_IP
```

### 3. Domain Trust Score
```bash
# Verify email domains aren't blocked
node check-email-reputation.js selected_email@example.com
```

---

## 📈 Success Metrics

Track these KPIs:

✅ **Success Rate Target**: ≥70% PAT valid  
✅ **Daily Limit**: ≤10% accounts processed  
✅ **Rate Control**: ≥5 min between batches  
✅ **Error Rate**: ≤30% (if higher, adjust strategy)  

---

## 🎓 Advanced Usage

### Batch Processing Script

Create automation script:
```bash
#!/bin/bash
# safe_batch_process.sh

TOTAL_ACCOUNTS=1000
PERCENTAGE=10
BATCHES=5

for i in $(seq 1 $BATCHES); do
  echo "=== Batch $i/$BATCHES ==="
  
  python scripts/qoder/signup.py \
    --accounts-file accounts.txt \
    --percentage $PERCENTAGE \
    --proxy http://batch$@proxy:8080
  
  echo "Waiting 4 hours before next batch..."
  sleep 14400  # 4 hours
done
```

### Cron Job Automation

Add to crontab for scheduled runs:
```bash
# Every Monday 9 AM
0 9 * * 1 cd /path/to/project && \
  python scripts/qoder/signup.py --percentage 10
```

---

## 🐛 Troubleshooting

### Issue: "High failure rate"
**Solution:** 
- Reduce percentage (try 5%)
- Increase delay between accounts
- Use different proxy pool

### Issue: "IP blocked after processing"
**Solution:**
- Reduce volume per session
- Wait 24-48 hours before retry
- Switch to residential proxy

### Issue: "Same emails appearing"
**Solution:**
- Clear cache/temp files
- Add randomization in selection
- Rotate proxy each run

---

## 📊 Risk Assessment Matrix

| Factor | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| **Percentage** | 5-10% | 15-25% | >30% |
| **Time Gap** | 24+ hours | 4-12 hours | <1 hour |
| **Proxy** | Residential | Datacenter | Shared |
| **Email Providers** | 3+ types | 2 types | Single |
| **Success Rate** | ≥70% | 50-70% | <50% |

**Your Configuration Should Be:**
```
Percentage ≤ 15% + 24h gap + Residential proxy + 3 providers
```

---

## 📚 References

- [Qoder Creator Original](https://github.com/hirotomasato/qoder-creator)
- [Anti-Spam Detection Patterns](https://www.cloudflare.com/learning/security/anti-ddos/what-is-an-anti-bot-system/)
- [IP Reputation Management](https://en.wikipedia.org/wiki/IP_reputation)

---

## ✅ Checklist Before Running

Before executing Qoder automation in production:

- [ ] Read `QODER_SETUP.md` and understand full flow
- [ ] Verified IP not already blacklisted
- [ ] Configured residential proxy (not datacenter)
- [ ] Set percentage ≤ 15% for first run
- [ ] Have email provider diversity ready
- [ ] Plan for 24h gaps between batches
- [ ] Monitoring tools ready (logs, error tracking)
- [ ] Backup strategy for generated PATs

---

**Created**: 2026-08-19  
**Last Updated**: 2026-08-19  
**Version**: 1.0.0 (Security Mode)
