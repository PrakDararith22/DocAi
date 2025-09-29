// Mock inquirer module
const inquirer = {
  prompt: jest.fn().mockResolvedValue({
    confirm: true,
    choice: 'yes',
    input: 'test input'
  }),
  registerPrompt: jest.fn(),
  createPromptModule: jest.fn(() => inquirer),
  default: {
    prompt: jest.fn().mockResolvedValue({
      confirm: true,
      choice: 'yes',
      input: 'test input'
    }),
    registerPrompt: jest.fn(),
    createPromptModule: jest.fn(() => inquirer)
  }
};

module.exports = inquirer;
