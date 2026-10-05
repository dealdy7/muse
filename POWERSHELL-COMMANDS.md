# 🔧 POWERSHELL COMMANDS - Path Flexibility Fix

## ⚠️ PowerShell Syntax (Bukan Bash!)

PowerShell menggunakan `;` bukan `&&` dan `-Force -Recurse` bukan `-rf`

---

## 🚀 Quick Fix Commands

### Option 1: Clear NPM Cache
```powershell
npm cache clean --force
npm start
```

### Option 2: Delete Chromium Data
```powershell
Remove-Item -Path "C:\Users\Iyaan\AppData\Local\Chromium" -Recurse -Force -ErrorAction SilentlyContinue
npm start
```

### Option 3: Fresh Install
```powershell
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
npm install
npm start
```

### Option 4: All in One (PowerShell)
```powershell
npm cache clean --force; Remove-Item -Path "C:\Users\Iyaan\AppData\Local\Chromium" -Recurse -Force -ErrorAction SilentlyContinue; npm start
```

---

## 🔍 Debug: Get Full Error

```powershell
npm start 2>&1 | Tee-Object -FilePath error.log
Get-Content error.log
```

---

## 📝 Alternatif: Gunakan Git Bash

Jika Anda punya Git Bash (lebih mudah):

```bash
# Buka Git Bash, lalu:
cd "L:/Personal Project/Hernia/bercocok-tanam-main"
npm cache clean --force && npm start
```

---

## 🎯 Recommended (PowerShell)

**Step by step:**

```powershell
# 1. Clear cache
npm cache clean --force

# 2. Delete Chromium (if exists)
Remove-Item -Path "$env:LOCALAPPDATA\Chromium" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Test
npm start
```

---

## ⚡ One-liner (Copy-paste ini di PowerShell)

```powershell
npm cache clean --force; npm start
```

Atau kalau masih error:

```powershell
npm cache clean --force; Remove-Item -Path "$env:LOCALAPPDATA\Chromium" -Recurse -Force -ErrorAction SilentlyContinue; npm start
```

---

## 📊 PowerShell vs Bash

| Bash | PowerShell |
|------|------------|
| `&&` | `;` atau newline |
| `rm -rf` | `Remove-Item -Recurse -Force` |
| `~` | `$env:USERPROFILE` |
| `\|` | `\|` (sama) |
| `tee` | `Tee-Object` |

---

**Coba sekarang:**

```powershell
npm cache clean --force
npm start
```

Kalau masih error, kirim output-nya!
