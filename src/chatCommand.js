const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const { createAIProvider } = require('./aiProviderFactory');
const { resolveOptions } = require('./config');
const DocumentationGenerator = require('./documentationGenerator');
const ParserManager = require('./parserManager');
const FileDiscovery = require('./fileDiscovery');
const BackupManager = require('./backupManager');
const FileModifier = require('./fileModifier');

/**
 * Interactive Chat Command for Code Generation and Modification
 */
class ChatSession {
  constructor(options = {}) {
    this.options = options;
    this.aiProvider = createAIProvider(options);
    this.loadedFiles = new Map(); // filename -> content
    this.chatHistory = [];
    this.verbose = options.verbose || false;
    this.docGenerator = new DocumentationGenerator(options);
    this.parserManager = new ParserManager(options);
    this.fileDiscovery = new FileDiscovery(options);
    this.backupManager = new BackupManager(options);
    this.fileModifier = new FileModifier(options);
  }

  async checkAPIKey() {
    const apiKey = process.env.GOOGLE_API_KEY || this.options.gemini_api_key;
    
    if (!apiKey) {
      console.log(chalk.red.bold('\n❌ No API key found!\n'));
      console.log(chalk.yellow('DocAI requires a Google Gemini API key to work properly.'));
      console.log(chalk.gray('\nTo get your API key:'));
      console.log(chalk.gray('1. Go to https://aistudio.google.com/app/apikey'));
      console.log(chalk.gray('2. Create a new API key'));
      console.log(chalk.gray('3. Set it as an environment variable:'));
      console.log(chalk.cyan('   export GOOGLE_API_KEY="your_api_key_here"\n'));
      
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Enter API key now', value: 'enter' },
          { name: 'Exit and set environment variable', value: 'exit' },
          { name: 'Continue with limited functionality', value: 'continue' }
        ]
      }]);

      if (action === 'enter') {
        const { apiKeyInput } = await inquirer.prompt([{
          type: 'password',
          name: 'apiKeyInput',
          message: 'Enter your Google Gemini API key:',
          validate: (input) => input.trim().length > 0 || 'API key is required'
        }]);
        
        process.env.GOOGLE_API_KEY = apiKeyInput.trim();
        this.options.gemini_api_key = apiKeyInput.trim();
        
        // Recreate AI provider with new key
        this.aiProvider = createAIProvider(this.options);
        this.docGenerator = new DocumentationGenerator(this.options);
        
        console.log(chalk.green('✅ API key set! Testing connection...'));
        
        // Test the connection
        const testResult = await this.aiProvider.testConnection();
        if (testResult.success) {
          console.log(chalk.green('✅ Connection successful!'));
        } else {
          console.log(chalk.red(`❌ Connection failed: ${testResult.message}`));
          console.log(chalk.yellow('Continuing with limited functionality...'));
        }
      } else if (action === 'exit') {
        console.log(chalk.gray('\nSet your API key and run DocAI again:'));
        console.log(chalk.cyan('export GOOGLE_API_KEY="your_key"'));
        console.log(chalk.cyan('npx docai\n'));
        process.exit(0);
      } else {
        console.log(chalk.yellow('⚠️  Continuing with limited functionality (local code generation only)'));
      }
    } else {
      // Test existing API key
      console.log(chalk.gray('🔍 Testing API connection...'));
      const testResult = await this.aiProvider.testConnection();
      if (testResult.success) {
        console.log(chalk.green('✅ API connection successful!'));
      } else {
        console.log(chalk.red(`❌ API connection failed: ${testResult.message}`));
        console.log(chalk.yellow('Continuing with limited functionality...'));
      }
    }
  }

  async start() {
    // Check API key first
    await this.checkAPIKey();
    
    console.log(chalk.blue.bold('\n💬 DocAI Interactive Chat\n'));
    console.log(chalk.gray('🔧 Code Operations:'));
    console.log(chalk.gray('  /load <file>     - Load file into context'));
    console.log(chalk.gray('  /files           - Show loaded files'));
    console.log(chalk.gray('  /apply           - Apply AI suggestions to file'));
    console.log(chalk.gray('  /insert          - Insert code at line number'));
    console.log(chalk.gray('  /append          - Append code to end of file'));
    console.log(chalk.gray(''));
    console.log(chalk.gray('📚 Documentation:'));
    console.log(chalk.gray('  /docs <pattern>  - Generate docs for files'));
    console.log(chalk.gray('  /scan            - Scan loaded files for functions/classes'));
    console.log(chalk.gray('  /generate        - Generate docs for all functions/classes'));
    console.log(chalk.gray(''));
    console.log(chalk.gray('🔍 Analysis:'));
    console.log(chalk.gray('  /analyze         - Analyze code quality and structure'));
    console.log(chalk.gray('  /refactor        - Get refactoring suggestions'));
    console.log(chalk.gray('  /optimize        - Get performance optimization tips'));
    console.log(chalk.gray(''));
    console.log(chalk.gray('💬 Natural Language: Just describe what you want to do!'));
    console.log(chalk.gray('   Examples: "add error handling", "optimize this function", "add docstrings"\n'));

    while (true) {
      try {
        const { input } = await inquirer.prompt([{
          type: 'input',
          name: 'input',
          message: chalk.cyan('You:'),
          validate: (input) => input.trim().length > 0 || 'Please enter a message'
        }]);

        const trimmedInput = input.trim();
        
        if (trimmedInput === '/exit') {
          console.log(chalk.yellow('\n👋 Goodbye!'));
          break;
        }

        await this.handleInput(trimmedInput);
        
      } catch (error) {
        if (error.name === 'ExitPromptError') {
          console.log(chalk.yellow('\n👋 Goodbye!'));
          break;
        }
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }
  }

  async handleInput(input) {
    // Handle commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    // Handle natural language requests
    await this.handleChatMessage(input);
  }

  async handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case '/load':
        if (args.length === 0) {
          console.log(chalk.red('Usage: /load <filename>'));
          return;
        }
        await this.loadFile(args[0]);
        break;
      case '/files':
        this.showLoadedFiles();
        break;

      case '/apply':
        await this.applyChanges();
        break;

      case '/insert':
        await this.insertCode();
        break;

      case '/append':
        await this.appendCode();
        break;

      case '/docs':
        await this.generateDocumentation();
        break;

      case '/docgen':
        await this.generateSpecificDocs(args);
        break;

      case '/analyze':
        await this.analyzeCode();
        break;

      case '/refactor':
        await this.getRefactoringSuggestions();
        break;

      case '/optimize':
        await this.getOptimizationSuggestions();
        break;

      case '/clear':
        this.chatHistory = [];
        this.loadedFiles.clear();
        console.log(chalk.green('✅ Chat history and loaded files cleared'));
        break;

      default:
        // Check if it's a documentation command
        if (['/scan', '/generate', '/gen', '/preview', '/rollback', '/status', '/help'].includes(cmd)) {
          await this.docHandler.handleCommand(cmd, args);
        } else {
          console.log(chalk.red(`Unknown command: ${cmd}`));
          console.log(chalk.gray('Type a command or describe what you want to do'));
        }
    }
  }

  async loadFile(filename) {
    try {
      const filePath = path.resolve(filename);
      const content = await fs.readFile(filePath, 'utf-8');
      this.loadedFiles.set(filename, {
        path: filePath,
        content: content,
        originalContent: content
      });
      
      console.log(chalk.green(`✅ Loaded ${filename} (${content.split('\n').length} lines)`));
      
      // Analyze the file
      const analysis = this.analyzeFile(content, filename);
      console.log(chalk.gray(`📊 ${analysis}`));
      
    } catch (error) {
      console.log(chalk.red(`❌ Failed to load ${filename}: ${error.message}`));
    }
  }

  analyzeFile(content, filename) {
    const lines = content.split('\n');
    const ext = path.extname(filename);
    
    let functions = 0;
    let classes = 0;
    let imports = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('def ')) functions++;
      if (trimmed.startsWith('class ')) classes++;
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) imports++;
    }
    
    return `${lines.length} lines, ${functions} functions, ${classes} classes, ${imports} imports`;
  }

  showLoadedFiles() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded. Use /load <filename> to load files.'));
      return;
    }

    console.log(chalk.blue('\n📁 Loaded Files:'));
    for (const [filename, fileData] of this.loadedFiles) {
      const lines = fileData.content.split('\n').length;
      const modified = fileData.content !== fileData.originalContent ? chalk.yellow(' (modified)') : '';
      console.log(chalk.gray(`  ${filename} - ${lines} lines${modified}`));
    }
    console.log('');
  }

  async handleChatMessage(message) {
    try {
      // Add user message to history
      this.chatHistory.push({ role: 'user', content: message });
      
      // Try AI first, then fallback to local generation
      let response;
      
      try {
        // Build context with loaded files
        const context = this.buildContext(message);
        
        console.log(chalk.gray('\n🤖 AI is thinking...'));
        
        // Get AI response
        response = await this.aiProvider.generateDocumentation(context);
        
        if (!response.success) {
          throw new Error(`AI provider error: ${response.error}`);
        }
      } catch (error) {
        console.log(chalk.yellow('\n⚠️  AI provider failed, using local code generation...'));
        
        // Fallback to local code generation
        response = await this.generateLocalResponse(message);
      }
      
      // Add AI response to history
      this.chatHistory.push({ role: 'assistant', content: response.text });
      
      // Display response
      console.log(chalk.green('\n🤖 Assistant:'));
      console.log(this.formatAIResponse(response.text));
      
      // Check if response contains code that should be applied
      if (this.containsCodeChanges(response.text)) {
        console.log(chalk.yellow('\n💡 This response contains code changes. Use /apply to apply them to your files.'));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  buildContext(userMessage) {
    let context = `You are an AI coding assistant. Help the user with their code.

User request: ${userMessage}

`;

    // Add loaded files to context
    if (this.loadedFiles.size > 0) {
      context += "Loaded files:\n";
      for (const [filename, fileData] of this.loadedFiles) {
        context += `\n--- ${filename} ---\n${fileData.content}\n`;
      }
    }

    // Add recent chat history
    if (this.chatHistory.length > 0) {
      context += "\nRecent conversation:\n";
      const recentHistory = this.chatHistory.slice(-6); // Last 6 messages
      for (const msg of recentHistory) {
        context += `${msg.role}: ${msg.content}\n`;
      }
    }

    context += `\nPlease provide a helpful response. If you're suggesting code changes, clearly mark the code blocks and specify which file they belong to.`;

    return context;
  }

  formatAIResponse(text) {
    // Simple formatting - could be enhanced
    return text.split('\n').map(line => {
      if (line.startsWith('```')) {
        return chalk.cyan(line);
      } else if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
        return chalk.gray(line);
      } else {
        return line;
      }
    }).join('\n');
  }

  async generateLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced pattern matching for better responses
    if (lowerMessage.includes('sum') || lowerMessage.includes('add')) {
      return this.generateSumFunction();
    } else if (lowerMessage.includes('multiply') || lowerMessage.includes('product')) {
      return this.generateMultiplyFunction();
    } else if (lowerMessage.includes('sort') || lowerMessage.includes('order')) {
      return this.generateSortFunction();
    } else if (lowerMessage.includes('test') || lowerMessage.includes('unit test')) {
      return this.generateTestFunction();
    } else if (lowerMessage.includes('random') || lowerMessage.includes('generate')) {
      return this.generateRandomFunction();
    } else if (lowerMessage.includes('fibonacci')) {
      return this.generateFibonacciFunction();
    } else if (lowerMessage.includes('prime') || lowerMessage.includes('is_prime')) {
      return this.generatePrimeFunction();
    } else {
      return {
        success: true,
        text: `I understand you want to: "${message}"\n\nHere's a simple template function:\n\n\`\`\`python\ndef new_function():\n    """Generated function based on your request."""\n    # TODO: Implement your logic here\n    pass\n\`\`\`\n\n💡 For better AI-generated code, please set your GOOGLE_API_KEY environment variable.`
      };
    }
  }

  generateSumFunction() {
    return {
      success: true,
      text: `I'll add a sum function to your file:\n\n\`\`\`python\ndef sum_numbers(numbers):\n    """\n    Calculate the sum of a list of numbers.\n    \n    Args:\n        numbers: List of numbers to sum\n        \n    Returns:\n        The sum of all numbers in the list\n    """\n    return sum(numbers)\n\`\`\``
    };
  }

  generateMultiplyFunction() {
    return {
      success: true,
      text: `I'll add a multiply function to your file:\n\n\`\`\`python\ndef multiply_numbers(numbers):\n    """\n    Multiply all numbers in a list.\n    \n    Args:\n        numbers: List of numbers to multiply\n        \n    Returns:\n        The product of all numbers in the list\n    """\n    result = 1\n    for num in numbers:\n        result *= num\n    return result\n\`\`\``
    };
  }

  generateSortFunction() {
    return {
      success: true,
      text: `I'll add a sort function to your file:\n\n\`\`\`python\ndef sort_list(items, reverse=False):\n    """\n    Sort a list of items.\n    \n    Args:\n        items: List of items to sort\n        reverse: If True, sort in descending order\n        \n    Returns:\n        A new sorted list\n    """\n    return sorted(items, reverse=reverse)\n\`\`\``
    };
  }

  generateTestFunction() {
    return {
      success: true,
      text: `I'll add a test function to your file:\n\n\`\`\`python\ndef test_functions():\n    """\n    Test the functions in this module.\n    """\n    # Test longest_unique_substring\n    assert longest_unique_substring("abcabcbb") == "abc"\n    \n    # Test reverse_string\n    assert reverse_string("hello") == "olleh"\n    \n    print("All tests passed!")\n\`\`\``
    };
  }

  generateRandomFunction() {
    return {
      success: true,
      text: `I'll add a random number generator function:\n\n\`\`\`python\nimport random\n\ndef generate_random_number(min_val=1, max_val=100):\n    """\n    Generate a random integer between min_val and max_val.\n    \n    Args:\n        min_val (int): Minimum value (inclusive)\n        max_val (int): Maximum value (inclusive)\n        \n    Returns:\n        int: Random number in the specified range\n    """\n    return random.randint(min_val, max_val)\n\`\`\``
    };
  }

  generateFibonacciFunction() {
    return {
      success: true,
      text: `I'll add a Fibonacci function:\n\n\`\`\`python\ndef fibonacci(n):\n    """\n    Calculate the nth Fibonacci number.\n    \n    Args:\n        n (int): Position in Fibonacci sequence\n        \n    Returns:\n        int: The nth Fibonacci number\n    """\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\`\`\``
    };
  }

  generatePrimeFunction() {
    return {
      success: true,
      text: `I'll add a prime number checker function:\n\n\`\`\`python\ndef is_prime(n):\n    """\n    Check if a number is prime.\n    \n    Args:\n        n (int): Number to check\n        \n    Returns:\n        bool: True if prime, False otherwise\n    """\n    if n < 2:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\`\`\``
    };
  }

  isNewFunction(code) {
    // Check if the code is a new function definition
    const trimmedCode = code.trim();
    return trimmedCode.startsWith('def ') && 
           !trimmedCode.includes('# Replace') && 
           !trimmedCode.includes('# Modify');
  }

  containsCodeChanges(text) {
    return text.includes('```') || 
           text.toLowerCase().includes('replace') ||
           text.toLowerCase().includes('modify') ||
           text.toLowerCase().includes('add this') ||
           text.toLowerCase().includes('change');
  }

  async applyChanges() {
    if (this.chatHistory.length === 0) {
      console.log(chalk.yellow('No chat history to apply changes from.'));
      return;
    }

    const lastAIResponse = this.chatHistory
      .filter(msg => msg.role === 'assistant')
      .pop();

    if (!lastAIResponse) {
      console.log(chalk.yellow('No AI responses to apply changes from.'));
      return;
    }

    // Extract code blocks from the response
    const codeBlocks = this.extractCodeBlocks(lastAIResponse.content);
    
    if (codeBlocks.length === 0) {
      console.log(chalk.yellow('No code blocks found in the last AI response.'));
      return;
    }

    console.log(chalk.blue(`\n📝 Found ${codeBlocks.length} code block(s) to apply:`));
    
    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i];
      console.log(chalk.gray(`\n${i + 1}. ${block.language || 'Unknown'} code (${block.code.split('\n').length} lines)`));
      
      if (block.filename) {
        const { apply } = await inquirer.prompt([{
          type: 'confirm',
          name: 'apply',
          message: `Apply this code to ${block.filename}?`,
          default: true
        }]);
        
        if (apply) {
          await this.applyCodeToFile(block.filename, block.code);
        }
      } else {
        // Ask which file to apply to
        const filenames = Array.from(this.loadedFiles.keys());
        if (filenames.length === 0) {
          console.log(chalk.yellow('No files loaded. Load files first with /load <filename>'));
          continue;
        }
        
        const { targetFile } = await inquirer.prompt([{
          type: 'list',
          name: 'targetFile',
          message: 'Which file should this code be applied to?',
          choices: [...filenames, 'Skip this block']
        }]);
        
        if (targetFile !== 'Skip this block') {
          await this.applyCodeToFile(targetFile, block.code);
        }
      }
    }
  }

  extractCodeBlocks(text) {
    const blocks = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        filename: this.extractFilenameFromContext(text, match.index)
      });
    }
    
    return blocks;
  }

  extractFilenameFromContext(text, codeBlockIndex) {
    // Look for filename mentions before the code block
    const beforeBlock = text.substring(0, codeBlockIndex);
    const lines = beforeBlock.split('\n').slice(-5); // Last 5 lines before code block
    
    for (const line of lines.reverse()) {
      const filenameMatch = line.match(/(\w+\.\w+)/);
      if (filenameMatch && this.loadedFiles.has(filenameMatch[1])) {
        return filenameMatch[1];
      }
    }
    
    return null;
  }

  async applyCodeToFile(filename, code) {
    if (!this.loadedFiles.has(filename)) {
      console.log(chalk.red(`❌ File ${filename} is not loaded`));
      return;
    }

    const fileData = this.loadedFiles.get(filename);
    
    // Apply changes directly without confirmation
    
    // Smart code application - append new functions instead of replacing everything
    if (this.isNewFunction(code)) {
      // Append the new function to the existing content
      fileData.content = fileData.content.trim() + '\n\n' + code.trim() + '\n';
    } else {
      // Replace entire content for other types of changes
      fileData.content = code;
    }
    
    // Write changes directly to disk
    try {
      await fs.writeFile(fileData.path, fileData.content, 'utf-8');
      fileData.originalContent = fileData.content; // Update original content
      console.log(chalk.green(`✅ Code applied to ${filename}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to write to ${filename}: ${error.message}`));
    }
  }

  /**
   * Insert code at a specific position in the file
   */
  async insertCode() {
    if (this.chatHistory.length === 0) {
      console.log(chalk.yellow('No chat history to insert code from.'));
      return;
    }

    const lastAIResponse = this.chatHistory
      .filter(msg => msg.role === 'assistant')
      .pop();

    if (!lastAIResponse) {
      console.log(chalk.yellow('No AI responses to insert code from.'));
      return;
    }

    const codeBlocks = this.extractCodeBlocks(lastAIResponse.content);
    
    if (codeBlocks.length === 0) {
      console.log(chalk.yellow('No code blocks found in the last AI response.'));
      return;
    }

    // Select file and insertion point
    const filenames = Array.from(this.loadedFiles.keys());
    if (filenames.length === 0) {
      console.log(chalk.yellow('No files loaded. Load files first with /load <filename>'));
      return;
    }

    const { targetFile } = await inquirer.prompt([{
      type: 'list',
      name: 'targetFile',
      message: 'Which file should the code be inserted into?',
      choices: filenames
    }]);

    const fileData = this.loadedFiles.get(targetFile);
    const lines = fileData.content.split('\n');

    const { lineNumber } = await inquirer.prompt([{
      type: 'number',
      name: 'lineNumber',
      message: `Insert at which line? (1-${lines.length + 1})`,
      default: lines.length + 1,
      validate: (input) => {
        const num = parseInt(input);
        return (num >= 1 && num <= lines.length + 1) || `Please enter a number between 1 and ${lines.length + 1}`;
      }
    }]);

    // Insert code at specified line
    for (const block of codeBlocks) {
      const insertIndex = lineNumber - 1; // Convert to 0-based index
      const codeLines = block.code.split('\n');
      
      // Insert the code lines
      lines.splice(insertIndex, 0, '', ...codeLines, '');
      
      console.log(chalk.green(`✅ Code inserted at line ${lineNumber} in ${targetFile}`));
    }

    // Update file content and write to disk
    fileData.content = lines.join('\n');
    
    try {
      await fs.writeFile(fileData.path, fileData.content, 'utf-8');
      fileData.originalContent = fileData.content;
      console.log(chalk.green(`✅ Code inserted in ${targetFile}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to write to ${targetFile}: ${error.message}`));
    }
  }

  /**
   * Append code to the end of the file
   */
  async appendCode() {
    if (this.chatHistory.length === 0) {
      console.log(chalk.yellow('No chat history to append code from.'));
      return;
    }

    const lastAIResponse = this.chatHistory
      .filter(msg => msg.role === 'assistant')
      .pop();

    if (!lastAIResponse) {
      console.log(chalk.yellow('No AI responses to append code from.'));
      return;
    }

    const codeBlocks = this.extractCodeBlocks(lastAIResponse.content);
    
    if (codeBlocks.length === 0) {
      console.log(chalk.yellow('No code blocks found in the last AI response.'));
      return;
    }

    // Select file
    const filenames = Array.from(this.loadedFiles.keys());
    if (filenames.length === 0) {
      console.log(chalk.yellow('No files loaded. Load files first with /load <filename>'));
      return;
    }

    const { targetFile } = await inquirer.prompt([{
      type: 'list',
      name: 'targetFile',
      message: 'Which file should the code be appended to?',
      choices: filenames
    }]);

    const fileData = this.loadedFiles.get(targetFile);

    // Append code to end of file
    for (const block of codeBlocks) {
      // Append with proper spacing
      fileData.content = fileData.content.trim() + '\n\n' + block.code.trim() + '\n';
      
      console.log(chalk.green(`✅ Code appended to ${targetFile}`));
    }

    // Write changes to disk
    try {
      await fs.writeFile(fileData.path, fileData.content, 'utf-8');
      fileData.originalContent = fileData.content;
      console.log(chalk.green(`✅ Code appended to ${targetFile}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to write to ${targetFile}: ${error.message}`));
    }
  }

  /**
   * Generate documentation for all loaded files
   */
  async generateDocumentation() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded. Use /load <filename> to load files first.'));
      return;
    }

    console.log(chalk.blue('📚 Generating documentation for loaded files...'));

    for (const [filename, fileData] of this.loadedFiles) {
      try {
        const { generateDocumentation } = require('./index');
        
        const options = {
          ...this.options,
          file: fileData.path,
          lowLevel: true,
          inline: true,
          backup: true,
          preview: false,
          interactive: false
        };

        console.log(chalk.gray(`\n📝 Processing ${filename}...`));
        const result = await generateDocumentation(options);
        
        if (result.success) {
          // Reload the file to get updated content
          const updatedContent = await fs.readFile(fileData.path, 'utf-8');
          fileData.content = updatedContent;
          fileData.originalContent = updatedContent;
          console.log(chalk.green(`✅ Documentation generated for ${filename}`));
        } else {
          console.log(chalk.red(`❌ Failed to generate docs for ${filename}`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error processing ${filename}: ${error.message}`));
      }
    }
  }

  /**
   * Generate documentation for specific functions
   */
  async generateSpecificDocs(args) {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded. Use /load <filename> to load files first.'));
      return;
    }

    if (args.length === 0) {
      console.log(chalk.red('Usage: /docgen <function_name> [file]'));
      console.log(chalk.gray('Example: /docgen get_random_number'));
      return;
    }

    const functionName = args[0];
    const targetFile = args[1];

    console.log(chalk.blue(`📚 Generating documentation for function: ${functionName}`));

    // If specific file mentioned, use it; otherwise search all loaded files
    const filesToSearch = targetFile ? 
      (this.loadedFiles.has(targetFile) ? [targetFile] : []) :
      Array.from(this.loadedFiles.keys());

    if (filesToSearch.length === 0) {
      console.log(chalk.red(`File ${targetFile} not loaded`));
      return;
    }

    for (const filename of filesToSearch) {
      const fileData = this.loadedFiles.get(filename);
      if (fileData.content.includes(`def ${functionName}(`)) {
        console.log(chalk.gray(`Found ${functionName} in ${filename}`));
        
        // Use AI to generate documentation for this specific function
        const prompt = `Generate a docstring for the function '${functionName}' in this Python code:\n\n${fileData.content}`;
        
        try {
          const response = await this.aiProvider.generateDocumentation(prompt);
          if (response.success) {
            // Add the response to chat history so user can apply it
            this.chatHistory.push({ role: 'assistant', content: response.text });
            console.log(chalk.green('\n🤖 AI Generated Documentation:'));
            console.log(this.formatAIResponse(response.text));
            console.log(chalk.yellow('\n💡 Use /apply to apply the documentation to your file.'));
          }
        } catch (error) {
          console.log(chalk.red(`❌ Error generating docs: ${error.message}`));
        }
        return;
      }
    }

    console.log(chalk.yellow(`Function '${functionName}' not found in loaded files`));
  }

  /**
   * Analyze code quality and structure
   */
  async analyzeCode() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded. Use /load <filename> to load files first.'));
      return;
    }

    console.log(chalk.blue('🔍 Analyzing code quality and structure...'));

    for (const [filename, fileData] of this.loadedFiles) {
      console.log(chalk.gray(`\n📊 Analyzing ${filename}:`));
      
      const analysis = this.performCodeAnalysis(fileData.content, filename);
      console.log(analysis);

      // Get AI analysis
      const prompt = `Analyze this code for quality, structure, and potential improvements:\n\n${fileData.content}`;
      
      try {
        const response = await this.aiProvider.generateDocumentation(prompt);
        if (response.success) {
          this.chatHistory.push({ role: 'assistant', content: response.text });
          console.log(chalk.green('\n🤖 AI Analysis:'));
          console.log(this.formatAIResponse(response.text));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error getting AI analysis: ${error.message}`));
      }
    }
  }

  /**
   * Get refactoring suggestions
   */
  async getRefactoringSuggestions() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded. Use /load <filename> to load files first.'));
      return;
    }

    console.log(chalk.blue('🔧 Getting refactoring suggestions...'));

    for (const [filename, fileData] of this.loadedFiles) {
      const prompt = `Suggest refactoring improvements for this code. Focus on readability, maintainability, and best practices:\n\n${fileData.content}`;
      
      try {
        const response = await this.aiProvider.generateDocumentation(prompt);
        if (response.success) {
          this.chatHistory.push({ role: 'assistant', content: response.text });
          console.log(chalk.green(`\n🔧 Refactoring Suggestions for ${filename}:`));
          console.log(this.formatAIResponse(response.text));
          console.log(chalk.yellow('\n💡 Use /apply to apply suggested changes.'));
        } else {
          console.log(chalk.red(`❌ AI provider failed: ${response.error || 'Unknown error'}`));
          // Provide fallback suggestions
          this.provideFallbackRefactoringSuggestions(filename, fileData.content);
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error getting refactoring suggestions: ${error.message}`));
        // Provide fallback suggestions
        this.provideFallbackRefactoringSuggestions(filename, fileData.content);
      }
    }
  }

  /**
   * Get performance optimization suggestions
   */
  async getOptimizationSuggestions() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded. Use /load <filename> to load files first.'));
      return;
    }

    console.log(chalk.blue('⚡ Getting performance optimization suggestions...'));

    for (const [filename, fileData] of this.loadedFiles) {
      const prompt = `Analyze this code for performance optimization opportunities. Suggest specific improvements:\n\n${fileData.content}`;
      
      try {
        const response = await this.aiProvider.generateDocumentation(prompt);
        if (response.success) {
          this.chatHistory.push({ role: 'assistant', content: response.text });
          console.log(chalk.green(`\n⚡ Optimization Suggestions for ${filename}:`));
          console.log(this.formatAIResponse(response.text));
          console.log(chalk.yellow('\n💡 Use /apply to apply optimizations.'));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error getting optimization suggestions: ${error.message}`));
      }
    }
  }

  /**
   * Perform basic code analysis
   */
  performCodeAnalysis(content, filename) {
    const lines = content.split('\n');
    const ext = path.extname(filename);
    
    let functions = 0;
    let classes = 0;
    let imports = 0;
    let comments = 0;
    let emptyLines = 0;
    let longLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') emptyLines++;
      if (line.length > 80) longLines++;
      if (trimmed.startsWith('#') || trimmed.startsWith('//')) comments++;
      if (trimmed.startsWith('def ')) functions++;
      if (trimmed.startsWith('class ')) classes++;
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) imports++;
    }
    
    const codeLines = lines.length - emptyLines - comments;
    const commentRatio = comments / lines.length * 100;
    
    let analysis = chalk.cyan('📊 Code Metrics:\n');
    analysis += chalk.gray(`   Total lines: ${lines.length}\n`);
    analysis += chalk.gray(`   Code lines: ${codeLines}\n`);
    analysis += chalk.gray(`   Functions: ${functions}\n`);
    analysis += chalk.gray(`   Classes: ${classes}\n`);
    analysis += chalk.gray(`   Imports: ${imports}\n`);
    analysis += chalk.gray(`   Comments: ${comments} (${commentRatio.toFixed(1)}%)\n`);
    
    if (longLines > 0) {
      analysis += chalk.yellow(`   ⚠️  Long lines (>80 chars): ${longLines}\n`);
    }
    
    if (commentRatio < 10) {
      analysis += chalk.yellow(`   ⚠️  Low comment ratio: Consider adding more comments\n`);
    }
    
    return analysis;
  }

  /**
   * Provide fallback refactoring suggestions when AI is unavailable
   */
  provideFallbackRefactoringSuggestions(filename, content) {
    console.log(chalk.green(`\n🔧 Refactoring Suggestions for ${filename}:`));
    
    const suggestions = [];
    const lines = content.split('\n');
    
    // Analyze the code and provide specific suggestions
    let hasTypeHints = content.includes(': int') || content.includes(': str') || content.includes('-> ');
    let hasDocstrings = content.includes('"""');
    let hasErrorHandling = content.includes('raise ') || content.includes('except ');
    let hasLogging = content.includes('logging') || content.includes('print(');
    let hasConstants = /^[A-Z_]+\s*=/.test(content);
    
    if (!hasTypeHints) {
      suggestions.push("Add type hints to function parameters and return types");
    }
    
    if (!hasDocstrings) {
      suggestions.push("Add comprehensive docstrings to all functions");
    }
    
    if (!hasErrorHandling) {
      suggestions.push("Add proper error handling and input validation");
    }
    
    if (content.includes('def ') && !hasConstants) {
      suggestions.push("Extract magic numbers into named constants");
    }
    
    if (content.includes('random.') && !content.includes('random.seed')) {
      suggestions.push("Consider adding random seed for reproducible results in testing");
    }
    
    // Generate improved code example
    const improvedCode = this.generateImprovedCode(content);
    
    suggestions.forEach((suggestion, index) => {
      console.log(chalk.cyan(`${index + 1}. ${suggestion}`));
    });
    
    if (improvedCode) {
      console.log(chalk.green('\n📝 Suggested improvements:'));
      console.log(chalk.gray('```python'));
      console.log(improvedCode);
      console.log(chalk.gray('```'));
      
      // Add to chat history so user can apply it
      this.chatHistory.push({ 
        role: 'assistant', 
        content: `Here are refactoring suggestions for ${filename}:\n\n\`\`\`python\n${improvedCode}\n\`\`\`` 
      });
    }
    
    console.log(chalk.yellow('\n💡 Use /apply to apply suggested changes.'));
  }

  /**
   * Generate improved code based on common patterns
   */
  generateImprovedCode(content) {
    if (content.includes('def get_random_choice_from_list')) {
      return `from typing import List, Any, Optional, Union
import random
import logging

# Constants
DEFAULT_MIN_VALUE = 1
DEFAULT_MAX_VALUE = 100

def generate_random_integer(min_val: int = DEFAULT_MIN_VALUE, max_val: int = DEFAULT_MAX_VALUE) -> int:
    """
    Generates a random integer between min_val (inclusive) and max_val (inclusive).

    Args:
        min_val (int): The minimum value for the random number.
        max_val (int): The maximum value for the random number.

    Returns:
        int: A random integer within the specified range.
        
    Raises:
        ValueError: If min_val > max_val
        TypeError: If min_val or max_val are not integers
    """
    if not isinstance(min_val, int) or not isinstance(max_val, int):
        raise TypeError("min_val and max_val must be integers")
    if min_val > max_val:
        raise ValueError("min_val cannot be greater than max_val")
    
    return random.randint(min_val, max_val)

def get_random_choice_from_list(items: List[Any]) -> Optional[Any]:
    """
    Selects and returns a random item from a given list.

    Args:
        items (List[Any]): The list from which to choose a random item.

    Returns:
        Optional[Any]: A random item from the list, or None if the list is empty.
        
    Raises:
        TypeError: If items is not a list
    """
    if not isinstance(items, list):
        raise TypeError("items must be a list")
    
    if not items:
        logging.warning("Empty list provided to get_random_choice_from_list")
        return None
        
    return random.choice(items)`;
    }
    
    return null;
  }

  async saveAllModified() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded to save.'));
      return;
    }

    const modifiedFiles = [];
    for (const [filename, fileData] of this.loadedFiles) {
      if (fileData.content !== fileData.originalContent) {
        modifiedFiles.push(filename);
      }
    }

    if (modifiedFiles.length === 0) {
      console.log(chalk.yellow('No files have been modified.'));
      return;
    }

    console.log(chalk.blue(`\n💾 Saving ${modifiedFiles.length} modified file(s)...`));
    
    for (const filename of modifiedFiles) {
      await this.saveToFile(filename);
    }
  }

  async saveInteractive() {
    if (this.loadedFiles.size === 0) {
      console.log(chalk.yellow('No files loaded to save.'));
      return;
    }

    // Show which files have been modified
    const modifiedFiles = [];
    const allFiles = [];
    
    for (const [filename, fileData] of this.loadedFiles) {
      allFiles.push(filename);
      if (fileData.content !== fileData.originalContent) {
        modifiedFiles.push(filename);
      }
    }

    if (modifiedFiles.length === 0) {
      console.log(chalk.yellow('No files have been modified.'));
      return;
    }

    console.log(chalk.blue('\n📝 Modified files:'));
    modifiedFiles.forEach(filename => {
      console.log(chalk.yellow(`  ${filename} (modified)`));
    });

    // Ask which files to save
    const { filesToSave } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'filesToSave',
      message: 'Select files to save:',
      choices: modifiedFiles.map(filename => ({
        name: filename,
        value: filename,
        checked: true
      }))
    }]);

    // Save selected files
    for (const filename of filesToSave) {
      await this.saveToFile(filename);
    }
  }

  async saveToFile(filename) {
    if (!this.loadedFiles.has(filename)) {
      console.log(chalk.red(`❌ File ${filename} is not loaded`));
      return;
    }

    const fileData = this.loadedFiles.get(filename);
    
    // Debug: Show what we're trying to save
    if (this.verbose) {
      console.log(chalk.gray(`\n🔍 Debug - Saving to: ${fileData.path}`));
      console.log(chalk.gray(`Content length: ${fileData.content.length} characters`));
      console.log(chalk.gray(`First few lines:\n${fileData.content.split('\n').slice(0, 3).join('\n')}`));
    }
    
    try {
      await fs.writeFile(fileData.path, fileData.content, 'utf-8');
      fileData.originalContent = fileData.content; // Update original content
      console.log(chalk.green(`✅ Saved ${filename} to disk (${fileData.content.split('\n').length} lines)`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save ${filename}: ${error.message}`));
    }
  }
}

async function startChat(options = {}) {
  try {
    const { options: resolvedOptions } = await resolveOptions(options);
    const chatSession = new ChatSession(resolvedOptions);
    await chatSession.start();
  } catch (error) {
    console.error(chalk.red(`Chat error: ${error.message}`));
    process.exit(1);
  }
}

module.exports = { startChat };
