# Smart Override Behavior

## 🎯 New Override System

**DocAI now intelligently prompts you when functions already have documentation!**

---

## 🔄 How It Works

### **1. Function Without Docs** (Normal Flow)
```python
def calculate(x, y):
    return x + y
```

**Preview:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  calculate()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"""
Calculate sum of two numbers.

Args:
    x (int): First number
    y (int): Second number

Returns:
    int: Sum
"""

? Add this documentation?
  ❯ Yes, add this
    No, skip this
```

**Normal prompt - default is "Yes"**

---

### **2. Function With Existing Docs** (Override Prompt)
```python
def calculate(x, y):
    """Old docstring here."""
    return x + y
```

**Preview:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  calculate()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 Existing Documentation:
┌─────────────────────────────────────────────────────────┐
│ Old docstring here.                                     │
└─────────────────────────────────────────────────────────┘

"""
Calculate sum of two numbers.

Args:
    x (int): First number
    y (int): Second number

Returns:
    int: Sum
"""

🔄 Changes:
┌─────────────────────────────────────────────────────────┐
- Old docstring here.
+ Calculate sum of two numbers.
+ 
+ Args:
+     x (int): First number
+     y (int): Second number
+ 
+ Returns:
+     int: Sum
└─────────────────────────────────────────────────────────┘

⚠️  This function already has documentation. Override it?
    Yes, replace with new documentation
  ❯ No, keep existing documentation
```

**Override prompt - default is "No" (keep existing)**

---

## 📊 Behavior Summary

| Scenario | Shows | Default | Options |
|----------|-------|---------|---------|
| **No existing docs** | New docs | ✅ Yes | Add / Skip |
| **Has existing docs** | Old + New + Diff | ❌ No | Replace / Keep |

---

## 🎯 Benefits

### **1. Safe by Default**
- ✅ Won't accidentally overwrite your docs
- ✅ Default is "No" for existing docs
- ✅ Must explicitly choose to override

### **2. Informed Decision**
- ✅ See existing documentation
- ✅ See new documentation
- ✅ See diff (what changes)
- ✅ Make informed choice

### **3. No More `--force` Flag**
- ✅ No flag needed
- ✅ Automatic detection
- ✅ Interactive prompt
- ✅ Per-function decision

### **4. Flexible**
- ✅ Keep some, replace others
- ✅ Review each function
- ✅ Batch approval available
- ✅ Full control

---

## 📝 Complete Example

### File with Mixed Documentation:
```python
# utils.py
def calculate(x, y):
    """Old docstring."""
    return x + y

def multiply(x, y):
    return x * y

def divide(a, b):
    """Another old docstring."""
    return a / b
```

---

### Running DocAI:
```bash
$ docai generate ./utils.py
```

---

### Preview Flow:

#### **Function 1: calculate() - Has Docs**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  calculate()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 Existing Documentation:
Old docstring.

[New documentation shown]

⚠️  This function already has documentation. Override it?
  ❯ No, keep existing documentation  ← You choose "No"
```

#### **Function 2: multiply() - No Docs**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  multiply()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[New documentation shown]

? Add this documentation?
  ❯ Yes, add this  ← You choose "Yes"
```

#### **Function 3: divide() - Has Docs**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  divide()
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 Existing Documentation:
Another old docstring.

[New documentation shown]

⚠️  This function already has documentation. Override it?
    Yes, replace with new documentation  ← You choose "Yes"
  ❯ No, keep existing documentation
```

---

### Result:
```python
# utils.py
def calculate(x, y):
    """Old docstring."""  # ✅ KEPT (you chose "No")
    return x + y

def multiply(x, y):
    """
    Multiply two numbers.  # ✅ ADDED (new)
    
    Args:
        x (int): First number
        y (int): Second number
    
    Returns:
        int: Product
    """
    return x * y

def divide(a, b):
    """
    Divide two numbers.  # ✅ REPLACED (you chose "Yes")
    
    Args:
        a (int): Dividend
        b (int): Divisor
    
    Returns:
        float: Quotient
    """
    return a / b
```

**You had full control over each function!**

---

## 🎨 Visual Flow

```
For each function:
  ↓
Has existing docs?
  ├─ NO → Show new docs
  │       ↓
  │       "Add this?" (default: Yes)
  │       ↓
  │       User decides
  │
  └─ YES → Show existing + new + diff
          ↓
          "Override it?" (default: No)
          ↓
          User decides
```

---

## 💡 Use Cases

### Use Case 1: Update Specific Functions
```bash
# Review all, update only what you want
$ docai generate ./src

# Keep good docs, replace bad ones
# You decide per function
```

### Use Case 2: Add to New Functions Only
```bash
# All existing docs kept by default
$ docai generate ./src

# Just press "No" for existing
# Press "Yes" for new
```

### Use Case 3: Regenerate Everything
```bash
# Use batch approval
$ docai generate ./src --batch-approval

# Choose "Yes to all remaining (override all)"
# Regenerates everything
```

### Use Case 4: Safe Exploration
```bash
# Preview mode
$ docai generate ./src

# See what would change
# Don't apply anything
# Just review
```

---

## 🔧 Technical Details

### Detection Logic:
```javascript
// Check if function has existing documentation
const hasExisting = originalItem && originalItem.has_docstring;

if (hasExisting) {
  // Show override prompt
  message = '⚠️  This function already has documentation. Override it?';
  default = 'reject'; // Default to "No"
} else {
  // Show normal prompt
  message = 'Add this documentation?';
  default = 'approve'; // Default to "Yes"
}
```

### Preview Display:
```javascript
if (hasExisting) {
  // Show existing documentation
  showExistingDocumentation(originalItem);
  
  // Show new documentation
  showGeneratedDocumentation(item);
  
  // Show diff
  showDiff(originalItem.docstring, item.docstring);
}
```

---

## 🎯 Comparison

### Old Behavior (with --force):
```bash
# Without --force: Skip all existing
docai generate ./src
# → Skips existing docs

# With --force: Overwrite all existing
docai generate ./src --force
# → Overwrites everything (no choice!)
```

### New Behavior (smart prompts):
```bash
# Always prompts for existing docs
docai generate ./src

# For each function with docs:
# → Shows old + new + diff
# → Asks if you want to override
# → Default is "No" (safe)
# → You decide per function
```

---

## 📋 Options

### Interactive Mode (default):
```bash
docai generate ./src
# Prompts for each function
```

### Non-Interactive Mode:
```bash
docai generate ./src --no-interactive
# Auto-approves all (including overrides)
# Use with caution!
```

### Batch Approval:
```bash
docai generate ./src --batch-approval
# Adds "Yes to all" option
# Can override all at once
```

---

## 🎉 Summary

**New Behavior:**
- ✅ Detects existing documentation
- ✅ Shows old + new + diff
- ✅ Prompts for override decision
- ✅ Default is "No" (safe)
- ✅ Per-function control

**Benefits:**
- 🛡️ Safe by default
- 📊 Informed decisions
- 🎯 Granular control
- 🚫 No accidental overwrites

**Commands:**
```bash
# Smart prompts (automatic)
docai generate ./src

# With batch approval
docai generate ./src --batch-approval

# Non-interactive (auto-approve all)
docai generate ./src --no-interactive
```

**You're always in control!** 🎯
