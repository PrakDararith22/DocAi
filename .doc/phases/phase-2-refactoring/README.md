# Phase 2: Code Refactoring

## 🔄 Status: IN PROGRESS

**Duration:** 2 weeks (estimated)  
**Start Date:** October 2, 2025  
**Completion:** 0%

---

## 🎯 Overview

AI-powered code refactoring with intelligent suggestions for performance, readability, and best practices.

---

## ✨ Features to Build

### Core Features
- [ ] **Code Analysis**
  - Analyze code structure
  - Identify improvement opportunities
  - Calculate complexity metrics

- [ ] **AI-Powered Suggestions**
  - Performance optimizations
  - Readability improvements
  - Best practice recommendations
  - Design pattern suggestions
  - Naming improvements

- [ ] **Interactive Selection**
  - Review all suggestions
  - Select which to apply
  - See impact levels
  - Understand reasoning

- [ ] **Preview System**
  - Before/after comparison
  - Color-coded diff
  - Line-by-line changes
  - Impact assessment

- [ ] **Safe Application**
  - Backup before changes
  - Validate syntax
  - Preserve formatting
  - Rollback capability

---

## 📦 Commands (Planned)

```bash
# Basic refactoring (prompts for mode selection)
docai refactor [path]
# → Shows interactive menu to select focus mode

# Focus modes (short flags, skip the prompt)
docai refactor --perf [path]        # Performance optimizations only
docai refactor --read [path]        # Readability improvements only
docai refactor --best [path]        # Best practices only
docai refactor --design [path]      # Design patterns only

# With detailed explanations
docai refactor --explain [path]
docai refactor --perf --explain [path]
```

**Notes:** 
- If no mode flag is provided, you'll be prompted to select one interactively
- Preview is ALWAYS shown before applying changes
- You ALWAYS confirm before changes are applied
- You can combine multiple mode flags (e.g., `--perf --read`)

---

## 📁 Documentation

- `README.md` - This file (overview + plan + criteria)
- `TODO.md` - Task checklist

---

## 🗓️ Schedule

### Week 1: Core Implementation
- **Day 1:** CodeAnalyzer module
- **Day 2:** CodeRefactorer module core
- **Day 3:** Refactoring application logic
- **Day 4:** RefactoringUI module
- **Day 5:** CLI integration

### Week 2: Testing & Polish
- **Day 6:** Testing and bug fixes
- **Day 7:** Documentation and examples

---

## 🎯 Success Criteria

- [ ] Successfully refactors Python, JavaScript, TypeScript files (priority)
- [ ] Supports other languages (lower priority)
- [ ] Generates 3-5 relevant suggestions per file
- [ ] File size limit: 1,000 lines or under
- [ ] Single-file refactoring (multi-file in Phase 3)
- [ ] Clean, intuitive UI (matching Phase 1 style)
- [ ] No breaking changes to code functionality
- [ ] Backup/rollback works 100% of time
- [ ] Preview is clear and accurate
- [ ] Performance: < 30 seconds per file
- [ ] User satisfaction: Positive feedback

---

## 🏗️ Architecture

### New Modules
```
src/
├── codeAnalyzer.js       # Code analysis utilities
├── codeRefactorer.js     # Main refactoring logic
├── refactoringUI.js      # Interactive UI
└── refactorCommand.js    # CLI command handler
```

### Reused Components
- AI Provider Factory (from Phase 1)
- Backup Manager (from Phase 1)
- File Modifier (from Phase 1)
- Error Manager (from Phase 1)
- Progress Manager (from Phase 1)

---

## 📊 Current Progress

**Overall:** 0% Complete

### Completed
- [x] Planning and design
- [x] Folder structure created
- [x] Documentation setup

### In Progress
- [ ] CodeAnalyzer module

### Not Started
- [ ] CodeRefactorer module
- [ ] RefactoringUI module
- [ ] CLI integration
- [ ] Testing

---

## 🔄 Feature Flow

### How It Works (Step-by-Step)

