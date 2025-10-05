# DocAI Chat Commands

## Quick Start

Start the interactive chat mode:
```bash
docai chat
```

## Documentation Commands

| Command | Description |
|---------|-------------|
| `/docs <pattern>` | Load files for documentation |
| `/scan` | Scan loaded files for functions/classes |
| `/generate` | Generate docs for all functions/classes |
| `/gen` | Alias for /generate |
| `/preview` | Preview generated documentation |
| `/apply` | Apply pending changes to files |
| `/rollback` | Rollback recent changes |
| `/status` | Show session status and statistics |
| `/clear` | Clear session data |
| `/help` | Show command help |

## Basic Workflow

```bash
# 1. Start chat
docai chat

# 2. Load files for documentation
/docs "./src/**/*.py"

# 3. Scan for functions and classes
/scan

# 4. Generate documentation
/generate

# 5. Preview the changes
/preview

# 6. Apply changes to files
/apply
```

## Examples

### Load Python files
```bash
/docs "./src/**/*.py"
/docs "./utils.py" "./main.py"
```

### Load JavaScript files
```bash
/docs "./src/**/*.js"
/docs "./**/*.{js,ts}"
```

### Generate and apply docs
```bash
/generate
/preview
/apply
```

### Check status
```bash
/status
```

### Rollback if needed
```bash
/rollback
```

## Chat Commands (Non-Documentation)

| Command | Description |
|---------|-------------|
| `/load <file>` | Load file into chat context |
| `/files` | Show loaded files |
| `/apply` | Apply code changes to file |
| `/insert` | Insert code at line number |
| `/append` | Append code to end of file |
| `/exit` | Exit chat |

## Code Generation Modes

### 1. **Smart Apply** (`/apply`)
- Automatically detects if code is a new function and appends it
- Replaces entire content for modifications
- **Writes directly to file**
- Best for general use

### 2. **Precise Insert** (`/insert`)
- Insert code at a specific line number
- Prompts for exact insertion point
- **Writes directly to file**
- Best for adding code in the middle of files

### 3. **Simple Append** (`/append`)
- Always adds code to the end of the file
- **Writes directly to file**
- Best for adding new functions/classes

The system integrates AI-powered documentation generation with DocAI's existing capabilities.
