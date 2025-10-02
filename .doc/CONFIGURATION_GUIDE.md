# DocAI Configuration Guide

## 🎯 Configuration Overview

DocAI uses a **3-tier configuration system**:

```
1. Defaults (built-in)
   ↓
2. Config File (.docaiConfig.json)
   ↓
3. CLI Flags (highest priority)
```

---

## 🔧 Configuration via `docai init`

### What Gets Configured

When you run `docai init`, you'll be asked to configure:

#### **1. AI Provider Settings** ✅
```
? Select AI provider: Google Gemini
? Enter your Gemini API key: ********
? Select model: gemini-2.5-flash
```

**Saved to config:**
```json
{
  "provider": "gemini",
  "gemini_api_key": "AIza...",
  "gemini_model": "gemini-2.5-flash"
}
```

#### **2. Documentation Style** ✅
```
? Select documentation style: Google (Recommended)
```

**Saved to config:**
```json
{
  "style": "google"
}
```

#### **3. UI Preferences** ✅
```
? Show preview before applying changes? Yes
? Enable interactive mode (ask for approval)? Yes
? Create backup files before changes? Yes
? Enable verbose output? No
```

**Saved to config:**
```json
{
  "preview": true,
  "interactive": true,
  "backup": true,
  "verbose": false
}
```

---

## 📋 Configuration Options Explained

### **AI Options** (Configured in `docai init`)

| Option | Description | Default | Set in Init |
|--------|-------------|---------|-------------|
| `provider` | AI provider to use | `gemini` | ✅ Yes |
| `gemini_api_key` | Gemini API key | - | ✅ Yes |
| `gemini_model` | Gemini model | `gemini-2.5-flash` | ✅ Yes |
| `hf_token` | HuggingFace token | - | ✅ Yes |
| `style` | Docstring style | `google` | ✅ Yes |

**These are configured during init and saved to `.docaiConfig.json`**

---

### **UI Options** (Configured in `docai init`)

| Option | Description | Default | CLI Override |
|--------|-------------|---------|--------------|
| `preview` | Show preview before applying | `true` | `--no-preview` |
| `interactive` | Ask for approval | `true` | `--no-interactive` |
| `verbose` | Show detailed output | `false` | `--quiet` |
| `backup` | Create backups | `true` | `--backup` |

**Behavior:**
- **Preview:** ON by default, use `--no-preview` to skip
- **Interactive:** ON by default, use `--no-interactive` to disable
- **Verbose:** OFF by default, automatically enabled (use `--quiet` to disable)

---

### **File Processing Options** (CLI only)

| Option | Description | Default |
|--------|-------------|---------|
| `--inline` | Insert docs into files | Required for low-level |
| `--force` | Overwrite existing docs | `false` |
| `--watch` | Monitor for changes | `false` |
| `--skip-errors` | Continue on errors | `false` |

---

## 🎯 How It Works

### Example 1: Using Init Config

**Step 1:** Run init
```bash
docai init
? Show preview before applying changes? Yes
? Enable interactive mode? Yes
? Enable verbose output? No
```

**Step 2:** Config saved
```json
{
  "preview": true,
  "interactive": true,
  "verbose": false
}
```

**Step 3:** Run generate (uses config)
```bash
docai generate ./src
# Preview: ✅ Shown (from config)
# Interactive: ✅ Enabled (from config)
# Verbose: ❌ Disabled (from config)
```

---

### Example 2: Override with CLI Flags

**Config file:**
```json
{
  "preview": true,
  "interactive": true,
  "verbose": false
}
```

**Command:**
```bash
docai generate ./src --no-preview --no-interactive
# Preview: ❌ Skipped (CLI override)
# Interactive: ❌ Disabled (CLI override)
# Verbose: ❌ Disabled (from config)
```

---

### Example 3: Mix Config and CLI

**Config file:**
```json
{
  "provider": "gemini",
  "style": "google",
  "preview": true,
  "backup": true
}
```

**Command:**
```bash
docai generate ./src --no-preview --force
# Provider: gemini (from config)
# Style: google (from config)
# Preview: ❌ Skipped (CLI override)
# Backup: ✅ Enabled (from config)
# Force: ✅ Enabled (CLI flag)
```

---

## 📊 Configuration Priority

