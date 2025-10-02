# DocAI New Features - TODO

## 🎯 Overview
Adding three new major features to DocAI:
1. **Code Refactoring** - AI-powered code improvement suggestions
2. **Bug Fixing** - AI-powered bug detection and fixes
3. **AI Chat** - Interactive conversation with AI about code

---

## 📋 Feature 1: Code Refactoring (`docai refactor`)

### Requirements
- [ ] Analyze code and suggest improvements
- [ ] Show multiple refactoring options
- [ ] Allow user to select which refactorings to apply
- [ ] Support different refactoring types:
  - [ ] Performance optimization
  - [ ] Code simplification
  - [ ] Best practices
  - [ ] Design patterns
  - [ ] Naming improvements

### Implementation Tasks
- [ ] Create `src/codeRefactorer.js` module
- [ ] Add `refactor` command to CLI
- [ ] Implement code analysis with AI
- [ ] Create interactive selection UI
- [ ] Add preview before applying changes
- [ ] Support multiple files
- [ ] Add backup before refactoring

### CLI Usage
```bash
# Refactor a specific file
docai refactor ./src/utils.py

# Refactor with specific focus
docai refactor ./src/utils.py --focus performance

# Interactive mode with explanations
docai refactor ./src/utils.py --explain
```

---

## 📋 Feature 2: Bug Fixing (`docai fixbug`)

### Requirements
- [ ] Detect potential bugs in code
- [ ] Explain what the bug is
- [ ] Suggest fixes with explanations
- [ ] Allow user to choose which fixes to apply
- [ ] Support different bug categories:
  - [ ] Syntax errors
  - [ ] Logic errors
  - [ ] Type errors
  - [ ] Security issues
  - [ ] Performance issues

### Implementation Tasks
- [ ] Create `src/bugFixer.js` module
- [ ] Add `fixbug` command to CLI
- [ ] Implement bug detection with AI
- [ ] Create bug explanation system
- [ ] Add fix suggestion UI
- [ ] Implement fix application
- [ ] Add testing recommendations

### CLI Usage
```bash
# Analyze and fix bugs
docai fixbug ./src/utils.py

# Show only specific bug types
docai fixbug ./src/utils.py --type security

# Explain bugs without fixing
docai fixbug ./src/utils.py --explain-only
```

---

## 📋 Feature 3: AI Chat (`docai chat`)

### Requirements
- [ ] Interactive chat session with AI
- [ ] Context-aware about current file/project
- [ ] Support multiple conversation modes:
  - [ ] Ask questions about code
  - [ ] Get explanations
  - [ ] Request code examples
  - [ ] Discuss best practices
- [ ] Maintain conversation history
- [ ] Allow code snippets in chat

### Implementation Tasks
- [ ] Create `src/aiChat.js` module
- [ ] Add `chat` command to CLI
- [ ] Implement conversation loop
- [ ] Add context loading (file content)
- [ ] Create chat UI with history
- [ ] Add code highlighting in responses
- [ ] Support multi-turn conversations
- [ ] Add exit/save conversation options

### CLI Usage
```bash
# Start chat session
docai chat

# Chat about specific file
docai chat ./src/utils.py

# Chat with context from multiple files
docai chat ./src/**/*.py
```

---

## 🏗️ Architecture

### New Modules Structure
```
src/
├── codeRefactorer.js      # Refactoring logic
├── bugFixer.js            # Bug detection and fixing
├── aiChat.js              # Interactive chat
├── codeAnalyzer.js        # Shared code analysis utilities
└── conversationManager.js # Chat history and context
```

### Shared Components
- [ ] Create `src/codeAnalyzer.js` for common analysis
- [ ] Create `src/conversationManager.js` for chat history
- [ ] Extend `aiProviderFactory.js` for longer conversations
- [ ] Add new prompt templates

---

## 🎨 User Experience Flow

