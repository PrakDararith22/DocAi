# Phase 2: Potential Issues Scan

## 🔍 Issue Prevention Analysis

**Date:** October 2, 2025  
**Phase:** Code Refactoring  
**Status:** Pre-Implementation

---

## ⚠️ Identified Potential Issues

### **Issue 1: AI Response Format Inconsistency**

**Risk Level:** HIGH  
**Category:** AI Integration

**Problem:**
- AI might return unstructured text instead of JSON
- Different AI providers may format differently
- JSON parsing might fail

**Impact:**
- Feature breaks completely
- Poor user experience
- Wasted API calls

**Solution:**
```javascript
// Strict JSON prompt with validation
const REFACTOR_PROMPT = `
IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations outside JSON.

{
  "suggestions": [...]
}
`;

// Robust parsing with fallback
try {
  const json = JSON.parse(response);
  if (!json.suggestions || !Array.isArray(json.suggestions)) {
    throw new Error('Invalid format');
  }
} catch (error) {
  // Try to extract JSON from markdown
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }
  throw new Error('Could not parse AI response');
}
```

**Priority:** Must fix before launch

---

### **Issue 2: Code Indentation Preservation**

**Risk Level:** HIGH  
**Category:** Code Modification

**Problem:**
- Replacing lines might break indentation
- Python is indentation-sensitive
- Mixed tabs/spaces cause errors

**Impact:**
- Breaks code syntax
- Code won't run
- User frustration

**Solution:**
```javascript
// Detect and preserve indentation
function getIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

function applyIndentation(code, indentation) {
  return code.split('\n')
    .map(line => indentation + line)
    .join('\n');
}

// Before replacing
const originalIndent = getIndentation(originalLines[0]);
const refactoredWithIndent = applyIndentation(refactoredCode, originalIndent);
```

**Priority:** Must fix before launch

---

### **Issue 3: Syntax Validation After Changes**

**Risk Level:** HIGH  
**Category:** Code Quality

**Problem:**
- AI might generate syntactically invalid code
- Changes might break syntax
- No validation before applying

**Impact:**
- Breaks user's code
- Loss of trust
- Requires manual fix

**Solution:**
```javascript
// Validate before applying
async function validateSyntax(code, language) {
  if (language === 'python') {
    // Use python -m py_compile
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec(`python -m py_compile -`, {
        input: code
      }, (error) => {
        resolve(!error);
      });
    });
  }
  
  if (language === 'javascript') {
    // Use acorn parser
    const acorn = require('acorn');
    try {
      acorn.parse(code, { ecmaVersion: 2020 });
      return true;
    } catch {
      return false;
    }
  }
}

// Only apply if valid
if (await validateSyntax(refactoredCode, language)) {
  await applyChanges();
} else {
  console.error('Generated code has syntax errors');
  return false;
}
```

**Priority:** Must fix before launch

---

### **Issue 4: Multi-File Dependencies**

**Risk Level:** MEDIUM  
**Category:** Scope

**Problem:**
- Refactoring one file might break imports in other files
- Function renames affect callers
- No cross-file analysis

**Impact:**
- Breaks other files
- Hard to debug
- Incomplete refactoring

**Solution:**
```javascript
// For MVP: Single file only + warning
console.warn('⚠️  This refactors only this file.');
console.warn('   Changes may affect other files that import from here.');
console.warn('   Please run your tests after refactoring.');

// Future: Cross-file analysis
// - Parse all imports
// - Find usages across files
// - Suggest multi-file refactorings
```

**Priority:** Add warning for MVP, full solution later

---

### **Issue 5: Large File Performance**

**Risk Level:** MEDIUM  
**Category:** Performance

**Problem:**
- Large files (10,000+ lines) slow down AI
- High API costs
- Long wait times

**Impact:**
- Poor user experience
- High costs
- Timeouts

**Solution:**
```javascript
// Check file size before processing
const MAX_LINES = 5000;
const lineCount = code.split('\n').length;

if (lineCount > MAX_LINES) {
  console.error(`File too large (${lineCount} lines).`);
  console.error(`Maximum: ${MAX_LINES} lines.`);
  console.error('Tip: Refactor smaller sections at a time.');
  return;
}

// Or: Process in chunks
const chunks = splitIntoChunks(code, 1000); // 1000 lines per chunk
for (const chunk of chunks) {
  await refactorChunk(chunk);
}
```

**Priority:** Add limit for MVP

---

### **Issue 6: Backup Failure Handling**

**Risk Level:** MEDIUM  
**Category:** Safety

**Problem:**
- Backup creation might fail (disk full, permissions)
- If backup fails, should we continue?
- No backup = no rollback

**Impact:**
- Can't undo changes
- Data loss risk
- User panic

