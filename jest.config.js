const path = require('path');
const fs = require('fs');

// Check if setup file exists, if not, create a minimal one
const setupFile = path.resolve(__dirname, 'src/tests/setup.js');
if (!fs.existsSync(setupFile)) {
  // Create a minimal setup file for CI/CD environments
  const minimalSetup = `// Minimal setup for CI/CD environments
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = process.env.TEST_TYPE || 'unit';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
`;
  
  // Ensure directory exists
  const setupDir = path.dirname(setupFile);
  if (!fs.existsSync(setupDir)) {
    fs.mkdirSync(setupDir, { recursive: true });
  }
  
  fs.writeFileSync(setupFile, minimalSetup);
}

// Get absolute paths for better CI compatibility
const rootDir = path.resolve(__dirname);
const testMatch = [
  path.join(rootDir, '**/__tests__/**/*.test.js'),
  path.join(rootDir, '**/tests/**/*.test.js'),
  path.join(rootDir, 'src/tests/**/*.test.js'),
  path.join(rootDir, 'src/tests/unit/**/*.test.js'),
  path.join(rootDir, '**/*.test.js')
];

module.exports = {
  testEnvironment: 'node',
  testMatch: testMatch,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [setupFile],
  testTimeout: 30000,
  verbose: true,
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/coverage/'],
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  // Use absolute path for root directory
  rootDir: rootDir,
};