```
Highest Priority
    ↓
CLI Flags (--no-preview, --no-interactive)
    ↓
Config File (.docaiConfig.json)
    ↓
Defaults (built-in)
    ↓
Lowest Priority
```

**Example:**
```json
// Config file
{
  "preview": true,
  "verbose": false
}
```

```bash
# Command
docai generate ./src --no-preview

# Result:
# preview: false (CLI wins)
# verbose: false (from config)
```

---

## 🎨 UI Behavior Summary

### **Preview** (Show before applying)
- **Default:** ✅ Enabled
- **Config:** Set in `docai init`
- **Override:** `--no-preview` to skip
- **Behavior:** Shows generated docs before applying

### **Interactive** (Ask for approval)
- **Default:** ✅ Enabled
- **Config:** Set in `docai init`
- **Override:** `--no-interactive` to disable
- **Behavior:** Asks "Add this documentation? (Y/n)"

### **Verbose** (Detailed output)
- **Default:** ❌ Disabled
- **Config:** Set in `docai init`
- **Override:** `--quiet` to force disable
- **Behavior:** Shows detailed progress and info

### **Backup** (Create .bak files)
- **Default:** ✅ Enabled (if set in init)
- **Config:** Set in `docai init`
- **Override:** `--backup` to enable
- **Behavior:** Creates file.py.bak before changes

---

## 🔄 Complete Flow Example

### Scenario: First Time User

**Step 1: Initialize**
```bash
$ docai init

? Select AI provider: Google Gemini
? Enter API key: AIza...
? Select model: gemini-2.5-flash
? Select style: Google
? Show preview? Yes
? Interactive mode? Yes
? Create backups? Yes
? Verbose output? No

✅ Configuration saved!
```

**Step 2: Config Created**
```json
{
  "provider": "gemini",
  "gemini_api_key": "AIza...",
  "gemini_model": "gemini-2.5-flash",
  "style": "google",
  "preview": true,
  "interactive": true,
  "backup": true,
  "verbose": false
}
```

**Step 3: Generate Docs**
```bash
$ docai generate ./src

# Uses all settings from config:
# ✅ Gemini API
# ✅ Google style
# ✅ Shows preview
# ✅ Asks for approval
# ✅ Creates backups
# ❌ Not verbose
```

**Step 4: Override When Needed**
```bash
$ docai generate ./src --no-preview --no-interactive

# Overrides:
# ❌ No preview (CLI override)
# ❌ No interactive (CLI override)
# Still uses:
# ✅ Gemini API (from config)
# ✅ Google style (from config)
# ✅ Creates backups (from config)
```

---

## 🎯 Best Practices

### 1. **Use Init for Persistent Settings**
```bash
# Set once
docai init

# Use everywhere
docai generate ./src
docai generate ./tests
docai generate ./lib
```

### 2. **Override for Special Cases**
```bash
# Quick run without prompts
docai generate ./src --no-interactive

# No preview for CI/CD
docai generate ./src --no-preview --no-interactive
```

### 3. **Different Configs for Different Projects**
```bash
# Project A (Python, Google style)
cd project-a
docai init  # Configure for Python

# Project B (JavaScript, JSDoc)
cd project-b
docai init  # Configure for JavaScript
```

---

## 📝 Config File Location

```
project/
├── .docaiConfig.json  ← Config file (created by docai init)
├── src/
└── ...
```

**Security:** 
- ✅ Auto-added to `.gitignore`
- ⚠️ Contains API keys
- 💡 Use environment variables for CI/CD

---

## 🎉 Summary

**What's Configured in Init:**
- ✅ AI Provider (gemini, huggingface)
- ✅ API Key
- ✅ Model (gemini-2.5-flash, etc.)
- ✅ Style (google, numpy, sphinx)
- ✅ Preview (show by default)
- ✅ Interactive (ask for approval)
- ✅ Backup (create .bak files)
- ✅ Verbose (detailed output)

**What's CLI-Only:**
- File processing (`--inline`, `--force`, `--watch`)
- Output location (`--output`)
- Performance (`--concurrency`)
- Special modes (`--readme`, `--benchmark`)

**Priority:**
```
CLI Flags > Config File > Defaults
```

**Ready to configure!** Run `docai init` to get started! 🚀
