# Phase 2: Code Refactoring - TODO

## ✅ Planning Complete

- [x] Feature design completed
- [x] Documentation created (README.md)
- [x] Implementation plan defined
- [x] User flow designed
- [x] Commands defined (--perf, --read, --best, --design)
- [x] Interactive mode selection designed
- [x] Preview system designed

---

## 📅 Week 1: Core Implementation (Ready to Start)

### Day 1: CodeAnalyzer Module
- [x] Create `src/codeAnalyzer.js` file
- [x] Implement `analyzeFile()` function
- [x] Add code metrics functions:
  - [x] `getComplexity(code)`
  - [x] `getLineCount(code)`
  - [x] `getFunctionCount(code)`
- [x] Add code smell detection:
  - [x] `findLongFunctions(code)`
  - [x] `findDuplicateCode(code)`
  - [x] `findComplexConditions(code)`
- [x] Add context extraction:
  - [x] `getCodeContext(code, startLine, endLine)`
- [x] Write unit tests
- [x] Test with sample Python files
- [ ] Test with sample JavaScript files

---

### Day 2: CodeRefactorer Module Core
- [x] Create `src/codeRefactorer.js` file
- [x] Implement constructor with options
- [x] Create AI prompt templates:
  - [x] Performance refactoring prompt
  - [x] Readability refactoring prompt
  - [x] Best practices prompt
- [x] Implement `getSuggestions()` function
- [x] Add response parsing and validation
- [x] Handle JSON parsing errors
- [x] Add suggestion filtering by impact
- [x] Write unit tests
- [x] Test with mock AI responses

---

### Day 3: Refactoring Application Logic
- [x] Implement `applyRefactorings()` function
- [x] Add indentation preservation logic
- [x] Implement line replacement logic
- [x] Add syntax validation after changes
- [x] Create backup before applying
- [x] Implement rollback mechanism (using existing BackupManager)
- [x] Add transaction pattern:
  - [x] `begin()` - create backup (using BackupManager)
  - [x] `commit()` - remove backup (BackupManager has this)
  - [x] `rollback()` - restore from backup (BackupManager has this)
- [ ] Write integration tests
- [ ] Test with real code files

---

### Day 4: RefactoringUI Module
- [x] Create `src/refactoringUI.js` file
- [x] Implement `showSuggestions()` function
- [x] Add interactive selection with inquirer
- [x] Implement `showPreview()` function:
  - [x] Show before code (red)
  - [x] Show after code (green)
  - [x] Show impact and reasoning
- [x] Add `confirmApply()` function
- [x] Add progress indicators
- [x] Implement `showResults()` function
- [ ] Test UI flows manually
- [ ] Ensure consistent with Phase 1 UI style

---

### Day 5: CLI Integration
- [x] Add `refactor` command to `bin/docai.js`
- [x] Create `src/refactorCommand.js` file
- [x] Implement interactive mode selection (if no flags)
- [x] Implement main workflow:
  - [x] Mode selection prompt
  - [x] File discovery
  - [x] Code analysis
  - [x] Get suggestions (filtered by mode)
  - [x] User selection
  - [x] Preview (always shown)
  - [x] User confirmation
  - [x] Apply changes
- [x] Add command options:
  - [x] `--perf` (performance mode)
  - [x] `--read` (readability mode)
  - [x] `--best` (best practices mode)
  - [x] `--design` (design patterns mode)
  - [x] `--explain` (detailed explanations)
  - [x] `--min-impact <level>` (filter by impact)
- [x] Add error handling
- [ ] Test end-to-end workflow
- [ ] Test mode selection prompt
- [ ] Test with different mode flags

---

## 📅 Week 2: Testing & Polish

### Day 6: Testing & Bug Fixes
- [ ] Test with real Python files
- [ ] Test with real JavaScript files
- [ ] Test with real TypeScript files
- [ ] Test error scenarios:
  - [ ] Syntax errors in code
  - [ ] Invalid AI responses
  - [ ] File permission errors
  - [ ] Large files (>1000 lines)
- [ ] Fix discovered bugs
- [ ] Optimize AI prompts based on results
- [ ] Improve suggestion quality
- [ ] Performance testing
- [ ] Memory usage testing

---

### Day 7: Documentation & Examples
- [ ] Update main README.md
- [ ] Add refactor command documentation
- [ ] Create usage examples
- [ ] Add troubleshooting guide
- [ ] Document configuration options
- [ ] Create tutorial/walkthrough
- [ ] Update CHANGELOG.md
- [ ] Write release notes

---

## 🎯 Completion Criteria

- [ ] All 7 days of tasks completed
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Documentation complete
- [ ] User can successfully refactor code
- [ ] No breaking changes to existing features

---

**Status:** Planning complete, ready for implementation  
**Last Updated:** October 2, 2025