### Refactor Flow
1. User runs `docai refactor file.py`
2. AI analyzes code
3. Show list of refactoring suggestions:
   ```
   📝 Refactoring Suggestions for utils.py
   
   1. [Performance] Use list comprehension instead of loop
      Line 15-20
      Impact: 2x faster
   
   2. [Readability] Extract complex condition to function
      Line 45
      Impact: Easier to understand
   
   3. [Best Practice] Use context manager for file handling
      Line 60-65
      Impact: Better resource management
   
   ? Which refactorings would you like to apply?
   ❯ ◉ 1. Performance improvement
     ◯ 2. Readability improvement
     ◉ 3. Best practice
     ─────
     Apply selected (2)
   ```
4. Show preview of changes
5. Apply selected refactorings

### Bug Fix Flow
1. User runs `docai fixbug file.py`
2. AI detects bugs
3. Show bugs with explanations:
   ```
   🐛 Bugs Found in utils.py
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Bug #1: Potential IndexError [CRITICAL]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Line 25: result = items[index]
   
   Problem:
   No bounds checking before accessing list. If 'index' is 
   greater than list length, this will crash.
   
   Suggested Fix:
   if index < len(items):
       result = items[index]
   else:
       result = None
   
   ? Apply this fix? (Y/n)
   ```
4. User selects fixes to apply
5. Apply fixes with backup

### Chat Flow
1. User runs `docai chat file.py`
2. Enter chat mode:
   ```
   💬 DocAI Chat - Type 'exit' to quit
   
   Context: utils.py loaded (150 lines)
   
   You: What does the longest_unique_substring function do?
   
   AI: The function finds the longest substring without 
       repeating characters using a sliding window technique...
   
   You: Can you show me a better way to implement this?
   
   AI: Here's an optimized version using...
   
   You: exit
   
   💾 Save conversation? (Y/n)
   ```

---

## 🔧 Configuration

Add to `.docaiConfig.json`:
```json
{
  "refactor": {
    "autoBackup": true,
    "focusAreas": ["performance", "readability", "best-practices"],
    "minImpact": "medium"
  },
  "fixbug": {
    "autoBackup": true,
    "severity": ["critical", "high", "medium"],
    "autoFix": false
  },
  "chat": {
    "saveHistory": true,
    "maxContext": 5000,
    "temperature": 0.7
  }
}
```

---

## 🧪 Testing Plan

### Refactor Tests
- [ ] Test performance refactoring suggestions
- [ ] Test readability improvements
- [ ] Test with different languages (Python, JS, TS)
- [ ] Test preview system
- [ ] Test backup and rollback

### Bug Fix Tests
- [ ] Test syntax error detection
- [ ] Test logic error detection
- [ ] Test security issue detection
- [ ] Test fix application
- [ ] Test with intentionally buggy code

### Chat Tests
- [ ] Test basic Q&A
- [ ] Test code explanation
- [ ] Test multi-turn conversation
- [ ] Test context awareness
- [ ] Test conversation save/load

---

## 📅 Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create base modules
- [ ] Add CLI commands
- [ ] Set up AI prompts

### Phase 2: Refactor Feature (Week 2)
- [ ] Implement code analysis
- [ ] Create suggestion system
- [ ] Add interactive UI
- [ ] Test and refine

### Phase 3: Bug Fix Feature (Week 3)
- [ ] Implement bug detection
- [ ] Create fix suggestion system
- [ ] Add explanation UI
- [ ] Test and refine

### Phase 4: Chat Feature (Week 4)
- [ ] Implement chat loop
- [ ] Add context management
- [ ] Create conversation UI
- [ ] Test and refine

### Phase 5: Integration & Polish (Week 5)
- [ ] Integration testing
- [ ] Documentation
- [ ] Performance optimization
- [ ] User feedback

---

## 🎯 Success Criteria

- [ ] All three features working end-to-end
- [ ] Clean, intuitive UI for each feature
- [ ] Comprehensive error handling
- [ ] Good test coverage (>80%)
- [ ] Updated documentation
- [ ] Positive user feedback

---

## 📝 Notes

- All features should maintain the clean, simple UI we established
- Use the same AI provider system (Gemini/HuggingFace)
- Keep backup/restore functionality consistent
- Maintain verbose/compact mode options
- Follow existing code style and patterns

---

## 🚀 Future Enhancements

- [ ] Code review mode
- [ ] Performance profiling
- [ ] Security audit
- [ ] Code complexity analysis
- [ ] Automated testing generation
- [ ] Code migration tools
