# OpenRouter - Best Practices & Usage Guidelines

## 🎯 Recommended Usage Patterns

### ✅ SAFE - Recommended Practices

#### Pattern 1: Run OpenRouter Alone
```
Safest option - complete isolation
accounts.txt (100 accounts)
   ↓
npm start
   ↓
Select: OpenRouter API Key (Add to 9Router)
   ↓
Enter API key
   ↓
✅ Run with no interference from other automations
```

**Pros**:
- Zero interference risk
- Full resource allocation
- Easy to debug
- Clear results

**Use Case**: First-time setup, small account batches

---

#### Pattern 2: Separate Account Files by Provider
```
accounts_openrouter.txt (50 accounts)
accounts_kiro.txt (50 accounts)

// Terminal 1
ACCOUNT_FILE=accounts_openrouter.txt npm start
→ Select OpenRouter

// Terminal 2 (later)
ACCOUNT_FILE=accounts_kiro.txt npm start
→ Select Kiro
```

**Pros**:
- Complete isolation
- Sequential processing
- No resource contention
- Easy account tracking

**Use Case**: Multiple providers, production use

---

#### Pattern 3: Run OpenRouter First, Then Others
```
Day 1: OpenRouter setup
   npm start → Run OpenRouter on all accounts
   ✅ Add API keys to 9Router

Day 2: Other automations
   npm start → Run Kiro
   npm start → Run Cloudflare
   // OpenRouter already done, won't interfere
```

**Pros**:
- Sequential, no parallel issues
- Clear workflow
- Easy recovery if errors

**Use Case**: Setting up providers in order

---

#### Pattern 4: Parallel Execution (Advanced)
```
✅ SAFE IF PROPERLY CONFIGURED

npm start
Select multiple automations:
  ☑ OpenRouter API Key (Add to 9Router)
  ☑ Kiro Automation
  ☑ Cloudflare Automation

// All run in parallel - SAFE because:
// - Different workers, different browser instances
// - Different account chunks
// - Different API endpoints
// - Different logging
```

**Conditions**:
- ✅ Different account sets (no account conflict)
- ✅ Sufficient system resources (RAM, CPU)
- ✅ Browser count configured appropriately
- ✅ Proxy pool available if using proxies

**Pros**:
- Faster overall completion
- Efficient resource usage
- Modern automation approach

**Cons**:
- Needs more system resources
- Harder to debug if issues
- Requires careful monitoring

**Use Case**: Large batch processing, high resource machines

---

### ⚠️ CAUTION - Patterns to Avoid

#### ❌ Pattern 1: Don't Run OpenRouter Multiple Times Simultaneously
```
// BAD
Terminal 1: npm start → Select OpenRouter
Terminal 2: npm start → Select OpenRouter
// RISK: Account queue confusion, duplicate processing

// GOOD
Terminal 1: npm start → Select OpenRouter (on accounts_set1.txt)
Terminal 2 (later): npm start → Select OpenRouter (on accounts_set2.txt)
```

**Why Risky**: Account locking might fail, duplicate API keys added

---

#### ❌ Pattern 2: Don't Mix OpenRouter with 9Router Provider Automations
```
// RISKY - Might be OK but...
Select:
  ☑ Antigravity (9Router)
  ☑ Kimi (9Router)
  ☑ OpenRouter

// Why risky:
// - All 3 access 9Router simultaneously
// - UI rendering might conflict
// - Browser pool pressure

// BETTER
Run 9Router providers first, then OpenRouter separately
```

**Recommendation**: If running 9Router providers, run OpenRouter separately

---

#### ❌ Pattern 3: Don't Run with Insufficient Resources
```
// BAD - System will struggle
- 5GB RAM machine
- Select 20 parallel workers
- OpenRouter + Kiro + Cloudflare
- Browser pool of 10
// RESULT: System crash, browser hangs, timeouts

// GOOD
- 5GB RAM machine
- Select 5 parallel workers max
- Run automations sequentially
- Browser pool of 2-3
```

**How to Check**:
```bash
# Windows
tasklist | findstr "chrome.exe"  # Count Chrome instances

# If > 20 instances: Too many
# If > 10 instances: Getting risky
# If < 5 instances: Safe
```