**Solution:**
```javascript
// Fail fast if backup fails
try {
  await backupManager.createBackup(filePath);
} catch (error) {
  console.error('❌ Failed to create backup:', error.message);
  console.error('   Aborting to prevent data loss.');
  return false;
}

// Always check backup exists before applying
if (!await backupManager.hasBackup(filePath)) {
  throw new Error('No backup found. Aborting.');
}
```

**Priority:** Must fix before launch

---

### **Issue 7: Concurrent Refactorings Conflict**

**Risk Level:** LOW  
**Category:** Edge Case

**Problem:**
- Multiple suggestions might modify same lines
- Applying both causes conflict
- Line numbers become invalid after first change

**Impact:**
- Second refactoring fails
- Incorrect changes
- Confusing errors

**Solution:**
```javascript
// Sort suggestions by line number (bottom to top)
suggestions.sort((a, b) => b.lineStart - a.lineStart);

// Apply from bottom to top (preserves line numbers)
for (const suggestion of suggestions) {
  await applySuggestion(suggestion);
}

// Or: Detect conflicts
function hasConflict(s1, s2) {
  return (s1.lineStart <= s2.lineEnd && s1.lineEnd >= s2.lineStart);
}

const conflicts = findConflicts(selectedSuggestions);
if (conflicts.length > 0) {
  console.warn('⚠️  Some suggestions overlap. Apply one at a time.');
}
```

**Priority:** Add conflict detection

---

### **Issue 8: AI Hallucination**

**Risk Level:** MEDIUM  
**Category:** AI Behavior

**Problem:**
- AI might suggest changes that don't make sense
- AI might misunderstand code context
- AI might introduce bugs

**Impact:**
- Bad suggestions
- Breaks code
- User loses trust

**Solution:**
```javascript
// Always show preview
// Always require user confirmation
// Never auto-apply without review

// Add quality checks
function validateSuggestion(suggestion) {
  // Check if refactored code is significantly different
  if (suggestion.originalCode === suggestion.refactoredCode) {
    return false; // No actual change
  }
  
  // Check if suggestion makes sense
  if (suggestion.refactoredCode.length > suggestion.originalCode.length * 3) {
    return false; // Suspiciously large
  }
  
  return true;
}
```

**Priority:** Add validation

---

### **Issue 9: Preview Diff Clarity**

**Risk Level:** LOW  
**Category:** UX

**Problem:**
- Diff might be hard to read
- Long changes hard to review
- Context missing

**Impact:**
- User can't understand changes
- Skips review
- Applies bad changes

**Solution:**
```javascript
// Show context lines
function showDiffWithContext(original, refactored, contextLines = 3) {
  // Show 3 lines before and after
  const before = getContextLines(original, contextLines);
  const after = getContextLines(refactored, contextLines);
  
  console.log('Before:');
  before.forEach(line => console.log(chalk.gray(line)));
  console.log(chalk.red('- ' + original));
  
  console.log('\nAfter:');
  after.forEach(line => console.log(chalk.gray(line)));
  console.log(chalk.green('+ ' + refactored));
}
```

**Priority:** Nice to have

---

### **Issue 10: API Rate Limits**

**Risk Level:** LOW  
**Category:** API Integration

**Problem:**
- Multiple files = multiple API calls
- Might hit rate limits
- Costs add up

**Impact:**
- Feature stops working
- User frustrated
- High costs

**Solution:**
```javascript
// Add rate limiting
const rateLimit = require('p-ratelimit');
const limiter = rateLimit({
  interval: 1000, // 1 second
  rate: 1 // 1 request per second
});

// Wrap API calls
await limiter(() => aiProvider.generate(prompt));

// Show progress
console.log(`Processing file ${i}/${total}...`);
console.log('(Rate limited to prevent API issues)');
```

**Priority:** Add if issues occur

---

## 📊 Risk Summary

| Risk Level | Count | Issues |
|------------|-------|--------|
| **HIGH** | 3 | AI format, Indentation, Syntax validation |
| **MEDIUM** | 4 | Dependencies, Performance, Backup, Hallucination |
| **LOW** | 3 | Conflicts, Preview, Rate limits |

---

## ✅ Mitigation Plan

### **Before Implementation:**
1. ✅ Design robust JSON parsing
2. ✅ Plan indentation preservation
3. ✅ Research syntax validation tools

### **During Implementation:**
1. ✅ Implement all HIGH priority solutions
2. ✅ Add MEDIUM priority warnings
3. ✅ Test edge cases

### **Before Launch:**
1. ✅ Test with invalid AI responses
2. ✅ Test with various indentation styles
3. ✅ Test syntax validation
4. ✅ Test backup failure scenarios

---

## 🎯 Success Criteria

**Phase 2 is safe to launch when:**
- ✅ All HIGH risk issues have solutions
- ✅ All MEDIUM risk issues have warnings
- ✅ Backup system is bulletproof
- ✅ Syntax validation works
- ✅ Preview is clear and accurate

---

**This scan will be updated as we discover more issues during implementation.**
