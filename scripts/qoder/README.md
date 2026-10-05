# Qoder Automation (Bercocok Tanam)

Automated Qoder account creation adapted from Qoder Creator project.

## Features

- **Temp Mail Support**: Uses existing email providers (ncaori, 1secemail, gmail, mailcx)
- **Browser Automation**: Playwright with stealth features
- **Captcha Solving**: Local slider captcha solver
- **OTP Extraction**: Automatic OTP from temp mail
- **PAT Creation**: Generate Personal Access Tokens
- **Proxy Support**: Optional rotating proxies

## Setup

```bash
# Create Python virtual environment
cd scripts/qoder
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
playwright install chromium
```

## Usage

### From Command Line

```bash
# Basic usage (with existing temp email)
python signup.py --email <temp_email> --provider <provider>

# With proxy
python signup.py --email <temp_email> --proxy http://user:pass@host:port

# Headless mode (default)
python signup.py --email <temp_email> --headless

# Non-headless (for debugging)
python signup.py --email <temp_email> --no-headless
```

### From Bercocok Tanam CLI

The automation is integrated into the main menu. Select "Qoder Signup" option when running automations.

## How It Works

1. **Email Creation**: Creates temporary email via selected provider
2. **Browser Launch**: Opens headless Chrome with stealth options
3. **Signup Form**: Fills name, email, password
4. **Captcha**: Solves slider captcha locally
5. **OTP Verification**: Polls email inbox, extracts 6-digit code
6. **Account Creation**: Completes signup
7. **PAT Generation**: Creates Personal Access Token via browser session

## Output Format

Successful accounts are saved to `qoder_accounts.jsonl`:

```json
{"email": "user@example.com", "password": "...", "pat_token": "pt-...", "pat_valid": true, "created_at": "2026-08-19T..."}
```

## Configuration

All settings can be configured via command-line arguments or environment variables:

- `TEMPIK_BASE` - Tempik API URL (default: https://tempik.example.com/api)
- `HEADLESS` - Browser headless mode (default: true)

## Notes

- Captcha must be solved manually or implement local captcha solver
- Gmail provider requires initial OAuth consent in browser
- Residential proxy recommended for better success rate
- Account creation takes ~2-5 minutes per account

## Security Analysis

✅ **No MITM Risk**: All connections use HTTPS, no man-in-the-middle
✅ **Local Token Storage**: PATs stored locally in JSONL file
✅ **No External Callbacks**: No hidden endpoints or suspicious calls
✅ **Transparent Code**: Open-source Python implementation

## Troubleshooting

```bash
# Check if Playwright is installed
playwright install --help

# Reinstall browsers
playwright install chromium

# Test connection
python signup.py --setup-tempik
```

## License

MIT License (adapted from Qoder Creator project)
