---
inclusion: auto
priority: high
---

# 📋 Project Rules - Bercocok Tanam Automation

## 🎯 Universal Rules untuk Semua AI Agents

**Aturan ini berlaku untuk semua AI agents (Kiro, Cursor, Codex, Antigravity, dll)**

---

## 📁 Documentation Rules

### Rule #1: Documentation Storage Location

**SEMUA dokumentasi WAJIB disimpan di:**
```
F:\Repo github\bercocok-tanam-main\docs\
```

**Sub-folder structure:**
- `docs/analysis/` - Analisis masalah, performance audit, code review
- `docs/features/` - Dokumentasi fitur baru
- `docs/fixes/` - Dokumentasi bug fix dan patches
- `docs/automation/` - Dokumentasi automation-specific (Kiro, Cloudflare, dll)
- `docs/guides/` - Tutorial dan how-to guides
- `docs/architecture/` - Design decisions, system architecture

**JANGAN simpan dokumentasi di:**
- ❌ Root directory project
- ❌ Nested dalam folder src/
- ❌ Home directory atau tempat lain

**Contoh yang BENAR:**
```
✅ F:\Repo github\bercocok-tanam-main\docs\analysis\PERFORMANCE_ANALYSIS.md
✅ F:\Repo github\bercocok-tanam-main\docs\fixes\ROUTER_TIMEOUT_FIX.md
✅ F:\Repo github\bercocok-tanam-main\docs\guides\QUICK_START.md
```

**Contoh yang SALAH:**
```
❌ F:\Repo github\bercocok-tanam-main\PERFORMANCE_ANALYSIS.md
❌ F:\Repo github\bercocok-tanam-main\src\docs\something.md
❌ F:\Repo github\bercocok-tanam-main\QUICK_FIX_GUIDE.md
```

---

### Rule #2: Documentation Naming Convention

**Format nama file:**
```
[CATEGORY]_[DESCRIPTION].md
```

**Examples:**
- `ANALYSIS_PERFORMANCE_KIRO_CLOUDFLARE.md`
- `FIX_ROUTER_TIMEOUT_ISSUE.md`
- `FEATURE_CIRCUIT_BREAKER_IMPLEMENTATION.md`
- `GUIDE_QUICK_START_SETUP.md`

**Gunakan:**
- UPPERCASE untuk nama file
- Underscore (_) sebagai separator
- Descriptive names (jelas dan spesifik)

---

### Rule #3: Documentation Creation Workflow

**SEBELUM membuat dokumentasi baru:**

1. **Tentukan kategori yang sesuai:**
   - Analysis → `docs/analysis/`
   - Fix/Patch → `docs/fixes/`
   - Feature → `docs/features/`
   - Automation → `docs/automation/`
   - Guide → `docs/guides/`
   - Architecture → `docs/architecture/`

2. **Check apakah dokumentasi serupa sudah ada:**
   ```bash
   ls "F:\Repo github\bercocok-tanam-main\docs\[category]\"
   ```

3. **Buat file dengan naming convention yang benar**

4. **Tambahkan metadata di header:**
   ```markdown
   ---
   title: [Judul Deskriptif]
   category: [analysis|fix|feature|automation|guide|architecture]
   created: [YYYY-MM-DD]
   updated: [YYYY-MM-DD]
   author: [AI Agent Name]
   related_files:
     - path/to/file1.js
     - path/to/file2.js
   ---
   ```

---

### Rule #4: Documentation Index

**WAJIB update `docs/README.md` setiap membuat dokumentasi baru:**

Format:
```markdown
## [Category]

- [Tanggal] - [Nama File](./category/FILE_NAME.md) - Brief description
```

---

## 🔧 Implementation Rules

### Rule #5: Execution After Approval

**Workflow:**
1. Analisis masalah
2. Buat dokumentasi di `docs/[category]/`
3. **Tunjukkan summary ke user**
4. **Tunggu approval dari user**
5. ✅ **SETELAH user approve** → eksekusi implementation

**User approval keywords:**
- "setuju"
- "ok"
- "lanjut"
- "eksekusi"
- "implement"
- "yes"
- "ya"

**Jangan langsung eksekusi tanpa approval!**

---

### Rule #6: Code Changes Documentation

**Setiap perubahan code WAJIB didokumentasikan:**

1. **Sebelum perubahan:**
   - Screenshot/copy original code
   - Simpan di `docs/fixes/` atau `docs/features/`

2. **Perubahan:**
   - Dokumentasikan apa yang diubah
   - Kenapa diubah
   - Expected outcome

3. **Setelah perubahan:**
   - Test results
   - Performance impact
   - Breaking changes (jika ada)

---

## 📊 Analysis Rules

### Rule #7: Performance Analysis

**Sebelum optimasi, WAJIB analisis:**
- Current performance metrics
- Bottleneck identification
- Expected improvement
- Risk assessment