```
User runs: docai refactor ./src/utils.py
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Mode Selection (if no flags provided)          │
│                                                         │
│ ? Select refactoring focus:                            │
│   ◯ All types (performance, readability, best practices)│
│   ◯ Performance optimizations only                     │
│   ◯ Readability improvements only                      │
│   ◯ Best practices only                                │
│   ◯ Design patterns only                               │
│                                                         │
│ User selects: Performance optimizations                │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: File Discovery                                 │
│ - Find Python/JS/TS files                              │
│ - Validate file access                                 │
│ - Show: "📁 Processing 1 file..."                      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Code Analysis (CodeAnalyzer)                   │
│ - Read file content                                    │
│ - Parse code structure                                 │
│ - Calculate metrics (complexity, lines, functions)     │
│ - Identify code smells                                 │
│ - Show: "🔍 Analyzing code..."                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: AI Suggestions (CodeRefactorer)                │
│ - Send code + context + selected mode to AI            │
│ - AI analyzes and suggests improvements                │
│ - Parse AI response (JSON format)                      │
│ - Filter by impact level and selected mode             │
│ - Show: "🤖 Generating suggestions..."                 │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 5: Show Suggestions (RefactoringUI)               │
│                                                         │
│ 📝 Refactoring Suggestions for utils.py                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│ [1] Performance: Use list comprehension                │
│     Lines 15-20 | Impact: HIGH                         │
│     Current: for loop with append                      │
│     Improved: [x*2 for x in items]                     │
│     ⚡ 2x faster                                        │
│                                                         │
│ [2] Readability: Extract function                      │
│     Line 45 | Impact: MEDIUM                           │
│     Current: complex if condition                      │
│     Improved: if is_eligible_user(user)                │
│     📖 Clearer intent                                   │
│                                                         │
│ ? Select refactorings to apply:                        │
│   ◉ [1] Performance improvement                        │
│   ◯ [2] Readability improvement                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 6: User Selection (Interactive)                   │
│ - User selects which suggestions to apply              │
│ - Can select multiple                                  │
│ - Can skip all                                         │
│ - Show: Selected 1 of 2 suggestions                    │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 7: Preview Changes (RefactoringUI)                │
│                                                         │
│ Before (lines 15-20):                                  │
│   - result = []                                        │
│   - for item in items:                                 │
│   -     result.append(item * 2)                        │
│                                                         │
│ After (lines 15-16):                                   │
│   + result = [item * 2 for item in items]             │
│                                                         │
│ ? Apply this change? (Y/n)                             │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 8: Create Backup (BackupManager)                  │
│ - Copy original file to .backup                        │
│ - Store timestamp                                      │
│ - Show: "💾 Backup created"                            │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 9: Apply Changes (CodeRefactorer)                 │
│ - Read original file                                   │
│ - Replace lines with refactored code                   │
│ - Preserve indentation                                 │
│ - Validate syntax                                      │
│ - Write to file                                        │
│ - Show: "✅ Applied 1 refactoring"                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 10: Show Results (RefactoringUI)                  │
│                                                         │
│ ✅ Success! 1 refactoring applied                      │
│                                                         │
│ Changes:                                               │
│ • Performance improvement (lines 15-20)                │
│                                                         │
│ 💡 Tip: Run your tests to verify changes               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Module Interactions

```
User Command (CLI)
       ↓
refactorCommand.js ────────────────────────┐
       ↓                                    │
       ├──→ FileDiscovery                  │
       │    (find files)                   │
       │                                    │
       ├──→ CodeAnalyzer ──────────────────┤
       │    (analyze code)                 │
       │                                    │
       ├──→ CodeRefactorer ────────────────┤
       │    ├─→ AI Provider (get suggestions)
       │    └─→ BackupManager (create backup)
       │                                    │
       ├──→ RefactoringUI ─────────────────┤
       │    (show suggestions, get user input)
       │                                    │
       └──→ CodeRefactorer ────────────────┘
            (apply changes)
```

### Data Flow

```
1. INPUT
   File: utils.py
   Options: { focus: 'performance' }
        ↓
2. ANALYSIS
   Code Metrics: {
     complexity: 8,
     lines: 150,
     functions: 5,
     smells: ['long_function', 'duplicate_code']
   }
        ↓
3. AI REQUEST
   Prompt: "Analyze this Python code..."
   Context: Code + metrics + focus areas
        ↓
4. AI RESPONSE
   Suggestions: [
     {
       id: 1,
       type: 'performance',
       title: 'Use list comprehension',
       lineStart: 15,
       lineEnd: 20,
       originalCode: '...',
       refactoredCode: '...',
       impact: 'high'
     }
   ]
        ↓
