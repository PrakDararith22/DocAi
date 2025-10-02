# Inline Behavior Change

## 🎯 Change Summary

**Changed inline from a flag to default behavior.**

---

## ❌ Old Behavior

### Required `--inline` flag:
```bash
# Had to specify --inline
docai generate ./src --inline

# Without it, got error
docai generate ./src
# ❌ Error: Function/class documentation requires --inline flag
```

### Problems:
- ❌ Extra flag required
- ❌ Not intuitive
- ❌ Error if forgotten

---

## ✅ New Behavior

### Inline is DEFAULT:
```bash
# Default: modifies source code (inline)
docai generate ./src
# ✅ Inserts docstrings into source files

# Optional: save docs elsewhere
docai generate ./src --output ./docs
# ✅ Creates separate documentation files
# ✅ Source files unchanged
```

### Benefits:
- ✅ Simpler usage
- ✅ More intuitive
- ✅ No extra flags needed
- ✅ `--output` for when you need it

---

## 📊 Comparison

| Scenario | Old Command | New Command |
|----------|-------------|-------------|
| **Modify source** | `docai generate ./src --inline` | `docai generate ./src` |
| **Separate docs** | Not supported well | `docai generate ./src --output ./docs` |
| **README** | `docai generate --readme` | `docai generate --readme` (unchanged) |

---

## 🔧 Technical Changes

### 1. **src/index.js**
```javascript
// OLD: Required --inline flag
if (options.lowLevel && !options.inline) {
  console.error('Error: Function/class documentation requires --inline flag');
  process.exit(1);
}

// NEW: Automatic based on --output
if (options.lowLevel) {
  if (options.output) {
    options.inline = false;  // Separate docs
    options.outputDir = options.output;
  } else {
    options.inline = true;   // Modify source (default)
  }
}
```

### 2. **bin/docai.js**
```javascript
// OLD: Had --inline flag
.option('--inline', 'Insert documentation directly into files')
.option('--output <folder>', 'Output directory for non-inline mode', './docs')

// NEW: Removed --inline, updated --output
.option('--output <folder>', 'Save documentation to separate folder instead of modifying source files')
```

### 3. **src/initCommand.js**
```javascript
// OLD: Config had inline: true
{
  "inline": true,
  "output": "./docs"
}

// NEW: No inline in config (automatic)
{
  // inline is automatic based on --output flag
}
```

---

## 📝 Usage Examples

### Example 1: Default (Modify Source)
```bash
$ docai generate ./src

# What happens:
# 1. Reads ./src/utils.py
# 2. Generates docstrings
# 3. Inserts into ./src/utils.py (modifies file)
# 4. Creates backup if enabled
```

**Result:**
```python
# ./src/utils.py (MODIFIED)
def calculate(x, y):
    """
    Calculate sum of two numbers.
    
    Args:
        x (int): First number
        y (int): Second number
    
    Returns:
        int: Sum
    """
    return x + y
```

---

### Example 2: Separate Docs
```bash
$ docai generate ./src --output ./documentation

# What happens:
# 1. Reads ./src/utils.py
# 2. Generates docstrings
# 3. Creates ./documentation/utils.md (new file)
# 4. ./src/utils.py unchanged
```

**Result:**
```python
# ./src/utils.py (UNCHANGED)
def calculate(x, y):
    return x + y
```

```markdown
# ./documentation/utils.md (NEW)

## calculate

Calculate sum of two numbers.

**Parameters:**
- `x` (int): First number
- `y` (int): Second number

**Returns:**
- `int`: Sum
```

---

### Example 3: Custom Output Location
```bash
$ docai generate ./src --output ./website/api-docs

# Creates: ./website/api-docs/utils.md
# Source: ./src/utils.py (unchanged)
```

---

## 🎯 Logic Flow

```
User runs: docai generate ./src

↓

Check: Is --output specified?

├─ NO (default)
│  ├─ Set inline = true
│  ├─ Modify source files
│  └─ Insert docstrings into code
│
└─ YES (--output ./docs)
   ├─ Set inline = false
   ├─ Set outputDir = ./docs
   ├─ Source files unchanged
   └─ Create docs in ./docs/
```

---

## 🔄 Migration Guide

### For Existing Users

**Old command:**
```bash
docai generate ./src --inline --backup
```

**New command:**
```bash
# --inline is now default, just remove it
docai generate ./src --backup
```

**If you were using non-inline mode:**
```bash
# Old: Had to work around
# New: Use --output
docai generate ./src --output ./docs
```

---

## ✅ Benefits

### 1. **Simpler Usage**
```bash
# Before: 3 flags
docai generate ./src --inline --backup --preview

# After: 2 flags (inline is automatic)
docai generate ./src --backup --preview
```

### 2. **More Intuitive**
- Default behavior matches user expectations
- "Generate docs" naturally means "add to code"
- `--output` clearly means "put elsewhere"

### 3. **Fewer Errors**
- No more "requires --inline" errors
- Works out of the box
- Optional flag for special cases

### 4. **Flexible**
- Default: Modify source (most common)
- Optional: Separate docs (when needed)
- Both use cases supported

---

## 📋 Updated Help Text

```bash
$ docai generate --help

Options:
  --output <folder>     Save documentation to separate folder 
                        instead of modifying source files
  --backup              Create backup files before making changes
  --no-preview          Skip preview (preview is shown by default)
  --no-interactive      Disable interactive mode
  ...
```

**Note:** `--inline` is no longer shown (it's automatic)

---

## 🎉 Summary

**What changed:**
- ✅ Removed `--inline` flag
- ✅ Inline is now DEFAULT behavior
- ✅ `--output` creates separate docs
- ✅ Simpler, more intuitive

**Commands:**
```bash
# Default: modify source
docai generate ./src

# Optional: separate docs
docai generate ./src --output ./docs
```

**Result:** Easier to use, more intuitive, fewer errors! 🚀
