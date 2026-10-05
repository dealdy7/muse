# Setup Python Dependencies untuk GitHub Automation

## Status Check

✅ Python 3.11.16 terdeteksi  
✅ venv exists di `venv/Scripts/python.exe`  
⚠️ Dependencies perlu diinstall

## Required Dependencies

Berdasarkan `scripts/github/signup.py`:

```python
import requests                    # HTTP client
import undetected_chromedriver     # Anti-detection Chrome driver
from selenium.webdriver...        # Part of undetected_chromedriver
```

## Installation Steps

### Option 1: Pakai venv (Recommended)

```bash
# Activate venv
cd "L:\Personal Project\Hernia\bercocok-tanam-main"
venv\Scripts\activate

# Install dependencies
pip install requests undetected-chromedriver

# Verify
python -c "import requests, undetected_chromedriver; print('✅ All OK')"

# Deactivate ketika selesai
deactivate
```

### Option 2: System Python

```bash
cd "L:\Personal Project\Hernia\bercocok-tanam-main"
python -m pip install requests undetected-chromedriver
```

### Option 3: Auto-install via requirements.txt

Buat file `requirements.txt`:
```txt
requests>=2.31.0
undetected-chromedriver>=3.5.0
```

Install:
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

## Verification

Test semua dependencies:

```bash
python -c "import requests; print('✅ requests')"
python -c "import undetected_chromedriver; print('✅ undetected_chromedriver')"
python -m py_compile scripts/github/signup.py && echo "✅ signup.py syntax OK"
```

## Troubleshooting

### Error: `ModuleNotFoundError: No module named 'undetected_chromedriver'`

**Solution:**
```bash
venv\Scripts\activate
pip install undetected-chromedriver
```

### Error: `pip not found`

**Solution:**
```bash
python -m ensurepip --upgrade
python -m pip install --upgrade pip
```

### Error: ChromeDriver version mismatch

`undetected-chromedriver` akan auto-download ChromeDriver yang sesuai dengan Chrome version.

Jika masih error:
```bash
pip install --upgrade undetected-chromedriver
```

## After Installation

Run preflight check:
```bash
node -e "const { checkPythonAvailable } = require('./src/automations/github'); checkPythonAvailable().then(ok => console.log(ok ? '✅ Python ready' : '❌ Python not found'));"
```

Expected output:
```
✅ Python ready
```

Kemudian test automation via:
```bash
npm start
```
