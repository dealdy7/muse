# OpenCode Task: Audit dan Repair GitHub → CodeBuddy Pipeline

## Context
Repository: `fzrilsh/bercocok-tanam`
Environment: Windows 11, Node.js v24.18.0, Python 3.11.16

## Problem Statement
User melaporkan error saat menjalankan:
```
Run Automations → Codebuddy Automation → Create GitHub account then immediately login Codebuddy
```

Error:
```
Cannot find module '../../github-signup-python'
```

## Audit yang Sudah Dilakukan
1. ✅ `src/automations/codebuddy/index.js` line 1145 SUDAH BENAR:
   ```javascript
   const { createGitHubAccountViaPython } = require("../github");
   ```

2. ✅ Module `src/automations/github/index.js` EXISTS dan mengexport `createGitHubAccountViaPython`

3. ❌ TIDAK ADA file `github-signup-python.js` di codebase

4. ⚠️ Kemungkinan issue:
   - Module cache Node.js
   - Import path lain yang salah
   - File yang sudah dihapus tapi masih di-require di tempat lain

## Tasks untuk OpenCode

### Task 1: Deep Module Analysis
1. Cari SEMUA referensi ke `github-signup-python` di seluruh codebase:
   - grep/search untuk string `github-signup-python`
   - check semua require/import statements
   - check package.json scripts

2. Verify semua import path di `src/automations/codebuddy/`:
   - `index.js`
   - `CodebuddyWorker.js` (jika ada)
   - semua file terkait

3. Cross-check dengan entry point di `index.js` (root):
   - Line 8: `require("./src/automations/codebuddy")`
   - Pastikan module resolution chain benar

### Task 2: Python Environment Audit
1. Check `src/automations/github/index.js`:
   - Function `getPythonPath()` line 18-24
   - Apakah path Python sudah benar untuk Windows?
   - Current logic:
     ```javascript
     const winPath = path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe');
     const unixPath = path.join(PROJECT_ROOT, 'venv', 'bin', 'python3');
     if (fs.existsSync(winPath)) return winPath;
     if (fs.existsSync(unixPath)) return unixPath;
     return 'python'; // fallback
     ```

2. Verify Python script exists:
   - `scripts/github/signup.py` should exist
   - Check if all Python imports in signup.py are available

3. Check Python dependencies match README requirements

### Task 3: Chrome Path Audit
1. Check `src/automations/github/index.js` line 97-99:
   ```javascript
   const chromeBinary = config.chromeExecutablePath || 
                      '/Volumes/StorageTeamGroup/Browser/Google Chrome.app/Contents/MacOS/Google Chrome';
   ```
   ❌ HARD-CODED macOS path sebagai fallback!

2. Create proper Windows fallback:
   - `C:/Program Files/Google/Chrome/Application/chrome.exe`
   - `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`
   - Environment variable `CHROME_EXECUTABLE_PATH`

### Task 4: Dependency Audit
1. Read `scripts/github/signup.py` lines 1-100
2. List semua import yang digunakan
3. Compare dengan README.md requirements
4. Jika ada mismatch, update README atau add proper error handling

### Task 5: Create Preflight Check Function (Optional but Recommended)
Add function `checkCodebuddyPipelineReadiness()` yang verify:
- [ ] Node.js version
- [ ] Python available
- [ ] Python dependencies installed (playwright, requests, undetected_chromedriver)
- [ ] signup.py exists
- [ ] Chrome/Chromium found
- [ ] 9Router connectivity
- [ ] GitHub accounts available (for existing mode)

Return detailed report dengan actionable error messages.

### Task 6: Sanitize Logging
Audit logging untuk memastikan TIDAK log:
- password (account.password)
- OAuth tokens
- API keys
- cookies
- CSRF tokens
- proxy credentials (hanya log IP, bukan user:pass)

Search untuk patterns:
- `log(.*password`
- `log(.*token`
- `log(.*cookie`
- `console.log(.*password`

### Task 7: Integration Test Preparation
Buat dokumentasi untuk integration test:
1. Syntax check: `node -c src/automations/codebuddy/index.js`
2. Python syntax: `python -m py_compile scripts/github/signup.py`
3. Module resolution: `node -e "require('./src/automations/codebuddy')"`
4. Python import test: `python -c "import playwright; import requests; import undetected_chromedriver"`
5. Chrome detection test
6. 9Router ping test

## Success Criteria
1. ✅ Semua referensi `github-signup-python` ditemukan dan diperbaiki ATAU dikonfirmasi tidak ada
2. ✅ Module resolution chain verified benar
3. ✅ Python path resolver support Windows properly
4. ✅ Chrome path fallback support Windows
5. ✅ Python dependencies documented accurately
6. ✅ No secrets in logs
7. ✅ Dokumentasi test steps dibuat
8. ✅ Root cause analysis report

## Constraints
- JANGAN ubah logic bisnis
- JANGAN refactor besar-besaran
- JANGAN tambah feature baru
- JANGAN bypass security (CAPTCHA, rate limiting)
- MINIMAL CHANGE principle
- Focus on FIXING EXISTING CODE

## Output Expected
1. Root cause analysis report
2. List file yang diubah dengan penjelasan
3. Git diff summary
4. Test steps untuk verify fix
5. Error/warning yang masih mungkin muncul dan cara handlenya

## Additional Context
- Repository ini adalah automation tool untuk harvesting tokens
- User pakai bahasa Indonesia untuk explanation
- Kode dan variable names tetap English
- User environment: Windows 11, Git Bash (MSYS)