**Format dokumentasi:**
```markdown
# Performance Analysis: [Feature/Component]

## Current State
- Metric 1: [value]
- Metric 2: [value]

## Bottlenecks Identified
1. [Issue 1]
   - Impact: [High/Medium/Low]
   - Location: [file:line]

## Proposed Solution
...

## Expected Results
- Before: [metrics]
- After: [metrics]
- Improvement: [percentage]
```

---

### Rule #8: Comparative Analysis

**Saat membandingkan original vs modified code:**

1. **Simpan di:** `docs/analysis/COMPARISON_[FEATURE].md`
2. **Include:**
   - Side-by-side code comparison
   - Performance comparison table
   - Root cause analysis
   - Recommendation dengan prioritas

---

## 🚨 Error Handling Rules

### Rule #9: Error Documentation

**Setiap error atau bug WAJIB didokumentasikan di:**
```
docs/fixes/ERROR_[COMPONENT]_[ISSUE_SUMMARY].md
```

**Include:**
- Error message/stack trace
- Steps to reproduce
- Root cause
- Solution applied
- Prevention strategy

---

## 🔄 Update Rules

### Rule #10: Keep Documentation Updated

**Saat code berubah:**
- Update related documentation
- Add "Updated: [DATE]" di metadata
- Tambahkan section "Changelog" di bottom

**Format changelog:**
```markdown
## Changelog

### [YYYY-MM-DD]
- Changed: [description]
- Added: [description]
- Fixed: [description]
```

---

## 📝 Markdown Standards

### Rule #11: Markdown Formatting

**Gunakan:**
- Headers (`#`, `##`, `###`) untuk hierarchy
- Code blocks dengan language identifier
- Tables untuk comparisons
- Emojis untuk visual categorization (🔴 ⚠️ ✅ 📊 💡)
- Horizontal rules (`---`) untuk section separation

**Format code blocks:**
```javascript
// Always specify language
const example = "code here";
```

---

## 🎯 Priority Rules

### Rule #12: Documentation Priority

**High Priority (Dokumentasi WAJIB):**
- Performance issues & solutions
- Breaking changes
- Security fixes
- Architecture changes

**Medium Priority:**
- New features
- Bug fixes
- Refactoring

**Low Priority:**
- Minor tweaks
- Code cleanup
- Comment updates

---

## ✅ Checklist untuk AI Agents

**Sebelum selesai dengan task, pastikan:**

- [ ] Dokumentasi disimpan di `docs/[category]/`
- [ ] File naming sesuai convention
- [ ] Metadata header lengkap
- [ ] `docs/README.md` updated
- [ ] Code changes terdokumentasi
- [ ] User approval didapat sebelum eksekusi
- [ ] Related files linked di dokumentasi
- [ ] Testing results included (jika applicable)

---

## 🔍 File Organization Example

```
F:\Repo github\bercocok-tanam-main\
├── .kiro/
│   └── steering/
│       └── project-rules.md (this file)
├── docs/
│   ├── README.md (index of all docs)
│   ├── analysis/
│   │   ├── PERFORMANCE_KIRO_CLOUDFLARE.md
│   │   └── COMPARISON_ORIGINAL_VS_MODIFIED.md
│   ├── fixes/
│   │   ├── ROUTER_TIMEOUT_FIX.md
│   │   └── CIRCUIT_BREAKER_IMPLEMENTATION.md
│   ├── features/
│   │   ├── GRACEFUL_SHUTDOWN_FEATURE.md
│   │   └── SMART_HISTORY_FEATURE.md
│   ├── automation/
│   │   ├── KIRO_WORKFLOW.md
│   │   └── CLOUDFLARE_WORKFLOW.md
│   ├── guides/
│   │   ├── QUICK_START.md
│   │   └── TROUBLESHOOTING.md
│   └── architecture/
│       └── SYSTEM_OVERVIEW.md
├── src/
└── [other project files]
```

---

## 🚀 Quick Reference

**Saat user minta analisis masalah:**
1. Analisis masalah
2. Buat `docs/analysis/ANALYSIS_[TOPIC].md`
3. Tunjukkan summary ke user
4. Tunggu approval

**Saat user minta fix/implementasi:**
1. Analisis solution
2. Buat `docs/fixes/FIX_[ISSUE].md` atau `docs/features/FEATURE_[NAME].md`
3. Tunjukkan plan ke user
4. **Tunggu "setuju/approve"**
5. Eksekusi implementation
6. Update dokumentasi dengan results

**Saat user minta dokumentasi existing work:**
1. Kumpulkan informasi
2. Tentukan kategori yang tepat
3. Buat dokumentasi di `docs/[category]/`
4. Update `docs/README.md`

---

## 📞 Support

**Jika ragu tentang:**
- Kategori yang tepat → Default ke `docs/analysis/`
- Naming convention → Tanya user
- Priority level → Tanya user

**Always:**
- Prefer over-documentation daripada under-documentation
- Gunakan clear, descriptive names
- Include examples dan code snippets
- Link related files

---

**Last Updated:** 2026-08-20
**Version:** 1.0
**Applies To:** All AI Agents (Kiro, Cursor, Codex, Antigravity, etc.)
