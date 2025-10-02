# DocAI Scan Command

## 🔍 Overview

`docai scan` is like `git status` but for documentation - it shows which functions/classes are missing documentation without actually generating anything.

---

## 🎯 What It Does

**Scans your codebase and reports:**
- ✅ Functions/classes WITH documentation
- ❌ Functions/classes WITHOUT documentation
- 📊 Documentation coverage percentage
- 💡 Suggestions for what to do next

**No changes made to files!** Just shows status.

---

## 📊 Example Output

```bash
$ docai scan ./src

🔍 DocAI - Documentation Status

Scanning 5 files...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Documentation Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total functions/classes: 15
✓ With documentation: 8
✗ Missing documentation: 7
Coverage: 53.3%

Missing Documentation:

  utils.py
    ./src/utils.py
    𝑓 calculate() (line 10)
    𝑓 multiply() (line 25)
    C Database (line 45)

  helpers.py
    ./src/helpers.py
    𝑓 format_output() (line 15)
    𝑓 validate_input() (line 30)

  types.py
    ./src/types.py
    C User (line 5)
    C Product (line 20)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 To add documentation:

  # Generate for all files
  docai generate ./src

  # Generate for specific file
  docai generate ./src/utils.py

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 Use Cases

### **Use Case 1: Check Status Before Committing**
```bash
# Like git status before git commit
$ docai scan

# See what's missing
# Decide if you want to add docs

$ docai generate ./src
$ git commit
```

### **Use Case 2: Check Coverage**
```bash
$ docai scan

Coverage: 85.5%

# Good coverage! Ready to merge
```

### **Use Case 3: Find What Needs Docs**
```bash
$ docai scan

Missing Documentation:
  utils.py
    𝑓 calculate() (line 10)
    𝑓 multiply() (line 25)

# Generate just for that file
$ docai generate ./src/utils.py
```

### **Use Case 4: CI/CD Integration**
```bash
# In CI pipeline
$ docai scan

# Check coverage
# Fail build if < 80%
```

---

## 📋 Commands

### **Basic Scan:**
```bash
# Scan default directory (./src/)
$ docai scan

# Scan specific directory
$ docai scan ./lib

# Scan specific file
$ docai scan ./src/utils.py
```

### **With Verbose:**
```bash
# Show detailed information
$ docai scan --verbose
```

---

## 🔄 Workflow Comparison

### **Old Way (Watch Mode):**
```bash
# Start watch mode
$ docai generate ./src --watch
👁️  Watching files...

# Keep terminal open
# Process running in background
# Auto-updates on save
```

**Problems:**
- ❌ Must keep terminal open
- ❌ Process must stay running
- ❌ Uses resources
- ❌ Forget to start it

---

### **New Way (Scan Command):**
```bash
# Check status anytime
$ docai scan

# See what's missing
# Decide what to do

# Generate when ready
$ docai generate ./src
```

**Benefits:**
- ✅ Run anytime
- ✅ No background process
- ✅ No resources used
- ✅ Like git status
- ✅ Quick check

---

## 📊 Output Breakdown

### **Summary Section:**
```
Total functions/classes: 15
✓ With documentation: 8
✗ Missing documentation: 7
Coverage: 53.3%
```

**Shows:**
- Total items found
- How many have docs
- How many missing
- Coverage percentage

---

### **Missing Documentation Section:**
```
Missing Documentation:

  utils.py
    ./src/utils.py
    𝑓 calculate() (line 10)
    𝑓 multiply() (line 25)
```

**Shows:**
- File name
- Full path
- Function/class name
- Line number
- Type (𝑓 = function, C = class)

---

### **Suggestions Section:**
```
💡 To add documentation:

  # Generate for all files
  docai generate ./src

  # Generate for specific file
  docai generate ./src/utils.py
```

**Shows:**
- How to fix
- Example commands
- Specific file suggestions

---

## 🎯 Integration Examples

### **Git Hook (pre-commit):**
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Checking documentation coverage..."
docai scan

# Optional: Fail if coverage < 80%
# coverage=$(docai scan | grep "Coverage:" | awk '{print $2}' | sed 's/%//')
# if [ "$coverage" -lt 80 ]; then
#   echo "Documentation coverage too low: $coverage%"
#   exit 1
# fi
```

### **CI/CD Pipeline:**
```yaml
# .github/workflows/docs.yml
name: Documentation Check

on: [push, pull_request]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install DocAI
        run: npm install -g docai
      - name: Check documentation
        run: docai scan
```

### **Make Target:**
```makefile
# Makefile
.PHONY: docs-check
docs-check:
	docai scan

.PHONY: docs-generate
docs-generate:
	docai generate ./src
```

---

## 💡 Tips

### **1. Check Before Committing:**
```bash
$ git status
$ docai scan  # Check docs too!
$ git commit
```

### **2. Quick Coverage Check:**
```bash
$ docai scan | grep "Coverage:"
Coverage: 85.5%
```

### **3. Find Specific Files:**
```bash
$ docai scan | grep "utils.py"
  utils.py
    𝑓 calculate() (line 10)
```

### **4. Regular Checks:**
```bash
# Add to your workflow
$ npm test
$ docai scan
$ git push
```

---

## 🎯 Comparison

| Feature | Watch Mode | Scan Command |
|---------|-----------|--------------|
| **Background Process** | ✅ Yes (must run) | ❌ No |
| **Auto-Updates** | ✅ Yes | ❌ No (manual) |
| **Quick Check** | ❌ No | ✅ Yes |
| **Resource Usage** | ❌ High | ✅ Low |
| **Like Git** | ❌ No | ✅ Yes (like git status) |
| **CI/CD Friendly** | ❌ No | ✅ Yes |

---

## 🎉 Summary

**`docai scan`:**
- 🔍 Shows documentation status
- 📊 Reports coverage
- ❌ Lists missing docs
- 💡 Suggests fixes
- 🚀 No changes made
- ⚡ Quick and simple

**Like `git status` but for documentation!**

**Commands:**
```bash
# Check status
$ docai scan

# Check specific file
$ docai scan ./src/utils.py

# Verbose output
$ docai scan --verbose

# Then generate when ready
$ docai generate ./src
```

**Perfect for:**
- Quick checks
- Pre-commit hooks
- CI/CD pipelines
- Coverage reports
- Finding what needs docs

**No more watch mode needed!** 🎯