5. USER SELECTION
   Selected: [suggestion #1]
        ↓
6. BACKUP
   Backup file: utils.py.backup-20251002-100630
        ↓
7. APPLY
   Modified file: utils.py (with changes)
        ↓
8. OUTPUT
   Result: {
     applied: 1,
     skipped: 1,
     failed: 0
   }
```

---

## 📋 Implementation Plan

### ✅ Prerequisites Check
- [x] Existing AI provider system (Gemini/HuggingFace) ✓
- [x] Backup system in place ✓
- [x] Preview system exists ✓
- [x] Interactive UI components available ✓
- [x] File modification system ready ✓
- [x] Error handling framework ✓

### ⚠️ Potential Issues & Solutions

1. **AI Response Format**
   - Issue: AI might return unstructured text
   - Solution: Use strict JSON prompts with validation

2. **Code Parsing**
   - Issue: Must preserve exact formatting and indentation
   - Solution: Track indentation, use AST, validate syntax

3. **Multi-file Support**
   - Issue: Refactoring one file might break others
   - Solution: Start with single-file, warn about dependencies

4. **Preview System**
   - Issue: Need clear before/after comparison
   - Solution: Color-coded diff display (red/green)

5. **Rollback**
   - Issue: Must undo all changes if needed
   - Solution: Backup system + transaction pattern

---

### Step 1: CodeAnalyzer Module
**File:** `src/codeAnalyzer.js`

**Purpose:** Shared utilities for analyzing code structure

**Class Structure:**
```javascript
class CodeAnalyzer {
  // Read and parse file
  async analyzeFile(filePath)
  
  // Extract code metrics
  getComplexity(code)
  getLineCount(code)
  getFunctionCount(code)
  
  // Identify code smells
  findLongFunctions(code)
  findDuplicateCode(code)
  findComplexConditions(code)
  
  // Get context for AI
  getCodeContext(code, startLine, endLine)
}
```

**Dependencies:**
- Existing `pythonParser.js` and `jsParser.js`
- File system utilities
- AST parsing libraries

---

### Step 2: CodeRefactorer Module
**File:** `src/codeRefactorer.js`

**Purpose:** Main refactoring logic and AI interaction

**Class Structure:**
```javascript
class CodeRefactorer {
  constructor(options) {
    this.options = options
    this.aiProvider = createAIProvider(options)
    this.analyzer = new CodeAnalyzer(options)
    this.backupManager = new BackupManager(options)
  }
  
  // Main entry point
  async refactorFile(filePath, focusAreas = [])
  
  // Get refactoring suggestions from AI
  async getSuggestions(code, language, focusAreas)
  
  // Apply selected refactorings
  async applyRefactorings(filePath, selectedSuggestions)
  
  // Preview changes
  async previewChanges(original, refactored)
  
  // Validate refactored code
  async validateCode(code, language)
}
```

**AI Prompt Template:**
```javascript
const REFACTOR_PROMPT = `
Analyze this ${language} code and suggest refactorings.

Code:
\`\`\`${language}
${code}
\`\`\`

Focus areas: ${focusAreas.join(', ')}

Provide suggestions in JSON format:
{
  "suggestions": [
    {
      "id": 1,
      "type": "performance|readability|best-practice",
      "title": "Short description",
      "description": "Detailed explanation",
      "impact": "high|medium|low",
      "lineStart": 10,
      "lineEnd": 15,
      "originalCode": "...",
      "refactoredCode": "...",
      "reason": "Why this improves the code"
    }
  ]
}
`
```

---

### Step 3: RefactoringUI Module
**File:** `src/refactoringUI.js`

**Purpose:** Interactive UI for selecting and previewing refactorings

**Functions:**
```javascript
class RefactoringUI {
  // Show list of suggestions
  async showSuggestions(suggestions)
  
  // Let user select which to apply
  async selectRefactorings(suggestions)
  
  // Show before/after preview
  async showPreview(original, refactored, changes)
  
  // Confirm application
  async confirmApply(selectedCount)
  
  // Show progress
  showProgress(current, total)
  
  // Show results
  showResults(applied, skipped, failed)
}
```

**UI Design:**
```
📝 Refactoring Suggestions for utils.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] Performance: Use list comprehension
    Lines 15-20 | Impact: HIGH
    
    Current:
    result = []
    for item in items:
        result.append(item * 2)
    
    Improved:
    result = [item * 2 for item in items]
    
    ⚡ 2x faster, more Pythonic

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Select refactorings to apply:
  ◉ [1] Performance improvement
  ◯ [2] Readability improvement
  ─────────────────────────────
  Apply 1 selected refactoring
```

---

### Step 4: CLI Command
**File:** `bin/docai.js`

**New Command:**
```javascript
program
  .command('refactor')
  .description('Analyze and refactor code with AI suggestions')
  .argument('[path]', 'File or directory to refactor', './src/')
  .option('--perf', 'Focus on performance optimizations only')
  .option('--read', 'Focus on readability improvements only')
  .option('--best', 'Focus on best practices only')
  .option('--design', 'Focus on design patterns only')
  .option('--explain', 'Show detailed explanations for each suggestion')
  .option('--no-backup', 'Skip creating backup files')
  .option('--min-impact <level>', 'Minimum impact level (high,medium,low)', 'medium')
  .action(async (path, options) => {
    const inquirer = require('inquirer');
    
    // Map short flags to focus areas
    const focusAreas = [];
    if (options.perf) focusAreas.push('performance');
    if (options.read) focusAreas.push('readability');
    if (options.best) focusAreas.push('best-practices');
    if (options.design) focusAreas.push('design-patterns');
    
    // If no focus mode specified, prompt user to select
    if (focusAreas.length === 0) {
      const { selectedMode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedMode',
          message: 'Select refactoring focus:',
          choices: [
            { name: 'All types (performance, readability, best practices)', value: 'all' },
            { name: 'Performance optimizations only', value: 'performance' },
            { name: 'Readability improvements only', value: 'readability' },
            { name: 'Best practices only', value: 'best-practices' },
            { name: 'Design patterns only', value: 'design-patterns' }
          ],
          default: 'all'
        }
      ]);
      
      options.focusAreas = selectedMode === 'all' ? ['all'] : [selectedMode];
    } else {
      options.focusAreas = focusAreas;
    }
    
    const { refactorCode } = require('../src/refactorCommand');
    await refactorCode(path, options);
  });
