# Phase 2: Testing Plan

## 🧪 Day 6: Testing & Bug Fixes

**Date:** October 2, 2025  
**Status:** In Progress

---

## 📋 Test Categories

### **1. Real File Testing**
- [ ] Test with real Python files
- [ ] Test with real JavaScript files
- [ ] Test with real TypeScript files

### **2. Error Scenarios**
- [ ] Syntax errors in code
- [ ] Invalid AI responses
- [ ] File permission errors
- [ ] Large files (>1000 lines)

### **3. Functional Testing**
- [ ] End-to-end workflow
- [ ] Mode selection prompt
- [ ] Different mode flags
- [ ] UI flows

### **4. Performance Testing**
- [ ] Performance (< 30 seconds per file)
- [ ] Memory usage

---

## 🎯 Test 1: Real Python File

**File:** Create a real Python file with refactoring opportunities

**Test Steps:**
1. Create Python file with performance issues
2. Run: `docai refactor --perf test.py`
3. Verify suggestions appear
4. Select suggestions
5. Verify preview shows
6. Apply changes
7. Verify syntax is valid
8. Verify backup created and cleaned up

**Expected Result:**
- ✅ Detects performance issues
- ✅ Shows 3-5 suggestions
- ✅ Preview is clear
- ✅ Changes applied successfully
- ✅ Backup cleaned up

---

## 🎯 Test 2: Real JavaScript File

**File:** Create a real JavaScript file

**Test Steps:**
1. Create JS file with readability issues
2. Run: `docai refactor --read test.js`
3. Verify suggestions
4. Apply changes
5. Verify syntax valid

**Expected Result:**
- ✅ Detects readability issues
- ✅ Suggestions relevant
- ✅ Changes work

---

## 🎯 Test 3: Interactive Mode Selection

**Test Steps:**
1. Run: `docai refactor test.py` (no flags)
2. Verify interactive prompt appears
3. Select "Performance optimizations"
4. Verify it works

**Expected Result:**
- ✅ Prompt shows all options
- ✅ Selection works
- ✅ Proceeds with selected mode

---

## 🎯 Test 4: Error - Syntax Errors in Code

**Test Steps:**
1. Create file with syntax errors
2. Run: `docai refactor test.py`
3. Verify error handling

**Expected Result:**
- ✅ Detects syntax error
- ✅ Shows clear error message
- ✅ Doesn't crash

---

## 🎯 Test 5: Error - Large File

**Test Steps:**
1. Create file with 1500 lines
2. Run: `docai refactor large.py`
3. Verify rejection

**Expected Result:**
- ✅ Rejects file
- ✅ Shows "File too large" error
- ✅ Shows limit (1,000 lines)

---

## 🎯 Test 6: --explain Flag

**Test Steps:**
1. Run: `docai refactor --perf --explain test.py`
2. Verify detailed explanations show

**Expected Result:**
- ✅ Shows "📖 Detailed Explanation" section
- ✅ Technical details included

---

## 🎯 Test 7: Multiple Flags

**Test Steps:**
1. Run: `docai refactor --perf --read test.py`
2. Verify both types of suggestions

**Expected Result:**
- ✅ Shows performance suggestions
- ✅ Shows readability suggestions
- ✅ Both types work

---

## 🎯 Test 8: Backup & Rollback

**Test Steps:**
1. Run refactor
2. Verify backup created
3. Apply changes successfully
4. Verify backup deleted
5. Run refactor that fails
6. Verify backup restored

**Expected Result:**
- ✅ Backup created before changes
- ✅ Backup deleted on success
- ✅ Backup restored on failure

---

## 🎯 Test 9: Syntax Validation

**Test Steps:**
1. Mock AI to return invalid syntax
2. Run refactor
3. Verify rollback happens

**Expected Result:**
- ✅ Detects invalid syntax
- ✅ Shows error
- ✅ Restores from backup
- ✅ Original file unchanged

---

## 🎯 Test 10: Single-File Warning

**Test Steps:**
1. Run refactor
2. Verify warning shows

**Expected Result:**
- ✅ Shows "⚠️ Single-file refactoring mode"
- ✅ Shows "Changes may affect other files"
- ✅ Shows "Please run your tests"

---

## 📊 Test Results Template

```
Test: [Name]
Status: ✅ PASS / ❌ FAIL
Time: [seconds]
Notes: [observations]
Bugs Found: [list]
```

---

## 🐛 Bug Tracking

**Bugs Found:**
1. [Bug description]
   - Severity: HIGH/MEDIUM/LOW
   - Steps to reproduce
   - Expected vs Actual
   - Fix: [description]

---

## ✅ Success Criteria

**Phase 2 passes testing if:**
- ✅ All real file tests pass
- ✅ All error scenarios handled gracefully
- ✅ No crashes
- ✅ Performance < 30 seconds per file
- ✅ All features work as designed
- ✅ Backup/rollback works 100%
- ✅ UI is clear and intuitive

---

**Next:** Execute tests and document results
