# QODER AUTOMATION - TROUBLESHOOTING & FIXES

## 🐛 Issue: "Immediately Failed" (0 success 1 failed)

### Problem Identified

When running Qoder automation with normal mode (non-percentage), it was failing immediately without showing useful error messages.

---

## ✅ Fixes Applied

### 1. **Better Error Validation**

```python
# Before: Silent failure
if not args.email:
    sys.exit(1)

# After: Clear error message
if not args.email and args.percentage <= 0:
    print("\n[ERROR] Please provide either --email OR use --percentage")
    print("Usage examples:")
    print("  python signup.py --email test@example.com")
    print("  python signup.py --accounts-file accounts.txt --percentage 10")
    sys.exit(1)
```

### 2. **Enhanced Python Logging**

Added visual indicators for better debugging:

```python
print(f"\n🚀 [INIT] Starting Qoder account creation")
print(f"📧 [EMAIL] {args.email}")
print(f"🔐 [PASSWORD] {password}")
print(f"🌐 [PROVIDER] {args.provider}")
print(f"👁️  [BROWSER] {'Headless' if args.headless else 'Visible'}")
```

### 3. **Improved Error Handling**

Now catches and displays ALL exceptions with stack trace:

```python
except Exception as e:
    print(f"\n[ERROR] Unexpected error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
```

### 4. **Node.js Enhanced Logging**

```javascript
python.on('error', (error) => {
    console.log(`\n❌ [PYTHON ERROR] Spawn failed: ${error.message}`);
    reject(new Error(...));
});

python.on('close', (code) => {
    if (code !== 0) {
        console.log(`\n❌ [PYTHON EXITED] Code: ${code}`);
        if (errorOutput.trim()) {
            console.log(`\nSTDERR Output:`);
            console.log(errorOutput);
        }
        reject(new Error(...));
    }
});
```

---

## 🔍 How to Debug Now

### Test 1: Verify Python Installation

```bash
# Check Python version
python --version

# Check if virtual env is set up
cd scripts/qoder
python venv/Scripts/python.exe --version
```

### Test 2: Manual Run with Verbose Output

```bash
# Run directly from command line
cd scripts/qoder
python signup.py --email test@ncaori.my.id --provider ncaori --no-headless
```

**Expected Output:**

```
🚀 [INIT] Starting Qoder account creation
📧 [EMAIL] test@ncaori.my.id
🔐 [PASSWORD] GeneratedP@ss123!
🌐 [PROVIDER] ncaori
👁️  [BROWSER] Visible
==================================================

[INFO] Launching browser...
[INFO] Opening Qoder signup page...
[INFO] Filling signup form...
[WARNING] Captcha detected - please solve manually!
```

### Test 3: Check Node.js Logs

When running from main CLI:

```bash
node index.js
→ Select Qoder Signup
→ Use percentage? No
→ Watch for:
   ❌ [PYTHON ERROR] Spawn failed: ...
   ❌ [PYTHON EXITED] Code: 1
   STDERR Output: [actual error messages]
```

---

## 📊 Common Errors & Solutions

### Error: "Spawn failed"

**Cause**: Python executable not found or permissions issue

**Solution**:
```bash
# Check if python exists
which python
# or on Windows
where python

# Use full path
python scripts/qoder/signup.py --email test@example.com
```

### Error: "Playwright not installed"

**Cause**: Missing Playwright dependency

**Solution**:
```bash
cd scripts/qoder
pip install playwright
playwright install chromium
```

### Error: "No module named 'playwright'"

**Cause**: Wrong Python environment

**Solution**:
```bash
# Activate virtual environment first
cd scripts/qoder
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

pip install -r requirements.txt
playwright install chromium
```

### Error: "Chrome not found"

**Cause**: Chrome binary path incorrect

**Solution**: 
```bash
# Check Chrome location
which google-chrome  # Linux/macOS
where chrome  # Windows

# Update config to use correct path
# Edit src/config.js or .env
CHROME_BINARY=/path/to/chrome
```

### Error: "Captcha could not be solved"

**Cause**: Captcha requires manual solving

**Solution**:
- Use `--no-headless` to see browser
- Solve captcha manually in popup window
- Or implement local captcha solver

---

## 🧪 Step-by-Step Testing Guide

### Phase 1: Environment Check

```bash
# 1. Check Python
python --version
# Should show: Python 3.11+

# 2. Check Playwright
python -c "import playwright; print('OK')"
# Should print: OK

# 3. Check Chromium
playwright install chromium
# Should download successfully
```

### Phase 2: Single Account Test

```bash
cd scripts/qoder

# Test with visible browser first
python signup.py \
    --email test@ncaori.my.id \
    --provider ncaori \
    --no-headless

# Observe:
# - Browser opens correctly
# - Navigates to Qoder signup
# - Forms fill automatically
# - Can solve captcha manually
# - OTP received and entered
# - PAT created
```

### Phase 3: Automation Test

```bash
# From root directory
node index.js

# Select Qoder Signup → Use percentage? No
# Watch logs for:
✅ SUCCESS pattern
❌ FAILURE pattern with details
```

---

## 💡 Success Indicators

You should see:

```
🚀 [INIT] Starting Qoder account creation
📧 [EMAIL] test@example.com
🔐 [PASSWORD] Generated...
==================================================

[INFO] Email: test@example.com
[INFO] Password: Generated...

[SUCCESS] Account created successfully!
==================================================
Email: test@example.com
Password: Generated...
PAT Token: pt-abc123def456...
Status: Valid
URL: https://qoder.com/dashboard
==================================================

Saved to: qoder_accounts.jsonl

✅ [COMPLETED] Processed 1 accounts (100%) safely
📊 Output saved to: qoder_accounts.jsonl
```

---

## 🎯 Next Steps After Fix

1. **Verify Error Messages**: When failure occurs, you should now see detailed stderr output

2. **Check Browser Console**: If using `--no-headless`, watch browser dev tools for JS errors

3. **Review Log Files**:
   ```bash
   tail -f data/qoder.log
   ```

4. **Test with Different Providers**:
   ```bash
   python signup.py --email test@1secemail.com --provider 1secemail
   python signup.py --email test@gmail.com --provider gmail
   ```

5. **Enable Proxy**:
   ```bash
   python signup.py --email test@example.com --proxy http://user:pass@host:port
   ```

---

## 📞 Still Not Working?

If you still see failures after these fixes:

1. **Run in verbose mode**:
   ```bash
   python signup.py --email test@example.com --no-headless 2>&1 | tee debug.log
   ```

2. **Share the complete log**:
   - Full stdout output
   - All stderr messages
   - Any popup dialogs
   - Browser screenshots (if using --no-headless)

3. **Check system requirements**:
   - OS: Windows 10+ / macOS / Linux
   - RAM: ≥4GB
   - Chrome: Latest version
   - Python: 3.11+

---

## ✨ What Changed

| Before | After |
|--------|-------|
| Silent failures | Detailed error messages |
| Exit code 1 | Exit code + stderr details |
| No validation | Input validation at startup |
| Plain text output | Visual indicators (icons) |
| Generic error | Specific error types |

---

**Created**: 2026-08-19  
**Fixed**: Enhanced error handling & logging  
**Ready for**: Debugging & production testing
