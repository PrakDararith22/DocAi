#!/usr/bin/env node

const { startChat } = require('../src/chatCommand');

// Direct chat mode - no other commands
startChat().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