---

## 🔧 Configuration for Different Scenarios

### Small Machine (2-4GB RAM)

```env
# .env configuration
BROWSER_COUNT=1                    # Single browser
DELAY_BETWEEN_ACCOUNTS=3000       # Longer delay
ROUTER_BROWSER_COUNT=1            # One at a time
PROXY_POOL_FILE=                  # Don't use proxy (less memory)
```

**Strategy**:
1. Run OpenRouter alone first
2. Then run other automations sequentially
3. Monitor memory usage

**Expected Time**: 2-3 minutes per account

---

### Medium Machine (4-8GB RAM)

```env
# .env configuration
BROWSER_COUNT=2                    # Two browsers
DELAY_BETWEEN_ACCOUNTS=2000
ROUTER_BROWSER_COUNT=2
PROXY_POOL_FILE=proxies.txt       # Can use proxy pool
```

**Strategy**:
1. Can run 2 automations in parallel
2. Recommend: OpenRouter + one other
3. Monitoring recommended

**Expected Time**: 1-2 minutes per account

---

### Large Machine (8GB+ RAM)

```env
# .env configuration
BROWSER_COUNT=5-10                 # Multiple browsers
DELAY_BETWEEN_ACCOUNTS=1000
ROUTER_BROWSER_COUNT=5-10
PROXY_POOL_FILE=proxies.txt       # Full proxy pool
```

**Strategy**:
1. Can run all automations in parallel
2. Full resource utilization
3. Heavy monitoring needed

**Expected Time**: 30-60 seconds per account

---

## 📊 Monitoring During Execution

### Key Metrics to Watch

```bash
# 1. Chrome Process Count (should be < 20)
tasklist /FI "IMAGENAME eq chrome.exe" /V
# Count processes
# If > 30: Too many, system will struggle

# 2. Memory Usage (should stay < 80% of total)
Get-Process | Where-Object {$_.Name -like "*chrome*"} | Measure-Object WorkingSet -Sum
# Sum in MB
# If > RAM available: System will crash

# 3. CPU Usage (should be < 80% sustained)
# Task Manager → Performance
# If > 95%: System bottleneck, slow execution

# 4. Disk I/O (logging activity)
# Task Manager → Performance → Disk
# Should be < 30% sustained
```

### Expected Healthy Metrics

```
✅ Healthy Machine Running OpenRouter
─────────────────────────────────────
Chrome Processes: 5-8
Memory Usage: 30-50% of total
CPU Usage: 40-60% sustained
Disk I/O: 5-15%
Log file growth: ~1-2MB per 10 accounts
```

---

## 🚨 Troubleshooting If Issues Occur

### Issue: One Provider Stops Working

**Symptom**: Kiro automation fails, but OpenRouter continues

**Why It Happens**: Provider-specific issue (not OpenRouter fault)

**How to Verify OpenRouter Isolation**:
1. Check `logs/` for OpenRouter logs (should show success/continue)
2. Check `error_accounts.txt` (Kiro errors only)
3. Review `OPENROUTER_ISOLATION_ANALYSIS.md`

**Solution**:
```bash
# Run OpenRouter alone to verify it still works
npm start → Select OpenRouter only
# If OpenRouter works: Provider issue, not OpenRouter
# If OpenRouter fails: May have issue
```

---

### Issue: Browser Hangs or Timeout

**Symptom**: Some accounts timeout, browser doesn't respond

**Why It Happens**: System overloaded, network slow, or 9Router unresponsive

**How to Verify OpenRouter is Isolated**:
1. Kill all Chrome processes
2. Run OpenRouter alone (single worker)
3. If still hangs: 9Router or network issue
4. If works fine: Resource issue (too many parallel)

**Solution**:
```bash
# Reduce parallel load
# Edit .env:
BROWSER_COUNT=1
ROUTER_BROWSER_COUNT=1

# Then run again
npm start → Select OpenRouter
```

---

### Issue: API Key Not Added to 9Router

**Symptom**: Log shows "Connection did not appear in 9Router API"