```

---

### Step 5: Command Handler
**File:** `src/refactorCommand.js`

**Main Function:**
```javascript
async function refactorCode(filePath, cliOptions) {
  // 1. Resolve configuration
  const options = await resolveOptions(cliOptions);
  
  // 2. Initialize components
  const refactorer = new CodeRefactorer(options);
  const ui = new RefactoringUI(options);
  
  // 3. Discover files
  const files = await discoverFiles(filePath);
  
  // 4. For each file:
  for (const file of files) {
    // 4.1 Analyze code
    const code = await fs.readFile(file.path, 'utf-8');
    
    // 4.2 Get suggestions
    const suggestions = await refactorer.getSuggestions(
      code, 
      file.language, 
      options.focusAreas
    );
    
    // 4.3 Show suggestions and let user select
    const selected = await ui.selectRefactorings(suggestions);
    
    // 4.4 Preview changes
    if (selected.length > 0) {
      const preview = await refactorer.previewChanges(file, selected);
      await ui.showPreview(preview);
      
      // 4.5 Confirm and apply
      const confirmed = await ui.confirmApply(selected.length);
      if (confirmed) {
        await refactorer.applyRefactorings(file.path, selected);
      }
    }
  }
  
  // 5. Show final results
  ui.showResults(results);
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// Test code analyzer
describe('CodeAnalyzer', () => {
  test('analyzes Python file correctly', async () => {
    const analyzer = new CodeAnalyzer();
    const result = await analyzer.analyzeFile('test.py');
    expect(result.language).toBe('python');
    expect(result.functionCount).toBeGreaterThan(0);
  });
});

// Test refactoring suggestions
describe('CodeRefactorer', () => {
  test('generates valid suggestions', async () => {
    const refactorer = new CodeRefactorer(options);
    const suggestions = await refactorer.getSuggestions(code, 'python', ['performance']);
    expect(suggestions).toHaveLength(greaterThan(0));
    expect(suggestions[0]).toHaveProperty('refactoredCode');
  });
});
```

### Manual Testing Checklist
- [ ] Test with Python files
- [ ] Test with JavaScript files
- [ ] Test with TypeScript files
- [ ] Test with syntax errors
- [ ] Test with very large files
- [ ] Test with no suggestions
- [ ] Test backup and rollback
- [ ] Test cancellation
- [ ] Test preview mode
- [ ] Test auto mode

---

## 🚨 Risk Mitigation

### Risk 1: AI generates invalid code
**Mitigation:**
- Always validate refactored code with linter/parser
- Show preview before applying
- Keep backup of original
- Allow easy rollback

### Risk 2: Breaking code functionality
**Mitigation:**
- Encourage users to run tests after refactoring
- Add warning about testing
- Suggest version control
- Provide detailed diff

### Risk 3: Performance issues with large files
**Mitigation:**
- Limit file size (max 10,000 lines)
- Process in chunks
- Show progress indicator
- Allow cancellation

---

## 🎯 MVP Scope (First Release)

**Must Have:**
- [ ] Analyze single Python file
- [ ] Generate 3-5 refactoring suggestions
- [ ] Interactive selection
- [ ] Preview changes
- [ ] Apply selected refactorings
- [ ] Backup before changes
- [ ] Basic error handling

**Nice to Have:**
- [ ] Multiple file support
- [ ] JavaScript/TypeScript support
- [ ] Custom focus areas
- [ ] Auto mode
- [ ] Detailed explanations

**Future:**
- [ ] Batch refactoring
- [ ] Custom rules
- [ ] Team presets
- [ ] CI/CD integration
- [ ] Refactoring history

---

## 🚀 Next Steps

1. Check `TODO.md` for tasks
2. Start Day 1: CodeAnalyzer module
3. Follow implementation plan above
4. Mark tasks complete in `TODO.md`

---

## 📝 Notes

- Follow Phase 1 UI principles (clean, simple)
- Reuse existing components where possible
- Maintain consistent command structure
- Keep verbose/compact mode options
- Ensure backward compatibility

---

**Previous Phase:** [Phase 1 - Documentation](../phase-1-documentation/)  
**Next Phase:** [Phase 3 - Bug Fixing](../phase-3-bugfixing/)
