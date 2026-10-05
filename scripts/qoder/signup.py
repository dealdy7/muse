"""
Qoder Creator - Automated Qoder Account Creation (Adapted for Bercocok Tanam)

Flow: Temp mail -> Signup -> Captcha -> OTP -> PAT

Usage:
    python scripts/qoder/signup.py --email <temp_email> --provider <provider_type>
    
Options:
    --email       Temporary email address
    --provider    Email provider: ncaori, 1secemail, gmail, mailcx, auto
    --proxy       HTTP proxy URL (optional)
    --headless    Run browser in headless mode (default: true)
    --chrome-binary    Path to Chrome/Chromium binary
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from urllib import parse
from urllib.request import Request, urlopen
import subprocess
import platform

# Force UTF-8 on Windows to avoid UnicodeEncodeError with Rich
if platform.system() == "Windows":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")


class TempikClient:
    """Tempik disposable email API client (self-hostable)."""

    def __init__(self, base_url: str = None):
        self.base_url = (base_url or os.getenv("TEMPIK_BASE", 
                    "https://tempik.example.com/api")).rstrip("/")
        self.session_id = None
        self._email = None
        self._domains = []

        # Browser-like User-Agent to bypass Cloudflare
        self._browser_ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/132.0.0.0 Safari/537.36"
        )

    def _fetch_domains(self):
        """Fetch available domains from /api/config."""
        if self._domains:
            return self._domains
        
        try:
            url = f"{self.base_url}/config"
            req = Request(url, method="GET")
            req.add_header("Accept", "application/json")
            req.add_header("User-Agent", self._browser_ua)
            
            with urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                
            self._domains = data.get("mailDomains", [data.get("mailDomain", "exse7en.fr")])
            print(f"[INFO] Tempik domains: {self._domains}")
        except Exception as e:
            print(f"[WARNING] Tempik domain fetch failed: {e}, using default")
            self._domains = ["exse7en.fr"]
        
        return self._domains

    def init_session(self) -> str:
        """Create a new session. Returns sessionId."""
        if self.session_id:
            return self.session_id

        url = f"{self.base_url}/session"
        req = Request(url, method="GET")
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", self._browser_ua)
        req.add_header("Accept-Language", "en-US,en;q=0.9")

        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        self.session_id = data.get("sessionId") or data.get("id") or data.get("session_id")
        print(f"[INFO] Tempik session: {self.session_id[:8]}...")
        return self.session_id

    def create_inbox(self, local_part: str = None, domain: str = None) -> str:
        """Create a new inbox. Returns email address."""
        self.init_session()

        if not domain:
            import random
            domains = self._fetch_domains()
            domain = random.choice(domains)

        url = f"{self.base_url}/inboxes"
        body_data = {"domain": domain}
        if local_part:
            body_data["localPart"] = local_part
            
        body = json.dumps(body_data).encode()
        req = Request(url, data=body, method="POST")
        req.add_header("Accept", "application/json")
        req.add_header("Content-Type", "application/json")
        req.add_header("x-session-id", self.session_id)
        req.add_header("User-Agent", self._browser_ua)
        req.add_header("Accept-Language", "en-US,en;q=0.9")

        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        self._email = data.get("address")
        print(f"[INFO] Tempik inbox: {self._email} (domain={domain})")
        return self._email

    def get_messages(self, address: str = None):
        """Get all messages for an inbox address."""
        addr = address or self._email
        if not addr:
            raise ValueError("No email address provided")

        url = f"{self.base_url}/inboxes/{addr}/messages"
        req = Request(url, method="GET")
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", self._browser_ua)
        if self.session_id:
            req.add_header("x-session-id", self.session_id)

        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        return data if isinstance(data, list) else []

    async def wait_for_otp(self, address: str = None, max_wait: int = 150, interval: int = 5):
        """Wait for OTP email and extract the code."""
        addr = address or self._email
        t0 = time.time()

        while time.time() - t0 < max_wait:
            try:
                messages = self.get_messages(addr)
                if messages and len(messages) > 0:
                    otp = self.extract_otp(messages)
                    if otp:
                        return otp
            except Exception as e:
                print(f"[WARNING] Tempik poll error: {e}")

            await asyncio.sleep(interval)

        return None

    def extract_otp(self, messages):
        """Extract verification code from messages."""
        for msg in messages:
            subject = msg.get("subject", "")
            body = msg.get("body", "") or msg.get("text", "") or ""

            # Strip HTML tags to get plain text
            plain = re.sub(r"<[^>]+>", " ", body)
            plain = re.sub(r"\s+", " ", plain).strip()
            content = f"{subject} {plain}"

            print(f"[DEBUG] OTP plain text: {content[:300]}")

            patterns = [
                # Qoder specific: "Verify your email" OR "start using Qoder"
                r"(?:verify\s+your\s+email|start\s+using\s+Qoder)[\s\S]*?(\d{6})",
                # Generic fallback: standalone 6-digit code
                r"\b(\d{6})\b",
                # Other formats
                r"verification\s*code\s*:?\s*(\d{4,8})",
                r"code\s*:?\s*(\d{4,8})",
                r"OTP\s*:?\s*(\d{4,8})",
                r"passcode\s*:?\s*(\d{4,8})",
            ]

            for pattern in patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    code = match.group(1)
                    print(f"[SUCCESS] OTP extracted: {code}")
                    return code

        return None


def generate_password(length=14):
    """Generate random password."""
    import secrets
    import string
    
    alphabet = string.ascii_letters + string.digits
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.punctuation)
    ]
    
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(password)
    
    return "".join(password)


def load_accounts_from_file(filepath='accounts.txt'):
    """Load accounts from accounts.txt file (email:password format)."""
    if not os.path.exists(filepath):
        print(f"[WARNING] {filepath} not found, cannot use percentage mode")
        return []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        accounts = []
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split(':')
                if len(parts) >= 2:
                    email = parts[0]
                    accounts.append({
                        'line_num': i,
                        'email': email,
                        'password': ':'.join(parts[1:]) if len(parts) > 2 else ''
                    })
        
        return accounts
    except Exception as e:
        print(f"[ERROR] Failed to load accounts: {e}")
        return []


def select_accounts_by_percentage(accounts, percentage):
    """Select random accounts based on percentage."""
    if not accounts or percentage <= 0:
        return []
    
    # Cap percentage at 100%
    percentage = min(percentage, 100)
    
    import random
    
    count = int(len(accounts) * percentage / 100)
    selected = random.sample(accounts, min(count, len(accounts)))
    
    print(f"\n[INFO] Total accounts in {os.path.basename('accounts.txt')}: {len(accounts)}")
    print(f"[INFO] Selected by {percentage}%: {len(selected)} accounts")
    print(f"[SECURITY] Using percentage mode to reduce IP blacklist risk")
    
    return selected


async def create_qoder_account(email, password, chrome_binary, proxy=None, headless=True):
    """Create Qoder account via Playwright."""
    from playwright.async_api import async_playwright, Page
    
    print(f"[INFO] Launching browser...")
    
    async with async_playwright() as p:
        # Launch browser
        launch_args = []
        if chrome_binary:
            launch_args["executable_path"] = chrome_binary
        else:
            # Try common paths
            win_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            mac_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            linux_path = "/usr/bin/google-chrome"
            
            if os.path.exists(win_path):
                launch_args["executable_path"] = win_path
            elif os.path.exists(mac_path):
                launch_args["executable_path"] = mac_path
            elif os.path.exists(linux_path):
                launch_args["executable_path"] = linux_path
        
        browser = await p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-extensions",
                "--disable-web-security",
                "--no-sandbox",
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        
        if proxy:
            await context.add_cookies([{
                "name": "__cfduid",
                "value": "dummy",
                "domain": ".qoder.com"
            }])
        
        page = await context.new_page()
        
        try:
            print("[INFO] Opening Qoder signup page...")
            await page.goto(
                "https://qoder.com/users/sign-up",
                wait_until="domcontentloaded",
                timeout=60000
            )
            await asyncio.sleep(5)
            
            # Fill form
            print("[INFO] Filling signup form...")
            await page.fill("#basic_firstName", "User")
            await page.fill("#basic_lastName", "Dev")
            await page.fill("#basic_email", email)
            
            # Checkbox
            cb = await page.query_selector("input[type=checkbox]")
            if cb:
                try:
                    await cb.check(force=True)
                except:
                    pass
            
            await page.click('button:has-text("Continue")')
            await asyncio.sleep(4)
            
            # Password
            print("[INFO] Filling password...")
            pw = await page.query_selector("#basic_password")
            if pw:
                try:
                    await pw.click(force=True)
                    await page.keyboard.type(password, delay=20)
                except:
                    pass
                    
            await page.click('button:has-text("Continue")')
            await asyncio.sleep(4)
            
            # Captcha - placeholder (manual solving needed)
            print("[WARNING] Captcha detected - please solve manually!")
            await page.wait_for_timeout(3000)
            
            # Click verify button
            buttons = await page.query_selector_all('button:has-text("Click to verify")')
            if buttons:
                await buttons[0].click()
                await asyncio.sleep(3)
            
            # Wait for OTP
            print("[INFO] Waiting for OTP email...")
            otp = await tempik_client.wait_for_otp(email, max_wait=150, interval=5)
            
            if not otp:
                print("[ERROR] Failed to retrieve OTP")
                await browser.close()
                return None
                
            print(f"[INFO] OTP received: {otp}")
            
            # Fill OTP
            print("[INFO] Entering OTP...")
            otp_inputs = await page.query_selector_all('input.ant-otp-input')
            if len(otp_inputs) >= 6:
                await otp_inputs[0].click()
                await asyncio.sleep(0.2)
                await page.keyboard.type(otp, delay=80)
                await asyncio.sleep(1.5)
            else:
                await page.keyboard.type(otp, delay=80)
            
            await page.click('button:has-text("Create account")')
            await page.wait_for_timeout(8000)
            
            # Check result
            current_url = page.url
            if "download" in current_url or "dashboard" in current_url:
                print("[SUCCESS] Account created successfully!")
            else:
                print("[WARNING] Account may be pending verification")
            
            # Create PAT
            print("[INFO] Creating PAT...")
            pat = await page.evaluate("""async () => {
                const exp = new Date();
                exp.setHours(23, 59, 59, 999);
                exp.setMonth(exp.getMonth() + 12);
                const csrf = window.csrfToken || '';
                const r = await fetch('/api/v1/me/personal-access-tokens', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        'x-requested-with': 'XMLHttpRequest'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: 'qoder-creator-' + Date.now(),
                        expires_at: exp.valueOf()
                    })
                });
                return {status: r.status, body: await r.text()};
            }""")
            
            pat_status = pat.get('status')
            pat_body = pat.get('body', '')
            
            # Extract token
            pat_token = None
            if pat_status == 201:
                try:
                    data = json.loads(pat_body)
                    token = data.get('token')
                    if token and len(token) >= 64:
                        pat_token = token
                except:
                    pass
            
            if not pat_token:
                match = re.search(r'"token"\s*:\s*"(pt-[A-Za-z0-9_\-]+)"', pat_body)
                if match and len(match.group(1)) >= 64:
                    pat_token = match.group(1)
            
            if pat_token:
                print(f"[SUCCESS] PAT valid! ({len(pat_token)} chars)")
            else:
                print(f"[WARNING] PAT invalid (status={pat_status})")
            
            await browser.close()
            
            return {
                'email': email,
                'password': password,
                'pat_token': pat_token,
                'pat_valid': pat_token is not None,
                'url': current_url,
                'created_at': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
        except Exception as e:
            print(f"[ERROR] Account creation failed: {str(e)}")
            await browser.close()
            return None


def main():
    parser = argparse.ArgumentParser(description='Create Qoder account', add_help=True)
    parser.add_argument('--email', default=None, help='Temporary email address (optional if using --accounts-file)')
    parser.add_argument('--provider', default='auto', 
                       help='Email provider: ncaori, 1secemail, gmail, mailcx, auto')
    parser.add_argument('--proxy', help='HTTP proxy URL (optional)')
    parser.add_argument('--headless', action='store_true', default=True,
                       help='Run browser in headless mode')
    parser.add_argument('--no-headless', dest='headless', action='store_false',
                       help='Run browser in visible mode (for debugging)')
    parser.add_argument('--chrome-binary', help='Path to Chrome/Chromium binary')
    parser.add_argument('--setup-tempik', action='store_true',
                       help='Setup Tempik self-hosted instance')
    
    # Security features
    parser.add_argument('--accounts-file', default='accounts.txt',
                       help='File containing accounts (default: accounts.txt)')
    parser.add_argument('--percentage', type=float, default=0,
                       help='Select accounts by percentage from accounts-file (e.g., 10 for 10%%)')
    parser.add_argument('--account-count', type=int, default=None,
                       help='Number of accounts to process (overrides count prompts)')
    
    args = parser.parse_args()
    
    # Validate email or percentage mode
    if not args.email and args.percentage <= 0:
        print("\n[ERROR] Please provide either --email OR use --percentage with --accounts-file")
        print("")
        print("Usage examples:")
        print("  Create single account: python signup.py --email test@example.com")
        print("  Bulk process (security): python signup.py --accounts-file accounts.txt --percentage 10")
        sys.exit(1)
    
    if args.setup_tempik:
        print("\n=== Tempik Self-Hosted Setup ===")
        print("\nTo set up Tempik:")
        print("1. Clone: git clone https://github.com/hirotomasato/tempik.git")
        print("2. cd tempik && npm install")
        print("3. Configure .env if needed")
        print("4. npm run dev (or docker compose up -d)")
        print("5. Update TEMPIK_BASE env var to your instance URL\n")
        return
    
    # Security Mode: Load and select by percentage
    temp_accounts = None
    email = args.email
    account_count = args.account_count
    
    if args.percentage > 0 and args.accounts_file:
        print(f"\n🛡️  [SECURITY MODE] Percentage-based account selection")
        print(f"Loading accounts from: {args.accounts_file}")
        temp_accounts = load_accounts_from_file(args.accounts_file)
        
        if not temp_accounts:
            print("[ERROR] No accounts found in file or file doesn't exist")
            print("Use --email to create new accounts instead")
            sys.exit(1)
        
        selected_accounts = select_accounts_by_percentage(temp_accounts, args.percentage)
        
        if not selected_accounts:
            print("[WARNING] No accounts selected")
            sys.exit(0)
        
        # Process each selected account
        for i, account in enumerate(selected_accounts, 1):
            processed_email = account['email']
            print(f"\n{'='*50}")
            print(f"Processing Account #{i}/{len(selected_accounts)}")
            print(f"Email: {processed_email}")
            print(f"{'='*50}\n")
            
            password = generate_password()
            
            try:
                result = create_qoder_account(
                    email=processed_email,
                    password=password,
                    chrome_binary=args.chrome_binary,
                    proxy=args.proxy,
                    headless=args.headless
                )
                
                if result:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    account_data = loop.run_until_complete(result)
                    
                    if account_data:
                        print("\n" + "="*50)
                        print("ACCOUNT CREATED SUCCESSFULLY")
                        print("="*50)
                        print(f"Email: {account_data['email']}")
                        print(f"Password: {account_data['password']}")
                        if account_data['pat_valid']:
                            print(f"PAT Token: {account_data['pat_token'][:50]}...")
                        print(f"Status: {'Valid' if account_data['pat_valid'] else 'Invalid'}")
                        print(f"URL: {account_data['url']}")
                        print("="*50)
                        
                        # Save to file
                        output_file = 'qoder_accounts.jsonl'
                        with open(output_file, 'a', encoding='utf-8') as f:
                            f.write(json.dumps(account_data) + '\n')
                        print(f"\nSaved to: {output_file}")
                    else:
                        print("\n[FAIL] Account creation failed")
                else:
                    print("\n[ERROR] Browser automation failed")
            except Exception as e:
                print(f"[ERROR] Failed to process account: {e}")
                continue
        
        print(f"\n✅ [COMPLETED] Processed {len(selected_accounts)} accounts ({args.percentage}%) safely")
        print(f"📊 Output saved to: qoder_accounts.jsonl")
        return
    
    # Normal mode: Create single account with provided email
    if not email:
        print("\n[ERROR] Email required. Use --email <temp_email>")
        sys.exit(1)
    
    tempik_client = TempikClient()
    password = generate_password()
    
    print(f"\n[INFO] Email: {args.email}")
    print(f"[INFO] Password: {password}\n")
    
    # Initialize tempik client and use provided email
    # If custom email is provided, we'll just use it directly
    
    # Check if Playwright is installed
    try:
        result = create_qoder_account(
            email=args.email,
            password=password,
            chrome_binary=args.chrome_binary,
            proxy=args.proxy,
            headless=args.headless
        )
        
        if result:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            account_data = loop.run_until_complete(result)
            
            if account_data:
                print("\n" + "="*50)
                print("ACCOUNT CREATED SUCCESSFULLY")
                print("="*50)
                print(f"Email: {account_data['email']}")
                print(f"Password: {account_data['password']}")
                if account_data['pat_valid']:
                    print(f"PAT Token: {account_data['pat_token'][:50]}...")
                print(f"Status: {'Valid' if account_data['pat_valid'] else 'Invalid'}")
                print(f"URL: {account_data['url']}")
                print("="*50)
                
                # Save to file
                output_file = 'qoder_accounts.jsonl'
                with open(output_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(account_data) + '\n')
                print(f"\nSaved to: {output_file}")
            else:
                print("\n[FAIL] Account creation failed")
                print("Error details were printed above")
                sys.exit(1)
        else:
            print("\n[ERROR] Browser automation failed")
            print("Check Python logs for more details")
            sys.exit(1)
            
    except ImportError as e:
        print(f"\n[ERROR] Playwright not installed: {e}")
        print("Install with: pip install playwright")
        print("Then: playwright install chromium")
        sys.exit(1)
    
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
