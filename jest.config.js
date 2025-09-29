module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Exclude main entry point
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000, // 30 seconds for performance tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|cli-progress|ansi-styles|strip-ansi|has-flag|supports-color|cli-cursor|restore-cursor|signal-exit|mimic-fn|onetime|strip-ansi|is-fullwidth-code-point|string-width|wrap-ansi|ansi-regex|emoji-regex|is-unicode-supported|color-convert|color-name)/)'
  ],
  moduleNameMapper: {
    '^chalk$': '<rootDir>/tests/__mocks__/chalk.js',
    '^ora$': '<rootDir>/tests/__mocks__/ora.js',
    '^cli-progress$': '<rootDir>/tests/__mocks__/cli-progress.js',
    '^inquirer$': '<rootDir>/tests/__mocks__/inquirer.js'
  }
};