**Why It Happens**: Invalid API key, 9Router unresponsive, or UI changed

**This is NOT related to other providers**:
- ✅ Other providers unaffected
- ✅ Not caused by interference
- ✅ OpenRouter-specific issue

**Solution**:
```bash
# 1. Verify API key format
# Should be: sk-or-xxxxx

# 2. Verify 9Router is running
curl http://localhost:20128/api/providers

# 3. Check error screenshot
# Look for: error_openrouter_*.png

# 4. Try again with different API key
npm start → Select OpenRouter → Try different key
```

---

### Issue: Out of Memory or System Crash

**Symptom**: Machine becomes very slow, system freezes

**Root Cause**: Too many parallel browsers

**Solution**:
```bash
# 1. Reduce browser count in .env
BROWSER_COUNT=1
ROUTER_BROWSER_COUNT=1

# 2. Restart machine
# 3. Run with lower settings

# OR separate account files:
ACCOUNT_FILE=accounts_batch1.txt npm start  # 20 accounts
ACCOUNT_FILE=accounts_batch2.txt npm start  # 20 accounts
```

---

## ✅ Pre-Flight Checklist

### Before Running OpenRouter

**Setup**:
- ✅ 9Router running at http://localhost:20128/
- ✅ OpenRouter API key obtained
- ✅ accounts.txt prepared with accounts
- ✅ Sufficient disk space (logs)
- ✅ System RAM checked (minimum 2GB free)

**Configuration**:
- ✅ Browser count set appropriately
- ✅ Delay configured for target machine
- ✅ Proxy pool optional but recommended
- ✅ Logging configured (automatic)

**Monitoring**:
- ✅ Task Manager open to monitor
- ✅ Logs folder visible for review
- ✅ Network connectivity tested
- ✅ 9Router API tested (curl)

**First Run**:
- ✅ Small batch first (5 accounts)
- ✅ Monitor completely
- ✅ Review results
- ✅ Then scale up

---

## 📈 Scaling from Small to Large

### Phase 1: Validation (5-10 accounts)
```
1. Run OpenRouter with 5 accounts
2. Monitor entirely (watch browser, logs)
3. Verify all succeeded
4. Review error_accounts.txt (should be empty)
5. Check 9Router has connections
```

**Expected**: 100% success rate

---

### Phase 2: Small Batch (25-50 accounts)
```
1. Prepare 50 accounts
2. Run OpenRouter
3. Monitor periodically (start and end)
4. Review results
5. If >95% success: Continue scaling
```

**Expected**: >95% success rate

---

### Phase 3: Medium Batch (100-250 accounts)
```
1. Split into 2 files if possible
2. Run separately or with caution
3. Monitor resource usage carefully
4. Review comprehensive results
5. If >95% success: Ready for large batches
```

**Expected**: >95% success rate

---

### Phase 4: Large Batch (500+ accounts)
```
1. Split into multiple files (100-200 each)
2. Run sequentially or with advanced users
3. Comprehensive monitoring
4. Automated error handling
5. Batch processing pipeline
```

**Expected**: >95% success rate

---

## 🎓 Best Practices Summary

1. **Isolation First**: Run OpenRouter alone when possible
2. **Resource Aware**: Monitor system resources continuously
3. **Sequential Better**: Running sequentially safer than parallel
4. **Test First**: Small batch before large batch
5. **Monitor Always**: Never leave running unattended
6. **Document**: Keep notes on what works
7. **Separate Files**: Use different account files for safety
8. **Check Results**: Review error_accounts.txt after each run
9. **Retry Failed**: Failed accounts can be retried
10. **Report Issues**: Share logs if problems occur

---

## 📞 Getting Help

If issues occur:

1. **Check isolation analysis**: Read `OPENROUTER_ISOLATION_ANALYSIS.md`
2. **Review logs**: Look in `logs/` folder
3. **Check errors**: Review `error_accounts.txt`
4. **Monitor resources**: Task Manager metrics
5. **Try standalone**: Run OpenRouter alone
6. **If still issues**: Provide logs when reporting

---

**Remember**: OpenRouter is safe and isolated ✅  
**Key**: Proper monitoring and resource management
